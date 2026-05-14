/**
 * COMPANY RESET SEED SCRIPT
 * Run with: npx ts-node --project tsconfig.json scripts/seed-companies.ts
 *
 * Deletes ALL companies (force cascade) and creates:
 * 1. PD RANGANI            C3  company3@gmail.com  isMirrorCompany: false
 * 2. MONEY MITRA FINANCIAL ADVISOR  C1  company1@gmail.com  isMirrorCompany: true
 * 3. KESARDEEP FINANCIAL ADVISOR    C2  company2@gmail.com  isMirrorCompany: true
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function forceDeleteAllCompanies() {
  console.log('\n🗑️  Force-deleting ALL company data...');

  // 1. Get all company IDs
  const companies = await db.company.findMany({ select: { id: true, name: true, code: true } });
  console.log(`Found ${companies.length} companies to delete:`, companies.map(c => `${c.name} (${c.code})`));

  // 2. Delete all loan-related data first (deepest foreign key level first)
  console.log('  → Deleting EMI reminders...');
  await db.eMIReminderLog.deleteMany({}).catch(() => {});

  console.log('  → Deleting offline loan EMIs...');
  await db.offlineLoanEMI.deleteMany({}).catch(() => {});

  console.log('  → Deleting offline loans...');
  await db.offlineLoan.deleteMany({}).catch(() => {});

  console.log('  → Deleting EMI schedules...');
  await db.eMISchedule.deleteMany({}).catch(() => {});

  console.log('  → Deleting payments...');
  await db.payment.deleteMany({}).catch(() => {});

  console.log('  → Deleting loan applications...');
  await db.loanApplication.deleteMany({}).catch(() => {});

  // 3. Delete accounting data
  console.log('  → Deleting journal entry lines...');
  await db.journalEntryLine.deleteMany({}).catch(() => {});

  console.log('  → Deleting journal entries...');
  await db.journalEntry.deleteMany({}).catch(() => {});

  console.log('  → Deleting ledger balances...');
  await db.ledgerBalance.deleteMany({}).catch(() => {});

  console.log('  → Deleting chart of accounts...');
  await db.chartOfAccount.deleteMany({}).catch(() => {});

  console.log('  → Deleting financial years...');
  await db.financialYear.deleteMany({}).catch(() => {});

  console.log('  → Deleting bank account transactions...');
  await db.bankTransaction?.deleteMany({}).catch(() => {});

  console.log('  → Deleting bank accounts...');
  await db.bankAccount.deleteMany({}).catch(() => {});

  console.log('  → Deleting cashbook entries...');
  await (db as any).cashBookEntry?.deleteMany({}).catch(() => {});

  console.log('  → Deleting cashbooks...');
  await db.cashBook?.deleteMany({}).catch(() => {});

  console.log('  → Deleting equity entries...');
  await db.equityEntry?.deleteMany({}).catch(() => {});

  console.log('  → Deleting borrowed money...');
  await db.borrowedMoney?.deleteMany({}).catch(() => {});

  console.log('  → Deleting invest money...');
  await db.investMoney?.deleteMany({}).catch(() => {});

  // 4. Delete other company data
  console.log('  → Deleting expenses...');
  await db.expense.deleteMany({}).catch(() => {});

  console.log('  → Deleting expense requests...');
  await (db as any).expenseRequest?.deleteMany({}).catch(() => {});


  console.log('  → Deleting ledgers...');
  await db.ledger.deleteMany({}).catch(() => {});

  console.log('  → Deleting GST configs...');
  await db.gSTConfig.deleteMany({}).catch(() => {});

  console.log('  → Deleting fixed assets...');
  await db.fixedAsset.deleteMany({}).catch(() => {});

  console.log('  → Deleting commission slabs...');
  await db.commissionSlab.deleteMany({}).catch(() => {});

  console.log('  → Deleting grace period configs...');
  await db.gracePeriodConfig.deleteMany({}).catch(() => {});

  console.log('  → Deleting pre-approved offers...');
  await db.preApprovedOffer.deleteMany({}).catch(() => {});

  console.log('  → Deleting agent performance...');
  await db.agentPerformance.deleteMany({}).catch(() => {});

  console.log('  → Deleting company payment pages...');
  await (db as any).companyPaymentPage?.deleteMany({}).catch(() => {});

  console.log('  → Deleting company payment settings...');
  await db.companyPaymentSettings?.deleteMany({}).catch(() => {});

  console.log('  → Deleting company accounting settings...');
  await db.companyAccountingSettings?.deleteMany({}).catch(() => {});

  // 5. Unlink users from companies (set companyId = null), then delete COMPANY role users
  console.log('  → Unlinking/deleting company users...');
  await db.user.updateMany({
    where: { role: { not: 'SUPER_ADMIN' } },
    data: { companyId: null }
  }).catch(() => {});

  await db.user.deleteMany({
    where: { role: 'COMPANY' }
  }).catch(() => {});

  // 6. Finally delete the companies
  console.log('  → Deleting companies...');
  await db.company.deleteMany({});

  console.log('✅ All companies deleted!\n');
}

async function createCompanies() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  const companiesData = [
    {
      company: {
        name: 'PD RANGANI',
        code: 'C3',
        contactEmail: 'company3@gmail.com',
        isActive: true,
        isMirrorCompany: false,       // Original lending company - NO full accounting
        enableMirrorLoan: false,
        defaultInterestRate: 12,
        defaultInterestType: 'FLAT',
        accountingType: 'CASHBOOK_ONLY',
        maxLoanAmount: 10000000,
        minLoanAmount: 1000,
        maxTenureMonths: 60,
        country: 'India',
      },
      user: {
        name: 'PD RANGANI',
        email: 'company3@gmail.com',
        role: 'COMPANY' as const,
        firebaseUid: `local_company3_${Date.now()}`,
        password: hashedPassword,
        plainPassword: '123456',
        loginType: 'EMAIL',
        isActive: true,
      }
    },
    {
      company: {
        name: 'MONEY MITRA FINANCIAL ADVISOR',
        code: 'C1',
        contactEmail: 'company1@gmail.com',
        isActive: true,
        isMirrorCompany: true,        // Mirror company - FULL accounting suite
        enableMirrorLoan: true,
        defaultInterestRate: 12,
        defaultInterestType: 'FLAT',
        accountingType: 'FULL',
        maxLoanAmount: 10000000,
        minLoanAmount: 1000,
        maxTenureMonths: 60,
        country: 'India',
      },
      user: {
        name: 'MONEY MITRA FINANCIAL ADVISOR',
        email: 'company1@gmail.com',
        role: 'COMPANY' as const,
        firebaseUid: `local_company1_${Date.now() + 1}`,
        password: hashedPassword,
        plainPassword: '123456',
        loginType: 'EMAIL',
        isActive: true,
      }
    },
    {
      company: {
        name: 'KESARDEEP FINANCIAL ADVISOR',
        code: 'C2',
        contactEmail: 'company2@gmail.com',
        isActive: true,
        isMirrorCompany: true,        // Mirror company - FULL accounting suite
        enableMirrorLoan: true,
        defaultInterestRate: 12,
        defaultInterestType: 'FLAT',
        accountingType: 'FULL',
        maxLoanAmount: 10000000,
        minLoanAmount: 1000,
        maxTenureMonths: 60,
        country: 'India',
      },
      user: {
        name: 'KESARDEEP FINANCIAL ADVISOR',
        email: 'company2@gmail.com',
        role: 'COMPANY' as const,
        firebaseUid: `local_company2_${Date.now() + 2}`,
        password: hashedPassword,
        plainPassword: '123456',
        loginType: 'EMAIL',
        isActive: true,
      }
    },
  ];

  console.log('🏢 Creating 3 fresh companies...\n');

  for (const { company: companyData, user: userData } of companiesData) {
    console.log(`Creating ${companyData.name} (${companyData.code})...`);

    // Create company
    const company = await db.company.create({ data: companyData });

    // Create user linked to company
    await db.user.create({
      data: {
        ...userData,
        companyId: company.id,
      }
    });

    console.log(`  ✅ ${companyData.name}`);
    console.log(`     ID: ${company.id}`);
    console.log(`     Code: ${company.code}`);
    console.log(`     isMirrorCompany: ${company.isMirrorCompany}`);
    console.log(`     Login: ${userData.email} / 123456\n`);
  }

  console.log('✅ All 3 companies created successfully!\n');
}

async function main() {
  try {
    console.log('='.repeat(60));
    console.log('COMPANY RESET & SEED');
    console.log('='.repeat(60));

    await forceDeleteAllCompanies();
    await createCompanies();

    // Verify
    const count = await db.company.count();
    const users = await db.user.count({ where: { role: 'COMPANY' } });
    console.log(`\n📊 Final state: ${count} companies, ${users} company users`);

    const all = await db.company.findMany({
      select: { id: true, name: true, code: true, isMirrorCompany: true, accountingType: true }
    });
    console.table(all);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

main().catch(console.error);
