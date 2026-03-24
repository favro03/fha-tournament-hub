'use server';

import crypto from 'crypto';
import { z } from 'zod';

import { prisma } from '@/db/prisma';
import { requireSuperAdmin } from '@/lib/auth/guards';

const createAdminInviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.literal('ADMIN'),
});

type CreateAdminInviteInput = z.infer<typeof createAdminInviteSchema>;

type CreateAdminInviteResult =
  | {
      success: true;
      message: string;
      inviteLink: string;
    }
  | {
      success: false;
      message: string;
    };

const DEFAULT_INVITE_EXPIRATION_DAYS = 365;

export async function createAdminInvite(
  input: CreateAdminInviteInput
): Promise<CreateAdminInviteResult> {
  try {
    const session = await requireSuperAdmin();

    const userId = session?.user?.id;
    if (!userId) {
      return {
        success: false,
        message: 'Unauthorized.',
      };
    }

    const parsed = createAdminInviteSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: 'Please enter a valid email address.',
      };
    }

    const email = parsed.data.email.toLowerCase();
    const role = parsed.data.role;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username: email }],
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      return {
        success: false,
        message: 'A user with this email already exists.',
      };
    }

    const now = new Date();

    const existingInvite = await prisma.adminInvite.findUnique({
      where: { email },
      select: {
        id: true,
        usedAt: true,
        revokedAt: true,
        expiresAt: true,
      },
    });

    const hasActiveInvite =
      !!existingInvite &&
      !existingInvite.usedAt &&
      !existingInvite.revokedAt &&
      existingInvite.expiresAt.getTime() > now.getTime();

    if (hasActiveInvite) {
      return {
        success: false,
        message:
          'An active invite for this email already exists. Revoke or use that invite before creating another one.',
      };
    }

    const token = crypto.randomBytes(32).toString('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DEFAULT_INVITE_EXPIRATION_DAYS);

    if (existingInvite) {
      await prisma.adminInvite.update({
        where: { id: existingInvite.id },
        data: {
          role,
          token,
          expiresAt,
          usedAt: null,
          revokedAt: null,
          createdBy: {
            connect: {
              id: userId,
            },
          },
        },
      });
    } else {
      await prisma.adminInvite.create({
        data: {
          email,
          role,
          token,
          expiresAt,
          createdBy: {
            connect: {
              id: userId,
            },
          },
        },
      });
    }

    const inviteLink = `/accept-invite?token=${token}`;

    return {
      success: true,
      message: 'Admin invite created successfully.',
      inviteLink,
    };
  } catch (error) {
    console.error('createAdminInvite error', error);

    return {
      success: false,
      message: 'Unable to create admin invite right now.',
    };
  }
}