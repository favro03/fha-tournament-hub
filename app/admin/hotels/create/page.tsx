import { Metadata } from 'next';
import HotelForm from './hotel-form';

export const metadata: Metadata = {
  title: 'Create Hotel',
};

const CreateHotelPage = () => {
  return (
    <div className='mx-auto max-w-5xl space-y-6'>
      <div>
        <h2 className='text-3xl font-bold text-white'>Create Hotel</h2>
        <p className='mt-1 text-sm text-white/65'>
          Add a hotel option for tournament families and visitors.
        </p>
      </div>

      <div className='rounded-xl border border-emerald-900/50 bg-[#102317] p-6'>
        <HotelForm type='Create' />
      </div>
    </div>
  );
};

export default CreateHotelPage;