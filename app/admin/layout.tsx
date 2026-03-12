import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import Link from 'next/link';
import Menu from '@/components/shared/header/menu';
import MainNav from './main-nav';
// import AdminSearch from '@/components/admin/admin-search';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className='flex min-h-screen flex-col bg-[#0b1a12] text-white'>
        <div className='container mx-auto border-b border-emerald-900/50 bg-[#102317]'>
          <div className='flex h-16 items-center px-4'>
            <Link href='/' className='w-22'>
              <Image
                src='/images/logo.png'
                height={48}
                width={48}
                alt={APP_NAME}
              />
            </Link>
            <MainNav className='mx-6' />
            <div className='ml-auto flex items-center space-x-4'>
              {/* <AdminSearch /> */}
              <Menu />
            </div>
          </div>
        </div>

        <div className='container mx-auto flex-1 space-y-4 bg-[#3a6a4f]/50 p-8 pt-6'>
          {children}
        </div>
      </div>
    </>
  );
}