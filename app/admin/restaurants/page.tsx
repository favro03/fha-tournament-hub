import { auth } from '@/auth';
import DeleteDialog from '@/components/shared/delete-dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { deleteRestaurant, getRestaurants } from '@/lib/actions/restaurant.actions';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Admin Restaurants',
};

const AdminRestaurantsPage = async () => {
  const session = await auth();
  if (session?.user?.role !== 'admin') throw new Error('User is not authorized');

  const restaurants = await getRestaurants();

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h1 className='text-3xl font-bold text-white'>Restaurants</h1>
          <p className='mt-1 text-sm text-white/65'>
            Manage food and dining options for tournament visitors.
          </p>
        </div>

        <Button asChild>
          <Link href='/admin/restaurants/create'>Create Restaurant</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.isArray(restaurants) && restaurants.length > 0 ? (
            restaurants.map((restaurant) => (
              <TableRow key={restaurant.id}>
                <TableCell className='font-medium text-white'>
                  {restaurant.name}
                </TableCell>
                <TableCell>{restaurant.address}</TableCell>
                <TableCell className='max-w-[320px] whitespace-normal text-white/80'>
                  {restaurant.description}
                </TableCell>
                <TableCell className='text-right'>
                  <div className='flex justify-end gap-2'>
                    <Button asChild variant='outline' size='sm'>
                      <Link href={`/admin/restaurants/${restaurant.id}`}>Edit</Link>
                    </Button>
                    <DeleteDialog
                      id={restaurant.id.toString()}
                      action={deleteRestaurant}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className='py-8 text-center text-white/65'>
                No restaurants found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default AdminRestaurantsPage;