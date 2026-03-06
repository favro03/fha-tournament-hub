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
  slots: Array<{ start: string; location: string; allowedStageTypes?: string[] }>;
  stageTypes?: string[];
  /**
   * If true (APPLY only), clears any existing scheduled assignments for the requested stageTypes
   * before scheduling.
   *
   * Safety guard: We do NOT auto-clear by default.
   */
  clearExisting?: boolean;
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

function normalizeStageTypes(input: unknown, fallback: string[] = ["POOL_PLAY"]) {
  if (!Array.isArray(input)) return fallback;
  const out = input
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  return out.length ? out : fallback;
}

function isSundayLocal(isoWithOffset: string) {
  const d = new Date(isoWithOffset);
  if (Number.isNaN(d.getTime())) return false;
  // 0 = Sunday in local time zone implied by the offset
  return d.getDay() === 0;
}

function normalizeSlotsWithSundayRule(
  slots: Array<{ start: string; location: string; allowedStageTypes?: string[] }>
): Array<{ start: string; location: string; allowedStageTypes?: string[] }> {
  return (slots ?? []).map((s) => {
    const start = String(s?.start ?? "").trim();
    const location = String(s?.location ?? "").trim();

    const allowed = Array.isArray(s?.allowedStageTypes)
      ? s.allowedStageTypes.map((x) => String(x || "").trim()).filter(Boolean)
      : [];

    // ✅ Upgrade 9: Sunday default
    // If the admin didn't specify allowedStageTypes for a Sunday slot, default it to PLACEMENT.
    // They can override by explicitly setting allowedStageTypes: ["POOL_PLAY"].
    const allowedStageTypes =
      allowed.length > 0
        ? allowed
        : start && isSundayLocal(start)
          ? ["PLACEMENT"]
          : undefined;

    return { start, location, allowedStageTypes };
  });
}

async function getUnresolvedPlacementGames(bracketId: number) {
  const placement = await prisma.game.findMany({
    where: { bracketId, stageType: "PLACEMENT" },
    select: {
      engineGameId: true,
      stageId: true,
      status: true,
      timesId: true,
      homeRef: true,
      awayRef: true,
    },
  });

  const unresolved = placement
    .filter((g) => {
      const homeRef = (g.homeRef ?? null) as ParticipantRef | null;
      const awayRef = (g.awayRef ?? null) as ParticipantRef | null;
      return !isResolvedForScheduling(homeRef, awayRef);
    })
    .map((g) => {
      const homeRef = (g.homeRef ?? null) as ParticipantRef | null;
      const awayRef = (g.awayRef ?? null) as ParticipantRef | null;
      return {
        engineGameId: g.engineGameId,
        stageId: g.stageId,
        homeRefType: refType(homeRef),
        awayRefType: refType(awayRef),
        status: g.status,
        timesId: g.timesId,
      };
    });

  return { total: placement.length, unresolved };
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

/**
 * Reorder POOL_PLAY games so we don't feed the scheduler a bunch of Team 1 games first.
 * This dramatically improves early slot fill (like Friday night) without changing engine logic.
 */
function reorderPoolGamesAvoidBackToBack(games: any[]) {
  const remaining = [...games];
  const out: any[] = [];

  const teamIdsOf = (g: any) => {
    const a = g.homeRef?.teamId;
    const b = g.awayRef?.teamId;
    return [a, b].filter(Boolean) as string[];
  };

  let lastTeams = new Set<string>();

  while (remaining.length) {
    // Prefer a game that doesn't include the last game's teams
    let idx = remaining.findIndex((g) => {
      const ids = teamIdsOf(g);
      return ids.every((id) => !lastTeams.has(id));
    });

    // If none found, just take the first remaining
    if (idx === -1) idx = 0;

    const next = remaining.splice(idx, 1)[0];
    out.push(next);

    lastTeams = new Set(teamIdsOf(next));
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

    // ✅ DB-backed strict rules (Option B)
    const normalizedLevel = String(bracket.youthLevel ?? "")
      .trim()
      .toUpperCase();

    const rule =
      (await prisma.tournamentRule.findUnique({
        where: { youthLevel: normalizedLevel },
        select: {
          youthLevel: true,
          gameMinutes: true,
          zamboniMinutes: true,
          restAfterEndMinutes: true,
        },
      })) ?? null;

    // Fallbacks if rule row not found (should rarely happen once seeded)
    const derivedMinRestMinutes =
      rule?.restAfterEndMinutes ?? getMinRestMinutes(bracket.youthLevel);

    // This must be passed to scheduleGamesGreedySmart (or it will behave wrong)
    const gameDurationMinutes = rule?.gameMinutes ?? 60;

    const allowedStageTypes = new Set(normalizeStageTypes(body.stageTypes));

    // ✅ Upgrade 9: normalize slots (Sunday defaults + trim)
    const normalizedSlots = normalizeSlotsWithSundayRule(body.slots);

    // ✅ Safety Guard: unresolved placement games must be resolved BEFORE scheduling placement.
    if (allowedStageTypes.has("PLACEMENT")) {
      const { unresolved } = await getUnresolvedPlacementGames(bracketId);
      if (unresolved.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            errorCode: "UNRESOLVED_PLACEMENT_GAMES",
            message:
              "Cannot schedule PLACEMENT games until placement references are resolved. Call /resolve-placement first (and ensure pool play games are FINAL).",
            unresolvedCount: unresolved.length,
            unresolved,
          },
          { status: 409 }
        );
      }
    }

    // ✅ Safety Guard: prevent double scheduling.
    // We don't auto-clear. Admin must either clear explicitly (/schedule/clear)
    // or pass clearExisting=true (APPLY only).
    const existingScheduled = await prisma.game.findMany({
      where: {
        bracketId,
        stageType: { in: [...allowedStageTypes] },
        OR: [{ timesId: { not: null } }, { status: "SCHEDULED" }],
      },
      select: {
        engineGameId: true,
        stageType: true,
        stageId: true,
        timesId: true,
        status: true,
      },
      take: 25,
    });

    if (existingScheduled.length > 0) {
      const canClear = !preview && body.clearExisting === true;
      if (!canClear) {
        return NextResponse.json(
          {
            ok: false,
            errorCode: "ALREADY_SCHEDULED",
            message:
              "Some games are already scheduled for the selected stage types. Clear the existing schedule before preview/apply to avoid double scheduling.",
            alreadyScheduledCount: existingScheduled.length,
            examples: existingScheduled,
            hint:
              "POST /api/brackets/:id/schedule/clear with { stageTypes: [...] } OR Apply with clearExisting=true",
          },
          { status: 409 }
        );
      }

      // APPLY + clearExisting=true
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
          .filter((id): id is number => typeof id === "number" && Number.isFinite(id));

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

    const validSlots = normalizedSlots
      .filter(
        (s) =>
          !!s?.start &&
          !!s?.location &&
          Number.isFinite(new Date(s.start).getTime())
      )
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    // ✅ IMPORTANT: keep allowedStageTypes so engine can enforce slot constraints
    const slotInputs = validSlots.map((s, idx) => ({
      id: String(idx),
      start: s.start,
      location: s.location,
      allowedStageTypes: Array.isArray(s.allowedStageTypes)
        ? s.allowedStageTypes
        : undefined,
    }));

    const slotById = new Map(slotInputs.map((s) => [s.id, s]));

    const teams = await prisma.team.findMany({
      where: { bracketId },
      select: { id: true, teamName: true },
    });
    const teamsById = new Map(teams.map((t) => [String(t.id), t.teamName]));

    let totalGames = games.length;
    let stageTypeFiltered = 0;
    let alreadyScheduled = 0;
    let unresolvedRefs = 0;
    let statusFiltered = 0;

    let schedulable = games
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

    // ✅ NEW: reorder POOL_PLAY to avoid feeding repeats early (fills Friday better)
    if (allowedStageTypes.has("POOL_PLAY")) {
      const pool = schedulable.filter((g: any) => g.stageType === "POOL_PLAY");
      const other = schedulable.filter((g: any) => g.stageType !== "POOL_PLAY");
      schedulable = [...reorderPoolGamesAvoidBackToBack(pool), ...other];
    }

    const schedulableCount = schedulable.length;

    const stageIdToRestMinutes = extractStageIdToRestMinutes(bracket.engineConfig);

    const restMinutesForGame = makeRestMinutesResolver({
      fallbackMinutes: derivedMinRestMinutes,
      stageIdToRestMinutes,
    });

    const scheduleResult = scheduleGamesGreedySmart({
      games: schedulable,
      slots: slotInputs,
      minRestMinutes: derivedMinRestMinutes, // REST-AFTER-END fallback
      restMinutesForGame,
      maxAttempts: 7,
      gameDurationMinutes, // ✅ critical for strict “rest after end”
    });

    const { assignments, unscheduled, unscheduledDetailed } = scheduleResult;

    const gameById = new Map(games.map((g) => [g.engineGameId, g]));

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
        allowedStageTypes: s.allowedStageTypes,
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

      // Helpful for verifying strict behavior
      rulesApplied: rule ?? {
        youthLevel: normalizedLevel,
        gameMinutes: gameDurationMinutes,
        zamboniMinutes: 15,
        restAfterEndMinutes: derivedMinRestMinutes,
      },

      derivedMinRestMinutes,
      gameDurationMinutes,

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
          unresolvedRefsCount: unresolvedRefs,
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