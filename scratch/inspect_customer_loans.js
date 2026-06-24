const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== SIMULATING GETPERSONALLEDGER ===");
  const customerId = "offline_name_sdgfsdf_sdf";
  const companyId = "cmp4w8dxa0008100655jq7ywo"; // KesarDeep C2

  // Parse name+phone from the group key
  const parts = customerId.replace('offline_name_', '').split('_');
  const groupPhone = parts[parts.length - 1];
  const groupName  = parts.slice(0, parts.length - 1).join(' ');

  console.log(`Parsed Name: '${groupName}', Phone: '${groupPhone}'`);

  let customer = null;
  const sampleLoan = await prisma.offlineLoan.findFirst({
    where: {
      customerName: { contains: groupName },
      customerPhone: { contains: groupPhone }
    },
    select: { customerName: true, customerPhone: true, customerEmail: true }
  });
  if (sampleLoan) {
    customer = { id: customerId, name: sampleLoan.customerName || groupName, phone: sampleLoan.customerPhone || groupPhone || '', email: sampleLoan.customerEmail || '' };
  } else {
    customer = { id: customerId, name: groupName, phone: groupPhone || '', email: '' };
  }
  console.log("Resolved Customer Object:", customer);

  const targetName = (customer.name || '').trim().toLowerCase();
  const cleanDigits = (customer.phone || '').trim().replace(/\D/g, '');
  const targetPhone = cleanDigits || (customer.phone || '').trim().toLowerCase();
  console.log(`Normalized targetName: '${targetName}', targetPhone: '${targetPhone}'`);

  // Find all matching registered user IDs with the same name and phone
  const matchingUserIds = new Set();
  
  const usersWithNameOrPhone = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: targetName } },
        { phone: { contains: targetPhone } }
      ]
    },
    select: { id: true, name: true, phone: true }
  });
  console.log("Registered users with name/phone:", usersWithNameOrPhone);

  for (const u of usersWithNameOrPhone) {
    const uName = (u.name || '').trim().toLowerCase();
    const cleanDigits = (u.phone || '').trim().replace(/\D/g, '');
    const uPhone = cleanDigits || (u.phone || '').trim().toLowerCase();
    if (uName === targetName && uPhone === targetPhone) {
      matchingUserIds.add(u.id);
    }
  }
  console.log("Matching registered user IDs:", Array.from(matchingUserIds));

  // Candidate offline loans
  const offlineWhereConditions = [
    { status: { in: ['ACTIVE', 'INTEREST_ONLY', 'CLOSED'] } }
  ];

  const orConditions = [];
  if (matchingUserIds.size > 0) {
    orConditions.push({ customerId: { in: Array.from(matchingUserIds) } });
  }
  if (targetName && targetPhone) {
    orConditions.push({
      AND: [
        { customerName: { contains: targetName } },
        { customerPhone: { contains: targetPhone } }
      ]
    });
  }

  if (orConditions.length > 0) {
    offlineWhereConditions.push({ OR: orConditions });
  } else {
    offlineWhereConditions.push({ id: 'none' });
  }

  const candidateOfflineLoans = await prisma.offlineLoan.findMany({
    where: {
      AND: offlineWhereConditions
    },
    select: {
      id: true, loanNumber: true, status: true, companyId: true,
      loanAmount: true, disbursementDate: true, interestRate: true, tenure: true,
      customerName: true, customerPhone: true, customerEmail: true,
      customerId: true,
      closedAt: true,
      company: { select: { id: true, name: true } }
    }
  });

  console.log(`\nCandidate Offline Loans (${candidateOfflineLoans.length}):`, candidateOfflineLoans.map(l => ({
    id: l.id,
    loanNumber: l.loanNumber,
    companyId: l.companyId,
    customerName: l.customerName,
    customerPhone: l.customerPhone
  })));

  // Strict check (UPDATED WITH FIX)
  const allOfflineLoans = candidateOfflineLoans.filter(l => {
    if (l.customerId && matchingUserIds.has(l.customerId)) {
      return true;
    }
    const lName = (l.customerName || '').trim().toLowerCase();
    const cleanDigits = (l.customerPhone || '').trim().replace(/\D/g, '');
    const lPhone = cleanDigits || (l.customerPhone || '').trim().toLowerCase();
    return lName === targetName && lPhone === targetPhone;
  });
  console.log(`\nAll Offline Loans after strict check (${allOfflineLoans.length}):`, allOfflineLoans.map(l => ({
    id: l.id,
    loanNumber: l.loanNumber,
    companyId: l.companyId
  })));

  // Offline mirror mappings
  const offlineMirrorMappings = await prisma.mirrorLoanMapping.findMany({
    where: { isOfflineLoan: true }
  });

  const mirroredOfflineIds = new Set(offlineMirrorMappings.map(m => m.originalLoanId));
  const mirrorOfflineLoanIds = new Set(offlineMirrorMappings.map(m => m.mirrorLoanId).filter(Boolean));

  // Let's filter to get validOfflineLoans
  const validOfflineLoans = allOfflineLoans.filter(l => {
    // If it's the original offline loan of a mirrored pair
    if (mirroredOfflineIds.has(l.id)) {
      console.log(`Loan ${l.loanNumber} (${l.id}) is original, mirroredOfflineIds has it. SKIPPING from this view (return false)`);
      return false;
    }
    
    // If it's the mirror offline loan of a mirrored pair
    const mapping = offlineMirrorMappings.find(m => m.mirrorLoanId === l.id);
    if (mapping) {
      const match = !companyId || mapping.mirrorCompanyId === companyId;
      console.log(`Loan ${l.loanNumber} (${l.id}) is mirror. mapping.mirrorCompanyId=${mapping.mirrorCompanyId}, companyId=${companyId}. Match: ${match}`);
      return match;
    }
    
    const matchDirect = !companyId || l.companyId === companyId;
    console.log(`Loan ${l.loanNumber} (${l.id}) is direct. l.companyId=${l.companyId}, companyId=${companyId}. Match: ${matchDirect}`);
    return matchDirect;
  });

  console.log(`\nValid Offline Loans for company ${companyId} (${validOfflineLoans.length}):`, validOfflineLoans.map(l => ({
    id: l.id,
    loanNumber: l.loanNumber,
    companyId: l.companyId
  })));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
