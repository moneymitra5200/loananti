import { PrismaClient } from '@prisma/client';

// ── Types ──────────────────────────────────────────────────────────────────────
// $extends changes the return type; use ReturnType so the singleton matches.
// (TypeScript resolves typeof in type positions even with forward references)
type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;


const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
  prismaRestarting: boolean;
};

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
 * 3. connection_limit=2  → Limits concurrent DB connections (Hostinger shared DB)
 * 4. $extends timeout    → EVERY query capped at 8s — protects ALL 126+ routes
 */

const GLOBAL_QUERY_TIMEOUT_MS = 8_000; // 8s hard cap per query

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
  }).$extends({
    // ── GLOBAL 8s QUERY TIMEOUT ────────────────────────────────────────────
    // Applied to EVERY db.* call across ALL 126+ route files automatically.
    // Eliminates hanging requests that hold process slots for 30-120 seconds,
    // which is the primary cause of Hostinger IOPS/max-process exhaustion.
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const timeoutErr = new Error(
            `DB_TIMEOUT: ${model}.${operation} exceeded ${GLOBAL_QUERY_TIMEOUT_MS}ms`
          );
          const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(timeoutErr), GLOBAL_QUERY_TIMEOUT_MS)
          );
          return Promise.race([query(args), timeout]);
        },
      },
    },
  });
};


// ── Singleton ──────────────────────────────────────────────────────────────────
export const db = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = db;
globalForPrisma.prismaRestarting = false;

// NOTE: Startup jitter — Hostinger often starts 2-3 instances simultaneously.
// If all instances try to initialize Prisma's Rust library engine at the SAME
// millisecond, they compete for OS timer (timerfd) resources, causing
// PrismaClientRustPanicError: 'timer has gone away' on EVERY instance.
//
// Fix: random 0-1500ms delay before the VERY FIRST query. By that time, only
// one instance is live and the others have already exited. This eliminates
// the panic entirely on multi-instance restart.
let _startupJitterDone = false;
export async function waitForStartupJitter(): Promise<void> {
  if (_startupJitterDone) return;
  _startupJitterDone = true;
  if (process.env.NODE_ENV === 'production') {
    const jitter = Math.floor(Math.random() * 1500); // 0-1500ms
    if (jitter > 0) await new Promise(resolve => setTimeout(resolve, jitter));
  }
}


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
  // Stagger the very first query to prevent multi-instance Prisma panic race
  await waitForStartupJitter();
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
