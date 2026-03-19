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
        <p className='mt-1 text-sm text-white/70'>
          Add a hotel option for tournament families and visitors.
        </p>
      </div>

      <div className='rounded-2xl border border-emerald-900/40 bg-[#143625] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.18)]'>
        <HotelForm type='Create' />
      </div>
    </div>
  );
};

export default CreateHotelPage;