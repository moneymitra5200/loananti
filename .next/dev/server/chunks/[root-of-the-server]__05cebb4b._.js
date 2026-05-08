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
"[project]/Desktop/reallll/src/lib/cache.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * High-performance in-memory cache utility
 * - Zero dependencies (no Redis needed)
 * - Stale-While-Revalidate (SWR) pattern for non-blocking UX
 * - Auto cleanup of expired keys to prevent memory leaks
 * - Hit/miss stats for observability
 */ __turbopack_context__.s([
    "CacheKeys",
    ()=>CacheKeys,
    "CacheTTL",
    ()=>CacheTTL,
    "cache",
    ()=>cache,
    "default",
    ()=>__TURBOPACK__default__export__,
    "invalidateCompanyCache",
    ()=>invalidateCompanyCache,
    "invalidateLoanCache",
    ()=>invalidateLoanCache,
    "invalidatePaymentCache",
    ()=>invalidatePaymentCache,
    "invalidateUserCache",
    ()=>invalidateUserCache
]);
class MemoryCache {
    cache = new Map();
    hits = 0;
    misses = 0;
    revalidating = new Set();
    constructor(){
        // Auto-cleanup expired keys every 5 minutes to prevent memory leaks
        if (typeof setInterval !== 'undefined') {
            setInterval(()=>this.cleanup(), 5 * 60 * 1000);
        }
    }
    /** Remove expired entries to keep memory lean */ cleanup() {
        const now = Date.now();
        let removed = 0;
        for (const [key, entry] of this.cache.entries()){
            const maxAge = entry.ttl + (entry.staleWhileRevalidate || 0);
            if (now - entry.timestamp > maxAge) {
                this.cache.delete(key);
                removed++;
            }
        }
        if (removed > 0 && ("TURBOPACK compile-time value", "development") !== 'production') {
            console.debug(`[Cache] Cleaned ${removed} expired keys. Remaining: ${this.cache.size}`);
        }
    }
    /** Get a value from cache (returns null if expired) */ get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.misses++;
            return null;
        }
        const now = Date.now();
        const age = now - entry.timestamp;
        if (age > entry.ttl) {
            // Expired — check if still in SWR window
            const swrWindow = entry.staleWhileRevalidate || 0;
            if (swrWindow === 0 || age > entry.ttl + swrWindow) {
                this.cache.delete(key);
                this.misses++;
                return null;
            }
            // SWR: return stale data (caller will trigger background revalidation)
            this.hits++;
            return entry.data;
        }
        this.hits++;
        return entry.data;
    }
    /** Check if a key is expired but still in the SWR window */ isStale(key) {
        const entry = this.cache.get(key);
        if (!entry) return false;
        const age = Date.now() - entry.timestamp;
        return age > entry.ttl;
    }
    /** Set a value in cache */ set(key, data, ttlMs = 60000, staleWhileRevalidate = 0) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttlMs,
            staleWhileRevalidate
        });
    }
    /** Delete a value from cache */ delete(key) {
        return this.cache.delete(key);
    }
    /** Delete all keys matching a pattern string */ deletePattern(pattern) {
        const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\*', '.*'));
        for (const key of this.cache.keys()){
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }
    /** Clear all cache entries */ clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }
    /** Get cache statistics */ getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? `${Math.round(this.hits / total * 100)}%` : '0%'
        };
    }
    /**
   * Cache-aside helper: returns cached data immediately if fresh.
   * If stale-while-revalidate: returns stale data AND triggers a background refresh.
   * If no data: waits for the fetcher and caches the result.
   */ async getOrSet(key, fetcher, ttlMs = 60000, staleWhileRevalidateMs = 0) {
        const cached = this.get(key);
        if (cached !== null) {
            // Background revalidation if SWR and stale
            if (staleWhileRevalidateMs > 0 && this.isStale(key) && !this.revalidating.has(key)) {
                this.revalidating.add(key);
                fetcher().then((data)=>{
                    this.set(key, data, ttlMs, staleWhileRevalidateMs);
                }).catch((err)=>{
                    console.warn(`[Cache SWR] Background refresh failed for key "${key}":`, err?.message);
                }).finally(()=>{
                    this.revalidating.delete(key);
                });
            }
            return cached;
        }
        // Cache miss — fetch and store
        const data = await fetcher();
        this.set(key, data, ttlMs, staleWhileRevalidateMs);
        return data;
    }
}
const cache = new MemoryCache();
const CacheKeys = {
    // User
    user: (userId)=>`user:${userId}`,
    userByEmail: (email)=>`user:email:${email}`,
    usersByRole: (role)=>`users:role:${role}`,
    usersList: ()=>'users:list',
    // Loan
    loan: (loanId)=>`loan:${loanId}`,
    loansByStatus: (status)=>`loans:status:${status}`,
    loansByRole: (role, userId)=>`loans:${role}${userId ? `:${userId}` : ''}`,
    loanDetails: (loanId)=>`loan:details:${loanId}`,
    allActiveLoans: ()=>'loans:active:all',
    // EMI
    emiSchedule: (loanId)=>`emi:schedule:${loanId}`,
    emiCalendar: (userId, date)=>`emi:calendar:${userId}:${date}`,
    pendingEMIs: (userId)=>`emi:pending:${userId}`,
    // Company
    company: (companyId)=>`company:${companyId}`,
    companiesList: ()=>'companies:list',
    // Settings
    systemSettings: ()=>'settings:system',
    paymentSettings: ()=>'settings:payment',
    // Credit
    creditSummary: (userId)=>`credit:summary:${userId}`,
    // Dashboard stats
    dashboardStats: (role, userId)=>`dashboard:stats:${role}${userId ? `:${userId}` : ''}`,
    // CMS (mostly static)
    CMS_SERVICES: 'cms:services',
    CMS_BANNERS: 'cms:banners',
    CMS_TESTIMONIALS: 'cms:testimonials',
    LOAN_STATS: 'stats:loans',
    USER_COUNT: 'stats:user_count',
    COMPANY_COUNT: 'stats:company_count',
    // Receipts
    receiptTemplates: ()=>'receipt:templates'
};
const CacheTTL = {
    SHORT: 120_000,
    REPORT: 300_000,
    MEDIUM: 300_000,
    LONG: 900_000,
    VERY_LONG: 1800_000
};
function invalidateUserCache(userId) {
    if (userId) {
        cache.deletePattern(`user:${userId}`);
        cache.deletePattern(`credit:summary:${userId}`);
        cache.deletePattern(`emi:pending:${userId}`);
        cache.deletePattern(`emi:calendar:${userId}`);
    }
    cache.delete('users:list');
    cache.deletePattern('users:role:');
    cache.deletePattern('dashboard:stats:');
}
function invalidateLoanCache(loanId) {
    if (loanId) {
        cache.deletePattern(`loan:${loanId}`);
        cache.deletePattern(`emi:schedule:${loanId}`);
    }
    cache.deletePattern('loans:');
    cache.deletePattern('dashboard:stats:');
}
function invalidatePaymentCache() {
    cache.delete('settings:payment');
    cache.deletePattern('emi:');
    cache.deletePattern('credit:');
    cache.deletePattern('dashboard:stats:');
}
function invalidateCompanyCache(companyId) {
    if (companyId) {
        cache.deletePattern(`company:${companyId}`);
    }
    cache.delete('companies:list');
    cache.deletePattern('dashboard:stats:');
}
const __TURBOPACK__default__export__ = cache;
}),
"[project]/Desktop/reallll/src/app/api/settings/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/lib/cache.ts [app-route] (ecmascript)");
;
;
;
async function GET() {
    try {
        // Use cache for settings (cache for 5 minutes - settings rarely change)
        const settings = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].getOrSet(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheKeys"].systemSettings(), async ()=>{
            const result = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].systemSetting.findMany({
                select: {
                    key: true,
                    value: true
                }
            });
            return result;
        }, 300000 // 5 minutes cache
        );
        const settingsObj = {};
        for (const setting of settings){
            settingsObj[setting.key] = setting.value;
        }
        settingsObj['companyLogo'] = '/mm-logo.png';
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            settings: settingsObj
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
            }
        });
    } catch (error) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to fetch settings'
        }, {
            status: 500
        });
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        const { settings } = body;
        if (!settings || typeof settings !== 'object') {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Settings object is required'
            }, {
                status: 400
            });
        }
        // Batch upsert using transaction
        const updates = Object.entries(settings).map(([key, value])=>__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].systemSetting.upsert({
                where: {
                    key
                },
                update: {
                    value: String(value)
                },
                create: {
                    key,
                    value: String(value)
                }
            }));
        await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].$transaction(updates);
        // Clear cache after update
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].delete(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheKeys"].systemSettings());
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            message: 'Settings saved successfully'
        });
    } catch (error) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to save settings'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__05cebb4b._.js.map