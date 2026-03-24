import { requireSuperAdmin } from '@/lib/auth/guards';
import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import Menu from '@/components/shared/header/menu';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

          <nav className='mx-6 flex items-center gap-6 text-sm font-medium'>
            <Link
              href='/admin/overview'
              className='text-white/70 transition-colors hover:text-emerald-300'
            >
              Admin
            </Link>
            <Link
              href='/super-admin/invites'
              className='text-white/70 transition-colors hover:text-emerald-300'
            >
              Invites
            </Link>
            <Link
              href='/super-admin/users'
              className='text-emerald-400 transition-colors hover:text-emerald-300'
            >
              Users
            </Link>
            <Link
              href='/super-admin/sponsors'
              className='text-white/70 transition-colors hover:text-emerald-300'
            >
              Sponsors
            </Link>
          </nav>

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