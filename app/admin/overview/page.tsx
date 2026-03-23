import { getBrackets } from '@/lib/actions/brackets.actions';
import { getHotels } from '@/lib/actions/hotel.actions';
import { getRestaurants } from '@/lib/actions/restaurant.actions';
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { requireAdmin } from '@/lib/auth/guards';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
};

function getDateRangeParts(dateValue: string) {
  const [startRaw, endRaw] = dateValue.split(' to ').map((part) => part.trim());
  return {
    start: startRaw || '',
    end: endRaw || startRaw || '',
  };
}

function toDateSafe(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateRange(dateValue: string) {
  if (!dateValue) return 'No date set';

  const { start, end } = getDateRangeParts(dateValue);
  const startDate = toDateSafe(start);
  const endDate = toDateSafe(end);

  if (!startDate || !endDate) return dateValue;

  const startLabel = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const endLabel = endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return start === end ? startLabel : `${startLabel} - ${endLabel}`;
}

function formatBracketSide(side?: string | null) {
  if (!side) return '';
  return side.charAt(0).toUpperCase() + side.slice(1).toLowerCase();
}

const AdminOverviewPage = async () => {
  await requireAdmin();

  const [brackets, hotels, restaurants] = await Promise.all([
    getBrackets(),
    getHotels(),
    getRestaurants(),
  ]);

  const today = new Date();
  const todayKey = new Date(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}T00:00:00`
  );

  const bracketList = Array.isArray(brackets) ? brackets : [];
  const upcoming = bracketList
    .filter((bracket) => {
      const { start } = getDateRangeParts(bracket.date ?? '');
      const startDate = toDateSafe(start);
      return startDate && startDate >= todayKey;
    })
    .sort((a, b) => {
      const aDate = toDateSafe(getDateRangeParts(a.date ?? '').start)?.getTime() ?? Infinity;
      const bDate = toDateSafe(getDateRangeParts(b.date ?? '').start)?.getTime() ?? Infinity;
      return aDate - bDate;
    });

  const active = bracketList.filter((bracket) => {
    const { start, end } = getDateRangeParts(bracket.date ?? '');
    const startDate = toDateSafe(start);
    const endDate = toDateSafe(end);
    if (!startDate || !endDate) return false;
    return todayKey >= startDate && todayKey <= endDate;
  });

  const recentBrackets = [...bracketList]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  return (
    <div className='space-y-8'>
      <div className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-white'>Admin Overview</h1>
          <p className='mt-1 text-sm text-white/65'>
            Quick snapshot of tournament content and admin shortcuts.
          </p>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='outline'>
            <Link href='/admin/brackets/create'>Create Bracket</Link>
          </Button>
          <Button asChild variant='outline'>
            <Link href='/admin/hotels/create'>Create Hotel</Link>
          </Button>
          <Button asChild variant='outline'>
            <Link href='/admin/restaurants/create'>Create Restaurant</Link>
          </Button>
        </div>
      </div>

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <div className='rounded-xl border border-emerald-900/50 bg-[#102317] p-5'>
          <p className='text-xs font-semibold uppercase tracking-wide text-emerald-300'>
            Total Brackets
          </p>
          <p className='mt-3 text-3xl font-bold text-white'>{bracketList.length}</p>
        </div>

        <div className='rounded-xl border border-emerald-900/50 bg-[#102317] p-5'>
          <p className='text-xs font-semibold uppercase tracking-wide text-emerald-300'>
            Active Tournaments
          </p>
          <p className='mt-3 text-3xl font-bold text-white'>{active.length}</p>
        </div>

        <div className='rounded-xl border border-emerald-900/50 bg-[#102317] p-5'>
          <p className='text-xs font-semibold uppercase tracking-wide text-emerald-300'>
            Hotels
          </p>
          <p className='mt-3 text-3xl font-bold text-white'>
            {Array.isArray(hotels) ? hotels.length : 0}
          </p>
        </div>

        <div className='rounded-xl border border-emerald-900/50 bg-[#102317] p-5'>
          <p className='text-xs font-semibold uppercase tracking-wide text-emerald-300'>
            Restaurants
          </p>
          <p className='mt-3 text-3xl font-bold text-white'>
            {Array.isArray(restaurants) ? restaurants.length : 0}
          </p>
        </div>
      </div>

      <div className='grid gap-6 xl:grid-cols-[1.3fr_0.9fr]'>
        <div className='rounded-2xl border border-emerald-900/50 bg-[#102317] p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-xl font-semibold text-white'>Upcoming Tournaments</h2>
              <p className='mt-1 text-sm text-white/60'>
                Next tournaments based on start date.
              </p>
            </div>
            <Button asChild variant='ghost'>
              <Link href='/admin/brackets'>View all</Link>
            </Button>
          </div>

          <div className='mt-5 space-y-3'>
            {upcoming.length > 0 ? (
              upcoming.slice(0, 6).map((bracket) => (
                <div
                  key={bracket.id}
                  className='rounded-xl border border-emerald-900/40 bg-black/10 p-4'
                >
                  <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                    <div>
                      <p className='text-base font-semibold text-white'>{bracket.name}</p>
                      <div className='mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60'>
                        <span>{bracket.youthLevel}</span>
                        <span>•</span>
                        <span>{formatDateRange(bracket.date ?? '')}</span>
                        {!!bracket.side && (
                          <>
                            <span>•</span>
                            <span>{formatBracketSide(bracket.side)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <Button asChild size='sm' variant='outline'>
                      <Link href={`/admin/brackets/${bracket.id}/update`}>Edit</Link>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className='rounded-xl border border-dashed border-emerald-900/50 p-6 text-sm text-white/60'>
                No upcoming tournaments found.
              </div>
            )}
          </div>
        </div>

        <div className='space-y-6'>
          <div className='rounded-2xl border border-emerald-900/50 bg-[#102317] p-6'>
            <h2 className='text-xl font-semibold text-white'>Recently Updated</h2>
            <div className='mt-4 space-y-3'>
              {recentBrackets.length > 0 ? (
                recentBrackets.map((bracket) => (
                  <div
                    key={bracket.id}
                    className='rounded-xl border border-emerald-900/40 bg-black/10 p-4'
                  >
                    <p className='font-medium text-white'>{bracket.name}</p>
                    <p className='mt-1 text-xs text-white/60'>
                      {bracket.youthLevel} • {formatDateRange(bracket.date ?? '')}
                    </p>
                  </div>
                ))
              ) : (
                <p className='text-sm text-white/60'>No bracket activity yet.</p>
              )}
            </div>
          </div>

          <div className='rounded-2xl border border-emerald-900/50 bg-[#102317] p-6'>
            <h2 className='text-xl font-semibold text-white'>Content Summary</h2>
            <div className='mt-4 space-y-3 text-sm text-white/70'>
              <div className='flex items-center justify-between rounded-lg bg-black/10 px-3 py-2'>
                <span>Hotels</span>
                <span>{Array.isArray(hotels) ? hotels.length : 0}</span>
              </div>
              <div className='flex items-center justify-between rounded-lg bg-black/10 px-3 py-2'>
                <span>Restaurants</span>
                <span>{Array.isArray(restaurants) ? restaurants.length : 0}</span>
              </div>
              <div className='flex items-center justify-between rounded-lg bg-black/10 px-3 py-2'>
                <span>Upcoming tournaments</span>
                <span>{upcoming.length}</span>
              </div>
              <div className='flex items-center justify-between rounded-lg bg-black/10 px-3 py-2'>
                <span>Active tournaments</span>
                <span>{active.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverviewPage;