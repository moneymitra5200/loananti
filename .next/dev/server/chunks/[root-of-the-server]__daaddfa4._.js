module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

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
    ()=>db
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/Desktop/reallll/node_modules/@prisma/client)");
;
const globalForPrisma = globalThis;
// Prisma configuration for MySQL
// Ensure DATABASE_URL is properly set in .env file
const prismaClientSingleton = ()=>{
    return new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f40$prisma$2f$client$29$__["PrismaClient"]({
        log: [
            'error'
        ]
    });
};
const db = globalForPrisma.prisma ?? prismaClientSingleton();
if ("TURBOPACK compile-time truthy", 1) globalForPrisma.prisma = db;
}),
"[project]/Desktop/reallll/src/lib/cache.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * In-memory cache utility to reduce database queries and prevent connection limit issues
 * This is especially useful for shared MySQL hosting with limited connections per hour
 */ __turbopack_context__.s([
    "CacheKeys",
    ()=>CacheKeys,
    "CacheTTL",
    ()=>CacheTTL,
    "cache",
    ()=>cache,
    "default",
    ()=>__TURBOPACK__default__export__,
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
    /**
   * Get a value from cache
   */ get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.misses++;
            return null;
        }
        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }
        this.hits++;
        return entry.data;
    }
    /**
   * Set a value in cache
   */ set(key, data, ttlMs = 60000) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttlMs
        });
    }
    /**
   * Delete a value from cache
   */ delete(key) {
        return this.cache.delete(key);
    }
    /**
   * Delete all keys matching a pattern
   */ deletePattern(pattern) {
        const regex = new RegExp(pattern);
        for (const key of this.cache.keys()){
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }
    /**
   * Clear all cache
   */ clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }
    /**
   * Get cache statistics
   */ getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? `${Math.round(this.hits / total * 100)}%` : '0%'
        };
    }
    /**
   * Get or set a value with a fetcher function
   * This is the recommended way to use cache
   */ async getOrSet(key, fetcher, ttlMs = 60000) {
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }
        const data = await fetcher();
        this.set(key, data, ttlMs);
        return data;
    }
}
const cache = new MemoryCache();
const CacheKeys = {
    // User related
    user: (userId)=>`user:${userId}`,
    userByEmail: (email)=>`user:email:${email}`,
    usersByRole: (role)=>`users:role:${role}`,
    usersList: ()=>'users:list',
    // Loan related
    loan: (loanId)=>`loan:${loanId}`,
    loansByStatus: (status)=>`loans:status:${status}`,
    loansByRole: (role, userId)=>`loans:${role}${userId ? `:${userId}` : ''}`,
    loanDetails: (loanId)=>`loan:details:${loanId}`,
    allActiveLoans: ()=>'loans:active:all',
    // EMI related
    emiSchedule: (loanId)=>`emi:schedule:${loanId}`,
    emiCalendar: (userId, date)=>`emi:calendar:${userId}:${date}`,
    pendingEMIs: (userId)=>`emi:pending:${userId}`,
    // Company related
    company: (companyId)=>`company:${companyId}`,
    companiesList: ()=>'companies:list',
    // Settings
    systemSettings: ()=>'settings:system',
    paymentSettings: ()=>'settings:payment',
    // Credit related
    creditSummary: (userId)=>`credit:summary:${userId}`,
    // Dashboard stats
    dashboardStats: (role, userId)=>`dashboard:stats:${role}${userId ? `:${userId}` : ''}`,
    // CMS related (static keys)
    CMS_SERVICES: 'cms:services',
    CMS_BANNERS: 'cms:banners',
    CMS_TESTIMONIALS: 'cms:testimonials',
    LOAN_STATS: 'stats:loans',
    USER_COUNT: 'stats:user_count',
    COMPANY_COUNT: 'stats:company_count'
};
const CacheTTL = {
    SHORT: 30000,
    MEDIUM: 60000,
    LONG: 300000,
    VERY_LONG: 900000
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
const __TURBOPACK__default__export__ = cache;
}),
"[project]/Desktop/reallll/src/app/api/cms/product/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DELETE",
    ()=>DELETE,
    "GET",
    ()=>GET,
    "POST",
    ()=>POST,
    "PUT",
    ()=>PUT
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/lib/cache.ts [app-route] (ecmascript)");
;
;
;
// Permanent loan products configuration
const PERMANENT_PRODUCTS = [
    {
        title: 'Personal Loan',
        description: 'Unsecured personal loans for your various needs - education, wedding, travel, or any personal expenses. Quick approval with minimal documentation.',
        icon: '👤',
        code: 'PL',
        loanType: 'PERSONAL',
        minInterestRate: 10,
        maxInterestRate: 24,
        defaultInterestRate: 15,
        minTenure: 6,
        maxTenure: 60,
        defaultTenure: 24,
        minAmount: 10000,
        maxAmount: 5000000,
        processingFeePercent: 1,
        processingFeeMin: 500,
        processingFeeMax: 5000,
        latePaymentPenaltyPercent: 2,
        gracePeriodDays: 5,
        bounceCharges: 500,
        allowMoratorium: false,
        maxMoratoriumMonths: 0,
        allowPrepayment: true,
        prepaymentCharges: 2,
        isPermanent: true,
        isActive: true,
        order: 0
    },
    {
        title: 'Gold Loan',
        description: 'Get instant loans against your gold jewelry with attractive interest rates. Quick disbursement with minimal documentation.',
        icon: '🏆',
        code: 'GL',
        loanType: 'GOLD',
        minInterestRate: 7,
        maxInterestRate: 15,
        defaultInterestRate: 10,
        minTenure: 3,
        maxTenure: 36,
        defaultTenure: 12,
        minAmount: 10000,
        maxAmount: 50000000,
        processingFeePercent: 0.5,
        processingFeeMin: 500,
        processingFeeMax: 5000,
        latePaymentPenaltyPercent: 2,
        gracePeriodDays: 7,
        bounceCharges: 500,
        allowMoratorium: false,
        maxMoratoriumMonths: 0,
        allowPrepayment: true,
        prepaymentCharges: 1,
        isPermanent: true,
        isActive: true,
        order: 1
    },
    {
        title: 'Vehicle Loan',
        description: 'Finance your dream vehicle with competitive interest rates. Loans for cars, bikes, and commercial vehicles.',
        icon: '🚗',
        code: 'VL',
        loanType: 'VEHICLE',
        minInterestRate: 8,
        maxInterestRate: 18,
        defaultInterestRate: 12,
        minTenure: 12,
        maxTenure: 84,
        defaultTenure: 36,
        minAmount: 50000,
        maxAmount: 10000000,
        processingFeePercent: 1,
        processingFeeMin: 1000,
        processingFeeMax: 10000,
        latePaymentPenaltyPercent: 3,
        gracePeriodDays: 5,
        bounceCharges: 500,
        allowMoratorium: true,
        maxMoratoriumMonths: 3,
        allowPrepayment: true,
        prepaymentCharges: 2,
        isPermanent: true,
        isActive: true,
        order: 2
    },
    {
        title: 'Business Loan',
        description: 'Grow your business with flexible business loans. Working capital, equipment purchase, or business expansion.',
        icon: '💼',
        code: 'BL',
        loanType: 'BUSINESS',
        minInterestRate: 12,
        maxInterestRate: 24,
        defaultInterestRate: 18,
        minTenure: 12,
        maxTenure: 84,
        defaultTenure: 36,
        minAmount: 100000,
        maxAmount: 10000000,
        processingFeePercent: 1.5,
        processingFeeMin: 1000,
        processingFeeMax: 15000,
        latePaymentPenaltyPercent: 3,
        gracePeriodDays: 5,
        bounceCharges: 750,
        allowMoratorium: true,
        maxMoratoriumMonths: 3,
        allowPrepayment: true,
        prepaymentCharges: 2,
        isPermanent: true,
        isActive: true,
        order: 3
    },
    {
        title: 'Home Loan',
        description: 'Make your dream home a reality with competitive home loan rates. Purchase, construction, or renovation.',
        icon: '🏠',
        code: 'HL',
        loanType: 'HOME',
        minInterestRate: 8,
        maxInterestRate: 14,
        defaultInterestRate: 10,
        minTenure: 60,
        maxTenure: 360,
        defaultTenure: 180,
        minAmount: 500000,
        maxAmount: 50000000,
        processingFeePercent: 0.5,
        processingFeeMin: 5000,
        processingFeeMax: 20000,
        latePaymentPenaltyPercent: 2,
        gracePeriodDays: 7,
        bounceCharges: 1000,
        allowMoratorium: true,
        maxMoratoriumMonths: 18,
        allowPrepayment: true,
        prepaymentCharges: 0,
        isPermanent: true,
        isActive: true,
        order: 4
    },
    {
        title: 'Education Loan',
        description: 'Invest in your future with education loans for higher studies. Competitive rates for students and parents.',
        icon: '🎓',
        code: 'EL',
        loanType: 'EDUCATION',
        minInterestRate: 8,
        maxInterestRate: 14,
        defaultInterestRate: 10,
        minTenure: 36,
        maxTenure: 120,
        defaultTenure: 60,
        minAmount: 100000,
        maxAmount: 5000000,
        processingFeePercent: 0.5,
        processingFeeMin: 500,
        processingFeeMax: 5000,
        latePaymentPenaltyPercent: 1,
        gracePeriodDays: 30,
        bounceCharges: 250,
        allowMoratorium: true,
        maxMoratoriumMonths: 48,
        allowPrepayment: true,
        prepaymentCharges: 0,
        isPermanent: true,
        isActive: true,
        order: 5
    },
    {
        title: 'Interest Only Loan',
        description: 'Pay only interest during the initial period, then start principal repayment. Ideal for borrowers expecting future income growth.',
        icon: '💰',
        code: 'INTEREST_ONLY',
        loanType: 'INTEREST_ONLY',
        isInterestOnly: true,
        minInterestRate: 10,
        maxInterestRate: 24,
        defaultInterestRate: 15,
        minTenure: 6,
        maxTenure: 60,
        defaultTenure: 24,
        minAmount: 50000,
        maxAmount: 5000000,
        processingFeePercent: 1,
        processingFeeMin: 500,
        processingFeeMax: 5000,
        latePaymentPenaltyPercent: 2,
        gracePeriodDays: 5,
        bounceCharges: 500,
        allowMoratorium: false,
        maxMoratoriumMonths: 0,
        allowPrepayment: true,
        prepaymentCharges: 0,
        isPermanent: true,
        isActive: true,
        order: 6
    }
];
// Flag to track if permanent products have been checked
let permanentProductsChecked = false;
// Ensure permanent products exist in database (run once per server instance)
async function ensurePermanentProducts() {
    // Skip if already checked
    if (permanentProductsChecked) {
        return;
    }
    try {
        // Use Promise.all for parallel queries instead of sequential
        const existingProducts = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].cMSService.findMany({
            where: {
                isPermanent: true
            },
            select: {
                loanType: true,
                id: true
            }
        });
        const existingTypes = new Set(existingProducts.map((p)=>p.loanType));
        const missingProducts = PERMANENT_PRODUCTS.filter((p)=>!existingTypes.has(p.loanType));
        // Create missing products in parallel
        if (missingProducts.length > 0) {
            await Promise.all(missingProducts.map((product)=>__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].cMSService.create({
                    data: product
                }).then(()=>console.log(`Created permanent product: ${product.title}`)).catch((err)=>console.error(`Failed to create ${product.title}:`, err))));
        }
        permanentProductsChecked = true;
    } catch (error) {
        console.error('Error ensuring permanent products:', error);
    }
}
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const isActive = searchParams.get('isActive');
        // Run ensurePermanentProducts in background (don't block)
        ensurePermanentProducts().catch(console.error);
        if (id) {
            const product = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].cMSService.findUnique({
                where: {
                    id
                }
            });
            if (!product) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Product not found'
                }, {
                    status: 404
                });
            }
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                product
            });
        }
        // Cache active products for 5 minutes (this data rarely changes)
        if (isActive === 'true') {
            const products = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].getOrSet(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheKeys"].CMS_SERVICES, ()=>__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].cMSService.findMany({
                    where: {
                        isActive: true
                    },
                    orderBy: {
                        order: 'asc'
                    },
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        icon: true,
                        code: true,
                        loanType: true,
                        isInterestOnly: true,
                        minInterestRate: true,
                        maxInterestRate: true,
                        defaultInterestRate: true,
                        minTenure: true,
                        maxTenure: true,
                        defaultTenure: true,
                        minAmount: true,
                        maxAmount: true,
                        processingFeePercent: true,
                        isActive: true,
                        isPermanent: true,
                        order: true
                    }
                }), 300000 // 5 minutes cache
            );
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                products
            });
        }
        const products = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].cMSService.findMany({
            orderBy: {
                order: 'asc'
            }
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            products
        });
    } catch (error) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to fetch products'
        }, {
            status: 500
        });
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        const { title, description, icon, code, loanType, minInterestRate, maxInterestRate, defaultInterestRate, minTenure, maxTenure, defaultTenure, minAmount, maxAmount, processingFeePercent, processingFeeMin, processingFeeMax, latePaymentPenaltyPercent, gracePeriodDays, bounceCharges, allowMoratorium, maxMoratoriumMonths, allowPrepayment, prepaymentCharges, isActive, order } = body;
        if (!title || !description || !code) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Title, description, and code are required'
            }, {
                status: 400
            });
        }
        const maxOrder = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].cMSService.aggregate({
            _max: {
                order: true
            }
        });
        const product = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].cMSService.create({
            data: {
                title,
                description,
                icon: icon || '📝',
                code: code.toUpperCase(),
                loanType: loanType || 'PERSONAL',
                minInterestRate: parseFloat(minInterestRate) || 8,
                maxInterestRate: parseFloat(maxInterestRate) || 24,
                defaultInterestRate: parseFloat(defaultInterestRate) || 12,
                minTenure: parseInt(minTenure) || 6,
                maxTenure: parseInt(maxTenure) || 60,
                defaultTenure: parseInt(defaultTenure) || 12,
                minAmount: parseFloat(minAmount) || 10000,
                maxAmount: parseFloat(maxAmount) || 10000000,
                processingFeePercent: parseFloat(processingFeePercent) || 1,
                processingFeeMin: parseFloat(processingFeeMin) || 500,
                processingFeeMax: parseFloat(processingFeeMax) || 10000,
                latePaymentPenaltyPercent: parseFloat(latePaymentPenaltyPercent) || 2,
                gracePeriodDays: parseInt(gracePeriodDays) || 5,
                bounceCharges: parseFloat(bounceCharges) || 500,
                allowMoratorium: allowMoratorium !== false,
                maxMoratoriumMonths: parseInt(maxMoratoriumMonths) || 3,
                allowPrepayment: allowPrepayment !== false,
                prepaymentCharges: parseFloat(prepaymentCharges) || 2,
                isActive: isActive !== false,
                order: parseInt(order) || (maxOrder._max.order || 0) + 1
            }
        });
        // Clear cache
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].delete(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheKeys"].CMS_SERVICES);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            product
        });
    } catch (error) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to create product'
        }, {
            status: 500
        });
    }
}
async function PUT(request) {
    try {
        const body = await request.json();
        const { id, ...data } = body;
        if (!id) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Product ID is required'
            }, {
                status: 400
            });
        }
        const updateData = {};
        const numericFields = [
            'minInterestRate',
            'maxInterestRate',
            'defaultInterestRate',
            'minTenure',
            'maxTenure',
            'defaultTenure',
            'minAmount',
            'maxAmount',
            'processingFeePercent',
            'processingFeeMin',
            'processingFeeMax',
            'latePaymentPenaltyPercent',
            'gracePeriodDays',
            'bounceCharges',
            'maxMoratoriumMonths',
            'prepaymentCharges',
            'order'
        ];
        const intFields = [
            'minTenure',
            'maxTenure',
            'defaultTenure',
            'gracePeriodDays',
            'maxMoratoriumMonths',
            'order'
        ];
        for (const [key, value] of Object.entries(data)){
            if (value !== undefined) {
                if (numericFields.includes(key)) {
                    updateData[key] = intFields.includes(key) ? parseInt(value) : parseFloat(value);
                } else if (key === 'allowMoratorium' || key === 'allowPrepayment' || key === 'isActive') {
                    updateData[key] = value === true || value === 'true';
                } else {
                    updateData[key] = value;
                }
            }
        }
        const product = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].cMSService.update({
            where: {
                id
            },
            data: updateData
        });
        // Clear cache
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].delete(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheKeys"].CMS_SERVICES);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            product
        });
    } catch (error) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to update product'
        }, {
            status: 500
        });
    }
}
async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Product ID is required'
            }, {
                status: 400
            });
        }
        // Check if product is permanent
        const product = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].cMSService.findUnique({
            where: {
                id
            },
            select: {
                isPermanent: true,
                title: true
            }
        });
        if (!product) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Product not found'
            }, {
                status: 404
            });
        }
        if (product.isPermanent) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'This loan product is permanent and cannot be deleted',
                isPermanent: true
            }, {
                status: 403
            });
        }
        await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].cMSService.delete({
            where: {
                id
            }
        });
        // Clear cache
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].delete(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheKeys"].CMS_SERVICES);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to delete product'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__daaddfa4._.js.map