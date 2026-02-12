// lib/tournament-engine/formats/jamboree.ts
import type { JamboreeConfig, Plan, TeamInput } from "../types";

export function generateJamboree(args: {
  config: JamboreeConfig;
  teams: TeamInput[];
}): Plan {
  const { config, teams } = args;

  if (teams.length < 2) {
    throw new Error("Jamboree requires at least 2 teams.");
  }

  return {
    format: "JAMBOREE",
    games: [],
    meta: { todo: `Implement jamboree generator (gamesPerTeam=${config.gamesPerTeam}).` },
  };
}
