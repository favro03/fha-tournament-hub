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
  placement: 'HOME' | 'TOURNAMENT' | 'STANDINGS'
) {
  switch (placement) {
    case 'HOME':
      return 'border border-sky-500/30 bg-sky-500/15 text-sky-300';
    case 'TOURNAMENT':
      return 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300';
    case 'STANDINGS':
      return 'border border-violet-500/30 bg-violet-500/15 text-violet-300';
    default:
      return 'border border-white/15 bg-white/10 text-white';
  }
}

function getPlacementLabel(
  placement: 'HOME' | 'TOURNAMENT' | 'STANDINGS'
) {
  switch (placement) {
    case 'HOME':
      return 'Homepage';
    case 'TOURNAMENT':
      return 'Tournament Page';
    case 'STANDINGS':
      return 'Standings Page';
    default:
      return placement;
  }
}

function getStatusClasses(isActive: boolean) {
  return isActive
    ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
    : 'border border-red-500/30 bg-red-500/15 text-red-300';
}

function getScopeClasses(scope: 'GLOBAL' | 'TOURNAMENT') {
  return scope === 'GLOBAL'
    ? 'border border-cyan-500/30 bg-cyan-500/15 text-cyan-300'
    : 'border border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-300';
}

export default async function SuperAdminSponsorsPage() {
  await requireSuperAdmin();

  const sponsors = await prisma.sponsor.findMany({
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      businessName: true,
      placement: true,
      scope: true,
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
            Manage homepage, tournament page, and standings page sponsor records.
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
            <TableHead>Page</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sort Order</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sponsors.length > 0 ? (
            sponsors.map((sponsor) => {
              const scopeLabel =
                sponsor.scope === 'GLOBAL'
                  ? 'Global'
                  : sponsor.tournament?.name ?? 'Tournament not found';

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
                      {getPlacementLabel(sponsor.placement)}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getScopeClasses(
                          sponsor.scope
                        )}`}
                      >
                        {sponsor.scope === 'GLOBAL' ? 'Global' : 'Tournament'}
                      </span>
                      <span className='text-sm text-white/85'>{scopeLabel}</span>
                    </div>
                  </TableCell>

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