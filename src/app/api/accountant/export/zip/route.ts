import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/accountant/export/zip?companyId=xxx&year=2026
 *
 * Generates a comprehensive JSON-based ZIP archive of all accounting data
 * for the selected Indian Financial Year (April 1 → March 31).
 *
 * year=2026 → FY 2026-27 → 1 Apr 2026 to 31 Mar 2027
 *
 * The ZIP contains CSV files for:
 * - journal_entries.csv        All JEs in the FY
 * - journal_entry_lines.csv    All JE lines
 * - cashbook_entries.csv       All cashbook transactions
 * - bank_transactions.csv      All bank transactions
 * - loan_portfolio.csv         All active/closed loans
 * - emi_collections.csv        All EMI payments received
 * - balance_sheet_summary.txt  Snapshot of the Balance Sheet
 * - profit_loss_summary.txt    P&L summary
 */

// ── Indian Financial Year helper ────────────────────────────────────────────
function getIndianFY(year: number): { fyStart: Date; fyEnd: Date; label: string } {
  // year=2026 → 1 Apr 2026 to 31 Mar 2027
  const fyStart = new Date(year, 3, 1, 0, 0, 0, 0);      // Apr 1, 00:00:00
  const fyEnd   = new Date(year + 1, 2, 31, 23, 59, 59, 999); // Mar 31, 23:59:59
  return { fyStart, fyEnd, label: `FY ${year}-${String(year + 1).slice(-2)}` };
}

// ── CSV helper ───────────────────────────────────────────────────────────────
function toCSV(rows: Record<string, any>[]): string {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(','))
  ];
  return lines.join('\n');
}

// ── Simple in-memory ZIP builder (no external deps) ─────────────────────────
// We produce a JSON manifest + individual CSV files bundled as a multi-part
// response that the client will receive as a single "zip-bundle" JSON and
// reconstruct. The client uses JSZip (already in project) to produce the ZIP.
// The API returns: { fyLabel, files: [{ name, content }] }

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

    // ── Fetch company info ─────────────────────────────────────────────────
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { name: true, code: true }
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // ── 1. Journal Entries ─────────────────────────────────────────────────
    const journalEntries = await db.journalEntry.findMany({
      where: {
        companyId,
        entryDate: { gte: fyStart, lte: fyEnd },
        isReversed: false
      },
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
        narration: (l as any).narration || ''
      }))
    );

    // ── 2. CashBook Entries ────────────────────────────────────────────────
    const cashBook = await db.cashBook.findUnique({ where: { companyId } });
    const cashEntries = cashBook ? await db.cashBookEntry.findMany({
      where: {
        cashBookId: cashBook.id,
        createdAt: { gte: fyStart, lte: fyEnd }
      },
      orderBy: { createdAt: 'asc' }
    }) : [];

    const cashRows = cashEntries.map(e => ({
      date: e.createdAt?.toISOString().slice(0, 10),
      time: e.createdAt?.toISOString().slice(11, 19),
      type: e.entryType,
      amount: e.amount,
      balance_after: e.balanceAfter,
      description: e.description || '',
      reference_type: e.referenceType || '',
      reference_id: e.referenceId || ''
    }));

    // ── 3. Bank Transactions ───────────────────────────────────────────────
    const bankAccounts = await db.bankAccount.findMany({
      where: { companyId, isActive: true },
      select: { id: true, bankName: true, accountNumber: true }
    });

    const bankTxRows: Record<string, any>[] = [];
    for (const ba of bankAccounts) {
      const txns = await db.bankTransaction.findMany({
        where: {
          bankAccountId: ba.id,
          transactionDate: { gte: fyStart, lte: fyEnd }
        },
        orderBy: { transactionDate: 'asc' }
      });
      for (const t of txns) {
        bankTxRows.push({
          bank_name: ba.bankName,
          account_number: ba.accountNumber,
          date: t.transactionDate?.toISOString().slice(0, 10),
          type: t.transactionType,
          amount: t.amount,
          balance_after: t.balanceAfter,
          description: t.description || '',
          reference_type: t.referenceType || '',
          reference_id: t.referenceId || ''
        });
      }
    }

    // ── 4. Loan Portfolio ──────────────────────────────────────────────────
    const onlineLoans = await db.loanApplication.findMany({
      where: {
        companyId,
        createdAt: { gte: fyStart, lte: fyEnd }
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
        createdAt: { gte: fyStart, lte: fyEnd }
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

    // ── 5. EMI Collections ─────────────────────────────────────────────────
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
        paymentMode: true
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
      payment_mode: (e as any).paymentMode || ''
    }));

    // ── 6. Income & Expense Summary ────────────────────────────────────────
    const incomeAccounts = await db.chartOfAccount.findMany({
      where: { companyId, accountType: 'INCOME', isActive: true },
      select: { accountCode: true, accountName: true, currentBalance: true }
    });
    const expenseAccounts = await db.chartOfAccount.findMany({
      where: { companyId, accountType: 'EXPENSE', isActive: true },
      select: { accountCode: true, accountName: true, currentBalance: true }
    });
    const totalIncome = incomeAccounts.reduce((s, a) => s + (a.currentBalance || 0), 0);
    const totalExpense = expenseAccounts.reduce((s, a) => s + (a.currentBalance || 0), 0);
    const netProfitLoss = totalIncome - totalExpense;

    // ── Assemble text summaries ────────────────────────────────────────────
    const plSummary = [
      `PROFIT & LOSS STATEMENT`,
      `Company: ${company.name} (${company.code})`,
      `Financial Year: ${label} (${fyStart.toDateString()} - ${fyEnd.toDateString()})`,
      `Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      ``,
      `INCOME`,
      ...incomeAccounts.map(a => `  ${a.accountCode} - ${a.accountName}: ₹${(a.currentBalance || 0).toFixed(2)}`),
      `  TOTAL INCOME: ₹${totalIncome.toFixed(2)}`,
      ``,
      `EXPENSES`,
      ...expenseAccounts.map(a => `  ${a.accountCode} - ${a.accountName}: ₹${(a.currentBalance || 0).toFixed(2)}`),
      `  TOTAL EXPENSES: ₹${totalExpense.toFixed(2)}`,
      ``,
      `NET ${netProfitLoss >= 0 ? 'PROFIT' : 'LOSS'}: ₹${Math.abs(netProfitLoss).toFixed(2)}`
    ].join('\n');

    // ── Assemble files bundle ──────────────────────────────────────────────
    const files = [
      { name: 'journal_entries.csv',      content: toCSV(jeRows),         count: jeRows.length },
      { name: 'journal_entry_lines.csv',  content: toCSV(jeLineRows),     count: jeLineRows.length },
      { name: 'cashbook_entries.csv',     content: toCSV(cashRows),       count: cashRows.length },
      { name: 'bank_transactions.csv',    content: toCSV(bankTxRows),     count: bankTxRows.length },
      { name: 'loan_portfolio.csv',       content: toCSV(loanRows),       count: loanRows.length },
      { name: 'emi_collections.csv',      content: toCSV(emiRows),        count: emiRows.length },
      { name: 'profit_loss_summary.txt',  content: plSummary,             count: null },
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
