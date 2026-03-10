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
        <div className='border-b border-emerald-900/50 bg-[#102317] container mx-auto'>
          <div className='flex items-center h-16 px-4'>
            <Link href='/' className='w-22'>
              <Image
                src='/images/logo.png'
                height={48}
                width={48}
                alt={APP_NAME}
              />
            </Link>

            <MainNav className='mx-6' />

            <div className='ml-auto items-center flex space-x-4'>
              {/* <AdminSearch /> */}
              <Menu />
            </div>
          </div>
        </div>

        <div className='flex-1 space-y-4 p-8 pt-6 container mx-auto bg-[#0b1a12]'>
          {children}
        </div>
      </div>
    </>
  );
}