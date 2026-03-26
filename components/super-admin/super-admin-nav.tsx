'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function navLinkClass(isActive: boolean) {
  return isActive
    ? 'text-emerald-400 transition-colors hover:text-emerald-300'
    : 'text-white/70 transition-colors hover:text-emerald-300';
}

function isActivePath(pathname: string, href: string) {
  if (href === '/admin/overview') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SuperAdminNav() {
  const pathname = usePathname();

  return (
    <nav className='mx-6 flex items-center gap-6 text-sm font-medium'>
      <Link
        href='/admin/overview'
        className={navLinkClass(isActivePath(pathname, '/admin/overview'))}
      >
        Admin
      </Link>

      <Link
        href='/super-admin/invites'
        className={navLinkClass(isActivePath(pathname, '/super-admin/invites'))}
      >
        Invites
      </Link>

      <Link
        href='/super-admin/users'
        className={navLinkClass(isActivePath(pathname, '/super-admin/users'))}
      >
        Users
      </Link>

      <Link
        href='/super-admin/sponsors'
        className={navLinkClass(isActivePath(pathname, '/super-admin/sponsors'))}
      >
        Sponsors
      </Link>
    </nav>
  );
}