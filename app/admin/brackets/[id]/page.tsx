import BracketForm from "../create/bracket-form";
import { getBracketById } from "@/lib/actions/brackets.actions";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
    title: 'Update Bracket'
}

const AdminBracketUpdatePage = async (props: {
    params: Promise <{
        id: string
    }>
}) => {

    const {id} = await props.params;

    const bracket = await getBracketById(id);

    if(!bracket) return notFound();
    return ( 
        <div className="space-y-8 max-w-5xl mx-auto">
        <h1 className="h2-bold">Update Bracket</h1>

        <BracketForm type="Update" bracket={bracket} bracketId={bracket.id.toString()}/>
        </div>
     );
}
 
export default AdminBracketUpdatePage;