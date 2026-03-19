import Image from "next/image";
import { notFound } from "next/navigation";
import { Trophy, CalendarDays } from "lucide-react";
import {
  getPublicBracketView,
  type PublicBracketView,
} from "@/lib/queries/publicBracketView";
import { getBracketStandingsView } from "@/lib/queries/bracketStandings";
import PoolSchedule from "@/components/public/brackets/PoolSchedule";
import JamboreeSchedule from "@/components/public/brackets/JamboreeSchedule";
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

function isJamboreeBracket(view: PublicBracketView) {
  if (view.bracket.tournamentFormat === "JAMBOREE") return true;
  return view.games.some((game) => game.stageType === "JAMBOREE");
}

export default async function PublicBracketPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const bracketId = Number(id);

  if (!Number.isFinite(bracketId)) return notFound();

  const view = await getPublicBracketView(bracketId);

  if (!view) return notFound();

  const isImageBased = view.bracket.isImageBased;
  const isJamboree = !isImageBased && isJamboreeBracket(view);

  const standings =
    isImageBased || isJamboree ? null : await getBracketStandingsView(bracketId);

  const poolGames =
    isImageBased || isJamboree
      ? []
      : (view.games ?? []).filter((g) => g.stageType === "POOL_PLAY");

  const placementGames =
    isImageBased || isJamboree
      ? []
      : (view.games ?? []).filter((g) => g.stageType === "PLACEMENT");

  const jamboreeGames = isJamboree
    ? (view.games ?? []).filter((g) => g.stageType === "JAMBOREE")
    : [];

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

                    {isJamboree ? (
                      <>
                        <span className="text-emerald-300/70">•</span>
                        <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                          Mite Jamboree
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {isImageBased ? (
              <div className="rounded-[28px] border border-emerald-400/15 bg-slate-950/65 p-4 shadow-xl backdrop-blur-md lg:p-6">
                {view.bracket.image ? (
                  <div className="overflow-hidden rounded-[24px] border border-emerald-400/15 bg-white/5">
                    <div className="relative aspect-[4/5] w-full bg-slate-950/40 sm:aspect-[16/14] lg:aspect-[16/12]">
                      <Image
                        src={view.bracket.image}
                        alt={`${view.bracket.name} bracket image`}
                        fill
                        className="object-contain"
                        sizes="(max-width: 1024px) 100vw, 1200px"
                        priority
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-emerald-400/20 bg-white/5 p-8 text-sm text-slate-300">
                    No bracket image is available yet.
                  </div>
                )}
              </div>
            ) : isJamboree ? (
              <JamboreeSchedule games={jamboreeGames} />
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}