import NextAuth from 'next-auth';
import {PrismaAdapter} from '@auth/prisma-adapter';
import {prisma} from '@/db/prisma';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compareSync } from 'bcrypt-ts-edge';
import type { NextAuthConfig } from 'next-auth';
export const config = {
    pages: {
        signIn: '/sign-in',
        error: '/sign-in',
    },
    session:{
        strategy: 'jwt',
        maxAge: 30*24*60*60, //30 days
    },
    adapter: PrismaAdapter(prisma),
    providers: [
        CredentialsProvider({
            credentials: {
                username: {type: 'username'},
                password: {type: 'password'}
            },
            async authorize(credentials) {
                if (credentials == null) return null;

                //find user in database
                const user = await prisma.user.findFirst({
                    where: {
                        username: credentials.username as string
                    }
                })

                //Check if user exists and if password matches
                if (user && user.password) {
                    const isMatch = compareSync(credentials.password as string, user.password);

                    //if password is correct, return user
                    if(isMatch) {
                        return {
                        id: user.id,
                        username: user.username,
                        role: user.role
                        }
                    }
                }
                //If user does not exist or password does not match return null
                return null;
            }
        })],
            callbacks: {
            async session({ session, token }: any) {
                // Ensure session.user exists
                if (!session.user) session.user = {};
                session.user.id = token.sub;
                session.user.username = token.username;
                session.user.role = token.role;
                return session;
            },
            async jwt({ token, user }: any) {
                // On sign in, add user info to token
                if (user) {
                    token.username = user.username;
                    token.role = user.role;
                } else if (!token.username || !token.role) {
                    // On subsequent requests, fetch user if info is missing
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.sub },
                        select: { username: true, role: true }
                    });
                    if (dbUser) {
                        token.username = dbUser.username;
                        token.role = dbUser.role;
                    }
                }
                return token;
            }
        }
} satisfies NextAuthConfig

export const {handlers, auth, signIn, signOut} =NextAuth(config);