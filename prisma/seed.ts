import { db } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

// Permanent Super Admin Credentials
const SUPER_ADMIN_EMAIL = 'moneymitra@gmail.com';
const SUPER_ADMIN_PASSWORD = '1122334455';

// Default Chart of Accounts for Mirror Companies (C1, C2)
const DEFAULT_CHART_OF_ACCOUNTS = [
  // ASSETS
  { accountCode: '1000', accountName: 'Bank', accountType: 'ASSET', isSystemAccount: true, description: 'Bank Account' },
  { accountCode: '1100', accountName: 'Cash in Hand', accountType: 'ASSET', isSystemAccount: true, description: 'Cash on hand' },
  { accountCode: '1200', accountName: 'Loans Receivable', accountType: 'ASSET', isSystemAccount: true, description: 'Loans given to customers (Mirror Loans)' },
  { accountCode: '1300', accountName: 'Interest Receivable', accountType: 'ASSET', isSystemAccount: true, description: 'Accrued interest from loans' },
  { accountCode: '1400', accountName: 'Staff Advance', accountType: 'ASSET', isSystemAccount: false, description: 'Advance to staff' },
  { accountCode: '1500', accountName: 'Security Deposit', accountType: 'ASSET', isSystemAccount: false, description: 'Deposits paid' },
  { accountCode: '1600', accountName: 'Fixed Assets', accountType: 'ASSET', isSystemAccount: false, description: 'Office equipment, furniture' },
  
  // LIABILITIES
  { accountCode: '2000', accountName: 'Accounts Payable', accountType: 'LIABILITY', isSystemAccount: true, description: 'Amounts owed to suppliers' },
  { accountCode: '2100', accountName: 'Borrowed Money', accountType: 'LIABILITY', isSystemAccount: true, description: 'Money borrowed from others' },
  { accountCode: '2200', accountName: 'Customer Deposits', accountType: 'LIABILITY', isSystemAccount: false, description: 'Customer advance payments' },
  
  // INCOME
  { accountCode: '3000', accountName: 'Interest Income', accountType: 'INCOME', isSystemAccount: true, description: 'Interest earned on loans' },
  { accountCode: '3100', accountName: 'Processing Fee Income', accountType: 'INCOME', isSystemAccount: true, description: 'Loan processing fees' },
  { accountCode: '3200', accountName: 'Penalty Income', accountType: 'INCOME', isSystemAccount: false, description: 'Late payment penalties' },
  { accountCode: '3300', accountName: 'Mirror Interest Income', accountType: 'INCOME', isSystemAccount: true, description: 'Interest from mirror loans' },
  
  // EXPENSES
  { accountCode: '4000', accountName: 'Interest Expense', accountType: 'EXPENSE', isSystemAccount: true, description: 'Interest paid on borrowed money' },
  { accountCode: '4100', accountName: 'Salary Expense', accountType: 'EXPENSE', isSystemAccount: false, description: 'Staff salaries' },
  { accountCode: '4200', accountName: 'Office Expenses', accountType: 'EXPENSE', isSystemAccount: false, description: 'Office supplies, utilities' },
  { accountCode: '4300', accountName: 'Bad Debt Expense', accountType: 'EXPENSE', isSystemAccount: false, description: 'Uncollectible loans' },
  
  // EQUITY
  { accountCode: '5000', accountName: "Owner's Capital", accountType: 'EQUITY', isSystemAccount: true, description: 'Owner investment' },
  { accountCode: '5100', accountName: 'Retained Earnings', accountType: 'EQUITY', isSystemAccount: true, description: 'Accumulated profits' },
];

async function main() {
  console.log('🚀 Starting database seeding...');

  // Step 1: Delete all existing data (clean slate)
  console.log('🗑️ Deleting existing data...');
  
  await db.workflowLog.deleteMany({});
  await db.auditLog.deleteMany({});
  await db.payment.deleteMany({});
  await db.eMISchedule.deleteMany({});
  await db.sessionForm.deleteMany({});
  await db.loanForm.deleteMany({});
  await db.loanApplication.deleteMany({});
  await db.offlineLoanEMI.deleteMany({});
  await db.offlineLoan.deleteMany({});
  await db.mirrorLoanMapping.deleteMany({});
  // Delete in correct order to avoid foreign key constraints
  await db.journalEntryLine.deleteMany({});  // Delete lines first
  await db.journalEntry.deleteMany({});      // Then journal entries
  await db.bankTransaction.deleteMany({});   // Bank transactions
  await db.bankAccount.deleteMany({});       // Then bank accounts
  await db.chartOfAccount.deleteMany({});    // Finally chart of accounts
  await db.cashBookEntry.deleteMany({});
  await db.cashBook.deleteMany({});
  
  // Delete users except permanent super admin
  await db.user.deleteMany({
    where: { email: { not: SUPER_ADMIN_EMAIL } }
  });
  
  // Delete old companies
  await db.company.deleteMany({});
  
  // Delete other related data
  await db.notification.deleteMany({});
  await db.reminder.deleteMany({});
  await db.locationLog.deleteMany({});
  await db.deletedUser.deleteMany({});
  await db.blacklist.deleteMany({});
  await db.deviceFingerprint.deleteMany({});
  
  console.log('✅ Existing data deleted.');

  // Step 2: Create Permanent Super Admin
  const superAdminPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
  const superAdmin = await db.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {
      password: superAdminPassword,
      plainPassword: SUPER_ADMIN_PASSWORD,
      name: 'Money Mitra Admin',
      isActive: true,
      role: 'SUPER_ADMIN',
      isLocked: false,
      failedLoginAttempts: 0,
      lastLoginAt: new Date()
    },
    create: {
      email: SUPER_ADMIN_EMAIL,
      password: superAdminPassword,
      plainPassword: SUPER_ADMIN_PASSWORD,
      name: 'Money Mitra Admin',
      firebaseUid: 'super-admin-permanent',
      role: 'SUPER_ADMIN',
      isActive: true,
      lastLoginAt: new Date()
    }
  });
  console.log('✅ Super Admin:', superAdmin.email);

  // Step 3: Create Companies with Proper Configuration
  console.log('\n🏢 Creating Companies...');
  
  // Company 3 (C3) - Original Loan Company
  const company3 = await db.company.create({
    data: {
      name: 'Company 3 - Original',
      code: 'C3',
      isActive: true,
      isMirrorCompany: false,        // NOT a mirror company
      enableMirrorLoan: true,        // Can create mirror loans
      defaultInterestRate: 24,
      defaultInterestType: 'FLAT',
    }
  });
  console.log('✅ Created Company 3 (C3) - Original Company');

  // Company 1 (C1) - Mirror Company with 15% rate
  const company1 = await db.company.create({
    data: {
      name: 'Company 1 - Mirror',
      code: 'C1',
      isActive: true,
      isMirrorCompany: true,         // IS a mirror company
      enableMirrorLoan: false,       // Cannot create mirror loans
      mirrorInterestRate: 15,        // 15% REDUCING
      mirrorInterestType: 'REDUCING',
      defaultInterestRate: 15,
      defaultInterestType: 'REDUCING',
    }
  });
  console.log('✅ Created Company 1 (C1) - Mirror Company (15%)');

  // Company 2 (C2) - Mirror Company with same rate
  const company2 = await db.company.create({
    data: {
      name: 'Company 2 - Mirror',
      code: 'C2',
      isActive: true,
      isMirrorCompany: true,         // IS a mirror company
      enableMirrorLoan: false,       // Cannot create mirror loans
      mirrorInterestRate: 24,        // 24% REDUCING (same as original)
      mirrorInterestType: 'REDUCING',
      defaultInterestRate: 24,
      defaultInterestType: 'REDUCING',
    }
  });
  console.log('✅ Created Company 2 (C2) - Mirror Company (24%)');

  // Step 4: Create Chart of Accounts for Mirror Companies (C1 and C2)
  console.log('\n📊 Creating Chart of Accounts...');
  
  // Create Chart of Accounts for Company 1
  for (const account of DEFAULT_CHART_OF_ACCOUNTS) {
    await db.chartOfAccount.create({
      data: {
        companyId: company1.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        isSystemAccount: account.isSystemAccount,
        description: account.description,
        openingBalance: 0,
        currentBalance: 0,
        isActive: true,
      }
    });
  }
  console.log('✅ Created Chart of Accounts for Company 1');

  // Create Chart of Accounts for Company 2
  for (const account of DEFAULT_CHART_OF_ACCOUNTS) {
    await db.chartOfAccount.create({
      data: {
        companyId: company2.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        isSystemAccount: account.isSystemAccount,
        description: account.description,
        openingBalance: 0,
        currentBalance: 0,
        isActive: true,
      }
    });
  }
  console.log('✅ Created Chart of Accounts for Company 2');

  // Step 5: Create Bank Accounts for Mirror Companies
  console.log('\n🏦 Creating Bank Accounts...');
  
  const bank1 = await db.bankAccount.create({
    data: {
      companyId: company1.id,
      accountName: 'Company 1 - Main Bank',
      accountNumber: '000111222333',
      ifscCode: 'SBIN0000001',
      bankName: 'State Bank of India',
      currentBalance: 100000,  // Starting balance ₹1,00,000
      isDefault: true,
      isActive: true,
      accountType: 'SAVINGS',
    }
  });
  console.log('✅ Created Bank Account for Company 1 (Balance: ₹1,00,000)');

  const bank2 = await db.bankAccount.create({
    data: {
      companyId: company2.id,
      accountName: 'Company 2 - Main Bank',
      accountNumber: '000444555666',
      ifscCode: 'HDFC0000001',
      bankName: 'HDFC Bank',
      currentBalance: 100000,  // Starting balance ₹1,00,000
      isDefault: true,
      isActive: true,
      accountType: 'SAVINGS',
    }
  });
  console.log('✅ Created Bank Account for Company 2 (Balance: ₹1,00,000)');

  // Step 6: Create Opening Balance Journal Entries
  console.log('\n📝 Creating Opening Journal Entries...');
  
  // Get accounts for journal entries
  const c1BankAccount = await db.chartOfAccount.findFirst({
    where: { companyId: company1.id, accountCode: '1000' }
  });
  const c1EquityAccount = await db.chartOfAccount.findFirst({
    where: { companyId: company1.id, accountCode: '5000' }
  });
  
  const c2BankAccount = await db.chartOfAccount.findFirst({
    where: { companyId: company2.id, accountCode: '1000' }
  });
  const c2EquityAccount = await db.chartOfAccount.findFirst({
    where: { companyId: company2.id, accountCode: '5000' }
  });

  // Opening balance for Company 1
  if (c1BankAccount && c1EquityAccount) {
    await db.journalEntry.create({
      data: {
        companyId: company1.id,
        entryNumber: 'OPENING-001',
        entryDate: new Date(),
        referenceType: 'OPENING_BALANCE',
        narration: 'Opening Balance - Owner Capital Investment',
        totalDebit: 100000,
        totalCredit: 100000,
        isApproved: true,
        createdById: superAdmin.id,
        lines: {
          create: [
            {
              accountId: c1BankAccount.id,
              debitAmount: 100000,
              creditAmount: 0,
              narration: 'Opening bank balance'
            },
            {
              accountId: c1EquityAccount.id,
              debitAmount: 0,
              creditAmount: 100000,
              narration: "Owner's capital"
            }
          ]
        }
      }
    });
    
    // Update account balances
    await db.chartOfAccount.update({
      where: { id: c1BankAccount.id },
      data: { currentBalance: 100000 }
    });
    await db.chartOfAccount.update({
      where: { id: c1EquityAccount.id },
      data: { currentBalance: 100000 }
    });
  }
  console.log('✅ Created Opening Entry for Company 1');

  // Opening balance for Company 2
  if (c2BankAccount && c2EquityAccount) {
    await db.journalEntry.create({
      data: {
        companyId: company2.id,
        entryNumber: 'OPENING-001',
        entryDate: new Date(),
        referenceType: 'OPENING_BALANCE',
        narration: 'Opening Balance - Owner Capital Investment',
        totalDebit: 100000,
        totalCredit: 100000,
        isApproved: true,
        createdById: superAdmin.id,
        lines: {
          create: [
            {
              accountId: c2BankAccount.id,
              debitAmount: 100000,
              creditAmount: 0,
              narration: 'Opening bank balance'
            },
            {
              accountId: c2EquityAccount.id,
              debitAmount: 0,
              creditAmount: 100000,
              narration: "Owner's capital"
            }
          ]
        }
      }
    });
    
    // Update account balances
    await db.chartOfAccount.update({
      where: { id: c2BankAccount.id },
      data: { currentBalance: 100000 }
    });
    await db.chartOfAccount.update({
      where: { id: c2EquityAccount.id },
      data: { currentBalance: 100000 }
    });
  }
  console.log('✅ Created Opening Entry for Company 2');

  // Step 7: Create Company Users
  console.log('\n👥 Creating Company Users...');
  
  const company3User = await db.user.create({
    data: {
      email: 'company3@test.com',
      name: 'Company 3 Admin',
      password: await bcrypt.hash('company3', 10),
      plainPassword: 'company3',
      role: 'COMPANY',
      companyId: company3.id,
      isActive: true,
      firebaseUid: 'company3-admin',
    }
  });
  console.log('✅ Created Company 3 User');

  const company1User = await db.user.create({
    data: {
      email: 'company1@test.com',
      name: 'Company 1 Admin',
      password: await bcrypt.hash('company1', 10),
      plainPassword: 'company1',
      role: 'COMPANY',
      companyId: company1.id,
      isActive: true,
      firebaseUid: 'company1-admin',
    }
  });
  console.log('✅ Created Company 1 User');

  const company2User = await db.user.create({
    data: {
      email: 'company2@test.com',
      name: 'Company 2 Admin',
      password: await bcrypt.hash('company2', 10),
      plainPassword: 'company2',
      role: 'COMPANY',
      companyId: company2.id,
      isActive: true,
      firebaseUid: 'company2-admin',
    }
  });
  console.log('✅ Created Company 2 User');

  // Step 8: Create System Settings
  await db.systemSetting.upsert({
    where: { key: 'companyName' },
    update: { value: 'Money Mitra Financial Advisor' },
    create: { key: 'companyName', value: 'Money Mitra Financial Advisor' }
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ DATABASE SEEDING COMPLETED!');
  console.log('═══════════════════════════════════════════════════════════════');
  
  console.log('\n📋 LOGIN CREDENTIALS:');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ Super Admin: moneymitra@gmail.com / 1122334455             │');
  console.log('│ Company 3:   company3@test.com / company3                  │');
  console.log('│ Company 1:   company1@test.com / company1                  │');
  console.log('│ Company 2:   company2@test.com / company2                  │');
  console.log('└─────────────────────────────────────────────────────────────┘');
  
  console.log('\n📊 COMPANY SETUP:');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ C3 (Original): Creates loans, NO accounting (Cashbook only) │');
  console.log('│ C1 (Mirror):   15% REDUCING, Full Chart of Accounts        │');
  console.log('│ C2 (Mirror):   24% REDUCING, Full Chart of Accounts        │');
  console.log('└─────────────────────────────────────────────────────────────┘');
  
  console.log('\n💰 INITIAL BALANCES:');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│ Company 1: Bank ₹1,00,000 | Equity ₹1,00,000               │');
  console.log('│ Company 2: Bank ₹1,00,000 | Equity ₹1,00,000               │');
  console.log('│ Company 3: Cashbook only (no Chart of Accounts)            │');
  console.log('└─────────────────────────────────────────────────────────────┘');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
