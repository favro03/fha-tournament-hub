"use client";

import { useMemo, useState, useTransition } from "react";

type GameRow = {
  id: number;
  engineGameId: string;
  stageType: string;
  stageId: string | null;
  status: string;
  day: string;
  date: string;
  time: string;
  location: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homePenalty: number;
  awayPenalty: number;
};

function groupKey(g: GameRow) {
  const d = g.date || "TBD";
  const day = g.day || "";
  return `${d} ${day}`.trim();
}

export default function AdminGamesTable({
  bracketId,
  initialGames,
}: {
  bracketId: number;
  initialGames: GameRow[];
}) {
  const [games, setGames] = useState<GameRow[]>(initialGames);
  const [isPending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const map = new Map<string, GameRow[]>();
    for (const g of games) {
      const k = groupKey(g);
      map.set(k, [...(map.get(k) ?? []), g]);
    }
    return Array.from(map.entries());
  }, [games]);

  async function updateGame(gameId: number, patch: Partial<GameRow>) {
    const res = await fetch(`/api/game-by-id/${gameId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bracketId, patch }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error ?? "Update failed");
    return json.game as GameRow;
  }

  function onChange(gameId: number, patch: Partial<GameRow>) {
    // optimistic update
    setGames((prev) =>
      prev.map((g) => (g.id === gameId ? ({ ...g, ...patch } as GameRow) : g))
    );

    startTransition(async () => {
      try {
        const saved = await updateGame(gameId, patch);
        setGames((prev) => prev.map((g) => (g.id === gameId ? saved : g)));
      } catch (e: any) {
        alert(e?.message ?? "Update failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      {isPending && <div className="text-sm opacity-70">Saving changes…</div>}

      {grouped.map(([dayKey, dayGames]) => {
        const byStage = new Map<string, GameRow[]>();
        for (const g of dayGames) {
          byStage.set(g.stageType, [...(byStage.get(g.stageType) ?? []), g]);
        }

        return (
          <div key={dayKey} className="space-y-3">
            <h2 className="text-lg font-semibold">{dayKey}</h2>

            {Array.from(byStage.entries()).map(([stageType, stageGames]) => (
              <div key={stageType} className="rounded border">
                <div className="px-3 py-2 border-b font-medium">
                  {stageType}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[900px] w-full text-sm">
                    <thead className="text-left border-b">
                      <tr>
                        <th className="p-2">Time</th>
                        <th className="p-2">Location</th>
                        <th className="p-2">Home</th>
                        <th className="p-2">Away</th>
                        <th className="p-2">Score</th>
                        <th className="p-2">PIM</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {stageGames.map((g) => (
                        <tr key={g.id} className="border-b">
                          <td className="p-2">
                            <input
                              className="border rounded px-2 py-1 w-[120px]"
                              value={g.time ?? ""}
                              onChange={(e) =>
                                onChange(g.id, { time: e.target.value })
                              }
                            />
                          </td>

                          <td className="p-2">
                            <input
                              className="border rounded px-2 py-1 w-[140px]"
                              value={g.location ?? ""}
                              onChange={(e) =>
                                onChange(g.id, { location: e.target.value })
                              }
                            />
                          </td>

                          <td className="p-2">{g.homeTeam}</td>
                          <td className="p-2">{g.awayTeam}</td>

                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <input
                                className="border rounded px-2 py-1 w-[60px]"
                                type="number"
                                value={g.homeScore ?? 0}
                                onChange={(e) =>
                                  onChange(g.id, {
                                    homeScore: Number(e.target.value),
                                  })
                                }
                              />
                              <span>-</span>
                              <input
                                className="border rounded px-2 py-1 w-[60px]"
                                type="number"
                                value={g.awayScore ?? 0}
                                onChange={(e) =>
                                  onChange(g.id, {
                                    awayScore: Number(e.target.value),
                                  })
                                }
                              />
                            </div>
                          </td>

                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <input
                                className="border rounded px-2 py-1 w-[60px]"
                                type="number"
                                value={g.homePenalty ?? 0}
                                onChange={(e) =>
                                  onChange(g.id, {
                                    homePenalty: Number(e.target.value),
                                  })
                                }
                              />
                              <span>-</span>
                              <input
                                className="border rounded px-2 py-1 w-[60px]"
                                type="number"
                                value={g.awayPenalty ?? 0}
                                onChange={(e) =>
                                  onChange(g.id, {
                                    awayPenalty: Number(e.target.value),
                                  })
                                }
                              />
                            </div>
                          </td>

                          <td className="p-2">
                            <select
                              className="border rounded px-2 py-1"
                              value={g.status}
                              onChange={(e) =>
                                onChange(g.id, { status: e.target.value })
                              }
                            >
                              <option value="UNSCHEDULED">UNSCHEDULED</option>
                              <option value="SCHEDULED">SCHEDULED</option>
                              <option value="FINAL">FINAL</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}