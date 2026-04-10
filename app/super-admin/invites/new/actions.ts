'use server';

import crypto from 'crypto';
import { z } from 'zod';

import { prisma } from '@/db/prisma';
import { requireSuperAdmin } from '@/lib/auth/guards';

const expirationWindowSchema = z.enum([
  '7_DAYS',
  '30_DAYS',
  '90_DAYS',
  '365_DAYS',
  'CUSTOM',
]);

const createAdminInviteSchema = z
  .object({
    email: z.string().trim().email(),
    role: z.literal('ADMIN'),
    expirationWindow: expirationWindowSchema,
    customExpiresAt: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.expirationWindow !== 'CUSTOM') return;

    if (!value.customExpiresAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customExpiresAt'],
        message: 'Select an expiration date.',
      });
      return;
    }

    const parsedDate = new Date(value.customExpiresAt);
    if (Number.isNaN(parsedDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customExpiresAt'],
        message: 'Select a valid expiration date.',
      });
      return;
    }

    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    if (endOfDay <= new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customExpiresAt'],
        message: 'Expiration date must be in the future.',
      });
    }
  });

type CreateAdminInviteInput = z.infer<typeof createAdminInviteSchema>;

type CreateAdminInviteResult =
  | {
      success: true;
      message: string;
      inviteLink: string;
      expiresAtLabel: string;
    }
  | {
      success: false;
      message: string;
    };

function resolveExpirationDate(input: CreateAdminInviteInput) {
  const now = new Date();

  switch (input.expirationWindow) {
    case '7_DAYS': {
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 7);
      return expiresAt;
    }
    case '30_DAYS': {
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 30);
      return expiresAt;
    }
    case '90_DAYS': {
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 90);
      return expiresAt;
    }
    case '365_DAYS': {
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 365);
      return expiresAt;
    }
    case 'CUSTOM': {
      const expiresAt = new Date(input.customExpiresAt as string);
      expiresAt.setHours(23, 59, 59, 999);
      return expiresAt;
    }
  }
}

function formatExpiresAtLabel(value: Date) {
  return value.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

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
      const firstIssue = parsed.error.issues[0];

      return {
        success: false,
        message:
          firstIssue?.message ?? 'Please review the invite form and try again.',
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
    const expiresAt = resolveExpirationDate(parsed.data);

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
      expiresAtLabel: formatExpiresAtLabel(expiresAt),
    };
  } catch (error) {
    console.error('createAdminInvite error', error);

    return {
      success: false,
      message: 'Unable to create admin invite right now.',
    };
  }
}