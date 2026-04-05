import { db } from '@/lib/db';
import * as bcrypt from 'bcryptjs';
import { AccountType } from '@prisma/client';
import { PERMANENT_CHART_OF_ACCOUNTS } from '@/lib/permanent-accounts';

// ============================================================
// PERMANENT SUPER ADMIN CREDENTIALS - DO NOT CHANGE
// ============================================================
const SUPER_ADMIN_EMAIL = 'moneymitra@gmail.com';
const SUPER_ADMIN_PASSWORD = '1122334455';
const SUPER_ADMIN_NAME = 'Money Mitra Admin';

// ============================================================
// NON-DESTRUCTIVE SEED - Creates records only if they don't exist
// ============================================================
async function main() {
  console.log('🚀 Starting database seeding (non-destructive mode)...');
  console.log('═══════════════════════════════════════════════════════════════');

  // ============================================================
  // STEP 1: ENSURE SUPER ADMIN EXISTS
  // ============================================================
  console.log('\n👤 Checking Super Admin...');
  
  const superAdminPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
  const superAdmin = await db.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {
      password: superAdminPassword,
      plainPassword: SUPER_ADMIN_PASSWORD,
      name: SUPER_ADMIN_NAME,
      isActive: true,
      role: 'SUPER_ADMIN',
      isLocked: false,
      failedLoginAttempts: 0,
    },
    create: {
      email: SUPER_ADMIN_EMAIL,
      password: superAdminPassword,
      plainPassword: SUPER_ADMIN_PASSWORD,
      name: SUPER_ADMIN_NAME,
      firebaseUid: 'super-admin-permanent-moneymitra',
      role: 'SUPER_ADMIN',
      isActive: true,
    }
  });
  console.log(`✅ Super Admin ready: ${superAdmin.email}`);

  // ============================================================
  // STEP 2: ENSURE COMPANIES EXIST
  // ============================================================
  console.log('\n🏢 Checking Companies...');
  
  // Company 3 (C3) - Original Loan Company
  const company3 = await db.company.upsert({
    where: { code: 'C3' },
    update: {
      name: 'Company 3 - Original',
      isActive: true,
      isMirrorCompany: false,
      enableMirrorLoan: true,
      defaultInterestRate: 24,
      defaultInterestType: 'FLAT',
      accountingType: 'CASHBOOK_ONLY',
    },
    create: {
      name: 'Company 3 - Original',
      code: 'C3',
      isActive: true,
      isMirrorCompany: false,
      enableMirrorLoan: true,
      defaultInterestRate: 24,
      defaultInterestType: 'FLAT',
      accountingType: 'CASHBOOK_ONLY',
    }
  });
  console.log(`✅ Company 3 (C3): ${company3.id}`);

  // Company 1 (C1) - Mirror Company with 15% rate
  const company1 = await db.company.upsert({
    where: { code: 'C1' },
    update: {
      name: 'Company 1 - Mirror',
      isActive: true,
      isMirrorCompany: true,
      enableMirrorLoan: false,
      mirrorInterestRate: 15,
      mirrorInterestType: 'REDUCING',
      defaultInterestRate: 15,
      defaultInterestType: 'REDUCING',
      accountingType: 'FULL',
    },
    create: {
      name: 'Company 1 - Mirror',
      code: 'C1',
      isActive: true,
      isMirrorCompany: true,
      enableMirrorLoan: false,
      mirrorInterestRate: 15,
      mirrorInterestType: 'REDUCING',
      defaultInterestRate: 15,
      defaultInterestType: 'REDUCING',
      accountingType: 'FULL',
    }
  });
  console.log(`✅ Company 1 (C1): ${company1.id}`);

  // Company 2 (C2) - Mirror Company with 24% rate
  const company2 = await db.company.upsert({
    where: { code: 'C2' },
    update: {
      name: 'Company 2 - Mirror',
      isActive: true,
      isMirrorCompany: true,
      enableMirrorLoan: false,
      mirrorInterestRate: 24,
      mirrorInterestType: 'REDUCING',
      defaultInterestRate: 24,
      defaultInterestType: 'REDUCING',
      accountingType: 'FULL',
    },
    create: {
      name: 'Company 2 - Mirror',
      code: 'C2',
      isActive: true,
      isMirrorCompany: true,
      enableMirrorLoan: false,
      mirrorInterestRate: 24,
      mirrorInterestType: 'REDUCING',
      defaultInterestRate: 24,
      defaultInterestType: 'REDUCING',
      accountingType: 'FULL',
    }
  });
  console.log(`✅ Company 2 (C2): ${company2.id}`);

  // ============================================================
  // STEP 3: INITIALIZE CHART OF ACCOUNTS FOR MIRROR COMPANIES
  // ============================================================
  console.log('\n📊 Initializing Chart of Accounts...');
  
  const mirrorCompanies = [
    { id: company1.id, name: 'Company 1', code: 'C1' },
    { id: company2.id, name: 'Company 2', code: 'C2' },
  ];

  for (const company of mirrorCompanies) {
    // Check existing accounts
    const existingAccounts = await db.chartOfAccount.findMany({
      where: { companyId: company.id },
      select: { accountCode: true }
    });
    const existingCodes = new Set(existingAccounts.map(a => a.accountCode));

    // Create missing accounts
    let created = 0;
    for (const account of PERMANENT_CHART_OF_ACCOUNTS) {
      if (!existingCodes.has(account.accountCode)) {
        await db.chartOfAccount.create({
          data: {
            companyId: company.id,
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
        created++;
      }
    }
    console.log(`✅ ${company.name}: ${created} new accounts, ${existingCodes.size} existing`);
  }

  // ============================================================
  // STEP 4: ENSURE COMPANY USERS EXIST
  // ============================================================
  console.log('\n👥 Checking Company Users...');
  
  // Company 3 User
  await db.user.upsert({
    where: { email: 'company3@test.com' },
    update: { companyId: company3.id, isActive: true },
    create: {
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
  console.log('✅ Company 3 User: company3@test.com');

  // Company 1 User
  await db.user.upsert({
    where: { email: 'company1@test.com' },
    update: { companyId: company1.id, isActive: true },
    create: {
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
  console.log('✅ Company 1 User: company1@test.com');

  // Company 2 User
  await db.user.upsert({
    where: { email: 'company2@test.com' },
    update: { companyId: company2.id, isActive: true },
    create: {
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
  console.log('✅ Company 2 User: company2@test.com');

  // ============================================================
  // STEP 5: ENSURE SYSTEM SETTINGS EXIST
  // ============================================================
  await db.systemSetting.upsert({
    where: { key: 'companyName' },
    update: { value: 'Money Mitra Financial Advisor' },
    create: { key: 'companyName', value: 'Money Mitra Financial Advisor' }
  });

  // ============================================================
  // SUMMARY
  // ============================================================
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
  console.log('│ C3 (Original): Creates loans, Cashbook only                │');
  console.log('│ C1 (Mirror):   15% REDUCING, Full Chart of Accounts        │');
  console.log('│ C2 (Mirror):   24% REDUCING, Full Chart of Accounts        │');
  console.log('└─────────────────────────────────────────────────────────────┘');
  
  console.log('\n📊 PERMANENT CHART OF ACCOUNTS:');
  console.log(`   ${PERMANENT_CHART_OF_ACCOUNTS.length} accounts defined in src/lib/permanent-accounts.ts`);
  console.log('   These accounts are automatically created for each mirror company.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
