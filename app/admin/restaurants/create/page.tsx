import { Metadata } from 'next';
import RestaurantForm from './restaurant-form';

export const metadata: Metadata = {
  title: 'Create Restaurant',
};

const CreateRestaurantPage = () => {
  return (
    <div className='mx-auto max-w-5xl space-y-6'>
      <div>
        <h2 className='text-3xl font-bold text-white'>Create Restaurant</h2>
        <p className='mt-1 text-sm text-white/65'>
          Add a dining option to the tournament guide.
        </p>
      </div>

      <div className='rounded-xl border border-emerald-900/50 bg-[#102317] p-6'>
        <RestaurantForm type='Create' />
      </div>
    </div>
  );
};

export default CreateRestaurantPage;