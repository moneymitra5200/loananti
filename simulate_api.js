require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

const LR_CODES = ['1200', '1201', '1210', '1301', '1305', '1302'];

async function getLRAccountIds(companyId) {
  const where = { accountCode: { in: LR_CODES } };
  if (companyId) where.companyId = companyId;
  let accounts = await db.chartOfAccount.findMany({ where, select: { id: true } });
  if (accounts.length === 0 && companyId) {
    accounts = await db.chartOfAccount.findMany({
      where: { accountCode: { in: LR_CODES } },
      select: { id: true }
    });
  }
  return accounts.map(a => a.id);
}

async function getContactUserMap() {
  const allRegisteredUsers = await db.user.findMany({
    select: { id: true, name: true, phone: true, email: true }
  });
  
  const userMapByContact = new Map();
  for (const u of allRegisteredUsers) {
    if (u.name && u.phone) {
      const cleanDigits = u.phone.trim().replace(/\D/g, '');
      const phoneKey = cleanDigits || u.phone.trim().toLowerCase();
      const key = `${u.name.trim().toLowerCase()}_${phoneKey}`;
      userMapByContact.set(key, {
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email || '',
      });
    }
  }
  return userMapByContact;
}

function getCustomerForContact(userMapByContact, name, phone, linkedCustomer, fallbackId) {
  const cleanName = (name || linkedCustomer?.name || '').trim();
  const cleanPhone = (phone || linkedCustomer?.phone || '').trim();
  
  if (cleanName && cleanPhone) {
    const cleanDigits = cleanPhone.replace(/\D/g, '');
    const phoneKey = cleanDigits || cleanPhone.toLowerCase();
    const key = `${cleanName.toLowerCase()}_${phoneKey}`;
    const registered = userMapByContact.get(key);
    if (registered) return registered;
    
    return {
      id: `offline_name_${cleanName.toLowerCase()}_${phoneKey}`,
      name: cleanName,
      phone: cleanPhone,
      email: linkedCustomer?.email || '',
    };
  }
  if (linkedCustomer) {
    return {
      id: linkedCustomer.id,
      name: linkedCustomer.name || 'Unknown',
      phone: linkedCustomer.phone || '',
      email: linkedCustomer.email || '',
    };
  }
  if (cleanName && fallbackId) {
    return {
      id: fallbackId,
      name: cleanName,
      phone: cleanPhone,
      email: '',
    };
  }
  return null;
}

async function listCustomersForCompany(companyId) {
  const lrAccountIds = await getLRAccountIds(companyId);
  let interestAccounts = await db.chartOfAccount.findMany({
    where: { accountCode: { in: ['4110', '4100', '4001', '4002'] }, ...(companyId ? { companyId } : {}) },
    select: { id: true }
  });
  if (interestAccounts.length === 0 && companyId) {
    interestAccounts = await db.chartOfAccount.findMany({
      where: { accountCode: { in: ['4110', '4100', '4001', '4002'] } },
      select: { id: true }
    });
  }
  const interestAccountIds = interestAccounts.map(a => a.id);
  const allTargetAccountIds = [...lrAccountIds, ...interestAccountIds];

  const journalIds = await db.journalEntry.findMany({
    where: {
      isReversed: false,
      ...(companyId ? { companyId } : {}),
    },
    select: { id: true }
  });
  const journalIdSet = journalIds.map(j => j.id);

  const lines = journalIdSet.length > 0
    ? await db.journalEntryLine.findMany({
        where: {
          accountId: { in: allTargetAccountIds },
          journalEntryId: { in: journalIdSet },
        },
        select: {
          accountId:      true,
          debitAmount:    true,
          creditAmount:   true,
          loanId:         true,
          customerId:     true,
          journalEntryId: true,
        }
      })
    : [];

  const loanIdsFromLines = [...new Set(lines.map(l => l.loanId).filter(Boolean))];

  const companyActiveLoanIds = [];
  const onlineMirrorMappingsForCompany = companyId
    ? await db.mirrorLoanMapping.findMany({
        where: { mirrorCompanyId: companyId, isOfflineLoan: false },
        select: { originalLoanId: true, mirrorLoanId: true }
      })
    : [];
  const offlineMirrorMappingsForCompany = companyId
    ? await db.mirrorLoanMapping.findMany({
        where: { mirrorCompanyId: companyId, isOfflineLoan: true },
        select: { originalLoanId: true, mirrorLoanId: true }
      })
    : [];

  for (const m of onlineMirrorMappingsForCompany) {
    if (m.mirrorLoanId) companyActiveLoanIds.push(m.mirrorLoanId);
    else if (m.originalLoanId) companyActiveLoanIds.push(m.originalLoanId);
  }
  for (const m of offlineMirrorMappingsForCompany) {
    if (m.mirrorLoanId) companyActiveLoanIds.push(m.mirrorLoanId);
    else if (m.originalLoanId) companyActiveLoanIds.push(m.originalLoanId);
  }

  const allMirroredOnlineIds = new Set(
    (await db.mirrorLoanMapping.findMany({
      where: { isOfflineLoan: false },
      select: { originalLoanId: true }
    })).map(m => m.originalLoanId)
  );

  const onlineWhere = {
    status: { in: ['ACTIVE', 'DISBURSED', 'CLOSED', 'ACTIVE_INTEREST_ONLY', 'FINAL_APPROVED'] },
  };
  if (companyId) onlineWhere.companyId = companyId;
  if (allMirroredOnlineIds.size > 0) onlineWhere.id = { notIn: [...allMirroredOnlineIds] };

  const directOnlineLoans = await db.loanApplication.findMany({
    where: onlineWhere,
    select: { id: true }
  });
  for (const l of directOnlineLoans) {
    companyActiveLoanIds.push(l.id);
  }

  const allMirroredOfflineIds = new Set(
    (await db.mirrorLoanMapping.findMany({
      where: { isOfflineLoan: true },
      select: { originalLoanId: true }
    })).map(m => m.originalLoanId)
  );

  const offlineWhere = {
    status: { in: ['ACTIVE', 'INTEREST_ONLY', 'CLOSED'] },
  };
  if (companyId) offlineWhere.companyId = companyId;
  if (allMirroredOfflineIds.size > 0) offlineWhere.id = { notIn: [...allMirroredOfflineIds] };

  const directOfflineLoans = await db.offlineLoan.findMany({
    where: offlineWhere,
    select: { id: true }
  });
  for (const l of directOfflineLoans) {
    companyActiveLoanIds.push(l.id);
  }

  const allRelevantLoanIds = [...new Set([...loanIdsFromLines, ...companyActiveLoanIds])];

  const mirrorMappings = allRelevantLoanIds.length > 0
    ? await db.mirrorLoanMapping.findMany({
        where: { originalLoanId: { in: allRelevantLoanIds } },
        select: { originalLoanId: true, mirrorCompanyId: true, mirrorLoanId: true }
      })
    : [];
  const mirroredLoanIds    = new Set(mirrorMappings.map(m => m.originalLoanId));
  const mirrorCompanyOfLoan = new Map(mirrorMappings.map(m => [m.originalLoanId, m.mirrorCompanyId]));

  const reverseMirrorMappings = allRelevantLoanIds.length > 0
    ? await db.mirrorLoanMapping.findMany({
        where: { mirrorLoanId: { in: allRelevantLoanIds } },
        select: { mirrorLoanId: true, originalLoanId: true }
      })
    : [];

  const mirrorToOriginalId = new Map();
  for (const m of reverseMirrorMappings) {
    if (m.mirrorLoanId) mirrorToOriginalId.set(m.mirrorLoanId, m.originalLoanId);
  }
  for (const m of mirrorMappings) {
    if (m.mirrorLoanId) mirrorToOriginalId.set(m.mirrorLoanId, m.originalLoanId);
  }

  const onlineLoans = allRelevantLoanIds.length > 0
    ? await db.loanApplication.findMany({
        where: { id: { in: allRelevantLoanIds } },
        select: { id: true, customer: { select: { id: true, name: true, phone: true, email: true } } }
      })
    : [];
  const offlineLoans = allRelevantLoanIds.length > 0
    ? await db.offlineLoan.findMany({
        where: { id: { in: allRelevantLoanIds } },
        select: {
          id: true, customerName: true, customerPhone: true, customerEmail: true,
          customer: { select: { id: true, name: true, phone: true, email: true } }
        }
      })
    : [];

  const userMapByContact = await getContactUserMap();

  const loanToCustomer = new Map();
  for (const l of onlineLoans) {
    if (l.customer) {
      const cust = getCustomerForContact(userMapByContact, l.customer.name, l.customer.phone, l.customer);
      if (cust) loanToCustomer.set(l.id, cust);
    }
  }
  for (const l of offlineLoans) {
    const cust = getCustomerForContact(
      userMapByContact,
      l.customerName,
      l.customerPhone,
      l.customer || undefined,
      `offline_${l.id}`
    );
    if (cust) {
      loanToCustomer.set(l.id, cust);
    }
  }

  for (const [mirrorId, originalId] of mirrorToOriginalId) {
    if (!loanToCustomer.has(mirrorId) || loanToCustomer.get(mirrorId)?.id.startsWith('offline_')) {
      const origCustomer = loanToCustomer.get(originalId);
      if (origCustomer) loanToCustomer.set(mirrorId, origCustomer);
    }
  }

  const customerIdsFromLines = [...new Set(lines.filter(l => !l.loanId && l.customerId).map(l => l.customerId) )];
  const customersById = customerIdsFromLines.length > 0
    ? await db.user.findMany({
        where: { id: { in: customerIdsFromLines } },
        select: { id: true, name: true, phone: true, email: true }
      })
    : [];
  const customerMap = new Map(customersById.map(c => [c.id, c]));

  const byCustomer = new Map();

  for (const l of onlineLoans) {
    if (mirroredLoanIds.has(l.id) && companyId) {
      const mirrorCo = mirrorCompanyOfLoan.get(l.id);
      if (mirrorCo !== companyId) continue;
    }
    const cust = loanToCustomer.get(l.id);
    if (cust) {
      if (!byCustomer.has(cust.id)) {
        byCustomer.set(cust.id, {
          id: cust.id, name: cust.name, phone: cust.phone, email: cust.email,
          lrDebits: 0, lrCredits: 0, interestCredits: 0, loans: new Set(),
          isMirror: mirroredLoanIds.has(l.id) || mirrorToOriginalId.has(l.id),
        });
      }
      const acc = byCustomer.get(cust.id);
      const loanIdToCount = mirrorToOriginalId.get(l.id) || l.id;
      acc.loans.add(loanIdToCount);
      if (mirroredLoanIds.has(l.id) || mirrorToOriginalId.has(l.id)) {
        acc.isMirror = true;
      }
    }
  }

  for (const l of offlineLoans) {
    if (mirroredLoanIds.has(l.id) && companyId) {
      const mirrorCo = mirrorCompanyOfLoan.get(l.id);
      if (mirrorCo !== companyId) continue;
    }
    const cust = loanToCustomer.get(l.id);
    if (cust) {
      if (!byCustomer.has(cust.id)) {
        byCustomer.set(cust.id, {
          id: cust.id, name: cust.name, phone: cust.phone, email: cust.email,
          lrDebits: 0, lrCredits: 0, interestCredits: 0, loans: new Set(),
          isMirror: mirroredLoanIds.has(l.id) || mirrorToOriginalId.has(l.id),
        });
      }
      const acc = byCustomer.get(cust.id);
      const loanIdToCount = mirrorToOriginalId.get(l.id) || l.id;
      acc.loans.add(loanIdToCount);
      if (mirroredLoanIds.has(l.id) || mirrorToOriginalId.has(l.id)) {
        acc.isMirror = true;
      }
    }
  }

  for (const line of lines) {
    if (line.loanId) {
      if (mirroredLoanIds.has(line.loanId) && companyId) {
        const mirrorCo = mirrorCompanyOfLoan.get(line.loanId);
        if (mirrorCo !== companyId) continue;
      }
    }

    let customer;
    const effectiveLoanId = line.loanId && mirrorToOriginalId.has(line.loanId)
      ? mirrorToOriginalId.get(line.loanId)
      : line.loanId;
    if (effectiveLoanId) {
      customer = loanToCustomer.get(effectiveLoanId);
      if (!customer && line.loanId) customer = loanToCustomer.get(line.loanId);
    } else if (line.customerId) {
      const c = customerMap.get(line.customerId);
      if (c) {
        const cust = getCustomerForContact(userMapByContact, c.name, c.phone, c);
        if (cust) customer = cust;
      }
    }
    if (!customer) continue;

    const isMirror = line.loanId ? (mirroredLoanIds.has(line.loanId) || mirrorToOriginalId.has(line.loanId)) : false;

    if (!byCustomer.has(customer.id)) {
      byCustomer.set(customer.id, {
        id: customer.id, name: customer.name, phone: customer.phone, email: customer.email,
        lrDebits: 0, lrCredits: 0, interestCredits: 0, loans: new Set(),
        isMirror,
      });
    }
    const acc = byCustomer.get(customer.id);
    if (lrAccountIds.includes(line.accountId)) {
      acc.lrDebits  += line.debitAmount;
      acc.lrCredits += line.creditAmount;
    } else {
      acc.interestCredits += line.creditAmount;
    }
    if (line.loanId) {
      const loanIdToCount = mirrorToOriginalId.get(line.loanId) || line.loanId;
      acc.loans.add(loanIdToCount);
    }
    if (isMirror) {
      acc.isMirror = true;
    }
  }

  const result = [...byCustomer.values()].map(c => ({
    id:               c.id,
    name:             c.name,
    phone:            c.phone,
    email:            c.email,
    totalLoans:       c.loans.size,
    totalOutstanding: Math.max(0, c.lrDebits - c.lrCredits),
    totalPaid:        c.lrCredits + c.interestCredits,
    isMirror:         c.isMirror,
    lrDebits:         c.lrDebits,
    lrCredits:        c.lrCredits,
    interestCredits:  c.interestCredits
  })).filter(c => c.totalLoans > 0 || c.totalOutstanding > 0);

  console.log("\nSimulated borrowers list:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error).finally(() => db.$disconnect());
