import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { prisma } from '@/db/prisma';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { SponsorEditForm } from './sponsor-edit-form';

export const metadata: Metadata = {
  title: 'Sponsor Details',
};

type SponsorDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTime(value: Date) {
  return value.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusClasses(isActive: boolean) {
  return isActive
    ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
    : 'border border-red-500/30 bg-red-500/15 text-red-300';
}

function getScopeSummary(
  scope: 'GLOBAL' | 'TOURNAMENT',
  tournamentName: string | null
) {
  if (scope === 'GLOBAL') {
    return 'Global';
  }

  return tournamentName ? `Tournament • ${tournamentName}` : 'Tournament';
}

export default async function SponsorDetailPage({
  params,
}: SponsorDetailPageProps) {
  await requireSuperAdmin();

  const { id } = await params;
  const sponsorId = Number(id);

  if (!Number.isInteger(sponsorId) || sponsorId <= 0) {
    notFound();
  }

  const [sponsor, tournaments] = await Promise.all([
    prisma.sponsor.findUnique({
      where: { id: sponsorId },
      select: {
        id: true,
        businessName: true,
        imageUrl: true,
        headline: true,
        bodyText: true,
        buttonText: true,
        linkUrl: true,
        placement: true,
        scope: true,
        isActive: true,
        sortOrder: true,
        tournamentId: true,
        createdAt: true,
        updatedAt: true,
        tournament: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.bracket.findMany({
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        name: true,
        youthLevel: true,
        date: true,
      },
    }),
  ]);

  if (!sponsor) {
    notFound();
  }

  return (
    <div className='mx-auto max-w-4xl space-y-6'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h1 className='text-3xl font-bold text-white'>{sponsor.businessName}</h1>
          <p className='mt-1 text-sm text-white/65'>
            Review and update this sponsor record.
          </p>
        </div>

        <Button variant='outline' asChild>
          <Link href='/super-admin/sponsors'>Back to Sponsors</Link>
        </Button>
      </div>

      <Card className='border-white/10 bg-[#143625] text-white'>
        <CardHeader>
          <CardTitle>Sponsor Details</CardTitle>
          <CardDescription className='text-white/65'>
            This sponsor can be configured as either a site-wide sponsor or a
            tournament-specific sponsor.
          </CardDescription>
        </CardHeader>

        <CardContent className='space-y-6'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='rounded-lg border border-white/10 bg-black/15 p-4'>
              <div className='text-xs uppercase tracking-wide text-white/50'>
                Status
              </div>
              <div className='mt-2'>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                    sponsor.isActive
                  )}`}
                >
                  {sponsor.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className='rounded-lg border border-white/10 bg-black/15 p-4'>
              <div className='text-xs uppercase tracking-wide text-white/50'>
                Placement
              </div>
              <div className='mt-1 text-sm text-white'>{sponsor.placement}</div>
            </div>

            <div className='rounded-lg border border-white/10 bg-black/15 p-4'>
              <div className='text-xs uppercase tracking-wide text-white/50'>
                Scope
              </div>
              <div className='mt-1 text-sm text-white'>
                {getScopeSummary(sponsor.scope, sponsor.tournament?.name ?? null)}
              </div>
            </div>

            <div className='rounded-lg border border-white/10 bg-black/15 p-4'>
              <div className='text-xs uppercase tracking-wide text-white/50'>
                Sort Order
              </div>
              <div className='mt-1 text-sm text-white'>{sponsor.sortOrder}</div>
            </div>

            <div className='rounded-lg border border-white/10 bg-black/15 p-4'>
              <div className='text-xs uppercase tracking-wide text-white/50'>
                Created
              </div>
              <div className='mt-1 text-sm text-white'>
                {formatDateTime(sponsor.createdAt)}
              </div>
            </div>

            <div className='rounded-lg border border-white/10 bg-black/15 p-4'>
              <div className='text-xs uppercase tracking-wide text-white/50'>
                Updated
              </div>
              <div className='mt-1 text-sm text-white'>
                {formatDateTime(sponsor.updatedAt)}
              </div>
            </div>
          </div>

          <SponsorEditForm
            sponsor={{
              id: sponsor.id,
              businessName: sponsor.businessName,
              imageUrl: sponsor.imageUrl,
              headline: sponsor.headline,
              bodyText: sponsor.bodyText,
              buttonText: sponsor.buttonText,
              linkUrl: sponsor.linkUrl,
              scope: sponsor.scope,
              tournamentId: sponsor.tournamentId,
              isActive: sponsor.isActive,
              sortOrder: sponsor.sortOrder,
            }}
            tournaments={tournaments}
          />
        </CardContent>
      </Card>
    </div>
  );
}