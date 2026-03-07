import { prisma } from "@/lib/prisma";
import {
  computePoolStandings,
  rankStandings,
  type TeamStanding,
} from "@/lib/tournament-engine/standings/roundRobinStandings";
import type {
  Game as EngineGame,
  ParticipantRef,
  StandingsRules,
  TeamInput,
  Tiebreaker,
} from "@/lib/tournament-engine/types";

export type PoolStandingsRow = TeamStanding & {
  seed: number;
  teamName: string;
};

export type PoolStandingsView = {
  poolId: string;
  poolName: string;
  rows: PoolStandingsRow[];
};

export type BracketStandingsView = {
  pools: PoolStandingsView[];
  tiebreakers: Tiebreaker[];
};

function isTeamRef(ref: ParticipantRef | null): ref is { type: "TEAM"; teamId: string } {
  return !!ref && ref.type === "TEAM" && typeof (ref as any).teamId === "string";
}

function defaultStandingsRules(): StandingsRules {
  return {
    points: {
      win: 2,
      tie: 1,
      loss: 0,
      shootoutWin: 2,
      shutoutBonus: 1,
    },
    tiebreakers: ["HEAD_TO_HEAD", "GOALS_ALLOWED", "GOALS_FOR", "PENALTY_MINUTES"],
  };
}

function toEngineGames(
  games: Array<{
    engineGameId: string;
    stageType: string;
    stageId: string;
    round: number | null;
    status: string;
    homeRef: unknown;
    awayRef: unknown;
    result: unknown;
    homeScore: number;
    awayScore: number;
    homePenalty: number;
    awayPenalty: number;
  }>
): EngineGame[] {
  return games.map((g) => {
    const existingResult = (g.result ?? null) as any;
    const derivedResult =
      g.status === "FINAL"
        ? {
            homeScore: Number(g.homeScore ?? 0),
            awayScore: Number(g.awayScore ?? 0),
            homePim: Number(g.homePenalty ?? 0),
            awayPim: Number(g.awayPenalty ?? 0),
            isFinal: true,
          }
        : undefined;

    return {
      id: g.engineGameId,
      stageType: g.stageType as any,
      stageId: g.stageId,
      round: g.round ?? undefined,
      status: g.status as any,
      home: (g.homeRef ?? null) as any,
      away: (g.awayRef ?? null) as any,
      result: (existingResult ?? derivedResult) as any,
    };
  });
}

function formatPoolName(poolId: string) {
  const raw = String(poolId ?? "").trim();
  if (!raw) return "Pool";

  if (/^pool[-_]?/i.test(raw)) {
    const suffix = raw.replace(/^pool[-_]?/i, "").trim();
    if (!suffix) return "Pool";
    return `Pool ${suffix.toUpperCase()}`;
  }

  return raw.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

export async function getBracketStandingsView(
  bracketId: number
): Promise<BracketStandingsView | null> {
  const bracket = (await prisma.bracket.findUnique({
    where: { id: bracketId },
    select: {
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
          homeScore: true,
          awayScore: true,
          homePenalty: true,
          awayPenalty: true,
        },
      },
    },
  })) as any;

  if (!bracket) return null;

  const rules = ((bracket.standingsRules ?? null) as StandingsRules | null) ?? defaultStandingsRules();
  const engineGames = toEngineGames(bracket.games);

  const teamNameById = new Map<string, string>();
  for (const g of bracket.games as any[]) {
    const homeRef = (g.homeRef ?? null) as ParticipantRef | null;
    const awayRef = (g.awayRef ?? null) as ParticipantRef | null;

    if (g.stageType !== "POOL_PLAY") continue;

    if (isTeamRef(homeRef)) {
      teamNameById.set(homeRef.teamId, String(g.homeTeam ?? "").trim() || homeRef.teamId);
    }
    if (isTeamRef(awayRef)) {
      teamNameById.set(awayRef.teamId, String(g.awayTeam ?? "").trim() || awayRef.teamId);
    }
  }

  const poolIds = [...new Set(
    (bracket.games as any[])
      .filter((g: any) => g.stageType === "POOL_PLAY" && String(g.stageId ?? "").trim())
      .map((g: any) => String(g.stageId).trim())
  )].sort() as string[];

  const pools: PoolStandingsView[] = poolIds.map((poolId: string) => {
    const teamIds = [...new Set(
      (bracket.games as any[])
        .filter((g: any) => g.stageType === "POOL_PLAY" && g.stageId === poolId)
        .flatMap((g: any) => {
          const ids: string[] = [];
          const homeRef = (g.homeRef ?? null) as ParticipantRef | null;
          const awayRef = (g.awayRef ?? null) as ParticipantRef | null;
          if (isTeamRef(homeRef)) ids.push(homeRef.teamId);
          if (isTeamRef(awayRef)) ids.push(awayRef.teamId);
          return ids;
        })
    )].sort();

    const teams: TeamInput[] = teamIds.map((teamId: string) => ({
      id: teamId,
      name: teamNameById.get(teamId) ?? teamId,
    }));

    const standings = computePoolStandings({
      teams,
      games: engineGames,
      poolId,
      rules,
    });

    const ranked = rankStandings({
      standings,
      games: engineGames,
      poolId,
      rules,
    });

    return {
      poolId,
      poolName: formatPoolName(poolId),
      rows: ranked.map((row, idx) => ({
        ...row,
        seed: idx + 1,
        teamName: teamNameById.get(row.teamId) ?? row.teamId,
      })),
    };
  });

  return {
    pools,
    tiebreakers: rules.tiebreakers ?? [],
  };
}
