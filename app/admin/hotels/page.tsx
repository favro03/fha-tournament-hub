import { auth } from "@/auth";
import DeleteDialog from "@/components/shared/delete-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteHotel, getHotels } from "@/lib/actions/hotel.actions";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: 'Admin Hotels',
}

const AdminHotelsPage = async () => {
    const session = await auth();
    if(session?.user?.role !== 'admin') throw new Error('User is not authorized');
    const hotels = await getHotels();

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <h1 className="h2-bold">Hotels</h1>
                <Button asChild variant='default'>
                    <Link href='/admin/hotels/create'>Create Hotel</Link>
                </Button>
            </div>
            
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>Phone</TableHead>
                           
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.isArray(hotels) && hotels.length > 0 ? (
                            hotels.map((hotel) => (
                                <TableRow key={hotel.id}>
                                    <TableCell>{hotel.name}</TableCell>
                                    <TableCell>{hotel.address}</TableCell>
                                    <TableCell>{hotel.phone}</TableCell>
                                    
                                    <TableCell>
                                        <Button asChild variant='outline' size='sm'>
                                            <Link href={`/admin/hotels/${hotel.id}`}>Edit</Link>
                                        </Button>
                                        <DeleteDialog id={hotel.id.toString()} action={deleteHotel} />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center">No hotels found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

export default AdminHotelsPage;