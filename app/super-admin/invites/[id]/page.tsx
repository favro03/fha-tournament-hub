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

import { InviteDetailActions } from './invite-detail-actions';

export const metadata: Metadata = {
  title: 'Invite Details',
};

type InviteDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTime(value: Date | null) {
  if (!value) return '—';

  return value.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getInviteStatus(
  invite: {
    usedAt: Date | null;
    revokedAt: Date | null;
    expiresAt: Date;
  },
  nowMs: number
) {
  if (invite.usedAt) return 'Accepted';
  if (invite.revokedAt) return 'Revoked';
  if (invite.expiresAt.getTime() <= nowMs) return 'Expired';
  return 'Pending';
}

export default async function SuperAdminInviteDetailPage({
  params,
}: InviteDetailPageProps) {
  await requireSuperAdmin();

  const { id } = await params;

  const invite = await prisma.adminInvite.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });

  if (!invite) {
    notFound();
  }

  const dbNowResult = await prisma.$queryRaw<Array<{ now: Date }>>`
    SELECT CURRENT_TIMESTAMP as now
  `;

  const nowMs = new Date(dbNowResult[0].now).getTime();

  const status = getInviteStatus(invite, nowMs);
  const isActiveInvite =
    !invite.usedAt &&
    !invite.revokedAt &&
    invite.expiresAt.getTime() > nowMs;

  const inviteLink = isActiveInvite
    ? `/accept-invite?token=${invite.token}`
    : null;

  function getStatusClasses(status: string) {
    switch (status) {
      case 'Accepted':
        return 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300';
      case 'Revoked':
        return 'border border-red-500/30 bg-red-500/15 text-red-300';
      case 'Expired':
        return 'border border-amber-500/30 bg-amber-500/15 text-amber-300';
      default:
        return 'border border-sky-500/30 bg-sky-500/15 text-sky-300';
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h1 className='text-3xl font-bold text-white'>Invite Details</h1>
          <p className='mt-1 text-sm text-white/65'>
            Review invite status and manage the current invite link.
          </p>
        </div>

        <Button asChild variant='outline'>
          <Link href='/super-admin/invites'>Back to Invites</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-3'>
            <span>{invite.email}</span>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                status
              )}`}
            >
              {status}
            </span>
          </CardTitle>
          <CardDescription>Invite record for admin access.</CardDescription>
        </CardHeader>

        <CardContent className='space-y-6'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='rounded-lg border border-white/10 bg-black/15 p-4'>
              <div className='text-xs uppercase tracking-wide text-white/50'>
                Email
              </div>
              <div className='mt-1 text-sm text-white'>{invite.email}</div>
            </div>

            <div className='rounded-lg border border-white/10 bg-black/15 p-4'>
              <div className='text-xs uppercase tracking-wide text-white/50'>
                Role
              </div>
              <div className='mt-1 text-sm text-white'>{invite.role}</div>
            </div>

            <div className='rounded-lg border border-white/10 bg-black/15 p-4'>
              <div className='text-xs uppercase tracking-wide text-white/50'>
                Created
              </div>
              <div className='mt-1 text-sm text-white'>
                {formatDateTime(invite.createdAt)}
              </div>
            </div>

            <div className='rounded-lg border border-white/10 bg-black/15 p-4'>
              <div className='text-xs uppercase tracking-wide text-white/50'>
                Expires
              </div>
              <div className='mt-1 text-sm text-white'>
                {formatDateTime(invite.expiresAt)}
              </div>
            </div>

            <div className='rounded-lg border border-white/10 bg-black/15 p-4'>
              <div className='text-xs uppercase tracking-wide text-white/50'>
                Accepted At
              </div>
              <div className='mt-1 text-sm text-white'>
                {formatDateTime(invite.usedAt)}
              </div>
            </div>

            <div className='rounded-lg border border-white/10 bg-black/15 p-4'>
              <div className='text-xs uppercase tracking-wide text-white/50'>
                Revoked At
              </div>
              <div className='mt-1 text-sm text-white'>
                {formatDateTime(invite.revokedAt)}
              </div>
            </div>

            <div className='rounded-lg border border-white/10 bg-black/15 p-4 md:col-span-2'>
              <div className='text-xs uppercase tracking-wide text-white/50'>
                Created By
              </div>
              <div className='mt-1 text-sm text-white'>
                {invite.createdBy.username}
                {invite.createdBy.email ? ` (${invite.createdBy.email})` : ''}
              </div>
            </div>
          </div>

          <InviteDetailActions
            inviteId={invite.id}
            inviteLink={inviteLink}
            canRevoke={isActiveInvite}
            expiresAt={formatDateTime(invite.expiresAt)}
          />
        </CardContent>
      </Card>
    </div>
  );
}