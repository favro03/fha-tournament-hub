import { auth } from "@/auth";
import DeleteDialog from "@/components/shared/delete-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteBracket, getBrackets } from "@/lib/actions/brackets.actions";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: 'Admin Brackets',
}

const AdminBracketsPage = async () => {
    const session = await auth();
    if(session?.user?.role !== 'admin') throw new Error('User is not authorized');
    const brackets = await getBrackets();

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <h1 className="h2-bold">Brackets</h1>
                <Button asChild variant='default'>
                    <Link href='/admin/brackets/create'>Create Bracket</Link>
                </Button>
            </div>
            
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Division</TableHead>
                            <TableHead>Date</TableHead>
                           
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.isArray(brackets) && brackets.length > 0 ? (
                            brackets.map((bracket) => (
                                <TableRow key={bracket.id}>
                                    <TableCell>{bracket.name}</TableCell>
                                    <TableCell>{bracket.youthLevel}</TableCell>
                                    <TableCell>{bracket.date}</TableCell>
                                    
                                    <TableCell>
                                        <Button asChild variant='outline' size='sm'>
                                            <Link href={`/admin/brackets/${bracket.id}`}>Edit</Link>
                                        </Button>
                                        <DeleteDialog id={bracket.id.toString()} action={deleteBracket} />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center">No brackets found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

export default AdminBracketsPage;