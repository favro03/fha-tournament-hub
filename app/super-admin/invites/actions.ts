'use server';

import { prisma } from '@/db/prisma';
import { requireSuperAdmin } from '@/lib/auth/guards';

export async function revokeAdminInvite(inviteId: string) {
  try {
    await requireSuperAdmin();

    const invite = await prisma.adminInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      return {
        success: false,
        message: 'Invite not found.',
      };
    }

    if (invite.usedAt) {
      return {
        success: false,
        message: 'Cannot revoke an invite that has already been used.',
      };
    }

    if (invite.revokedAt) {
      return {
        success: false,
        message: 'Invite is already revoked.',
      };
    }

    await prisma.adminInvite.update({
      where: { id: inviteId },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Invite revoked successfully.',
    };
  } catch (error) {
    console.error('revokeAdminInvite error', error);

    return {
      success: false,
      message: 'Unable to revoke invite.',
    };
  }
}