import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/db/prisma';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compareSync } from 'bcrypt-ts-edge';
import type { NextAuthConfig } from 'next-auth';

export const config = {
  pages: {
    signIn: '/sign-in',
    error: '/sign-in',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      credentials: {
        username: { type: 'text' },
        password: { type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        const username = String(credentials.username ?? '').trim();
        const password = String(credentials.password ?? '');

        if (!username || !password) return null;

        const user = await prisma.user.findFirst({
          where: { username },
        });

        if (!user || !user.password) return null;
        if (!user.isActive) return null;

        const isMatch = compareSync(password, user.password);
        if (!isMatch) return null;

        return {
          id: user.id,
          username: user.username,
          email: user.email ?? '',
          role: user.role,
          isActive: user.isActive,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        if (user.id) token.sub = user.id;
        token.username = user.username ?? '';
        token.email = user.email ?? '';
        token.role = user.role;
        token.isActive = user.isActive;
      } else if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            isActive: true,
          },
        });

        if (dbUser) {
          token.username = dbUser.username;
          token.email = dbUser.email ?? '';
          token.role = dbUser.role;
          token.isActive = dbUser.isActive;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? '';
        session.user.username = (token.username as string | undefined) ?? '';
        session.user.email = (token.email as string | undefined) ?? '';
        session.user.role = token.role as 'SUPER_ADMIN' | 'ADMIN' | undefined;
        session.user.isActive = token.isActive as boolean | undefined;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);