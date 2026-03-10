type PublicGame = {
  id: string;
  stageType: string;
  stageId: string;
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

function hasFinalScore(game: PublicGame) {
  return (
    game.status === "FINAL" &&
    game.homeScore !== null &&
    game.awayScore !== null
  );
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

function getFinalDisplay(game: PublicGame) {
  if (!hasFinalScore(game)) return "";

  const homeScore = game.homeScore ?? 0;
  const awayScore = game.awayScore ?? 0;

  if (homeScore > awayScore) {
    return `${game.homeName} ${homeScore}-${awayScore} (Final)`;
  }

  if (awayScore > homeScore) {
    return `${game.awayName} ${awayScore}-${homeScore} (Final)`;
  }

  return `Tie ${homeScore}-${awayScore} (Final)`;
}

export default function PoolSchedule({
  title,
  byDay,
}: {
  title: string;
  byDay: DayGroup[];
}) {
  return (
    <div className="rounded-[28px] border border-emerald-400/15 bg-slate-950/75 p-5 text-white shadow-xl backdrop-blur-md">
      <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>

      {byDay.length === 0 ? (
        <p className="mt-3 text-sm text-slate-300">No games scheduled.</p>
      ) : (
        <div className="mt-5 space-y-6">
          {byDay.map((group) => (
            <div key={group.dayKey}>
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
                      <div className="min-w-0">
                        {game.label ? (
                          <div className="mb-2">
                            <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                              {game.label}
                            </span>
                          </div>
                        ) : null}

                        <div className="text-base font-semibold text-white sm:text-lg">
                          {game.homeName || "TBD"} vs {game.awayName || "TBD"}
                        </div>

                        <div className="mt-1 text-sm text-slate-300">
                          {game.location || "TBD Location"}
                        </div>
                      </div>

                      <div className="text-sm text-slate-200 lg:text-right">
                        <div className="font-medium text-white">
                          {game.date ? formatDateMMDDYYYY(game.date) : "TBD Date"}
                          {game.time ? ` • ${game.time}` : ""}
                        </div>

                        {hasFinalScore(game) ? (
                          <div className="mt-1 font-semibold text-emerald-300">
                            {getFinalDisplay(game)}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                            {game.status || "Scheduled"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}