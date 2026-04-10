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
  title: 'Super Admin Invites',
};

function formatDate(value: Date) {
  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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

function getStatusClasses(status: string) {
  switch (status) {
    case 'Accepted':
      return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    case 'Revoked':
      return 'bg-red-500/15 text-red-300 border border-red-500/30';
    case 'Expired':
      return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    default:
      return 'bg-sky-500/15 text-sky-300 border border-sky-500/30';
  }
}

export default async function SuperAdminInvitesPage() {
  await requireSuperAdmin();

  const [invites, dbNowResult] = await Promise.all([
    prisma.adminInvite.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        createdBy: {
          select: {
            username: true,
          },
        },
      },
    }),
    prisma.$queryRaw<Array<{ now: Date }>>`
      SELECT CURRENT_TIMESTAMP as now
    `,
  ]);

  const nowMs = new Date(dbNowResult[0].now).getTime();

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h1 className='text-3xl font-bold text-white'>Admin Invites</h1>
          <p className='mt-1 text-sm text-white/65'>
            Create and track invite-only access for association admins.
          </p>
        </div>

        <Button asChild>
          <Link href='/super-admin/invites/new'>Create Invite</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Created By</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {invites.length > 0 ? (
            invites.map((invite) => {
              const status = getInviteStatus(invite, nowMs);

              return (
                <TableRow key={invite.id}>
                  <TableCell className='font-medium text-white'>
                    <Link
                      href={`/super-admin/invites/${invite.id}`}
                      className='transition-colors hover:text-emerald-300 hover:underline'
                    >
                      {invite.email}
                    </Link>
                  </TableCell>
                  <TableCell>{invite.role}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                        status
                      )}`}
                    >
                      {status}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(invite.createdAt)}</TableCell>
                  <TableCell>{formatDate(invite.expiresAt)}</TableCell>
                  <TableCell>{invite.createdBy.username}</TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={6} className='py-8 text-center text-white/65'>
                No invites created yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}