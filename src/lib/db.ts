import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * HOSTINGER SHARED MYSQL — CONNECTION LIMIT FIX
 *
 * Problem: Vercel serverless functions create a new process for every request.
 * Each process tries to open its own connection pool. With Hostinger limiting
 * you to 500 connections/hour and 10-20 simultaneous connections, this
 * exhausts your quota in minutes.
 *
 * Solution:
 * 1. connection_limit=1  → Each serverless function uses AT MOST 1 connection
 * 2. Global singleton    → In dev (long-running), reuse the same client
 * 3. connect_timeout     → Fail fast rather than queue connections
 * 4. Production guard    → In production, ALWAYS create new client (no global)
 *    because Node.js global state is NOT shared between Vercel function instances
 */

const buildDatabaseUrl = () => {
  const base = process.env.DATABASE_URL || '';
  // Already has connection params - don't double-add
  if (base.includes('connection_limit')) return base;
  // Add strictest possible connection limits for serverless
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}connection_limit=1&connect_timeout=10&pool_timeout=10`;
};

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'production'
      ? [{ level: 'error', emit: 'stdout' }]
      : [
          { level: 'error', emit: 'event' },
          { level: 'warn', emit: 'event' },
        ],
    datasources: {
      db: {
        url: buildDatabaseUrl(),
      },
    },
  });

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

/**
 * In DEVELOPMENT: reuse the same instance (Next.js hot-reload safe)
 * In PRODUCTION: create a new client per serverless function instance.
 *   This is intentional — Vercel doesn't share global state between instances,
 *   so the singleton pattern does nothing in production. Each function instance
 *   gets its own client with connection_limit=1, which is the safest approach.
 */
export const db = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Graceful shutdown in dev
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
  delayMs = 500
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isConnectionError =
        err?.code === 'P1017' ||           // Connection closed
        err?.code === 'P2024' ||           // Connection pool timeout
        err?.message?.includes('Too many connections') ||
        err?.message?.includes('max_connections_per_hour') ||
        err?.message?.includes('ECONNRESET') ||
        err?.message?.includes('ETIMEDOUT') ||
        err?.message?.includes('connection') ||
        err?.message?.includes('socket');

      if (isConnectionError && attempt < retries) {
        console.warn(`[DB Retry] Attempt ${attempt} failed (${err?.code || 'connection'}). Retrying in ${delayMs * attempt}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        continue;
      }
      throw err;
    }
  }
  throw new Error('dbWithRetry: max retries exceeded');
}
