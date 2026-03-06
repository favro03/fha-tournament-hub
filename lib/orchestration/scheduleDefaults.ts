import type { DayWindow } from "@/lib/tournament-engine/scheduling/slotGenerator";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(dateISO: string, days: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
  dt.setDate(dt.getDate() + days);
  return toISODate(dt);
}

export function parseTournamentWeekendDates(dateRaw: string): {
  friISO: string;
  satISO: string;
  sunISO: string;
} {
  const s = String(dateRaw ?? "");
  const m = s.match(/\d{4}-\d{2}-\d{2}/g);

  const friISO = m?.[0] ?? toISODate(new Date());
  return {
    friISO,
    satISO: addDays(friISO, 1),
    sunISO: addDays(friISO, 2),
  };
}

export function buildDefaultWeekendWindows(args: {
  friISO: string;
  satISO: string;
  sunISO: string;
}): DayWindow[] {
  const { friISO, satISO, sunISO } = args;

  return [
    {
      dateISO: friISO,
      startTime: "17:15",
      lastStartTime: "20:00",
      label: "Fri Pool Play",
      allowedStageTypes: ["POOL_PLAY"],
    },
    {
      dateISO: satISO,
      startTime: "08:00",
      lastStartTime: "20:00",
      label: "Sat Pool Play",
      allowedStageTypes: ["POOL_PLAY"],
    },
    {
      dateISO: sunISO,
      startTime: "08:00",
      lastStartTime: "10:30",
      label: "Sun AM Pool Play",
      allowedStageTypes: ["POOL_PLAY"],
    },
    {
      dateISO: sunISO,
      startTime: "11:45",
      lastStartTime: "16:00",
      label: "Sun PM Placement",
      allowedStageTypes: ["PLACEMENT"],
    },
  ];
}

function normalizeLevelToken(raw: string) {
  return (raw ?? "")
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .trim();
}

const SQUIRT_PLUS_TOKENS = new Set([
  "SQUIRT",
  "SQUIRTS",
  "U10",
  "PEEWEE",
  "PEE_WEE",
  "U12",
  "BANTAM",
  "U14",
  "U15",
  "U16",
  "U18",
  "JV",
  "VARSITY",
]);

export function determineRinkLocations(normalizedYouthLevel: string): string[] {
  const t = normalizeLevelToken(normalizedYouthLevel);
  const rinkCount = SQUIRT_PLUS_TOKENS.has(t) ? 1 : 2;

  if (rinkCount === 1) return ["FIA"];
  return ["FIA", "FIA 2"];
}