import { Metadata } from 'next';
import BracketForm from './bracket-form';

export const metadata: Metadata = {
  title: 'Create Bracket',
};

const CreateBracketPage = () => {
  return (
    <div className='mx-auto max-w-6xl space-y-6'>
      <div>
        <h2 className='text-3xl font-bold text-white'>Create Bracket</h2>
        <p className='mt-1 text-sm text-white/65'>
          Set up a new tournament bracket, upload an image, or generate a schedule.
        </p>
      </div>

      <div className='rounded-xl border border-emerald-900/50 bg-[#102317] p-6'>
        <BracketForm mode='create' />
      </div>
    </div>
  );
};

export default CreateBracketPage;