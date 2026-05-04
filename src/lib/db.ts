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
  // HOSTINGER FIX: hPanel URL-decodes %40 → @ when saving env vars, which
  // corrupts "mysql://user:Mahadev%406163@host" into a broken double-@ URL.
  // Solution: store credentials as plain-text individual vars, encode in code.
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const pass = process.env.DB_PASS;
  const name = process.env.DB_NAME;
  const port = process.env.DB_PORT || '3306';

  if (host && user && pass && name) {
    const encodedPass = encodeURIComponent(pass); // safely encodes @ → %40
    return `mysql://${user}:${encodedPass}@${host}:${port}/${name}?connection_limit=3&connect_timeout=15&pool_timeout=15`;
  }

  // Fallback: use DATABASE_URL as-is (for local dev where .env has %40 already)
  const base = process.env.DATABASE_URL || '';
  if (base.includes('connection_limit')) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}connection_limit=3&connect_timeout=15&pool_timeout=15`;
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

// ── CRITICAL: Exit immediately on Prisma engine panic ────────────────────────
// A Prisma RustPanic leaves a zombie engine in memory that never gets freed.
// Calling process.exit(1) lets Hostinger auto-restart with a clean engine.
// This is the #1 cause of RAM growing to 100% in 15-20 minutes.
process.on('uncaughtException', (err: any) => {
  const isPanic = err?.name === 'PrismaClientRustPanicError' ||
    (err?.message || '').includes('PANIC') ||
    (err?.message || '').includes('timer has gone away');
  if (isPanic) {
    console.error('[DB] 🔴 Prisma engine panic — restarting process for clean recovery');
    process.exit(1);
  }
  // Re-throw non-panic errors so other handlers can log them
  console.error('[DB] Uncaught exception:', err?.message || err);
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

      // ── Prisma Rust panic: log and re-throw, let global handler decide ────
      // DO NOT call process.exit() here — it creates restart loops when the
      // panic is caught inside a try-catch. The global uncaughtException handler
      // in server.js handles true unhandled panics cleanly.
      const isRustPanic = err?.name === 'PrismaClientRustPanicError' ||
        msg.includes('PANIC') ||
        msg.includes('timer has gone away');
      if (isRustPanic) {
        console.error('[DB] 🔴 Prisma engine panic detected — re-throwing');
        throw err;
      }

      const isConnectionError =
        err?.code === 'P1001' ||
        err?.code === 'P1017' ||
        err?.code === 'P2024' ||
        msg.includes("Can't reach database") ||
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

/**
 * Log a Prisma error for diagnostics. Does NOT exit the process.
 * The global uncaughtException handler in server.js handles true panics.
 */
export function handlePrismaError(err: any): void {
  const msg: string = err?.message || '';
  const isPanic = err?.name === 'PrismaClientRustPanicError' ||
    msg.includes('PANIC') || msg.includes('timer has gone away');
  if (isPanic) {
    console.error('[DB] 🔴 Prisma panic caught in route handler:', msg.substring(0, 120));
    // DO NOT process.exit() — would restart loop if called in a request handler
  }
}
