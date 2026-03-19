import RestaurantForm from '../create/restaurant-form';
import { getRestaurantById } from '@/lib/actions/restaurant.actions';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Update Restaurant',
};

const AdminRestaurantUpdatePage = async (props: {
  params: Promise<{
    id: string;
  }>;
}) => {
  const { id } = await props.params;

  const restaurant = await getRestaurantById(id);

  if (!restaurant) return notFound();

  return (
    <div className='mx-auto max-w-5xl space-y-6'>
      <div>
        <h1 className='text-3xl font-bold text-white'>Update Restaurant</h1>
        <p className='mt-1 text-sm text-white/65'>
          Edit restaurant details, links, and tournament listing content.
        </p>
      </div>

      <div className='rounded-xl border border-emerald-900/50 bg-[#102317] p-6'>
        <RestaurantForm
          type='Update'
          restaurant={restaurant}
          restaurantId={restaurant.id.toString()}
        />
      </div>
    </div>
  );
};

export default AdminRestaurantUpdatePage;