import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recordEMIPaymentAccounting, getCompany3Id } from '@/lib/simple-accounting';
import { cache, CacheTTL } from '@/lib/cache';

// ==========================================
// DATA INTEGRITY CHECK & SYNC ENDPOINT
// ==========================================
// This endpoint ensures consistency between:
// 1. Loans (Online & Offline)
// 2. Accounting entries (CashBook, Bank Transactions)
// 3. Credit Transactions
//
// Rules:
// - If loan deleted → Delete related transactions
// - If transaction exists but loan doesn't → Delete transaction
// - If loan exists but transaction doesn't → Create transaction

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const autoFix = searchParams.get('autoFix') === 'true';
  const userRole = searchParams.get('userRole');

  // Only SUPER_ADMIN and ACCOUNTANT can access this endpoint
  if (userRole !== 'SUPER_ADMIN' && userRole !== 'ACCOUNTANT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Cache non-autoFix results 5 min — prevents repeated full table scans
  if (!autoFix) {
    const cacheKey = `system:data-integrity:${userRole}`;
    const cached = cache.get<object>(cacheKey);
    if (cached) return NextResponse.json(cached);
  }

  const report: IntegrityReport = {
    timestamp: new Date().toISOString(),
    checks: [],
    summary: {
      totalIssues: 0,
      totalFixed: 0,
      status: 'HEALTHY'
    }
  };

  try {
    // CHECK 1: Orphan CashBook Entries
    const orphanCashCheck = await checkOrphanAccountingEntries('CASHBOOK');
    report.checks.push(orphanCashCheck);
    if (orphanCashCheck.issues > 0) {
      report.summary.totalIssues += orphanCashCheck.issues;
      if (orphanCashCheck.status === 'FIXED') report.summary.totalFixed += orphanCashCheck.fixed;
    }

    // CHECK 2: Orphan Bank Transactions
    const orphanBankCheck = await checkOrphanAccountingEntries('BANK');
    report.checks.push(orphanBankCheck);
    if (orphanBankCheck.issues > 0) {
      report.summary.totalIssues += orphanBankCheck.issues;
      if (orphanBankCheck.status === 'FIXED') report.summary.totalFixed += orphanBankCheck.fixed;
    }

    // CHECK 3: Orphan Credit Transactions
    const orphanCreditCheck = await checkOrphanCreditTransactions();
    report.checks.push(orphanCreditCheck);
    if (orphanCreditCheck.issues > 0) {
      report.summary.totalIssues += orphanCreditCheck.issues;
      if (orphanCreditCheck.status === 'FIXED') report.summary.totalFixed += orphanCreditCheck.fixed;
    }

    // CHECK 4: Missing Accounting Entries for Paid EMIs
    const missingEntriesCheck = await checkMissingAccountingEntries(autoFix);
    report.checks.push(missingEntriesCheck);
    if (missingEntriesCheck.issues > 0) {
      report.summary.totalIssues += missingEntriesCheck.issues;
      if (missingEntriesCheck.status === 'FIXED') report.summary.totalFixed += missingEntriesCheck.fixed;
    }

    // CHECK 5: Company-wise Data Integrity
    const companyIntegrityCheck = await checkCompanyIntegrity();
    report.checks.push(companyIntegrityCheck);
    if (companyIntegrityCheck.issues > 0) {
      report.summary.totalIssues += companyIntegrityCheck.issues;
      if (companyIntegrityCheck.status === 'FIXED') report.summary.totalFixed += companyIntegrityCheck.fixed;
    }

    if (report.summary.totalIssues > 0) report.summary.status = 'ISSUES_FOUND';

    // Audit log (fire-and-forget, non-critical)
    db.auditLog.create({
      data: {
        userId: 'system', action: 'DATA_INTEGRITY_CHECK', module: 'SYSTEM',
        description: `Integrity check. Issues: ${report.summary.totalIssues}, Fixed: ${report.summary.totalFixed}`,
        oldValue: null, newValue: null, recordId: 'integrity-check', recordType: 'SYSTEM_CHECK'
      }
    }).catch(() => {});

    const response = {
      success: true, report,
      message: autoFix
        ? `Integrity check completed. Found ${report.summary.totalIssues} issues, fixed ${report.summary.totalFixed}.`
        : `Integrity check completed. Found ${report.summary.totalIssues} issues. Run with autoFix=true to fix.`
    };

    // Cache read-only results 5 min (not autoFix — autoFix mutates data)
    if (!autoFix) {
      cache.set(`system:data-integrity:${userRole}`, response, CacheTTL.LONG);
    }
    return NextResponse.json(response);

  } catch (error) {
    console.error('[Integrity] Error during integrity check:', error);
    return NextResponse.json({ 
      error: 'Integrity check failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

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
      // Get all CashBook entries with loan-related reference types
      const entries = await db.cashBookEntry.findMany({
        where: {
          referenceType: { in: ACCOUNTING_REFERENCE_TYPES },
          referenceId: { not: null }
        },
        select: { id: true, referenceId: true, referenceType: true, amount: true, description: true }
      });

      for (const entry of entries) {
        if (!entry.referenceId) continue;

        // Check if reference exists in either online or offline loans/EMIs
        const exists = await checkReferenceExists(entry.referenceId, entry.referenceType);
        
        if (!exists) {
          check.issues++;
          check.details.push(`CashBook entry ${entry.id} references non-existent ${entry.referenceType}: ${entry.referenceId}`);
          
          // Delete the orphan entry
          try {
            await db.cashBookEntry.delete({ where: { id: entry.id } });
            check.fixed++;
            check.details.push(`  → Deleted orphan CashBook entry ${entry.id}`);
          } catch (e) {
            check.details.push(`  → Failed to delete: ${e instanceof Error ? e.message : 'Unknown error'}`);
          }
        }
      }
    } else {
      // Get all Bank transactions with loan-related reference types
      const transactions = await db.bankTransaction.findMany({
        where: {
          referenceType: { in: ACCOUNTING_REFERENCE_TYPES },
          referenceId: { not: null }
        },
        select: { id: true, referenceId: true, referenceType: true, amount: true, description: true }
      });

      for (const txn of transactions) {
        if (!txn.referenceId) continue;

        // Check if reference exists
        const exists = await checkReferenceExists(txn.referenceId, txn.referenceType);
        
        if (!exists) {
          check.issues++;
          check.details.push(`Bank transaction ${txn.id} references non-existent ${txn.referenceType}: ${txn.referenceId}`);
          
          // Delete the orphan transaction
          try {
            await db.bankTransaction.delete({ where: { id: txn.id } });
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

async function checkReferenceExists(referenceId: string, referenceType: string): Promise<boolean> {
  // Check based on reference type
  if (referenceType.includes('OFFLINE')) {
    // Check offline loan or EMI
    const offlineLoan = await db.offlineLoan.findUnique({ where: { id: referenceId } });
    if (offlineLoan) return true;
    
    const offlineEmi = await db.offlineLoanEMI.findUnique({ where: { id: referenceId } });
    if (offlineEmi) return true;
  } else {
    // Check online loan or EMI
    const onlineLoan = await db.loanApplication.findUnique({ where: { id: referenceId } });
    if (onlineLoan) return true;
    
    const onlineEmi = await db.eMISchedule.findUnique({ where: { id: referenceId } });
    if (onlineEmi) return true;
    
    // Also check offline
    const offlineLoan = await db.offlineLoan.findUnique({ where: { id: referenceId } });
    if (offlineLoan) return true;
    
    const offlineEmi = await db.offlineLoanEMI.findUnique({ where: { id: referenceId } });
    if (offlineEmi) return true;
  }
  
  return false;
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
    // Get credit transactions with sourceId (loan references)
    const creditTxns = await db.creditTransaction.findMany({
      where: {
        sourceId: { not: null }
      },
      select: { id: true, sourceId: true, sourceType: true, amount: true, description: true }
    });

    for (const txn of creditTxns) {
      if (!txn.sourceId) continue;

      // Check if source exists
      let exists = false;
      
      if (txn.sourceType === 'EMI_PAYMENT' || txn.sourceType === 'INTEREST_ONLY_PAYMENT') {
        // Check both online and offline EMIs
        const onlineEmi = await db.eMISchedule.findUnique({ where: { id: txn.sourceId } });
        const offlineEmi = await db.offlineLoanEMI.findUnique({ where: { id: txn.sourceId } });
        exists = !!onlineEmi || !!offlineEmi;
      } else {
        // Check both loan types
        const onlineLoan = await db.loanApplication.findUnique({ where: { id: txn.sourceId } });
        const offlineLoan = await db.offlineLoan.findUnique({ where: { id: txn.sourceId } });
        exists = !!onlineLoan || !!offlineLoan;
      }

      if (!exists) {
        check.issues++;
        check.details.push(`Credit transaction ${txn.id} references non-existent ${txn.sourceType}: ${txn.sourceId}`);
        
        // Delete the orphan transaction
        try {
          await db.creditTransaction.delete({ where: { id: txn.id } });
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

async function checkMissingAccountingEntries(autoFix: boolean): Promise<IntegrityReport['checks'][0]> {
  const check: IntegrityReport['checks'][0] = {
    name: 'Missing Accounting Entries for Paid EMIs',
    status: 'PASS',
    issues: 0,
    fixed: 0,
    details: []
  };

  if (!autoFix) {
    check.details.push('Auto-fix disabled - run with autoFix=true to create missing entries');
    return check;
  }

  try {
    const company3Id = await getCompany3Id();
    if (!company3Id) {
      check.details.push('Company 3 not found - cannot create missing entries');
      check.status = 'FAIL';
      return check;
    }

    // ==========================================
    // Check Offline Loan EMIs
    // ==========================================
    const paidOfflineEmis = await db.offlineLoanEMI.findMany({
      where: {
        paymentStatus: { in: ['PAID', 'INTEREST_ONLY_PAID'] },
        paidAmount: { gt: 0 }
      },
      include: {
        offlineLoan: {
          select: {
            id: true,
            loanNumber: true,
            companyId: true,
            company: { select: { id: true, name: true } }
          }
        }
      }
    });

    for (const emi of paidOfflineEmis) {
      // Check if accounting entry exists
      const existingCashEntry = await db.cashBookEntry.findFirst({
        where: {
          referenceId: emi.id,
          referenceType: { in: ACCOUNTING_REFERENCE_TYPES }
        }
      });

      const existingBankTxn = await db.bankTransaction.findFirst({
        where: {
          referenceId: emi.id,
          referenceType: { in: ACCOUNTING_REFERENCE_TYPES }
        }
      });

      if (!existingCashEntry && !existingBankTxn) {
        check.issues++;
        check.details.push(`Offline EMI ${emi.id} (#${emi.installmentNumber}) has no accounting entry`);
        
        // Create missing accounting entry
        try {
          // Determine credit type based on payment mode
          const creditType = emi.paymentMode === 'CASH' ? 'COMPANY' : 'PERSONAL';
          const loanCompanyId = emi.offlineLoan.companyId;
          
          if (!loanCompanyId) {
            check.details.push(`  → Skipped: No company associated with loan`);
            continue;
          }

          await recordEMIPaymentAccounting({
            amount: emi.paidAmount,
            principalComponent: emi.paidPrincipal || 0,
            interestComponent: emi.paidInterest || 0,
            paymentMode: (emi.paymentMode as 'CASH' | 'ONLINE' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE') || 'CASH',
            paymentType: emi.paymentStatus === 'INTEREST_ONLY_PAID' ? 'INTEREST_ONLY' : 'FULL',
            creditType: creditType as 'PERSONAL' | 'COMPANY',
            loanCompanyId,
            company3Id,
            loanId: emi.offlineLoanId,
            emiId: emi.id,
            paymentId: emi.id,
            loanNumber: emi.offlineLoan.loanNumber,
            installmentNumber: emi.installmentNumber,
            userId: emi.collectedById || 'system'
          });

          check.fixed++;
          check.details.push(`  → Created accounting entry for EMI ${emi.id}`);
        } catch (e) {
          check.details.push(`  → Failed to create entry: ${e instanceof Error ? e.message : 'Unknown error'}`);
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
    // Check that each company has a CashBook
    const companies = await db.company.findMany({
      select: { id: true, name: true, code: true }
    });

    for (const company of companies) {
      const cashBook = await db.cashBook.findUnique({
        where: { companyId: company.id }
      });

      if (!cashBook) {
        check.issues++;
        check.details.push(`Company ${company.name} (${company.code}) has no CashBook`);
        
        // Create missing CashBook
        try {
          await db.cashBook.create({
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

    // Check that each company has at least one Bank Account (except Company 3)
    for (const company of companies) {
      // Skip Company 3 (code: C3) - it uses CashBook only
      if (company.code === 'C3') continue;

      const bankAccount = await db.bankAccount.findFirst({
        where: { companyId: company.id, isActive: true }
      });

      if (!bankAccount) {
        check.issues++;
        check.details.push(`Company ${company.name} (${company.code}) has no active Bank Account`);
        // Note: We don't auto-create bank accounts as they need real bank details
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
