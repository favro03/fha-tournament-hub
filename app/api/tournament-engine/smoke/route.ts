// app/api/tournament-engine/smoke/route.ts
import { NextResponse } from "next/server";
import { generatePlan } from "@/lib/tournament-engine/generatePlan";
import { getPoolSeedOrder } from "@/lib/tournament-engine/standings/roundRobinStandings";
import type { TeamInput } from "@/lib/tournament-engine/types";
import { resolvePoolRankGames } from "@/lib/tournament-engine/advancement/resolvePoolRank";

export async function GET() {
  const teams: TeamInput[] = [
    { id: "t1", name: "Faribault" },
    { id: "t2", name: "Waseca" },
    { id: "t3", name: "CRYHA" },
    { id: "t4", name: "Winona" },
    { id: "t5", name: "Farmington" },
    { id: "t6", name: "Mason City" },
  ];

  const plan = generatePlan({
    config: {
      type: "ROUND_ROBIN",
      gamesPerTeam: 3,
      placementGames: [
        { type: "FIFTH_PLACE" },
        { type: "THIRD_PLACE" },
        { type: "CHAMPIONSHIP" },
      ],
    },
    teams,
  });

  // Clone games so we can safely add fake results for testing
  const gamesWithResults = plan.games.map((g) => ({ ...g }));

  // Fake a few results on the first 6 pool games so standings can compute
  let filled = 0;
  for (const g of gamesWithResults) {
    if (g.stageType !== "POOL_PLAY") continue;
    if (filled >= 6) break;

    g.status = "FINAL";
    g.result = {
      homeScore: 3,
      awayScore: filled % 2 === 0 ? 1 : 3,
      homePim: 2,
      awayPim: 4,
      isFinal: true,
    };

    filled++;
  }

  const rules = plan.meta?.standingsRules as any;

  const { orderedTeamIds, ranked } = getPoolSeedOrder({
    teams,
    games: gamesWithResults,
    poolId: "pool-A",
    rules,
  });

  // ✅ NEW: resolve placement games from POOL_RANK -> TEAM
  const resolvedGames = resolvePoolRankGames({
    games: gamesWithResults,
    poolId: "pool-A",
    orderedTeamIds,
  });

  return NextResponse.json({
    ok: true,
    format: plan.format,
    poolGameCount: gamesWithResults.filter((g) => g.stageType === "POOL_PLAY").length,
    placementGameCount: gamesWithResults.filter((g) => g.stageType === "PLACEMENT").length,

    seeds: orderedTeamIds,
    standings: ranked,

    placementGames_before: gamesWithResults.filter((g) => g.stageType === "PLACEMENT"),
    placementGames_after: resolvedGames.filter((g) => g.stageType === "PLACEMENT"),
  });
}
