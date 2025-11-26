import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

// Sets up WebSocket connections, which enables Neon to use WebSocket communication.
neonConfig.webSocketConstructor = ws;
const connectionString = `${process.env.DATABASE_URL}`;

// Instantiates the Prisma adapter using the Neon connection string to handle the connection between Prisma and Neon.
const adapter = new PrismaNeon({ connectionString });

// Creates a PrismaClient instance with the Neon adapter.
export const prisma = new PrismaClient({ adapter });
