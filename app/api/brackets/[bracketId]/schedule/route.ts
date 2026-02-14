// app/api/brackets/[bracketId]/schedule/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getMinRestMinutes,
  makeRestMinutesResolver,
  restMinutesForLevelToken,
  scheduleGamesGreedySmart,
} from "@/lib/tournament-engine/scheduling/scheduleGames";
import type { ParticipantRef } from "@/lib/tournament-engine/types";

type Body = {
  slots: Array<{ start: string; location: string }>;
  stageTypes?: string[];
};

function weekdayShort(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}
function dateISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function timeHM(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function isTeamRef(
  ref: ParticipantRef | null
): ref is { type: "TEAM"; teamId: string } {
  return !!ref && ref.type === "TEAM" && typeof (ref as any).teamId === "string";
}

function isResolvedForScheduling(
  homeRef: ParticipantRef | null,
  awayRef: ParticipantRef | null
) {
  return isTeamRef(homeRef) && isTeamRef(awayRef);
}

function refType(ref: ParticipantRef | null) {
  return ref?.type ?? "NULL";
}

/**
 * Extract stageId → restMinutes from engineConfig
 */
function extractStageIdToRestMinutes(engineConfig: any): Record<string, number> {
  const out: Record<string, number> = {};
  if (!engineConfig || typeof engineConfig !== "object") return out;

  const applyLevel = (stageId: string, level: string) => {
    const tokenMinutes = restMinutesForLevelToken(level);
    if (tokenMinutes > 0) out[stageId] = tokenMinutes;
  };

  const levelMap =
    engineConfig.stageIdLevels ??
    engineConfig.stageLevels ??
    engineConfig.stageIdToLevel ??
    null;

  if (levelMap && typeof levelMap === "object") {
    for (const [k, v] of Object.entries(levelMap)) {
      if (typeof v === "string") applyLevel(String(k), v);
    }
  }

  return out;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ bracketId: string }> }
) {
  try {
    const { bracketId: bracketIdParam } = await ctx.params;
    const bracketId = Number(bracketIdParam);

    if (!Number.isFinite(bracketId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid bracketId" },
        { status: 400 }
      );
    }

    const body = (await req.json()) as Body;

    if (!body?.slots || !Array.isArray(body.slots) || body.slots.length === 0) {
      return NextResponse.json(
        { ok: false, error: "slots[] is required" },
        { status: 400 }
      );
    }

    const bracket = await prisma.bracket.findUnique({
      where: { id: bracketId },
      select: { id: true, youthLevel: true, format: true, engineConfig: true },
    });

    if (!bracket) {
      return NextResponse.json(
        { ok: false, error: "Bracket not found" },
        { status: 404 }
      );
    }

    // 👇 Debug toggle via ?debug=1
    const url = new URL(req.url);
    const debug = url.searchParams.get("debug") === "1";

    const derivedMinRestMinutes = getMinRestMinutes(bracket.youthLevel);

    const allowedStageTypes =
      Array.isArray(body.stageTypes) && body.stageTypes.length > 0
        ? new Set(body.stageTypes)
        : new Set(["POOL_PLAY"]);

    // Clear existing schedule
    await prisma.$transaction(async (tx) => {
      const gamesToClear = await tx.game.findMany({
        where: {
          bracketId,
          stageType: { in: [...allowedStageTypes] },
          OR: [{ timesId: { not: null } }, { status: "SCHEDULED" }],
        },
        select: { timesId: true },
      });

      const timesIds = gamesToClear
        .map((g) => g.timesId)
        .filter(
          (id): id is number => typeof id === "number" && Number.isFinite(id)
        );

      await tx.game.updateMany({
        where: {
          bracketId,
          stageType: { in: [...allowedStageTypes] },
          OR: [{ timesId: { not: null } }, { status: "SCHEDULED" }],
        },
        data: {
          timesId: null,
          day: "",
          date: "",
          time: "",
          location: "",
          status: "UNSCHEDULED",
        },
      });

      if (timesIds.length) {
        await tx.times.deleteMany({ where: { id: { in: timesIds } } });
      }
    });

    const games = await prisma.game.findMany({
      where: { bracketId, stageType: { in: [...allowedStageTypes] } },
      select: {
        engineGameId: true,
        timesId: true,
        status: true,
        stageType: true,
        stageId: true,
        homeRef: true,
        awayRef: true,
      },
    });

    const validSlots = body.slots
      .filter(
        (s) =>
          !!s?.start &&
          !!s?.location &&
          Number.isFinite(new Date(s.start).getTime())
      )
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const slotInputs = validSlots.map((s, idx) => ({
      id: String(idx),
      start: s.start,
      location: s.location,
    }));

    const slotById = new Map(slotInputs.map((s) => [s.id, s]));

    const schedulable = games
      .filter((g) => {
        if (g.status !== "UNSCHEDULED") return false;
        if (g.timesId != null) return false;
        if (!allowedStageTypes.has(g.stageType)) return false;

        const homeRef = (g.homeRef ?? null) as ParticipantRef | null;
        const awayRef = (g.awayRef ?? null) as ParticipantRef | null;

        return isResolvedForScheduling(homeRef, awayRef);
      })
      .map((g) => ({
        engineGameId: g.engineGameId,
        stageType: g.stageType,
        stageId: g.stageId,
        homeRef: g.homeRef as ParticipantRef,
        awayRef: g.awayRef as ParticipantRef,
      }));

    const stageIdToRestMinutes = extractStageIdToRestMinutes(bracket.engineConfig);

    const restMinutesForGame = makeRestMinutesResolver({
      fallbackMinutes: derivedMinRestMinutes,
      stageIdToRestMinutes,
    });

    const scheduleResult = scheduleGamesGreedySmart({
      games: schedulable,
      slots: slotInputs,
      minRestMinutes: derivedMinRestMinutes,
      restMinutesForGame,
      maxAttempts: 7,
    });

    const { assignments, unscheduled, unscheduledDetailed } = scheduleResult;

    const createdTimesByAssignment = await prisma.$transaction(async (tx) => {
      const created: any[] = [];

      for (const a of assignments) {
        const slot = slotById.get(a.slotId);
        if (!slot) continue;

        const dt = new Date(slot.start);

        const timesRow = await tx.times.create({
          data: {
            bracketId,
            day: weekdayShort(dt),
            date: dateISO(dt),
            timeSlots: slot.start,
            location: slot.location,
            gameType: bracket.format ?? "",
            type: "SLOT",
          },
          select: { id: true },
        });

        await tx.game.update({
          where: {
            bracketId_engineGameId: {
              bracketId,
              engineGameId: a.engineGameId,
            },
          },
          data: {
            timesId: timesRow.id,
            day: weekdayShort(dt),
            date: dateISO(dt),
            time: timeHM(dt),
            location: slot.location,
            status: "SCHEDULED",
          },
        });

        created.push({
          engineGameId: a.engineGameId,
          timesId: timesRow.id,
        });
      }

      return created;
    });

    const unusedSlotCount = slotInputs.length - assignments.length;

    return NextResponse.json({
      ok: true,
      bracketId,
      youthLevel: bracket.youthLevel,

      derivedMinRestMinutes,
      defaultMinRestMinutes: derivedMinRestMinutes,
      restPolicy: "PER_GAME_STAGE_AWARE",

      ...(debug && {
        restOverridesCount: Object.keys(stageIdToRestMinutes).length,
        greedySmart: scheduleResult.debug,
      }),

      createdSlotCount: createdTimesByAssignment.length,
      stageTypesApplied: [...allowedStageTypes],
      candidateGameCount: schedulable.length,
      scheduledCount: assignments.length,
      unscheduledCount: unscheduled.length,
      unscheduled,
      unusedSlotCount,
      unscheduledDetailed,

      ...(debug && {
        stageIdToRestMinutes,
      }),
    });
  } catch (err: any) {
    console.error("SCHEDULE ERROR:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
