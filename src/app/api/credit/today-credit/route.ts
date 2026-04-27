import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/credit/today-credit
 * Returns credit increases per user + company breakdown.
 * Supports:
 *   ?date=YYYY-MM-DD        → single day (default: today)
 *   ?startDate=...&endDate= → date range
 * SUPER_ADMIN transactions are always excluded from this view.
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
      // Date range mode
      isRange = true;
      startOfRange = new Date(startDateParam);
      startOfRange.setHours(0, 0, 0, 0);
      endOfRange = new Date(endDateParam);
      endOfRange.setHours(23, 59, 59, 999);
    } else {
      // Single date mode
      const targetDate = dateParam ? new Date(dateParam) : new Date();
      startOfRange = new Date(targetDate);
      startOfRange.setHours(0, 0, 0, 0);
      endOfRange = new Date(targetDate);
      endOfRange.setHours(23, 59, 59, 999);
    }

    // Get all credit-increase transactions in the range
    // EXCLUDE SUPER_ADMIN users from this view
    const txs = await db.creditTransaction.findMany({
      where: {
        transactionType: { in: ['CREDIT_INCREASE', 'PERSONAL_COLLECTION'] },
        createdAt: { gte: startOfRange, lte: endOfRange },
        user: { role: { not: 'SUPER_ADMIN' } }, // ← Exclude Super Admin
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

    // Collect all unique loanApplicationIds to batch-fetch company info
    const loanAppIds = [...new Set(
      txs.map(tx => (tx as any).loanApplicationId).filter(Boolean)
    )];

    // Batch-fetch loan application company info
    const loanApps = loanAppIds.length > 0
      ? await db.loanApplication.findMany({
          where: { id: { in: loanAppIds } },
          select: {
            id: true,
            companyId: true,
          },
        })
      : [];
    // Build a companyId map from loan apps
    const loanAppCompanyIdMap = new Map(loanApps.map(la => [la.id, la.companyId]));

    // Batch-fetch company names for all referenced companyIds
    const allCompanyIds = [...new Set(loanApps.map(la => la.companyId).filter(Boolean))] as string[];
    const companies = allCompanyIds.length > 0
      ? await db.company.findMany({ where: { id: { in: allCompanyIds } }, select: { id: true, name: true } })
      : [];
    const companyNameMap = new Map(companies.map(c => [c.id, c.name]));

    // Group by user
    const userMap = new Map<string, {
      userId: string; userName: string; userRole: string; userEmail: string;
      userCompanyName: string | null;
      totalIncrease: number; personalIncrease: number; companyIncrease: number;
      transactionCount: number;
      companyBreakdown: Map<string, { companyId: string; companyName: string; amount: number }>;
      transactions: any[];
    }>();

    for (const tx of txs) {
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
          transactionCount: 0,
          companyBreakdown: new Map(),
          transactions: [],
        });
      }
      const entry = userMap.get(u.id)!;
      const amt = Number(tx.amount) || 0;
      entry.totalIncrease   += amt;
      entry.transactionCount++;
      if (tx.creditType === 'PERSONAL') entry.personalIncrease += amt;
      else entry.companyIncrease += amt;

      // Resolve which company this EMI belongs to
      const loanAppId = (tx as any).loanApplicationId;
      let targetCompanyId: string | null   = (tx as any).targetCompanyId || (tx as any).companyId || null;
      let targetCompanyName: string        = (tx as any).targetCompanyName || '';

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
            companyId: targetCompanyId, companyName: targetCompanyName, amount: 0
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
      companyBreakdown: [...u.companyBreakdown.values()],
    })).sort((a, b) => b.totalIncrease - a.totalIncrease);

    const grandTotal    = users.reduce((s, u) => s + u.totalIncrease,   0);
    const grandPersonal = users.reduce((s, u) => s + u.personalIncrease, 0);
    const grandCompany  = users.reduce((s, u) => s + u.companyIncrease,  0);

    return NextResponse.json({
      success: true,
      isRange,
      date:      !isRange ? (dateParam || new Date().toISOString().split('T')[0]) : undefined,
      startDate: isRange  ? startDateParam : undefined,
      endDate:   isRange  ? endDateParam   : undefined,
      summary: { total: grandTotal, personal: grandPersonal, company: grandCompany, userCount: users.length },
      users,
    });
  } catch (error: any) {
    console.error('[TodayCredit] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
