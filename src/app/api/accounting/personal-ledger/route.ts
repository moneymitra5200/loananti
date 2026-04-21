import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Personal Ledger (Khata) API — Reads from Journal Entries (Real Accounting)
 *
 * PRINCIPLE: Personal Ledger is the subsidiary ledger for "Loans Receivable".
 * It is POSTED FROM the Journal / Day Book — just like real accounting.
 *
 * Only journal entry lines that debit or credit the Loans Receivable account
 * (codes 1200 / 1201 / 1210) appear here.
 *
 * Consequence: Processing Fee entries (Dr. Bank / Cr. Processing Fee Income)
 * do NOT appear in the Personal Ledger because they do not touch Loans Receivable.
 *
 * MIRROR RULE:
 *   • Loan has mirror → Receivable belongs to MIRROR company.
 *     Original company does NOT carry this receivable.
 *     Mirror company's journal entry (linked via mirrorLoanId) is the source of truth.
 *   • Loan has no mirror → Original company carries the receivable.
 *
 * CONTROL ACCOUNT:
 *   Loans Receivable (1200) in Trial Balance = SUM of all personal ledger balances.
 *   This is the subsidiary-to-control reconciliation.
 */

// Loans Receivable account codes
const LR_CODES = ['1200', '1201', '1210'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const loanId     = searchParams.get('loanId');
    const companyId  = searchParams.get('companyId');

    if (!customerId && !loanId) {
      return await listCustomersForCompany(companyId);
    }
    if (customerId) {
      return await getPersonalLedger(customerId, companyId);
    }
    if (loanId) {
      return await getSingleLoanLedger(loanId, companyId);
    }

    return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });

  } catch (error: any) {
    console.error('[Personal Ledger] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch personal ledger', details: error.message },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Get the Loans Receivable account IDs for a company (or all companies)
// ─────────────────────────────────────────────────────────────────────────────
async function getLRAccountIds(companyId: string | null): Promise<string[]> {
  const where: any = { accountCode: { in: LR_CODES } };
  if (companyId) where.companyId = companyId;
  const accounts = await db.chartOfAccount.findMany({
    where,
    select: { id: true }
  });
  return accounts.map(a => a.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST: Customers with their Loans Receivable outstanding balance
// Source: Journal Entry Lines touching Loans Receivable account
// ─────────────────────────────────────────────────────────────────────────────
async function listCustomersForCompany(companyId: string | null) {
  // 1. Get Loans Receivable account IDs
  const lrAccountIds = await getLRAccountIds(companyId);

  if (lrAccountIds.length === 0) {
    // Fallback: use EMI data if no journal entries exist yet
    return listCustomersFallback(companyId);
  }

  // 2. Fetch all JournalEntryLines touching LR accounts
  const lines = await db.journalEntryLine.findMany({
    where: {
      accountId: { in: lrAccountIds },
      journalEntry: {
        isReversed: false,
        ...(companyId ? { companyId } : {}),
      },
    },
    select: {
      debitAmount:  true,
      creditAmount: true,
      loanId:       true,
      customerId:   true,
      journalEntry: {
        select: { companyId: true }
      }
    }
  });

  // If no journal entries found at all, use fallback
  if (lines.length === 0) {
    return listCustomersFallback(companyId);
  }

  // 3. Collect unique loan IDs from lines (some lines may only have customerId)
  const loanIdsFromLines = [...new Set(lines.map(l => l.loanId).filter(Boolean) as string[])];

  // 4. Get mirror mappings to apply mirror rule
  const mirrorMappings = loanIdsFromLines.length > 0
    ? await db.mirrorLoanMapping.findMany({
        where: { originalLoanId: { in: loanIdsFromLines }, isOfflineLoan: false },
        select: { originalLoanId: true, mirrorCompanyId: true }
      })
    : [];
  const mirroredLoanIds    = new Set(mirrorMappings.map(m => m.originalLoanId));
  const mirrorCompanyOfLoan = new Map(mirrorMappings.map(m => [m.originalLoanId, m.mirrorCompanyId]));

  // 5. Build customer name map from loanId
  const onlineLoans = loanIdsFromLines.length > 0
    ? await db.loanApplication.findMany({
        where: { id: { in: loanIdsFromLines } },
        select: { id: true, customer: { select: { id: true, name: true, phone: true, email: true } } }
      })
    : [];
  const offlineLoans = loanIdsFromLines.length > 0
    ? await db.offlineLoan.findMany({
        where: { id: { in: loanIdsFromLines } },
        select: { id: true, customer: { select: { id: true, name: true, phone: true, email: true } } }
      })
    : [];

  const loanToCustomer = new Map<string, { id: string; name: string; phone: string; email: string }>();
  for (const l of onlineLoans) {
    if (l.customer) loanToCustomer.set(l.id, { id: l.customer.id, name: l.customer.name || 'Unknown', phone: l.customer.phone || '', email: l.customer.email || '' });
  }
  for (const l of offlineLoans) {
    if (l.customer) loanToCustomer.set(l.id, { id: l.customer.id, name: l.customer.name || 'Unknown', phone: l.customer.phone || '', email: l.customer.email || '' });
  }

  // 6. Also build customer map for lines that have customerId but no loanId
  const customerIdsFromLines = [...new Set(lines.filter(l => !l.loanId && l.customerId).map(l => l.customerId!) )];
  const customersById = customerIdsFromLines.length > 0
    ? await db.user.findMany({
        where: { id: { in: customerIdsFromLines } },
        select: { id: true, name: true, phone: true, email: true }
      })
    : [];
  const customerMap = new Map(customersById.map(c => [c.id, c]));

  // 7. Apply mirror rule and group by customer
  type CustomerAccum = {
    id: string; name: string; phone: string; email: string;
    totalDebits: number; totalCredits: number; loans: Set<string>;
    isMirror: boolean;
  };
  const byCustomer = new Map<string, CustomerAccum>();

  for (const line of lines) {
    // Determine if this line should be included for the requested company
    if (line.loanId) {
      if (mirroredLoanIds.has(line.loanId) && companyId) {
        // Has mirror: only include if viewing from the MIRROR company
        const mirrorCo = mirrorCompanyOfLoan.get(line.loanId);
        if (mirrorCo !== companyId) continue; // Skip — original company view
      }
    }

    // Get customer info
    let customer: { id: string; name: string; phone: string; email: string } | undefined;
    if (line.loanId) {
      customer = loanToCustomer.get(line.loanId);
    } else if (line.customerId) {
      const c = customerMap.get(line.customerId);
      if (c) customer = { id: c.id, name: c.name || 'Unknown', phone: c.phone || '', email: c.email || '' };
    }
    if (!customer) continue;

    const isMirror = line.loanId ? mirroredLoanIds.has(line.loanId) : false;

    if (!byCustomer.has(customer.id)) {
      byCustomer.set(customer.id, {
        id: customer.id, name: customer.name, phone: customer.phone, email: customer.email,
        totalDebits: 0, totalCredits: 0, loans: new Set(),
        isMirror,
      });
    }
    const acc = byCustomer.get(customer.id)!;
    acc.totalDebits  += line.debitAmount;
    acc.totalCredits += line.creditAmount;
    if (line.loanId) acc.loans.add(line.loanId);
  }

  const result = [...byCustomer.values()].map(c => ({
    id:               c.id,
    name:             c.name,
    phone:            c.phone,
    email:            c.email,
    totalLoans:       c.loans.size,
    totalOutstanding: Math.max(0, c.totalDebits - c.totalCredits),
    totalPaid:        c.totalCredits,
    isMirror:         c.isMirror,
  })).filter(c => c.totalLoans > 0 || c.totalOutstanding > 0);

  result.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

  const totalLoansReceivable = result.reduce((s, c) => s + c.totalOutstanding, 0);

  return NextResponse.json({
    success: true,
    borrowers: result,
    totalLoansReceivable,
    debtorCount: result.filter(c => c.totalOutstanding > 0).length,
    source: 'journal_entries', // indicates data is from real journal entries
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK: Used when no journal entries exist yet (e.g. old data)
// Reads from EMI schedules directly but still excludes processing fee
// ─────────────────────────────────────────────────────────────────────────────
async function listCustomersFallback(companyId: string | null) {
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

  // Mirror-mapped loans (mirror company owns receivable)
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
        totalLoans: 1, totalOutstanding: outstanding, totalPaid, isMirror: true,
      });
    }
  }

  // All mirrored original loan IDs globally (to exclude from non-mirror company view)
  const allMirroredLoanIds = (await db.mirrorLoanMapping.findMany({
    where: { isOfflineLoan: false }, select: { originalLoanId: true }
  })).map(m => m.originalLoanId);

  const onlineWhere: any = { status: { in: ['ACTIVE', 'DISBURSED', 'CLOSED', 'ACTIVE_INTEREST_ONLY'] } };
  if (companyId) onlineWhere.companyId = companyId;
  if (allMirroredLoanIds.length > 0) onlineWhere.id = { notIn: allMirroredLoanIds };

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
      totalLoans: 1, totalOutstanding: outstanding, totalPaid, isMirror: false,
    });
  }

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
      totalLoans: 1, totalOutstanding: outstanding, totalPaid, isMirror: false,
    });
  }

  result.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  const totalLoansReceivable = result.reduce((s, c) => s + c.totalOutstanding, 0);

  return NextResponse.json({
    success: true,
    borrowers: result,
    totalLoansReceivable,
    debtorCount: result.filter(c => c.totalOutstanding > 0).length,
    source: 'emi_fallback',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONAL LEDGER for one customer — posted from Journal Entries
// ─────────────────────────────────────────────────────────────────────────────
async function getPersonalLedger(customerId: string, companyId: string | null) {
  const customer = await db.user.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, phone: true, email: true, address: true }
  });

  // Get all loans for this customer
  const allOnlineLoans = await db.loanApplication.findMany({
    where: { customerId, status: { in: ['ACTIVE', 'DISBURSED', 'CLOSED', 'ACTIVE_INTEREST_ONLY'] } },
    select: {
      id: true, applicationNo: true, status: true, companyId: true,
      requestedAmount: true, disbursedAt: true,
      sessionForm: { select: { approvedAmount: true, interestRate: true, tenure: true, processingFee: true } },
      company: { select: { id: true, name: true } },
    }
  });
  const allOfflineLoans = await db.offlineLoan.findMany({
    where: { customerId, status: { in: ['ACTIVE', 'INTEREST_ONLY', 'CLOSED'] } },
    select: {
      id: true, loanNumber: true, status: true, companyId: true,
      loanAmount: true, disbursementDate: true, interestRate: true, tenure: true,
      company: { select: { id: true, name: true } },
    }
  });

  // Mirror rule: which online loans are mirrored?
  const onlineLoanIds = allOnlineLoans.map(l => l.id);
  const mirrorMappings = onlineLoanIds.length > 0
    ? await db.mirrorLoanMapping.findMany({
        where: { originalLoanId: { in: onlineLoanIds }, isOfflineLoan: false },
        select: { originalLoanId: true, mirrorCompanyId: true }
      })
    : [];
  const mirroredIds     = new Set(mirrorMappings.map(m => m.originalLoanId));
  const mirrorCoOfLoan  = new Map(mirrorMappings.map(m => [m.originalLoanId, m.mirrorCompanyId]));

  // Filter loans by mirror rule
  const validOnlineLoans = allOnlineLoans.filter(l => {
    if (!mirroredIds.has(l.id)) {
      // No mirror: include if company matches (or no company filter)
      return !companyId || l.companyId === companyId;
    }
    // Has mirror: only include if viewing from MIRROR company
    if (!companyId) return true; // no filter → include all
    return mirrorCoOfLoan.get(l.id) === companyId;
  });

  const validOfflineLoans = allOfflineLoans.filter(l =>
    !companyId || l.companyId === companyId
  );

  const validLoanIds = [
    ...validOnlineLoans.map(l => l.id),
    ...validOfflineLoans.map(l => l.id),
  ];

  if (validLoanIds.length === 0) {
    return NextResponse.json({
      success: true,
      customerSummary: { ...customer, onlineLoans: [], offlineLoans: [], totalOutstanding: 0 },
      entries: [],
      source: 'journal_entries',
    });
  }

  // ── Get Loans Receivable account IDs ─────────────────────────────────────
  const lrAccountIds = await getLRAccountIds(companyId);

  // ── Fetch Journal Entries that have a line touching LR for these loans ────
  // This is the "posting from journal to personal ledger" step
  let journalEntries: any[] = [];
  if (lrAccountIds.length > 0) {
    journalEntries = await db.journalEntry.findMany({
      where: {
        isReversed: false,
        ...(companyId ? { companyId } : {}),
        lines: {
          some: {
            accountId: { in: lrAccountIds },
            loanId: { in: validLoanIds },
          }
        }
      },
      include: {
        lines: {
          include: {
            account: { select: { id: true, accountCode: true, accountName: true } }
          }
        }
      },
      orderBy: { entryDate: 'asc' }
    });
  }

  // ── Fall back to EMI-based entries if no journal entries found ─────────────
  if (journalEntries.length === 0) {
    return getPersonalLedgerFallback(customerId, companyId, customer, validOnlineLoans, validOfflineLoans, mirroredIds);
  }

  // ── Build per-loan statements from journal entries ─────────────────────────
  const loanDataMap = new Map<string, { loanNumber: string; loanType: string; loanAmount: number; interestRate: number; tenure: number; status: string; disbursementDate: any; isMirror: boolean; companyName: string }>();
  for (const l of validOnlineLoans) {
    loanDataMap.set(l.id, {
      loanNumber: l.applicationNo,
      loanType: 'ONLINE',
      loanAmount: l.sessionForm?.approvedAmount || l.requestedAmount || 0,
      interestRate: l.sessionForm?.interestRate || 0,
      tenure: l.sessionForm?.tenure || 0,
      status: l.status,
      disbursementDate: l.disbursedAt,
      isMirror: mirroredIds.has(l.id),
      companyName: l.company?.name || '',
    });
  }
  for (const l of validOfflineLoans) {
    loanDataMap.set(l.id, {
      loanNumber: l.loanNumber,
      loanType: 'OFFLINE',
      loanAmount: l.loanAmount,
      interestRate: l.interestRate || 0,
      tenure: l.tenure || 0,
      status: l.status,
      disbursementDate: l.disbursementDate,
      isMirror: false,
      companyName: l.company?.name || '',
    });
  }

  // Group journal entries by loanId
  const entriesByLoan = new Map<string, any[]>();
  for (const je of journalEntries) {
    // Find which loanId(s) this entry touches via its LR lines
    const rawLoanIds = je.lines
        .filter((l: any) => lrAccountIds.includes(l.accountId) && l.loanId)
        .map((l: any) => String(l.loanId));
    const loanIdsInEntry: string[] = Array.from(new Set<string>(rawLoanIds));
    for (const lid of loanIdsInEntry) {
      if (!entriesByLoan.has(lid)) entriesByLoan.set(lid, []);
      entriesByLoan.get(lid)!.push(je);
    }
  }

  // Build loan statement entries (only those from journal entries, only affecting LR)
  const allEntries: any[] = [];
  const onlineLoansSummary: any[] = [];
  const offlineLoansSummary: any[] = [];

  for (const loanId of validLoanIds) {
    const meta = loanDataMap.get(loanId);
    if (!meta) continue;

    const loanJEs = entriesByLoan.get(loanId) || [];

    for (const je of loanJEs) {
      // Only iterate lines that touch LR account AND belong to this loan
      const lrLines = je.lines.filter((l: any) =>
        lrAccountIds.includes(l.accountId) && l.loanId === loanId
      );
      if (lrLines.length === 0) continue;

      const principalPaid = lrLines.reduce((s: number, l: any) => s + l.creditAmount, 0);
      const principalDisbursed = lrLines.reduce((s: number, l: any) => s + l.debitAmount, 0);

      // Interest is on other lines of same entry
      const interestLines = je.lines.filter((l: any) =>
        ['4110', '4100', '4001', '4002'].includes(l.account?.accountCode || '') && l.loanId === loanId
      );
      const interestPaid = interestLines.reduce((s: number, l: any) => s + l.creditAmount, 0);

      const totalPayment = (principalPaid > 0 || interestPaid > 0)
        ? principalPaid + interestPaid
        : null;

      // Determine EMI number from narration
      const emiMatch = je.narration?.match(/#(\d+)/);
      const emiNumber = emiMatch ? parseInt(emiMatch[1]) : undefined;

      // Description: derive from referenceType and narration
      const desc = buildDescription(je.referenceType, je.narration, emiNumber, meta.loanNumber, customer?.name || '');

      allEntries.push({
        id: je.id,
        date: je.entryDate,
        referenceType: je.referenceType,
        referenceId: je.referenceId,
        loanId,
        loanNumber: meta.loanNumber,
        emiNumber,
        narration: je.narration,
        description: desc,
        principalDisbursed,
        principalPaid,
        interestPaid,
        totalPayment,
        // All lines of the entry for display
        lines: je.lines.map((l: any) => ({
          accountCode: l.account?.accountCode || '',
          accountName: l.account?.accountCode && LR_CODES.includes(l.account.accountCode)
            ? `Loans Receivable — ${customer?.name || ''}`
            : (l.account?.accountName || 'Account'),
          debitAmount: l.debitAmount,
          creditAmount: l.creditAmount,
          narration: l.narration,
        })),
      });
    }

    // Compute outstanding for this loan from its journal entries
    const loanJEsAll = entriesByLoan.get(loanId) || [];
    const totalDisbursed = loanJEsAll.reduce((s, je) => {
      const lrLines = je.lines.filter((l: any) => lrAccountIds.includes(l.accountId) && l.loanId === loanId);
      return s + lrLines.reduce((ss: number, l: any) => ss + l.debitAmount, 0);
    }, 0);
    const totalRepaid = loanJEsAll.reduce((s, je) => {
      const lrLines = je.lines.filter((l: any) => lrAccountIds.includes(l.accountId) && l.loanId === loanId);
      return s + lrLines.reduce((ss: number, l: any) => ss + l.creditAmount, 0);
    }, 0);
    const totalInterestCollected = loanJEsAll.reduce((s, je) => {
      const iLines = je.lines.filter((l: any) =>
        ['4110', '4100', '4001', '4002'].includes(l.account?.accountCode || '') && l.loanId === loanId
      );
      return s + iLines.reduce((ss: number, l: any) => ss + l.creditAmount, 0);
    }, 0);
    const outstanding = Math.max(0, totalDisbursed - totalRepaid);
    const totalPaid = totalRepaid + totalInterestCollected;

    const summary = {
      id: loanId,
      loanNumber: meta.loanNumber,
      type: meta.loanType,
      status: meta.status,
      amount: meta.loanAmount || totalDisbursed,
      disbursementDate: meta.disbursementDate,
      interestRate: meta.interestRate,
      tenure: meta.tenure,
      isMirror: meta.isMirror,
      companyName: meta.companyName,
      outstanding,
      totalPaid,
      totalInterestPaid: totalInterestCollected,
      totalPrincipalPaid: totalRepaid,
    };

    if (meta.loanType === 'ONLINE') onlineLoansSummary.push(summary);
    else offlineLoansSummary.push(summary);
  }

  allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalOutstanding = [...onlineLoansSummary, ...offlineLoansSummary]
    .reduce((s, l) => s + l.outstanding, 0);

  return NextResponse.json({
    success: true,
    customerSummary: {
      ...customer,
      onlineLoans: onlineLoansSummary,
      offlineLoans: offlineLoansSummary,
      totalOutstanding,
    },
    entries: allEntries,
    source: 'journal_entries',
  });
}

function buildDescription(refType: string, narration: string, emiNumber: number | undefined, loanNumber: string, customerName: string): string {
  const t = (refType || '').toUpperCase();
  if (t === 'LOAN_DISBURSEMENT' || t === 'MIRROR_LOAN_DISBURSEMENT') return `Loan Disbursed — ${loanNumber}`;
  if (t === 'EMI_PAYMENT' || t === 'MIRROR_EMI_PAYMENT') return emiNumber ? `Monthly EMI #${emiNumber}` : 'EMI Payment';
  if (t === 'INTEREST_ONLY_PAYMENT') return `EMI #${emiNumber || '?'} — Interest Only`;
  if (t === 'PARTIAL_EMI_PAYMENT') return `EMI #${emiNumber || '?'} — Partial Payment`;
  if (t === 'PENALTY_COLLECTION') return 'Late Penalty';
  if (t === 'EXTRA_EMI_PAYMENT') return `Extra EMI #${emiNumber || ''}`;
  return narration?.replace(/\[.*?\]/g, '').replace(/mirror/gi, '').trim() || refType?.replace(/_/g, ' ') || 'Transaction';
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK personal ledger (EMI-based, but NO processing fee)
// ─────────────────────────────────────────────────────────────────────────────
async function getPersonalLedgerFallback(customerId: string, companyId: string | null, customer: any, onlineLoans: any[], offlineLoans: any[], mirroredIds: Set<string>) {
  const allEntries: any[] = [];
  const onlineLoansSummary: any[] = [];
  const offlineLoansSummary: any[] = [];

  for (const loan of onlineLoans) {
    const fullLoan = await db.loanApplication.findUnique({
      where: { id: loan.id },
      include: { sessionForm: true, emiSchedules: { orderBy: { installmentNumber: 'asc' } } }
    });
    if (!fullLoan) continue;

    const loanAmount = fullLoan.sessionForm?.approvedAmount || fullLoan.requestedAmount || 0;
    const isMirror = mirroredIds.has(loan.id);
    const receivableLabel = `Loans Receivable — ${customer?.name || ''}`;

    if (fullLoan.disbursedAt) {
      allEntries.push({
        id: `disb-${loan.id}`, date: fullLoan.disbursedAt, referenceType: 'LOAN_DISBURSEMENT',
        loanId: loan.id, loanNumber: loan.applicationNo,
        description: `Loan Disbursed — ${loan.applicationNo}`,
        principalDisbursed: loanAmount, principalPaid: 0, interestPaid: 0, totalPayment: null,
        lines: [
          { accountCode: '1200', accountName: receivableLabel, debitAmount: loanAmount, creditAmount: 0 },
          { accountCode: '1102', accountName: 'Bank Account', debitAmount: 0, creditAmount: loanAmount }
        ]
      });
    }

    // NOTE: Processing Fee is intentionally EXCLUDED — it does not touch Loans Receivable
    // Only EMI entries (which reduce the Loans Receivable balance)

    let totalPrincipalPaid = 0, totalInterestPaid = 0;
    for (const emi of (fullLoan.emiSchedules || [])) {
      if (!emi.paidDate || emi.paidAmount <= 0) continue;
      const pp = emi.paidPrincipal || 0;
      const ip = emi.paidInterest  || 0;
      totalPrincipalPaid += pp;
      totalInterestPaid  += ip;

      allEntries.push({
        id: `emi-${emi.id}`, date: emi.paidDate,
        referenceType: emi.isInterestOnly ? 'INTEREST_ONLY_PAYMENT' : 'EMI_PAYMENT',
        loanId: loan.id, loanNumber: loan.applicationNo,
        emiNumber: emi.installmentNumber,
        description: emi.isInterestOnly ? `EMI #${emi.installmentNumber} — Interest Only` : `Monthly EMI #${emi.installmentNumber}`,
        principalDisbursed: 0, principalPaid: pp, interestPaid: ip, totalPayment: pp + ip,
        lines: [
          { accountCode: '1102', accountName: 'Bank/Cash', debitAmount: emi.paidAmount, creditAmount: 0 },
          ...(pp > 0 ? [{ accountCode: '1200', accountName: receivableLabel, debitAmount: 0, creditAmount: pp }] : []),
          ...(ip > 0 ? [{ accountCode: '4110', accountName: 'Interest Income',  debitAmount: 0, creditAmount: ip }] : []),
        ]
      });
    }

    onlineLoansSummary.push({
      id: loan.id, loanNumber: loan.applicationNo, type: 'ONLINE',
      status: loan.status, amount: loanAmount, disbursementDate: fullLoan.disbursedAt,
      interestRate: fullLoan.sessionForm?.interestRate || 0,
      tenure: fullLoan.sessionForm?.tenure || 0, isMirror,
      outstanding: Math.max(0, loanAmount - totalPrincipalPaid),
      totalPaid: totalPrincipalPaid + totalInterestPaid,
      totalInterestPaid, totalPrincipalPaid,
    });
  }

  for (const loan of offlineLoans) {
    const fullLoan = await db.offlineLoan.findUnique({
      where: { id: loan.id },
      include: { emis: { orderBy: { dueDate: 'asc' } } }
    });
    if (!fullLoan) continue;
    const receivableLabel = `Loans Receivable — ${customer?.name || ''}`;

    if (fullLoan.disbursementDate) {
      allEntries.push({
        id: `offline-disb-${loan.id}`, date: fullLoan.disbursementDate,
        referenceType: 'LOAN_DISBURSEMENT', loanId: loan.id, loanNumber: loan.loanNumber,
        description: `Loan Disbursed — ${loan.loanNumber}`,
        principalDisbursed: fullLoan.loanAmount, principalPaid: 0, interestPaid: 0, totalPayment: null,
        lines: [
          { accountCode: '1200', accountName: receivableLabel, debitAmount: fullLoan.loanAmount, creditAmount: 0 },
          { accountCode: '1101', accountName: 'Cash/Bank', debitAmount: 0, creditAmount: fullLoan.loanAmount }
        ]
      });
    }

    let totalPrincipalPaid = 0, totalInterestPaid = 0;
    for (const emi of (fullLoan.emis || [])) {
      if (!emi.paidDate || emi.paidAmount <= 0) continue;
      const pp = emi.paidPrincipal || 0;
      const ip = emi.paidInterest  || 0;
      totalPrincipalPaid += pp;
      totalInterestPaid  += ip;
      allEntries.push({
        id: `offline-emi-${emi.id}`, date: emi.paidDate,
        referenceType: 'EMI_PAYMENT', loanId: loan.id, loanNumber: loan.loanNumber,
        emiNumber: emi.installmentNumber,
        description: `Monthly EMI #${emi.installmentNumber}`,
        principalDisbursed: 0, principalPaid: pp, interestPaid: ip, totalPayment: pp + ip,
        lines: [
          { accountCode: '1101', accountName: 'Cash/Bank', debitAmount: emi.paidAmount, creditAmount: 0 },
          ...(pp > 0 ? [{ accountCode: '1200', accountName: receivableLabel, debitAmount: 0, creditAmount: pp }] : []),
          ...(ip > 0 ? [{ accountCode: '4110', accountName: 'Interest Income',  debitAmount: 0, creditAmount: ip }] : []),
        ]
      });
    }

    offlineLoansSummary.push({
      id: loan.id, loanNumber: loan.loanNumber, type: 'OFFLINE',
      status: loan.status, amount: fullLoan.loanAmount,
      disbursementDate: fullLoan.disbursementDate,
      interestRate: fullLoan.interestRate || 0, tenure: fullLoan.tenure || 0, isMirror: false,
      outstanding: Math.max(0, fullLoan.loanAmount - totalPrincipalPaid),
      totalPaid: totalPrincipalPaid + totalInterestPaid,
      totalInterestPaid, totalPrincipalPaid,
    });
  }

  allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const totalOutstanding = [...onlineLoansSummary, ...offlineLoansSummary].reduce((s, l) => s + l.outstanding, 0);

  return NextResponse.json({
    success: true,
    customerSummary: {
      ...customer,
      onlineLoans: onlineLoansSummary,
      offlineLoans: offlineLoansSummary,
      totalOutstanding,
    },
    entries: allEntries,
    source: 'emi_fallback',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Single loan ledger
// ─────────────────────────────────────────────────────────────────────────────
async function getSingleLoanLedger(loanId: string, companyId: string | null) {
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

  const lrAccountIds = await getLRAccountIds(companyId || loan.companyId);
  const targetCompanyId = companyId || loan.companyId;
  const journalEntries = lrAccountIds.length > 0 && targetCompanyId
    ? await db.journalEntry.findMany({
        where: {
          isReversed: false,
          companyId: targetCompanyId,
          lines: { some: { accountId: { in: lrAccountIds }, loanId } }
        },
        include: { lines: { include: { account: true } } },
        orderBy: { entryDate: 'asc' }
      })
    : [];

  return NextResponse.json({
    success: true,
    loanSummary: { id: loan.id, loanNumber: loan.applicationNo, customer: loan.customer, company: loan.company },
    entries: journalEntries.map(je => ({
      id: je.id, date: je.entryDate, referenceType: je.referenceType,
      narration: je.narration, loanId, loanNumber: loan.applicationNo,
      lines: je.lines.map(l => ({
        accountCode: l.account?.accountCode,
        accountName: l.account?.accountCode && LR_CODES.includes(l.account.accountCode)
          ? `Loans Receivable — ${loan.customer?.name || ''}`
          : l.account?.accountName,
        debitAmount: l.debitAmount,
        creditAmount: l.creditAmount,
      }))
    })),
    source: journalEntries.length > 0 ? 'journal_entries' : 'no_data',
  });
}
