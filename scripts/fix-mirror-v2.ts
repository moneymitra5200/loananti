/**
 * Fix Mirror Loan Accounting - Direct Update
 */

import { db } from '../src/lib/db';

async function fixMirrorLoanAccounting() {
  console.log('=== Fixing Mirror Loan Accounting ===\n');

  try {
    // Get Company 1
    const companies = await db.company.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, code: true }
    });
    
    const company1 = companies[0];
    console.log(`Company 1: ${company1.name} (${company1.id})\n`);

    // Get accounts
    const cashAccount = await db.chartOfAccount.findFirst({
      where: { companyId: company1.id, accountCode: '1101' }
    });
    const ownersCapital = await db.chartOfAccount.findFirst({
      where: { companyId: company1.id, accountCode: '3002' }
    });

    if (!cashAccount || !ownersCapital) {
      console.log('Required accounts not found!');
      return;
    }

    console.log(`Cash in Hand current balance: ₹${cashAccount.currentBalance}`);
    console.log(`Owner's Capital current balance: ₹${ownersCapital.currentBalance}`);

    // The issue: Cash shows -₹5,000 but should be ₹5,000
    // The mirror loan credited Cash ₹10,000, but it should have credited Owner's Capital

    // Fix: Add ₹10,000 back to Cash and remove ₹10,000 from Owner's Capital credit
    // Then properly record: Dr Loans Receivable, Cr Owner's Capital (as investment)

    const amount = 10000;

    // Update Cash in Hand: add back ₹10,000
    const newCashBalance = cashAccount.currentBalance + amount;
    console.log(`\nUpdating Cash in Hand: ${cashAccount.currentBalance} + ${amount} = ${newCashBalance}`);
    
    await db.chartOfAccount.update({
      where: { id: cashAccount.id },
      data: { currentBalance: newCashBalance }
    });

    // Note: Owner's Capital stays at ₹10,000 (the initial equity) 
    // The mirror loan should be recorded as: Dr Loans Receivable, Cr Owner's Capital
    // But since Owner's Capital is already at ₹10,000 from the initial equity + ₹10,000 from the mirror loan sync,
    // and the initial equity entry was Dr Cash ₹5,000 + Dr SBI ₹5,000, Cr Owner's Capital ₹10,000
    // The mirror loan entry should be: Dr Loans Receivable ₹10,000, Cr Owner's Capital ₹10,000
    // So Owner's Capital should actually be ₹20,000 total

    // Let's check what the correct balance should be
    // Initial equity: Cr Owner's Capital ₹10,000
    // Mirror loan: Cr Owner's Capital ₹10,000 (if we change from Cash to Owner's Capital)
    // Total: ₹20,000

    // But the current Owner's Capital is ₹10,000, which means the mirror loan entry still credits Cash
    // Let me check the journal entry

    const journalEntry = await db.journalEntry.findFirst({
      where: { companyId: company1.id, referenceType: 'MIRROR_LOAN_DISBURSEMENT' },
      include: { lines: { include: { account: true } } }
    });

    if (journalEntry) {
      console.log('\nJournal Entry Lines:');
      journalEntry.lines.forEach(line => {
        console.log(`  ${line.account.accountCode} - ${line.account.accountName}: Dr ₹${line.debitAmount}, Cr ₹${line.creditAmount}`);
      });

      // Find the cash credit line
      const cashLine = journalEntry.lines.find(l => l.account.accountCode === '1101' && l.creditAmount > 0);
      
      if (cashLine) {
        console.log(`\nFound cash credit line: ₹${cashLine.creditAmount}`);
        
        // Update the journal entry line to use Owner's Capital instead of Cash
        await db.journalEntryLine.update({
          where: { id: cashLine.id },
          data: { 
            accountId: ownersCapital.id,
            narration: 'Investment in mirror loan (funded by Company 3)'
          }
        });
        console.log('✅ Updated journal entry line to credit Owner\'s Capital');

        // Now Owner's Capital should be credited ₹10,000 more
        const newOwnersCapitalBalance = ownersCapital.currentBalance + amount;
        await db.chartOfAccount.update({
          where: { id: ownersCapital.id },
          data: { currentBalance: newOwnersCapitalBalance }
        });
        console.log(`✅ Updated Owner's Capital: ${ownersCapital.currentBalance} + ${amount} = ${newOwnersCapitalBalance}`);
      }
    }

    // Verify
    const updatedCash = await db.chartOfAccount.findFirst({
      where: { companyId: company1.id, accountCode: '1101' }
    });
    const updatedOwnersCapital = await db.chartOfAccount.findFirst({
      where: { companyId: company1.id, accountCode: '3002' }
    });
    const updatedLoansReceivable = await db.chartOfAccount.findFirst({
      where: { companyId: company1.id, accountCode: '1200' }
    });

    console.log('\n=== Final Balances ===');
    console.log(`Cash in Hand: ₹${updatedCash?.currentBalance}`);
    console.log(`Owner's Capital: ₹${updatedOwnersCapital?.currentBalance}`);
    console.log(`Loans Receivable: ₹${updatedLoansReceivable?.currentBalance}`);

  } catch (error) {
    console.error('Fix failed:', error);
  } finally {
    await db.$disconnect();
  }
}

fixMirrorLoanAccounting();
