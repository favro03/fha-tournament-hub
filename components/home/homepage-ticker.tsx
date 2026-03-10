import Link from "next/link";
import { CalendarDays, Clock3, Trophy } from "lucide-react";
import { getHomeTickerView } from "@/lib/queries/homeTicker";

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

  const parts = dateRange.split(" to ").map((part) => part.trim());
  if (parts.length === 2) {
    return `${formatDateMMDDYYYY(parts[0])}–${formatDateMMDDYYYY(parts[1])}`;
  }

  return formatDateMMDDYYYY(dateRange);
}

export default async function HomepageTicker() {
  const ticker = await getHomeTickerView();

  if (ticker.mode === "empty") {
    return (
      <div className="rounded-[28px] border border-white/15 bg-slate-950/75 p-5 text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-emerald-300" />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
              Tournament Status
            </div>
            <p className="text-sm text-slate-100">{ticker.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (ticker.mode === "upcoming") {
    return (
      <div className="rounded-[28px] border border-white/15 bg-slate-950/75 p-5 text-white shadow-2xl backdrop-blur-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
              Next Tournament
            </div>
            <h2 className="mt-1 text-2xl font-bold">{ticker.nextTournament.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-200">
              <span className="inline-flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-emerald-300" />
                {ticker.nextTournament.youthLevel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-emerald-300" />
                {formatBracketDateRange(ticker.nextTournament.date)}
              </span>
            </div>
          </div>

          <Link
            href={`/brackets/${ticker.nextTournament.id}`}
            className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            View Tournament
          </Link>
        </div>
      </div>
    );
  }

  const primaryHref = `/brackets/${
    ticker.nowPlaying?.bracketId ??
    ticker.upNext?.bracketId ??
    ticker.activeTournament.id
  }`;

  return (
    <div className="rounded-[28px] border border-white/15 bg-slate-950/75 p-5 text-white shadow-2xl backdrop-blur-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
            Active Tournament
          </div>
          <h2 className="mt-1 text-2xl font-bold">{ticker.activeTournament.name}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-200">
            <span className="inline-flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-emerald-300" />
              {ticker.activeTournament.youthLevel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-emerald-300" />
              {formatBracketDateRange(ticker.activeTournament.date)}
            </span>
          </div>
        </div>

        <Link
          href={primaryHref}
          className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
        >
          Open Live Bracket
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/12 bg-white/5 px-4 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
            Now Playing
          </div>
          <div className="mt-2 flex items-center gap-2 text-lg font-medium text-white">
            <Clock3 className="h-4 w-4 text-emerald-300" />
            {ticker.nowPlaying
              ? `${ticker.nowPlaying.homeTeam} vs ${ticker.nowPlaying.awayTeam} • ${ticker.nowPlaying.location || "TBD"} • ${ticker.nowPlaying.time}`
              : `No game currently in progress • ${ticker.activeTournament.name}`}
          </div>
        </div>

        <div className="rounded-2xl border border-white/12 bg-white/5 px-4 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
            Up Next
          </div>
          <div className="mt-2 flex items-center gap-2 text-lg font-medium text-white">
            <Clock3 className="h-4 w-4 text-emerald-300" />
            {ticker.upNext
              ? `${ticker.upNext.homeTeam} vs ${ticker.upNext.awayTeam} • ${ticker.upNext.location || "TBD"} • ${ticker.upNext.time}`
              : `No additional scheduled games right now • ${formatBracketDateRange(
                  ticker.activeTournament.date
                )}`}
          </div>
        </div>
      </div>
    </div>
  );
}