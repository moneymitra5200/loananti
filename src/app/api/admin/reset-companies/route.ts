import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';

/**
 * POST /api/admin/reset-companies
 * 
 * SUPER ADMIN ONLY — deletes ALL companies & recreates the canonical 3.
 * Protected by a secret key (pass as query ?secret=RESET_SECRET_2024).
 *
 * Companies created:
 *  C3 - PD RANGANI               company3@gmail.com  isMirrorCompany: false
 *  C1 - MONEY MITRA FINANCIAL ADVISOR  company1@gmail.com  isMirrorCompany: true
 *  C2 - KESARDEEP FINANCIAL ADVISOR    company2@gmail.com  isMirrorCompany: true
 */

const RESET_SECRET = 'RESET_COMPANIES_2024';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== RESET_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs: string[] = [];
  const log = (msg: string) => { logs.push(msg); console.log(msg); };

  try {
    log('=== COMPANY RESET START ===');

    // ── STEP 1: Cascade delete all company data ───────────────────────────────
    log('Deleting EMI reminders...');
    await db.eMIReminderLog.deleteMany({}).catch(() => {});

    log('Deleting offline loan EMIs...');
    await db.offlineLoanEMI.deleteMany({}).catch(() => {});

    log('Deleting offline loans...');
    await db.offlineLoan.deleteMany({}).catch(() => {});

    log('Deleting EMI schedules...');
    await db.eMISchedule.deleteMany({}).catch(() => {});

    log('Deleting payments...');
    await db.payment.deleteMany({}).catch(() => {});

    log('Deleting loan applications...');
    await db.loanApplication.deleteMany({}).catch(() => {});

    log('Deleting journal entry lines...');
    await db.journalEntryLine.deleteMany({}).catch(() => {});

    log('Deleting journal entries...');
    await db.journalEntry.deleteMany({}).catch(() => {});

    log('Deleting ledger balances...');
    await db.ledgerBalance.deleteMany({}).catch(() => {});

    log('Deleting chart of accounts...');
    await db.chartOfAccount.deleteMany({}).catch(() => {});

    log('Deleting financial years...');
    await db.financialYear.deleteMany({}).catch(() => {});

    log('Deleting bank accounts...');
    await db.bankAccount.deleteMany({}).catch(() => {});

    log('Deleting cashbook entries...');
    await (db as any).cashBookEntry?.deleteMany({}).catch(() => {});

    log('Deleting cashbooks...');
    await (db as any).cashBook?.deleteMany({}).catch(() => {});

    log('Deleting equity entries...');
    await (db as any).equityEntry?.deleteMany({}).catch(() => {});

    log('Deleting borrowed money...');
    await (db as any).borrowedMoney?.deleteMany({}).catch(() => {});

    log('Deleting invest money...');
    await (db as any).investMoney?.deleteMany({}).catch(() => {});

    log('Deleting expenses...');
    await db.expense.deleteMany({}).catch(() => {});

    log('Deleting expense requests...');
    await (db as any).expenseRequest?.deleteMany({}).catch(() => {});

    log('Deleting ledgers...');
    await db.ledger.deleteMany({}).catch(() => {});

    log('Deleting GST configs...');
    await db.gSTConfig.deleteMany({}).catch(() => {});

    log('Deleting fixed assets...');
    await db.fixedAsset.deleteMany({}).catch(() => {});

    log('Deleting commission slabs...');
    await db.commissionSlab.deleteMany({}).catch(() => {});

    log('Deleting grace period configs...');
    await db.gracePeriodConfig.deleteMany({}).catch(() => {});

    log('Deleting pre-approved offers...');
    await db.preApprovedOffer.deleteMany({}).catch(() => {});

    log('Deleting agent performance...');
    await db.agentPerformance.deleteMany({}).catch(() => {});

    log('Deleting company payment pages...');
    await (db as any).companyPaymentPage?.deleteMany({}).catch(() => {});

    log('Deleting company payment settings...');
    await (db as any).companyPaymentSettings?.deleteMany({}).catch(() => {});

    log('Deleting company accounting settings...');
    await (db as any).companyAccountingSettings?.deleteMany({}).catch(() => {});

    log('Deleting credit transactions...');
    await (db as any).creditTransaction?.deleteMany({}).catch(() => {});

    log('Deleting cashier settlements...');
    await (db as any).cashierSettlement?.deleteMany({}).catch(() => {});

    log('Deleting payment requests...');
    await (db as any).paymentRequest?.deleteMany({}).catch(() => {});

    // Delete COMPANY users, unlink others
    log('Deleting COMPANY-role users...');
    await db.user.deleteMany({ where: { role: 'COMPANY' } }).catch(() => {});

    log('Unlinking non-COMPANY users from companies...');
    await db.user.updateMany({ where: { companyId: { not: null } }, data: { companyId: null } }).catch(() => {});

    // Finally delete all companies
    log('Deleting all companies...');
    const deleted = await db.company.deleteMany({});
    log(`✓ Deleted ${deleted.count} companies`);

    // ── STEP 2: Create 3 canonical companies ─────────────────────────────────
    const companiesDef = [
      {
        company: {
          name: 'PD RANGANI',
          code: 'C3',
          contactEmail: 'company3@gmail.com',
          isActive: true,
          isMirrorCompany: false,
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
          firebaseUid: `local_c3_${Date.now()}`,
          password: '$2a$10$NWH5PiQqFORJV2G.NOLz4.iN0L9A8Zi4fOBVpd1H3x0jTqpfL5.6y', // bcrypt hash of 123456
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
          isMirrorCompany: true,
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
          firebaseUid: `local_c1_${Date.now() + 1}`,
          password: '$2a$10$NWH5PiQqFORJV2G.NOLz4.iN0L9A8Zi4fOBVpd1H3x0jTqpfL5.6y',
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
          isMirrorCompany: true,
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
          firebaseUid: `local_c2_${Date.now() + 2}`,
          password: '$2a$10$NWH5PiQqFORJV2G.NOLz4.iN0L9A8Zi4fOBVpd1H3x0jTqpfL5.6y',
          plainPassword: '123456',
          loginType: 'EMAIL',
          isActive: true,
        }
      },
    ];

    const created: any[] = [];
    for (const { company: cd, user: ud } of companiesDef) {
      log(`Creating ${cd.name} (${cd.code})...`);
      const company = await db.company.create({ data: cd });
      const user = await db.user.create({ data: { ...ud, companyId: company.id } });
      created.push({ company: { id: company.id, name: company.name, code: company.code, isMirrorCompany: company.isMirrorCompany }, user: { email: user.email, role: user.role } });
      log(`✓ ${cd.name} created (${company.id})`);
    }

    // Clear all caches
    cache.deletePattern('companies:');
    cache.deletePattern('users:');

    log('=== COMPANY RESET COMPLETE ===');

    return NextResponse.json({
      success: true,
      message: 'All companies reset and recreated',
      created,
      logs,
    });

  } catch (error) {
    console.error('[reset-companies] Error:', error);
    return NextResponse.json({
      error: 'Reset failed',
      details: error instanceof Error ? error.message : 'Unknown',
      logs,
    }, { status: 500 });
  }
}
// GET handler — lets you trigger the reset directly from a browser URL
// Usage: GET /api/admin/reset-companies?secret=RESET_COMPANIES_2024
export async function GET(request: NextRequest) {
  return POST(request);
}
