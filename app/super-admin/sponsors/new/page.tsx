import { Metadata } from 'next';

import { requireSuperAdmin } from '@/lib/auth/guards';
import { SponsorForm } from './sponsor-form';

export const metadata: Metadata = {
  title: 'Create Sponsor',
};

export default async function CreateSponsorPage() {
  await requireSuperAdmin();

  return (
    <div className='mx-auto max-w-3xl space-y-6'>
      <div>
        <h1 className='text-3xl font-bold text-white'>Create Sponsor</h1>
        <p className='mt-1 text-sm text-white/65'>
          Add a new global sponsor record. Image upload and tournament-specific
          assignment will come in the next phases.
        </p>
      </div>

      <div className='rounded-2xl border border-emerald-900/40 bg-[#143625] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.18)]'>
        <SponsorForm />
      </div>
    </div>
  );
}