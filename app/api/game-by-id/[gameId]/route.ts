import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPoolSeedOrder } from "@/lib/tournament-engine/standings/roundRobinStandings";
import { resolvePoolRankGames } from "@/lib/tournament-engine/advancement/resolvePoolRank";
import type {
  Game as EngineGame,
  ParticipantRef,
  TeamInput,
} from "@/lib/tournament-engine/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function weekdayFromISODate(dateISO: string) {
  if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return "";
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return WEEKDAYS[dt.getDay()] ?? "";
}

function parseUiTimeTo24Hour(value: string): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const twentyFour = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) {
    const hh = Number(twentyFour[1]);
    const mm = Number(twentyFour[2]);
    if (
      Number.isFinite(hh) &&
      Number.isFinite(mm) &&
      hh >= 0 &&
      hh <= 23 &&
      mm >= 0 &&
      mm <= 59
    ) {
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
    }
  }

  const twelveHour = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!twelveHour) return null;

  let hh = Number(twelveHour[1]);
  const mm = Number(twelveHour[2]);
  const ampm = twelveHour[3].toUpperCase();

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 1 || hh > 12 || mm < 0 || mm > 59) return null;

  if (ampm === "AM") {
    if (hh === 12) hh = 0;
  } else {
    if (hh !== 12) hh += 12;
  }

  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
}

function mergeIsoDateAndTime(dateISO: string, uiTime: string): string | null {
  if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return null;

  const normalizedTime = parseUiTimeTo24Hour(uiTime);
  if (!normalizedTime) return null;

  return `${dateISO}T${normalizedTime}`;
}

function toNumber(val: unknown, fallback = 0) {
  const n = typeof val === "number" ? val : Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function isTeamRef(ref: ParticipantRef | null): ref is { type: "TEAM"; teamId: string } {
  return !!ref && ref.type === "TEAM" && typeof (ref as any).teamId === "string";
}

function refToDisplayName(
  ref: ParticipantRef | null,
  teamNameByExternalId: Map<string, string>
) {
  if (!ref) return "";
  if (ref.type === "TEAM") return teamNameByExternalId.get(ref.teamId) ?? ref.teamId;
  if (ref.type === "POOL_RANK") return `Seed ${ref.rank}`;
  if (ref.type === "WINNER_OF") return `Winner of ${ref.gameId}`;
  if (ref.type === "LOSER_OF") return `Loser of ${ref.gameId}`;
  return "";
}

function poolPlayComplete(games: EngineGame[], poolId: string) {
  const poolGames = games.filter(
    (g) => g.stageType === "POOL_PLAY" && g.stageId === poolId
  );
  if (poolGames.length === 0) return false;
  return poolGames.every((g) => g.status === "FINAL");
}

function parseSeedFromLabel(label: string | null | undefined): number | null {
  const raw = String(label ?? "").trim();
  const match = raw.match(/Seed\s*#?\s*(\d+)/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function parseSeedsFromEngineGameId(engineGameId: string): {
  home: number | null;
  away: number | null;
} {
  const raw = String(engineGameId ?? "").trim();

  let m = raw.match(/place_(\d+)v(\d+)/i);
  if (m) {
    return {
      home: Number(m[1]),
      away: Number(m[2]),
    };
  }

  m = raw.match(/:(\d+)v(\d+)$/i);
  if (m) {
    return {
      home: Number(m[1]),
      away: Number(m[2]),
    };
  }

  return { home: null, away: null };
}

function normalizePoolRankRef(args: {
  ref: any;
  poolId: string;
  fallbackSeed: number | null;
}): ParticipantRef | null {
  const { ref, poolId, fallbackSeed } = args;

  if (!ref) {
    if (fallbackSeed == null) return null;
    return { type: "POOL_RANK", poolId, rank: fallbackSeed };
  }

  if (ref.type === "POOL_RANK") {
    const rank =
      typeof ref.rank === "number" && Number.isFinite(ref.rank)
        ? ref.rank
        : fallbackSeed;

    if (rank == null) return null;

    return {
      type: "POOL_RANK",
      poolId: String(ref.poolId ?? poolId),
      rank,
    };
  }

  return ref as ParticipantRef;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await ctx.params;
  const id = Number(gameId);

  const body = await req.json().catch(() => null);
  const bracketId = Number(body?.bracketId);
  const patch = body?.patch ?? {};

  if (!Number.isFinite(id) || !Number.isFinite(bracketId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid gameId or bracketId" },
      { status: 400 }
    );
  }

  const existingGame = await prisma.game.findUnique({
    where: { id },
    include: {
      times: {
        select: {
          id: true,
          day: true,
          date: true,
          timeSlots: true,
          location: true,
        },
      },
    },
  });

  if (!existingGame) {
    return NextResponse.json(
      { ok: false, error: "Game not found" },
      { status: 404 }
    );
  }

  if (existingGame.bracketId !== bracketId) {
    return NextResponse.json(
      { ok: false, error: "Bracket mismatch" },
      { status: 400 }
    );
  }

  const nextDate =
    "date" in patch
      ? String(patch.date ?? "").trim()
      : String(existingGame.date ?? "").trim();

  const nextTime =
    "time" in patch
      ? String(patch.time ?? "").trim()
      : String(existingGame.time ?? "").trim();

  const nextLocation =
    "location" in patch
      ? String(patch.location ?? "").trim()
      : String(existingGame.location ?? "").trim();

  const nextStatus =
    "status" in patch
      ? String(patch.status ?? "").trim()
      : String(existingGame.status ?? "").trim();

  const nextHomeScore =
    "homeScore" in patch
      ? toNumber(patch.homeScore, 0)
      : toNumber(existingGame.homeScore, 0);

  const nextAwayScore =
    "awayScore" in patch
      ? toNumber(patch.awayScore, 0)
      : toNumber(existingGame.awayScore, 0);

  const nextHomePenalty =
    "homePenalty" in patch
      ? toNumber(patch.homePenalty, 0)
      : toNumber(existingGame.homePenalty, 0);

  const nextAwayPenalty =
    "awayPenalty" in patch
      ? toNumber(patch.awayPenalty, 0)
      : toNumber(existingGame.awayPenalty, 0);

  const nextDay = nextDate ? weekdayFromISODate(nextDate) : "";

  const gameUpdateData: Record<string, unknown> = {
    date: nextDate,
    day: nextDay,
    time: nextTime,
    location: nextLocation,
    homeScore: nextHomeScore,
    awayScore: nextAwayScore,
    homePenalty: nextHomePenalty,
    awayPenalty: nextAwayPenalty,
    status: nextStatus,
  };

  if (nextStatus === "FINAL") {
    gameUpdateData.result = {
      homeScore: nextHomeScore,
      awayScore: nextAwayScore,
      homePim: nextHomePenalty,
      awayPim: nextAwayPenalty,
      isFinal: true,
    } as any;
  } else {
    gameUpdateData.result = null;
  }

  try {
    const payload = await prisma.$transaction(async (tx) => {
      await tx.game.update({
        where: { id },
        data: gameUpdateData,
      });

      if (existingGame.timesId && existingGame.times) {
        const timesData: Record<string, unknown> = {
          date: nextDate,
          day: nextDay,
          location: nextLocation || "FIA",
        };

        const mergedIso = mergeIsoDateAndTime(nextDate, nextTime);
        if (mergedIso) {
          timesData.timeSlots = mergedIso;
        }

        await tx.times.update({
          where: { id: existingGame.timesId },
          data: timesData,
        });
      }

      const bracket = await tx.bracket.findUnique({
        where: { id: bracketId },
        select: {
          id: true,
          standingsRules: true,
          games: {
            select: {
              id: true,
              engineGameId: true,
              stageType: true,
              stageId: true,
              round: true,
              status: true,
              homeTeam: true,
              awayTeam: true,
              homeRef: true,
              awayRef: true,
              result: true,
            },
          },
        },
      });

      if (!bracket) {
        throw new Error("Bracket not found");
      }

      const poolIds = [
        ...new Set(
          bracket.games
            .filter((g) => g.stageType === "POOL_PLAY" && g.stageId)
            .map((g) => g.stageId)
        ),
      ];

      const primaryPoolId = poolIds[0] ?? "pool-A";

      for (const g of bracket.games) {
        if (g.stageType !== "PLACEMENT") continue;

        const parsedSeeds = parseSeedsFromEngineGameId(g.engineGameId);
        const fallbackHomeSeed = parseSeedFromLabel(g.homeTeam) ?? parsedSeeds.home;
        const fallbackAwaySeed = parseSeedFromLabel(g.awayTeam) ?? parsedSeeds.away;

        const normalizedHome = normalizePoolRankRef({
          ref: g.homeRef,
          poolId: primaryPoolId,
          fallbackSeed: fallbackHomeSeed,
        });

        const normalizedAway = normalizePoolRankRef({
          ref: g.awayRef,
          poolId: primaryPoolId,
          fallbackSeed: fallbackAwaySeed,
        });

        const homeChanged =
          JSON.stringify(normalizedHome ?? null) !== JSON.stringify(g.homeRef ?? null);
        const awayChanged =
          JSON.stringify(normalizedAway ?? null) !== JSON.stringify(g.awayRef ?? null);

        if (homeChanged || awayChanged) {
          await tx.game.update({
            where: {
              bracketId_engineGameId: {
                bracketId,
                engineGameId: g.engineGameId,
              },
            },
            data: {
              homeRef: normalizedHome as any,
              awayRef: normalizedAway as any,
            },
          });
        }
      }

      const refreshedBracket = await tx.bracket.findUnique({
        where: { id: bracketId },
        select: {
          id: true,
          standingsRules: true,
          games: {
            select: {
              id: true,
              engineGameId: true,
              stageType: true,
              stageId: true,
              round: true,
              status: true,
              homeTeam: true,
              awayTeam: true,
              homeRef: true,
              awayRef: true,
              result: true,
            },
          },
        },
      });

      if (!refreshedBracket) {
        throw new Error("Bracket not found after placement ref repair");
      }

      const teamNameByExternalId = new Map<string, string>();

      const engineGames: EngineGame[] = refreshedBracket.games.map((g) => {
        const homeRef = (g.homeRef ?? null) as ParticipantRef | null;
        const awayRef = (g.awayRef ?? null) as ParticipantRef | null;

        if (g.stageType === "POOL_PLAY") {
          if (isTeamRef(homeRef) && g.homeTeam) {
            teamNameByExternalId.set(homeRef.teamId, g.homeTeam);
          }
          if (isTeamRef(awayRef) && g.awayTeam) {
            teamNameByExternalId.set(awayRef.teamId, g.awayTeam);
          }
        }

        return {
          id: g.engineGameId,
          stageType: g.stageType as any,
          stageId: g.stageId,
          round: g.round ?? undefined,
          status: g.status as any,
          home: (homeRef ?? { type: "TEAM", teamId: "" }) as any,
          away: (awayRef ?? { type: "TEAM", teamId: "" }) as any,
          result: (g.result ?? undefined) as any,
        };
      });

      const teams: TeamInput[] = [...teamNameByExternalId.entries()].map(([id, name]) => ({
        id,
        name,
      }));

      const rules = (refreshedBracket.standingsRules ?? null) as any;

      const seedSummary: Array<{
        poolId: string;
        orderedTeamIds: string[];
        poolPlayComplete: boolean;
      }> = [];

      for (const poolId of poolIds) {
        const { orderedTeamIds } = getPoolSeedOrder({
          teams,
          games: engineGames,
          poolId,
          rules,
        });

        const isComplete = poolPlayComplete(engineGames, poolId);

        seedSummary.push({
          poolId,
          orderedTeamIds,
          poolPlayComplete: isComplete,
        });

        if (!isComplete) continue;

        const resolvedGames = resolvePoolRankGames({
          games: engineGames,
          poolId,
          orderedTeamIds,
        });

        const placementGamesAfter = resolvedGames.filter(
          (g) => g.stageType === "PLACEMENT"
        );

        for (const g of placementGamesAfter) {
          await tx.game.update({
            where: {
              bracketId_engineGameId: {
                bracketId,
                engineGameId: g.id,
              },
            },
            data: {
              homeRef: g.home as any,
              awayRef: g.away as any,
              homeTeam: refToDisplayName(g.home as any, teamNameByExternalId),
              awayTeam: refToDisplayName(g.away as any, teamNameByExternalId),
            },
          });
        }
      }

      const refreshed = await tx.game.findUnique({
        where: { id },
      });

      return {
        refreshed,
        seedSummary,
      };
    });

    return NextResponse.json({
      ok: true,
      game: {
        ...payload.refreshed,
        day: nextDay || payload.refreshed?.day || "",
        date: nextDate || payload.refreshed?.date || "",
        time: nextTime || payload.refreshed?.time || "",
        location: nextLocation || payload.refreshed?.location || "",
      },
      seedSummary: payload.seedSummary,
    });
  } catch (error) {
    console.error("PATCH /api/game-by-id/[gameId] failed:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to update game" },
      { status: 500 }
    );
  }
}