import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { env } from './env.js';

// Create a PostgreSQL connection pool
const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

// Create the Prisma adapter
const adapter = new PrismaPg(pool);

// Initialize Prisma Client with the adapter
const prisma = new PrismaClient({
  adapter,
});

/**
 * connectDB — Initialize Prisma connection to PostgreSQL
 */
const connectDB = async () => {
  try {
    await prisma.$connect();
    console.info('[DB] ✓ Connected to PostgreSQL via Prisma');
  } catch (err) {
    console.error('[DB] ❌ Connection failed:', err.message);
    process.exit(1);
  }
};

// Graceful disconnect on exit
process.on('SIGINT', async () => {
  console.info('[DB] Graceful shutdown...');
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.info('[DB] Graceful shutdown...');
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
});

export default connectDB;
export { prisma };
