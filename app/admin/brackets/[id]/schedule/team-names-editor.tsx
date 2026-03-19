'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type TeamRow = {
  id: number;
  label: string;
  teamName: string;
};

type TeamGroup = {
  key: string;
  title: string;
  teams: TeamRow[];
};

type SaveState = 'saved' | 'unsaved' | 'saving' | 'error';

type SaveResponse = {
  ok: boolean;
  teams?: Array<{
    id: number;
    teamName: string;
  }>;
  error?: string;
};

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
        'inline-flex min-w-[96px] items-center justify-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap',
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
  'h-10 w-full rounded-md border border-emerald-900/70 bg-[#0f2217] px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20';

export default function TeamNamesEditor({
  bracketId,
  groups,
}: {
  bracketId: number;
  groups: TeamGroup[];
}) {
  const router = useRouter();

  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>(groups);
  const [saveState, setSaveState] = useState<SaveState>('saved');

  const groupsRef = useRef(teamGroups);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveVersionRef = useRef(0);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    groupsRef.current = teamGroups;
  }, [teamGroups]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, []);

  const flatTeams = useMemo(
    () => teamGroups.flatMap((group) => group.teams),
    [teamGroups]
  );

  const hasBlankNames = useMemo(
    () => flatTeams.some((team) => !team.teamName.trim()),
    [flatTeams]
  );

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);

    refreshTimeoutRef.current = setTimeout(() => {
      router.refresh();
    }, 300);
  }, [router]);

  const saveTeams = useCallback(
    async (version: number) => {
      const payload = {
        teams: groupsRef.current.flatMap((group) =>
          group.teams.map((team) => ({
            id: team.id,
            teamName: team.teamName.trim(),
          }))
        ),
      };

      setSaveState('saving');

      try {
        const res = await fetch(`/api/brackets/${bracketId}/teams`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = (await res.json()) as SaveResponse;

        if (!json.ok) {
          throw new Error(json.error ?? 'Failed to update team names');
        }

        if (saveVersionRef.current === version) {
          setTeamGroups((prev) =>
            prev.map((group) => ({
              ...group,
              teams: group.teams.map((team) => {
                const updated = json.teams?.find((t) => t.id === team.id);
                return updated ? { ...team, teamName: updated.teamName } : team;
              }),
            }))
          );
          setSaveState('saved');
          scheduleRefresh();
        }
      } catch {
        if (saveVersionRef.current === version) {
          setSaveState('error');
        }
      }
    },
    [bracketId, scheduleRefresh]
  );

  const scheduleSave = useCallback(() => {
    const nextVersion = saveVersionRef.current + 1;
    saveVersionRef.current = nextVersion;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      void saveTeams(nextVersion);
    }, 500);
  }, [saveTeams]);

  const onChange = useCallback(
    (id: number, value: string) => {
      setTeamGroups((prev) =>
        prev.map((group) => ({
          ...group,
          teams: group.teams.map((team) =>
            team.id === id ? { ...team, teamName: value } : team
          ),
        }))
      );

      setSaveState('unsaved');

      if (!value.trim()) return;
      scheduleSave();
    },
    [scheduleSave]
  );

  return (
    <div className='rounded-xl border border-emerald-900/50 bg-[#102317] p-5'>
      <div className='mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div>
          <h2 className='text-xl font-semibold text-white'>Team Names</h2>
          
        </div>

        <SaveBadge state={hasBlankNames ? 'error' : saveState} />
      </div>

      <div className='space-y-6'>
        {teamGroups.map((group) => (
          <div
            key={group.key}
            className='rounded-xl border border-emerald-900/50 bg-[#0f2217] p-4'
          >
            <div className='mb-4 flex items-center justify-between gap-3'>
              <div>
                <h3 className='text-lg font-semibold text-white'>{group.title}</h3>
                <p className='mt-1 text-xs text-white/60'>
                  {group.teams.length} team{group.teams.length === 1 ? '' : 's'}
                </p>
              </div>

              <span className='inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/85'>
                {group.title}
              </span>
            </div>

            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {group.teams.map((team) => (
                <div key={team.id} className='space-y-2'>
                  <label
                    htmlFor={`team-${team.id}`}
                    className='text-sm font-medium text-white/85'
                  >
                    {team.label}
                  </label>
                  <input
                    id={`team-${team.id}`}
                    value={team.teamName}
                    onChange={(e) => onChange(team.id, e.target.value)}
                    className={inputClassName}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      
    </div>
  );
}