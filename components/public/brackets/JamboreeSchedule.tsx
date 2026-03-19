"use client";

import { useMemo, useState } from "react";

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
};

type ViewMode = "datetime" | "level";

type LevelKey = "MINI_MITE" | "MITE1" | "MITE2" | "MITE3" | "OTHER";

const LEVEL_ORDER: LevelKey[] = ["MINI_MITE", "MITE1", "MITE2", "MITE3", "OTHER"];

function normalizeToken(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");
}

function levelFromStageId(stageId?: string | null): LevelKey {
  const value = String(stageId ?? "").trim();
  if (!value) return "OTHER";

  const parts = value.split(":");
  const token = normalizeToken(parts[parts.length - 1] ?? "");

  if (token === "MINI_MITE") return "MINI_MITE";
  if (token === "MITE1") return "MITE1";
  if (token === "MITE2") return "MITE2";
  if (token === "MITE3") return "MITE3";

  return "OTHER";
}

function humanizeJamboreeLevel(stageId?: string | null) {
  const token = levelFromStageId(stageId);

  if (token === "MINI_MITE") return "Mini Mite";
  if (token === "MITE1") return "Mite 1";
  if (token === "MITE2") return "Mite 2";
  if (token === "MITE3") return "Mite 3";

  return "Jamboree";
}
function formatDayWithDate(dateStr?: string | null) {
  if (!dateStr) return "TBD";

  const d = new Date(`${dateStr}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return dateStr;

  return d.toLocaleDateString("en-US", {
    weekday: "short", // Fri
    month: "numeric", // 3
    day: "numeric",   // 20
  });
}
function levelBadgeClasses(stageId?: string | null) {
  const token = levelFromStageId(stageId);

  if (token === "MINI_MITE") {
    return "border-amber-300/30 bg-amber-300/15 text-amber-100";
  }

  if (token === "MITE1") {
    return "border-sky-300/30 bg-sky-300/15 text-sky-100";
  }

  if (token === "MITE2") {
    return "border-orange-300/30 bg-orange-300/15 text-orange-100";
  }

  if (token === "MITE3") {
    return "border-lime-300/30 bg-lime-300/15 text-lime-100";
  }

  return "border-emerald-300/30 bg-emerald-300/15 text-emerald-100";
}

function formatDateMMDDYYYY(dateStr?: string | null) {
  if (!dateStr) return "TBD Date";
  const d = new Date(`${dateStr}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return dateStr;

  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function sortKey(game: PublicGame) {
  if (!game.date || !game.time) return Number.POSITIVE_INFINITY;
  const dt = new Date(`${game.date} ${game.time}`);
  const ms = dt.getTime();
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
}

function displayDayKey(game: PublicGame) {
  if (game.date) {
    return formatDayWithDate(game.date);
  }

  return game.day || "TBD";
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-emerald-400/20 bg-slate-950/70 p-1">
      <button
        type="button"
        onClick={() => onChange("datetime")}
        className={
          value === "datetime"
            ? "rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100"
            : "rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-white"
        }
      >
        Date/Time
      </button>

      <button
        type="button"
        onClick={() => onChange("level")}
        className={
          value === "level"
            ? "rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100"
            : "rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-white"
        }
      >
        By Level
      </button>
    </div>
  );
}

function DateTimeView({ games }: { games: PublicGame[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, PublicGame[]>();

    for (const game of games) {
      const key = displayDayKey(game);
      const arr = map.get(key) ?? [];
      arr.push(game);
      map.set(key, arr);
    }

    return [...map.entries()].map(([dayKey, dayGames]) => ({
      dayKey,
      games: [...dayGames].sort((a, b) => {
        const timeDelta = sortKey(a) - sortKey(b);
        if (timeDelta !== 0) return timeDelta;

        const levelDelta =
          LEVEL_ORDER.indexOf(levelFromStageId(a.stageId)) -
          LEVEL_ORDER.indexOf(levelFromStageId(b.stageId));
        if (levelDelta !== 0) return levelDelta;

        return a.id.localeCompare(b.id);
      }),
    }));
  }, [games]);

  if (groups.length === 0) {
    return <p className="mt-4 text-sm text-slate-300">No jamboree games are available yet.</p>;
  }

  return (
    <div className="mt-6 space-y-6">
      {groups.map((group) => (
        <section key={group.dayKey}>
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            {group.dayKey}
          </div>

          <div className="space-y-3">
            {group.games.map((game) => (
              <div
                key={game.id}
                className="rounded-2xl border border-emerald-400/12 bg-white/5 p-4 transition-colors hover:border-emerald-400/25 hover:bg-white/7"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm text-slate-100 sm:text-base">
                    <span className="font-semibold text-white">{game.time || "TBD Time"}</span>
                    <span className="text-slate-500">–</span>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${levelBadgeClasses(
                        game.stageId
                      )}`}
                    >
                      {humanizeJamboreeLevel(game.stageId)}
                    </span>
                    <span className="text-slate-500">–</span>
                    <span className="font-medium text-emerald-200">
                      {game.location || "TBD Location"}
                    </span>
                    <span className="text-slate-500">–</span>
                    <span className="min-w-0 break-words">
                      <span className="font-semibold text-slate-200">Home:</span>{" "}
                      {game.homeName || "TBD"}{" "}
                      <span className="font-semibold text-white">vs</span>{" "}
                      <span className="font-semibold text-slate-200">Away:</span>{" "}
                      {game.awayName || "TBD"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ByLevelView({ games }: { games: PublicGame[] }) {
  const groups = useMemo(() => {
    const map = new Map<LevelKey, PublicGame[]>();

    for (const key of LEVEL_ORDER) {
      map.set(key, []);
    }

    for (const game of games) {
      const key = levelFromStageId(game.stageId);
      const arr = map.get(key) ?? [];
      arr.push(game);
      map.set(key, arr);
    }

    return LEVEL_ORDER.map((key) => ({
      key,
      label:
        key === "MINI_MITE"
          ? "Mini Mite"
          : key === "MITE1"
          ? "Mite 1"
          : key === "MITE2"
          ? "Mite 2"
          : key === "MITE3"
          ? "Mite 3"
          : "Other",
      games: [...(map.get(key) ?? [])].sort((a, b) => {
        const timeDelta = sortKey(a) - sortKey(b);
        if (timeDelta !== 0) return timeDelta;
        return a.id.localeCompare(b.id);
      }),
    })).filter((group) => group.games.length > 0);
  }, [games]);

  if (groups.length === 0) {
    return <p className="mt-4 text-sm text-slate-300">No jamboree games are available yet.</p>;
  }

  return (
    <div className="mt-6 space-y-6">
      {groups.map((group) => (
        <section key={group.key}>
          <div className="mb-3 flex items-center gap-3">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${levelBadgeClasses(
                group.key
              )}`}
            >
              {group.label}
            </span>
          </div>

          <div className="space-y-3">
            {group.games.map((game) => (
              <div
                key={game.id}
                className="rounded-2xl border border-emerald-400/12 bg-white/5 p-4 transition-colors hover:border-emerald-400/25 hover:bg-white/7"
              >
                <div className="min-w-0 break-words text-sm text-slate-100 sm:text-base">
                  <span className="font-semibold text-white">
                    {formatDateMMDDYYYY(game.date)}
                  </span>
                  <span className="mx-2 text-slate-500">–</span>
                  <span className="font-medium text-white">{game.time || "TBD Time"}</span>
                  <span className="mx-2 text-slate-500">–</span>
                  <span className="font-medium text-emerald-200">
                    {game.location || "TBD Location"}
                  </span>
                  <span className="mx-2 text-slate-500">–</span>
                  <span>
                    <span className="font-semibold text-slate-200">Home:</span>{" "}
                    {game.homeName || "TBD"}{" "}
                    <span className="font-semibold text-white">vs</span>{" "}
                    <span className="font-semibold text-slate-200">Away:</span>{" "}
                    {game.awayName || "TBD"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function JamboreeSchedule({ games }: { games: PublicGame[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>("datetime");

  return (
    <div className="rounded-[28px] border border-emerald-400/15 bg-slate-950/75 p-5 text-white shadow-xl backdrop-blur-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">
            Jamboree Schedule
          </h2>
          
        </div>

        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === "datetime" ? (
        <DateTimeView games={games} />
      ) : (
        <ByLevelView games={games} />
      )}
    </div>
  );
}