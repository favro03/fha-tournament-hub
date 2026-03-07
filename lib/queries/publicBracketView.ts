import { prisma } from "@/lib/prisma";
import { getPlacementLabel } from "@/lib/bracket-labels";

type PublicGame = {
  id: string;
  stageType: string;
  stageId: string;
  round: number | null;
  status: string;
  day: string;
  date: string;
  time: string;
  location: string;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  label?: string | null;
};

export type PublicBracketView = {
  bracket: {
    id: number;
    name: string;
    youthLevel: string;
    date: string;
    tournamentFormat: string;
  };
  games: PublicGame[];
};

function safeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function getPublicBracketView(bracketId: number): Promise<PublicBracketView | null> {
  const bracket = (await prisma.bracket.findUnique({
    where: { id: bracketId },
    select: {
      id: true,
      name: true,
      youthLevel: true,
      date: true,
      tournamentFormat: true,
      games: {
        orderBy: [
          { stageType: "asc" },
          { day: "asc" },
          { date: "asc" },
          { time: "asc" },
          { engineGameId: "asc" },
        ],
        select: {
          engineGameId: true,
          stageType: true,
          stageId: true,
          round: true,
          status: true,
          day: true,
          date: true,
          time: true,
          location: true,
          homeTeam: true,
          awayTeam: true,
          homeScore: true,
          awayScore: true,
          label: true,
        },
      },
    },
  })) as any;

  if (!bracket) return null;

  return {
    bracket: {
      id: bracket.id,
      name: bracket.name,
      youthLevel: bracket.youthLevel,
      date: bracket.date,
      tournamentFormat: bracket.tournamentFormat,
    },
    games: (bracket.games as any[]).map((game: any) => {
      const homeName = safeString(game.homeTeam) || "TBD";
      const awayName = safeString(game.awayTeam) || "TBD";

      return {
        id: game.engineGameId,
        stageType: safeString(game.stageType),
        stageId: safeString(game.stageId),
        round: game.round ?? null,
        status: safeString(game.status),
        day: safeString(game.day),
        date: safeString(game.date),
        time: safeString(game.time),
        location: safeString(game.location),
        homeName,
        awayName,
        homeScore: safeNumber(game.homeScore),
        awayScore: safeNumber(game.awayScore),
        label: getPlacementLabel({
          stageType: game.stageType,
          engineGameId: game.engineGameId,
          label: game.label ?? null,
          homeTeam: homeName,
          awayTeam: awayName,
        }) || null,
      };
    }),
  };
}
