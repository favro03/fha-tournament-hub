// lib/tournament-engine/generatePlan.ts
import type { GeneratorConfig, Plan, TeamInput } from "./types";
import { generateRoundRobin } from "./formats/roundRobin";
import { generateSingleElimination } from "./formats/singleElimination";
import { generateJamboree } from "./formats/jamboree";

/**
 * Main entry point: build a tournament Plan from config + teams.
 * This file lets your app call ONE function regardless of bracket type.
 */
export function generatePlan(args: {
  config: GeneratorConfig;
  teams: TeamInput[];
}): Plan {
  const { config, teams } = args;

  switch (config.type) {
    case "ROUND_ROBIN":
      return generateRoundRobin({ config, teams });

    case "SINGLE_ELIMINATION":
      return generateSingleElimination({ config, teams });

    case "JAMBOREE":
      return generateJamboree({ config, teams });

    case "DOUBLE_ELIMINATION":
      // You can implement later; for now throw so it's obvious in dev
      throw new Error("DOUBLE_ELIMINATION not implemented yet.");

    default: {
      const _exhaustive: never = config;
      return _exhaustive;
    }
  }
}
