import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";
import AdminGamesTable from "./games-table";
import ResolvePlacementButton from "./resolve-placement-button";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function weekdayFromISODate(dateISO: string) {
  if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return "";

  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return WEEKDAYS[dt.getDay()] ?? "";
}

function formatTimeFromLocalIso(isoLike: string) {
  const timePart = (isoLike.split("T")[1] ?? "").slice(0, 5);
  const [hhRaw, mmRaw] = timePart.split(":");
  const hh = Number(hhRaw);
  const mm = Number(mmRaw);

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return "";

  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  const mm2 = String(mm).padStart(2, "0");

  return `${h12}:${mm2} ${ampm}`;
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const v = String(value ?? "").trim();
    if (v) return v;
  }
  return "";
}

export default async function AdminBracketSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();

  const { id } = await params;
  const bracketId = Number(id);

  const bracket = await prisma.bracket.findUnique({
    where: { id: bracketId },
    select: { id: true, name: true, youthLevel: true, date: true },
  });

  if (!bracket) return <div className="p-6">Bracket not found.</div>;

  const unscheduled = await prisma.game.findMany({
    where: { bracketId, timesId: null },
    orderBy: [{ stageType: "asc" }, { engineGameId: "asc" }],
    include: {
      times: { select: { timeSlots: true, location: true, date: true, day: true } },
    },
  });

  const scheduled = await prisma.game.findMany({
    where: { bracketId, timesId: { not: null } },
    orderBy: [
      { times: { timeSlots: "asc" } },
      { stageType: "asc" },
      { engineGameId: "asc" },
    ],
    include: {
      times: { select: { timeSlots: true, location: true, date: true, day: true } },
    },
  });

  const games = [...unscheduled, ...scheduled];

  const gamesForUi = games.map((g) => {
    const slotStart = String(g.times?.timeSlots ?? "").trim();
    const slotDateISO = slotStart ? slotStart.slice(0, 10) : "";

    const resolvedDateISO = firstNonEmpty(g.date, g.times?.date, slotDateISO);
    const resolvedDay = resolvedDateISO ? weekdayFromISODate(resolvedDateISO) : "";

    const resolvedTime = firstNonEmpty(
      g.time,
      slotStart ? formatTimeFromLocalIso(slotStart) : ""
    );

    const resolvedLocation = firstNonEmpty(g.location, g.times?.location, "FIA");

    return {
      ...g,
      day: resolvedDay,
      date: resolvedDateISO,
      time: resolvedTime,
      location: resolvedLocation,
    };
  });

  const unscheduledPool = await prisma.game.findMany({
    where: {
      bracketId,
      stageType: "POOL_PLAY",
      timesId: null,
    },
    select: {
      id: true,
      engineGameId: true,
      homeTeam: true,
      awayTeam: true,
      stageId: true,
    },
    orderBy: [{ engineGameId: "asc" }],
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{bracket.name}</h1>
          <div className="text-sm opacity-70">
            {bracket.youthLevel} • {bracket.date}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <a
            className="px-3 py-2 rounded border"
            href={`/admin/brackets/${bracketId}/schedule/manual`}
          >
            Manual Scheduler
          </a>

          <ResolvePlacementButton bracketId={bracketId} />
        </div>
      </div>

      {unscheduledPool.length > 0 && (
        <div className="rounded border border-yellow-300 bg-yellow-50 p-4">
          <div className="font-semibold">
            {unscheduledPool.length} Pool Play game(s) could not be scheduled
            (rest rules/time windows).
          </div>
          <div className="text-sm opacity-80 mt-1">
            Use Manual Scheduler to place them, or adjust available slots.
          </div>

          <ul className="mt-3 text-sm list-disc pl-5">
            {unscheduledPool.map((g) => (
              <li key={g.id}>
                <span className="font-mono">{g.engineGameId}</span> — {g.homeTeam} vs{" "}
                {g.awayTeam}
                {g.stageId ? <span className="opacity-70"> ({g.stageId})</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      <AdminGamesTable bracketId={bracketId} initialGames={gamesForUi as any} />
    </div>
  );
}