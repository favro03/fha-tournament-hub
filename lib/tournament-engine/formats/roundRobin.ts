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
      shootoutWin: 2,
      shutoutBonus: 1,
    },
    tiebreakers: [
      "HEAD_TO_HEAD",
      "GOALS_ALLOWED",
      "GOALS_FOR",
      "PENALTY_MINUTES",
    ],
  };
}

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
 * Build round-based pairings with the circle method.
 * For even team counts, every round contains disjoint matchups, which is exactly
 * what we want for early slot fill on Friday night.
 */
function buildRoundRobinRounds(teamIds: string[]): Array<Array<[string, string]>> {
  if (teamIds.length < 2) return [];
  if (teamIds.length % 2 !== 0) {
    throw new Error("Round-based generation currently requires an even team count.");
  }

  const arr = [...teamIds];
  const rounds: Array<Array<[string, string]>> = [];
  const totalRounds = arr.length - 1;

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const roundPairs: Array<[string, string]> = [];

    for (let i = 0; i < arr.length / 2; i++) {
      const a = arr[i];
      const b = arr[arr.length - 1 - i];
      roundPairs.push([a, b]);
    }

    rounds.push(roundPairs);

    const fixed = arr[0];
    const rotating = arr.slice(1);
    rotating.unshift(rotating.pop()!);
    arr.splice(0, arr.length, fixed, ...rotating);
  }

  return rounds;
}

/**
 * Build a balanced set of matchups where each team plays exactly gamesPerTeam games.
 *
 * Key behavior for FHA scheduling:
 * - For common even-team cases (like 6 teams / 3 guaranteed games), we generate
 *   true round-robin rounds first and then take the first N rounds.
 * - That means the first 3 games for a 6-team bracket are 3 disjoint matchups,
 *   so Friday can fill with 3 games again.
 */
function buildBalancedPairs(
  teamIds: string[],
  gamesPerTeam: number
): Array<[string, string]> {
  const n = teamIds.length;

  if (gamesPerTeam < 1) throw new Error("gamesPerTeam must be >= 1");
  if (gamesPerTeam > n - 1) {
    throw new Error("gamesPerTeam cannot exceed teamCount - 1");
  }

  const totalTeamGames = n * gamesPerTeam;
  if (totalTeamGames % 2 !== 0) {
    throw new Error(
      `Invalid gamesPerTeam=${gamesPerTeam} for ${n} teams (n*gamesPerTeam must be even).`
    );
  }

  if (n % 2 === 0) {
    const rounds = buildRoundRobinRounds(teamIds);
    const selectedRounds = rounds.slice(0, gamesPerTeam);
    return selectedRounds.flat();
  }

  // Fallback greedy behavior for odd-team support if needed later.
  const targetGames = totalTeamGames / 2;
  const gamesCount: Record<string, number> = Object.fromEntries(
    teamIds.map((id) => [id, 0])
  );
  const chosen: Array<[string, string]> = [];
  const used = new Set<string>();
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  while (chosen.length < targetGames) {
    const needs = [...teamIds].sort(
      (a, b) => (gamesPerTeam - gamesCount[b]) - (gamesPerTeam - gamesCount[a])
    );

    let placed = false;

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

  let pairs: Array<[string, string]>;
  if (typeof config.gamesPerTeam === "number") {
    pairs = buildBalancedPairs(teamIds, config.gamesPerTeam);
  } else {
    pairs = allPairs(teamIds);
  }

  const gamesPerRound = teamIds.length % 2 === 0 ? teamIds.length / 2 : 1;

  const poolGames: Game[] = pairs.map(([a, b], idx) => ({
    id: `poolA_${idx + 1}`,
    stageType: "POOL_PLAY",
    stageId: poolId,
    round: Math.floor(idx / gamesPerRound) + 1,
    home: { type: "TEAM", teamId: a },
    away: { type: "TEAM", teamId: b },
    status: "UNSCHEDULED",
  }));

  const placementRules = config.placementGames ?? [];
  const placementGames = buildPlacementGames({ poolId, rules: placementRules });

  return {
    format: "ROUND_ROBIN",
    pools: [{ id: poolId, name: "Pool A", teamIds }],
    games: [...poolGames, ...placementGames],
    meta: {
      version: "1.2",
      standingsRules,
      notes:
        "RR v1.2: even-team balanced games are emitted in round order so early scheduling fills Friday correctly.",
    },
  };
}
