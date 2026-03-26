import { prisma } from '@/db/prisma';

export type SponsorPlacement = 'HEADER' | 'SCHEDULE' | 'STANDINGS' | 'BRACKET';
export type SponsorScope = 'GLOBAL' | 'TOURNAMENT';

export type PublicSponsor = {
  id: number;
  businessName: string;
  imageUrl: string;
  headline: string | null;
  bodyText: string | null;
  buttonText: string | null;
  linkUrl: string | null;
  placement: SponsorPlacement;
  scope: SponsorScope;
  tournamentId: number | null;
  isActive: boolean;
  sortOrder: number;
};

const publicSponsorSelect = {
  id: true,
  businessName: true,
  imageUrl: true,
  headline: true,
  bodyText: true,
  buttonText: true,
  linkUrl: true,
  placement: true,
  scope: true,
  tournamentId: true,
  isActive: true,
  sortOrder: true,
} as const;

type SponsorQueryOptions = {
  placement?: SponsorPlacement;
};

export async function getGlobalPublicSponsors(
  options: SponsorQueryOptions = {}
): Promise<PublicSponsor[]> {
  const sponsors = await prisma.sponsor.findMany({
    where: {
      isActive: true,
      scope: 'GLOBAL',
      ...(options.placement ? { placement: options.placement } : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: publicSponsorSelect,
  });

  return sponsors;
}

export async function getPublicSponsorsForTournament(
  tournamentId: number,
  options: SponsorQueryOptions = {}
): Promise<PublicSponsor[]> {
  const sponsors = await prisma.sponsor.findMany({
    where: {
      isActive: true,
      ...(options.placement ? { placement: options.placement } : {}),
      OR: [
        { scope: 'GLOBAL' },
        {
          scope: 'TOURNAMENT',
          tournamentId,
        },
      ],
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: publicSponsorSelect,
  });

  return sponsors;
}