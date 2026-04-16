import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/credit/today-credit
 * Returns today's (or a given date's) credit increases per user + company breakdown.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all credit-increase transactions today
    const txs = await db.creditTransaction.findMany({
      where: {
        transactionType: { in: ['CREDIT_INCREASE', 'PERSONAL_COLLECTION'] },
        createdAt: { gte: startOfDay, lte: endOfDay },
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

    // Group by user
    const userMap = new Map<string, {
      userId: string; userName: string; userRole: string; userEmail: string;
      userCompanyName: string | null;
      totalIncrease: number; personalIncrease: number; companyIncrease: number;
      transactionCount: number;
      // Company breakdown (which company's EMI they collected)
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
      entry.totalIncrease += amt;
      entry.transactionCount++;
      if (tx.creditType === 'PERSONAL') entry.personalIncrease += amt;
      else entry.companyIncrease += amt;

      // Try to determine which company's loan this EMI belongs to
      const targetCompanyId = (tx as any).targetCompanyId || (tx as any).companyId;
      const targetCompanyName: string = (tx as any).targetCompanyName || u?.company?.name || 'Unknown';
      if (targetCompanyId) {
        if (!entry.companyBreakdown.has(targetCompanyId)) {
          entry.companyBreakdown.set(targetCompanyId, { companyId: targetCompanyId, companyName: targetCompanyName, amount: 0 });
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

    const grandTotal = users.reduce((s, u) => s + u.totalIncrease, 0);
    const grandPersonal = users.reduce((s, u) => s + u.personalIncrease, 0);
    const grandCompany = users.reduce((s, u) => s + u.companyIncrease, 0);

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      summary: { total: grandTotal, personal: grandPersonal, company: grandCompany, userCount: users.length },
      users,
    });
  } catch (error: any) {
    console.error('[TodayCredit] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
