// lib/tournament-engine/formats/singleElimination.ts
import type { Plan, SingleElimConfig, TeamInput } from "../types";

export function generateSingleElimination(args: {
  config: SingleElimConfig;
  teams: TeamInput[];
}): Plan {
  const { teams } = args;

  if (teams.length < 2) {
    throw new Error("Single elimination requires at least 2 teams.");
  }

  return {
    format: "SINGLE_ELIMINATION",
    games: [],
    meta: { todo: "Implement single elimination generator." },
  };
}
