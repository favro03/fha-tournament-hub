'use server';

import { hashSync } from 'bcrypt-ts-edge';
import { z } from 'zod';
import { redirect } from 'next/navigation';

import { prisma } from '@/db/prisma';

const acceptAdminInviteSchema = z
  .object({
    token: z.string().min(1),
    username: z.string().trim().min(3).max(30),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type AcceptAdminInviteInput = z.infer<typeof acceptAdminInviteSchema>;

type AcceptAdminInviteResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: string;
    };

export async function acceptAdminInvite(
  input: AcceptAdminInviteInput
): Promise<AcceptAdminInviteResult> {
  try {
    const parsed = acceptAdminInviteSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: 'Please complete all fields correctly.',
      };
    }

    const token = parsed.data.token;
    const username = parsed.data.username.trim();
    const password = parsed.data.password;

    const invite = await prisma.adminInvite.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
      },
    });

    if (!invite) {
      return {
        success: false,
        message: 'Invite not found.',
      };
    }

    if (invite.revokedAt) {
      return {
        success: false,
        message: 'This invite has been revoked.',
      };
    }

    if (invite.usedAt) {
      return {
        success: false,
        message: 'This invite has already been used.',
      };
    }

    if (invite.expiresAt < new Date()) {
      return {
        success: false,
        message: 'This invite has expired.',
      };
    }

    const existingUsername = await prisma.user.findFirst({
      where: { username },
      select: { id: true },
    });

    if (existingUsername) {
      return {
        success: false,
        message: 'That username is already taken.',
      };
    }

    const existingEmail = await prisma.user.findFirst({
      where: { email: invite.email },
      select: { id: true },
    });

    if (existingEmail) {
      return {
        success: false,
        message: 'A user with this email already exists.',
      };
    }

    const hashedPassword = hashSync(password, 10);

    await prisma.user.create({
      data: {
        username,
        email: invite.email,
        password: hashedPassword,
        role: invite.role,
        isActive: true,
      },
    });

    await prisma.adminInvite.update({
      where: { id: invite.id },
      data: {
        usedAt: new Date(),
      },
    });

    redirect('/sign-in');
    } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof error.digest === 'string' &&
      error.digest.startsWith('NEXT_REDIRECT')
    ) {
      throw error;
    }

    console.error('acceptAdminInvite error', error);

    return {
      success: false,
      message: 'Unable to accept invite right now.',
    };
  }
}