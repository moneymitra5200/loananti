const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// IDs from database
const COMPANY_3_ID = 'cmnm2yvlz000011du25wvlq15';  // Original loan company (C3)
const COMPANY_2_ID = 'cmnm2zruj000511dust5zilhm';  // Company 2
const COMPANY_1_ID = 'cmnm30fh8000a11dub37itsvd';  // Mirror company (C1)
const SUPER_ADMIN_ID = 'cmnm2uy320000luhg3z4mszp0';

async function main() {
  console.log('=== STEP 0: Check Current State ===');
  
  // Check existing journal entries
  const existingJE = await prisma.journalEntry.findMany({
    where: { companyId: COMPANY_1_ID }
  });
  console.log('Existing Journal Entries for C1:', existingJE.length);
  
  // Check existing bank accounts
  const existingBanks = await prisma.bankAccount.findMany({
    where: { companyId: COMPANY_1_ID }
  });
  console.log('Existing Bank Accounts for C1:', existingBanks.length);
  
  // Get the Chart of Accounts for Company 1
  const c1Bank = await prisma.chartOfAccount.findFirst({
    where: { companyId: COMPANY_1_ID, accountCode: '1000' }
  });
  const c1Equity = await prisma.chartOfAccount.findFirst({
    where: { companyId: COMPANY_1_ID, accountCode: '5000' }
  });
  
  console.log('\\nC1 Bank Account:', c1Bank?.id, c1Bank?.accountName, 'Balance:', c1Bank?.currentBalance);
  console.log('C1 Equity Account:', c1Equity?.id, c1Equity?.accountName, 'Balance:', c1Equity?.currentBalance);
  
  if (!c1Bank || !c1Equity) {
    console.log('ERROR: Chart of Accounts not found for Company 1');
    await prisma.$disconnect();
    return;
  }
  
  // Check if we already have balance
  if (c1Bank.currentBalance > 0) {
    console.log('\\n=== Company 1 already has balance: ₹' + c1Bank.currentBalance);
  } else {
    // Add equity journal entry: Debit Bank, Credit Owner's Capital
    const equityAmount = 100000;
    const entryNumber = 'JE-' + Date.now();
    
    const journalEntry = await prisma.journalEntry.create({
      data: {
        companyId: COMPANY_1_ID,
        entryNumber: entryNumber,
        entryDate: new Date(),
        referenceType: 'EQUITY_INJECTION',
        narration: 'Initial Owner Capital Investment',
        totalDebit: equityAmount,
        totalCredit: equityAmount,
        isApproved: true,
        createdById: SUPER_ADMIN_ID,
        lines: {
          create: [
            {
              accountId: c1Bank.id,
              debitAmount: equityAmount,
              creditAmount: 0,
              narration: 'Cash invested by owner'
            },
            {
              accountId: c1Equity.id,
              debitAmount: 0,
              creditAmount: equityAmount,
              narration: "Owner's capital"
            }
          ]
        }
      }
    });
    
    console.log('\\nCreated Journal Entry:', journalEntry.entryNumber);
    
    // Update account balances
    await prisma.chartOfAccount.update({
      where: { id: c1Bank.id },
      data: { currentBalance: equityAmount }
    });
    
    await prisma.chartOfAccount.update({
      where: { id: c1Equity.id },
      data: { currentBalance: equityAmount }
    });
    
    console.log('Updated account balances');
  }
  
  // Create a bank account for Company 1 if not exists
  let bankAccount = await prisma.bankAccount.findFirst({
    where: { companyId: COMPANY_1_ID, isDefault: true }
  });
  
  if (!bankAccount) {
    bankAccount = await prisma.bankAccount.create({
      data: {
        companyId: COMPANY_1_ID,
        accountName: 'Main Bank Account',
        accountNumber: '001234567890',
        ifscCode: 'SBIN0001234',
        bankName: 'State Bank of India',
        currentBalance: 100000,
        isDefault: true,
        isActive: true,
        accountType: 'SAVINGS'
      }
    });
    console.log('\\nCreated Bank Account:', bankAccount.id);
  } else {
    // Update the bank balance
    await prisma.bankAccount.update({
      where: { id: bankAccount.id },
      data: { currentBalance: 100000 }
    });
    console.log('\\nBank Account already exists:', bankAccount.id);
    console.log('Updated balance to ₹100,000');
  }
  
  // Verify the Chart of Accounts for Company 1
  console.log('\\n=== Verify Company 1 Chart of Accounts ===');
  const coa = await prisma.chartOfAccount.findMany({
    where: { companyId: COMPANY_1_ID },
    orderBy: { accountCode: 'asc' }
  });
  
  coa.forEach(a => console.log({ code: a.accountCode, name: a.accountName, balance: a.currentBalance }));
  
  console.log('\\n=== Company 1 is ready with ₹100,000 equity ===');
  
  await prisma.$disconnect();
}

main().catch(e => console.error(e));
