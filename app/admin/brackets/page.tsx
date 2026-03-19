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
import { deleteBracket, getBrackets } from '@/lib/actions/brackets.actions';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Admin Brackets',
};

const AdminBracketsPage = async () => {
  const session = await auth();
  if (session?.user?.role !== 'admin') throw new Error('User is not authorized');

  const brackets = await getBrackets();

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h1 className='text-3xl font-bold text-white'>Brackets</h1>
          <p className='mt-1 text-sm text-white/65'>
            Create, edit, and schedule tournament brackets.
          </p>
        </div>

        <Button asChild>
          <Link href='/admin/brackets/create'>Create Bracket</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Division</TableHead>
            <TableHead>Date</TableHead>
            <TableHead >Home/Away</TableHead>
            <TableHead className='text-right'>Actions</TableHead>
       
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.isArray(brackets) && brackets.length > 0 ? (
            brackets.map((bracket) => (
              <TableRow key={bracket.id}>
                <TableCell className='font-medium text-white'>{bracket.name}</TableCell>
                <TableCell>{bracket.youthLevel}</TableCell>
                <TableCell>{bracket.date}</TableCell>
                  <TableCell>{bracket.side}</TableCell>
                <TableCell className='text-right'>
                  <div className='flex justify-end gap-2'>
                    <Button asChild variant='outline' size='sm'>
                      <Link href={`/admin/brackets/${bracket.id}`}>Edit</Link>
                    </Button>
                    <Button asChild variant='outline' size='sm'>
                      <Link href={`/admin/brackets/${bracket.id}/schedule`}>
                        Schedule
                      </Link>
                    </Button>
                    <DeleteDialog id={bracket.id.toString()} action={deleteBracket} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className='py-8 text-center text-white/65'>
                No brackets found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default AdminBracketsPage;