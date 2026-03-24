import { Metadata } from 'next';
import Link from 'next/link';

import { prisma } from '@/db/prisma';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const metadata: Metadata = {
  title: 'Super Admin Sponsors',
};

function formatDate(value: Date) {
  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getPlacementClasses(
  placement: 'HEADER' | 'SCHEDULE' | 'STANDINGS' | 'BRACKET'
) {
  switch (placement) {
    case 'HEADER':
      return 'border border-sky-500/30 bg-sky-500/15 text-sky-300';
    case 'SCHEDULE':
      return 'border border-amber-500/30 bg-amber-500/15 text-amber-300';
    case 'STANDINGS':
      return 'border border-violet-500/30 bg-violet-500/15 text-violet-300';
    case 'BRACKET':
      return 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300';
    default:
      return 'border border-white/15 bg-white/10 text-white';
  }
}

function getStatusClasses(isActive: boolean) {
  return isActive
    ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
    : 'border border-red-500/30 bg-red-500/15 text-red-300';
}

export default async function SuperAdminSponsorsPage() {
  await requireSuperAdmin();

  const sponsors = await prisma.sponsor.findMany({
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      businessName: true,
      placement: true,
      isActive: true,
      sortOrder: true,
      updatedAt: true,
      tournament: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h1 className='text-3xl font-bold text-white'>Sponsors</h1>
          <p className='mt-1 text-sm text-white/65'>
            Manage sponsor records for future ad placement across tournament
            pages.
          </p>
        </div>

        <Button asChild>
          <Link href='/super-admin/sponsors/new'>Create Sponsor</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead>Placement</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sort Order</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sponsors.length > 0 ? (
            sponsors.map((sponsor) => {
              const scopeLabel = sponsor.tournament
                ? sponsor.tournament.name
                : 'Global';

              return (
                <TableRow key={sponsor.id}>
                  <TableCell className='font-medium text-white'>
                    <Link
                      href={`/super-admin/sponsors/${sponsor.id}`}
                      className='underline-offset-4 hover:underline'
                    >
                      {sponsor.businessName}
                    </Link>
                  </TableCell>

                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getPlacementClasses(
                        sponsor.placement
                      )}`}
                    >
                      {sponsor.placement}
                    </span>
                  </TableCell>

                  <TableCell>{scopeLabel}</TableCell>

                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                        sponsor.isActive
                      )}`}
                    >
                      {sponsor.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>

                  <TableCell>{sponsor.sortOrder}</TableCell>

                  <TableCell>{formatDate(sponsor.updatedAt)}</TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={6} className='py-8 text-center text-white/65'>
                No sponsors created yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}