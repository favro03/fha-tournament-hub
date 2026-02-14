// app/api/brackets/[bracketId]/resolve-placement/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPoolSeedOrder } from "@/lib/tournament-engine/standings/roundRobinStandings";
import { resolvePoolRankGames } from "@/lib/tournament-engine/advancement/resolvePoolRank";
import type { Game as EngineGame, ParticipantRef, TeamInput } from "@/lib/tournament-engine/types";

type Body = {
  poolId?: string;
};

function isTeamRef(ref: ParticipantRef): ref is { type: "TEAM"; teamId: string } {
  return ref?.type === "TEAM" && typeof (ref as any).teamId === "string";
}

function isResolvedForScheduling(homeRef: ParticipantRef | null, awayRef: ParticipantRef | null) {
  return (
    !!homeRef &&
    !!awayRef &&
    homeRef.type === "TEAM" &&
    awayRef.type === "TEAM" &&
    typeof (homeRef as any).teamId === "string" &&
    typeof (awayRef as any).teamId === "string"
  );
}

function poolPlayComplete(games: EngineGame[], poolId: string) {
  const poolGames = games.filter((g) => g.stageType === "POOL_PLAY" && g.stageId === poolId);
  if (poolGames.length === 0) return false;
  return poolGames.every((g) => g.status === "FINAL");
}

function refType(ref: ParticipantRef | null) {
  return ref?.type ?? "NULL";
}

function refToDisplayName(ref: ParticipantRef, teamNameByExternalId: Map<string, string>) {
  if (ref.type === "TEAM") return teamNameByExternalId.get(ref.teamId) ?? ref.teamId;
  if (ref.type === "POOL_RANK") return `Seed ${ref.rank}`;
  if (ref.type === "WINNER_OF") return `Winner of ${ref.gameId}`;
  if (ref.type === "LOSER_OF") return `Loser of ${ref.gameId}`;
  return "";
}

export async function POST(req: Request, ctx: { params: Promise<{ bracketId: string }> }) {
  try {
    const { bracketId: bracketIdParam } = await ctx.params;
    const bracketId = Number(bracketIdParam);

    if (!Number.isFinite(bracketId)) {
      return NextResponse.json({ ok: false, error: "Invalid bracketId" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const poolId = (body.poolId ?? "pool-A").trim();

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

    // Convert DB games -> engine games and gather team names from pool play
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

    const teamIds = [...teamNameByExternalId.keys()];
    const teams: TeamInput[] = teamIds.map((id) => ({ id, name: teamNameByExternalId.get(id) ?? id }));

    const rules = (bracket.standingsRules ?? null) as any;
    const { orderedTeamIds, ranked } = getPoolSeedOrder({ teams, games: engineGames, poolId, rules });

    const placementGamesBefore = engineGames.filter((g) => g.stageType === "PLACEMENT");
    const blockedBefore = placementGamesBefore
      .filter((g) => !isResolvedForScheduling((g.home ?? null) as any, (g.away ?? null) as any))
      .map((g) => ({
        engineGameId: g.id,
        stageType: g.stageType,
        homeRefType: refType((g.home ?? null) as any),
        awayRefType: refType((g.away ?? null) as any),
      }));

    const isComplete = poolPlayComplete(engineGames, poolId);
    if (!isComplete) {
      return NextResponse.json({
        ok: true,
        bracketId,
        poolId,
        poolPlayComplete: false,
        message:
          "Pool play is not complete yet. Mark all POOL_PLAY games FINAL first, then call resolve-placement again.",
        seeds: orderedTeamIds,
        standings: ranked,
        placementGamesBefore,
        blockedCount: blockedBefore.length,
        blocked: blockedBefore,
      });
    }

    // Resolve POOL_RANK -> TEAM
    const resolved = resolvePoolRankGames({ games: engineGames, poolId, orderedTeamIds });
    const placementGamesAfter = resolved.filter((g) => g.stageType === "PLACEMENT");

    // 🔒 Idempotency guard: only update games that are NOT already TEAM vs TEAM.
    const toUpdate = placementGamesAfter.filter(
      (g) => !isResolvedForScheduling((g.home ?? null) as any, (g.away ?? null) as any) ||
             !isResolvedForScheduling((g.home ?? null) as any, (g.away ?? null) as any) // (kept explicit for readability)
    );

    // Actually better: update if either side was non-TEAM in the DB originally.
    // We can compute that directly by looking up the original game refs.
    const originalById = new Map(
      bracket.games
        .filter((g) => g.stageType === "PLACEMENT")
        .map((g) => [g.engineGameId, { homeRef: g.homeRef as any as ParticipantRef, awayRef: g.awayRef as any as ParticipantRef }])
    );

    const toUpdateFinal = placementGamesAfter.filter((g) => {
      const orig = originalById.get(g.id);
      if (!orig) return true;
      return !isResolvedForScheduling(orig.homeRef ?? null, orig.awayRef ?? null);
    });

    await prisma.$transaction(
      toUpdateFinal.map((g) =>
        prisma.game.update({
          where: {
            bracketId_engineGameId: { bracketId, engineGameId: g.id },
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

    const blockedAfter = placementGamesAfter
      .filter((g) => !isResolvedForScheduling(g.home as any, g.away as any))
      .map((g) => ({
        engineGameId: g.id,
        stageType: g.stageType,
        homeRefType: refType(g.home as any),
        awayRefType: refType(g.away as any),
      }));

    return NextResponse.json({
      ok: true,
      bracketId,
      poolId,
      poolPlayComplete: true,
      seeds: orderedTeamIds,
      standings: ranked,
      placementGamesAfter,
      resolvedPlacementCount: placementGamesAfter.length,
      updatedCount: toUpdateFinal.length,
      blockedCount: blockedAfter.length,
      blocked: blockedAfter,
    });
  } catch (err: any) {
    console.error("RESOLVE PLACEMENT ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal Server Error", code: err?.code, meta: err?.meta },
      { status: 500 }
    );
  }
}
