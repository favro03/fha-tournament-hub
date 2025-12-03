import HotelForm from "../create/hotel-form";
import { getHotelById } from "@/lib/actions/hotel.actions";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
    title: 'Update Hotel'
}

const AdminHotelUpdatePage = async (props: {
    params: Promise <{
        id: string
    }>
}) => {

    const {id} = await props.params;

    const hotel = await getHotelById(id);

    if(!hotel) return notFound();
    return ( 
        <div className="space-y-8 max-w-5xl mx-auto">
        <h1 className="h2-bold">Update Hotel</h1>

        <HotelForm type="Update" hotel={hotel} hotelId={hotel.id.toString()}/>
        </div>
     );
}
 
export default AdminHotelUpdatePage;