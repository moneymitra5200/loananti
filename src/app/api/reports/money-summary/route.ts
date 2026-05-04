import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheTTL } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr      = searchParams.get('date');
    const startDateStr = searchParams.get('startDate');
    const endDateStr   = searchParams.get('endDate');

    let startDate: Date, endDate: Date;
    if (startDateStr && endDateStr) {
      startDate = new Date(startDateStr); startDate.setHours(0, 0, 0, 0);
      endDate   = new Date(endDateStr);   endDate.setHours(23, 59, 59, 999);
    } else if (dateStr) {
      startDate = new Date(dateStr); startDate.setHours(0, 0, 0, 0);
      endDate   = new Date(dateStr); endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date(); startDate.setHours(0, 0, 0, 0);
      endDate   = new Date(); endDate.setHours(23, 59, 59, 999);
    }

    const isToday  = !dateStr && !startDateStr;
    const cacheKey = `money-summary:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached   = cache.get<object>(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Parallel fetch — all 4 queries at once, bounded
    const [transactions, allCompanies, usersWithCredit, bankAccounts] = await Promise.all([
      db.creditTransaction.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          transactionType: { in: ['CREDIT_INCREASE', 'PERSONAL_COLLECTION'] }
        },
        include: {
          user: {
            select: {
              id: true, name: true, email: true, role: true, companyId: true,
              company: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 500, // Hard cap — prevents loading thousands of rows
      }),

      cache.getOrSet('money-summary:companies', () =>
        db.company.findMany({
          where: { isActive: true },
          select: {
            id: true, name: true, code: true, companyCredit: true,
            users: {
              where: { role: { in: ['COMPANY', 'AGENT', 'STAFF', 'CASHIER'] } },
              select: { id: true, name: true, role: true, personalCredit: true, companyCredit: true }
            }
          }
        }), CacheTTL.LONG),

      cache.getOrSet('money-summary:users-credit', () =>
        db.user.findMany({
          where: {
            role: { in: ['SUPER_ADMIN', 'COMPANY', 'AGENT', 'STAFF', 'CASHIER'] },
            OR: [{ personalCredit: { gt: 0 } }, { companyCredit: { gt: 0 } }]
          },
          select: {
            id: true, name: true, email: true, role: true,
            personalCredit: true, companyCredit: true, companyId: true,
            company: { select: { name: true } }
          }
        }), CacheTTL.LONG),

      cache.getOrSet('money-summary:bank-accounts', () =>
        db.bankAccount.findMany({
          where: { isActive: true },
          select: { id: true, bankName: true, accountNumber: true, currentBalance: true, companyId: true, isDefault: true }
        }), CacheTTL.LONG),
    ]);

    // Aggregations
    const totalEMI       = transactions.filter(t => t.sourceType === 'EMI_PAYMENT').reduce((s, t) => s + t.amount, 0);
    const totalCollected = transactions.reduce((s, t) => s + t.amount, 0);

    const modes = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE'];
    const breakdownByMode: Record<string, number> = {};
    const countByMode: Record<string, number> = {};
    for (const m of modes) {
      breakdownByMode[m] = transactions.filter(t => t.paymentMode === m).reduce((s, t) => s + t.amount, 0);
      countByMode[m]     = transactions.filter(t => t.paymentMode === m).length;
    }
    breakdownByMode.OTHER = transactions.filter(t => !modes.includes(t.paymentMode)).reduce((s, t) => s + t.amount, 0);
    countByMode.OTHER     = transactions.filter(t => !modes.includes(t.paymentMode)).length;

    const companyMap   = new Map<string, any>();
    const collectorMap = new Map<string, any>();

    for (const t of transactions) {
      const cId = t.user.companyId || 'no-company';
      if (!companyMap.has(cId)) companyMap.set(cId, { id: cId, name: t.user.company?.name || 'No Company', totalEMI: 0, companyCredit: 0, personalCredit: 0, transactionCount: 0 });
      const c = companyMap.get(cId);
      c.transactionCount++;
      if (t.sourceType === 'EMI_PAYMENT') c.totalEMI += t.amount;
      if (t.creditType === 'COMPANY') c.companyCredit += t.amount;
      else c.personalCredit += t.amount;

      if (!collectorMap.has(t.userId)) collectorMap.set(t.userId, { id: t.userId, name: t.user.name || 'Unknown', role: t.user.role, company: t.user.company?.name || 'No Company', totalCollected: 0, companyCredit: 0, personalCredit: 0, transactionCount: 0 });
      const col = collectorMap.get(t.userId);
      col.totalCollected += t.amount; col.transactionCount++;
      if (t.creditType === 'COMPANY') col.companyCredit += t.amount;
      else col.personalCredit += t.amount;
    }

    const companyCreditSummary = allCompanies.map((company: any) => ({
      id: company.id, name: company.name, code: company.code,
      companyCredit: company.companyCredit,
      usersTotalPersonal: company.users.reduce((s: number, u: any) => s + u.personalCredit, 0),
      usersTotalCompany:  company.users.reduce((s: number, u: any) => s + u.companyCredit, 0),
      totalCredit: company.companyCredit + company.users.reduce((s: number, u: any) => s + u.personalCredit + u.companyCredit, 0),
      userCount: company.users.length,
    }));

    const totalPersonalCredit = usersWithCredit.reduce((s: number, u: any) => s + u.personalCredit, 0);
    const totalCompanyCredit  = usersWithCredit.reduce((s: number, u: any) => s + u.companyCredit, 0);

    const responseData = {
      success: true,
      dateRange: { start: startDate, end: endDate },
      summary: { totalEMI, totalCollected, transactionCount: transactions.length, breakdownByMode, countByMode },
      companyWiseData:   Array.from(companyMap.values()).sort((a: any, b: any) => b.totalEMI - a.totalEMI),
      collectorWiseData: Array.from(collectorMap.values()).sort((a: any, b: any) => b.totalCollected - a.totalCollected),
      companyCreditSummary,
      moneyFlow: {
        bankAccounts: bankAccounts.map((b: any) => ({ id: b.id, bankName: b.bankName, accountNumber: b.accountNumber, currentBalance: b.currentBalance, isDefault: b.isDefault })),
        totalBankBalance: bankAccounts.reduce((s: number, b: any) => s + b.currentBalance, 0),
        creditManagement: {
          usersWithCredit: usersWithCredit.map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role, personalCredit: u.personalCredit, companyCredit: u.companyCredit, totalCredit: u.personalCredit + u.companyCredit, company: u.company?.name })),
          totalPersonalCredit, totalCompanyCredit,
          grandTotal: totalPersonalCredit + totalCompanyCredit,
        },
      },
    };

    cache.set(cacheKey, responseData, isToday ? CacheTTL.MEDIUM : CacheTTL.LONG);
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Money summary fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch money summary' }, { status: 500 });
  }
}
