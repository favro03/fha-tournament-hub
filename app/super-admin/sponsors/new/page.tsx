import { Metadata } from 'next';

import { prisma } from '@/db/prisma';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { SponsorForm } from './sponsor-form';

export const metadata: Metadata = {
  title: 'Create Sponsor',
};

export default async function CreateSponsorPage() {
  await requireSuperAdmin();

  const tournaments = await prisma.bracket.findMany({
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      name: true,
      youthLevel: true,
      date: true,
    },
  });

  return (
    <div className='mx-auto max-w-3xl space-y-6'>
      <div>
        <h1 className='text-3xl font-bold text-white'>Create Sponsor</h1>
        <p className='mt-1 text-sm text-white/65'>
          Add a sponsor record and choose whether it appears site-wide or only
          for one tournament.
        </p>
      </div>

      <div className='rounded-2xl border border-emerald-900/40 bg-[#143625] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.18)]'>
        <SponsorForm tournaments={tournaments} />
      </div>
    </div>
  );
}