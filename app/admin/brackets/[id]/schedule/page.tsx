import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getBracketStandingsView } from '@/lib/queries/bracketStandings';
import { getPlacementLabel } from '@/lib/bracket-labels';
import StandingsTable from '@/components/brackets/StandingsTable';
import AdminGamesTable from './games-table';
import ResolvePlacementButton from './resolve-placement-button';
import TeamNamesEditor from './team-names-editor';

export const dynamic = 'force-dynamic';

function weekdayFromISODate(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

function formatTimeFromLocalIso(isoLike: string) {
  const match = isoLike.match(/T(\d{2}):(\d{2})/);
  if (!match) return '';
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return '';

  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  const mm2 = String(mm).padStart(2, '0');

  return `${h12}:${mm2} ${ampm}`;
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const v = String(value ?? '').trim();
    if (v) return v;
  }
  return '';
}

export default async function AdminBracketSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bracketId = Number(id);

  const [bracket, standings, teams] = await Promise.all([
    prisma.bracket.findUnique({
      where: { id: bracketId },
      select: { id: true, name: true, youthLevel: true, date: true },
    }),
    getBracketStandingsView(bracketId),
    prisma.team.findMany({
      where: { bracketId },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        teamName: true,
      },
    }),
  ]);

  if (!bracket) {
    return <div className='p-6 text-white'>Bracket not found.</div>;
  }

  const unscheduled = await prisma.game.findMany({
    where: { bracketId, timesId: null },
    orderBy: [{ stageType: 'asc' }, { engineGameId: 'asc' }],
    include: {
      times: { select: { timeSlots: true, location: true, date: true, day: true } },
    },
  });

  const scheduled = await prisma.game.findMany({
    where: { bracketId, timesId: { not: null } },
    orderBy: [
      { times: { timeSlots: 'asc' } },
      { stageType: 'asc' },
      { engineGameId: 'asc' },
    ],
    include: {
      times: { select: { timeSlots: true, location: true, date: true, day: true } },
    },
  });

  const games = [...unscheduled, ...scheduled];

  const gamesForUi = games.map((g) => {
    const slotStart = String(g.times?.timeSlots ?? '').trim();
    const slotDateISO = slotStart ? slotStart.slice(0, 10) : '';

    const resolvedDateISO = firstNonEmpty(g.date, g.times?.date, slotDateISO);
    const resolvedDay = resolvedDateISO ? weekdayFromISODate(resolvedDateISO) : '';

    const resolvedTime = firstNonEmpty(
      g.time,
      slotStart ? formatTimeFromLocalIso(slotStart) : ''
    );

    const resolvedLocation = firstNonEmpty(g.location, g.times?.location, 'FIA');

    return {
      ...g,
      day: resolvedDay,
      date: resolvedDateISO,
      time: resolvedTime,
      location: resolvedLocation,
      displayLabel: getPlacementLabel({
        stageType: g.stageType,
        engineGameId: g.engineGameId,
        label: g.label,
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
      }),
    };
  });

  const unscheduledPool = await prisma.game.findMany({
    where: {
      bracketId,
      stageType: 'POOL_PLAY',
      timesId: null,
    },
    select: {
      id: true,
      engineGameId: true,
      homeTeam: true,
      awayTeam: true,
      stageId: true,
    },
    orderBy: [{ engineGameId: 'asc' }],
  });

  return (
    <div className='space-y-6 text-white'>
      <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-white'>{bracket.name}</h1>
          <div className='mt-1 text-sm text-white/65'>
            {bracket.youthLevel} • {bracket.date}
          </div>
        </div>

        <div className='flex flex-col items-start gap-2 md:items-end'>
          <Link
            className='rounded-md border border-emerald-900/70 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100 transition hover:bg-emerald-900/60'
            href={`/brackets/${bracketId}`}
          >
            Public View
          </Link>
          <ResolvePlacementButton bracketId={bracketId} />
        </div>
      </div>

      {teams.length > 0 && (
        <TeamNamesEditor
          bracketId={bracketId}
          teams={teams.map((team, index) => ({
            id: team.id,
            label: `Team ${index + 1}`,
            teamName: team.teamName,
          }))}
        />
      )}

      {unscheduledPool.length > 0 && (
        <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100'>
          <div className='font-semibold'>
            {unscheduledPool.length} Pool Play game(s) could not be scheduled
            (rest rules/time windows).
          </div>
          <div className='mt-1 text-sm text-amber-100/80'>
            Edit the open rows below or adjust the available slots, then save your
            changes.
          </div>

          <ul className='mt-3 list-disc pl-5 text-sm'>
            {unscheduledPool.map((g) => (
              <li key={g.id}>
                <span className='font-mono'>{g.engineGameId}</span> — {g.homeTeam} vs{' '}
                {g.awayTeam}
                {g.stageId ? <span className='opacity-70'> ({g.stageId})</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className='rounded-xl border border-emerald-900/50 bg-[#102317] p-5'>
        <StandingsTable standings={standings} title='Pool Standings' />
      </div>

      <AdminGamesTable bracketId={bracketId} initialGames={gamesForUi as any} />
    </div>
  );
}