'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { prisma } from '@/db/prisma';
import { requireSuperAdmin } from '@/lib/auth/guards';

const sponsorScopeValues = ['GLOBAL', 'TOURNAMENT'] as const;

const updateSponsorSchema = z
  .object({
    sponsorId: z.number().int().positive(),
    businessName: z.string().trim().min(1, 'Business name is required'),
    imageUrl: z.string().trim().url('Enter a valid image URL'),
    headline: z.string().trim().optional(),
    bodyText: z.string().trim().optional(),
    buttonText: z.string().trim().optional(),
    linkUrl: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || /^https?:\/\//i.test(value), {
        message: 'Link URL must start with http:// or https://',
      }),
    scope: z.enum(sponsorScopeValues),
    tournamentId: z.coerce.number().int().positive().nullable().optional(),
    isActive: z.boolean(),
    sortOrder: z.coerce.number().int().min(0, 'Sort order must be 0 or higher'),
  })
  .superRefine((value, ctx) => {
    if (value.scope === 'TOURNAMENT' && !value.tournamentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tournamentId'],
        message: 'Please select a tournament for a tournament-specific sponsor.',
      });
    }
  });

type UpdateSponsorInput = z.infer<typeof updateSponsorSchema>;

type UpdateSponsorResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: string;
    };

function emptyToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function updateSponsor(
  input: UpdateSponsorInput
): Promise<UpdateSponsorResult> {
  try {
    await requireSuperAdmin();

    const parsed = updateSponsorSchema.safeParse(input);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];

      return {
        success: false,
        message: firstIssue?.message ?? 'Please check the sponsor form fields.',
      };
    }

    const data = parsed.data;

    const existingSponsor = await prisma.sponsor.findUnique({
      where: { id: data.sponsorId },
      select: { id: true },
    });

    if (!existingSponsor) {
      return {
        success: false,
        message: 'Sponsor not found.',
      };
    }

    const tournamentId =
      data.scope === 'TOURNAMENT' ? data.tournamentId ?? null : null;

    if (tournamentId) {
      const tournament = await prisma.bracket.findUnique({
        where: { id: tournamentId },
        select: { id: true },
      });

      if (!tournament) {
        return {
          success: false,
          message: 'Selected tournament was not found.',
        };
      }
    }

    await prisma.sponsor.update({
      where: { id: data.sponsorId },
      data: {
        businessName: data.businessName,
        imageUrl: data.imageUrl,
        headline: emptyToNull(data.headline),
        bodyText: emptyToNull(data.bodyText),
        buttonText: emptyToNull(data.buttonText),
        linkUrl: emptyToNull(data.linkUrl),
        scope: data.scope,
        tournamentId,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    revalidatePath('/super-admin/sponsors');
    revalidatePath(`/super-admin/sponsors/${data.sponsorId}`);

    return {
      success: true,
      message: 'Sponsor updated successfully.',
    };
  } catch (error) {
    console.error('updateSponsor error', error);

    return {
      success: false,
      message: 'Unable to update sponsor right now.',
    };
  }
}

export async function deleteSponsor(sponsorId: number) {
  try {
    await requireSuperAdmin();

    if (!Number.isInteger(sponsorId) || sponsorId <= 0) {
      return;
    }

    const existingSponsor = await prisma.sponsor.findUnique({
      where: { id: sponsorId },
      select: { id: true },
    });

    if (!existingSponsor) {
      return;
    }

    await prisma.sponsor.delete({
      where: { id: sponsorId },
    });

    revalidatePath('/super-admin/sponsors');
  } catch (error) {
    console.error('deleteSponsor error', error);
  }

  redirect('/super-admin/sponsors');
}