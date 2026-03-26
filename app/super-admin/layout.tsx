import { requireSuperAdmin } from '@/lib/auth/guards';
import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import Menu from '@/components/shared/header/menu';
import SuperAdminNav from '@/components/super-admin/super-admin-nav';

type SuperAdminLayoutProps = {
  children: React.ReactNode;
};

export default async function SuperAdminLayout({
  children,
}: SuperAdminLayoutProps) {
  await requireSuperAdmin();

  return (
    <div className='flex min-h-screen flex-col bg-[#07140d] text-white'>
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

          <SuperAdminNav />

          <div className='ml-auto flex items-center space-x-4'>
            <Menu />
          </div>
        </div>
      </div>

      <div className='container mx-auto flex-1 space-y-4 bg-[#21402d]/40 p-8 pt-6'>
        {children}
      </div>
    </div>
  );
}