// app/api/brackets/[bracketId]/resolve-placement/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPoolSeedOrder } from "@/lib/tournament-engine/standings/roundRobinStandings";
import type { Game as EngineGame, ParticipantRef, TeamInput } from "@/lib/tournament-engine/types";

type Body = {
  poolId?: string;
};

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

function isResolvedForScheduling(homeRef: ParticipantRef | null, awayRef: ParticipantRef | null) {
  return isTeamRef(homeRef) && isTeamRef(awayRef);
}

function poolPlayComplete(games: EngineGame[], poolId: string) {
  const poolGames = games.filter((g) => g.stageType === "POOL_PLAY" && g.stageId === poolId);
  if (poolGames.length === 0) return false;
  return poolGames.every((g) => g.status === "FINAL");
}

function refType(ref: ParticipantRef | null) {
  return ref?.type ?? "NULL";
}

function refToDisplayName(ref: ParticipantRef | null, teamNameByExternalId: Map<string, string>) {
  if (!ref) return "";
  if (ref.type === "TEAM") return teamNameByExternalId.get(ref.teamId) ?? `Team ${ref.teamId}`;
  if (ref.type === "POOL_RANK") return `Seed ${ref.rank}`;
  if (ref.type === "WINNER_OF") return `Winner of ${ref.gameId}`;
  if (ref.type === "LOSER_OF") return `Loser of ${ref.gameId}`;
  return "";
}

function resolveRefUsingSeeds(ref: ParticipantRef | null, orderedTeamIds: string[]): ParticipantRef | null {
  if (!ref) return null;
  if (ref.type === "TEAM") return ref;

  if (ref.type === "POOL_RANK") {
    const rank = Number((ref as any).rank);
    const idx = rank - 1;
    const teamId = orderedTeamIds[idx];
    if (teamId) return { type: "TEAM", teamId } as any;
    return ref;
  }

  return ref;
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

    const teamNameByExternalId = new Map<string, string>();

    const engineGames: EngineGame[] = bracket.games.map((g) => {
      const homeRef = (g.homeRef ?? null) as any as ParticipantRef | null;
      const awayRef = (g.awayRef ?? null) as any as ParticipantRef | null;

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
        home: homeRef as any,
        away: awayRef as any,
        result: (g.result ?? undefined) as any,
      };
    });

    const teamIds = [...teamNameByExternalId.keys()];
    const teams: TeamInput[] = teamIds.map((id) => ({
      id,
      name: teamNameByExternalId.get(id) ?? id,
    }));

    const rules = (bracket.standingsRules ?? null) as any;
    const { orderedTeamIds, ranked } = getPoolSeedOrder({ teams, games: engineGames, poolId, rules });

    const placementGamesBefore = engineGames.filter(
      (g) =>
        g.stageType === "PLACEMENT" &&
        (
          (isPoolRankRef(g.home as any) && (g.home as any).poolId === poolId) ||
          (isPoolRankRef(g.away as any) && (g.away as any).poolId === poolId)
        )
    );

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

    const resolvedPlacement = placementGamesBefore.map((g) => {
      const homeResolved = resolveRefUsingSeeds((g.home ?? null) as any, orderedTeamIds);
      const awayResolved = resolveRefUsingSeeds((g.away ?? null) as any, orderedTeamIds);

      return {
        ...g,
        home: homeResolved as any,
        away: awayResolved as any,
      };
    });

    await prisma.$transaction(
      resolvedPlacement.map((g) =>
        prisma.game.update({
          where: {
            bracketId_engineGameId: { bracketId, engineGameId: g.id },
          },
          data: {
            homeRef: g.home as any,
            awayRef: g.away as any,
            homeTeam: refToDisplayName(g.home as any, teamNameByExternalId),
            awayTeam: refToDisplayName(g.away as any, teamNameByExternalId),
          },
        })
      )
    );

    const blockedAfter = resolvedPlacement
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
      placementGamesAfter: resolvedPlacement.map((g) => ({
        id: g.id,
        stageType: g.stageType,
        stageId: g.stageId,
        round: g.round,
        status: g.status,
        home: g.home,
        away: g.away,
      })),
      blockedCount: blockedAfter.length,
      blocked: blockedAfter,
    });
  } catch (err: any) {
    console.error("RESOLVE PLACEMENT ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}