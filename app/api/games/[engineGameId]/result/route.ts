// app/api/games/[engineGameId]/result/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPoolSeedOrder } from "@/lib/tournament-engine/standings/roundRobinStandings";
import { resolvePoolRankGames } from "@/lib/tournament-engine/advancement/resolvePoolRank";
import type {
  Game as EngineGame,
  ParticipantRef,
  TeamInput,
} from "@/lib/tournament-engine/types";

type Body = {
  bracketId: number; // ✅ required now that engineGameId is only unique per bracket
  homeScore: number;
  awayScore: number;
  homePim?: number;
  awayPim?: number;
};

function toNumber(val: unknown, fallback = 0) {
  const n = typeof val === "number" ? val : Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function isTeamRef(ref: ParticipantRef): ref is { type: "TEAM"; teamId: string } {
  return ref?.type === "TEAM" && typeof (ref as any).teamId === "string";
}

function refToDisplayName(ref: ParticipantRef, teamNameByExternalId: Map<string, string>) {
  if (ref.type === "TEAM") return teamNameByExternalId.get(ref.teamId) ?? ref.teamId;
  if (ref.type === "POOL_RANK") return `Seed ${ref.rank}`;
  if (ref.type === "WINNER_OF") return `Winner of ${ref.gameId}`;
  if (ref.type === "LOSER_OF") return `Loser of ${ref.gameId}`;
  return "";
}

function poolPlayComplete(games: EngineGame[], poolId: string) {
  const poolGames = games.filter((g) => g.stageType === "POOL_PLAY" && g.stageId === poolId);
  if (poolGames.length === 0) return false;
  return poolGames.every((g) => g.status === "FINAL");
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ engineGameId: string }> }
) {
  const { engineGameId } = await ctx.params;
  const body = (await req.json()) as Body;

  const bracketId = Number(body.bracketId);
  if (!Number.isFinite(bracketId)) {
    return NextResponse.json(
      { ok: false, error: "bracketId is required and must be a number" },
      { status: 400 }
    );
  }

  const homeScore = toNumber(body.homeScore);
  const awayScore = toNumber(body.awayScore);
  const homePim = toNumber(body.homePim, 0);
  const awayPim = toNumber(body.awayPim, 0);

  // 1) Update the selected game result (scoped by bracketId + engineGameId)
  await prisma.game.update({
    where: {
      bracketId_engineGameId: {
        bracketId,
        engineGameId,
      },
    },
    data: {
      status: "FINAL",
      homeScore,
      awayScore,
      homePenalty: homePim,
      awayPenalty: awayPim,
      result: { homeScore, awayScore, homePim, awayPim, isFinal: true } as any,
    },
    select: { id: true },
  });

  // 2) Load bracket + games (and standings rules)
  const bracket = await prisma.bracket.findUnique({
    where: { id: bracketId },
    select: {
      id: true,
      standingsRules: true,
      games: {
        select: {
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
    return NextResponse.json({ ok: false, error: "Bracket not found" }, { status: 404 });
  }

  // 3) Convert DB games to engine games + build teamId->name map from existing pool games
  const teamNameByExternalId = new Map<string, string>();

  const engineGames: EngineGame[] = bracket.games.map((g) => {
    const homeRef = (g.homeRef ?? null) as any as ParticipantRef;
    const awayRef = (g.awayRef ?? null) as any as ParticipantRef;

    if (g.stageType === "POOL_PLAY") {
      if (isTeamRef(homeRef) && g.homeTeam) teamNameByExternalId.set(homeRef.teamId, g.homeTeam);
      if (isTeamRef(awayRef) && g.awayTeam) teamNameByExternalId.set(awayRef.teamId, g.awayTeam);
    }

    return {
      id: g.engineGameId,
      stageType: g.stageType as any,
      stageId: g.stageId,
      round: g.round ?? undefined,
      status: g.status as any,
      home: homeRef,
      away: awayRef,
      result: (g.result ?? undefined) as any,
    };
  });

  // Teams list for standings: derive from TEAM refs we’ve seen
  const teamIds = [...teamNameByExternalId.keys()];
  const teams: TeamInput[] = teamIds.map((id) => ({
    id,
    name: teamNameByExternalId.get(id) ?? id,
  }));

  // 4) Compute seeds from current pool results
  const rules = (bracket.standingsRules ?? null) as any;
  const { orderedTeamIds, ranked } = getPoolSeedOrder({
    teams,
    games: engineGames,
    poolId: "pool-A",
    rules,
  });

  // 5) Resolve placement games only if pool play complete
  const isComplete = poolPlayComplete(engineGames, "pool-A");

  let placementGamesAfter = engineGames.filter((g) => g.stageType === "PLACEMENT");

  if (isComplete) {
    const resolved = resolvePoolRankGames({
      games: engineGames,
      poolId: "pool-A",
      orderedTeamIds,
    });

    placementGamesAfter = resolved.filter((g) => g.stageType === "PLACEMENT");

    await prisma.$transaction(
      placementGamesAfter.map((g) =>
        prisma.game.update({
          where: {
            bracketId_engineGameId: {
              bracketId,
              engineGameId: g.id,
            },
          },
          data: {
            homeRef: g.home as any,
            awayRef: g.away as any,
            homeTeam: refToDisplayName(g.home, teamNameByExternalId),
            awayTeam: refToDisplayName(g.away, teamNameByExternalId),
          },
        })
      )
    );
  }

  return NextResponse.json({
    ok: true,
    bracketId,
    updatedEngineGameId: engineGameId,
    seeds: orderedTeamIds,
    standings: ranked,
    placementGamesAfter,
    poolPlayComplete: isComplete,
  });
}
