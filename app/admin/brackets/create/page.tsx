import { Metadata } from "next";
import BracketForm from "./bracket-form";



export const metadata: Metadata = {
    title: 'Create Bracket',
}


const CreateBracketPage = () => {
    return ( 
        <>
        <h2 className="h2-bold">Create Bracket</h2>
        <div className="my-8">
        <BracketForm type='Create'/>
        </div>
        </>
     );
}
 
export default CreateBracketPage;