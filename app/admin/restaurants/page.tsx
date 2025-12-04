import { auth } from "@/auth";
import DeleteDialog from "@/components/shared/delete-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteRestaurant, getRestaurants } from "@/lib/actions/restaurant.actions";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: 'Admin Restaurants',
}

const AdminRestaurantsPage = async () => {
    const session = await auth();
    if(session?.user?.role !== 'admin') throw new Error('User is not authorized');
    const restaurants = await getRestaurants();

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <h1 className="h2-bold">Restaurants</h1>
                <Button asChild variant='default'>
                    <Link href='/admin/restaurants/create'>Create Restaurant</Link>
                </Button>
            </div>
            
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>Description</TableHead>
                           
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.isArray(restaurants) && restaurants.length > 0 ? (
                            restaurants.map((restaurant) => (
                                <TableRow key={restaurant.id}>
                                    <TableCell>{restaurant.name}</TableCell>
                                    <TableCell>{restaurant.address}</TableCell>
                                    <TableCell>{restaurant.description}</TableCell>
                                    
                                    <TableCell>
                                        <Button asChild variant='outline' size='sm'>
                                            <Link href={`/admin/restaurants/${restaurant.id}`}>Edit</Link>
                                        </Button>
                                        <DeleteDialog id={restaurant.id.toString()} action={deleteRestaurant} />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center">No restaurants found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

export default AdminRestaurantsPage;