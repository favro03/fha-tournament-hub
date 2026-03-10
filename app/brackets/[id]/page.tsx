import { notFound } from "next/navigation";
import { Trophy, CalendarDays } from "lucide-react";
import {
  getPublicBracketView,
  type PublicBracketView,
} from "@/lib/queries/publicBracketView";
import { getBracketStandingsView } from "@/lib/queries/bracketStandings";
import PoolSchedule from "@/components/public/brackets/PoolSchedule";
import StandingsTable from "@/components/brackets/StandingsTable";

export const dynamic = "force-dynamic";

type PublicGame = PublicBracketView["games"][number];
type DayGroup = { dayKey: string; games: PublicGame[] };

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

  const [view, standings] = await Promise.all([
    getPublicBracketView(bracketId),
    getBracketStandingsView(bracketId),
  ]);

  if (!view) return notFound();

  const poolGames = (view.games ?? []).filter((g) => g.stageType === "POOL_PLAY");
  const placementGames = (view.games ?? []).filter(
    (g) => g.stageType === "PLACEMENT"
  );

  const poolByDay = groupGamesByDay(poolGames);
  const placementByDay = groupGamesByDay(placementGames);

  return (
    <div className="min-h-screen bg-[url('/images/rinkWlights.png')] bg-cover bg-center bg-fixed">
      <div className="min-h-screen bg-[linear-gradient(180deg,rgba(3,18,12,0.58)_0%,rgba(6,28,18,0.72)_38%,rgba(2,10,8,0.88)_100%)]">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
          <div className="rounded-[32px] border border-emerald-400/20 bg-slate-950/45 p-5 shadow-2xl backdrop-blur-sm lg:p-8">
            <div className="mb-6 rounded-[28px] border border-emerald-400/20 bg-slate-950/70 p-5 text-white shadow-xl backdrop-blur-md lg:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-400/20">
                    <Trophy className="h-7 w-7" />
                  </div>

                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                    FHA Tournament Hub
                  </div>

                  <h1 className="mt-2 text-3xl font-bold text-white lg:text-5xl">
                    {view.bracket.name}
                  </h1>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-200 lg:text-base">
                    <span className="inline-flex items-center gap-1.5">
                      <Trophy className="h-4 w-4 text-emerald-300" />
                      {view.bracket.youthLevel}
                    </span>
                    <span className="text-emerald-300/70">•</span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-emerald-300" />
                      {formatBracketDateRange(view.bracket.date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-emerald-400/15 bg-slate-950/65 p-4 shadow-xl backdrop-blur-md">
                <StandingsTable standings={standings} title="Pool Standings" />
              </div>

              <div className="rounded-[28px] border border-emerald-400/15 bg-slate-950/65 p-4 shadow-xl backdrop-blur-md">
                <PoolSchedule title="Pool Play" byDay={poolByDay} />
              </div>

              <div className="rounded-[28px] border border-emerald-400/15 bg-slate-950/65 p-4 shadow-xl backdrop-blur-md">
                <PoolSchedule title="Placement Games" byDay={placementByDay} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}