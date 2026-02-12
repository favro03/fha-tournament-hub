// lib/tournament-engine/standings/roundRobinStandings.ts
import type { Game, StandingsRules, TeamInput } from "../types";

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

function emptyStanding(teamId: string): TeamStanding {
  return { teamId, gp: 0, w: 0, l: 0, t: 0, pts: 0, gf: 0, ga: 0, pim: 0 };
}

function isPoolGame(g: Game, poolId: string) {
  return g.stageType === "POOL_PLAY" && g.stageId === poolId;
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

    // We only support TEAM vs TEAM for pool games in v1
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

    // Determine win/tie/loss + points
    if (hs > as) {
      home.w += 1;
      away.l += 1;

      const shutout = as === 0;
      home.pts += rules.points.win + (shutout ? (rules.points.shutoutBonus ?? 0) : 0);
    } else if (as > hs) {
      away.w += 1;
      home.l += 1;

      const shutout = hs === 0;
      away.pts += rules.points.win + (shutout ? (rules.points.shutoutBonus ?? 0) : 0);
    } else {
      // tie
      home.t += 1;
      away.t += 1;
      home.pts += rules.points.tie;
      away.pts += rules.points.tie;
    }
  }

  return [...map.values()];
}

/**
 * Sort standings according to rules.
 * v1 supports: POINTS -> GA -> GF -> PIM
 * (Head-to-head will be added next.)
 */
export function rankStandings(args: {
  standings: TeamStanding[];
  rules: StandingsRules;
}): TeamStanding[] {
  const { standings, rules } = args;

  const sorted = [...standings].sort((a, b) => {
    // Primary: points (desc)
    if (b.pts !== a.pts) return b.pts - a.pts;

    // Apply tiebreakers in configured order
    for (const tb of rules.tiebreakers) {
      if (tb === "GOALS_ALLOWED") {
        if (a.ga !== b.ga) return a.ga - b.ga; // lower GA better
      }
      if (tb === "GOALS_FOR") {
        if (b.gf !== a.gf) return b.gf - a.gf; // higher GF better
      }
      if (tb === "PENALTY_MINUTES") {
        if (a.pim !== b.pim) return a.pim - b.pim; // lower PIM better
      }
      if (tb === "GOAL_DIFF") {
        const ad = a.gf - a.ga;
        const bd = b.gf - b.ga;
        if (bd !== ad) return bd - ad; // higher diff better
      }

      // HEAD_TO_HEAD and COIN_FLIP are intentionally skipped in v1 sorting.
      // We'll implement H2H next step.
    }

    // Final stable fallback: teamId asc
    return a.teamId.localeCompare(b.teamId);
  });

  return sorted;
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
  const ranked = rankStandings({ standings, rules: args.rules });
  return { orderedTeamIds: ranked.map((r) => r.teamId), ranked };
}
