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
"[project]/Desktop/reallll/src/app/api/cms/service/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        if (type === 'all') {
            // Use cache for landing page data (5 minutes - this data rarely changes)
            const [services, banners, testimonials, loanStats, customerCount, companyCount] = await Promise.all([
                __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].getOrSet(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheKeys"].CMS_SERVICES, ()=>__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].cMSService.findMany({
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
                            loanType: true,
                            minInterestRate: true,
                            maxInterestRate: true,
                            defaultInterestRate: true,
                            minTenure: true,
                            maxTenure: true,
                            defaultTenure: true,
                            minAmount: true,
                            maxAmount: true,
                            processingFeePercent: true,
                            isActive: true
                        }
                    }), 300000),
                __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].getOrSet(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheKeys"].CMS_BANNERS, ()=>__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].cMSBanner.findMany({
                        where: {
                            isActive: true
                        },
                        orderBy: {
                            order: 'asc'
                        },
                        select: {
                            id: true,
                            title: true,
                            subtitle: true,
                            imageUrl: true,
                            linkUrl: true,
                            buttonText: true
                        }
                    }), 300000),
                __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].getOrSet(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheKeys"].CMS_TESTIMONIALS, ()=>__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].cMSTestimonial.findMany({
                        where: {
                            isActive: true
                        },
                        orderBy: {
                            order: 'asc'
                        },
                        select: {
                            id: true,
                            customerName: true,
                            designation: true,
                            content: true,
                            rating: true,
                            imageUrl: true
                        }
                    }), 300000),
                __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].getOrSet(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheKeys"].LOAN_STATS, ()=>__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].loanApplication.aggregate({
                        _count: {
                            id: true
                        },
                        _sum: {
                            requestedAmount: true
                        }
                    }), 300000),
                __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].getOrSet(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheKeys"].USER_COUNT, ()=>__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].user.count({
                        where: {
                            role: 'CUSTOMER'
                        }
                    }), 300000),
                __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].getOrSet(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheKeys"].COMPANY_COUNT, ()=>__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].company.count(), 300000)
            ]);
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                services,
                banners,
                testimonials,
                stats: {
                    totalLoans: loanStats._count.id,
                    totalDisbursed: loanStats._sum.requestedAmount || 0,
                    activeCustomers: customerCount,
                    companies: companyCount
                }
            });
        }
        const services = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].cMSService.findMany({
            where: {
                isActive: true
            },
            orderBy: {
                order: 'asc'
            }
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            services
        });
    } catch (error) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to fetch CMS data'
        }, {
            status: 500
        });
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        const service = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].cMSService.create({
            data: {
                title: body.title,
                description: body.description,
                icon: body.icon,
                loanType: body.loanType || 'PERSONAL',
                minInterestRate: parseFloat(body.minInterestRate) || 8,
                maxInterestRate: parseFloat(body.maxInterestRate) || 24,
                defaultInterestRate: parseFloat(body.defaultInterestRate) || 12,
                minTenure: parseInt(body.minTenure) || 6,
                maxTenure: parseInt(body.maxTenure) || 60,
                defaultTenure: parseInt(body.defaultTenure) || 12,
                minAmount: parseFloat(body.minAmount) || 10000,
                maxAmount: parseFloat(body.maxAmount) || 10000000,
                isActive: body.isActive ?? true
            }
        });
        // Clear cache
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].delete(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheKeys"].CMS_SERVICES);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            service
        });
    } catch (error) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to create service'
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
                error: 'Service ID is required'
            }, {
                status: 400
            });
        }
        const service = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].cMSService.update({
            where: {
                id
            },
            data
        });
        // Clear cache
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].delete(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheKeys"].CMS_SERVICES);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            service
        });
    } catch (error) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to update service'
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
                error: 'Service ID is required'
            }, {
                status: 400
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
            success: true
        });
    } catch (error) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to delete service'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__fb06fde8._.js.map