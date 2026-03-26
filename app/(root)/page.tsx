import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Trophy, CalendarDays } from 'lucide-react';
import StandingsTable from '@/components/brackets/StandingsTable';
import PublicSponsorsSection from '@/components/public/sponsors/public-sponsors-section';
import { getBracketStandingsView } from '@/lib/queries/bracketStandings';
import {
  getCurrentTournament,
  getNextTournament,
} from '@/lib/queries/currentTournament';
import { getStandingsPageSponsors } from '@/lib/queries/publicSponsors';
import { prisma } from '@/lib/prisma';
import { parseDateRange } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function formatDateMMDDYYYY(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return dateStr;

  return d.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

function formatBracketDateRange(dateRange: string) {
  if (!dateRange) return '';

  const parts = dateRange.split(' to ').map((s) => s.trim());

  if (parts.length === 2) {
    return `${formatDateMMDDYYYY(parts[0])}–${formatDateMMDDYYYY(parts[1])}`;
  }

  return formatDateMMDDYYYY(dateRange);
}

function dateOnly(dateStr: string, endOfDay = false) {
  const time = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
  const d = new Date(`${dateStr}${time}`);
  return Number.isFinite(d.getTime()) ? d : null;
}

function getBracketBounds(dateRange: string) {
  const { startDate, endDate } = parseDateRange(dateRange);
  const start = startDate ? dateOnly(startDate, false) : null;
  const end = endDate
    ? dateOnly(endDate, true)
    : startDate
      ? dateOnly(startDate, true)
      : null;

  return { start, end };
}

function isImageBasedBracket(bracket: {
  image?: string | null;
  tournamentFormat?: string | null;
}) {
  const image = String(bracket.image ?? '').trim();
  const tournamentFormat = String(bracket.tournamentFormat ?? '').trim();

  return tournamentFormat === 'IMAGE_UPLOAD' || image.length > 0;
}

async function hasCurrentOrUpcomingImageBasedHomeBracket() {
  const now = new Date();

  const brackets = await prisma.bracket.findMany({
    where: {
      side: 'HOME',
    },
    select: {
      id: true,
      date: true,
      image: true,
      tournamentFormat: true,
    },
    orderBy: [{ date: 'asc' }, { name: 'asc' }],
  });

  return brackets.some((bracket) => {
    if (!isImageBasedBracket(bracket)) return false;

    const { start, end } = getBracketBounds(bracket.date);
    if (!start) return false;

    if (end && now >= start && now <= end) return true;
    return start >= now;
  });
}

export default async function CurrentStandingsPage() {
  const currentTournament = await getCurrentTournament();
  const sponsors = await getStandingsPageSponsors(currentTournament?.id ?? null);

  if (!currentTournament) {
    const hasImageBasedBracket = await hasCurrentOrUpcomingImageBasedHomeBracket();

    if (hasImageBasedBracket) {
      redirect('/brackets');
    }

    const nextTournament = await getNextTournament();

    return (
      <div className="min-h-screen bg-[url('/images/rinkWlights.png')] bg-cover bg-center bg-fixed">
        <div className="min-h-screen bg-slate-950/70">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="rounded-[28px] border border-white/15 bg-slate-950/75 p-8 text-white shadow-2xl backdrop-blur-md">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
                Current Standings
              </div>
              <h1 className="mt-2 text-3xl font-bold">No active tournament right now</h1>
              <p className="mt-3 text-slate-200">
                Standings will appear here automatically when a home tournament is active.
              </p>

              {nextTournament ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">
                    Next Tournament
                  </div>
                  <h2 className="mt-2 text-2xl font-bold">{nextTournament.name}</h2>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-200">
                    <span className="inline-flex items-center gap-1.5">
                      <Trophy className="h-4 w-4 text-emerald-300" />
                      {nextTournament.youthLevel}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-emerald-300" />
                      {formatBracketDateRange(nextTournament.date)}
                    </span>
                  </div>

                  <div className="mt-5">
                    <Link
                      href={`/brackets/${nextTournament.id}`}
                      className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                    >
                      View Tournament
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            <PublicSponsorsSection
              sponsors={sponsors}
              title="Standings Sponsors"
              description="Thank you to the businesses that support Faribault Hockey and tournament weekends."
            />
          </div>
        </div>
      </div>
    );
  }

  const standings = await getBracketStandingsView(currentTournament.id);

  if (!standings) {
    redirect('/brackets');
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(3,18,12,0.58)_0%,rgba(6,28,18,0.72)_38%,rgba(2,10,8,0.88)_100%)]">
      <div className="min-h-screen bg-slate-950/70">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="mb-6 rounded-[28px] border border-white/15 bg-slate-950/75 p-6 text-white shadow-2xl backdrop-blur-md">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
              Current Tournament Standings
            </div>
            <h1 className="mt-2 text-3xl font-bold">{currentTournament.name}</h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-200">
              <span className="inline-flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-emerald-300" />
                {currentTournament.youthLevel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-emerald-300" />
                {formatBracketDateRange(currentTournament.date)}
              </span>
            </div>

            <div className="mt-5">
              <Link
                href={`/brackets/${currentTournament.id}`}
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Open Tournament Page
              </Link>
            </div>
          </div>

          <StandingsTable standings={standings} title="Current Pool Standings" />

          <PublicSponsorsSection
            sponsors={sponsors}
            title="Standings Sponsors"
            description="Thank you to the businesses that support Faribault Hockey and tournament weekends."
          />
        </div>
      </div>
    </div>
  );
}