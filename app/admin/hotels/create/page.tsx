import { Metadata } from "next";
import HotelForm from "./hotel-form";


export const metadata: Metadata = {
    title: 'Create Hotel',
}


const CreateHotelPage = () => {
    return ( 
        <>
        <h2 className="h2-bold">Create Hotel</h2>
        <div className="my-8">
        <HotelForm type='Create'/>
        </div>
        </>
     );
}
 
export default CreateHotelPage;