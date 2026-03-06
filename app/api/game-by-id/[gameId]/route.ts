import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPoolSeedOrder } from "@/lib/tournament-engine/standings/roundRobinStandings";
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

function isTeamRef(ref: ParticipantRef | null): ref is { type: "TEAM"; teamId: string } {
  return !!ref && ref.type === "TEAM" && typeof (ref as any).teamId === "string";
}

function isPoolRankRef(
  ref: ParticipantRef | null
): ref is { type: "POOL_RANK"; poolId: string; rank: number } {
  return (
    !!ref &&
    ref.type === "POOL_RANK" &&
    typeof (ref as any).poolId === "string" &&
    typeof (ref as any).rank === "number"
  );
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

function resolveRefUsingSeeds(
  ref: ParticipantRef | null,
  poolId: string,
  orderedTeamIds: string[]
): ParticipantRef | null {
  if (!ref) return null;
  if (ref.type !== "POOL_RANK") return ref;
  if (ref.poolId !== poolId) return ref;

  const idx = ref.rank - 1;
  const teamId = orderedTeamIds[idx];
  if (!teamId) return ref;

  return { type: "TEAM", teamId };
}

function poolPlayComplete(games: EngineGame[], poolId: string) {
  const poolGames = games.filter(
    (g) => g.stageType === "POOL_PLAY" && g.stageId === poolId
  );
  if (poolGames.length === 0) return false;
  return poolGames.every((g) => g.status === "FINAL");
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

  const game = await prisma.game.findUnique({
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

  if (!game) {
    return NextResponse.json(
      { ok: false, error: "Game not found" },
      { status: 404 }
    );
  }

  if (game.bracketId !== bracketId) {
    return NextResponse.json(
      { ok: false, error: "Bracket mismatch" },
      { status: 400 }
    );
  }

  const nextDate =
    "date" in patch ? String(patch.date ?? "").trim() : String(game.date ?? "").trim();

  const nextTime =
    "time" in patch ? String(patch.time ?? "").trim() : String(game.time ?? "").trim();

  const nextLocation =
    "location" in patch
      ? String(patch.location ?? "").trim()
      : String(game.location ?? "").trim();

  const nextStatus =
    "status" in patch ? String(patch.status ?? "").trim() : String(game.status ?? "").trim();

  const nextHomeScore =
    "homeScore" in patch ? Number(patch.homeScore ?? 0) : Number(game.homeScore ?? 0);

  const nextAwayScore =
    "awayScore" in patch ? Number(patch.awayScore ?? 0) : Number(game.awayScore ?? 0);

  const nextHomePenalty =
    "homePenalty" in patch ? Number(patch.homePenalty ?? 0) : Number(game.homePenalty ?? 0);

  const nextAwayPenalty =
    "awayPenalty" in patch ? Number(patch.awayPenalty ?? 0) : Number(game.awayPenalty ?? 0);

  const nextDay = nextDate ? weekdayFromISODate(nextDate) : "";

  const gameData: Record<string, unknown> = {
    date: nextDate,
    day: nextDay,
    time: nextTime,
    location: nextLocation,
    homeScore: Number.isFinite(nextHomeScore) ? nextHomeScore : 0,
    awayScore: Number.isFinite(nextAwayScore) ? nextAwayScore : 0,
    homePenalty: Number.isFinite(nextHomePenalty) ? nextHomePenalty : 0,
    awayPenalty: Number.isFinite(nextAwayPenalty) ? nextAwayPenalty : 0,
    status: nextStatus,
  };

  if (nextStatus === "FINAL") {
    gameData.result = {
      homeScore: Number.isFinite(nextHomeScore) ? nextHomeScore : 0,
      awayScore: Number.isFinite(nextAwayScore) ? nextAwayScore : 0,
      homePim: Number.isFinite(nextHomePenalty) ? nextHomePenalty : 0,
      awayPim: Number.isFinite(nextAwayPenalty) ? nextAwayPenalty : 0,
      isFinal: true,
    } as any;
  } else {
    gameData.result = null;
  }

  try {
    const payload = await prisma.$transaction(async (tx) => {
      await tx.game.update({
        where: { id },
        data: gameData,
      });

      if (game.timesId && game.times) {
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
          where: { id: game.timesId },
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

      if (!bracket) throw new Error("Bracket not found");

      const teamNameByExternalId = new Map<string, string>();

      const engineGames: EngineGame[] = bracket.games.map((g) => {
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

      const allPoolIds = [
        ...new Set(
          engineGames
            .filter((g) => g.stageType === "POOL_PLAY" && typeof g.stageId === "string")
            .map((g) => g.stageId)
        ),
      ];

      const teams: TeamInput[] = [...teamNameByExternalId.entries()].map(([id, name]) => ({
        id,
        name,
      }));

      const rules = bracket.standingsRules as any;
      const seedSummary: Array<{
        poolId: string;
        orderedTeamIds: string[];
        poolPlayComplete: boolean;
      }> = [];

      for (const poolId of allPoolIds) {
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

        const placementGames = engineGames.filter(
          (g) =>
            g.stageType === "PLACEMENT" &&
            (isPoolRankRef(g.home as ParticipantRef | null) ||
              isPoolRankRef(g.away as ParticipantRef | null)) &&
            (
              (isPoolRankRef(g.home as ParticipantRef | null) &&
                (g.home as any).poolId === poolId) ||
              (isPoolRankRef(g.away as ParticipantRef | null) &&
                (g.away as any).poolId === poolId)
            )
        );

        for (const pg of placementGames) {
          const homeResolved = resolveRefUsingSeeds(
            pg.home as ParticipantRef | null,
            poolId,
            orderedTeamIds
          );
          const awayResolved = resolveRefUsingSeeds(
            pg.away as ParticipantRef | null,
            poolId,
            orderedTeamIds
          );

          await tx.game.update({
            where: {
              bracketId_engineGameId: {
                bracketId,
                engineGameId: pg.id,
              },
            },
            data: {
              homeRef: homeResolved as any,
              awayRef: awayResolved as any,
              homeTeam: refToDisplayName(homeResolved, teamNameByExternalId),
              awayTeam: refToDisplayName(awayResolved, teamNameByExternalId),
            },
          });
        }
      }

      const refreshed = await tx.game.findUnique({
        where: { id },
      });

      return { refreshed, seedSummary };
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