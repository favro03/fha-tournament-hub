import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user?: DefaultSession['user'] & {
      id?: string;
      username?: string;
      email?: string | null;
      role?: 'SUPER_ADMIN' | 'ADMIN';
      isActive?: boolean;
    };
  }

  interface User extends DefaultUser {
    id?: string;
    username?: string;
    email?: string | null;
    role?: 'SUPER_ADMIN' | 'ADMIN';
    isActive?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    username?: string;
    email?: string | null;
    role?: 'SUPER_ADMIN' | 'ADMIN';
    isActive?: boolean;
  }
}