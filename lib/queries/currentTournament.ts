import { prisma } from "@/lib/prisma";
import { parseDateRange } from "@/lib/utils";

export type CurrentTournamentSummary = {
  id: number;
  name: string;
  youthLevel: string;
  date: string;
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
    },
    orderBy: [{ date: "asc" }, { name: "asc" }],
  });

  const active = brackets.find((bracket) => {
    const { start, end } = getBracketBounds(bracket.date);
    if (!start || !end) return false;
    return now >= start && now <= end;
  });

  return active ?? null;
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
    },
    orderBy: [{ date: "asc" }, { name: "asc" }],
  });

  const upcoming = brackets
    .map((bracket) => {
      const { start } = getBracketBounds(bracket.date);
      return { bracket, start };
    })
    .filter((entry): entry is { bracket: CurrentTournamentSummary; start: Date } =>
      Boolean(entry.start)
    )
    .filter((entry) => entry.start >= now)
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];

  return upcoming?.bracket ?? null;
}