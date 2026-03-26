'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@/db/prisma';
import { requireSuperAdmin } from '@/lib/auth/guards';

const sponsorScopeValues = ['GLOBAL', 'TOURNAMENT'] as const;
const sponsorPlacementValues = [
  'HEADER',
  'SCHEDULE',
  'STANDINGS',
  'BRACKET',
] as const;

const createSponsorSchema = z
  .object({
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
    placement: z.enum(sponsorPlacementValues),
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

type CreateSponsorInput = z.infer<typeof createSponsorSchema>;

type CreateSponsorResult =
  | {
      success: true;
      message: string;
      sponsorId: number;
    }
  | {
      success: false;
      message: string;
    };

function emptyToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function createSponsor(
  input: CreateSponsorInput
): Promise<CreateSponsorResult> {
  try {
    await requireSuperAdmin();

    const parsed = createSponsorSchema.safeParse(input);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];

      return {
        success: false,
        message: firstIssue?.message ?? 'Please check the sponsor form fields.',
      };
    }

    const data = parsed.data;
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

    const sponsor = await prisma.sponsor.create({
      data: {
        businessName: data.businessName,
        imageUrl: data.imageUrl,
        headline: emptyToNull(data.headline),
        bodyText: emptyToNull(data.bodyText),
        buttonText: emptyToNull(data.buttonText),
        linkUrl: emptyToNull(data.linkUrl),
        placement: data.placement,
        scope: data.scope,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        tournamentId,
      },
      select: {
        id: true,
      },
    });

    revalidatePath('/super-admin/sponsors');
    revalidatePath('/');
    revalidatePath('/brackets');

    return {
      success: true,
      message: 'Sponsor created successfully.',
      sponsorId: sponsor.id,
    };
  } catch (error) {
    console.error('createSponsor error', error);

    return {
      success: false,
      message: 'Unable to create sponsor right now.',
    };
  }
}