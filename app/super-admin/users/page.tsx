import { Metadata } from 'next';
import { prisma } from '@/db/prisma';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { setUserActiveStatus } from './actions';

export const metadata: Metadata = {
  title: 'Super Admin Users',
};

function formatDate(value: Date) {
  return value.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getRoleClasses(role: 'SUPER_ADMIN' | 'ADMIN') {
  return role === 'SUPER_ADMIN'
    ? 'border border-purple-500/30 bg-purple-500/15 text-purple-300'
    : 'border border-sky-500/30 bg-sky-500/15 text-sky-300';
}

function getStatusClasses(isActive: boolean) {
  return isActive
    ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
    : 'border border-red-500/30 bg-red-500/15 text-red-300';
}

export default async function SuperAdminUsersPage() {
  const session = await requireSuperAdmin();
  const currentUserId = session?.user?.id ?? '';

  const users = await prisma.user.findMany({
    orderBy: [
      { role: 'asc' },
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold text-white'>User Management</h1>
        <p className='mt-1 text-sm text-white/65'>
          View admin users and control whether admin accounts are active.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {users.length > 0 ? (
            users.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              const isSuperAdmin = user.role === 'SUPER_ADMIN';
              const canToggle = !isCurrentUser && !isSuperAdmin;

              const toggleAction = setUserActiveStatus.bind(
                null,
                user.id,
                !user.isActive
              );

              return (
                <TableRow key={user.id}>
                  <TableCell className='font-medium text-white'>
                    {user.username}
                  </TableCell>
                  <TableCell>{user.email ?? '—'}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getRoleClasses(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                        user.isActive
                      )}`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell className='text-right'>
                    {canToggle ? (
                      <form action={toggleAction} className='inline-block'>
                        <Button
                          type='submit'
                          variant={user.isActive ? 'destructive' : 'secondary'}
                          size='sm'
                        >
                          {user.isActive ? 'Deactivate' : 'Reactivate'}
                        </Button>
                      </form>
                    ) : isCurrentUser ? (
                      <span className='text-xs text-white/50'>Current User</span>
                    ) : isSuperAdmin ? (
                      <span className='text-xs text-white/50'>
                        Super Admin Protected
                      </span>
                    ) : (
                      <span className='text-xs text-white/50'>No actions</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={6} className='py-8 text-center text-white/65'>
                No users found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}