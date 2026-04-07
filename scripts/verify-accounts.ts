/**
 * Verify Chart of Accounts Balances
 */

import { db } from '../src/lib/db';

async function verifyAccounts() {
  console.log('=== Verifying Chart of Accounts ===\n');

  try {
    // Get all companies
    const companies = await db.company.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, code: true }
    });

    console.log('Companies:');
    companies.forEach(c => console.log(`  - ${c.name} (${c.code}): ${c.id}`));
    console.log('');

    // Get all offline loans
    const loans = await db.offlineLoan.findMany({
      include: { company: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'desc' }
    });

    console.log('Offline Loans:');
    loans.forEach(l => console.log(`  - ${l.loanNumber}: ₹${l.loanAmount}, Company: ${l.company?.name}, isMirror: ${l.isMirrorLoan}`));
    console.log('');

    // Check Chart of Accounts for each company
    for (const c of companies) {
      console.log(`\n=== ${c.name} (${c.code}) ===`);
      
      const accounts = await db.chartOfAccount.findMany({
        where: { companyId: c.id },
        select: { 
          accountCode: true, 
          accountName: true, 
          currentBalance: true,
          accountType: true
        },
        orderBy: { accountCode: 'asc' }
      });

      const assetAccounts = accounts.filter(a => a.accountType === 'ASSET');
      const liabilityAccounts = accounts.filter(a => a.accountType === 'LIABILITY');
      const equityAccounts = accounts.filter(a => a.accountType === 'EQUITY');
      
      console.log('\nAssets:');
      assetAccounts.forEach(a => console.log(`  ${a.accountCode} - ${a.accountName}: ₹${a.currentBalance}`));
      
      console.log('\nLiabilities:');
      liabilityAccounts.forEach(a => console.log(`  ${a.accountCode} - ${a.accountName}: ₹${a.currentBalance}`));
      
      console.log('\nEquity:');
      equityAccounts.forEach(a => console.log(`  ${a.accountCode} - ${a.accountName}: ₹${a.currentBalance}`));

      // Check Journal Entries
      const journalEntries = await db.journalEntry.findMany({
        where: { companyId: c.id },
        select: { 
          entryNumber: true, 
          referenceType: true, 
          totalDebit: true, 
          totalCredit: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      console.log('\nRecent Journal Entries:');
      journalEntries.forEach(je => console.log(`  ${je.entryNumber}: ${je.referenceType} - Dr: ₹${je.totalDebit}, Cr: ₹${je.totalCredit}`));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

verifyAccounts();
