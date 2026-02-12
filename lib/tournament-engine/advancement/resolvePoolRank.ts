// lib/tournament-engine/advancement/resolvePoolRank.ts
import type { Game, ParticipantRef } from "../types";

function resolveRef(ref: ParticipantRef, poolId: string, orderedTeamIds: string[]): ParticipantRef {
  if (ref.type !== "POOL_RANK") return ref;
  if (ref.poolId !== poolId) return ref;

  const idx = ref.rank - 1;
  const teamId = orderedTeamIds[idx];
  if (!teamId) return ref; // not enough teams or standings not complete

  return { type: "TEAM", teamId };
}

/**
 * Replace POOL_RANK references with TEAM references once standings are known.
 * Only affects games that reference the given poolId.
 */
export function resolvePoolRankGames(args: {
  games: Game[];
  poolId: string;
  orderedTeamIds: string[];
}): Game[] {
  const { games, poolId, orderedTeamIds } = args;

  return games.map((g) => {
    const home = resolveRef(g.home, poolId, orderedTeamIds);
    const away = resolveRef(g.away, poolId, orderedTeamIds);

    // only create a new object if something changed
    if (home === g.home && away === g.away) return g;

    return { ...g, home, away };
  });
}
