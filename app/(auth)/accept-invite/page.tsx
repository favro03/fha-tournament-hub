import { Metadata } from 'next';
import Link from 'next/link';

import { prisma } from '@/db/prisma';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AcceptInviteForm } from './accept-invite-form';

export const metadata: Metadata = {
  title: 'Accept Invite',
};

type AcceptInvitePageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

function InviteMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className='mx-auto w-full max-w-md'>
      <Card>
        <CardHeader className='space-y-2'>
          <CardTitle className='text-center'>{title}</CardTitle>
          <CardDescription className='text-center'>{description}</CardDescription>
        </CardHeader>
        <CardContent className='text-center'>
          <Link href='/sign-in' className='text-sm text-primary underline'>
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function AcceptInvitePage({
  searchParams,
}: AcceptInvitePageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <InviteMessage
        title='Invalid invite link'
        description='This invite link is missing a token.'
      />
    );
  }

  const invite = await prisma.adminInvite.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      role: true,
      usedAt: true,
      revokedAt: true,
    },
  });

  if (!invite) {
    return (
      <InviteMessage
        title='Invite not found'
        description='This invite link is invalid or no longer exists.'
      />
    );
  }

  if (invite.revokedAt) {
    return (
      <InviteMessage
        title='Invite revoked'
        description='This invite link has been revoked and can no longer be used.'
      />
    );
  }

  if (invite.usedAt) {
    return (
      <InviteMessage
        title='Invite already used'
        description='This invite link has already been accepted.'
      />
    );
  }

  return (
    <div className='mx-auto w-full max-w-md'>
      <Card>
        <CardHeader className='space-y-2'>
          <CardTitle className='text-center'>Accept Admin Invite</CardTitle>
          <CardDescription className='text-center'>
            Create your account to access the tournament admin area.
          </CardDescription>
        </CardHeader>

        <CardContent className='space-y-6'>
          <div className='rounded-lg border bg-muted/40 p-4 text-sm'>
            <div>
              <span className='font-medium'>Email:</span> {invite.email}
            </div>
            <div className='mt-1'>
              <span className='font-medium'>Role:</span> {invite.role}
            </div>
          </div>

          <AcceptInviteForm
            token={token}
            email={invite.email}
            role={invite.role}
          />
        </CardContent>
      </Card>
    </div>
  );
}