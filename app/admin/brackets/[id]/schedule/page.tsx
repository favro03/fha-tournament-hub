// app/admin/brackets/[id]/schedule/page.tsx
import { prisma } from "@/lib/prisma";
import AdminGamesTable from "./games-table";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function weekdayFromISODate(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00Z`);
  const idx = d.getUTCDay();
  return WEEKDAYS[idx] ?? "";
}

function formatTimeFromLocalIso(isoLike: string) {
  const timePart = (isoLike.split("T")[1] ?? "").slice(0, 5); // HH:mm
  const [hhRaw, mmRaw] = timePart.split(":");
  const hh = Number(hhRaw);
  const mm = Number(mmRaw);

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return "";

  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  const mm2 = String(mm).padStart(2, "0");

  return `${h12}:${mm2} ${ampm}`;
}

export default async function AdminBracketSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bracketId = Number(id);

  const bracket = await prisma.bracket.findUnique({
    where: { id: bracketId },
    select: { id: true, name: true, youthLevel: true, date: true },
  });

  if (!bracket) return <div className="p-6">Bracket not found.</div>;

  /**
   * ✅ Deterministic ordering:
   * - Fetch UNSCHEDULED first (timesId null)
   * - Fetch SCHEDULED second (timesId not null, sorted by times.timeSlots)
   * - Concatenate: TBD section will always appear at top
   */

  const unscheduled = await prisma.game.findMany({
    where: { bracketId, timesId: null },
    orderBy: [{ stageType: "asc" }, { engineGameId: "asc" }],
    include: {
      times: { select: { timeSlots: true, location: true } },
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
      times: { select: { timeSlots: true, location: true } },
    },
  });

  const games = [...unscheduled, ...scheduled];

  const gamesForUi = games.map((g) => {
    const start = (g.times?.timeSlots ?? "").trim(); // "YYYY-MM-DDTHH:mm:ss" (no offset)
    const dateISO = start ? start.slice(0, 10) : "";
    const day = dateISO ? weekdayFromISODate(dateISO) : "";
    const time = start ? formatTimeFromLocalIso(start) : "";
    const location = (g.times?.location ?? g.location ?? "").trim();

    return {
      ...g,
      day,
      date: dateISO,
      time,
      location,
    };
  });

  // Banner list (pool only) — still useful
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{bracket.name}</h1>
          <div className="text-sm opacity-70">
            {bracket.youthLevel} • {bracket.date}
          </div>
        </div>

        <div className="flex gap-2">
          <a
            className="px-3 py-2 rounded border"
            href={`/admin/brackets/${bracketId}/schedule/manual`}
          >
            Manual Scheduler
          </a>
        </div>
      </div>

      {unscheduledPool.length > 0 && (
        <div className="rounded border border-yellow-300 bg-yellow-50 p-4">
          <div className="font-semibold">
            {unscheduledPool.length} Pool Play game(s) could not be scheduled (rest rules/time windows).
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