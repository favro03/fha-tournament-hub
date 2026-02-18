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

type PreviewScheduledGame = {
  engineGameId: string;
  stageType: string;
  stageId?: string;
  slot: { start: string; location: string };
  home: { type: string; id?: string; name: string };
  away: { type: string; id?: string; name: string };
};

function weekdayShort(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}
function dateISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function timeHM(d: Date) {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
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

function refType(ref: ParticipantRef | null): string {
  if (!ref) return "NULL";
  return (ref as any).type ?? "UNKNOWN";
}


function refToDisplayName(
  ref: ParticipantRef | null,
  teamsById: Map<string, string>
) {
  if (!ref) return "";
  if (ref.type === "TEAM")
    return teamsById.get(ref.teamId) ?? `Team ${ref.teamId}`;
  if (ref.type === "POOL_RANK") return `Seed ${ref.rank}`;
  if (ref.type === "WINNER_OF") return `Winner of ${ref.gameId}`;
  if (ref.type === "LOSER_OF") return `Loser of ${ref.gameId}`;
  return ref.type;
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

    if (!body?.slots || !Array.isArray(body.slots)) {
      return NextResponse.json(
        { ok: false, error: "slots[] is required" },
        { status: 400 }
      );
    }

    const bracket = await prisma.bracket.findUnique({
      where: { id: bracketId },
      select: {
        id: true,
        youthLevel: true,
        format: true,
        engineConfig: true,
      },
    });

    if (!bracket) {
      return NextResponse.json(
        { ok: false, error: "Bracket not found" },
        { status: 404 }
      );
    }

    const url = new URL(req.url);
    const debug = url.searchParams.get("debug") === "1";
    const preview = url.searchParams.get("preview") === "1";

    const derivedMinRestMinutes = getMinRestMinutes(bracket.youthLevel);

    const allowedStageTypes =
      Array.isArray(body.stageTypes) && body.stageTypes.length > 0
        ? new Set(body.stageTypes)
        : new Set(["POOL_PLAY"]);

    // Clear existing schedule (APPLY mode only)
    if (!preview) {
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
          await tx.times.deleteMany({
            where: { id: { in: timesIds } },
          });
        }
      });
    }

    const games = await prisma.game.findMany({
      where: {
        bracketId,
        stageType: { in: [...allowedStageTypes] },
      },
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

    const teams = await prisma.team.findMany({
      where: { bracketId },
      select: { id: true, teamName: true },
    });
    const teamsById = new Map(
      teams.map((t) => [String(t.id), t.teamName])
    );

    let totalGames = games.length;
let stageTypeFiltered = 0;
let alreadyScheduled = 0;
let unresolvedRefs = 0;
let statusFiltered = 0;

const schedulable = games
  .filter((g) => {
    if (!allowedStageTypes.has(g.stageType)) {
      stageTypeFiltered++;
      return false;
    }

    if (g.status !== "UNSCHEDULED") {
      statusFiltered++;
      return false;
    }

    if (g.timesId != null) {
      alreadyScheduled++;
      return false;
    }

    const homeRef = (g.homeRef ?? null) as ParticipantRef | null;
    const awayRef = (g.awayRef ?? null) as ParticipantRef | null;

    if (!isResolvedForScheduling(homeRef, awayRef)) {
      unresolvedRefs++;
      return false;
    }

    return true;
  })
  .map((g) => ({
    engineGameId: g.engineGameId,
    stageType: g.stageType,
    stageId: g.stageId,
    homeRef: g.homeRef as ParticipantRef,
    awayRef: g.awayRef as ParticipantRef,
  }));

const schedulableCount = schedulable.length;


    const stageIdToRestMinutes = extractStageIdToRestMinutes(
      bracket.engineConfig
    );

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

    const { assignments, unscheduled, unscheduledDetailed } =
      scheduleResult;

    const gameById = new Map(
      games.map((g) => [g.engineGameId, g])
    );

    const scheduledGamesPreview: PreviewScheduledGame[] = assignments
      .map((a) => {
        const slot = slotById.get(a.slotId);
        const g = gameById.get(a.engineGameId);
        if (!slot || !g) return null;

        const homeRef = (g.homeRef ?? null) as ParticipantRef | null;
        const awayRef = (g.awayRef ?? null) as ParticipantRef | null;

        return {
          engineGameId: a.engineGameId,
          stageType: g.stageType,
          stageId: g.stageId,
          slot: {
            start: slot.start,
            location: slot.location,
          },
          home: {
            type: refType(homeRef),
            id: isTeamRef(homeRef) ? homeRef.teamId : undefined,
            name: refToDisplayName(homeRef, teamsById),
          },
          away: {
            type: refType(awayRef),
            id: isTeamRef(awayRef) ? awayRef.teamId : undefined,
            name: refToDisplayName(awayRef, teamsById),
          },
        };
      })
      .filter(Boolean) as PreviewScheduledGame[];

    const unusedSlotsPreview = slotInputs
      .filter((s) => !assignments.some((a) => a.slotId === s.id))
      .map((s) => ({
        start: s.start,
        location: s.location,
      }));

    if (!preview) {
  await prisma.$transaction(async (tx) => {
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
    }
  });
}

    return NextResponse.json({
      ok: true,
      preview,
      bracketId,
      youthLevel: bracket.youthLevel,
      derivedMinRestMinutes,
      scheduledCount: assignments.length,
      unscheduledCount: unscheduled.length,
      unusedSlotCount: slotInputs.length - assignments.length,
      stageTypesApplied: [...allowedStageTypes],
      unscheduled,
      unscheduledDetailed,
      scheduledGamesPreview,
      unusedSlotsPreview,
      ...(debug && {
  greedySmart: scheduleResult.debug,
  stageIdToRestMinutes,
  diagnostics: {
    totalGames,
    stageTypeFiltered,
    statusFiltered,
    alreadyScheduled,
    unresolvedRefs,
    schedulableCount,
  },
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
