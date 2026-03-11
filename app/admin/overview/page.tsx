import { auth } from '@/auth';
import { getBrackets } from '@/lib/actions/brackets.actions';
import { getHotels } from '@/lib/actions/hotel.actions';
import { getRestaurants } from '@/lib/actions/restaurant.actions';
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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

const AdminOverviewPage = async () => {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    throw new Error('User is not authorized');
  }

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
          <Button asChild>
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

      <div className='grid gap-6 xl:grid-cols-3'>
        <div className='rounded-xl border border-emerald-900/50 bg-[#102317] p-5 xl:col-span-2'>
          <div className='mb-4 flex items-center justify-between'>
            <div>
              <h2 className='text-xl font-semibold text-white'>Upcoming Tournaments</h2>
              <p className='text-sm text-white/60'>
                Next brackets on the schedule.
              </p>
            </div>
            <Button asChild variant='ghost'>
              <Link href='/admin/brackets'>View all</Link>
            </Button>
          </div>

          <div className='space-y-3'>
            {upcoming.length > 0 ? (
              upcoming.slice(0, 6).map((bracket) => (
                <div
                  key={bracket.id}
                  className='flex flex-col gap-3 rounded-lg border border-emerald-900/40 bg-emerald-950/30 p-4 md:flex-row md:items-center md:justify-between'
                >
                  <div>
                    <p className='font-semibold text-white'>{bracket.name}</p>
                    <p className='text-sm text-white/65'>
                      {bracket.youthLevel} • {formatDateRange(bracket.date)}
                    </p>
                  </div>
                  <div className='flex gap-2'>
                    <Button asChild variant='outline' size='sm'>
                      <Link href={`/admin/brackets/${bracket.id}`}>Open</Link>
                    </Button>
                    <Button asChild variant='outline' size='sm'>
                      <Link href={`/admin/brackets/${bracket.id}/schedule`}>
                        Schedule
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className='rounded-lg border border-dashed border-emerald-900/50 bg-emerald-950/20 p-4 text-sm text-white/65'>
                No upcoming tournaments found.
              </div>
            )}
          </div>
        </div>

        <div className='space-y-6'>
          <div className='rounded-xl border border-emerald-900/50 bg-[#102317] p-5'>
            <h2 className='text-xl font-semibold text-white'>Quick Links</h2>
            <div className='mt-4 grid gap-2'>
              <Button asChild variant='outline' className='justify-start'>
                <Link href='/admin/brackets'>Manage Brackets</Link>
              </Button>
              <Button asChild variant='outline' className='justify-start'>
                <Link href='/admin/hotels'>Manage Hotels</Link>
              </Button>
              <Button asChild variant='outline' className='justify-start'>
                <Link href='/admin/restaurants'>Manage Restaurants</Link>
              </Button>
            </div>
          </div>

          <div className='rounded-xl border border-emerald-900/50 bg-[#102317] p-5'>
            <h2 className='text-xl font-semibold text-white'>Recently Added</h2>
            <div className='mt-4 space-y-3'>
              {recentBrackets.length > 0 ? (
                recentBrackets.map((bracket) => (
                  <div
                    key={bracket.id}
                    className='rounded-lg border border-emerald-900/40 bg-emerald-950/30 p-3'
                  >
                    <p className='font-medium text-white'>{bracket.name}</p>
                    <p className='text-sm text-white/60'>
                      {bracket.youthLevel} • {formatDateRange(bracket.date)}
                    </p>
                  </div>
                ))
              ) : (
                <p className='text-sm text-white/65'>No brackets available yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverviewPage;