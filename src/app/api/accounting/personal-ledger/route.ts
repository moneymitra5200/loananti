import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Personal Ledger (Khata) API — Mirror-Aware
 *
 * Mirror logic:
 *   • If a loan has a MirrorLoanMapping → the MIRROR company "owns" that customer's ledger
 *   • If no mirror → the ORIGINAL company owns the ledger
 *
 * Data sources (real accounting, NOT journal entries):
 *   1. Loan disbursement row (from LoanApplication / OfflineLoan)
 *   2. EMI payments: EMISchedule.paidAmount, paidPrincipal, paidInterest, paidDate
 *   3. JournalEntry for processing fees (lookup by referenceId = loanId, referenceType = PROCESSING_FEE_COLLECTION)
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const loanId     = searchParams.get('loanId');
    const companyId  = searchParams.get('companyId');

    // ── LIST customers for a company ─────────────────────────────────────────
    if (!customerId && !loanId) {
      return await listCustomersForCompany(companyId);
    }

    // ── Full ledger for one customer ──────────────────────────────────────────
    if (customerId) {
      return await getPersonalLedger(customerId, companyId);
    }

    // ── Single loan ledger ────────────────────────────────────────────────────
    if (loanId) {
      return await getSingleLoanLedger(loanId);
    }

    return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });

  } catch (error: any) {
    console.error('[Personal Ledger] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch personal ledger', details: error.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// List customers for a company (mirror-aware)
// ─────────────────────────────────────────────────────────────────────────────
async function listCustomersForCompany(companyId: string | null) {
  const result: any[] = [];
  const seenCustomers = new Map<string, any>();

  const addOrMerge = (customerId: string, entry: any) => {
    const existing = seenCustomers.get(customerId);
    if (existing) {
      existing.totalLoans       += entry.totalLoans;
      existing.totalOutstanding += entry.totalOutstanding;
      existing.totalPaid        += entry.totalPaid;
    } else {
      seenCustomers.set(customerId, entry);
      result.push(entry);
    }
  };

  // ── 1. Mirror-mapped loans (this company is the MIRROR company) ─────────────
  if (companyId) {
    const mirrorMappings = await db.mirrorLoanMapping.findMany({
      where: { mirrorCompanyId: companyId, isOfflineLoan: false },
    });

    for (const mapping of mirrorMappings) {
      const loan = await db.loanApplication.findUnique({
        where: { id: mapping.originalLoanId },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          emiSchedules: { select: { paymentStatus: true, totalAmount: true, paidAmount: true } }
        }
      });
      if (!loan?.customer) continue;

      const outstanding = loan.emiSchedules.reduce((s, e) =>
        e.paymentStatus === 'PAID' ? s : s + (e.totalAmount - (e.paidAmount || 0)), 0);
      const totalPaid = loan.emiSchedules.reduce((s, e) => s + (e.paidAmount || 0), 0);

      addOrMerge(loan.customer.id, {
        id: loan.customer.id, name: loan.customer.name || 'Unknown',
        phone: loan.customer.phone || 'N/A', email: loan.customer.email,
        totalLoans: 1, totalOutstanding: outstanding, totalPaid
      });
    }
  }

  // ── 2. Non-mirrored ONLINE loans for this company ────────────────────────────
  const mirroredLoanIds = companyId
    ? (await db.mirrorLoanMapping.findMany({ where: { mirrorCompanyId: companyId, isOfflineLoan: false }, select: { originalLoanId: true } }))
        .map(m => m.originalLoanId)
    : [];

  const onlineWhere: any = {
    status: { in: ['ACTIVE', 'DISBURSED', 'CLOSED'] },
  };
  if (companyId) onlineWhere.companyId = companyId;
  if (mirroredLoanIds.length > 0) onlineWhere.id = { notIn: mirroredLoanIds };

  const onlineLoans = await db.loanApplication.findMany({
    where: onlineWhere,
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      emiSchedules: { select: { paymentStatus: true, totalAmount: true, paidAmount: true } }
    }
  });

  for (const loan of onlineLoans) {
    if (!loan.customer) continue;
    const outstanding = loan.emiSchedules.reduce((s, e) =>
      e.paymentStatus === 'PAID' ? s : s + (e.totalAmount - (e.paidAmount || 0)), 0);
    const totalPaid = loan.emiSchedules.reduce((s, e) => s + (e.paidAmount || 0), 0);

    addOrMerge(loan.customer.id, {
      id: loan.customer.id, name: loan.customer.name || 'Unknown',
      phone: loan.customer.phone || 'N/A', email: loan.customer.email,
      totalLoans: 1, totalOutstanding: outstanding, totalPaid
    });
  }

  // ── 3. OFFLINE loans for this company ────────────────────────────────────────
  const offlineWhere: any = { status: { in: ['ACTIVE', 'INTEREST_ONLY', 'CLOSED'] } };
  if (companyId) offlineWhere.companyId = companyId;

  const offlineLoans = await db.offlineLoan.findMany({
    where: offlineWhere,
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      emis: { select: { paymentStatus: true, totalAmount: true, paidAmount: true } }
    }
  });

  for (const loan of offlineLoans) {
    if (!loan.customer) continue;
    const outstanding = loan.emis.reduce((s, e) =>
      e.paymentStatus === 'PAID' ? s : s + (e.totalAmount - (e.paidAmount || 0)), 0);
    const totalPaid = loan.emis.reduce((s, e) => s + (e.paidAmount || 0), 0);

    addOrMerge(loan.customer.id, {
      id: loan.customer.id, name: loan.customer.name || 'Unknown',
      phone: loan.customer.phone || 'N/A', email: loan.customer.email,
      totalLoans: 1, totalOutstanding: outstanding, totalPaid
    });
  }

  result.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  return NextResponse.json({ success: true, borrowers: result });
}

// ─────────────────────────────────────────────────────────────────────────────
// Full personal ledger for a customer
// ─────────────────────────────────────────────────────────────────────────────
async function getPersonalLedger(customerId: string, companyId: string | null) {
  const customer = await db.user.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, phone: true, email: true, address: true }
  });

  const onlineLoans = await db.loanApplication.findMany({
    where: {
      customerId,
      status: { in: ['ACTIVE', 'DISBURSED', 'CLOSED'] }
    },
    include: {
      company:      { select: { id: true, name: true } },
      sessionForm:  { select: { approvedAmount: true, interestRate: true, tenure: true, emiAmount: true, processingFee: true } },
      emiSchedules: { orderBy: { installmentNumber: 'asc' } },
    }
  });

  const offlineLoans = await db.offlineLoan.findMany({
    where: {
      customerId,
      status: { in: ['ACTIVE', 'INTEREST_ONLY', 'CLOSED'] }
    },
    include: {
      company: { select: { id: true, name: true } },
      emis:    { orderBy: { dueDate: 'asc' } }
    }
  });

  // Build loan summaries
  const onlineLoansSummary = onlineLoans.map(l => ({
    id: l.id,
    loanNumber: l.applicationNo,
    type: 'ONLINE',
    status: l.status,
    amount: l.sessionForm?.approvedAmount || l.requestedAmount || 0,
    disbursementDate: l.disbursedAt,
    interestRate: l.sessionForm?.interestRate || 0,
    tenure: l.sessionForm?.tenure || 0,
    isMirror: false
  }));

  const offlineLoansSummary = offlineLoans.map(l => ({
    id: l.id,
    loanNumber: l.loanNumber,
    type: 'OFFLINE',
    status: l.status,
    amount: l.loanAmount,
    disbursementDate: l.disbursementDate,
    interestRate: l.interestRate || 0,
    tenure: l.tenure || 0,
    isMirror: false
  }));

  // Build real accounting entries per loan
  const allEntries: any[] = [];

  for (const loan of onlineLoans) {
    const loanEntries = await buildEntriesForOnlineLoan(loan);
    allEntries.push(...loanEntries);
  }

  for (const loan of offlineLoans) {
    const loanEntries = buildEntriesForOfflineLoan(loan);
    allEntries.push(...loanEntries);
  }

  allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return NextResponse.json({
    success: true,
    customerSummary: {
      ...customer,
      onlineLoans: onlineLoansSummary,
      offlineLoans: offlineLoansSummary
    },
    entries: allEntries
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Build entries for one online loan from real EMI data
// ─────────────────────────────────────────────────────────────────────────────
async function buildEntriesForOnlineLoan(loan: any) {
  const entries: any[] = [];
  const loanId     = loan.id;
  const loanNumber = loan.applicationNo;
  const loanAmount = loan.sessionForm?.approvedAmount || loan.requestedAmount || 0;
  const processingFee = loan.sessionForm?.processingFee || 0;

  // 1. Disbursement
  if (loan.disbursedAt) {
    entries.push({
      id: `disb-${loanId}`,
      date: loan.disbursedAt,
      referenceType: 'LOAN_DISBURSEMENT',
      referenceId: loanId, loanId, loanNumber,
      narration: `Loan Disbursed — ${loanNumber}`,
      lines: [
        { accountCode: '1200', accountName: 'Loans Receivable', debitAmount: loanAmount, creditAmount: 0 },
        { accountCode: '1102', accountName: 'Bank Account',     debitAmount: 0, creditAmount: loanAmount }
      ]
    });
  }

  // 2. Processing Fee (from journal entry date, else disburse date)
  if (processingFee > 0) {
    const pfJournal = await db.journalEntry.findFirst({
      where: { referenceType: 'PROCESSING_FEE_COLLECTION', referenceId: loanId, isReversed: false },
      select: { entryDate: true }
    });
    entries.push({
      id: `pf-${loanId}`,
      date: pfJournal?.entryDate || loan.disbursedAt || new Date(),
      referenceType: 'PROCESSING_FEE_COLLECTION',
      referenceId: loanId, loanId, loanNumber,
      narration: `Processing Fee — ${loanNumber}`,
      lines: [
        { accountCode: '1102', accountName: 'Bank Account',          debitAmount: processingFee, creditAmount: 0 },
        { accountCode: '4121', accountName: 'Processing Fee Income', debitAmount: 0, creditAmount: processingFee }
      ]
    });
  }

  // 3. EMI payments from real EMI schedule records
  for (const emi of (loan.emiSchedules || [])) {
    if (!emi.paidDate || emi.paidAmount <= 0) continue;

    const paidPrincipal = emi.paidPrincipal || 0;
    const paidInterest  = emi.paidInterest  || 0;
    const paidTotal     = emi.paidAmount    || 0;

    entries.push({
      id: `emi-${emi.id}`,
      date: emi.paidDate,
      referenceType: emi.isInterestOnly ? 'INTEREST_ONLY_PAYMENT' : emi.isPartialPayment ? 'PARTIAL_EMI_PAYMENT' : 'EMI_PAYMENT',
      referenceId: emi.id, loanId, loanNumber,
      narration: `EMI #${emi.installmentNumber} — ${loanNumber}${emi.isInterestOnly ? ' [Interest Only]' : emi.isPartialPayment ? ' [Partial]' : ''}`,
      emiNumber: emi.installmentNumber,
      lines: [
        { accountCode: '1102', accountName: 'Bank/Cash',        debitAmount: paidTotal,     creditAmount: 0 },
        ...(paidPrincipal > 0 ? [{ accountCode: '1200', accountName: 'Loans Receivable', debitAmount: 0, creditAmount: paidPrincipal }] : []),
        ...(paidInterest  > 0 ? [{ accountCode: '4110', accountName: 'Interest Income',  debitAmount: 0, creditAmount: paidInterest  }] : []),
      ]
    });
  }

  return entries;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build entries for one offline loan from EMI records
// ─────────────────────────────────────────────────────────────────────────────
function buildEntriesForOfflineLoan(loan: any) {
  const entries: any[] = [];
  const loanId     = loan.id;
  const loanNumber = loan.loanNumber;

  if (loan.disbursementDate) {
    entries.push({
      id: `offline-disb-${loanId}`,
      date: loan.disbursementDate,
      referenceType: 'LOAN_DISBURSEMENT',
      referenceId: loanId, loanId, loanNumber,
      narration: `Loan Disbursed — ${loanNumber}`,
      lines: [
        { accountCode: '1200', accountName: 'Loans Receivable', debitAmount: loan.loanAmount, creditAmount: 0 },
        { accountCode: '1101', accountName: 'Cash/Bank',        debitAmount: 0, creditAmount: loan.loanAmount }
      ]
    });
  }

  for (const emi of (loan.emis || [])) {
    if (!emi.paidDate || emi.paidAmount <= 0) continue;

    const paidPrincipal = emi.paidPrincipal || 0;
    const paidInterest  = emi.paidInterest  || 0;
    const paidTotal     = emi.paidAmount    || 0;

    entries.push({
      id: `offline-emi-${emi.id}`,
      date: emi.paidDate,
      referenceType: 'EMI_PAYMENT',
      referenceId: emi.id, loanId, loanNumber,
      narration: `EMI #${emi.installmentNumber} — ${loanNumber}`,
      emiNumber: emi.installmentNumber,
      lines: [
        { accountCode: '1101', accountName: 'Cash/Bank',        debitAmount: paidTotal,     creditAmount: 0 },
        ...(paidPrincipal > 0 ? [{ accountCode: '1200', accountName: 'Loans Receivable', debitAmount: 0, creditAmount: paidPrincipal }] : []),
        ...(paidInterest  > 0 ? [{ accountCode: '4110', accountName: 'Interest Income',  debitAmount: 0, creditAmount: paidInterest  }] : []),
      ]
    });
  }

  return entries;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single loan ledger
// ─────────────────────────────────────────────────────────────────────────────
async function getSingleLoanLedger(loanId: string) {
  const loan = await db.loanApplication.findUnique({
    where: { id: loanId },
    include: {
      customer:     { select: { id: true, name: true, phone: true } },
      company:      { select: { id: true, name: true } },
      sessionForm:  true,
      emiSchedules: { orderBy: { installmentNumber: 'asc' } },
    }
  });

  if (!loan) {
    return NextResponse.json({ success: false, error: 'Loan not found' }, { status: 404 });
  }

  const entries = await buildEntriesForOnlineLoan(loan);
  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return NextResponse.json({
    success: true,
    loanSummary: { id: loan.id, loanNumber: loan.applicationNo, customer: loan.customer, company: loan.company },
    entries
  });
}
