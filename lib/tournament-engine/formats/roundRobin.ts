// lib/tournament-engine/formats/roundRobin.ts
import type {
  Game,
  Plan,
  RoundRobinConfig,
  TeamInput,
  PlacementGameRule,
  StandingsRules,
} from "../types";

/** Default standings rules to match your screenshot */
function defaultStandingsRules(): StandingsRules {
  return {
    points: {
      win: 2,
      tie: 1,
      loss: 0,
      shootoutWin: 2,  // still counts as a win
      shutoutBonus: 1, // +1 point for a shutout win (total 3)
    },
    tiebreakers: ["HEAD_TO_HEAD", "GOALS_ALLOWED", "GOALS_FOR", "PENALTY_MINUTES"],
  };
}

/**
 * Single round-robin pairings:
 * Every unique matchup exactly once.
 */
function allPairs(teamIds: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      pairs.push([teamIds[i], teamIds[j]]);
    }
  }
  return pairs;
}

/**
 * Build a balanced set of matchups where each team plays exactly gamesPerTeam games.
 * Works when (n * gamesPerTeam) is even (so total games is an integer).
 * Tries to avoid duplicate matchups until necessary.
 */
function buildBalancedPairs(teamIds: string[], gamesPerTeam: number): Array<[string, string]> {
  const n = teamIds.length;

  if (gamesPerTeam < 1) throw new Error("gamesPerTeam must be >= 1");
  if (gamesPerTeam > n - 1) throw new Error("gamesPerTeam cannot exceed teamCount - 1");

  const totalTeamGames = n * gamesPerTeam;
  if (totalTeamGames % 2 !== 0) {
    throw new Error(
      `Invalid gamesPerTeam=${gamesPerTeam} for ${n} teams (n*gamesPerTeam must be even).`
    );
  }

  const targetGames = totalTeamGames / 2;

  // Track how many games each team has been assigned
  const gamesCount: Record<string, number> = Object.fromEntries(teamIds.map((id) => [id, 0]));

  const chosen: Array<[string, string]> = [];
  const used = new Set<string>();

  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  // Greedy pick: repeatedly pair teams that still need games, preferring unused matchups
  while (chosen.length < targetGames) {
    // Teams sorted by "games still needed" (descending)
    const needs = [...teamIds].sort(
      (a, b) => (gamesPerTeam - gamesCount[b]) - (gamesPerTeam - gamesCount[a])
    );

    let placed = false;

    // First pass: only unused matchups
    for (let i = 0; i < needs.length && !placed; i++) {
      const a = needs[i];
      if (gamesCount[a] >= gamesPerTeam) continue;

      for (let j = i + 1; j < needs.length && !placed; j++) {
        const b = needs[j];
        if (gamesCount[b] >= gamesPerTeam) continue;

        const k = key(a, b);
        if (used.has(k)) continue;

        used.add(k);
        chosen.push([a, b]);
        gamesCount[a]++;
        gamesCount[b]++;
        placed = true;
      }
    }

    if (placed) continue;

    // Fallback: allow repeats only if absolutely necessary
    for (let i = 0; i < needs.length && !placed; i++) {
      const a = needs[i];
      if (gamesCount[a] >= gamesPerTeam) continue;

      for (let j = i + 1; j < needs.length && !placed; j++) {
        const b = needs[j];
        if (gamesCount[b] >= gamesPerTeam) continue;

        chosen.push([a, b]);
        gamesCount[a]++;
        gamesCount[b]++;
        placed = true;
      }
    }

    if (!placed) {
      throw new Error("Unable to generate balanced matchups with the given gamesPerTeam.");
    }
  }

  return chosen;
}

/**
 * Create placement games using POOL_RANK references.
 * This matches: #1v2, #3v4, #5v6, etc.
 */
function buildPlacementGames(args: {
  poolId: string;
  rules: PlacementGameRule[];
}): Game[] {
  const { poolId, rules } = args;

  const makeGame = (id: string, seedA: number, seedB: number): Game => ({
    id,
    stageType: "PLACEMENT",
    stageId: "placement",
    round: 99,
    home: { type: "POOL_RANK", poolId, rank: seedA },
    away: { type: "POOL_RANK", poolId, rank: seedB },
    status: "UNSCHEDULED",
  });

  return rules.map((r) => {
    switch (r.type) {
      case "CHAMPIONSHIP":
        return makeGame("place_1v2", 1, 2);
      case "THIRD_PLACE":
        return makeGame("place_3v4", 3, 4);
      case "FIFTH_PLACE":
        return makeGame("place_5v6", 5, 6);
      case "CUSTOM":
        return makeGame(`place_${r.seedA}v${r.seedB}`, r.seedA, r.seedB);
      default: {
        const _never: never = r;
        return _never;
      }
    }
  });
}

/**
 * Round Robin Generator (v1.1):
 * - single pool
 * - pool play games generated (full RR OR balanced gamesPerTeam)
 * - optional placement games (seed-based)
 */
export function generateRoundRobin(args: {
  config: RoundRobinConfig;
  teams: TeamInput[];
}): Plan {
  const { config, teams } = args;

  if (teams.length < 2) {
    throw new Error("Round robin requires at least 2 teams.");
  }

  const teamIds = teams.map((t) => t.id);
  const poolId = "pool-A";

  const standingsRules = config.standingsRules ?? defaultStandingsRules();

  // --- Pool play games ---
  let pairs: Array<[string, string]>;
  if (typeof config.gamesPerTeam === "number") {
    pairs = buildBalancedPairs(teamIds, config.gamesPerTeam);
  } else {
    pairs = allPairs(teamIds); // full round robin
  }

  const poolGames: Game[] = pairs.map(([a, b], idx) => ({
    id: `poolA_${idx + 1}`,
    stageType: "POOL_PLAY",
    stageId: poolId,
    round: 1,
    home: { type: "TEAM", teamId: a },
    away: { type: "TEAM", teamId: b },
    status: "UNSCHEDULED",
  }));

  // --- Placement games (seed-based) ---
  const placementRules = config.placementGames ?? [];
  const placementGames = buildPlacementGames({ poolId, rules: placementRules });

  return {
    format: "ROUND_ROBIN",
    pools: [{ id: poolId, name: "Pool A", teamIds }],
    games: [...poolGames, ...placementGames],
    meta: {
      version: "1.1",
      standingsRules,
      notes:
        "RR v1.1: single pool, unscheduled games, supports balanced gamesPerTeam, placement games seeded from pool standings.",
    },
  };
}
