import type { Game, StandingsRules, TeamInput, Tiebreaker } from "../types";

export type TeamStanding = {
  teamId: string;

  gp: number;
  w: number;
  l: number;
  t: number;

  pts: number;

  gf: number;
  ga: number;
  pim: number;
};

type FinalTeamVsTeamPoolGame = Game & {
  status: "FINAL";
  result: NonNullable<Game["result"]>;
  home: { type: "TEAM"; teamId: string };
  away: { type: "TEAM"; teamId: string };
};

function emptyStanding(teamId: string): TeamStanding {
  return { teamId, gp: 0, w: 0, l: 0, t: 0, pts: 0, gf: 0, ga: 0, pim: 0 };
}

function isPoolGame(g: Game, poolId: string) {
  return g.stageType === "POOL_PLAY" && g.stageId === poolId;
}

function isTeamVsTeamPoolGame(
  g: Game,
  poolId: string
): g is FinalTeamVsTeamPoolGame {
  return (
    isPoolGame(g, poolId) &&
    g.status === "FINAL" &&
    !!g.result &&
    g.home.type === "TEAM" &&
    g.away.type === "TEAM"
  );
}

/**
 * Compute standings for a pool.
 * Only counts games with result AND status FINAL.
 */
export function computePoolStandings(args: {
  teams: TeamInput[];
  games: Game[];
  poolId: string;
  rules: StandingsRules;
}): TeamStanding[] {
  const { teams, games, poolId, rules } = args;

  const map = new Map<string, TeamStanding>();
  for (const t of teams) map.set(t.id, emptyStanding(t.id));

  const poolGames = games.filter((g) => isPoolGame(g, poolId));

  for (const g of poolGames) {
    if (g.status !== "FINAL") continue;
    if (!g.result) continue;

    if (g.home.type !== "TEAM" || g.away.type !== "TEAM") continue;

    const homeId = g.home.teamId;
    const awayId = g.away.teamId;

    const home = map.get(homeId);
    const away = map.get(awayId);
    if (!home || !away) continue;

    const hs = g.result.homeScore;
    const as = g.result.awayScore;

    home.gp += 1;
    away.gp += 1;

    home.gf += hs;
    home.ga += as;

    away.gf += as;
    away.ga += hs;

    const homePim = g.result.homePim ?? 0;
    const awayPim = g.result.awayPim ?? 0;
    home.pim += homePim;
    away.pim += awayPim;

    if (hs > as) {
      home.w += 1;
      away.l += 1;

      const shutout = as === 0;
      home.pts +=
        rules.points.win + (shutout ? (rules.points.shutoutBonus ?? 0) : 0);
      away.pts += rules.points.loss ?? 0;
    } else if (as > hs) {
      away.w += 1;
      home.l += 1;

      const shutout = hs === 0;
      away.pts +=
        rules.points.win + (shutout ? (rules.points.shutoutBonus ?? 0) : 0);
      home.pts += rules.points.loss ?? 0;
    } else {
      home.t += 1;
      away.t += 1;
      home.pts += rules.points.tie;
      away.pts += rules.points.tie;
    }
  }

  return [...map.values()];
}

function computeMiniStandings(args: {
  teamIds: string[];
  games: Game[];
  poolId: string;
  rules: StandingsRules;
}) {
  const teams = args.teamIds.map((id) => ({ id, name: id }));
  return computePoolStandings({
    teams,
    games: args.games.filter((g) => {
      if (!isTeamVsTeamPoolGame(g, args.poolId)) return false;
      const homeId = g.home.teamId;
      const awayId = g.away.teamId;
      return args.teamIds.includes(homeId) && args.teamIds.includes(awayId);
    }),
    poolId: args.poolId,
    rules: args.rules,
  });
}

function valueForTiebreaker(
  standing: TeamStanding,
  tb: Tiebreaker,
  miniMap: Map<string, TeamStanding>
) {
  if (tb === "HEAD_TO_HEAD") {
    const mini = miniMap.get(standing.teamId);
    if (!mini) {
      return {
        pts: 0,
        ga: 0,
        gf: 0,
        gd: 0,
        pim: 0,
      };
    }

    return {
      pts: mini.pts,
      ga: mini.ga,
      gf: mini.gf,
      gd: mini.gf - mini.ga,
      pim: mini.pim,
    };
  }

  if (tb === "GOALS_ALLOWED") return standing.ga;
  if (tb === "GOALS_FOR") return standing.gf;
  if (tb === "GOAL_DIFF") return standing.gf - standing.ga;
  if (tb === "PENALTY_MINUTES") return standing.pim;
  return null;
}

function compareByTiebreaker(
  a: TeamStanding,
  b: TeamStanding,
  tb: Tiebreaker,
  miniMap: Map<string, TeamStanding>
) {
  if (tb === "HEAD_TO_HEAD") {
    const av = valueForTiebreaker(a, tb, miniMap) as {
      pts: number;
      ga: number;
      gf: number;
      gd: number;
      pim: number;
    };
    const bv = valueForTiebreaker(b, tb, miniMap) as {
      pts: number;
      ga: number;
      gf: number;
      gd: number;
      pim: number;
    };

    if (bv.pts !== av.pts) return bv.pts - av.pts;
    if (av.ga !== bv.ga) return av.ga - bv.ga;
    if (bv.gf !== av.gf) return bv.gf - av.gf;
    if (bv.gd !== av.gd) return bv.gd - av.gd;
    if (av.pim !== bv.pim) return av.pim - bv.pim;
    return 0;
  }

  if (tb === "GOALS_ALLOWED") {
    if (a.ga !== b.ga) return a.ga - b.ga;
    return 0;
  }

  if (tb === "GOALS_FOR") {
    if (b.gf !== a.gf) return b.gf - a.gf;
    return 0;
  }

  if (tb === "GOAL_DIFF") {
    const ad = a.gf - a.ga;
    const bd = b.gf - b.ga;
    if (bd !== ad) return bd - ad;
    return 0;
  }

  if (tb === "PENALTY_MINUTES") {
    if (a.pim !== b.pim) return a.pim - b.pim;
    return 0;
  }

  return 0;
}

function partitionEqual<T>(
  items: T[],
  getKey: (item: T) => string
): T[][] {
  const groups: T[][] = [];
  let current: T[] = [];
  let currentKey: string | null = null;

  for (const item of items) {
    const key = getKey(item);
    if (currentKey === null || key === currentKey) {
      current.push(item);
      currentKey = key;
    } else {
      groups.push(current);
      current = [item];
      currentKey = key;
    }
  }

  if (current.length > 0) groups.push(current);
  return groups;
}

function sortTiedGroup(args: {
  group: TeamStanding[];
  games: Game[];
  poolId: string;
  rules: StandingsRules;
  tiebreakers: Tiebreaker[];
}): TeamStanding[] {
  const { group, games, poolId, rules, tiebreakers } = args;

  if (group.length <= 1) return group;
  if (tiebreakers.length === 0) {
    return [...group].sort((a, b) => a.teamId.localeCompare(b.teamId));
  }

  const [tb, ...rest] = tiebreakers;

  if (tb === "COIN_FLIP") {
    return [...group].sort((a, b) => a.teamId.localeCompare(b.teamId));
  }

  const miniStandings =
    tb === "HEAD_TO_HEAD"
      ? computeMiniStandings({
          teamIds: group.map((g) => g.teamId),
          games,
          poolId,
          rules,
        })
      : [];

  const miniMap = new Map(miniStandings.map((s) => [s.teamId, s]));

  const sorted = [...group].sort((a, b) => {
    const cmp = compareByTiebreaker(a, b, tb, miniMap);
    if (cmp !== 0) return cmp;
    return a.teamId.localeCompare(b.teamId);
  });

  const equalBuckets = partitionEqual(sorted, (standing) => {
    if (tb === "HEAD_TO_HEAD") {
      const val = valueForTiebreaker(standing, tb, miniMap) as {
        pts: number;
        ga: number;
        gf: number;
        gd: number;
        pim: number;
      };
      return `${val.pts}|${val.ga}|${val.gf}|${val.gd}|${val.pim}`;
    }

    const val = valueForTiebreaker(standing, tb, miniMap);
    return String(val);
  });

  return equalBuckets.flatMap((bucket) =>
    bucket.length > 1
      ? sortTiedGroup({
          group: bucket,
          games,
          poolId,
          rules,
          tiebreakers: rest,
        })
      : bucket
  );
}

/**
 * Sort standings according to rules.
 * Supports: POINTS primary, then configured tiebreakers including HEAD_TO_HEAD.
 */
export function rankStandings(args: {
  standings: TeamStanding[];
  games: Game[];
  poolId: string;
  rules: StandingsRules;
}): TeamStanding[] {
  const { standings, games, poolId, rules } = args;

  const byPoints = [...standings].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    return a.teamId.localeCompare(b.teamId);
  });

  const pointGroups = partitionEqual(byPoints, (standing) =>
    String(standing.pts)
  );

  return pointGroups.flatMap((group) =>
    group.length > 1
      ? sortTiedGroup({
          group,
          games,
          poolId,
          rules,
          tiebreakers: rules.tiebreakers,
        })
      : group
  );
}

/**
 * Convenience: compute + rank, return ordered teamIds.
 */
export function getPoolSeedOrder(args: {
  teams: TeamInput[];
  games: Game[];
  poolId: string;
  rules: StandingsRules;
}): { orderedTeamIds: string[]; ranked: TeamStanding[] } {
  const standings = computePoolStandings(args);
  const ranked = rankStandings({
    standings,
    games: args.games,
    poolId: args.poolId,
    rules: args.rules,
  });
  return { orderedTeamIds: ranked.map((r) => r.teamId), ranked };
}