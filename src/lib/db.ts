import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * HOSTINGER PERSISTENT NODE.JS SERVER — SINGLETON FIX
 *
 * This app runs on Hostinger as a PERSISTENT Node.js process (not serverless).
 * Global state IS shared across all requests within the same process.
 *
 * Problem: Without the global singleton in production, every simultaneous
 * request at startup creates a NEW PrismaClient. They all race to initialize
 * the Rust query engine at the same time → PANIC: timer has gone away.
 *
 * Solution:
 * 1. Global singleton    → Always reuse the same client (dev AND production)
 * 2. connection_limit=1  → Respect Hostinger's shared MySQL connection limits
 * 3. connect_timeout     → Fail fast rather than queue connections
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
 * ALWAYS use the global singleton on Hostinger's persistent Node.js server.
 * Global state IS shared between requests in the same process.
 * This prevents multiple PrismaClient instances racing to init the Rust engine.
 */
export const db = globalForPrisma.prisma ?? prismaClientSingleton();

// Store singleton globally in ALL environments (safe for persistent servers)
globalForPrisma.prisma = db;

// Graceful shutdown
process.on('beforeExit', async () => {
  await db.$disconnect();
});

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
  delayMs = 800
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg: string = err?.message || '';
      // Never retry on Rust engine panics — retrying makes it worse
      const isRustPanic = err?.name === 'PrismaClientRustPanicError' ||
        msg.includes('PANIC') ||
        msg.includes('timer has gone away');
      if (isRustPanic) throw err;

      const isConnectionError =
        err?.code === 'P1001' ||                         // Can't reach database server
        err?.code === 'P1017' ||                         // Connection closed
        err?.code === 'P2024' ||                         // Connection pool timeout
        msg.includes("Can't reach database") ||          // Hostinger exact error
        msg.includes('Too many connections') ||
        msg.includes('max_connections_per_hour') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('connection') ||
        msg.includes('socket');

      if (isConnectionError && attempt < retries) {
        const waitMs = delayMs * attempt;
        console.warn(`[DB Retry] Attempt ${attempt}/${retries} failed (${err?.code || 'connection'}). Retrying in ${waitMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error('dbWithRetry: max retries exceeded');
}
