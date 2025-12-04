import RestaurantForm from "../create/restaurant-form";
import { getRestaurantById } from "@/lib/actions/restaurant.actions";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
    title: 'Update Restaurant'
}

const AdminRestaurantUpdatePage = async (props: {
    params: Promise <{
        id: string
    }>
}) => {

    const {id} = await props.params;

    const restaurant = await getRestaurantById(id);

    if(!restaurant) return notFound();
    return ( 
        <div className="space-y-8 max-w-5xl mx-auto">
        <h1 className="h2-bold">Update Restaurant</h1>

        <RestaurantForm type="Update" restaurant={restaurant} restaurantId={restaurant.id.toString()}/>
        </div>
     );
}
 
export default AdminRestaurantUpdatePage;