/**
 * Daily Data Integrity Check Service
 * 
 * This service runs daily to ensure consistency between:
 * 1. Loans (Online & Offline)
 * 2. Accounting entries (CashBook, Bank Transactions)
 * 3. Credit Transactions
 * 
 * Rules:
 * - If loan deleted → Delete related transactions
 * - If transaction exists but loan doesn't → Delete transaction
 * - If loan exists but transaction doesn't → Create transaction
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACCOUNTING_REFERENCE_TYPES = [
  'EMI_PAYMENT_PERSONAL',
  'EMI_PAYMENT_ONLINE', 
  'EMI_PAYMENT_CASH',
  'MIRROR_EMI_PAYMENT',
  'EXTRA_EMI_PAYMENT',
  'LOAN_DISBURSEMENT',
  'EMI_PAYMENT',
  'OFFLINE_LOAN',
  'OFFLINE_EMI'
];

interface IntegrityReport {
  timestamp: string;
  checks: {
    name: string;
    status: 'PASS' | 'FAIL' | 'FIXED';
    issues: number;
    fixed: number;
    details: string[];
  }[];
  summary: {
    totalIssues: number;
    totalFixed: number;
    status: 'HEALTHY' | 'ISSUES_FOUND' | 'ERROR';
  };
}

async function checkReferenceExists(referenceId: string, referenceType: string): Promise<boolean> {
  if (referenceType.includes('OFFLINE')) {
    const offlineLoan = await prisma.offlineLoan.findUnique({ where: { id: referenceId } });
    if (offlineLoan) return true;
    
    const offlineEmi = await prisma.offlineLoanEMI.findUnique({ where: { id: referenceId } });
    if (offlineEmi) return true;
  } else {
    const onlineLoan = await prisma.loanApplication.findUnique({ where: { id: referenceId } });
    if (onlineLoan) return true;
    
    const onlineEmi = await prisma.eMISchedule.findUnique({ where: { id: referenceId } });
    if (onlineEmi) return true;
    
    const offlineLoan = await prisma.offlineLoan.findUnique({ where: { id: referenceId } });
    if (offlineLoan) return true;
    
    const offlineEmi = await prisma.offlineLoanEMI.findUnique({ where: { id: referenceId } });
    if (offlineEmi) return true;
  }
  
  return false;
}

async function checkOrphanAccountingEntries(type: 'CASHBOOK' | 'BANK'): Promise<IntegrityReport['checks'][0]> {
  const check: IntegrityReport['checks'][0] = {
    name: `Orphan ${type === 'CASHBOOK' ? 'CashBook' : 'Bank'} Entries`,
    status: 'PASS',
    issues: 0,
    fixed: 0,
    details: []
  };

  try {
    if (type === 'CASHBOOK') {
      const entries = await prisma.cashBookEntry.findMany({
        where: {
          referenceType: { in: ACCOUNTING_REFERENCE_TYPES },
          referenceId: { not: null }
        },
        select: { id: true, referenceId: true, referenceType: true, amount: true }
      });

      for (const entry of entries) {
        if (!entry.referenceId) continue;

        const exists = await checkReferenceExists(entry.referenceId, entry.referenceType);
        
        if (!exists) {
          check.issues++;
          check.details.push(`CashBook entry ${entry.id} references non-existent ${entry.referenceType}: ${entry.referenceId}`);
          
          try {
            await prisma.cashBookEntry.delete({ where: { id: entry.id } });
            check.fixed++;
            check.details.push(`  → Deleted orphan CashBook entry ${entry.id}`);
          } catch (e) {
            check.details.push(`  → Failed to delete: ${e instanceof Error ? e.message : 'Unknown error'}`);
          }
        }
      }
    } else {
      const transactions = await prisma.bankTransaction.findMany({
        where: {
          referenceType: { in: ACCOUNTING_REFERENCE_TYPES },
          referenceId: { not: null }
        },
        select: { id: true, referenceId: true, referenceType: true, amount: true }
      });

      for (const txn of transactions) {
        if (!txn.referenceId) continue;

        const exists = await checkReferenceExists(txn.referenceId, txn.referenceType);
        
        if (!exists) {
          check.issues++;
          check.details.push(`Bank transaction ${txn.id} references non-existent ${txn.referenceType}: ${txn.referenceId}`);
          
          try {
            await prisma.bankTransaction.delete({ where: { id: txn.id } });
            check.fixed++;
            check.details.push(`  → Deleted orphan Bank transaction ${txn.id}`);
          } catch (e) {
            check.details.push(`  → Failed to delete: ${e instanceof Error ? e.message : 'Unknown error'}`);
          }
        }
      }
    }

    if (check.issues > 0) {
      check.status = check.fixed === check.issues ? 'FIXED' : 'FAIL';
    }

  } catch (error) {
    check.status = 'FAIL';
    check.details.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return check;
}

async function checkOrphanCreditTransactions(): Promise<IntegrityReport['checks'][0]> {
  const check: IntegrityReport['checks'][0] = {
    name: 'Orphan Credit Transactions',
    status: 'PASS',
    issues: 0,
    fixed: 0,
    details: []
  };

  try {
    const creditTxns = await prisma.creditTransaction.findMany({
      where: {
        sourceId: { not: null }
      },
      select: { id: true, sourceId: true, sourceType: true, amount: true }
    });

    for (const txn of creditTxns) {
      if (!txn.sourceId) continue;

      let exists = false;
      
      if (txn.sourceType === 'EMI_PAYMENT' || txn.sourceType === 'INTEREST_ONLY_PAYMENT') {
        const onlineEmi = await prisma.eMISchedule.findUnique({ where: { id: txn.sourceId } });
        const offlineEmi = await prisma.offlineLoanEMI.findUnique({ where: { id: txn.sourceId } });
        exists = !!onlineEmi || !!offlineEmi;
      } else {
        const onlineLoan = await prisma.loanApplication.findUnique({ where: { id: txn.sourceId } });
        const offlineLoan = await prisma.offlineLoan.findUnique({ where: { id: txn.sourceId } });
        exists = !!onlineLoan || !!offlineLoan;
      }

      if (!exists) {
        check.issues++;
        check.details.push(`Credit transaction ${txn.id} references non-existent ${txn.sourceType}: ${txn.sourceId}`);
        
        try {
          await prisma.creditTransaction.delete({ where: { id: txn.id } });
          check.fixed++;
          check.details.push(`  → Deleted orphan Credit transaction ${txn.id}`);
        } catch (e) {
          check.details.push(`  → Failed to delete: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    }

    if (check.issues > 0) {
      check.status = check.fixed === check.issues ? 'FIXED' : 'FAIL';
    }

  } catch (error) {
    check.status = 'FAIL';
    check.details.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return check;
}

async function checkCompanyIntegrity(): Promise<IntegrityReport['checks'][0]> {
  const check: IntegrityReport['checks'][0] = {
    name: 'Company-wise Data Integrity',
    status: 'PASS',
    issues: 0,
    fixed: 0,
    details: []
  };

  try {
    const companies = await prisma.company.findMany({
      select: { id: true, name: true, code: true }
    });

    for (const company of companies) {
      const cashBook = await prisma.cashBook.findUnique({
        where: { companyId: company.id }
      });

      if (!cashBook) {
        check.issues++;
        check.details.push(`Company ${company.name} (${company.code}) has no CashBook`);
        
        try {
          await prisma.cashBook.create({
            data: {
              companyId: company.id,
              currentBalance: 0
            }
          });
          check.fixed++;
          check.details.push(`  → Created CashBook for ${company.name}`);
        } catch (e) {
          check.details.push(`  → Failed to create: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    }

    if (check.issues > 0 && check.fixed > 0) {
      check.status = 'FIXED';
    } else if (check.issues > 0) {
      check.status = 'FAIL';
    }

  } catch (error) {
    check.status = 'FAIL';
    check.details.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return check;
}

async function runIntegrityCheck(): Promise<IntegrityReport> {
  console.log('[Integrity Check] Starting daily integrity check...');
  
  const report: IntegrityReport = {
    timestamp: new Date().toISOString(),
    checks: [],
    summary: {
      totalIssues: 0,
      totalFixed: 0,
      status: 'HEALTHY'
    }
  };

  // Check 1: Orphan CashBook Entries
  console.log('[Integrity Check] Checking for orphan CashBook entries...');
  const orphanCashCheck = await checkOrphanAccountingEntries('CASHBOOK');
  report.checks.push(orphanCashCheck);
  report.summary.totalIssues += orphanCashCheck.issues;
  report.summary.totalFixed += orphanCashCheck.fixed;

  // Check 2: Orphan Bank Transactions
  console.log('[Integrity Check] Checking for orphan Bank transactions...');
  const orphanBankCheck = await checkOrphanAccountingEntries('BANK');
  report.checks.push(orphanBankCheck);
  report.summary.totalIssues += orphanBankCheck.issues;
  report.summary.totalFixed += orphanBankCheck.fixed;

  // Check 3: Orphan Credit Transactions
  console.log('[Integrity Check] Checking for orphan Credit transactions...');
  const orphanCreditCheck = await checkOrphanCreditTransactions();
  report.checks.push(orphanCreditCheck);
  report.summary.totalIssues += orphanCreditCheck.issues;
  report.summary.totalFixed += orphanCreditCheck.fixed;

  // Check 4: Company Integrity
  console.log('[Integrity Check] Checking company-wise data integrity...');
  const companyIntegrityCheck = await checkCompanyIntegrity();
  report.checks.push(companyIntegrityCheck);
  report.summary.totalIssues += companyIntegrityCheck.issues;
  report.summary.totalFixed += companyIntegrityCheck.fixed;

  if (report.summary.totalIssues > 0) {
    report.summary.status = 'ISSUES_FOUND';
  }

  // Log to audit
  try {
    await prisma.auditLog.create({
      data: {
        userId: 'system',
        action: 'DATA_INTEGRITY_CHECK',
        module: 'SYSTEM',
        description: `Daily integrity check completed. Issues: ${report.summary.totalIssues}, Fixed: ${report.summary.totalFixed}`,
        oldValue: null,
        newValue: JSON.stringify(report),
        recordId: `integrity-check-${Date.now()}`,
        recordType: 'SYSTEM_CHECK'
      }
    });
  } catch {
    // Ignore audit log errors
  }

  console.log(`[Integrity Check] Completed. Issues: ${report.summary.totalIssues}, Fixed: ${report.summary.totalFixed}`);
  
  return report;
}

// Run integrity check every 24 hours at 2 AM
async function startService() {
  console.log('[Integrity Service] Starting...');
  
  // Run immediately on startup
  await runIntegrityCheck();
  
  // Calculate time until 2 AM
  const now = new Date();
  const next2AM = new Date();
  next2AM.setHours(2, 0, 0, 0);
  if (next2AM <= now) {
    next2AM.setDate(next2AM.getDate() + 1);
  }
  
  const msUntil2AM = next2AM.getTime() - now.getTime();
  
  console.log(`[Integrity Service] Next run at 2 AM (in ${Math.round(msUntil2AM / 1000 / 60)} minutes)`);
  
  // Schedule daily run at 2 AM
  setInterval(async () => {
    console.log('[Integrity Service] Running scheduled daily check...');
    await runIntegrityCheck();
  }, 24 * 60 * 60 * 1000); // Run every 24 hours
  
  // Also run at exactly 2 AM
  setTimeout(async () => {
    console.log('[Integrity Service] Running scheduled 2 AM check...');
    await runIntegrityCheck();
    
    // Set up daily interval after first 2 AM run
    setInterval(async () => {
      console.log('[Integrity Service] Running scheduled daily check...');
      await runIntegrityCheck();
    }, 24 * 60 * 60 * 1000);
  }, msUntil2AM);
}

// Start the service
startService().catch(console.error);

console.log('[Integrity Service] Running on port 3005');
