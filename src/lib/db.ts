import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaRestarting: boolean;
}

/**
 * HOSTINGER PERSISTENT NODE.JS SERVER — SINGLETON + PANIC RECOVERY
 *
 * Root cause of 503s: PrismaClientRustPanicError "PANIC: timer has gone away"
 * When Prisma's Rust engine panics, the client is permanently broken.
 * ALL subsequent queries fail until the process restarts.
 *
 * Fix strategy:
 * 1. Global singleton    → Only ONE Prisma client ever exists
 * 2. Panic = exit(1)     → Hostinger auto-restarts with a fresh clean engine
 * 3. connection_limit=1  → Only 1 DB connection at a time (Hostinger limit)
 * 4. No retry on panic   → Retrying a panicked client makes things WORSE
 */

const buildDatabaseUrl = () => {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const pass = process.env.DB_PASS;
  const name = process.env.DB_NAME;
  const port = process.env.DB_PORT || '3306';

  if (host && user && pass && name) {
    const encodedPass = encodeURIComponent(pass);
    // connection_limit=1 is the safest for Hostinger shared MySQL
    return `mysql://${user}:${encodedPass}@${host}:${port}/${name}?connection_limit=1&connect_timeout=10&pool_timeout=10&socket_timeout=30`;
  }

  const base = process.env.DATABASE_URL || '';
  if (base.includes('connection_limit')) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}connection_limit=1&connect_timeout=10&pool_timeout=10`;
};

const createPrismaClient = () => {
  return new PrismaClient({
    log: [{ level: 'error', emit: 'stdout' }],
    datasources: { db: { url: buildDatabaseUrl() } },
  });
};

// ── Singleton ──────────────────────────────────────────────────────────────────
export const db = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = db;
globalForPrisma.prismaRestarting = false;

// NOTE: NO pre-warm here intentionally.
// Hostinger's kernel restricts timerfd syscalls that Prisma's Rust binary requires.
// Calling $connect() during startup (while 4+ instances launch simultaneously)
// causes "timer has gone away" PANIC on every single boot.
// Prisma's default is LAZY connection — the binary spawns only on the first real query,
// at which point startup pressure is over and only one instance is active.
// The panic handler below still catches any runtime panics during real queries.


// ── PANIC HANDLER: FORCE EXIT immediately on Prisma Rust engine panic ─────────
// This is the #1 fix for "PANIC: timer has gone away" loops.
// The panic makes the Rust engine permanently broken.
// The ONLY recovery is a full process restart (Hostinger auto-restarts).
function handlePanic(err: any, source: string) {
  const msg: string = err?.message || String(err);
  const isPanic =
    err?.name === 'PrismaClientRustPanicError' ||
    msg.includes('PANIC') ||
    msg.includes('timer has gone away') ||
    msg.includes('non-recoverable');

  if (isPanic && !globalForPrisma.prismaRestarting) {
    globalForPrisma.prismaRestarting = true;
    console.error(`[DB] 🔴 Prisma engine panic (${source}). Forcing restart for clean recovery...`);
    // Give 100ms for the current request to return an error response, then exit
    setTimeout(() => process.exit(1), 100);
  }
}

process.on('uncaughtException', (err: any) => {
  handlePanic(err, 'uncaughtException');
  if (!globalForPrisma.prismaRestarting) {
    console.error('[Uncaught Exception]', err?.message || err);
  }
});

process.on('unhandledRejection', (err: any) => {
  handlePanic(err, 'unhandledRejection');
});

process.on('beforeExit', async () => {
  await db.$disconnect();
});

/**
 * Wrapper for DB queries with automatic retry on CONNECTION failures only.
 * Panics are NOT retried — they trigger a process restart.
 *
 * @example
 *   const users = await dbWithRetry(() => db.user.findMany());
 */
export async function dbWithRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 500
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg: string = err?.message || '';

      // ── Panic: trigger restart and surface error immediately ──────────────
      const isRustPanic =
        err?.name === 'PrismaClientRustPanicError' ||
        msg.includes('PANIC') ||
        msg.includes('timer has gone away') ||
        msg.includes('non-recoverable');

      if (isRustPanic) {
        handlePanic(err, 'dbWithRetry');
        throw err; // Surface 500 to the client while restart is scheduled
      }

      // ── Connection errors: retry with backoff ─────────────────────────────
      const isConnectionError =
        err?.code === 'P1001' ||
        err?.code === 'P1017' ||
        err?.code === 'P2024' ||
        msg.includes("Can't reach database") ||
        msg.includes('Too many connections') ||
        msg.includes('max_connections_per_hour') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('ECONNREFUSED');

      if (isConnectionError && attempt < retries) {
        const waitMs = delayMs * attempt;
        console.warn(`[DB Retry] Attempt ${attempt}/${retries} → retrying in ${waitMs}ms (${err?.code || 'connection'})`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }

      throw err;
    }
  }
  throw new Error('dbWithRetry: all retries exhausted');
}

export function handlePrismaError(err: any): void {
  handlePanic(err, 'route handler');
}
