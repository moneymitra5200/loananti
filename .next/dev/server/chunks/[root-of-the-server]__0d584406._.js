module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/Desktop/reallll/src/lib/db.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "db",
    ()=>db,
    "dbWithRetry",
    ()=>dbWithRetry,
    "handlePrismaError",
    ()=>handlePrismaError
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/Desktop/reallll/node_modules/@prisma/client)");
;
const globalForPrisma = globalThis;
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
 */ const buildDatabaseUrl = ()=>{
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
const createPrismaClient = ()=>{
    return new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$prisma$2f$client$29$__["PrismaClient"]({
        log: [
            {
                level: 'error',
                emit: 'stdout'
            }
        ],
        datasources: {
            db: {
                url: buildDatabaseUrl()
            }
        }
    });
};
const db = globalForPrisma.prisma ?? createPrismaClient();
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
function handlePanic(err, source) {
    const msg = err?.message || String(err);
    const isPanic = err?.name === 'PrismaClientRustPanicError' || msg.includes('PANIC') || msg.includes('timer has gone away') || msg.includes('non-recoverable');
    if (isPanic && !globalForPrisma.prismaRestarting) {
        globalForPrisma.prismaRestarting = true;
        console.error(`[DB] 🔴 Prisma engine panic (${source}). Forcing restart for clean recovery...`);
        // Give 100ms for the current request to return an error response, then exit
        setTimeout(()=>process.exit(1), 100);
    }
}
process.on('uncaughtException', (err)=>{
    handlePanic(err, 'uncaughtException');
    if (!globalForPrisma.prismaRestarting) {
        console.error('[Uncaught Exception]', err?.message || err);
    }
});
process.on('unhandledRejection', (err)=>{
    handlePanic(err, 'unhandledRejection');
});
process.on('beforeExit', async ()=>{
    await db.$disconnect();
});
async function dbWithRetry(fn, retries = 2, delayMs = 500) {
    for(let attempt = 1; attempt <= retries; attempt++){
        try {
            return await fn();
        } catch (err) {
            const msg = err?.message || '';
            // ── Panic: trigger restart and surface error immediately ──────────────
            const isRustPanic = err?.name === 'PrismaClientRustPanicError' || msg.includes('PANIC') || msg.includes('timer has gone away') || msg.includes('non-recoverable');
            if (isRustPanic) {
                handlePanic(err, 'dbWithRetry');
                throw err; // Surface 500 to the client while restart is scheduled
            }
            // ── Connection errors: retry with backoff ─────────────────────────────
            const isConnectionError = err?.code === 'P1001' || err?.code === 'P1017' || err?.code === 'P2024' || msg.includes("Can't reach database") || msg.includes('Too many connections') || msg.includes('max_connections_per_hour') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED');
            if (isConnectionError && attempt < retries) {
                const waitMs = delayMs * attempt;
                console.warn(`[DB Retry] Attempt ${attempt}/${retries} → retrying in ${waitMs}ms (${err?.code || 'connection'})`);
                await new Promise((resolve)=>setTimeout(resolve, waitMs));
                continue;
            }
            throw err;
        }
    }
    throw new Error('dbWithRetry: all retries exhausted');
}
function handlePrismaError(err) {
    handlePanic(err, 'route handler');
}
}),
"[project]/Desktop/reallll/src/app/api/health/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/lib/db.ts [app-route] (ecmascript)");
;
;
// Stable build identifier — set by Vercel on each deploy, falls back to start-time
const BUILD_ID = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.BUILD_ID || `build-${Date.now()}`;
async function GET() {
    const startTime = Date.now();
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].$queryRaw`SELECT 1 as test`;
        const responseTime = Date.now() - startTime;
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            status: 'healthy',
            database: 'connected',
            buildId: BUILD_ID,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString(),
            environment: ("TURBOPACK compile-time value", "development")
        }, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
                ETag: `"${BUILD_ID}"`
            }
        });
    } catch (error) {
        const responseTime = Date.now() - startTime;
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            status: 'unhealthy',
            database: 'disconnected',
            buildId: BUILD_ID,
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        }, {
            status: 500,
            headers: {
                'Cache-Control': 'no-store, max-age=0',
                ETag: `"${BUILD_ID}"`
            }
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0d584406._.js.map