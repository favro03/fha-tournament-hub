"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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

type SaveState = "saved" | "unsaved" | "saving" | "error";

type Section = {
  key: string;
  dayKey: string;
  stageType: string;
  rowIds: number[];
};

type GamePatch = Partial<
  Pick<
    GameRow,
    | "date"
    | "time"
    | "location"
    | "homeScore"
    | "awayScore"
    | "homePenalty"
    | "awayPenalty"
    | "status"
  >
>;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function buildDayLabel(dateISO: string) {
  if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return "TBD";

  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  const weekday = WEEKDAYS[dt.getDay()] ?? "";

  return `${dateISO} ${weekday}`.trim();
}

function normalizeNumber(value: string) {
  if (value.trim() === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildSections(initialGames: GameRow[]): Section[] {
  const sections: Section[] = [];
  const sectionMap = new Map<string, Section>();

  for (const game of initialGames) {
    const dateKey = game.date || "TBD";
    const dayKey = buildDayLabel(game.date);
    const key = `${dateKey}__${game.stageType}`;
    const existing = sectionMap.get(key);

    if (existing) {
      existing.rowIds.push(game.id);
      continue;
    }

    const next: Section = {
      key,
      dayKey,
      stageType: game.stageType,
      rowIds: [game.id],
    };

    sectionMap.set(key, next);
    sections.push(next);
  }

  return sections;
}

function SaveBadge({ state }: { state: SaveState }) {
  const label =
    state === "unsaved"
      ? "Unsaved"
      : state === "saving"
        ? "Saving..."
        : state === "error"
          ? "Error saving"
          : "Saved";

  return (
    <span
      className={cn(
        "inline-flex min-w-[108px] items-center justify-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        state === "saved" && "border-green-200 bg-green-50 text-green-700",
        state === "unsaved" && "border-amber-200 bg-amber-50 text-amber-700",
        state === "saving" && "border-blue-200 bg-blue-50 text-blue-700",
        state === "error" && "border-red-200 bg-red-50 text-red-700"
      )}
    >
      {label}
    </span>
  );
}

export default function AdminGamesTable({
  bracketId,
  initialGames,
}: {
  bracketId: number;
  initialGames: GameRow[];
}) {
  const [gamesById, setGamesById] = useState<Record<number, GameRow>>(() =>
    Object.fromEntries(initialGames.map((game) => [game.id, game]))
  );

  const [saveStateById, setSaveStateById] = useState<Record<number, SaveState>>(
    () => Object.fromEntries(initialGames.map((game) => [game.id, "saved"]))
  );

  // Freeze section membership/order from initial dataset.
  const sections = useMemo(() => buildSections(initialGames), [initialGames]);

  const gamesByIdRef = useRef(gamesById);
  const timersRef = useRef<Record<number, ReturnType<typeof setTimeout> | undefined>>(
    {}
  );
  const saveVersionRef = useRef<Record<number, number>>({});

  useEffect(() => {
    gamesByIdRef.current = gamesById;
  }, [gamesById]);

  useEffect(() => {
    return () => {
      for (const timer of Object.values(timersRef.current)) {
        if (timer) clearTimeout(timer);
      }
    };
  }, []);

  const updateGame = useCallback(
    async (gameId: number, patch: GamePatch) => {
      const res = await fetch(`/api/game-by-id/${gameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bracketId, patch }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Update failed");
      return json.game;
    },
    [bracketId]
  );

  const flushSave = useCallback(
    async (gameId: number, version: number) => {
      const currentRow = gamesByIdRef.current[gameId];
      if (!currentRow) return;

      setSaveStateById((prev) => ({ ...prev, [gameId]: "saving" }));

      try {
        const saved = await updateGame(gameId, {
          date: currentRow.date,
          time: currentRow.time,
          location: currentRow.location,
          homeScore: currentRow.homeScore,
          awayScore: currentRow.awayScore,
          homePenalty: currentRow.homePenalty,
          awayPenalty: currentRow.awayPenalty,
          status: currentRow.status,
        });

        if ((saveVersionRef.current[gameId] ?? 0) === version) {
          setGamesById((prev) => ({
            ...prev,
            [gameId]: {
              ...prev[gameId],
              ...saved,
            },
          }));
          setSaveStateById((prev) => ({ ...prev, [gameId]: "saved" }));
        }
      } catch {
        if ((saveVersionRef.current[gameId] ?? 0) === version) {
          setSaveStateById((prev) => ({ ...prev, [gameId]: "error" }));
        }
      }
    },
    [updateGame]
  );

  const scheduleSave = useCallback(
    (gameId: number) => {
      const nextVersion = (saveVersionRef.current[gameId] ?? 0) + 1;
      saveVersionRef.current[gameId] = nextVersion;

      const existingTimer = timersRef.current[gameId];
      if (existingTimer) clearTimeout(existingTimer);

      timersRef.current[gameId] = setTimeout(() => {
        void flushSave(gameId, nextVersion);
      }, 500);
    },
    [flushSave]
  );

  const onChange = useCallback(
    (gameId: number, patch: GamePatch) => {
      setGamesById((prev) => {
        const existing = prev[gameId];
        if (!existing) return prev;

        return {
          ...prev,
          [gameId]: {
            ...existing,
            ...patch,
          },
        };
      });

      setSaveStateById((prev) => ({ ...prev, [gameId]: "unsaved" }));
      scheduleSave(gameId);
    },
    [scheduleSave]
  );

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Changes save automatically. Rows stay in their original display order until refresh.
      </div>

      {sections.map((section) => {
        const stageGames = section.rowIds
          .map((rowId) => gamesById[rowId])
          .filter((game): game is GameRow => Boolean(game));

        return (
          <div key={section.key} className="space-y-3">
            <h2 className="text-lg font-semibold">{section.dayKey}</h2>

            <div className="rounded border">
              <div className="border-b px-3 py-2 font-medium">{section.stageType}</div>

              <div className="overflow-x-auto">
                <table className="min-w-[1180px] w-full text-sm">
                  <thead className="border-b text-left">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Time</th>
                      <th className="p-2">Location</th>
                      <th className="p-2">Home</th>
                      <th className="p-2">Away</th>
                      <th className="p-2">Score</th>
                      <th className="p-2">PIM</th>
                      <th className="p-2">Status</th>
                      <th className="p-2 text-right">Save</th>
                    </tr>
                  </thead>

                  <tbody>
                    {stageGames.map((g) => (
                      <tr key={g.id} className="border-b align-top">
                        <td className="p-2">
                          <input
                            className="w-[140px] rounded border px-2 py-1"
                            type="date"
                            value={g.date ?? ""}
                            onChange={(e) => onChange(g.id, { date: e.target.value })}
                          />
                        </td>

                        <td className="p-2">
                          <input
                            className="w-[120px] rounded border px-2 py-1"
                            value={g.time ?? ""}
                            onChange={(e) => onChange(g.id, { time: e.target.value })}
                          />
                        </td>

                        <td className="p-2">
                          <input
                            className="w-[140px] rounded border px-2 py-1"
                            value={g.location ?? ""}
                            onChange={(e) => onChange(g.id, { location: e.target.value })}
                          />
                        </td>

                        <td className="p-2">
                          <div className="font-medium">{g.homeTeam}</div>
                        </td>

                        <td className="p-2">
                          <div className="font-medium">{g.awayTeam}</div>
                        </td>

                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <input
                              className="w-[60px] rounded border px-2 py-1"
                              type="number"
                              value={g.homeScore ?? 0}
                              onChange={(e) =>
                                onChange(g.id, {
                                  homeScore: normalizeNumber(e.target.value),
                                })
                              }
                            />
                            <span>-</span>
                            <input
                              className="w-[60px] rounded border px-2 py-1"
                              type="number"
                              value={g.awayScore ?? 0}
                              onChange={(e) =>
                                onChange(g.id, {
                                  awayScore: normalizeNumber(e.target.value),
                                })
                              }
                            />
                          </div>
                        </td>

                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <input
                              className="w-[60px] rounded border px-2 py-1"
                              type="number"
                              value={g.homePenalty ?? 0}
                              onChange={(e) =>
                                onChange(g.id, {
                                  homePenalty: normalizeNumber(e.target.value),
                                })
                              }
                            />
                            <span>-</span>
                            <input
                              className="w-[60px] rounded border px-2 py-1"
                              type="number"
                              value={g.awayPenalty ?? 0}
                              onChange={(e) =>
                                onChange(g.id, {
                                  awayPenalty: normalizeNumber(e.target.value),
                                })
                              }
                            />
                          </div>
                        </td>

                        <td className="p-2">
                          <select
                            className="rounded border px-2 py-1"
                            value={g.status}
                            onChange={(e) => onChange(g.id, { status: e.target.value })}
                          >
                            <option value="UNSCHEDULED">UNSCHEDULED</option>
                            <option value="SCHEDULED">SCHEDULED</option>
                            <option value="FINAL">FINAL</option>
                          </select>
                        </td>

                        <td className="p-2 text-right">
                          <SaveBadge state={saveStateById[g.id] ?? "saved"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}