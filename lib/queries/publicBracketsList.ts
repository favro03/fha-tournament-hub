// lib/queries/publicBracketsList.ts
import { prisma } from "@/lib/prisma";
import { getEndDateFromRange } from "@/lib/utils";

type Side = "HOME" | "AWAY";

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// Your bracket.date uses ISO date strings like "2026-02-06"
function parseISODateOnly(s: string): Date | null {
  if (!s) return null;
  const dt = new Date(`${s}T00:00:00`);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

export type PublicBracketListItem = {
  id: number;
  name: string;
  youthLevel: string;
  date: string; // stored date range string: "YYYY-MM-DD to YYYY-MM-DD"
  side: Side;

  // Optional (helpful if you want to show an "Image" badge)
  image?: string | null;
  tournamentFormat?: string | null;
};

export async function getPublicBracketsList(args: {
  side: Side;
  level?: string | null;
}) {
  const { side, level } = args;

  const rows = await prisma.bracket.findMany({
    where: {
      side,
      ...(level ? { youthLevel: level } : {}),
    },
    select: {
      id: true,
      name: true,
      youthLevel: true,
      date: true,
      side: true,
      image: true,
      tournamentFormat: true,
    },
    orderBy: [{ date: "asc" }, { name: "asc" }],
  });

  // IMPORTANT:
  // In dev, do NOT hide old brackets so you can build UI with existing data.
  // In prod, enforce the rule: hide 2 days after end date.
  const isProd = process.env.NODE_ENV === "production";
  const now = new Date();

  const visible = !isProd
    ? rows
    : rows.filter((b) => {
        const endStr = getEndDateFromRange(b.date); // "YYYY-MM-DD"
        const end = parseISODateOnly(endStr);
        if (!end) return true; // if malformed, don't hide
        const hideAfter = addDays(end, 2);
        return now <= hideAfter;
      });

  const levels = Array.from(new Set(visible.map((b) => b.youthLevel))).sort();

  const items: PublicBracketListItem[] = visible.map((b) => ({
    id: b.id,
    name: b.name,
    youthLevel: b.youthLevel,
    date: b.date,
    side: b.side as Side,
    image: b.image ?? null,
    tournamentFormat: b.tournamentFormat ?? null,
  }));

  return { items, levels };
}