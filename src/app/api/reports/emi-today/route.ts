import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheTTL } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const nowIST     = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const defaultDate = nowIST.toISOString().split('T')[0];
    const dateParam   = searchParams.get('date') || defaultDate;
    const companyFilter = searchParams.get('companyId') || 'ALL';
    const isToday = dateParam === defaultDate;

    // Cache key includes company filter — different filters = different cache entries
    const cacheKey = `report:emi-today:${dateParam}:${companyFilter}`;
    const cached = cache.get<object>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const startOfDay = new Date(`${dateParam}T00:00:00+05:30`);
    const endOfDay   = new Date(`${dateParam}T23:59:59+05:30`);

    // Build company-specific EMI where clause
    const emiWhere: Record<string, unknown> = {
      dueDate: { gte: startOfDay, lte: endOfDay },
    };

    // Run EMIs + credit transactions + company list in PARALLEL
    const [emis, creditTxs, companies] = await Promise.all([
      db.eMISchedule.findMany({
        where: emiWhere,
        include: {
          loanApplication: {
            include: {
              company:     { select: { id: true, name: true, code: true } },
              customer:    { select: { id: true, name: true, phone: true } },
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
        take: 500, // Safety cap: a single day rarely has >500 EMIs due
      }),
      db.creditTransaction.findMany({
        where: {
          transactionDate: { gte: startOfDay, lte: endOfDay },
          sourceType: 'EMI_PAYMENT',
        },
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
        take: 500,
      }),
      // Company list — always cached 5 min
      cache.getOrSet(
        'companies:list:basic',
        () => db.company.findMany({
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' },
        }),
        CacheTTL.LONG
      ),
    ]);

    // Build credit tx lookup map
    const creditTxMap = new Map<string, typeof creditTxs[0]>();
    for (const tx of creditTxs) {
      if (tx.emiScheduleId) creditTxMap.set(tx.emiScheduleId, tx);
    }

    // Filter by company
    const filteredEmis = companyFilter === 'ALL'
      ? emis
      : emis.filter(e => e.loanApplication?.companyId === companyFilter);

    // Build row data
    const rows = filteredEmis.map(emi => {
      const loan     = emi.loanApplication;
      const company  = loan?.company;
      const customer = loan?.customer;
      const agent    = loan?.sessionForm?.agent;
      const staff    = loan?.processedBy;
      const payment  = emi.payments?.[0];
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
        paidAmount:    isCollected ? (emi.paidAmount    || 0) : 0,
        paidPrincipal: isCollected ? (emi.paidPrincipal || 0) : 0,
        paidInterest:  isCollected ? (emi.paidInterest  || 0) : 0,
        paidDate:    emi.paidDate?.toISOString() || null,
        paymentMode: emi.paymentMode || payment?.paymentMode || '',
        paymentRef:  payment?.utrNumber || payment?.transactionId || '',
        collectedById:   creditTx?.userId    || payment?.cashierId   || '',
        collectedByName: creditTx?.user?.name || payment?.cashier?.name || '',
        collectedByRole: creditTx?.user?.role || '',
        agentId:   agent?.id   || '',
        agentName: agent?.name || '',
        agentCode: agent?.agentCode || '',
        staffId:   staff?.id   || '',
        staffName: staff?.name || '',
        staffRole: staff?.role || '',
      };
    });

    // Summary
    const collected    = rows.filter(r => r.isCollected);
    const notCollected = rows.filter(r => !r.isCollected);

    const summary = {
      date: dateParam,
      totalEmisDue:           rows.length,
      totalCollected:         collected.length,
      totalNotCollected:      notCollected.length,
      totalAmountDue:         rows.reduce((s, r) => s + r.dueAmount, 0),
      totalAmountCollected:   collected.reduce((s, r) => s + r.paidAmount, 0),
      totalPrincipalCollected: collected.reduce((s, r) => s + r.paidPrincipal, 0),
      totalInterestCollected: collected.reduce((s, r) => s + r.paidInterest, 0),
      totalPenaltyCollected:  collected.reduce((s, r) => s + Math.max(0, r.penaltyAmount - r.waivedAmount), 0),
      totalCash:   collected.filter(r => r.paymentMode === 'CASH').reduce((s, r) => s + r.paidAmount, 0),
      totalOnline: collected.filter(r => ['ONLINE', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'SPLIT'].includes(r.paymentMode)).reduce((s, r) => s + r.paidAmount, 0),
    };

    // Company-wise breakdown
    const companyBreakdown: Record<string, {
      companyId: string; companyName: string; companyCode: string;
      totalDue: number; collected: number; notCollected: number;
      amountDue: number; amountCollected: number;
    }> = {};

    for (const row of rows) {
      if (!companyBreakdown[row.companyId]) {
        companyBreakdown[row.companyId] = {
          companyId: row.companyId, companyName: row.companyName, companyCode: row.companyCode,
          totalDue: 0, collected: 0, notCollected: 0, amountDue: 0, amountCollected: 0,
        };
      }
      const cb = companyBreakdown[row.companyId];
      cb.totalDue++;
      cb.amountDue += row.dueAmount;
      if (row.isCollected) { cb.collected++; cb.amountCollected += row.paidAmount; }
      else { cb.notCollected++; }
    }

    const result = {
      success: true,
      date: dateParam,
      summary,
      companyBreakdown: Object.values(companyBreakdown),
      rows,
      companies,
    };

    // Cache: today = 2 min (EMIs get paid throughout day), past dates = 10 min
    cache.set(cacheKey, result, isToday ? 120_000 : 600_000);
    return NextResponse.json(result);

  } catch (error) {
    console.error('[emi-today] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 });
  }
}
