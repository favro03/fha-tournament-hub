import { Metadata } from 'next';
import { requireSuperAdmin } from '@/lib/auth/guards';

export const metadata: Metadata = {
  title: 'Super Admin Sponsors',
};

export default async function SuperAdminSponsorsPage() {
  await requireSuperAdmin();

  return (
    <div className='space-y-4'>
      <h1 className='text-3xl font-bold text-white'>Sponsors</h1>
      <p className='text-white/70'>
        Sponsor management will be added next after the invite flow is in place.
      </p>
    </div>
  );
}