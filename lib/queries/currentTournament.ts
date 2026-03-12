import { prisma } from "@/lib/prisma";
import { parseDateRange } from "@/lib/utils";

export type CurrentTournamentSummary = {
  id: number;
  name: string;
  youthLevel: string;
  date: string;
};

type TournamentRow = CurrentTournamentSummary & {
  image: string | null;
  tournamentFormat: string | null;
};

function dateOnly(dateStr: string, endOfDay = false) {
  const time = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
  const d = new Date(`${dateStr}${time}`);
  return Number.isFinite(d.getTime()) ? d : null;
}

function getBracketBounds(dateRange: string) {
  const { startDate, endDate } = parseDateRange(dateRange);
  const start = startDate ? dateOnly(startDate, false) : null;
  const end = endDate
    ? dateOnly(endDate, true)
    : startDate
      ? dateOnly(startDate, true)
      : null;

  return { start, end };
}

function isImageBasedBracket(bracket: {
  image?: string | null;
  tournamentFormat?: string | null;
}) {
  const image = String(bracket.image ?? "").trim();
  const tournamentFormat = String(bracket.tournamentFormat ?? "").trim();

  return tournamentFormat === "IMAGE_UPLOAD" || image.length > 0;
}

function toSummary(bracket: TournamentRow): CurrentTournamentSummary {
  return {
    id: bracket.id,
    name: bracket.name,
    youthLevel: bracket.youthLevel,
    date: bracket.date,
  };
}

export async function getCurrentTournament(): Promise<CurrentTournamentSummary | null> {
  const now = new Date();

  const brackets = await prisma.bracket.findMany({
    where: {
      side: "HOME",
    },
    select: {
      id: true,
      name: true,
      youthLevel: true,
      date: true,
      image: true,
      tournamentFormat: true,
    },
    orderBy: [{ date: "asc" }, { name: "asc" }],
  });

  const active = brackets.find((bracket: TournamentRow) => {
    if (isImageBasedBracket(bracket)) return false;
    const { start, end } = getBracketBounds(bracket.date);
    if (!start || !end) return false;
    return now >= start && now <= end;
  });

  return active ? toSummary(active) : null;
}

export async function getNextTournament(): Promise<CurrentTournamentSummary | null> {
  const now = new Date();

  const brackets = await prisma.bracket.findMany({
    where: {
      side: "HOME",
    },
    select: {
      id: true,
      name: true,
      youthLevel: true,
      date: true,
      image: true,
      tournamentFormat: true,
    },
    orderBy: [{ date: "asc" }, { name: "asc" }],
  });

  const upcoming = brackets
    .filter((bracket: TournamentRow) => !isImageBasedBracket(bracket))
    .map((bracket: TournamentRow) => {
      const { start } = getBracketBounds(bracket.date);
      return { bracket, start };
    })
    .filter((entry): entry is { bracket: TournamentRow; start: Date } => Boolean(entry.start))
    .filter((entry: { bracket: TournamentRow; start: Date }) => entry.start >= now)
    .sort(
      (a: { bracket: TournamentRow; start: Date }, b: { bracket: TournamentRow; start: Date }) =>
        a.start.getTime() - b.start.getTime()
    )[0];

  return upcoming ? toSummary(upcoming.bracket) : null;
}