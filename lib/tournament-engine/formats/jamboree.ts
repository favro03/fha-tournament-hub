// lib/tournament-engine/formats/jamboree.ts
import type { JamboreeConfig, Plan, TeamInput, ParticipantRef } from "../types";

/**
 * Upgrade 8.6.7:
 * - Make JAMBOREE stageId level-aware for mixed-level brackets.
 *
 * Backwards-compatible:
 * - If config.stages is NOT provided, behaves like a single-stage jamboree:
 *   stageId = "jamboree" (or "jamboree:<levelToken>" if provided)
 *
 * Mixed-level support:
 * - If config.stages IS provided, generate a JAMBOREE "stage" per entry,
 *   each with its own stageId + levelToken, and persist meta.stageIdLevels.
 *
 * Notes:
 * - Uses a simple round-robin (circle method) to produce pairings.
 * - For even team counts N, produces N-1 rounds with N/2 games each.
 * - For odd N, adds a BYE and still produces N rounds.
 */

type JamboreeStage = {
  stageId: string;        // e.g. "jamboree:MITE1" or "day1:MITE1:jamboree"
  levelToken: string;     // e.g. "MINI_MITE" | "MITE1" | "SQUIRT" etc
  gamesPerTeam: number;   // how many games each team plays in this stage
  teamIds?: string[];     // optional subset of teams for that stage
};

function asTeamRef(teamId: string): ParticipantRef {
  return { type: "TEAM", teamId } as any;
}

function normalizeToken(raw: string) {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .trim();
}

function buildStageIdLevels(stages: JamboreeStage[]) {
  const map: Record<string, string> = {};
  for (const s of stages) {
    if (s.stageId) map[s.stageId] = normalizeToken(s.levelToken);
  }
  return map;
}

function makeDefaultStage(configAny: any): JamboreeStage {
  const token =
    typeof configAny.levelToken === "string" && configAny.levelToken
      ? normalizeToken(configAny.levelToken)
      : "";

  // Keep existing behavior: stageId="jamboree" if no token given
  const stageId =
    typeof configAny.stageId === "string" && configAny.stageId
      ? String(configAny.stageId)
      : token
        ? `jamboree:${token}`
        : "jamboree";

  return {
    stageId,
    levelToken: token || "UNKNOWN",
    gamesPerTeam: Number(configAny.gamesPerTeam ?? 3),
  };
}

/**
 * Round-robin pairings for a list of teamIds.
 * Returns rounds: array of games per round: [ [a,b], [c,d] ... ]
 */
function roundRobinPairings(teamIds: string[]) {
  const ids = [...teamIds];

  // If odd, add BYE placeholder
  const BYE = "__BYE__";
  if (ids.length % 2 === 1) ids.push(BYE);

  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;

  // Circle method
  const arr = [...ids];
  const out: Array<Array<[string, string]>> = [];

  for (let r = 0; r < rounds; r++) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== BYE && b !== BYE) pairs.push([a, b]);
    }
    out.push(pairs);

    // rotate (keep first fixed)
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop() as string);
    arr.splice(0, arr.length, fixed, ...rest);
  }

  return out;
}

export function generateJamboree(args: {
  config: JamboreeConfig;
  teams: TeamInput[];
}): Plan {
  const { config, teams } = args;

  if (teams.length < 2) {
    throw new Error("Jamboree requires at least 2 teams.");
  }

  const configAny = config as any;

  // Mixed-level mode: config.stages[]
  const stages: JamboreeStage[] = Array.isArray(configAny.stages)
    ? configAny.stages.map((s: any) => ({
        stageId: String(s.stageId ?? s.id ?? ""),
        levelToken: normalizeToken(s.levelToken ?? s.level ?? s.youthLevel ?? ""),
        gamesPerTeam: Number(s.gamesPerTeam ?? configAny.gamesPerTeam ?? 3),
        teamIds: Array.isArray(s.teamIds) ? s.teamIds.map(String) : undefined,
      }))
    : [makeDefaultStage(configAny)];

  // Validate stages
  for (const s of stages) {
    if (!s.stageId) {
      throw new Error("Jamboree stage is missing stageId.");
    }
    if (!Number.isFinite(s.gamesPerTeam) || s.gamesPerTeam <= 0) {
      throw new Error(`Invalid gamesPerTeam for stageId=${s.stageId}`);
    }
  }

  const allTeamIds = teams.map((t) => t.id);

  const games: any[] = [];
  let stageIndex = 0;

  for (const s of stages) {
    stageIndex++;

    // Choose teams for this stage (subset or all)
    const stageTeamIds = (s.teamIds?.length ? s.teamIds : allTeamIds).filter(
      (id) => allTeamIds.includes(id)
    );

    if (stageTeamIds.length < 2) continue;

    // Pairings via RR rounds
    const rounds = roundRobinPairings(stageTeamIds);

    // For each team, target gamesPerTeam. In RR, each round gives each team 1 game (except BYE handling).
    // So gamesPerTeam ~= number of rounds to include.
    const roundsToUse = Math.min(rounds.length, Math.max(1, Math.floor(s.gamesPerTeam)));

    let gameNum = 0;
    for (let r = 0; r < roundsToUse; r++) {
      for (const [a, b] of rounds[r]) {
        gameNum++;

        games.push({
          id: `jam_${stageIndex}_${gameNum}_${a}_vs_${b}`,
          stageType: "JAMBOREE",
          stageId: s.stageId,
          round: r + 1,
          status: "UNSCHEDULED",
          home: asTeamRef(a),
          away: asTeamRef(b),
          result: null,
        });
      }
    }
  }

  return {
    format: "JAMBOREE",
    games,
    meta: {
      // Upgrade 8.6: generator supplies stageIdLevels so schedule can infer rest-by-level
      stageIdLevels: buildStageIdLevels(stages),
    },
  } as any;
}
