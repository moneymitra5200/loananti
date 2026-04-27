import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/credit/today-credit
 * Returns credit increases per user + company breakdown.
 * Supports:
 *   ?date=YYYY-MM-DD        → single day (default: today)
 *   ?startDate=...&endDate= → date range
 *
 * Rules:
 * - SUPER_ADMIN transactions are excluded.
 * - Mirror loan transactions are excluded (only original loan data shown).
 * - ALL payment modes included (CASH, ONLINE, UPI, BANK_TRANSFER, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam      = searchParams.get('date');
    const startDateParam = searchParams.get('startDate');
    const endDateParam   = searchParams.get('endDate');

    let startOfRange: Date;
    let endOfRange: Date;
    let isRange = false;

    if (startDateParam && endDateParam) {
      isRange = true;
      startOfRange = new Date(startDateParam);
      startOfRange.setHours(0, 0, 0, 0);
      endOfRange = new Date(endDateParam);
      endOfRange.setHours(23, 59, 59, 999);
    } else {
      const targetDate = dateParam ? new Date(dateParam) : new Date();
      startOfRange = new Date(targetDate);
      startOfRange.setHours(0, 0, 0, 0);
      endOfRange = new Date(targetDate);
      endOfRange.setHours(23, 59, 59, 999);
    }

    // ── Step 1: Get all mirror loan IDs so we can exclude them ──────────────
    const mirrorMappings = await db.mirrorLoanMapping.findMany({
      select: { mirrorLoanId: true },
      where: { mirrorLoanId: { not: null } },
    });
    const mirrorLoanIds = new Set(
      mirrorMappings.map(m => m.mirrorLoanId).filter(Boolean) as string[]
    );

    // ── Step 2: Fetch all credit-increase transactions in range ──────────────
    // Include ALL payment modes (CASH, ONLINE, UPI, etc.)
    // Exclude SUPER_ADMIN users
    const txs = await db.creditTransaction.findMany({
      where: {
        transactionType: { in: ['CREDIT_INCREASE', 'PERSONAL_COLLECTION'] },
        createdAt: { gte: startOfRange, lte: endOfRange },
        user: { role: { not: 'SUPER_ADMIN' } },
      },
      include: {
        user: {
          select: {
            id: true, name: true, email: true, role: true,
            company: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ── Step 3: Filter out mirror loan transactions ──────────────────────────
    const filteredTxs = txs.filter(tx => {
      const loanAppId = (tx as any).loanApplicationId;
      if (!loanAppId) return true;                    // no loan linked → keep
      return !mirrorLoanIds.has(loanAppId);           // exclude if it's a mirror loan
    });

    // ── Step 4: Collect unique loanApplicationIds for company lookup ─────────
    const loanAppIds = [...new Set(
      filteredTxs.map(tx => (tx as any).loanApplicationId).filter(Boolean)
    )];

    const loanApps = loanAppIds.length > 0
      ? await db.loanApplication.findMany({
          where: { id: { in: loanAppIds } },
          select: { id: true, companyId: true },
        })
      : [];

    const loanAppCompanyIdMap = new Map(loanApps.map(la => [la.id, la.companyId]));

    const allCompanyIds = [...new Set(loanApps.map(la => la.companyId).filter(Boolean))] as string[];
    const companies = allCompanyIds.length > 0
      ? await db.company.findMany({
          where: { id: { in: allCompanyIds } },
          select: { id: true, name: true },
        })
      : [];
    const companyNameMap = new Map(companies.map(c => [c.id, c.name]));

    // ── Step 5: Group by user ────────────────────────────────────────────────
    const userMap = new Map<string, {
      userId: string; userName: string; userRole: string; userEmail: string;
      userCompanyName: string | null;
      totalIncrease: number; personalIncrease: number; companyIncrease: number;
      cashAmount: number; onlineAmount: number;
      transactionCount: number;
      companyBreakdown: Map<string, { companyId: string; companyName: string; amount: number }>;
      transactions: any[];
    }>();

    for (const tx of filteredTxs) {
      const u = tx.user;
      if (!u) continue;

      if (!userMap.has(u.id)) {
        userMap.set(u.id, {
          userId: u.id,
          userName: u.name || 'Unknown',
          userRole: u.role,
          userEmail: u.email,
          userCompanyName: u.company?.name || null,
          totalIncrease: 0,
          personalIncrease: 0,
          companyIncrease: 0,
          cashAmount: 0,
          onlineAmount: 0,
          transactionCount: 0,
          companyBreakdown: new Map(),
          transactions: [],
        });
      }

      const entry = userMap.get(u.id)!;
      const amt = Number(tx.amount) || 0;
      entry.totalIncrease += amt;
      entry.transactionCount++;

      if (tx.creditType === 'PERSONAL') entry.personalIncrease += amt;
      else entry.companyIncrease += amt;

      // Track cash vs online amounts
      const mode = (tx.paymentMode || '').toUpperCase();
      if (mode === 'CASH') entry.cashAmount += amt;
      else entry.onlineAmount += amt;

      // Resolve company for this transaction
      const loanAppId = (tx as any).loanApplicationId;
      let targetCompanyId: string | null = (tx as any).targetCompanyId || null;
      let targetCompanyName = (tx as any).targetCompanyName || '';

      if (!targetCompanyId && loanAppId) {
        const cid = loanAppCompanyIdMap.get(loanAppId);
        if (cid) {
          targetCompanyId = cid;
          targetCompanyName = companyNameMap.get(cid) || '';
        }
      }
      if (!targetCompanyName) targetCompanyName = u.company?.name || 'Unknown';

      if (targetCompanyId) {
        if (!entry.companyBreakdown.has(targetCompanyId)) {
          entry.companyBreakdown.set(targetCompanyId, {
            companyId: targetCompanyId, companyName: targetCompanyName, amount: 0,
          });
        }
        entry.companyBreakdown.get(targetCompanyId)!.amount += amt;
      }

      entry.transactions.push({
        id: tx.id,
        amount: amt,
        creditType: tx.creditType,
        sourceType: tx.sourceType,
        transactionType: tx.transactionType,
        paymentMode: tx.paymentMode,
        description: tx.description,
        customerName: (tx as any).customerName,
        loanApplicationNo: (tx as any).loanApplicationNo,
        installmentNumber: (tx as any).installmentNumber,
        transactionDate: tx.transactionDate || tx.createdAt,
        createdAt: tx.createdAt,
      });
    }

    const users = [...userMap.values()].map(u => ({
      ...u,
      companyBreakdown: [...u.companyBreakdown.values()].sort((a, b) => b.amount - a.amount),
    })).sort((a, b) => b.totalIncrease - a.totalIncrease);

    const grandTotal    = users.reduce((s, u) => s + u.totalIncrease, 0);
    const grandPersonal = users.reduce((s, u) => s + u.personalIncrease, 0);
    const grandCompany  = users.reduce((s, u) => s + u.companyIncrease, 0);
    const grandCash     = users.reduce((s, u) => s + u.cashAmount, 0);
    const grandOnline   = users.reduce((s, u) => s + u.onlineAmount, 0);

    return NextResponse.json({
      success: true,
      isRange,
      date:      !isRange ? (dateParam || new Date().toISOString().split('T')[0]) : undefined,
      startDate: isRange  ? startDateParam : undefined,
      endDate:   isRange  ? endDateParam   : undefined,
      summary: {
        total: grandTotal,
        personal: grandPersonal,
        company: grandCompany,
        cash: grandCash,
        online: grandOnline,
        userCount: users.length,
      },
      users,
    });
  } catch (error: any) {
    console.error('[TodayCredit] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
