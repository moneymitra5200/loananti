import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/accountant/export/zip?companyId=xxx&year=2026
 * year=2026 → FY 2026-27 → 1 Apr 2026 to 31 Mar 2027
 */
function getIndianFY(year: number): { fyStart: Date; fyEnd: Date; label: string } {
  const fyStart = new Date(year, 3, 1, 0, 0, 0, 0);
  const fyEnd   = new Date(year + 1, 2, 31, 23, 59, 59, 999);
  return { fyStart, fyEnd, label: `FY ${year}-${String(year + 1).slice(-2)}` };
}

function toCSV(rows: Record<string, any>[]): string {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const yearParam = searchParams.get('year');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const yearNum = yearParam ? parseInt(yearParam) : (() => {
      const now = new Date();
      return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    })();

    const { fyStart, fyEnd, label } = getIndianFY(yearNum);

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { name: true, code: true }
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // ── 1. Journal Entries ────────────────────────────────────────────────────
    const journalEntries = await db.journalEntry.findMany({
      where: { companyId, entryDate: { gte: fyStart, lte: fyEnd }, isReversed: false },
      include: {
        lines: {
          include: { account: { select: { accountCode: true, accountName: true } } }
        }
      },
      orderBy: { entryDate: 'asc' }
    });

    const jeRows = journalEntries.map(je => ({
      entry_number: je.entryNumber,
      entry_date: je.entryDate?.toISOString().slice(0, 10),
      reference_type: je.referenceType || '',
      narration: je.narration || '',
      total_debit: je.totalDebit,
      total_credit: je.totalCredit,
      is_approved: je.isApproved ? 'Yes' : 'No',
      created_at: je.createdAt?.toISOString().slice(0, 19)
    }));

    const jeLineRows = journalEntries.flatMap(je =>
      je.lines.map(l => ({
        entry_number: je.entryNumber,
        entry_date: je.entryDate?.toISOString().slice(0, 10),
        account_code: l.account?.accountCode || '',
        account_name: l.account?.accountName || '',
        debit_amount: l.debitAmount || 0,
        credit_amount: l.creditAmount || 0,
        narration: l.narration || ''   // ✅ field exists on JournalEntryLine - no cast
      }))
    );

    // ── 2. CashBook — FIX: filter by entryDate not createdAt ─────────────────
    const cashBook = await db.cashBook.findUnique({ where: { companyId } });
    const cashEntries = cashBook ? await db.cashBookEntry.findMany({
      where: {
        cashBookId: cashBook.id,
        entryDate: { gte: fyStart, lte: fyEnd }   // ✅ FIX: was createdAt
      },
      orderBy: { entryDate: 'asc' }
    }) : [];

    const cashRows = cashEntries.map(e => ({
      date: e.entryDate?.toISOString().slice(0, 10),
      time: e.entryDate?.toISOString().slice(11, 19),
      type: e.entryType,
      amount: e.amount,
      balance_after: e.balanceAfter,
      description: e.description || '',
      reference_type: e.referenceType || '',
      reference_id: e.referenceId || ''
    }));

    // ── 3. Bank Transactions — FIX: single query, no N+1 loop ────────────────
    const bankAccounts = await db.bankAccount.findMany({
      where: { companyId, isActive: true },
      select: { id: true, bankName: true, accountNumber: true }
    });

    const bankAccountMap = new Map(bankAccounts.map(ba => [ba.id, ba]));
    const allBankTxns = bankAccounts.length > 0 ? await db.bankTransaction.findMany({
      where: {
        bankAccountId: { in: bankAccounts.map(ba => ba.id) },
        transactionDate: { gte: fyStart, lte: fyEnd }
      },
      orderBy: { transactionDate: 'asc' }
    }) : [];

    const bankTxRows = allBankTxns.map(t => {
      const ba = bankAccountMap.get(t.bankAccountId);
      return {
        bank_name: ba?.bankName || '',
        account_number: ba?.accountNumber || '',
        date: t.transactionDate?.toISOString().slice(0, 10),
        type: t.transactionType,
        amount: t.amount,
        balance_after: t.balanceAfter,
        description: t.description || '',
        reference_type: t.referenceType || '',
        reference_id: t.referenceId || ''
      };
    });

    // ── 4. Loan Portfolio — FIX: only disbursed/active/closed loans ──────────
    const onlineLoans = await db.loanApplication.findMany({
      where: {
        companyId,
        createdAt: { gte: fyStart, lte: fyEnd },
        status: { in: ['DISBURSED', 'ACTIVE', 'ACTIVE_INTEREST_ONLY', 'CLOSED'] }  // ✅ valid LoanStatus values
      },
      select: {
        applicationNo: true, firstName: true, lastName: true, loanAmount: true,
        interestRate: true, status: true, createdAt: true, disbursedAt: true,
        isInterestOnlyLoan: true, tenure: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const offlineLoans = await db.offlineLoan.findMany({
      where: {
        companyId,
        isMirrorLoan: false,
        createdAt: { gte: fyStart, lte: fyEnd },
        status: { in: ['ACTIVE', 'CLOSED', 'DEFAULTED', 'RESTRUCTURED', 'INTEREST_ONLY'] }  // ✅ valid OfflineLoanStatus values
      },
      select: {
        loanNumber: true, customerName: true, loanAmount: true,
        interestRate: true, status: true, createdAt: true,
        disbursementDate: true, isInterestOnlyLoan: true, tenure: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const loanRows = [
      ...onlineLoans.map(l => ({
        loan_number: l.applicationNo,
        type: 'ONLINE',
        customer_name: [l.firstName, l.lastName].filter(Boolean).join(' ') || '',
        loan_amount: l.loanAmount || 0,
        interest_rate: l.interestRate || 0,
        tenure_months: l.tenure || 'IO',
        status: l.status,
        disbursement_date: l.disbursedAt?.toISOString().slice(0, 10) || '',
        is_interest_only: l.isInterestOnlyLoan ? 'Yes' : 'No'
      })),
      ...offlineLoans.map(l => ({
        loan_number: l.loanNumber,
        type: 'OFFLINE',
        customer_name: l.customerName || '',
        loan_amount: l.loanAmount || 0,
        interest_rate: l.interestRate || 0,
        tenure_months: l.tenure || 'IO',
        status: l.status,
        disbursement_date: l.disbursementDate?.toISOString().slice(0, 10) || '',
        is_interest_only: l.isInterestOnlyLoan ? 'Yes' : 'No'
      }))
    ];

    // ── 5. EMI Collections ────────────────────────────────────────────────────
    const emiCollections = await db.offlineLoanEMI.findMany({
      where: {
        offlineLoan: { companyId, isMirrorLoan: false },
        paymentStatus: 'PAID',
        paidDate: { gte: fyStart, lte: fyEnd }
      },
      select: {
        offlineLoan: { select: { loanNumber: true, customerName: true } },
        installmentNumber: true,
        totalAmount: true,
        paidAmount: true,
        principalAmount: true,
        interestAmount: true,
        paidDate: true,
        paymentMode: true  // ✅ field exists on OfflineLoanEMI - no cast
      },
      orderBy: { paidDate: 'asc' }
    });

    const emiRows = emiCollections.map(e => ({
      loan_number: e.offlineLoan.loanNumber,
      customer_name: e.offlineLoan.customerName,
      installment_no: e.installmentNumber,
      emi_amount: e.totalAmount,
      paid_amount: e.paidAmount,
      principal: e.principalAmount,
      interest: e.interestAmount,
      paid_date: e.paidDate?.toISOString().slice(0, 10) || '',
      payment_mode: e.paymentMode || ''  // ✅ no cast
    }));

    // ── 6. FY-accurate P&L — FIX: sum JE lines in FY, not currentBalance ─────
    //
    // INCOME accounts are credit-normal:  net = sum(creditAmount) - sum(debitAmount)
    // EXPENSE accounts are debit-normal:  net = sum(debitAmount)  - sum(creditAmount)

    const [incomeAccounts, expenseAccounts] = await Promise.all([
      db.chartOfAccount.findMany({
        where: { companyId, accountType: 'INCOME', isActive: true },
        select: { id: true, accountCode: true, accountName: true }
      }),
      db.chartOfAccount.findMany({
        where: { companyId, accountType: 'EXPENSE', isActive: true },
        select: { id: true, accountCode: true, accountName: true }
      })
    ]);

    const incomeIds  = incomeAccounts.map(a => a.id);
    const expenseIds = expenseAccounts.map(a => a.id);

    const [fyIncomeLines, fyExpenseLines] = await Promise.all([
      incomeIds.length > 0 ? db.journalEntryLine.findMany({
        where: {
          accountId: { in: incomeIds },
          journalEntry: { companyId, entryDate: { gte: fyStart, lte: fyEnd }, isReversed: false }
        },
        select: { accountId: true, debitAmount: true, creditAmount: true }
      }) : [],
      expenseIds.length > 0 ? db.journalEntryLine.findMany({
        where: {
          accountId: { in: expenseIds },
          journalEntry: { companyId, entryDate: { gte: fyStart, lte: fyEnd }, isReversed: false }
        },
        select: { accountId: true, debitAmount: true, creditAmount: true }
      }) : []
    ]);

    // Accumulate per account
    const incomeSummary = new Map(incomeAccounts.map(a => [a.id, { ...a, net: 0 }]));
    for (const l of fyIncomeLines) {
      const s = incomeSummary.get(l.accountId);
      if (s) s.net += (l.creditAmount || 0) - (l.debitAmount || 0);
    }

    const expenseSummary = new Map(expenseAccounts.map(a => [a.id, { ...a, net: 0 }]));
    for (const l of fyExpenseLines) {
      const s = expenseSummary.get(l.accountId);
      if (s) s.net += (l.debitAmount || 0) - (l.creditAmount || 0);
    }

    const totalIncome  = [...incomeSummary.values()].reduce((s, a) => s + a.net, 0);
    const totalExpense = [...expenseSummary.values()].reduce((s, a) => s + a.net, 0);
    const netProfitLoss = totalIncome - totalExpense;

    const plSummary = [
      `PROFIT & LOSS STATEMENT`,
      `Company: ${company.name} (${company.code})`,
      `Financial Year: ${label} (${fyStart.toDateString()} - ${fyEnd.toDateString()})`,
      `Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      `Basis: Journal entries posted within FY (not cumulative all-time balances)`,
      ``,
      `INCOME`,
      ...[...incomeSummary.values()].filter(a => a.net !== 0)
        .map(a => `  ${a.accountCode} - ${a.accountName}: ₹${a.net.toFixed(2)}`),
      `  TOTAL INCOME: ₹${totalIncome.toFixed(2)}`,
      ``,
      `EXPENSES`,
      ...[...expenseSummary.values()].filter(a => a.net !== 0)
        .map(a => `  ${a.accountCode} - ${a.accountName}: ₹${a.net.toFixed(2)}`),
      `  TOTAL EXPENSES: ₹${totalExpense.toFixed(2)}`,
      ``,
      `NET ${netProfitLoss >= 0 ? 'PROFIT' : 'LOSS'}: ₹${Math.abs(netProfitLoss).toFixed(2)}`
    ].join('\n');

    // ── Assemble ──────────────────────────────────────────────────────────────
    const files = [
      { name: 'journal_entries.csv',     content: toCSV(jeRows),     count: jeRows.length },
      { name: 'journal_entry_lines.csv', content: toCSV(jeLineRows), count: jeLineRows.length },
      { name: 'cashbook_entries.csv',    content: toCSV(cashRows),   count: cashRows.length },
      { name: 'bank_transactions.csv',   content: toCSV(bankTxRows), count: bankTxRows.length },
      { name: 'loan_portfolio.csv',      content: toCSV(loanRows),   count: loanRows.length },
      { name: 'emi_collections.csv',     content: toCSV(emiRows),    count: emiRows.length },
      { name: 'profit_loss_summary.txt', content: plSummary,         count: null },
    ];

    return NextResponse.json({
      success: true,
      company: { name: company.name, code: company.code },
      fyLabel: label,
      fyStart: fyStart.toISOString(),
      fyEnd: fyEnd.toISOString(),
      generatedAt: new Date().toISOString(),
      files,
      summary: {
        journalEntries: jeRows.length,
        cashEntries: cashRows.length,
        bankTransactions: bankTxRows.length,
        loans: loanRows.length,
        emiCollections: emiRows.length,
        totalIncome,
        totalExpense,
        netProfitLoss
      }
    });

  } catch (error) {
    console.error('[Export ZIP] Error:', error);
    return NextResponse.json({
      error: 'Export failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
