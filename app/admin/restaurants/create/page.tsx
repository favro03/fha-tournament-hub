import { Metadata } from "next";
import RestaurantForm from "./restaurant-form";


export const metadata: Metadata = {
    title: 'Create Restaurant',
}


const CreateRestaurantPage = () => {
    return ( 
        <>
        <h2 className="h2-bold">Create Restaurant</h2>
        <div className="my-8">
        <RestaurantForm type='Create'/>
        </div>
        </>
     );
}
 
export default CreateRestaurantPage;