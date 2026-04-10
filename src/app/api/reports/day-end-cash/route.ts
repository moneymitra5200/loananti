import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Build date range for the given day (UTC)
    const startOfDay = new Date(`${dateParam}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateParam}T23:59:59.999Z`);

    // Fetch all payments on that day
    const payments = await db.payment.findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: { in: ['COMPLETED', 'PENDING'] },
        deletedAt: null,
      },
    });

    // Also fetch credit transactions (which track paidById for EMI collections)
    const creditTxs = await db.creditTransaction.findMany({
      where: {
        transactionDate: { gte: startOfDay, lte: endOfDay },
        sourceType: 'EMI_PAYMENT',
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    // Group credit transactions by agent (userId = agent who collected)
    const agentMap = new Map<string, {
      agentId: string;
      agentName: string;
      agentRole: string;
      emisCollected: number;
      principal: number;
      interest: number;
      penaltyCharged: number;
      penaltyWaived: number;
      netPenalty: number;
      cashAmount: number;
      onlineAmount: number;
      total: number;
    }>();

    for (const tx of creditTxs) {
      const agentId = tx.userId;
      const agentName = tx.user?.name || 'Unknown';
      const agentRole = tx.user?.role || 'UNKNOWN';

      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, {
          agentId, agentName, agentRole,
          emisCollected: 0, principal: 0, interest: 0,
          penaltyCharged: 0, penaltyWaived: 0, netPenalty: 0,
          cashAmount: 0, onlineAmount: 0, total: 0,
        });
      }

      const row = agentMap.get(agentId)!;
      row.emisCollected += 1;
      row.principal += tx.principalComponent || 0;
      row.interest += tx.interestComponent || 0;

      const mode = (tx.paymentMode || '').toUpperCase();
      if (mode === 'CASH') {
        row.cashAmount += tx.amount;
      } else if (mode === 'SPLIT') {
        row.cashAmount += tx.amount / 2;
        row.onlineAmount += tx.amount / 2;
      } else {
        row.onlineAmount += tx.amount;
      }
      row.total += tx.amount;
    }

    // Aggregate penalty data from payments
    for (const payment of payments) {
      const paidById = payment.paidById;
      if (!paidById) continue;
      const row = agentMap.get(paidById);
      if (row) {
        row.penaltyCharged += payment.penaltyComponent || 0;
      }
    }

    const agents = Array.from(agentMap.values()).map(row => ({
      ...row,
      netPenalty: Math.max(0, row.penaltyCharged - row.penaltyWaived),
    }));
    agents.sort((a, b) => b.total - a.total);

    const summary = {
      totalCash: agents.reduce((s, a) => s + a.cashAmount, 0),
      totalOnline: agents.reduce((s, a) => s + a.onlineAmount, 0),
      totalPenalty: agents.reduce((s, a) => s + a.penaltyCharged, 0),
      totalWaived: agents.reduce((s, a) => s + a.penaltyWaived, 0),
      grandTotal: agents.reduce((s, a) => s + a.total, 0),
    };

    return NextResponse.json({ success: true, date: dateParam, summary, agents });
  } catch (error) {
    console.error('[day-end-cash] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 });
  }
}
