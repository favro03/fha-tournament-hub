import { prisma } from '@/db/prisma';

export type SponsorPlacement = 'HOME' | 'TOURNAMENT' | 'STANDINGS';
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

async function getSponsorsByPlacement(
  placement: SponsorPlacement,
  tournamentId?: number | null
): Promise<PublicSponsor[]> {
  const sponsors = await prisma.sponsor.findMany({
    where: {
      isActive: true,
      placement,
      OR:
        typeof tournamentId === 'number'
          ? [{ scope: 'GLOBAL' }, { scope: 'TOURNAMENT', tournamentId }]
          : [{ scope: 'GLOBAL' }],
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: publicSponsorSelect,
  });

  return sponsors;
}

export async function getHomepagePublicSponsors(): Promise<PublicSponsor[]> {
  return getSponsorsByPlacement('HOME');
}

export async function getTournamentPageSponsors(
  tournamentId: number
): Promise<PublicSponsor[]> {
  return getSponsorsByPlacement('TOURNAMENT', tournamentId);
}

export async function getStandingsPageSponsors(
  tournamentId?: number | null
): Promise<PublicSponsor[]> {
  return getSponsorsByPlacement('STANDINGS', tournamentId);
}