'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import React from 'react';

type Props = React.HTMLAttributes<HTMLElement> & {
  role?: 'SUPER_ADMIN' | 'ADMIN';
};

const baseLinks = [
  {
    title: 'Overview',
    href: '/admin/overview',
  },
  {
    title: 'Brackets',
    href: '/admin/brackets',
  },
  {
    title: 'Hotels',
    href: '/admin/hotels',
  },
  {
    title: 'Restaurants',
    href: '/admin/restaurants',
  },
];

const superAdminLinks = [
  {
    title: 'Super Admin',
    href: '/super-admin/invites',
  },
];

const MainNav = ({ className, role, ...props }: Props) => {
  const pathname = usePathname();
  const links =
    role === 'SUPER_ADMIN' ? [...baseLinks, ...superAdminLinks] : baseLinks;

  return (
    <nav
      className={cn('flex items-center space-x-4 lg:space-x-6', className)}
      {...props}
    >
      {links.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'text-sm font-medium transition-colors',
              isActive
                ? 'text-emerald-400'
                : 'text-white/70 hover:text-emerald-300'
            )}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
};

export default MainNav;