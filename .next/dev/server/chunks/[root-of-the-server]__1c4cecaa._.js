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
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/Desktop/reallll/src/utils/helpers.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// EMI Calculation Engine
__turbopack_context__.s([
    "calculateEMI",
    ()=>calculateEMI,
    "calculateRiskScore",
    ()=>calculateRiskScore,
    "copyToClipboard",
    ()=>copyToClipboard,
    "debounce",
    ()=>debounce,
    "formatCurrency",
    ()=>formatCurrency,
    "formatDate",
    ()=>formatDate,
    "formatNumber",
    ()=>formatNumber,
    "generateApplicationNo",
    ()=>generateApplicationNo,
    "generateCode",
    ()=>generateCode,
    "generateReceiptNo",
    ()=>generateReceiptNo,
    "generateReceiptNumber",
    ()=>generateReceiptNumber,
    "generateTransactionId",
    ()=>generateTransactionId,
    "getRiskLevel",
    ()=>getRiskLevel,
    "getStatusColor",
    ()=>getStatusColor,
    "getStatusLabel",
    ()=>getStatusLabel,
    "truncateText",
    ()=>truncateText,
    "validateAadhaar",
    ()=>validateAadhaar,
    "validateEmail",
    ()=>validateEmail,
    "validateIFSC",
    ()=>validateIFSC,
    "validatePAN",
    ()=>validatePAN,
    "validatePassword",
    ()=>validatePassword,
    "validatePhone",
    ()=>validatePhone
]);
function calculateEMI(principal, annualInterestRate, tenureMonths, interestType = 'FLAT', startDate = new Date()) {
    // Handle backwards compatibility where interestType might be a Date
    const actualInterestType = typeof interestType === 'string' ? interestType : 'FLAT';
    const actualStartDate = typeof interestType === 'object' && interestType instanceof Date ? interestType : startDate;
    const monthlyRate = annualInterestRate / 12 / 100;
    let emi;
    let totalInterest;
    let totalAmount;
    if (actualInterestType === 'FLAT') {
        // FLAT Interest: Interest is calculated on the full principal for the entire tenure
        // Formula: EMI = (Principal + Total Interest) / Tenure
        // Total Interest = Principal * Rate * Tenure / 100
        totalInterest = Math.round(principal * annualInterestRate * tenureMonths / 1200 * 100) / 100;
        totalAmount = principal + totalInterest;
        emi = Math.round(totalAmount / tenureMonths * 100) / 100;
    } else {
        // REDUCING Balance: Standard EMI formula
        // Formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
        if (monthlyRate === 0) {
            emi = principal / tenureMonths;
        } else {
            const ratePowerN = Math.pow(1 + monthlyRate, tenureMonths);
            emi = principal * monthlyRate * ratePowerN / (ratePowerN - 1);
        }
        totalAmount = emi * tenureMonths;
        totalInterest = totalAmount - principal;
    }
    const schedule = [];
    let outstandingPrincipal = principal;
    for(let i = 1; i <= tenureMonths; i++){
        let interestForMonth;
        let principalForMonth;
        if (actualInterestType === 'FLAT') {
            // For FLAT, interest is same every month
            interestForMonth = principal * annualInterestRate / 1200;
            principalForMonth = emi - interestForMonth;
            outstandingPrincipal = Math.max(0, outstandingPrincipal - principalForMonth);
        } else {
            // For REDUCING, interest is on outstanding balance
            interestForMonth = outstandingPrincipal * monthlyRate;
            principalForMonth = emi - interestForMonth;
            outstandingPrincipal = Math.max(0, outstandingPrincipal - principalForMonth);
        }
        const dueDate = new Date(actualStartDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        schedule.push({
            installmentNumber: i,
            dueDate,
            principal: Math.round(principalForMonth * 100) / 100,
            interest: Math.round(interestForMonth * 100) / 100,
            totalAmount: Math.round(emi * 100) / 100,
            outstandingPrincipal: Math.round(outstandingPrincipal * 100) / 100
        });
    }
    return {
        emi: Math.round(emi * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        schedule
    };
}
function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount);
}
function formatNumber(num) {
    return new Intl.NumberFormat('en-IN').format(num);
}
function generateApplicationNo() {
    const prefix = 'LA';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}
function generateTransactionId() {
    const prefix = 'TXN';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}
function generateReceiptNo() {
    const prefix = 'RCP';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}
function validatePAN(pan) {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
}
function validateIFSC(ifsc) {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc.toUpperCase());
}
function validateAadhaar(aadhaar) {
    const aadhaarRegex = /^[2-9]{1}[0-9]{3}[0-9]{4}[0-9]{4}$/;
    return aadhaarRegex.test(aadhaar.replace(/\s/g, ''));
}
function validatePhone(phone) {
    const phoneRegex = /^[6-9][0-9]{9}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
}
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function calculateRiskScore(params) {
    let score = 0;
    if (params.multipleApplications) score += 15;
    if (params.activeLoans > 3) score += 20;
    else if (params.activeLoans > 1) score += 10;
    const ratio = params.requestedAmount / (params.income * 12);
    if (ratio > 5) score += 25;
    else if (ratio > 3) score += 15;
    else if (ratio > 1) score += 5;
    if (params.overdueHistory) score += 30;
    if (params.employmentType === 'UNEMPLOYED') score += 20;
    else if (params.employmentType === 'SELF_EMPLOYED') score += 5;
    return Math.min(100, score);
}
function getRiskLevel(score) {
    if (score < 20) return 'LOW';
    if (score < 40) return 'MEDIUM';
    if (score < 60) return 'HIGH';
    return 'CRITICAL';
}
function generateCode(prefix) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}
const generateReceiptNumber = generateReceiptNo;
function validatePassword(password) {
    const errors = [];
    if (password.length < 6) errors.push('Password must be at least 6 characters');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
    return {
        valid: errors.length === 0,
        errors
    };
}
function getStatusColor(status) {
    const colors = {
        SUBMITTED: 'bg-blue-100 text-blue-700',
        SA_APPROVED: 'bg-emerald-100 text-emerald-700',
        COMPANY_APPROVED: 'bg-teal-100 text-teal-700',
        AGENT_APPROVED_STAGE1: 'bg-cyan-100 text-cyan-700',
        LOAN_FORM_COMPLETED: 'bg-violet-100 text-violet-700',
        SESSION_CREATED: 'bg-amber-100 text-amber-700',
        CUSTOMER_SESSION_APPROVED: 'bg-green-100 text-green-700',
        FINAL_APPROVED: 'bg-green-100 text-green-700',
        ACTIVE: 'bg-green-100 text-green-700',
        DISBURSED: 'bg-blue-100 text-blue-700',
        REJECTED_BY_SA: 'bg-red-100 text-red-700',
        REJECTED_BY_COMPANY: 'bg-red-100 text-red-700',
        REJECTED_FINAL: 'bg-red-100 text-red-700',
        SESSION_REJECTED: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
}
function getStatusLabel(status) {
    const labels = {
        SUBMITTED: 'New Application',
        SA_APPROVED: 'SA Approved',
        COMPANY_APPROVED: 'Company Approved',
        AGENT_APPROVED_STAGE1: 'Agent Approved',
        LOAN_FORM_COMPLETED: 'Verification Complete',
        SESSION_CREATED: 'Sanction Created',
        CUSTOMER_SESSION_APPROVED: 'Customer Approved',
        FINAL_APPROVED: 'Final Approved',
        ACTIVE: 'Active',
        DISBURSED: 'Disbursed',
        REJECTED_BY_SA: 'Rejected',
        REJECTED_BY_COMPANY: 'Rejected',
        REJECTED_FINAL: 'Rejected',
        SESSION_REJECTED: 'Sanction Rejected'
    };
    return labels[status] || status;
}
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}
function debounce(func, wait) {
    let timeout;
    return (...args)=>{
        clearTimeout(timeout);
        timeout = setTimeout(()=>func(...args), wait);
    };
}
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    return new Promise((resolve, reject)=>{
        if (document.execCommand('copy')) {
            resolve();
        } else {
            reject(new Error('Failed to copy text'));
        }
        textArea.remove();
    });
} // Force recompile Thu Mar 12 19:07:56 UTC 2026
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
"[project]/Desktop/reallll/src/app/api/user/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/node_modules/bcryptjs/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$utils$2f$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/utils/helpers.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/reallll/src/lib/cache.ts [app-route] (ecmascript)");
;
;
;
;
;
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const roleParam = searchParams.get('role');
        // Generate cache key
        const cacheKey = roleParam ? __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheKeys"].usersByRole(roleParam) : __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheKeys"].usersList();
        // Check cache first
        const cachedUsers = __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].get(cacheKey);
        if (cachedUsers) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                users: cachedUsers,
                cached: true
            });
        }
        // Build where clause properly with Prisma types
        let where = {};
        if (roleParam) {
            const roles = roleParam.split(',').map((r)=>r.trim()).filter(Boolean);
            if (roles.length === 1) {
                where = {
                    role: roles[0]
                };
            } else if (roles.length > 1) {
                where = {
                    role: {
                        in: roles
                    }
                };
            }
        }
        const users = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].user.findMany({
            where,
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                isActive: true,
                isLocked: true,
                createdAt: true,
                companyId: true,
                agentId: true,
                agentCode: true,
                staffCode: true,
                cashierCode: true,
                accountantCode: true,
                companyCredit: true,
                personalCredit: true,
                credit: true,
                profilePicture: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        isMirrorCompany: true
                    }
                },
                agent: {
                    select: {
                        id: true,
                        name: true,
                        agentCode: true
                    }
                }
            }
        });
        // Cache the result
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].set(cacheKey, users, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["CacheTTL"].MEDIUM);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to fetch users',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, {
            status: 500
        });
    }
}
async function POST(request) {
    try {
        const body = await request.json();
        const { name, email, phone, password, role, companyId, agentId, // Extended company fields
        code, address, city, state, pincode, gstNumber, panNumber, website, ownerName, ownerPhone, ownerEmail, ownerPan, ownerAadhaar, logoUrl, isMirrorCompany, mirrorInterestRate, mirrorInterestType, accountingType, defaultInterestRate, defaultInterestType } = body;
        // Convert empty strings to null for foreign key fields
        // AGENT, CASHIER, and ACCOUNTANT are common for all companies - no company selection needed
        const rolesWithoutCompany = [
            'AGENT',
            'CASHIER',
            'ACCOUNTANT'
        ];
        const cleanCompanyId = rolesWithoutCompany.includes(role) ? null : companyId && companyId.trim() !== '' ? companyId : null;
        const cleanAgentId = agentId && agentId.trim() !== '' ? agentId : null;
        console.log('[User API] Creating user:', {
            name,
            email,
            role,
            companyId: cleanCompanyId,
            agentId: cleanAgentId
        });
        if (!name || !email || !password || !role) {
            console.log('[User API] Missing required fields');
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Missing required fields: name, email, password, role'
            }, {
                status: 400
            });
        }
        const existingUser = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].user.findUnique({
            where: {
                email
            }
        });
        if (existingUser) {
            console.log('[User API] User already exists:', email);
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'User with this email already exists'
            }, {
                status: 400
            });
        }
        const hashedPassword = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"].hash(password, 10);
        const firebaseUid = `email-${Date.now()}`;
        let userCompanyId = cleanCompanyId;
        let createdCompany = null;
        // Create company if role is COMPANY and no company specified
        if (role === 'COMPANY' && !cleanCompanyId) {
            // Use user-provided code OR generate unique code
            let companyCode;
            if (code && code.trim()) {
                // User provided a code - use it exactly as provided
                companyCode = code.trim().toUpperCase();
                console.log('[User API] Using user-provided code:', companyCode);
                // Check if this code already exists
                const existingCompany = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].company.findUnique({
                    where: {
                        code: companyCode
                    }
                });
                if (existingCompany) {
                    return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        error: `Company code "${companyCode}" already exists. Please use a different code.`,
                        field: 'code'
                    }, {
                        status: 400
                    });
                }
            } else {
                // No code provided - auto-generate unique code
                companyCode = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$utils$2f$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateCode"])('COMP');
                let attempts = 0;
                const maxAttempts = 5;
                // Check if code exists and regenerate if needed
                while(attempts < maxAttempts){
                    const existingCompany = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].company.findUnique({
                        where: {
                            code: companyCode
                        }
                    });
                    if (!existingCompany) {
                        break; // Code is unique
                    }
                    // Code exists, generate new one
                    attempts++;
                    companyCode = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$utils$2f$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateCode"])('COMP');
                    console.log(`[User API] Code collision, regenerating (attempt ${attempts}):`, companyCode);
                    if (attempts >= maxAttempts) {
                        // If still colliding after max attempts, add extra randomness
                        companyCode = `COMP${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                    }
                }
                console.log('[User API] Auto-generated unique code:', companyCode);
            }
            console.log('[User API] Creating company with code:', companyCode);
            console.log('[User API] Company data:', {
                name,
                code: companyCode,
                email,
                isMirrorCompany,
                mirrorInterestRate,
                mirrorInterestType
            });
            try {
                createdCompany = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].company.create({
                    data: {
                        name,
                        code: companyCode,
                        contactEmail: email,
                        contactPhone: phone || null,
                        address: address || null,
                        city: city || null,
                        state: state || null,
                        pincode: pincode || null,
                        gstNumber: gstNumber || null,
                        panNumber: panNumber || null,
                        website: website || null,
                        ownerName: ownerName || null,
                        ownerPhone: ownerPhone || null,
                        ownerEmail: ownerEmail || null,
                        ownerPan: ownerPan || null,
                        ownerAadhaar: ownerAadhaar || null,
                        logoUrl: logoUrl || null,
                        isMirrorCompany: isMirrorCompany !== undefined ? isMirrorCompany : true,
                        mirrorInterestRate: mirrorInterestRate ?? null,
                        mirrorInterestType: mirrorInterestType || 'REDUCING',
                        accountingType: accountingType || 'FULL',
                        defaultInterestRate: defaultInterestRate || 12,
                        defaultInterestType: defaultInterestType || 'FLAT',
                        isActive: true
                    }
                });
                userCompanyId = createdCompany.id;
                console.log('[User API] Company created successfully:', createdCompany.id);
            } catch (companyError) {
                console.error('[User API] Error creating company:', companyError);
                if (companyError instanceof Error) {
                    console.error('[User API] Company error message:', companyError.message);
                    // Check for unique constraint violation
                    if (companyError.message.includes('Unique constraint') || companyError.message.includes('code')) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                            error: 'Company code already exists. Please try again.',
                            details: companyError.message
                        }, {
                            status: 400
                        });
                    }
                }
                throw companyError;
            }
        }
        // Validate that company exists if companyId is provided (not for roles that are ecosystem-wide)
        const ecosystemWideRoles = [
            'AGENT',
            'CASHIER',
            'ACCOUNTANT'
        ];
        if (userCompanyId && role !== 'COMPANY' && !ecosystemWideRoles.includes(role)) {
            const companyExists = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].company.findUnique({
                where: {
                    id: userCompanyId
                }
            });
            if (!companyExists) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Selected company does not exist'
                }, {
                    status: 400
                });
            }
        }
        // Validate that agent exists if agentId is provided
        if (cleanAgentId && role === 'STAFF') {
            const agentExists = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].user.findUnique({
                where: {
                    id: cleanAgentId,
                    role: 'AGENT'
                }
            });
            if (!agentExists) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Selected agent does not exist'
                }, {
                    status: 400
                });
            }
        }
        const roleCodes = {
            AGENT: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$utils$2f$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateCode"])('AG'),
            STAFF: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$utils$2f$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateCode"])('ST'),
            CASHIER: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$utils$2f$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateCode"])('CS'),
            ACCOUNTANT: (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$utils$2f$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateCode"])('ACC')
        };
        console.log('[User API] Creating user record with role:', role);
        console.log('[User API] User data:', {
            name,
            email,
            role,
            companyId: userCompanyId,
            agentId: role === 'STAFF' ? cleanAgentId : null
        });
        let user;
        try {
            user = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].user.create({
                data: {
                    name,
                    email,
                    phone: phone || null,
                    password: hashedPassword,
                    plainPassword: password,
                    firebaseUid,
                    role: role,
                    companyId: userCompanyId,
                    agentId: role === 'STAFF' ? cleanAgentId : null,
                    agentCode: role === 'AGENT' ? roleCodes.AGENT : null,
                    staffCode: role === 'STAFF' ? roleCodes.STAFF : null,
                    cashierCode: role === 'CASHIER' ? roleCodes.CASHIER : null,
                    accountantCode: role === 'ACCOUNTANT' ? roleCodes.ACCOUNTANT : null,
                    // Commission removed - no one takes commission in this system
                    commissionRate: 0,
                    lastLoginAt: new Date()
                },
                include: {
                    company: true,
                    agent: true
                }
            });
        } catch (userCreateError) {
            console.error('[User API] Error creating user record:', userCreateError);
            if (userCreateError instanceof Error) {
                console.error('[User API] User create error message:', userCreateError.message);
                // Check for common errors
                if (userCreateError.message.includes('Unique constraint')) {
                    return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        error: 'Email or code already exists. Please use a different email.',
                        details: userCreateError.message
                    }, {
                        status: 400
                    });
                }
                if (userCreateError.message.includes('foreign key')) {
                    return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        error: 'Invalid company or agent reference.',
                        details: userCreateError.message
                    }, {
                        status: 400
                    });
                }
            }
            throw userCreateError;
        }
        console.log('[User API] User created successfully:', user.id);
        await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].auditLog.create({
            data: {
                userId: user.id,
                action: 'CREATE',
                module: 'USER',
                description: `User created with role ${role}`,
                recordId: user.id,
                recordType: 'User',
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
            }
        });
        // Invalidate user cache
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invalidateUserCache"])();
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
                company: user.company,
                agentCode: user.agentCode,
                staffCode: user.staffCode,
                cashierCode: user.cashierCode,
                accountantCode: user.accountantCode
            }
        });
    } catch (error) {
        console.error('[User API] Error creating user:', error);
        // Log full error details for debugging
        if (error instanceof Error) {
            console.error('[User API] Error name:', error.name);
            console.error('[User API] Error message:', error.message);
            console.error('[User API] Error stack:', error.stack);
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to create user',
            details: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.name : 'Unknown'
        }, {
            status: 500
        });
    }
}
async function PUT(request) {
    try {
        const body = await request.json();
        const { id, name, phone, isActive, agentId } = body;
        if (!id) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'User ID is required'
            }, {
                status: 400
            });
        }
        // Protect permanent super admin from being deactivated
        const PERMANENT_SUPER_ADMIN_EMAILS = [
            'moneymitra@gmail.com'
        ];
        if (isActive === false) {
            const user = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].user.findUnique({
                where: {
                    id
                }
            });
            if (user && PERMANENT_SUPER_ADMIN_EMAILS.includes(user.email)) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Cannot deactivate the permanent Super Admin account. This account is protected.',
                    isProtected: true
                }, {
                    status: 403
                });
            }
        }
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (agentId !== undefined) updateData.agentId = agentId;
        const user = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].user.update({
            where: {
                id
            },
            data: updateData,
            include: {
                company: true,
                agent: true
            }
        });
        // Invalidate user cache
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invalidateUserCache"])(id);
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            user
        });
    } catch (error) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to update user'
        }, {
            status: 500
        });
    }
}
async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        console.log('[User DELETE] Starting permanent delete for user:', id);
        if (!id) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'User ID is required'
            }, {
                status: 400
            });
        }
        const user = await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].user.findUnique({
            where: {
                id
            }
        });
        if (!user) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'User not found'
            }, {
                status: 404
            });
        }
        // Protect permanent super admin from deletion
        const PERMANENT_SUPER_ADMIN_EMAILS = [
            'moneymitra@gmail.com'
        ];
        if (PERMANENT_SUPER_ADMIN_EMAILS.includes(user.email)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Cannot delete the permanent Super Admin account. This account is protected.',
                isProtected: true
            }, {
                status: 403
            });
        }
        // For COMPANY role users, we need to handle company deletion separately
        // This is called from CompaniesSection which handles company deletion first
        // Check for critical related records that prevent deletion
        const [loanApplications, sessionForms, payments] = await Promise.all([
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].loanApplication.count({
                where: {
                    customerId: id
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].sessionForm.count({
                where: {
                    agentId: id
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].payment.count({
                where: {
                    customerId: id
                }
            })
        ]);
        console.log('[User DELETE] Related records:', {
            loanApplications,
            sessionForms,
            payments
        });
        // These are critical - cannot delete if user has these
        if (loanApplications > 0 || sessionForms > 0 || payments > 0) {
            const relatedInfo = [];
            if (loanApplications > 0) relatedInfo.push(`${loanApplications} loan application(s)`);
            if (sessionForms > 0) relatedInfo.push(`${sessionForms} session form(s)`);
            if (payments > 0) relatedInfo.push(`${payments} payment(s)`);
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: `Cannot delete user. They have related records: ${relatedInfo.join(', ')}. Please remove or reassign these records first.`,
                hasRelations: true
            }, {
                status: 400
            });
        }
        // Delete non-critical related records (audit logs, notifications, etc.) - PERMANENT DELETE
        console.log('[User DELETE] Deleting related records...');
        await Promise.all([
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].auditLog.deleteMany({
                where: {
                    userId: id
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].notification.deleteMany({
                where: {
                    userId: id
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].workflowLog.deleteMany({
                where: {
                    actionById: id
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].locationLog.deleteMany({
                where: {
                    userId: id
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].reminder.deleteMany({
                where: {
                    userId: id
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].notificationSetting.deleteMany({
                where: {
                    userId: id
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].deviceFingerprint.deleteMany({
                where: {
                    userId: id
                }
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].blacklist.deleteMany({
                where: {
                    userId: id
                }
            })
        ]);
        // PERMANENT DELETE - Hard delete the user from database
        console.log('[User DELETE] Permanently deleting user:', id);
        await __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].user.delete({
            where: {
                id
            }
        });
        // Clear ALL caches to ensure fresh data
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["invalidateUserCache"])(id);
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].deletePattern('companies:');
        __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$src$2f$lib$2f$cache$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cache"].deletePattern('users:');
        console.log('[User DELETE] User permanently deleted successfully');
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            message: 'User permanently deleted from database',
            deletedUserId: id
        });
    } catch (error) {
        console.error('[User DELETE] Error deleting user:', error);
        // Handle Prisma foreign key constraint errors
        if (error instanceof Error && error.message.includes('Foreign key constraint failed')) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Cannot delete user. They have related records in the system. Please remove or reassign these records first.'
            }, {
                status: 400
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$reallll$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to delete user',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1c4cecaa._.js.map