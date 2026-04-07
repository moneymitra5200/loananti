/**
 * Fix Mirror Loan Accounting
 * 
 * The issue: When a mirror loan is created from Company 3 to Company 1,
 * Company 1's Chart of Accounts incorrectly shows Cash reduced.
 * 
 * The correct accounting should be:
 * - Company 1: Debit Loans Receivable, Credit "Due to Company 3" (Liability)
 *   OR Credit Owner's Capital (if it's an investment)
 * 
 * This script fixes the incorrect journal entries.
 */

import { db } from '../src/lib/db';

async function fixMirrorLoanAccounting() {
  console.log('=== Fixing Mirror Loan Accounting ===\n');

  try {
    // Get Company 1 (mirror company)
    const companies = await db.company.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, code: true }
    });
    
    const company1 = companies[0]; // First company = Company 1
    console.log(`Company 1: ${company1.name} (${company1.id})\n`);

    // Get the incorrect journal entry for mirror loan
    const incorrectEntry = await db.journalEntry.findFirst({
      where: {
        companyId: company1.id,
        referenceType: 'MIRROR_LOAN_DISBURSEMENT'
      },
      include: {
        lines: {
          include: { account: true }
        }
      }
    });

    if (!incorrectEntry) {
      console.log('No mirror loan journal entry found to fix.');
      return;
    }

    console.log(`Found journal entry: ${incorrectEntry.entryNumber}`);
    console.log('Lines:');
    incorrectEntry.lines.forEach(line => {
      console.log(`  ${line.account.accountCode} - ${line.account.accountName}: Dr ₹${line.debitAmount}, Cr ₹${line.creditAmount}`);
    });

    // Check if the credit is to Cash in Hand (1101)
    const cashLine = incorrectEntry.lines.find(l => l.account.accountCode === '1101' && l.creditAmount > 0);
    
    if (!cashLine) {
      console.log('\nNo cash credit line found - entry may already be correct.');
      return;
    }

    console.log(`\n❌ Found incorrect cash credit: ₹${cashLine.creditAmount}`);
    console.log('This should be changed to a liability or equity account.\n');

    // Get Owner's Capital account (3002) - this represents investment in the company
    const ownersCapital = await db.chartOfAccount.findFirst({
      where: { 
        companyId: company1.id, 
        accountCode: '3002' 
      }
    });

    if (!ownersCapital) {
      console.log('Owner\'s Capital account not found!');
      return;
    }

    // Reverse the cash credit and replace with Owner's Capital credit
    // This means: Company 1 received the loan receivable as an investment from the owner
    
    await db.$transaction(async (tx) => {
      // Update the journal entry line
      await tx.journalEntryLine.update({
        where: { id: cashLine.id },
        data: { 
          accountId: ownersCapital.id,
          narration: 'Investment in mirror loan from Company 3'
        }
      });

      // Update account balances
      // 1. Reverse the cash credit (add back to cash)
      const cashAccount = await tx.chartOfAccount.findFirst({
        where: { companyId: company1.id, accountCode: '1101' }
      });
      
      if (cashAccount) {
        await tx.chartOfAccount.update({
          where: { id: cashAccount.id },
          data: { currentBalance: { increment: cashLine.creditAmount } }
        });
        console.log(`✅ Cash in Hand: +₹${cashLine.creditAmount} (reversed)`);
      }

      // 2. Add the credit to Owner's Capital
      await tx.chartOfAccount.update({
        where: { id: ownersCapital.id },
        data: { currentBalance: { increment: cashLine.creditAmount } }
      });
      console.log(`✅ Owner's Capital: +₹${cashLine.creditAmount} (credited)`);

      // Update narration
      await tx.journalEntry.update({
        where: { id: incorrectEntry.id },
        data: {
          narration: `Mirror Loan Disbursement - Investment from Owner (funded by Company 3)`
        }
      });
    });

    console.log('\n✅ Journal entry fixed successfully!');

    // Verify the fix
    const accounts = await db.chartOfAccount.findMany({
      where: { 
        companyId: company1.id,
        accountCode: { in: ['1101', '1200', '3002'] }
      },
      select: { accountCode: true, accountName: true, currentBalance: true }
    });

    console.log('\nUpdated Balances:');
    accounts.forEach(a => console.log(`  ${a.accountCode} - ${a.accountName}: ₹${a.currentBalance}`));

  } catch (error) {
    console.error('Fix failed:', error);
  } finally {
    await db.$disconnect();
  }
}

fixMirrorLoanAccounting();
