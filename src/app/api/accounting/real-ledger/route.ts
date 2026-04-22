import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const companyId = searchParams.get('companyId');
    const account   = searchParams.get('account') || 'CASH';
    const startDate = searchParams.get('startDate');
    const endDate   = searchParams.get('endDate');

    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

    const periodStart = startDate ? new Date(new Date(startDate).setHours(0, 0, 0, 0)) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const periodEnd   = endDate   ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : new Date();

    type TxRow = { date: string; particulars: string; referenceNo: string; debit: number; credit: number; balance: number };

    let opening = 0;
    const txns: TxRow[] = [];
    let accountName = '', accountCode = '', accountType = '', totDr = 0, totCr = 0;

    // ─── CASH IN HAND ──────────────────────────────────────────────────────────
    if (account === 'CASH') {
      accountName = 'Cash in Hand'; accountCode = '1001'; accountType = 'ASSET';
      const cashBook = await db.cashBook.findUnique({ where: { companyId } });
      if (!cashBook) return NextResponse.json({ success: true, data: { accountName, accountCode, accountType, openingBalance: 0, transactions: [], closingBalance: 0, totalDebit: 0, totalCredit: 0 } });
      const prior = await db.cashBookEntry.findMany({ where: { cashBookId: cashBook.id, entryDate: { lt: periodStart } }, select: { amount: true, entryType: true } });
      for (const e of prior) opening += e.entryType === 'CREDIT' ? e.amount : -e.amount;
      const entries = await db.cashBookEntry.findMany({ where: { cashBookId: cashBook.id, entryDate: { gte: periodStart, lte: periodEnd } }, orderBy: { entryDate: 'asc' } });
      let bal = opening;
      for (const e of entries) {
        const dr = e.entryType === 'CREDIT' ? e.amount : 0;
        const cr = e.entryType === 'DEBIT'  ? e.amount : 0;
        bal += dr - cr; totDr += dr; totCr += cr;
        txns.push({ date: e.entryDate.toISOString(), particulars: e.description, referenceNo: e.referenceType?.replace(/_/g, ' ') || '-', debit: dr, credit: cr, balance: bal });
      }
    }

    // ─── BANK ──────────────────────────────────────────────────────────────────
    else if (account === 'BANK') {
      accountName = 'Cash at Bank'; accountCode = '1002'; accountType = 'ASSET';
      const bankAccounts = await db.bankAccount.findMany({ where: { companyId, isActive: true }, select: { id: true } });
      const ids = bankAccounts.map(b => b.id);
      const prior = await db.bankTransaction.findMany({ where: { bankAccountId: { in: ids }, transactionDate: { lt: periodStart } }, select: { amount: true, transactionType: true } });
      for (const t of prior) opening += t.transactionType === 'CREDIT' ? t.amount : -t.amount;
      const entries = await db.bankTransaction.findMany({ where: { bankAccountId: { in: ids }, transactionDate: { gte: periodStart, lte: periodEnd } }, orderBy: { transactionDate: 'asc' } });
      let bal = opening;
      for (const e of entries) {
        const dr = e.transactionType === 'CREDIT' ? e.amount : 0;
        const cr = e.transactionType === 'DEBIT'  ? e.amount : 0;
        bal += dr - cr; totDr += dr; totCr += cr;
        txns.push({ date: e.transactionDate.toISOString(), particulars: e.description, referenceNo: e.referenceType?.replace(/_/g, ' ') || '-', debit: dr, credit: cr, balance: bal });
      }
    }

    // ─── LOANS GIVEN (Online Only) ─────────────────────────────────────────────
    else if (account === 'LOANS') {
      accountName = 'Loans Given / Advances'; accountCode = '1100'; accountType = 'ASSET';
      const disbursed = await db.loanApplication.findMany({
        where: { companyId, disbursedAt: { gte: periodStart, lte: periodEnd }, disbursedAmount: { gt: 0 } },
        include: { customer: { select: { name: true } } },
        orderBy: { disbursedAt: 'asc' },
      });
      const recovered = await db.eMISchedule.findMany({
        where: { loanApplication: { companyId }, paymentStatus: { in: ['PAID', 'PARTIALLY_PAID', 'INTEREST_ONLY_PAID'] }, paidDate: { gte: periodStart, lte: periodEnd } },
        include: { loanApplication: { include: { customer: { select: { name: true } } } } },
        orderBy: { paidDate: 'asc' },
      });
      // Also add offline loans
      const offlineDisb = await db.offlineLoan.findMany({
        where: { companyId, disbursementDate: { gte: periodStart, lte: periodEnd }, loanAmount: { gt: 0 } },
        orderBy: { disbursementDate: 'asc' },
      });
      const offlineRecovered = await db.offlineLoanEMI.findMany({
        where: { offlineLoan: { companyId }, paymentStatus: { in: ['PAID', 'PARTIALLY_PAID', 'INTEREST_ONLY_PAID'] }, paidDate: { gte: periodStart, lte: periodEnd } },
        include: { offlineLoan: { select: { customerName: true, loanNumber: true } } },
        orderBy: { paidDate: 'asc' },
      });

      type Ev = { date: Date; particulars: string; ref: string; dr: number; cr: number };
      const events: Ev[] = [];
      disbursed.forEach(l => events.push({ date: l.disbursedAt!, particulars: `Loan disbursed – ${l.customer?.name || 'Unknown'} (Online)`, ref: l.applicationNo, dr: l.disbursedAmount || 0, cr: 0 }));
      offlineDisb.forEach(l => events.push({ date: l.disbursementDate, particulars: `Loan disbursed – ${l.customerName} (Offline)`, ref: l.loanNumber, dr: l.loanAmount, cr: 0 }));
      recovered.forEach(e => events.push({ date: e.paidDate!, particulars: `Principal received – ${e.loanApplication?.customer?.name || 'Unknown'} EMI #${e.installmentNumber}`, ref: e.loanApplication?.applicationNo || '-', dr: 0, cr: e.paidPrincipal || e.principalAmount }));
      offlineRecovered.forEach(e => { const pr = (e as any).paidPrincipal ?? e.principalAmount; events.push({ date: e.paidDate!, particulars: `Principal received – ${e.offlineLoan?.customerName || 'Unknown'} EMI #${e.installmentNumber}`, ref: e.offlineLoan?.loanNumber || '-', dr: 0, cr: pr }); });
      events.sort((a, b) => a.date.getTime() - b.date.getTime());

      let bal = 0;
      for (const ev of events) { bal += ev.dr - ev.cr; totDr += ev.dr; totCr += ev.cr; txns.push({ date: ev.date.toISOString(), particulars: ev.particulars, referenceNo: ev.ref, debit: ev.dr, credit: ev.cr, balance: bal }); }
    }

    // ─── INTEREST INCOME ───────────────────────────────────────────────────────
    else if (account === 'INTEREST') {
      accountName = 'Interest Income'; accountCode = '4001'; accountType = 'INCOME';
      const online = await db.eMISchedule.findMany({
        where: { loanApplication: { companyId }, paymentStatus: { in: ['PAID', 'PARTIALLY_PAID', 'INTEREST_ONLY_PAID'] }, paidDate: { gte: periodStart, lte: periodEnd } },
        include: { loanApplication: { include: { customer: { select: { name: true } } } } },
        orderBy: { paidDate: 'asc' },
      });
      const offline = await db.offlineLoanEMI.findMany({
        where: { offlineLoan: { companyId }, paymentStatus: { in: ['PAID', 'PARTIALLY_PAID', 'INTEREST_ONLY_PAID'] }, paidDate: { gte: periodStart, lte: periodEnd } },
        include: { offlineLoan: { select: { customerName: true, loanNumber: true } } },
        orderBy: { paidDate: 'asc' },
      });
      let bal = 0;
      for (const e of online) { const cr = e.paidInterest || 0; if (!cr) continue; bal += cr; totCr += cr; txns.push({ date: e.paidDate!.toISOString(), particulars: `Interest – ${e.loanApplication?.customer?.name || 'Unknown'} EMI #${e.installmentNumber}`, referenceNo: e.loanApplication?.applicationNo || '-', debit: 0, credit: cr, balance: bal }); }
      for (const e of offline) { const cr = (e as any).paidInterest || 0; if (!cr) continue; bal += cr; totCr += cr; txns.push({ date: e.paidDate!.toISOString(), particulars: `Interest – ${e.offlineLoan?.customerName || 'Unknown'} EMI #${e.installmentNumber}`, referenceNo: e.offlineLoan?.loanNumber || '-', debit: 0, credit: cr, balance: bal }); }
      txns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      // Recalc balance after sort
      let bal2 = 0;
      for (const t of txns) { bal2 += t.credit - t.debit; t.balance = bal2; }
    }

    // ─── PROCESSING FEE ────────────────────────────────────────────────────────
    else if (account === 'PROCESSING') {
      accountName = 'Processing Fee Income'; accountCode = '4003'; accountType = 'INCOME';
      const cashBook = await db.cashBook.findUnique({ where: { companyId } });
      if (cashBook) {
        const entries = await db.cashBookEntry.findMany({ where: { cashBookId: cashBook.id, referenceType: 'PROCESSING_FEE', entryType: 'CREDIT', entryDate: { gte: periodStart, lte: periodEnd } }, orderBy: { entryDate: 'asc' } });
        let bal = 0;
        for (const e of entries) { bal += e.amount; totCr += e.amount; txns.push({ date: e.entryDate.toISOString(), particulars: e.description, referenceNo: 'PROCESSING FEE', debit: 0, credit: e.amount, balance: bal }); }
      }
    }

    // ─── PENALTY ───────────────────────────────────────────────────────────────
    else if (account === 'PENALTY') {
      accountName = 'Penalty / Late Fee Income'; accountCode = '4004'; accountType = 'INCOME';
      const cashBook = await db.cashBook.findUnique({ where: { companyId } });
      if (cashBook) {
        const entries = await db.cashBookEntry.findMany({ where: { cashBookId: cashBook.id, referenceType: { in: ['PENALTY_INCOME', 'PENALTY'] }, entryType: 'CREDIT', entryDate: { gte: periodStart, lte: periodEnd } }, orderBy: { entryDate: 'asc' } });
        let bal = 0;
        for (const e of entries) { bal += e.amount; totCr += e.amount; txns.push({ date: e.entryDate.toISOString(), particulars: e.description, referenceNo: 'PENALTY', debit: 0, credit: e.amount, balance: bal }); }
      }
    }

    // ─── MIRROR INTEREST ───────────────────────────────────────────────────────
    else if (account === 'MIRROR') {
      accountName = 'Mirror Interest Income'; accountCode = '4005'; accountType = 'INCOME';
      const cashBook = await db.cashBook.findUnique({ where: { companyId } });
      if (cashBook) {
        const entries = await db.cashBookEntry.findMany({ where: { cashBookId: cashBook.id, referenceType: { in: ['MIRROR_INTEREST_INCOME', 'MIRROR_EMI_PAYMENT', 'INTEREST_ONLY_PAYMENT'] }, entryType: 'CREDIT', entryDate: { gte: periodStart, lte: periodEnd } }, orderBy: { entryDate: 'asc' } });
        let bal = 0;
        for (const e of entries) { bal += e.amount; totCr += e.amount; txns.push({ date: e.entryDate.toISOString(), particulars: e.description, referenceNo: 'MIRROR INTEREST', debit: 0, credit: e.amount, balance: bal }); }
      }
    }

    // ─── BORROWED FUNDS ────────────────────────────────────────────────────────
    else if (account === 'BORROWED') {
      accountName = 'Borrowed Funds (Liability)'; accountCode = '2001'; accountType = 'LIABILITY';
      const borrowings = await db.borrowedMoney.findMany({ where: { companyId }, orderBy: { borrowedDate: 'asc' } });
      let bal = 0;
      for (const b of borrowings) {
        if (b.borrowedDate >= periodStart && b.borrowedDate <= periodEnd) {
          bal += b.amount; totCr += b.amount;
          txns.push({ date: b.borrowedDate.toISOString(), particulars: `Borrowed from ${b.sourceName} (${b.sourceType})`, referenceNo: b.sourceType, debit: 0, credit: b.amount, balance: bal });
        }
        if (b.amountRepaid > 0) {
          bal -= b.amountRepaid; totDr += b.amountRepaid;
          txns.push({ date: b.updatedAt.toISOString(), particulars: `Repaid to ${b.sourceName}`, referenceNo: 'REPAYMENT', debit: b.amountRepaid, credit: 0, balance: bal });
        }
      }
      txns.sort((a, b2) => new Date(a.date).getTime() - new Date(b2.date).getTime());
    }

    // ─── OWNER'S CAPITAL ───────────────────────────────────────────────────────
    // add-equity writes JournalEntryLine on the Owner's Capital ChartOfAccount.
    // Two-step query: first find all JournalEntryLine accountIds for this company,
    // then find entries in that id set within the date range.
    else if (account === 'CAPITAL') {
      accountName = "Owner's Capital"; accountCode = '3002'; accountType = 'EQUITY';

      // Step 1: find all Owner's Capital accounts for this company (3001 or 3002)
      const capitalAccounts = await db.chartOfAccount.findMany({
        where: { companyId, accountCode: { in: ['3001', '3002'] } },
        select: { id: true }
      });
      const capitalAccountIds = capitalAccounts.map(a => a.id);

      if (capitalAccountIds.length > 0) {
        // Step 2a: opening balance — journal entries BEFORE period
        const priorJournalIds = await db.journalEntry.findMany({
          where: { companyId, entryDate: { lt: periodStart } },
          select: { id: true }
        });
        const priorIds = priorJournalIds.map(j => j.id);
        if (priorIds.length > 0) {
          const priorLines = await db.journalEntryLine.findMany({
            where: { journalEntryId: { in: priorIds }, accountId: { in: capitalAccountIds } },
            select: { creditAmount: true, debitAmount: true }
          });
          for (const l of priorLines) opening += l.creditAmount - l.debitAmount;
        }

        // Step 2b: period journal entries
        const periodJournals = await db.journalEntry.findMany({
          where: { companyId, entryDate: { gte: periodStart, lte: periodEnd } },
          orderBy: { entryDate: 'asc' },
          select: { id: true, entryDate: true, narration: true, entryNumber: true }
        });
        const periodJournalIds = periodJournals.map(j => j.id);
        const journalMap = new Map(periodJournals.map(j => [j.id, j]));

        if (periodJournalIds.length > 0) {
          const periodLines = await db.journalEntryLine.findMany({
            where: { journalEntryId: { in: periodJournalIds }, accountId: { in: capitalAccountIds } },
            select: { journalEntryId: true, debitAmount: true, creditAmount: true }
          });

          // Sort by journal entry date
          periodLines.sort((a, b) => {
            const da = journalMap.get(a.journalEntryId)?.entryDate ?? new Date(0);
            const db2 = journalMap.get(b.journalEntryId)?.entryDate ?? new Date(0);
            return da.getTime() - db2.getTime();
          });

          let bal = opening;
          for (const l of periodLines) {
            const je = journalMap.get(l.journalEntryId)!;
            const dr = l.debitAmount;
            const cr = l.creditAmount;
            bal += cr - dr;
            totDr += dr; totCr += cr;
            txns.push({
              date: je.entryDate.toISOString(),
              particulars: je.narration || 'Capital Entry',
              referenceNo: je.entryNumber,
              debit: dr,
              credit: cr,
              balance: bal
            });
          }
        }
      }
    }

    // ─── EXPENSES ──────────────────────────────────────────────────────────────
    else if (account === 'EXPENSES') {
      accountName = 'All Expenses'; accountCode = '5000'; accountType = 'EXPENSE';
      const expenses = await db.expense.findMany({ where: { companyId, paymentDate: { gte: periodStart, lte: periodEnd } }, orderBy: { paymentDate: 'asc' } });
      let bal = 0;
      for (const e of expenses) { bal += e.amount; totDr += e.amount; txns.push({ date: e.paymentDate.toISOString(), particulars: `${e.expenseType.replace(/_/g, ' ')} – ${e.description}`, referenceNo: e.expenseNumber, debit: e.amount, credit: 0, balance: bal }); }
    }

    // Closing balance: sign convention depends on account normal side
    // ASSET/EXPENSE → debit-normal: closing = opening + totDr - totCr
    // EQUITY/LIABILITY/INCOME → credit-normal: closing = opening + totCr - totDr
    const isCreditNormal = accountType === 'EQUITY' || accountType === 'LIABILITY' || accountType === 'INCOME';
    const closing = isCreditNormal
      ? opening + totCr - totDr
      : opening + totDr - totCr;

    return NextResponse.json({
      success: true,
      data: { accountName, accountCode, accountType, openingBalance: opening, transactions: txns, closingBalance: closing, totalDebit: totDr, totalCredit: totCr }
    });
  } catch (error: any) {
    console.error('[real-ledger]', error?.message || error);
    return NextResponse.json({ error: 'Failed to load ledger', details: error?.message }, { status: 500 });
  }
}
