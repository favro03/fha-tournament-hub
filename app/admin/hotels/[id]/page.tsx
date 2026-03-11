import HotelForm from '../create/hotel-form';
import { getHotelById } from '@/lib/actions/hotel.actions';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Update Hotel',
};

const AdminHotelUpdatePage = async (props: {
  params: Promise<{
    id: string;
  }>;
}) => {
  const { id } = await props.params;

  const hotel = await getHotelById(id);

  if (!hotel) return notFound();

  return (
    <div className='mx-auto max-w-5xl space-y-6'>
      <div>
        <h1 className='text-3xl font-bold text-white'>Update Hotel</h1>
        <p className='mt-1 text-sm text-white/65'>
          Edit hotel details, contact info, and listing content.
        </p>
      </div>

      <div className='rounded-xl border border-emerald-900/50 bg-[#102317] p-6'>
        <HotelForm type='Update' hotel={hotel} hotelId={hotel.id.toString()} />
      </div>
    </div>
  );
};

export default AdminHotelUpdatePage;