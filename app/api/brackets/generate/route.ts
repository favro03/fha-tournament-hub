// app/api/brackets/generate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePlan } from "@/lib/tournament-engine/generatePlan";
import type {
  TeamInput,
  GeneratorConfig,
  ParticipantRef,
} from "@/lib/tournament-engine/types";
import { parseLevelFromStageId } from "@/lib/tournament-engine/scheduling/scheduleGames";

function refToDisplayName(ref: ParticipantRef, teamsById: Map<string, string>) {
  if (ref.type === "TEAM") return teamsById.get(ref.teamId) ?? ref.teamId;
  if (ref.type === "POOL_RANK") return `Seed ${ref.rank}`;
  if (ref.type === "WINNER_OF") return `Winner of ${ref.gameId}`;
  if (ref.type === "LOSER_OF") return `Loser of ${ref.gameId}`;
  return "";
}

export async function POST(req: Request) {
  const body = await req.json();

  const {
    name,
    youthLevel,
    date,
    teams,
    config,
  }: {
    name: string;
    youthLevel: string;
    date: string;
    teams: TeamInput[];
    config: GeneratorConfig;
  } = body;

  if (!Array.isArray(teams) || teams.length < 2) {
    return NextResponse.json(
      { ok: false, error: "teams must be an array with at least 2 teams" },
      { status: 400 }
    );
  }

  let plan: any;
  try {
    plan = generatePlan({ config, teams });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to generate plan" },
      { status: 400 }
    );
  }

  if (!plan || !Array.isArray(plan.games)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Invalid plan generated. Check config.type. Supported in this repo: ROUND_ROBIN, SINGLE_ELIMINATION, JAMBOREE.",
        debug: {
          receivedType: (config as any)?.type ?? null,
          hasGames: !!plan?.games,
        },
      },
      { status: 400 }
    );
  }

  const teamsById = new Map(teams.map((t) => [t.id, t.name]));

  // Upgrade 8.6: persist stageIdLevels into engineConfig
  const inferredStageIdLevels: Record<string, string> = {};
  for (const g of plan.games ?? []) {
    if (!g?.stageId) continue;
    const token = parseLevelFromStageId(g.stageId);
    if (token) inferredStageIdLevels[g.stageId] = token;
  }

  const metaAny = plan.meta as any;

  const engineConfigToSave = {
    ...(config as any),
    stageIdLevels:
      metaAny?.stageIdLevels && typeof metaAny.stageIdLevels === "object"
        ? metaAny.stageIdLevels
        : inferredStageIdLevels,
    ...(metaAny?.stageIdRestMinutes && typeof metaAny.stageIdRestMinutes === "object"
      ? { stageIdRestMinutes: metaAny.stageIdRestMinutes }
      : {}),
  };

  const created = await prisma.$transaction(async (tx) => {
    const bracket = await tx.bracket.create({
      data: {
        name,
        youthLevel,
        date,
        image: "",
        bracketName: "",
        tournamentFormat:
          config.type === "JAMBOREE" ? "JAMBOREE" : "POOL_PLACEMENT",
        format: plan.format,
        engineConfig: engineConfigToSave as any,
        standingsRules: (plan.meta?.standingsRules ?? null) as any,
      },
    });

    await tx.team.createMany({
      data: teams.map((t) => ({
        teamName: t.name,
        bracketId: bracket.id,
      })),
    });

    await tx.game.createMany({
      data: plan.games.map((g: any) => ({
        bracketId: bracket.id,
        engineGameId: g.id,
        stageType: g.stageType,
        stageId: g.stageId,
        round: g.round ?? null,
        status: g.status,

        homeRef: g.home as any,
        awayRef: g.away as any,
        result: g.result ? (g.result as any) : null,

        homeTeam: refToDisplayName(g.home, teamsById),
        awayTeam: refToDisplayName(g.away, teamsById),
        day: "",
        date: "",
        time: "",
        location: "",
        homeScore: g.result?.homeScore ?? 0,
        awayScore: g.result?.awayScore ?? 0,
        homePenalty: g.result?.homePim ?? 0,
        awayPenalty: g.result?.awayPim ?? 0,
        gameType: plan.format,
        label:
          g.stageType === "PLACEMENT"
            ? "Placement"
            : g.stageType === "JAMBOREE"
              ? "Jamboree"
              : "Pool Play",
      })),
    });

    return bracket;
  });

  const sampleStageIds = Array.from(
    new Set((plan.games as any[]).map((g) => g.stageId).filter(Boolean))
  ).slice(0, 10);

  return NextResponse.json({
    ok: true,
    bracketId: created.id,
    format: plan.format,
    savedYouthLevel: youthLevel,
    sampleStageIds,
    savedEngineConfigStageIdLevels: engineConfigToSave.stageIdLevels ?? {},
  });
}
