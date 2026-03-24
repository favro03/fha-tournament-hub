'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@/db/prisma';
import { requireSuperAdmin } from '@/lib/auth/guards';

export async function revokeAdminInvite(inviteId: string) {
  try {
    const session = await requireSuperAdmin();

    const userId = session?.user?.id;
    if (!userId) {
      return;
    }

    const invite = await prisma.adminInvite.findUnique({
      where: { id: inviteId },
      select: {
        id: true,
        usedAt: true,
        revokedAt: true,
      },
    });

    if (!invite) {
      return;
    }

    if (invite.usedAt || invite.revokedAt) {
      return;
    }

    await prisma.adminInvite.update({
      where: { id: inviteId },
      data: {
        revokedAt: new Date(),
      },
    });

    revalidatePath('/super-admin/invites');
    revalidatePath(`/super-admin/invites/${inviteId}`);
  } catch (error) {
    console.error('revokeAdminInvite error', error);
  }
}