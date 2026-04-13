import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Maximum connections for shared MySQL hosting (hostinger typically allows ~10-20 simultaneous)
 * Keep low to avoid "Too many connections" errors
 */
const CONNECTION_LIMIT = 5;
const QUERY_TIMEOUT_MS = 8000; // 8 seconds before a query is killed

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: [
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Log slow queries (>2s) and errors in development
  if (process.env.NODE_ENV !== 'production') {
    client.$on('error', (e) => {
      console.error('[DB Error]', e.message);
    });
    client.$on('warn', (e) => {
      console.warn('[DB Warn]', e.message);
    });
  }

  return client;
};

// Use global singleton to prevent multiple Prisma instances
// This is CRUCIAL for preventing connection pool exhaustion on shared hosting
export const db = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Graceful shutdown - prevents connection leaks when Next.js hot-reloads
if (process.env.NODE_ENV !== 'production') {
  process.on('beforeExit', async () => {
    await db.$disconnect();
  });
}

/**
 * Wrapper for DB queries with automatic retry on connection failures.
 * Use this for any query that might fail due to connection issues.
 *
 * @example
 * const users = await dbWithRetry(() => db.user.findMany());
 */
export async function dbWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 300
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isConnectionError =
        err?.code === 'P1017' ||           // Connection closed
        err?.code === 'P2024' ||           // Connection pool timeout  
        err?.message?.includes('Too many connections') ||
        err?.message?.includes('ECONNRESET') ||
        err?.message?.includes('connection') ||
        err?.message?.includes('socket');

      if (isConnectionError && attempt < retries) {
        console.warn(`[DB Retry] Attempt ${attempt} failed. Retrying in ${delayMs}ms...`, err?.code);
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        continue;
      }
      throw err;
    }
  }
  throw new Error('dbWithRetry: max retries exceeded');
}
