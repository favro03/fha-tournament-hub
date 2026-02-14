// app/api/brackets/[bracketId]/schedule/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getMinRestMinutes,
  scheduleGamesSmart,
} from "@/lib/tournament-engine/scheduling/scheduleGames";

import type { ParticipantRef } from "@/lib/tournament-engine/types";

type Body = {
  slots: Array<{
    start: string;
    location: string;
  }>;
  stageTypes?: string[]; // ["POOL_PLAY"] or ["PLACEMENT"] etc
};

function weekdayShort(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short" }); // "Sat"
}
function dateISO(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
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
  // A game is schedulable only if both participants are actual teams
  return isTeamRef(homeRef) && isTeamRef(awayRef);
}

function refType(ref: ParticipantRef | null) {
  return ref?.type ?? "NULL";
}
type UnscheduledReason =
  | "UNRESOLVED_PARTICIPANT"
  | "NO_FREE_SLOT"
  | "TEAM_CONFLICT"
  | "REST_RULE_CONFLICT"
  | "NO_VALID_SLOT";

function computeUnscheduledReasons(args: {
  unscheduledIds: string[];
  games: Array<{
    engineGameId: string;
    homeRef: ParticipantRef | null;
    awayRef: ParticipantRef | null;
  }>;
  slots: Array<{ id: string; start: string }>;
  assignments: Array<{ engineGameId: string; slotId: string }>;
  minRestMinutes: number;
}): Array<{ engineGameId: string; reason: UnscheduledReason }> {
  const { unscheduledIds, games, slots, assignments, minRestMinutes } = args;

  const gameById = new Map(games.map((g) => [g.engineGameId, g] as const));
  const slotById = new Map(slots.map((s) => [s.id, s] as const));
  const usedSlotIds = new Set(assignments.map((a) => a.slotId));

  const getMs = (iso: string) => {
    const t = new Date(iso).getTime();
    return Number.isFinite(t) ? t : NaN;
  };

  const restMs = minRestMinutes * 60 * 1000;

  // teamId -> scheduled start times (ms)
  const startsByTeam = new Map<string, number[]>();

  for (const a of assignments) {
    const g = gameById.get(a.engineGameId);
    const s = slotById.get(a.slotId);
    if (!g || !s) continue;

    const startMs = getMs(s.start);
    if (!Number.isFinite(startMs)) continue;

    const homeId = isTeamRef(g.homeRef) ? g.homeRef.teamId : null;
    const awayId = isTeamRef(g.awayRef) ? g.awayRef.teamId : null;

    if (homeId) startsByTeam.set(homeId, [...(startsByTeam.get(homeId) ?? []), startMs]);
    if (awayId) startsByTeam.set(awayId, [...(startsByTeam.get(awayId) ?? []), startMs]);
  }

  const canTeamPlayAt = (teamId: string, slotStartMs: number) => {
    const starts = startsByTeam.get(teamId) ?? [];
    for (const prev of starts) {
      if (Math.abs(slotStartMs - prev) < restMs) return false;
    }
    return true;
  };

  const anyFreeSlot = slots.some((s) => !usedSlotIds.has(s.id));

  return unscheduledIds.map((engineGameId) => {
    const g = gameById.get(engineGameId);

    if (!g || !isTeamRef(g.homeRef) || !isTeamRef(g.awayRef)) {
      return { engineGameId, reason: "UNRESOLVED_PARTICIPANT" };
    }

    const homeId = g.homeRef.teamId;
    const awayId = g.awayRef.teamId;

    if (!anyFreeSlot) {
      return { engineGameId, reason: "NO_FREE_SLOT" };
    }

    // Evaluate all FREE slots
    let hasAnyRestFeasible = false;
    let hasExactTimeConflict = false;

    for (const s of slots) {
      if (usedSlotIds.has(s.id)) continue;

      const startMs = getMs(s.start);
      if (!Number.isFinite(startMs)) continue;

      const homeOk = canTeamPlayAt(homeId, startMs);
      const awayOk = canTeamPlayAt(awayId, startMs);

      if (homeOk && awayOk) {
        hasAnyRestFeasible = true;
        break;
      }

      // Exact-time conflict means: the team is already scheduled at that start time (other rink)
      const homeStarts = startsByTeam.get(homeId) ?? [];
      const awayStarts = startsByTeam.get(awayId) ?? [];
      if (homeStarts.includes(startMs) || awayStarts.includes(startMs)) {
        hasExactTimeConflict = true;
      }
    }

    // If we found a feasible free slot but the game is still unscheduled, something else is off.
    if (hasAnyRestFeasible) return { engineGameId, reason: "NO_VALID_SLOT" };

    if (hasExactTimeConflict) return { engineGameId, reason: "TEAM_CONFLICT" };

    return { engineGameId, reason: "REST_RULE_CONFLICT" };
  });
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

    // Load bracket youthLevel + format (NO games here — Upgrade 5 Option A)
    const bracket = await prisma.bracket.findUnique({
      where: { id: bracketId },
      select: {
        id: true,
        youthLevel: true,
        format: true,
      },
    });

    if (!bracket) {
      return NextResponse.json(
        { ok: false, error: "Bracket not found" },
        { status: 404 }
      );
    }

    const minRestMinutes = getMinRestMinutes(bracket.youthLevel);

    // --- Stage filter (Upgrade 5 default behavior) ---
    // If stageTypes is omitted, default to POOL_PLAY so we don't accidentally wipe PLACEMENT schedules.
    const allowedStageTypes =
      Array.isArray(body.stageTypes) && body.stageTypes.length > 0
        ? new Set(body.stageTypes)
        : new Set(["POOL_PLAY"]);

    // --- Upgrade 5: clear existing schedule FIRST (idempotent) ---
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

    // ✅ Option A Step 2: Fetch games FRESH after clearing
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
        homeRef: true,
        awayRef: true,
      },
    });

    // Build in-memory slot list (do NOT create Times yet — Upgrade 5)
    const validSlots = body.slots
      .filter(
        (s) =>
          !!s?.start &&
          !!s?.location &&
          Number.isFinite(new Date(s.start).getTime())
      )
      // deterministic scheduling
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    if (validSlots.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No valid slots provided (check start ISO strings)" },
        { status: 400 }
      );
    }

    // Slot ids are temporary strings ("0", "1", "2"...). We'll create Times ONLY for used slots.
    const slotInputs = validSlots.map((s, idx) => ({
      id: String(idx),
      start: s.start,
      location: s.location,
    }));
    const slotById = new Map(slotInputs.map((s) => [s.id, s]));

    // --- Upgrade 4: block unresolved games (POOL_RANK / WINNER_OF / LOSER_OF) ---
    const blocked: Array<{
      engineGameId: string;
      stageType: string;
      reason: string;
      homeRefType: string;
      awayRefType: string;
    }> = [];

    // ✅ Option A Step 3: Use `games` (fresh) instead of `bracket.games`
    const schedulable = games
      .filter((g) => {
        if (g.status !== "UNSCHEDULED") return false;
        if (g.timesId != null) return false;
        if (!allowedStageTypes.has(g.stageType)) return false;

        const homeRef = (g.homeRef ?? null) as any as ParticipantRef | null;
        const awayRef = (g.awayRef ?? null) as any as ParticipantRef | null;

        // Require TEAM vs TEAM for scheduling
        if (!isResolvedForScheduling(homeRef, awayRef)) {
          const why =
            g.stageType === "PLACEMENT"
              ? "PLACEMENT not resolved yet (still POOL_RANK/WINNER_OF/LOSER_OF). Enter pool results and resolve placement first."
              : "Game participants are not fully resolved to teams yet.";

          blocked.push({
            engineGameId: g.engineGameId,
            stageType: g.stageType,
            reason: why,
            homeRefType: refType(homeRef),
            awayRefType: refType(awayRef),
          });

          return false;
        }

        return true;
      })
      .map((g) => ({
        engineGameId: g.engineGameId,
        stageType: g.stageType,
        homeRef: (g.homeRef ?? null) as any as ParticipantRef,
        awayRef: (g.awayRef ?? null) as any as ParticipantRef,
      }));

    const { assignments, unscheduled, meta } = scheduleGamesSmart({
  games: schedulable,
  slots: slotInputs,
  minRestMinutes,
});


const unusedSlotCount = slotInputs.length - assignments.length;

const unscheduledDetailed = computeUnscheduledReasons({
  unscheduledIds: unscheduled,
  games: schedulable.map((g) => ({
    engineGameId: g.engineGameId,
    homeRef: g.homeRef ?? null,
    awayRef: g.awayRef ?? null,
  })),
  slots: slotInputs.map((s) => ({ id: s.id, start: s.start })),
  assignments,
  minRestMinutes,
});



    // Upgrade 5: Create Times ONLY for scheduled assignments + write to Games (single transaction)
    const createdTimesByAssignment = await prisma.$transaction(async (tx) => {
      const created: Array<{
        engineGameId: string;
        timesId: number;
        start: string;
        location: string;
      }> = [];

      for (const a of assignments) {
        const slot = slotById.get(a.slotId);
        if (!slot) continue;

        const dt = new Date(slot.start);

        // 1) Create Times row for this scheduled game
        const timesRow = await tx.times.create({
          data: {
            bracketId,
            day: weekdayShort(dt),
            date: dateISO(dt),
            timeSlots: slot.start, // keep your existing field usage
            location: slot.location,
            gameType: bracket.format ?? "",
            type: "SLOT",
          },
          select: { id: true },
        });

        // 2) Update the game to point at that Times row
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
          start: slot.start,
          location: slot.location,
        });
      }

      return created;
    });

    return NextResponse.json({
      ok: true,
      bracketId,
      youthLevel: bracket.youthLevel,
      minRestMinutes,
      createdSlotCount: createdTimesByAssignment.length,
      stageTypesApplied: [...allowedStageTypes],
      candidateGameCount: schedulable.length,
      scheduledCount: assignments.length,
      unscheduledCount: unscheduled.length,
      unscheduled,
      unusedSlotCount,
      unscheduledDetailed,
scheduleMeta: meta,
      // ✅ Upgrade 4 response fields
      blockedCount: blocked.length,
      blocked,
    });
  } catch (err: any) {
    console.error("SCHEDULE ERROR:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Internal Server Error",
        code: err?.code,
        meta: err?.meta,
      },
      { status: 500 }
    );
  }
}
