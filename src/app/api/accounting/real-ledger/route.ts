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

    // ─── LOANS GIVEN (Online + Offline, mirror excluded) ───────────────────────
    else if (account === 'LOANS') {
      accountName = 'Loans Given / Advances'; accountCode = '1100'; accountType = 'ASSET';
      const disbursed = await db.loanApplication.findMany({
        where: { companyId, disbursedAt: { gte: periodStart, lte: periodEnd }, disbursedAmount: { gt: 0 } },
        include: { customer: { select: { name: true } } },
        orderBy: { disbursedAt: 'asc' },
      });
      // Fetch EMI schedules for principal recovery
      // Use paidPrincipal (actual principal repaid) — never fall back to principalAmount (scheduled)
      // INTEREST_ONLY_PAID means interest collected but principal still outstanding → cr = 0
      const recovered = await db.eMISchedule.findMany({
        where: {
          loanApplication: { companyId },
          paymentStatus: { in: ['PAID', 'PARTIALLY_PAID'] },
          paidDate: { gte: periodStart, lte: periodEnd },
          paidPrincipal: { gt: 0 }
        },
        select: {
          installmentNumber: true,
          paidDate: true,
          paidPrincipal: true,
          loanApplication: { include: { customer: { select: { name: true } } } }
        },
        orderBy: { paidDate: 'asc' },
      });
      // Offline loans — mirror loans are valid assets for the company that disbursed them
      const offlineDisb = await db.offlineLoan.findMany({
        where: { companyId, disbursementDate: { gte: periodStart, lte: periodEnd }, loanAmount: { gt: 0 } },
        orderBy: { disbursementDate: 'asc' },
      });
      const offlineRecovered = await db.offlineLoanEMI.findMany({
        where: {
          offlineLoan: { companyId },
          paymentStatus: { in: ['PAID', 'PARTIALLY_PAID'] },
          paidDate: { gte: periodStart, lte: periodEnd },
          paidPrincipal: { gt: 0 }
        },
        select: {
          installmentNumber: true,
          paidDate: true,
          paidPrincipal: true,
          offlineLoan: { select: { customerName: true, loanNumber: true } }
        },
        orderBy: { paidDate: 'asc' },
      });

      type Ev = { date: Date; particulars: string; ref: string; dr: number; cr: number };
      const events: Ev[] = [];
      disbursed.forEach(l => events.push({ date: l.disbursedAt!, particulars: `Loan disbursed – ${l.customer?.name || 'Unknown'} (Online)`, ref: l.applicationNo, dr: l.disbursedAmount || 0, cr: 0 }));
      offlineDisb.forEach(l => events.push({ date: l.disbursementDate, particulars: `Loan disbursed – ${l.customerName} (Offline)`, ref: l.loanNumber, dr: l.loanAmount, cr: 0 }));
      // Use paidPrincipal exclusively — accurate for full, partial, and interest-only payments
      recovered.forEach(e => events.push({ date: e.paidDate!, particulars: `Principal received – ${e.loanApplication?.customer?.name || 'Unknown'} EMI #${e.installmentNumber}`, ref: (e.loanApplication as any)?.applicationNo || '-', dr: 0, cr: e.paidPrincipal || 0 }));
      offlineRecovered.forEach(e => events.push({ date: e.paidDate!, particulars: `Principal received – ${e.offlineLoan?.customerName || 'Unknown'} EMI #${e.installmentNumber}`, ref: e.offlineLoan?.loanNumber || '-', dr: 0, cr: e.paidPrincipal || 0 }));
      events.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate opening balance prior to periodStart
      const priorDisbursedOnline = await db.loanApplication.findMany({
        where: { companyId, disbursedAt: { lt: periodStart }, disbursedAmount: { gt: 0 } },
        select: { disbursedAmount: true }
      });
      const priorDisbursedOffline = await db.offlineLoan.findMany({
        where: { companyId, disbursementDate: { lt: periodStart }, loanAmount: { gt: 0 } },
        select: { loanAmount: true }
      });
      const priorRecoveredOnline = await db.eMISchedule.findMany({
        where: { loanApplication: { companyId }, paymentStatus: { in: ['PAID', 'PARTIALLY_PAID'] }, paidDate: { lt: periodStart }, paidPrincipal: { gt: 0 } },
        select: { paidPrincipal: true }
      });
      const priorRecoveredOffline = await db.offlineLoanEMI.findMany({
        where: { offlineLoan: { companyId }, paymentStatus: { in: ['PAID', 'PARTIALLY_PAID'] }, paidDate: { lt: periodStart }, paidPrincipal: { gt: 0 } },
        select: { paidPrincipal: true }
      });

      const priorDisbTotal = priorDisbursedOnline.reduce((s, l) => s + (l.disbursedAmount || 0), 0) + priorDisbursedOffline.reduce((s, l) => s + (l.loanAmount || 0), 0);
      const priorRecTotal = priorRecoveredOnline.reduce((s, e) => s + (e.paidPrincipal || 0), 0) + priorRecoveredOffline.reduce((s, e) => s + (e.paidPrincipal || 0), 0);
      opening = priorDisbTotal - priorRecTotal;

      let bal = opening;
      for (const ev of events) { bal += ev.dr - ev.cr; totDr += ev.dr; totCr += ev.cr; txns.push({ date: ev.date.toISOString(), particulars: ev.particulars, referenceNo: ev.ref, debit: ev.dr, credit: ev.cr, balance: bal }); }
    }


    // ─── INTEREST INCOME ───────────────────────────────────────────────────────
    else if (account === 'INTEREST') {
      accountName = 'Interest Income'; accountCode = '4001'; accountType = 'INCOME';

      // ── Opening balance: all paidInterest on EMIs paid BEFORE period ──────────
      const priorOnline = await db.eMISchedule.findMany({
        where: {
          loanApplication: { companyId },
          paymentStatus: { in: ['PAID', 'PARTIALLY_PAID', 'INTEREST_ONLY_PAID'] },
          paidDate: { lt: periodStart },
        },
        select: { paidInterest: true },
      });
      const priorOffline = await db.offlineLoanEMI.findMany({
        where: {
          offlineLoan: { companyId },
          paymentStatus: { in: ['PAID', 'PARTIALLY_PAID', 'INTEREST_ONLY_PAID'] },
          paidDate: { lt: periodStart },
        },
        select: { paidInterest: true },
      });
      opening = [...priorOnline, ...priorOffline].reduce((s, e) => s + ((e as any).paidInterest || 0), 0);

      // ── Period transactions: use individual Payment records ────────────────────
      // Each partial/full payment gets its own Payment record with interestComponent.
      // Reading Payment records (not EMISchedule) ensures each partial shows separately.
      type Ev = { date: Date; particulars: string; ref: string; cr: number };
      const events: Ev[] = [];

      const payments = await db.payment.findMany({
        where: {
          loanApplication: { companyId },
          status: 'COMPLETED',
          createdAt: { gte: periodStart, lte: periodEnd },
          interestComponent: { gt: 0 },
        },
        include: {
          loanApplication: {
            include: { customer: { select: { name: true } } },
          },
          emiSchedule: { select: { installmentNumber: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      for (const p of payments) {
        const cr = p.interestComponent || 0;
        if (!cr) continue;
        const custName = p.loanApplication?.customer?.name || 'Unknown';
        const appNo = p.loanApplication?.applicationNo || '-';
        const emiNo = p.emiSchedule?.installmentNumber || '?';
        events.push({
          date: p.createdAt,
          particulars: `Interest – ${custName} EMI #${emiNo}`,
          ref: appNo,
          cr,
        });
      }

      // ── Offline Payment records ────────────────────────────────────────────────
      const offlinePayments = await db.offlineLoanEMI.findMany({
        where: {
          offlineLoan: { companyId },
          paymentStatus: { in: ['PAID', 'PARTIALLY_PAID', 'INTEREST_ONLY_PAID'] },
          paidDate: { gte: periodStart, lte: periodEnd },
          paidInterest: { gt: 0 },
        },
        include: { offlineLoan: { select: { customerName: true, loanNumber: true } } },
        orderBy: { paidDate: 'asc' },
      });
      for (const e of offlinePayments) {
        const cr = (e as any).paidInterest || 0;
        if (!cr) continue;
        events.push({
          date: e.paidDate!,
          particulars: `Interest – ${e.offlineLoan?.customerName || 'Unknown'} EMI #${e.installmentNumber}`,
          ref: e.offlineLoan?.loanNumber || '-',
          cr,
        });
      }

      events.sort((a, b) => a.date.getTime() - b.date.getTime());
      let bal = opening;
      for (const ev of events) {
        bal += ev.cr;
        totCr += ev.cr;
        txns.push({ date: ev.date.toISOString(), particulars: ev.particulars, referenceNo: ev.ref, debit: 0, credit: ev.cr, balance: bal });
      }
    }


    // ─── PROCESSING FEE ────────────────────────────────────────────────────────
    else if (account === 'PROCESSING') {
      accountName = 'Processing Fee Income'; accountCode = '4121'; accountType = 'INCOME';
      
      const accounts = await db.chartOfAccount.findMany({
        where: { companyId, accountCode: { in: ['4121', '4003'] } },
        select: { id: true }
      });
      const accountIds = accounts.map(a => a.id);

      if (accountIds.length > 0) {
        // Opening balance
        const priorJournals = await db.journalEntry.findMany({
          where: { companyId, entryDate: { lt: periodStart }, isApproved: true, isReversed: false },
          select: { id: true }
        });
        if (priorJournals.length > 0) {
          const priorLines = await db.journalEntryLine.findMany({
            where: { journalEntryId: { in: priorJournals.map(j => j.id) }, accountId: { in: accountIds } },
            select: { creditAmount: true, debitAmount: true }
          });
          opening = priorLines.reduce((s, l) => s + l.creditAmount - l.debitAmount, 0);
        }

        // Period transactions
        const periodJournals = await db.journalEntry.findMany({
          where: { companyId, entryDate: { gte: periodStart, lte: periodEnd }, isApproved: true, isReversed: false },
          orderBy: { entryDate: 'asc' },
          select: { id: true, entryDate: true, narration: true, entryNumber: true, referenceType: true }
        });

        if (periodJournals.length > 0) {
          const journalMap = new Map(periodJournals.map(j => [j.id, j]));
          const periodLines = await db.journalEntryLine.findMany({
            where: { journalEntryId: { in: periodJournals.map(j => j.id) }, accountId: { in: accountIds } },
            select: { journalEntryId: true, debitAmount: true, creditAmount: true, narration: true }
          });

          for (const l of periodLines) {
            const je = journalMap.get(l.journalEntryId)!;
            txns.push({
              date: je.entryDate.toISOString(),
              particulars: l.narration || je.narration || 'Processing Fee',
              referenceNo: je.entryNumber,
              debit: l.debitAmount,
              credit: l.creditAmount,
              balance: 0 // Will be calculated below
            });
            totDr += l.debitAmount;
            totCr += l.creditAmount;
          }
        }
      }
      
      // Fallback: also check CashBookEntry for old records without Journal Entries
      const cashBook = await db.cashBook.findUnique({ where: { companyId } });
      if (cashBook) {
        const entries = await db.cashBookEntry.findMany({ where: { cashBookId: cashBook.id, referenceType: { in: ['PROCESSING_FEE', 'PROCESSING_FEE_COLLECTION'] }, entryType: 'CREDIT', entryDate: { gte: periodStart, lte: periodEnd } }, orderBy: { entryDate: 'asc' } });
        for (const e of entries) {
          // Avoid duplicate if journal already exists (heuristic)
          const alreadyExists = txns.some(t => Math.abs(new Date(t.date).getTime() - e.entryDate.getTime()) < 86400000 && t.credit === e.amount);
          if (!alreadyExists) {
            totCr += e.amount;
            txns.push({ date: e.entryDate.toISOString(), particulars: e.description, referenceNo: 'PROCESSING FEE', debit: 0, credit: e.amount, balance: 0 });
          }
        }
      }

      txns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let bal = opening;
      for (const t of txns) {
        bal += t.credit - t.debit;
        t.balance = bal;
      }
    }

    // ─── PENALTY ───────────────────────────────────────────────────────────────
    else if (account === 'PENALTY') {
      accountName = 'Penalty / Late Fee Income'; accountCode = '4125'; accountType = 'INCOME';
      
      const accounts = await db.chartOfAccount.findMany({
        where: { companyId, accountCode: { in: ['4125', '4004', '4122'] } },
        select: { id: true }
      });
      const accountIds = accounts.map(a => a.id);

      if (accountIds.length > 0) {
        // Opening balance
        const priorJournals = await db.journalEntry.findMany({
          where: { companyId, entryDate: { lt: periodStart }, isApproved: true, isReversed: false },
          select: { id: true }
        });
        if (priorJournals.length > 0) {
          const priorLines = await db.journalEntryLine.findMany({
            where: { journalEntryId: { in: priorJournals.map(j => j.id) }, accountId: { in: accountIds } },
            select: { creditAmount: true, debitAmount: true }
          });
          opening = priorLines.reduce((s, l) => s + l.creditAmount - l.debitAmount, 0);
        }

        // Period transactions
        const periodJournals = await db.journalEntry.findMany({
          where: { companyId, entryDate: { gte: periodStart, lte: periodEnd }, isApproved: true, isReversed: false },
          orderBy: { entryDate: 'asc' },
          select: { id: true, entryDate: true, narration: true, entryNumber: true }
        });

        if (periodJournals.length > 0) {
          const journalMap = new Map(periodJournals.map(j => [j.id, j]));
          const periodLines = await db.journalEntryLine.findMany({
            where: { journalEntryId: { in: periodJournals.map(j => j.id) }, accountId: { in: accountIds } },
            select: { journalEntryId: true, debitAmount: true, creditAmount: true, narration: true }
          });

          for (const l of periodLines) {
            const je = journalMap.get(l.journalEntryId)!;
            txns.push({ date: je.entryDate.toISOString(), particulars: l.narration || je.narration || 'Penalty Income', referenceNo: je.entryNumber, debit: l.debitAmount, credit: l.creditAmount, balance: 0 });
            totDr += l.debitAmount; totCr += l.creditAmount;
          }
        }
      }

      const cashBook = await db.cashBook.findUnique({ where: { companyId } });
      if (cashBook) {
        const entries = await db.cashBookEntry.findMany({ where: { cashBookId: cashBook.id, referenceType: { in: ['PENALTY_INCOME', 'PENALTY', 'PENALTY_COLLECTION', 'LATE_FEE_COLLECTION'] }, entryType: 'CREDIT', entryDate: { gte: periodStart, lte: periodEnd } }, orderBy: { entryDate: 'asc' } });
        for (const e of entries) {
          const alreadyExists = txns.some(t => Math.abs(new Date(t.date).getTime() - e.entryDate.getTime()) < 86400000 && t.credit === e.amount);
          if (!alreadyExists) { totCr += e.amount; txns.push({ date: e.entryDate.toISOString(), particulars: e.description, referenceNo: 'PENALTY', debit: 0, credit: e.amount, balance: 0 }); }
        }
      }
      txns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let bal = opening;
      for (const t of txns) { bal += t.credit - t.debit; t.balance = bal; }
    }

    // ─── MIRROR INTEREST ───────────────────────────────────────────────────────
    else if (account === 'MIRROR') {
      accountName = 'Loan Interest Income'; accountCode = '4110'; accountType = 'INCOME';
      
      const accounts = await db.chartOfAccount.findMany({
        where: { companyId, accountCode: { in: ['4110', '4005'] } },
        select: { id: true }
      });
      const accountIds = accounts.map(a => a.id);

      if (accountIds.length > 0) {
        // Opening balance
        const priorJournals = await db.journalEntry.findMany({
          where: { companyId, entryDate: { lt: periodStart }, isApproved: true, isReversed: false },
          select: { id: true }
        });
        if (priorJournals.length > 0) {
          const priorLines = await db.journalEntryLine.findMany({
            where: { journalEntryId: { in: priorJournals.map(j => j.id) }, accountId: { in: accountIds } },
            select: { creditAmount: true, debitAmount: true }
          });
          opening = priorLines.reduce((s, l) => s + l.creditAmount - l.debitAmount, 0);
        }

        // Period transactions
        const periodJournals = await db.journalEntry.findMany({
          where: { companyId, entryDate: { gte: periodStart, lte: periodEnd }, isApproved: true, isReversed: false },
          orderBy: { entryDate: 'asc' },
          select: { id: true, entryDate: true, narration: true, entryNumber: true }
        });

        if (periodJournals.length > 0) {
          const journalMap = new Map(periodJournals.map(j => [j.id, j]));
          const periodLines = await db.journalEntryLine.findMany({
            where: { journalEntryId: { in: periodJournals.map(j => j.id) }, accountId: { in: accountIds } },
            select: { journalEntryId: true, debitAmount: true, creditAmount: true, narration: true }
          });

          for (const l of periodLines) {
            const je = journalMap.get(l.journalEntryId)!;
            txns.push({ date: je.entryDate.toISOString(), particulars: l.narration || je.narration || 'Interest Income', referenceNo: je.entryNumber, debit: l.debitAmount, credit: l.creditAmount, balance: 0 });
            totDr += l.debitAmount; totCr += l.creditAmount;
          }
        }
      }

      const cashBook = await db.cashBook.findUnique({ where: { companyId } });
      if (cashBook) {
        const entries = await db.cashBookEntry.findMany({ where: { cashBookId: cashBook.id, referenceType: { in: ['MIRROR_INTEREST_INCOME', 'MIRROR_EMI_PAYMENT', 'INTEREST_ONLY_PAYMENT', 'INTEREST_COLLECTION'] }, entryType: 'CREDIT', entryDate: { gte: periodStart, lte: periodEnd } }, orderBy: { entryDate: 'asc' } });
        for (const e of entries) {
          const alreadyExists = txns.some(t => Math.abs(new Date(t.date).getTime() - e.entryDate.getTime()) < 86400000 && t.credit === e.amount);
          if (!alreadyExists) { totCr += e.amount; txns.push({ date: e.entryDate.toISOString(), particulars: e.description, referenceNo: 'INTEREST', debit: 0, credit: e.amount, balance: 0 }); }
        }
      }
      txns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let bal = opening;
      for (const t of txns) { bal += t.credit - t.debit; t.balance = bal; }
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
    // Capital can be recorded via:
    //   1. EquityEntry table (direct investment/withdrawal — most common)
    //   2. JournalEntryLine on account 3001/3002 (via add-equity flow)
    // We merge both to get the complete picture.
    else if (account === 'CAPITAL') {
      accountName = "Owner's Capital"; accountCode = '3002'; accountType = 'EQUITY';

      type Ev = { date: Date; particulars: string; ref: string; dr: number; cr: number };
      const events: Ev[] = [];

      // ── Source 1: EquityEntry table ──────────────────────────────────────────
      const allEquityEntries = await db.equityEntry.findMany({
        where: { companyId },
        orderBy: { createdAt: 'asc' }
      });

      for (const e of allEquityEntries) {
        const entryDate = (e as any).entryDate ? new Date((e as any).entryDate) : new Date(e.createdAt);
        const isWithdrawal = e.entryType === 'WITHDRAWAL';
        if (entryDate < periodStart) {
          // Before period → contributes to opening balance
          opening += isWithdrawal ? -(e.amount || 0) : (e.amount || 0);
        } else if (entryDate <= periodEnd) {
          // Within period → show as transaction
          events.push({
            date: entryDate,
            particulars: (e as any).description || (isWithdrawal ? 'Capital Withdrawal' : 'Capital Investment'),
            ref: (e as any).referenceNo || (isWithdrawal ? 'WITHDRAWAL' : 'INVESTMENT'),
            dr: isWithdrawal ? (e.amount || 0) : 0,
            cr: isWithdrawal ? 0 : (e.amount || 0),
          });
        }
      }

      // ── Source 2: JournalEntryLine on 3001/3002 (add-equity flow) ────────────
      const capitalAccounts = await db.chartOfAccount.findMany({
        where: { companyId, accountCode: { in: ['3001', '3002'] } },
        select: { id: true }
      });
      const capitalAccountIds = capitalAccounts.map(a => a.id);

      if (capitalAccountIds.length > 0) {
        // Opening from prior journal entries
        const priorJournals = await db.journalEntry.findMany({
          where: { companyId, entryDate: { lt: periodStart } },
          select: { id: true }
        });
        if (priorJournals.length > 0) {
          const priorIds = priorJournals.map(j => j.id);
          const priorLines = await db.journalEntryLine.findMany({
            where: { journalEntryId: { in: priorIds }, accountId: { in: capitalAccountIds } },
            select: { creditAmount: true, debitAmount: true }
          });
          // Only add if EquityEntry didn't already capture these (avoid double-count)
          // Use a simple heuristic: if journalLines sum >> equityEntry sum, journal wins
          const journalPriorSum = priorLines.reduce((s, l) => s + l.creditAmount - l.debitAmount, 0);
          if (Math.abs(journalPriorSum) > Math.abs(opening) * 1.5) {
            // journal has more data — reset and use journal only
            opening = journalPriorSum;
            events.length = 0; // also clear equity entry events
          }
        }

        // Period journal entries
        const periodJournals = await db.journalEntry.findMany({
          where: { companyId, entryDate: { gte: periodStart, lte: periodEnd } },
          orderBy: { entryDate: 'asc' },
          select: { id: true, entryDate: true, narration: true, entryNumber: true }
        });
        const journalMap = new Map(periodJournals.map(j => [j.id, j]));

        if (periodJournals.length > 0) {
          const periodIds = periodJournals.map(j => j.id);
          const periodLines = await db.journalEntryLine.findMany({
            where: { journalEntryId: { in: periodIds }, accountId: { in: capitalAccountIds } },
            select: { journalEntryId: true, debitAmount: true, creditAmount: true }
          });
          for (const l of periodLines) {
            const je = journalMap.get(l.journalEntryId)!;
            // Avoid duplicating entries already in events from EquityEntry
            const alreadyHave = events.some(ev =>
              Math.abs(ev.date.getTime() - je.entryDate.getTime()) < 86400000 &&
              Math.abs((ev.cr - ev.dr) - (l.creditAmount - l.debitAmount)) < 1
            );
            if (!alreadyHave && (l.creditAmount > 0 || l.debitAmount > 0)) {
              events.push({
                date: je.entryDate,
                particulars: je.narration || 'Capital Entry',
                ref: je.entryNumber,
                dr: l.debitAmount,
                cr: l.creditAmount,
              });
            }
          }
        }
      }

      // Sort all events by date and build ledger rows
      events.sort((a, b) => a.date.getTime() - b.date.getTime());
      let bal = opening;
      for (const ev of events) {
        bal += ev.cr - ev.dr;
        totDr += ev.dr; totCr += ev.cr;
        txns.push({ date: ev.date.toISOString(), particulars: ev.particulars, referenceNo: ev.ref, debit: ev.dr, credit: ev.cr, balance: bal });
      }
    }

    // ─── EXPENSES ──────────────────────────────────────────────────────────────

    else if (account === 'EXPENSES') {
      accountName = 'All Expenses'; accountCode = '5000'; accountType = 'EXPENSE';
      const expenses = await db.expense.findMany({ where: { companyId, paymentDate: { gte: periodStart, lte: periodEnd } }, orderBy: { paymentDate: 'asc' } });
      let bal = 0;
      for (const e of expenses) { bal += e.amount; totDr += e.amount; txns.push({ date: e.paymentDate.toISOString(), particulars: `${e.expenseType.replace(/_/g, ' ')} – ${e.description}`, referenceNo: e.expenseNumber, debit: e.amount, credit: 0, balance: bal }); }
    }

    // ─── DYNAMIC CHARTOFACCOUNT LOOKUP (ANY OTHER ACCOUNT HEAD) ───────────────
    else {
      // Look up account by accountCode or ID for this company
      const coa = await db.chartOfAccount.findFirst({
        where: {
          companyId,
          OR: [
            { accountCode: account },
            { id: account }
          ]
        }
      });

      if (coa) {
        accountName = coa.accountName;
        accountCode = coa.accountCode;
        accountType = coa.accountType;
        const isDebitNormal = ['ASSET', 'EXPENSE'].includes(accountType);

        // 1. Calculate opening balance from journal entries before periodStart
        const priorLines = await db.journalEntryLine.findMany({
          where: {
            accountId: coa.id,
            journalEntry: { companyId, entryDate: { lt: periodStart }, isApproved: true, isReversed: false }
          },
          select: { debitAmount: true, creditAmount: true }
        });

        const priorNet = priorLines.reduce((s, l) => s + (l.debitAmount || 0) - (l.creditAmount || 0), 0);
        opening = (coa.openingBalance || 0) + (isDebitNormal ? priorNet : -priorNet);

        // 2. Fetch period journal lines
        const periodLines = await db.journalEntryLine.findMany({
          where: {
            accountId: coa.id,
            journalEntry: { companyId, entryDate: { gte: periodStart, lte: periodEnd }, isApproved: true, isReversed: false }
          },
          include: {
            journalEntry: {
              select: { entryDate: true, entryNumber: true, narration: true, referenceType: true }
            }
          },
          orderBy: { journalEntry: { entryDate: 'asc' } }
        });

        let bal = opening;
        for (const line of periodLines) {
          const dr = line.debitAmount || 0;
          const cr = line.creditAmount || 0;
          totDr += dr;
          totCr += cr;

          if (isDebitNormal) {
            bal += dr - cr;
          } else {
            bal += cr - dr;
          }

          txns.push({
            date: line.journalEntry.entryDate.toISOString(),
            particulars: line.narration || line.journalEntry.narration || `${coa.accountName} entry`,
            referenceNo: line.journalEntry.entryNumber || line.journalEntry.referenceType || '-',
            debit: dr,
            credit: cr,
            balance: bal
          });
        }
      }
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
