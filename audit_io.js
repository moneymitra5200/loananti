// Simulate exactly what personal-ledger/route.ts does for the mirror company
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

const mirrorCompanyId = 'cmq0sdvhy0001owes4zr8gemk';
const originalLoanId  = 'cmq8cky6b0001avnip3vyugzo'; // PD-IO-TEST-100
const mirrorLoanId    = 'cmq8ckzii0005avnicwv3dpnn'; // KM-IO-TEST-100
const customerId      = 'cmq8ckwtm0000avnijizwb48n'; // customer of these loans (find below)

async function simulateLedger() {
  console.log('=== PERSONAL LEDGER SIMULATION (mirror company view) ===\n');

  // 1. Find customer
  const origLoan = await db.offlineLoan.findUnique({ where: { id: originalLoanId }, select: { customerId: true, customerName: true } });
  console.log('Customer:', origLoan?.customerName, 'id:', origLoan?.customerId);
  const cid = origLoan?.customerId;
  if (!cid) { console.log('No customerId found'); return; }

  // 2. All offline loans for this customer
  const allOfflineLoans = await db.offlineLoan.findMany({
    where: { customerId: cid },
    include: { company: { select: { id: true, name: true } }, emis: { select: { id: true, installmentNumber: true, dueDate: true, paymentStatus: true, paidDate: true, paidAmount: true, interestAmount: true, paidInterest: true, paidPrincipal: true } } }
  });
  console.log('All offline loans for customer:', allOfflineLoans.map(l => l.loanNumber + '(' + l.companyId.slice(-8) + ')'));

  // 3. Mirror mappings
  const offlineMirrorMappings = await db.mirrorLoanMapping.findMany({
    where: { isOfflineLoan: true },
    select: { originalLoanId: true, mirrorCompanyId: true, mirrorInterestRate: true, mirrorLoanId: true }
  });
  const mirroredOfflineIds = new Set(offlineMirrorMappings.map(m => m.originalLoanId));

  // 4. extraMirrorOfflineLoans (loans that belong to the mirror company but not in customer's direct loans)
  let extraMirrorOfflineLoans = [];
  const customerOfflineLoanIds = new Set(allOfflineLoans.map(l => l.id));
  const customerOfflineMirrorMappings = offlineMirrorMappings.filter(m =>
    m.mirrorCompanyId === mirrorCompanyId &&
    m.mirrorLoanId &&
    (customerOfflineLoanIds.has(m.originalLoanId) || customerOfflineLoanIds.has(m.mirrorLoanId))
  );
  console.log('customerOfflineMirrorMappings:', customerOfflineMirrorMappings.length);
  for (const mapping of customerOfflineMirrorMappings) {
    if (!allOfflineLoans.find(l => l.id === mapping.mirrorLoanId)) {
      const ml = await db.offlineLoan.findUnique({
        where: { id: mapping.mirrorLoanId },
        include: { company: { select: { id: true, name: true } }, emis: { select: { id: true, installmentNumber: true, dueDate: true, paymentStatus: true, paidDate: true, paidAmount: true, interestAmount: true, paidInterest: true, paidPrincipal: true } } }
      });
      if (ml) { extraMirrorOfflineLoans.push(ml); console.log('Extra mirror loan fetched:', ml.loanNumber); }
    }
  }

  // 5. validOfflineLoans
  const validOfflineLoans = [
    ...allOfflineLoans.filter(l => {
      if (!mirrorCompanyId) return true;
      if (mirroredOfflineIds.has(l.id)) return l.companyId === mirrorCompanyId;
      const mapping = offlineMirrorMappings.find(m => m.mirrorLoanId === l.id);
      if (mapping) return mapping.mirrorCompanyId === mirrorCompanyId;
      return l.companyId === mirrorCompanyId;
    }),
    ...extraMirrorOfflineLoans
  ];
  console.log('\nvalidOfflineLoans (what ledger will show):', validOfflineLoans.map(l => l.loanNumber + ' co:' + l.companyId.slice(-8)));

  // 6. validLoanIds and queryLoanIds
  const validLoanIds = validOfflineLoans.map(l => l.id);
  const queryLoanIds = [...validLoanIds];
  const originalToMirrorLoanId = new Map();
  for (const m of offlineMirrorMappings) {
    if (m.mirrorLoanId && validLoanIds.includes(m.mirrorLoanId)) {
      originalToMirrorLoanId.set(m.originalLoanId, m.mirrorLoanId);
      queryLoanIds.push(m.originalLoanId);
    }
  }
  console.log('validLoanIds:', validLoanIds.map(id => id.slice(-8)));
  console.log('queryLoanIds:', queryLoanIds.map(id => id.slice(-8)));

  // 7. LR account IDs for mirror company
  const LR_CODES = ['1200', '1201', '1210', '1301', '1305', '1302'];
  const lrAccounts = await db.chartOfAccount.findMany({ where: { companyId: mirrorCompanyId, accountCode: { in: LR_CODES } }, select: { id: true, accountCode: true } });
  const interestAccounts = await db.chartOfAccount.findMany({ where: { companyId: mirrorCompanyId, accountCode: { in: ['4110','4100'] } }, select: { id: true, accountCode: true } });
  const lrAccountIds = lrAccounts.map(a => a.id);
  const interestAccountIds = interestAccounts.map(a => a.id);
  const allTargetAccountIds = [...lrAccountIds, ...interestAccountIds];
  console.log('\nLR account IDs in mirror company:', lrAccounts.map(a => a.accountCode));
  console.log('Interest account IDs in mirror company:', interestAccounts.map(a => a.accountCode));

  // 8. Fetch journal entries
  let journalEntries = [];
  if (allTargetAccountIds.length > 0 && queryLoanIds.length > 0) {
    journalEntries = await db.journalEntry.findMany({
      where: {
        isReversed: false,
        companyId: mirrorCompanyId,
        lines: { some: { accountId: { in: allTargetAccountIds }, loanId: { in: queryLoanIds } } }
      },
      include: { lines: { include: { account: { select: { id: true, accountCode: true, accountName: true } } } } },
      orderBy: { entryDate: 'asc' }
    });
    console.log('\nMain JE query found:', journalEntries.length, 'entries');
    for (const je of journalEntries) {
      console.log('  [' + je.referenceType + '] date:' + je.entryDate.toISOString().slice(0,10));
      for (const l of je.lines) console.log('    ac:' + l.account?.accountCode + ' Dr:' + l.debitAmount + ' Cr:' + l.creditAmount + ' loanId:' + l.loanId?.slice(-8));
    }

    // Accrual entries (no companyId filter)
    const accrualEntries = await db.journalEntry.findMany({
      where: { isReversed: false, referenceType: { in: ['INTEREST_ACCRUAL', 'INTEREST_RECLASSIFICATION'] }, lines: { some: { loanId: { in: queryLoanIds } } } },
      include: { lines: { include: { account: { select: { id: true, accountCode: true, accountName: true } } } } },
      orderBy: { entryDate: 'asc' }
    });
    console.log('Accrual JE query found:', accrualEntries.length, 'entries');
    for (const ae of accrualEntries) {
      const seen = journalEntries.find(j => j.id === ae.id);
      if (!seen) { journalEntries.push(ae); console.log('  Added accrual [' + ae.referenceType + '] date:' + ae.entryDate.toISOString().slice(0,10)); }
    }
  }

  // 9. Group by loanId
  const entriesByLoan = new Map();
  for (const je of journalEntries) {
    const isAccrual = je.referenceType === 'INTEREST_ACCRUAL' || je.referenceType === 'INTEREST_RECLASSIFICATION';
    const rawLoanIds = je.lines
      .filter(l => (isAccrual || allTargetAccountIds.includes(l.accountId)) && l.loanId)
      .map(l => String(l.loanId));
    const loanIdsInEntry = [...new Set(rawLoanIds)];
    for (let lid of loanIdsInEntry) {
      if (originalToMirrorLoanId.has(lid)) lid = originalToMirrorLoanId.get(lid);
      if (!entriesByLoan.has(lid)) entriesByLoan.set(lid, []);
      entriesByLoan.get(lid).push(je);
    }
  }

  console.log('\nEntries grouped by loanId:');
  for (const [lid, jes] of entriesByLoan) {
    console.log('  loanId:', lid.slice(-8), '→', jes.length, 'JEs');
  }
  console.log('validLoanIds match in entriesByLoan:', validLoanIds.map(lid => lid.slice(-8) + ':' + (entriesByLoan.has(lid) ? entriesByLoan.get(lid).length + 'JEs' : '❌NO ENTRIES')));

  // 10. Final verdict
  console.log('\n=== DIAGNOSIS ===');
  const mirrorLoanEntries = entriesByLoan.get(mirrorLoanId) || [];
  console.log('Mirror loan (' + mirrorLoanId.slice(-8) + ') entries in ledger:', mirrorLoanEntries.length);
  if (mirrorLoanEntries.length === 0) {
    console.log('❌ PROBLEM: No entries found for mirror loan in personal ledger');
    
    // Why? Check each JE's lines
    for (const je of journalEntries) {
      console.log('\nJE [' + je.referenceType + '] lines loanIds:', je.lines.map(l => l.loanId?.slice(-8) || 'null'));
      console.log('  accountIds in target:', je.lines.filter(l => allTargetAccountIds.includes(l.accountId)).map(l => l.account?.accountCode));
    }
  } else {
    console.log('✅ Entries found');
  }
}

simulateLedger().catch(console.error).finally(() => db.$disconnect());
