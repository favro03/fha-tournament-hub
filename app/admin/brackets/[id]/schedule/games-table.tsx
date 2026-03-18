'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

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
  displayLabel?: string;
};

type SaveState = 'saved' | 'unsaved' | 'saving' | 'error';
type ViewMode = 'grouped' | 'chronological';

type Section = {
  key: string;
  dayKey: string;
  stageType: string;
  stageId: string | null;
  rowIds: number[];
};

type DaySection = {
  key: string;
  dayKey: string;
  rowIds: number[];
};

type GamePatch = Partial<
  Pick<
    GameRow,
    | 'date'
    | 'time'
    | 'location'
    | 'homeScore'
    | 'awayScore'
    | 'homePenalty'
    | 'awayPenalty'
    | 'status'
  >
>;

type SaveResponse = {
  ok: boolean;
  game?: Partial<GameRow>;
  seedSummary?: Array<{
    poolId: string;
    orderedTeamIds: string[];
    poolPlayComplete: boolean;
  }>;
  error?: string;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function buildDayLabel(dateISO: string) {
  if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return 'TBD';

  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  const weekday = WEEKDAYS[dt.getDay()] ?? '';

  return `${dateISO} ${weekday}`.trim();
}

function normalizeNumber(value: string) {
  if (value.trim() === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeToken(raw?: string | null) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
}

function levelFromStageId(stageId?: string | null) {
  const value = String(stageId ?? '').trim();
  if (!value) return '';

  const parts = value.split(':');
  return normalizeToken(parts[parts.length - 1] ?? '');
}

function humanizeJamboreeLevel(stageId?: string | null) {
  const token = levelFromStageId(stageId);

  if (token === 'MINI_MITE') return 'Mini Mite';
  if (token === 'MITE1') return 'Mite 1';
  if (token === 'MITE2') return 'Mite 2';
  if (token === 'MITE3') return 'Mite 3';

  return 'Jamboree';
}

function buildSections(initialGames: GameRow[]): Section[] {
  const sections: Section[] = [];
  const sectionMap = new Map<string, Section>();

  for (const game of initialGames) {
    const dateKey = game.date || 'TBD';
    const dayKey = buildDayLabel(game.date);

    const stageGroupingKey =
      game.stageType === 'JAMBOREE'
        ? `${game.stageType}__${game.stageId ?? 'JAMBOREE'}`
        : game.stageType;

    const key = `${dateKey}__${stageGroupingKey}`;
    const existing = sectionMap.get(key);

    if (existing) {
      existing.rowIds.push(game.id);
      continue;
    }

    const next: Section = {
      key,
      dayKey,
      stageType: game.stageType,
      stageId: game.stageType === 'JAMBOREE' ? game.stageId ?? null : null,
      rowIds: [game.id],
    };

    sectionMap.set(key, next);
    sections.push(next);
  }

  return sections;
}

function buildChronologicalDaySections(initialGames: GameRow[]): DaySection[] {
  const sections: DaySection[] = [];
  const map = new Map<string, DaySection>();

  for (const game of initialGames) {
    const dateKey = game.date || 'TBD';
    const dayKey = buildDayLabel(game.date);
    const key = `${dateKey}`;

    const existing = map.get(key);
    if (existing) {
      existing.rowIds.push(game.id);
      continue;
    }

    const next: DaySection = {
      key,
      dayKey,
      rowIds: [game.id],
    };

    map.set(key, next);
    sections.push(next);
  }

  return sections;
}

function stageLabel(stageType: string, stageId?: string | null) {
  if (stageType === 'POOL_PLAY') return 'Pool Play';
  if (stageType === 'PLACEMENT') return 'Placement';
  if (stageType === 'JAMBOREE') return `${humanizeJamboreeLevel(stageId)} Jamboree`;
  return stageType;
}

function levelPillLabel(stageType: string, stageId?: string | null) {
  if (stageType === 'JAMBOREE') return humanizeJamboreeLevel(stageId);
  if (stageType === 'POOL_PLAY') return 'Pool Play';
  if (stageType === 'PLACEMENT') return 'Placement';
  return stageType;
}

function SaveBadge({ state }: { state: SaveState }) {
  const label =
    state === 'unsaved'
      ? 'Unsaved'
      : state === 'saving'
        ? 'Saving...'
        : state === 'error'
          ? 'Error'
          : 'Saved';

  return (
    <span
      className={cn(
        'inline-flex min-w-[108px] items-center justify-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap',
        state === 'saved' && 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
        state === 'unsaved' && 'border-amber-400/30 bg-amber-400/10 text-amber-200',
        state === 'saving' && 'border-sky-400/30 bg-sky-400/10 text-sky-200',
        state === 'error' && 'border-red-400/30 bg-red-400/10 text-red-200'
      )}
    >
      {label}
    </span>
  );
}

const inputClassName =
  'h-10 rounded-md border border-emerald-900/70 bg-[#0f2217] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20';

const smallNumberClassName =
  'h-10 w-[76px] rounded-md border border-emerald-900/70 bg-[#0f2217] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20';

const toggleClassName =
  'rounded-md border px-3 py-2 text-sm font-medium transition-colors';

export default function AdminGamesTable({
  bracketId,
  initialGames,
}: {
  bracketId: number;
  initialGames: GameRow[];
}) {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>('grouped');

  const [gamesById, setGamesById] = useState<Record<number, GameRow>>(() =>
    Object.fromEntries(initialGames.map((game) => [game.id, game]))
  );

  const [saveStateById, setSaveStateById] = useState<Record<number, SaveState>>(
    () => Object.fromEntries(initialGames.map((game) => [game.id, 'saved']))
  );

  const groupedSections = useMemo(() => buildSections(initialGames), [initialGames]);
  const chronologicalSections = useMemo(
    () => buildChronologicalDaySections(initialGames),
    [initialGames]
  );

  const gamesByIdRef = useRef(gamesById);
  const timersRef = useRef<Record<number, ReturnType<typeof setTimeout> | undefined>>(
    {}
  );
  const saveVersionRef = useRef<Record<number, number>>({});
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    gamesByIdRef.current = gamesById;
  }, [gamesById]);

  useEffect(() => {
    return () => {
      for (const timer of Object.values(timersRef.current)) {
        if (timer) clearTimeout(timer);
      }
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, []);

  const updateGame = useCallback(
    async (gameId: number, patch: GamePatch): Promise<SaveResponse> => {
      const res = await fetch(`/api/game-by-id/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bracketId, patch }),
      });

      const json = (await res.json()) as SaveResponse;
      if (!json.ok) throw new Error(json.error ?? 'Update failed');
      return json;
    },
    [bracketId]
  );

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);

    refreshTimeoutRef.current = setTimeout(() => {
      router.refresh();
    }, 300);
  }, [router]);

  const flushSave = useCallback(
    async (gameId: number, version: number) => {
      const currentRow = gamesByIdRef.current[gameId];
      if (!currentRow) return;

      setSaveStateById((prev) => ({ ...prev, [gameId]: 'saving' }));

      try {
        const response = await updateGame(gameId, {
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
              ...(response.game ?? {}),
            },
          }));
          setSaveStateById((prev) => ({ ...prev, [gameId]: 'saved' }));
        }

        const shouldRefresh =
          response.seedSummary?.some((s) => s.poolPlayComplete) ?? false;

        if (shouldRefresh) {
          scheduleRefresh();
        }
      } catch {
        if ((saveVersionRef.current[gameId] ?? 0) === version) {
          setSaveStateById((prev) => ({ ...prev, [gameId]: 'error' }));
        }
      }
    },
    [scheduleRefresh, updateGame]
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

      setSaveStateById((prev) => ({ ...prev, [gameId]: 'unsaved' }));
      scheduleSave(gameId);
    },
    [scheduleSave]
  );

  const renderRows = (
    stageGames: GameRow[],
    opts?: {
      showLabelColumn?: boolean;
      showLevelColumn?: boolean;
    }
  ) => {
    const showLabelColumn = !!opts?.showLabelColumn;
    const showLevelColumn = !!opts?.showLevelColumn;

    return (
      <div className='overflow-x-auto'>
        <table className='min-w-[1280px] w-full text-sm text-white'>
          <thead className='border-b border-emerald-900/50 bg-emerald-950/20 text-left'>
            <tr>
              {showLabelColumn && (
                <th className='p-3 text-xs font-semibold uppercase tracking-wide text-emerald-200'>
                  Label
                </th>
              )}
              {showLevelColumn && (
                <th className='p-3 text-xs font-semibold uppercase tracking-wide text-emerald-200'>
                  Level
                </th>
              )}
              <th className='p-3 text-xs font-semibold uppercase tracking-wide text-emerald-200'>
                Date
              </th>
              <th className='p-3 text-xs font-semibold uppercase tracking-wide text-emerald-200'>
                Time
              </th>
              <th className='p-3 text-xs font-semibold uppercase tracking-wide text-emerald-200'>
                Location
              </th>
              <th className='p-3 text-xs font-semibold uppercase tracking-wide text-emerald-200'>
                Home
              </th>
              <th className='p-3 text-xs font-semibold uppercase tracking-wide text-emerald-200'>
                Away
              </th>
              <th className='p-3 text-xs font-semibold uppercase tracking-wide text-emerald-200'>
                Score
              </th>
              <th className='p-3 text-xs font-semibold uppercase tracking-wide text-emerald-200'>
                PIM
              </th>
              <th className='p-3 text-xs font-semibold uppercase tracking-wide text-emerald-200'>
                Status
              </th>
              <th className='p-3 text-right text-xs font-semibold uppercase tracking-wide text-emerald-200'>
                Save
              </th>
            </tr>
          </thead>

          <tbody>
            {stageGames.map((g) => (
              <tr
                key={g.id}
                className='border-b border-emerald-900/40 align-top transition-colors hover:bg-emerald-900/20'
              >
                {showLabelColumn && (
                  <td className='p-3'>
                    <div className='min-w-[120px]'>
                      {g.displayLabel ? (
                        <span className='inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90'>
                          {g.displayLabel}
                        </span>
                      ) : null}
                    </div>
                  </td>
                )}

                {showLevelColumn && (
                  <td className='p-3'>
                    <div className='min-w-[140px]'>
                      <span className='inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90'>
                        {levelPillLabel(g.stageType, g.stageId)}
                      </span>
                    </div>
                  </td>
                )}

                <td className='p-3'>
                  <input
                    className={`${inputClassName} w-[148px]`}
                    type='date'
                    value={g.date ?? ''}
                    onChange={(e) => onChange(g.id, { date: e.target.value })}
                  />
                </td>

                <td className='p-3'>
                  <input
                    className={`${inputClassName} w-[132px]`}
                    value={g.time ?? ''}
                    onChange={(e) => onChange(g.id, { time: e.target.value })}
                  />
                </td>

                <td className='p-3'>
                  <input
                    className={`${inputClassName} w-[148px]`}
                    value={g.location ?? ''}
                    onChange={(e) => onChange(g.id, { location: e.target.value })}
                  />
                </td>

                <td className='p-3'>
                  <div className='min-w-[110px] font-medium text-white'>
                    {g.homeTeam}
                  </div>
                </td>

                <td className='p-3'>
                  <div className='min-w-[110px] font-medium text-white'>
                    {g.awayTeam}
                  </div>
                </td>

                <td className='p-3'>
                  <div className='flex items-center gap-2'>
                    <input
                      className={smallNumberClassName}
                      type='number'
                      value={g.homeScore ?? 0}
                      onChange={(e) =>
                        onChange(g.id, {
                          homeScore: normalizeNumber(e.target.value),
                        })
                      }
                    />
                    <span className='text-white/60'>-</span>
                    <input
                      className={smallNumberClassName}
                      type='number'
                      value={g.awayScore ?? 0}
                      onChange={(e) =>
                        onChange(g.id, {
                          awayScore: normalizeNumber(e.target.value),
                        })
                      }
                    />
                  </div>
                </td>

                <td className='p-3'>
                  <div className='flex items-center gap-2'>
                    <input
                      className={smallNumberClassName}
                      type='number'
                      value={g.homePenalty ?? 0}
                      onChange={(e) =>
                        onChange(g.id, {
                          homePenalty: normalizeNumber(e.target.value),
                        })
                      }
                    />
                    <span className='text-white/60'>-</span>
                    <input
                      className={smallNumberClassName}
                      type='number'
                      value={g.awayPenalty ?? 0}
                      onChange={(e) =>
                        onChange(g.id, {
                          awayPenalty: normalizeNumber(e.target.value),
                        })
                      }
                    />
                  </div>
                </td>

                <td className='p-3'>
                  <select
                    className={`${inputClassName} w-[180px]`}
                    value={g.status}
                    onChange={(e) => onChange(g.id, { status: e.target.value })}
                  >
                    <option value='UNSCHEDULED'>UNSCHEDULED</option>
                    <option value='SCHEDULED'>SCHEDULED</option>
                    <option value='FINAL'>FINAL</option>
                  </select>
                </td>

                <td className='p-3 text-right'>
                  <SaveBadge state={saveStateById[g.id] ?? 'saved'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className='space-y-6'>
      <div className='rounded-xl border border-emerald-900/50 bg-[#102317] p-4'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <div className='text-sm text-white/65'>
            Changes save automatically. Use grouped view for level blocks or chronological
            view to see the day in time order.
          </div>

          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => setViewMode('grouped')}
              className={cn(
                toggleClassName,
                viewMode === 'grouped'
                  ? 'border-emerald-400/60 bg-emerald-500/20 text-white'
                  : 'border-emerald-900/70 bg-[#0f2217] text-white/80 hover:bg-emerald-950/50'
              )}
            >
              Grouped by Level
            </button>
            <button
              type='button'
              onClick={() => setViewMode('chronological')}
              className={cn(
                toggleClassName,
                viewMode === 'chronological'
                  ? 'border-emerald-400/60 bg-emerald-500/20 text-white'
                  : 'border-emerald-900/70 bg-[#0f2217] text-white/80 hover:bg-emerald-950/50'
              )}
            >
              By Date / Time
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'grouped'
        ? groupedSections.map((section) => {
            const stageGames = section.rowIds
              .map((rowId) => gamesById[rowId])
              .filter((game): game is GameRow => Boolean(game));

            const showLabelColumn = section.stageType === 'PLACEMENT';
            const sectionTitle = stageLabel(section.stageType, section.stageId);

            return (
              <div key={section.key} className='space-y-3'>
                <h2 className='text-2xl font-semibold text-white'>{section.dayKey}</h2>

                <div className='overflow-hidden rounded-xl border border-emerald-900/50 bg-[#102317]'>
                  <div className='border-b border-emerald-900/50 bg-emerald-950/30 px-4 py-3'>
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                      <div className='text-lg font-semibold text-white'>{sectionTitle}</div>

                      {section.stageType === 'JAMBOREE' ? (
                        <span className='inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/85'>
                          {sectionTitle}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {renderRows(stageGames, {
                    showLabelColumn,
                    showLevelColumn: false,
                  })}
                </div>
              </div>
            );
          })
        : chronologicalSections.map((section) => {
            const dayGames = section.rowIds
              .map((rowId) => gamesById[rowId])
              .filter((game): game is GameRow => Boolean(game))
              .sort((a, b) => {
                const aKey = `${a.date} ${a.time} ${a.location} ${a.engineGameId}`;
                const bKey = `${b.date} ${b.time} ${b.location} ${b.engineGameId}`;
                return aKey.localeCompare(bKey);
              });

            const hasPlacement = dayGames.some((g) => g.stageType === 'PLACEMENT');

            return (
              <div key={section.key} className='space-y-3'>
                <h2 className='text-2xl font-semibold text-white'>{section.dayKey}</h2>

                <div className='overflow-hidden rounded-xl border border-emerald-900/50 bg-[#102317]'>
                  <div className='border-b border-emerald-900/50 bg-emerald-950/30 px-4 py-3'>
                    <div className='text-lg font-semibold text-white'>
                      Chronological Schedule
                    </div>
                  </div>

                  {renderRows(dayGames, {
                    showLabelColumn: hasPlacement,
                    showLevelColumn: true,
                  })}
                </div>
              </div>
            );
          })}
    </div>
  );
}