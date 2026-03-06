// app/brackets/[id]/page.tsx
import { notFound } from "next/navigation";
import { getPublicBracketView } from "@/lib/queries/publicBracketView";
import PoolSchedule from "@/components/public/brackets/PoolSchedule";

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

type DayGroup = {
  dayKey: string;
  games: PublicGame[];
};

function isTBD(game: PublicGame) {
  return game.status === "UNSCHEDULED" || !game.date || !game.time;
}

function sortKey(game: PublicGame) {
  if (!game.date || !game.time) return Number.POSITIVE_INFINITY;
  const dt = new Date(`${game.date} ${game.time}`);
  const ms = dt.getTime();
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
}

function groupGamesByDay(games: PublicGame[]): DayGroup[] {
  const byDayMap = new Map<string, PublicGame[]>();

  for (const game of games) {
    const key = game.day || "TBD";
    const arr = byDayMap.get(key) ?? [];
    arr.push(game);
    byDayMap.set(key, arr);
  }

  return [...byDayMap.entries()].map(([dayKey, dayGames]) => {
    const tbd = dayGames.filter(isTBD).sort((a, b) => a.id.localeCompare(b.id));
    const scheduled = dayGames
      .filter((g) => !isTBD(g))
      .sort((a, b) => sortKey(a) - sortKey(b));

    return {
      dayKey,
      games: [...tbd, ...scheduled],
    };
  });
}

function formatDateMMDDYYYY(dateStr?: string | null) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return dateStr;

  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function formatBracketDateRange(dateRange: string) {
  if (!dateRange) return "";

  const parts = dateRange.split(" to ").map((s) => s.trim());

  if (parts.length === 2) {
    return `${formatDateMMDDYYYY(parts[0])} to ${formatDateMMDDYYYY(parts[1])}`;
  }

  return formatDateMMDDYYYY(dateRange);
}

export default async function PublicBracketPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const bracketId = Number(id);

  if (!Number.isFinite(bracketId)) return notFound();

  const view = await getPublicBracketView(bracketId);
  if (!view) return notFound();

  const poolGames = (view.games ?? []).filter((g) => g.stageType === "POOL_PLAY");
  const placementGames = (view.games ?? []).filter((g) => g.stageType === "PLACEMENT");

  const poolByDay = groupGamesByDay(poolGames);
  const placementByDay = groupGamesByDay(placementGames);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {view.bracket.name}
            </h1>
            <p className="text-sm text-slate-600">
              {view.bracket.youthLevel} • {formatBracketDateRange(view.bracket.date)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <PoolSchedule title="Pool Play" byDay={poolByDay} />
        <PoolSchedule title="Placement" byDay={placementByDay} />
      </div>
    </div>
  );
}