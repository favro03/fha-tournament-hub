import { Button } from '@/components/ui/button';

import Link from 'next/link';
import { EllipsisVertical,UserIcon,BedSingle,Utensils,NotebookText,Network, House} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
// import UserButton from './user-button';


const Menu = () => {
  return (
    <div className='flex justify-end gap-1'>
      <nav className='hidden lg:flex items-center gap-1'>
        <Button asChild variant='ghost' className='px-2 py-1 h-auto'>
          <Link href='/' className='flex items-center gap-1.5 text-sm whitespace-nowrap'>
            <House className='h-4 w-4' />
            <span>Home</span>
          </Link>
        </Button>
         <Button asChild variant='ghost' className='px-2 py-1 h-auto'>
          <Link href='/brackets' className='flex items-center gap-1.5 text-sm whitespace-nowrap'>
            <Network className='h-4 w-4' />
            <span>Brackets</span>
          </Link>
        </Button>
        <Button asChild variant='ghost' className='px-2 py-1 h-auto'>
          <Link href='/restaurants' className='flex items-center gap-1.5 text-sm whitespace-nowrap'>
            <Utensils className='h-4 w-4' />
            <span>Restaurants</span>
          </Link>
        </Button>
        <Button asChild variant='ghost' className='px-2 py-1 h-auto'>
          <Link href='/hotels' className='flex items-center gap-1.5 text-sm whitespace-nowrap'>
            <BedSingle className='h-4 w-4' />
            <span>Hotels</span>
          </Link>
        </Button>
        <Button asChild variant='ghost' className='px-2 py-1 h-auto'>
          <Link href='/rules' className='flex items-center gap-1.5 text-sm whitespace-nowrap'>
            <NotebookText className='h-4 w-4' />
            <span>Rules</span>
          </Link>
        </Button>
        <Button asChild variant='ghost' className='px-2 py-1 h-auto'>
          <Link href='/sign-in' className='flex items-center gap-1.5 text-sm whitespace-nowrap'>
            <UserIcon className='h-4 w-4' />
            <span>Admin</span>
          </Link>
        </Button>
      </nav>
      
      {/* Medium screen - Icon only navigation */}
      <nav className='hidden md:flex lg:hidden items-center gap-1'>
        <Button asChild variant='ghost' size='sm' className='p-2'>
          <Link href='/' className='flex items-center'>
            <House className='h-4 w-4' />
            <span className='sr-only'>Home</span>
          </Link>
        </Button>
            <Button asChild variant='ghost' size='sm' className='p-2'>
          <Link href='/brackets' className='flex items-center'>
            <Network className='h-4 w-4' />
            <span className='sr-only'>Brackets</span>
          </Link>
        </Button>
        <Button asChild variant='ghost' size='sm' className='p-2'>
          <Link href='/restaurants' className='flex items-center'>
            <Utensils className='h-4 w-4' />
            <span className='sr-only'>Restaurants</span>
          </Link>
        </Button>
        <Button asChild variant='ghost' size='sm' className='p-2'>
          <Link href='/hotels' className='flex items-center'>
            <BedSingle className='h-4 w-4' />
            <span className='sr-only'>Hotels</span>
          </Link>
        </Button>
        <Button asChild variant='ghost' size='sm' className='p-2'>
          <Link href='/rules' className='flex items-center'>
            <NotebookText className='h-4 w-4' />
            <span className='sr-only'>Rules</span>
          </Link>
        </Button>
        <Button asChild variant='ghost' size='sm' className='p-2'>
          <Link href='/sign-in' className='flex items-center'>
            <UserIcon className='h-4 w-4' />
            <span className='sr-only'>Admin</span>
          </Link>
        </Button>
      </nav>

      {/* Mobile navigation */}
      <nav className='md:hidden'>
        <Sheet>
          <SheetTrigger className='align-middle'>
            <EllipsisVertical />
          </SheetTrigger>
          <SheetContent className='flex flex-col items-start'>
            <SheetTitle>Menu</SheetTitle>
            <Button asChild variant='ghost'>
              <Link href='/' className='flex items-center gap-2'>
                <House className='h-4 w-4' />
                <span>Home</span>
              </Link>
            </Button>
                  <Button asChild variant='ghost'>
              <Link href='/brackets' className='flex items-center gap-2'>
                <Network className='h-4 w-4' />
                <span>Brackets</span>
              </Link>
            </Button>
            <Button asChild variant='ghost'>
              <Link href='/restaurants' className='flex items-center gap-2'>
                <Utensils className='h-4 w-4' />
                <span>Restaurants</span>
              </Link>
            </Button>
            <Button asChild variant='ghost'>
              <Link href='/hotels' className='flex items-center gap-2'>
                <BedSingle className='h-4 w-4' />
                <span>Hotels</span>
              </Link>
            </Button>
            <Button asChild variant='ghost'>
              <Link href='/rules' className='flex items-center gap-2'>
                <NotebookText className='h-4 w-4' />
                <span>Rules</span>
              </Link>
            </Button>
            <Button asChild variant='ghost'>
              <Link href='/sign-in' className='flex items-center gap-2'>
                <UserIcon className='h-4 w-4' />
                <span>Admin</span>
              </Link>
            </Button>
            <SheetDescription></SheetDescription>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
};

export default Menu;
