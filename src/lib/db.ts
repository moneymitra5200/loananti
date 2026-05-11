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

  // Tight timeouts: hanging queries (30-120s) exhaust IOPS + process slots.
  // connect_timeout=8  → fail fast if DB is unreachable at connect time
  // pool_timeout=8     → fail fast if no connection available in pool
  // socket_timeout=20  → kill any query that hasn't responded in 20s
  if (host && user && pass && name) {
    const encodedPass = encodeURIComponent(pass);
    return `mysql://${user}:${encodedPass}@${host}:${port}/${name}?connection_limit=2&connect_timeout=8&pool_timeout=8&socket_timeout=20`;
  }

  const base = process.env.DATABASE_URL || '';
  if (base.includes('connection_limit')) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}connection_limit=2&connect_timeout=8&pool_timeout=8&socket_timeout=20`;
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


// ── PANIC HANDLER ─────────────────────────────────────────────────────────────
// Only force-exit on TRUE Rust engine panics (PrismaClientRustPanicError).
// PrismaClientInitializationError during startup is NOT a panic — it's caused
// by Hostinger double-spawning two instances. These resolve naturally once
// only one instance is active. Exiting on InitializationError causes a
// restart loop and makes things MUCH worse.
function handlePanic(err: any, source: string) {
  const msg: string = err?.message || String(err);

  // TRUE Rust panic — engine is permanently broken, must restart
  const isRustPanic =
    err?.name === 'PrismaClientRustPanicError' ||
    (msg.includes('timer has gone away') && !msg.includes('PrismaClientInitializationError')) ||
    msg.includes('non-recoverable');

  // Startup initialization error — do NOT restart, these resolve themselves
  const isInitError =
    err?.name === 'PrismaClientInitializationError' ||
    msg.includes('Query engine exited with code 101');

  if (isInitError) {
    // Log but do NOT exit — let Hostinger's rolling restart settle
    console.warn(`[DB] ⚠️  Prisma init error (${source}) — startup race condition, will resolve. Error: ${msg.slice(0, 120)}`);
    return;
  }

  if (isRustPanic && !globalForPrisma.prismaRestarting) {
    globalForPrisma.prismaRestarting = true;
    console.error(`[DB] 🔴 Prisma Rust PANIC (${source}). Restarting in 3s...`);
    // Give 3s for current response to finish before restarting
    setTimeout(() => process.exit(1), 3000);
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
  retries = 3,
  delayMs = 800
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg: string = err?.message || '';

      // ── TRUE Rust panic: trigger restart and surface error immediately ──────
      const isRustPanic =
        err?.name === 'PrismaClientRustPanicError' ||
        (msg.includes('timer has gone away') && err?.name !== 'PrismaClientInitializationError') ||
        msg.includes('non-recoverable');

      if (isRustPanic) {
        handlePanic(err, 'dbWithRetry');
        throw err;
      }

      // ── Initialization error (startup race) — retry, don't panic ───────────
      const isInitError =
        err?.name === 'PrismaClientInitializationError' ||
        msg.includes('Query engine exited with code 101');

      // ── Connection errors: retry with backoff ─────────────────────────────
      const isConnectionError =
        isInitError ||
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
        console.warn(`[DB Retry] Attempt ${attempt}/${retries} → retrying in ${waitMs}ms (${err?.code || err?.name || 'connection'})`);
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

/**
 * Hard deadline wrapper — races a DB query against a wall-clock timeout.
 * If the query hasn't resolved within `ms` (default 8000ms), throws immediately
 * so the request returns 503 instead of hanging for 30-120 seconds.
 *
 * This is the primary fix for Hostinger IOPS/process exhaustion:
 *   hanging requests pile up → fill process table → EAGAIN on spawn.
 *
 * @example
 *   const data = await dbWithTimeout(() => db.company.findMany(), 8000);
 */
export async function dbWithTimeout<T>(
  fn: () => Promise<T>,
  ms = 8000
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`DB_TIMEOUT: query exceeded ${ms}ms`)), ms)
  );
  return Promise.race([fn(), timeout]);
}

/**
 * Combination: timeout + retry on connection errors.
 * Use this for the slowest/most critical endpoints.
 */
export async function dbSafe<T>(
  fn: () => Promise<T>,
  { timeoutMs = 8000, retries = 2 }: { timeoutMs?: number; retries?: number } = {}
): Promise<T> {
  return dbWithRetry(() => dbWithTimeout(fn, timeoutMs), retries, 500);
}
