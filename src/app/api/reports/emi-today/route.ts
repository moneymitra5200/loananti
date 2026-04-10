import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // Use IST date — offset UTC by +5:30
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const defaultDate = nowIST.toISOString().split('T')[0];
    const dateParam = searchParams.get('date') || defaultDate;
    const companyFilter = searchParams.get('companyId') || 'ALL';

    // Build IST day boundaries
    const startOfDay = new Date(`${dateParam}T00:00:00+05:30`);
    const endOfDay = new Date(`${dateParam}T23:59:59+05:30`);

    // ── 1. Fetch all EMIs due on this date ──────────────────────
    const emiWhere: Record<string, unknown> = {
      dueDate: { gte: startOfDay, lte: endOfDay },
    };

    const emis = await db.eMISchedule.findMany({
      where: emiWhere,
      include: {
        loanApplication: {
          include: {
            company: { select: { id: true, name: true, code: true } },
            customer: { select: { id: true, name: true, phone: true } },
            sessionForm: {
              include: {
                agent: { select: { id: true, name: true, agentCode: true } },
              },
            },
            processedBy: { select: { id: true, name: true, role: true } },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            cashier: { select: { id: true, name: true, cashierCode: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // ── 2. Fetch credit transactions for collection info ─────────
    const creditTxs = await db.creditTransaction.findMany({
      where: {
        transactionDate: { gte: startOfDay, lte: endOfDay },
        sourceType: 'EMI_PAYMENT',
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    // Build a map: emiScheduleId → creditTx for quick lookup
    const creditTxMap = new Map<string, typeof creditTxs[0]>();
    for (const tx of creditTxs) {
      if (tx.emiScheduleId) creditTxMap.set(tx.emiScheduleId, tx);
    }

    // ── 3. Filter by company ────────────────────────────────────
    const filteredEmis = companyFilter === 'ALL'
      ? emis
      : emis.filter(e => e.loanApplication?.companyId === companyFilter);

    // ── 4. Build row data ────────────────────────────────────────
    const rows = filteredEmis.map(emi => {
      const loan = emi.loanApplication;
      const company = loan?.company;
      const customer = loan?.customer;
      const agent = loan?.sessionForm?.agent;
      const staff = loan?.processedBy;
      const payment = emi.payments?.[0];
      const creditTx = creditTxMap.get(emi.id);

      const isCollected = ['PAID', 'INTEREST_ONLY_PAID', 'PARTIALLY_PAID'].includes(emi.paymentStatus);

      const customerName = `${loan?.firstName || ''} ${loan?.lastName || ''}`.trim() || customer?.name || 'N/A';

      return {
        emiId: emi.id,
        loanId: loan?.id || '',
        applicationNo: loan?.applicationNo || '',
        companyId: company?.id || '',
        companyName: company?.name || 'N/A',
        companyCode: company?.code || '',
        customerName,
        customerPhone: customer?.phone || loan?.phone || '',
        emiNumber: emi.installmentNumber,
        dueDate: emi.dueDate?.toISOString() || '',
        dueAmount: emi.totalAmount,
        principalDue: emi.principalAmount,
        interestDue: emi.interestAmount,
        penaltyAmount: emi.penaltyAmount || 0,
        waivedAmount: emi.waivedAmount || 0,
        status: emi.paymentStatus,
        isCollected,
        // Collected fields
        paidAmount: isCollected ? (emi.paidAmount || 0) : 0,
        paidPrincipal: isCollected ? (emi.paidPrincipal || 0) : 0,
        paidInterest: isCollected ? (emi.paidInterest || 0) : 0,
        paidDate: emi.paidDate?.toISOString() || null,
        paymentMode: emi.paymentMode || payment?.paymentMode || '',
        paymentRef: payment?.utrNumber || payment?.transactionId || '',
        // Who collected
        collectedById: creditTx?.userId || payment?.cashierId || '',
        collectedByName: creditTx?.user?.name || payment?.cashier?.name || '',
        collectedByRole: creditTx?.user?.role || '',
        // Agent & Staff
        agentId: agent?.id || '',
        agentName: agent?.name || '',
        agentCode: agent?.agentCode || '',
        staffId: staff?.id || '',
        staffName: staff?.name || '',
        staffRole: staff?.role || '',
      };
    });

    // ── 5. Summary ───────────────────────────────────────────────
    const totalDue = rows.length;
    const collected = rows.filter(r => r.isCollected);
    const notCollected = rows.filter(r => !r.isCollected);

    const summary = {
      date: dateParam,
      totalEmisDue: totalDue,
      totalCollected: collected.length,
      totalNotCollected: notCollected.length,
      totalAmountDue: rows.reduce((s, r) => s + r.dueAmount, 0),
      totalAmountCollected: collected.reduce((s, r) => s + r.paidAmount, 0),
      totalPrincipalCollected: collected.reduce((s, r) => s + r.paidPrincipal, 0),
      totalInterestCollected: collected.reduce((s, r) => s + r.paidInterest, 0),
      totalPenaltyCollected: collected.reduce((s, r) => s + Math.max(0, r.penaltyAmount - r.waivedAmount), 0),
      totalCash: collected.filter(r => r.paymentMode === 'CASH').reduce((s, r) => s + r.paidAmount, 0),
      totalOnline: collected.filter(r => ['ONLINE', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'SPLIT'].includes(r.paymentMode)).reduce((s, r) => s + r.paidAmount, 0),
    };

    // ── 6. Company-wise breakdown ────────────────────────────────
    const companyBreakdown: Record<string, {
      companyId: string; companyName: string; companyCode: string;
      totalDue: number; collected: number; notCollected: number;
      amountDue: number; amountCollected: number;
    }> = {};

    for (const row of rows) {
      if (!companyBreakdown[row.companyId]) {
        companyBreakdown[row.companyId] = {
          companyId: row.companyId,
          companyName: row.companyName,
          companyCode: row.companyCode,
          totalDue: 0, collected: 0, notCollected: 0,
          amountDue: 0, amountCollected: 0,
        };
      }
      const cb = companyBreakdown[row.companyId];
      cb.totalDue++;
      cb.amountDue += row.dueAmount;
      if (row.isCollected) {
        cb.collected++;
        cb.amountCollected += row.paidAmount;
      } else {
        cb.notCollected++;
      }
    }

    // ── 7. Unique company list for filter dropdown ───────────────
    const companies = await db.company.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      date: dateParam,
      summary,
      companyBreakdown: Object.values(companyBreakdown),
      rows,
      companies,
    });

  } catch (error) {
    console.error('[emi-today] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 });
  }
}
