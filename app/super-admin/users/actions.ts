'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@/db/prisma';
import { requireSuperAdmin } from '@/lib/auth/guards';

export async function setUserActiveStatus(userId: string, isActive: boolean) {
  try {
    const session = await requireSuperAdmin();
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!targetUser) {
      return;
    }

    if (targetUser.role === 'SUPER_ADMIN') {
      return;
    }

    if (targetUser.id === currentUserId) {
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive,
      },
    });

    revalidatePath('/super-admin/users');
  } catch (error) {
    console.error('setUserActiveStatus error', error);
  }
}