// app/api/brackets/generate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePlan } from "@/lib/tournament-engine/generatePlan";
import type { TeamInput, GeneratorConfig, ParticipantRef } from "@/lib/tournament-engine/types";

function refToDisplayName(ref: ParticipantRef, teamsById: Map<string, string>) {
  if (ref.type === "TEAM") return teamsById.get(ref.teamId) ?? ref.teamId;
  if (ref.type === "POOL_RANK") return `Seed ${ref.rank}`;
  if (ref.type === "WINNER_OF") return `Winner of ${ref.gameId}`;
  if (ref.type === "LOSER_OF") return `Loser of ${ref.gameId}`;
  return "";
}


export async function POST(req: Request) {
  const body = await req.json();

  // Minimal payload for now
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

  const plan = generatePlan({ config, teams });
  const teamsById = new Map(teams.map((t) => [t.id, t.name]));

  const created = await prisma.$transaction(async (tx) => {
    // 1) Create the tournament (Bracket)
    const bracket = await tx.bracket.create({
      data: {
        name,
        youthLevel,
        date,
        image: "",        // you can fill later / uploadthing
        bracketName: "",  // you can fill later
        format: plan.format,
        engineConfig: config as any,
        standingsRules: (plan.meta?.standingsRules ?? null) as any,
      },
    });

    // 2) Create teams (linked to bracket)
    // NOTE: your Team model requires bracketId and teamName
    await tx.team.createMany({
      data: teams.map((t) => ({
        teamName: t.name,
        bracketId: bracket.id,
      })),
    });

    // 3) Create games
    await tx.game.createMany({
      data: plan.games.map((g) => ({
        bracketId: bracket.id,
        engineGameId: g.id, 
        stageType: g.stageType,
        stageId: g.stageId,
        round: g.round ?? null,
        status: g.status,

        homeRef: g.home as any,
        awayRef: g.away as any,
        result: g.result ? (g.result as any) : null,

        // legacy display fields (so your current UI can render something immediately)
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
        label: g.stageType === "PLACEMENT" ? "Placement" : "Pool Play",
      })),
    });

    return bracket;
  });

  return NextResponse.json({ ok: true, bracketId: created.id, format: plan.format });
}
