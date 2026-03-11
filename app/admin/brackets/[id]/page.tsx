import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBracketById } from '@/lib/actions/brackets.actions';
import BracketFormClient from './bracket-form-client';

export const metadata: Metadata = {
  title: 'Update Bracket',
};

const AdminBracketUpdatePage = async (props: {
  params: Promise<{
    id: string;
  }>;
}) => {
  const { id } = await props.params;

  const bracket = await getBracketById(id);

  if (!bracket) return notFound();

  return (
    <div className='mx-auto max-w-6xl space-y-6'>
      <div>
        <h1 className='text-3xl font-bold text-white'>Update Bracket</h1>
        <p className='mt-1 text-sm text-white/65'>
          Edit bracket details, upload mode, or build configuration.
        </p>
      </div>

      <div className='rounded-xl border border-emerald-900/50 bg-[#102317] p-6'>
        <BracketFormClient
          mode='update'
          initial={{
            id: bracket.id,
            name: bracket.name,
            youthLevel: bracket.youthLevel,
            date: bracket.date,
            image: bracket.image,
            tournamentFormat: bracket.tournamentFormat,
          }}
        />
      </div>
    </div>
  );
};

export default AdminBracketUpdatePage;