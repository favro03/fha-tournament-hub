import { SqlDatabase } from 'brackets-prisma-db';
import { BracketsManager } from 'brackets-manager';
import { prisma } from '@/db/prisma'; 

// Initialize the storage and manager
export const bracketsStorage = new SqlDatabase(prisma);
export const bracketsManager = new BracketsManager(bracketsStorage);
