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
"[project]/Desktop/reallll/src/app/api/company/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
        const isActive = searchParams.get('isActive');
        const noCache = searchParams.get('noCache');
        // Generate cache key
        const cacheKey = isActive ? `companies:active` : __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheKeys"].companiesList();
        // Check cache first (skip if noCache is true)
        if (noCache !== 'true') {
            const cachedCompanies = __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].get(cacheKey);
            if (cachedCompanies) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    companies: cachedCompanies,
                    cached: true
                });
            }
        }
        const where = {};
        if (isActive === 'true') {
            where.isActive = true;
        }
        const companies = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].company.findMany({
            where,
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                name: true,
                code: true,
                isActive: true,
                defaultInterestRate: true,
                defaultInterestType: true,
                enableMirrorLoan: true,
                mirrorInterestRate: true,
                mirrorInterestType: true,
                maxLoanAmount: true,
                minLoanAmount: true,
                maxTenureMonths: true,
                createdAt: true,
                contactEmail: true,
                contactPhone: true,
                isMirrorCompany: true,
                accountingType: true,
                logoUrl: true,
                address: true,
                city: true,
                state: true,
                gstNumber: true,
                panNumber: true,
                ownerName: true,
                ownerPhone: true
            }
        });
        // Deduplicate by code (in case of database issues)
        const seenCodes = new Set();
        const deduplicatedCompanies = companies.filter((company)=>{
            if (seenCodes.has(company.code)) {
                return false; // Skip duplicate
            }
            seenCodes.add(company.code);
            return true;
        });
        // Format response
        const formattedCompanies = deduplicatedCompanies.map((c)=>({
                ...c,
                loanCount: 0 // Will be fetched separately if needed
            }));
        // Cache the result
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].set(cacheKey, formattedCompanies, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheTTL"].LONG);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            companies: formattedCompanies
        });
    } catch (error) {
        console.error('Error fetching companies:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to fetch companies'
        }, {
            status: 500
        });
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        const { name, code, contactEmail, contactPhone, defaultInterestRate, defaultInterestType, isActive, // New profile fields
        address, city, state, pincode, country, gstNumber, panNumber, website, ownerName, ownerPhone, ownerEmail, ownerPan, ownerAadhaar, logoUrl, // Mirror settings
        isMirrorCompany, mirrorInterestRate, mirrorInterestType, enableMirrorLoan, // Accounting settings
        accountingType, maxLoanAmount, minLoanAmount, maxTenureMonths } = body;
        if (!name) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Company name is required'
            }, {
                status: 400
            });
        }
        // Generate code if not provided
        const companyCode = code || `COMP-${Date.now().toString(36).toUpperCase()}`;
        const company = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].company.create({
            data: {
                name,
                code: companyCode,
                contactEmail,
                contactPhone,
                address,
                city,
                state,
                pincode,
                country: country || 'India',
                gstNumber,
                panNumber,
                website,
                ownerName,
                ownerPhone,
                ownerEmail,
                ownerPan,
                ownerAadhaar,
                logoUrl,
                defaultInterestRate: defaultInterestRate || 12,
                defaultInterestType: defaultInterestType || 'FLAT',
                isActive: isActive ?? true,
                // Mirror settings
                isMirrorCompany: isMirrorCompany ?? true,
                mirrorInterestRate: mirrorInterestRate || null,
                mirrorInterestType: mirrorInterestType || 'REDUCING',
                enableMirrorLoan: enableMirrorLoan ?? false,
                // Accounting settings
                accountingType: accountingType || 'FULL',
                maxLoanAmount: maxLoanAmount || 10000000,
                minLoanAmount: minLoanAmount || 10000,
                maxTenureMonths: maxTenureMonths || 60
            }
        });
        // Invalidate company cache
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].deletePattern('companies:');
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            company
        });
    } catch (error) {
        console.error('Error creating company:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to create company'
        }, {
            status: 500
        });
    }
}
async function PUT(request) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;
        if (!id) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Company ID is required'
            }, {
                status: 400
            });
        }
        const company = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].company.update({
            where: {
                id
            },
            data: updateData
        });
        // Invalidate company cache
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].deletePattern('companies:');
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].delete(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheKeys"].company(id));
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            company
        });
    } catch (error) {
        console.error('Error updating company:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to update company'
        }, {
            status: 500
        });
    }
}
async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        console.log('[Company DELETE] Starting permanent delete for company:', id);
        if (!id) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Company ID is required'
            }, {
                status: 400
            });
        }
        // Check for related loans
        const loansCount = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].loanApplication.count({
            where: {
                companyId: id
            }
        });
        if (loansCount > 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: `Cannot delete company. It has ${loansCount} loan(s) associated with it.`,
                hasRelations: true
            }, {
                status: 400
            });
        }
        // Delete all related records for this company (PERMANENT DELETE)
        console.log('[Company DELETE] Deleting related records...');
        // Delete in order respecting foreign key constraints
        await Promise.all([
            // Delete chart of accounts
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].ledgerBalance.deleteMany({
                where: {
                    account: {
                        companyId: id
                    }
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].journalEntryLine.deleteMany({
                where: {
                    account: {
                        companyId: id
                    }
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].chartOfAccount.deleteMany({
                where: {
                    companyId: id
                }
            }),
            // Delete financial years
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].ledgerBalance.deleteMany({
                where: {
                    financialYear: {
                        companyId: id
                    }
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].financialYear.deleteMany({
                where: {
                    companyId: id
                }
            }),
            // Delete bank accounts
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].bankAccount.deleteMany({
                where: {
                    companyId: id
                }
            }),
            // Delete other related records
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].ledger.deleteMany({
                where: {
                    companyId: id
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].expense.deleteMany({
                where: {
                    companyId: id
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].journalEntry.deleteMany({
                where: {
                    companyId: id
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].gSTConfig.deleteMany({
                where: {
                    companyId: id
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].fixedAsset.deleteMany({
                where: {
                    companyId: id
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].commissionSlab.deleteMany({
                where: {
                    companyId: id
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].gracePeriodConfig.deleteMany({
                where: {
                    companyId: id
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].preApprovedOffer.deleteMany({
                where: {
                    companyId: id
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].agentPerformance.deleteMany({
                where: {
                    companyId: id
                }
            })
        ]);
        // PERMANENT DELETE - Hard delete the company
        console.log('[Company DELETE] Permanently deleting company:', id);
        await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].company.delete({
            where: {
                id
            }
        });
        // Clear ALL caches
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].deletePattern('companies:');
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].deletePattern('users:');
        console.log('[Company DELETE] Company permanently deleted successfully');
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            message: 'Company permanently deleted from database',
            deletedCompanyId: id
        });
    } catch (error) {
        console.error('[Company DELETE] Error deleting company:', error);
        // Handle foreign key constraint errors
        if (error instanceof Error && error.message.includes('Foreign key constraint failed')) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Cannot delete company. It has related records in the system.'
            }, {
                status: 400
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to delete company',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__2884d9f0._.js.map