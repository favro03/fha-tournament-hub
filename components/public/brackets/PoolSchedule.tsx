// components/public/brackets/PoolSchedule.tsx
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

  return `${game.homeName} ${homeScore}-${awayScore} (Final)`;
}

export default function PoolSchedule({
  title,
  byDay,
}: {
  title: string;
  byDay: DayGroup[];
}) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">
        {title}
      </h2>

      {byDay.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No games scheduled.</p>
      ) : (
        <div className="mt-4 space-y-6">
          {byDay.map((group) => (
            <div key={group.dayKey}>
              <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
                {group.dayKey}
              </div>

              <div className="space-y-2">
                {group.games.map((game) => (
                  <div
                    key={game.id}
                    className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">
                        {game.homeName || "TBD"} vs {game.awayName || "TBD"}
                      </div>

                      <div className="text-xs text-slate-600">
                        {game.label ? `${game.label} • ` : ""}
                        {game.location || "TBD Location"}
                      </div>
                    </div>

                    <div className="shrink-0 text-sm text-slate-800">
                      {hasFinalScore(game) ? (
                        <span className="font-semibold">
                          {getFinalDisplay(game)}
                        </span>
                      ) : (
                        <span>
                          {game.time || "TBD"}
                          {game.date ? (
                            <span className="text-slate-500">
                              {" "}
                              • {formatDateMMDDYYYY(game.date)}
                            </span>
                          ) : null}
                        </span>
                      )}
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