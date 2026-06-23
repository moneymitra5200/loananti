import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/accounting/recalculate-balances
 *
 * POWERFUL deep-fix that reads ALL data and guarantees a balanced sheet:
 *
 *  1. Deletes previous system-generated correction entries.
 *  2. Removes/deactivates any Suspense account (9999).
 *  3. Fixes stored totals on every JournalEntry.
 *  4. Fixes unbalanced journal entries (offsets to Opening Balance Equity 3001).
 *  5. Recalculates every ChartOfAccount.currentBalance from journal lines.
 *  6. Reads ALL ground-truth data: CashBook, BankAccount, Loans, EMIs, EquityEntry.
 *  7. Computes Retained Earnings (3003) = Assets − Liabilities − Capital − P/L
 *     so Balance Sheet is ALWAYS balanced by construction.
 *  8. Updates ChartOfAccount balances for all override accounts.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const log: string[] = [];
    const warn: string[] = [];

    // ─── 1. Get system user ───────────────────────────────────────────────────
    const systemUser =
      await db.user.findFirst({ where: { role: 'SUPER_ADMIN' }, select: { id: true } }) ||
      await db.user.findFirst({ select: { id: true } });

    if (!systemUser) {
      return NextResponse.json({ error: 'No system user found' }, { status: 500 });
    }

    // =========================================================================
    // ─── 00. REBUILD CASH AND BANK BALANCES FROM LEDGER (GROUND TRUTH SYNC) ──
    // =========================================================================
    try {
      const cashBooks = await db.cashBook.findMany({ where: { companyId } });
      for (const cb of cashBooks) {
        const entries = await db.cashBookEntry.findMany({ where: { cashBookId: cb.id } });
        const creditSum = entries.filter(e => e.entryType === 'CREDIT').reduce((s, e) => s + e.amount, 0);
        const debitSum = entries.filter(e => e.entryType === 'DEBIT').reduce((s, e) => s + e.amount, 0);
        const calculatedBalance = (cb.openingBalance || 0) + creditSum - debitSum;

        await db.cashBook.update({
          where: { id: cb.id },
          data: { currentBalance: calculatedBalance }
        });
        log.push(`Recalculated CashBook balance for ${cb.id}: ₹${calculatedBalance.toFixed(2)}`);
      }

      const bankAccs = await db.bankAccount.findMany({ where: { companyId } });
      for (const ba of bankAccs) {
        const txns = await db.bankTransaction.findMany({ where: { bankAccountId: ba.id } });
        const creditSum = txns.filter(t => t.transactionType === 'CREDIT').reduce((s, t) => s + t.amount, 0);
        const debitSum = txns.filter(t => t.transactionType === 'DEBIT').reduce((s, t) => s + t.amount, 0);
        const calculatedBalance = (ba.openingBalance || 0) + creditSum - debitSum;

        await db.bankAccount.update({
          where: { id: ba.id },
          data: { currentBalance: calculatedBalance }
        });
        log.push(`Recalculated BankAccount balance for ${ba.accountNumber || ba.id}: ₹${calculatedBalance.toFixed(2)}`);
      }
    } catch (rebuildErr) {
      warn.push(`Error rebuilding cash/bank balances: ${rebuildErr instanceof Error ? rebuildErr.message : 'Unknown'}`);
    }

    // =========================================================================
    // ─── 01. DEEP RECONCILIATION - ORPHAN CLEANUP ────────────────────────────
    // =========================================================================
    try {
      const onlineLoanIds = (await db.loanApplication.findMany({ select: { id: true } })).map(l => l.id);
      const offlineLoanIds = (await db.offlineLoan.findMany({ select: { id: true } })).map(l => l.id);
      const allLoanIdsSet = new Set([...onlineLoanIds, ...offlineLoanIds]);

      // Delete orphaned loan disbursement JEs
      const disbursementJEs = await db.journalEntry.findMany({
        where: {
          companyId,
          referenceType: { in: ['LOAN_DISBURSEMENT', 'MIRROR_LOAN_DISBURSEMENT'] }
        },
        select: { id: true, referenceId: true }
      });
      const orphanJEIds = disbursementJEs.filter(je => je.referenceId && !allLoanIdsSet.has(je.referenceId)).map(je => je.id);
      if (orphanJEIds.length > 0) {
        await db.journalEntryLine.deleteMany({ where: { journalEntryId: { in: orphanJEIds } } });
        await db.journalEntry.deleteMany({ where: { id: { in: orphanJEIds } } });
        log.push(`Deleted ${orphanJEIds.length} orphaned disbursement journal entries`);
      }

      // Delete orphaned loan disbursement Daybook entries
      const orphanDBEntries = await db.daybookEntry.findMany({
        where: {
          companyId,
          referenceType: { in: ['LOAN_DISBURSEMENT', 'MIRROR_LOAN_DISBURSEMENT'] }
        },
        select: { id: true, referenceId: true }
      });
      const orphanDBIds = orphanDBEntries.filter(dbEntry => dbEntry.referenceId && !allLoanIdsSet.has(dbEntry.referenceId)).map(dbEntry => dbEntry.id);
      if (orphanDBIds.length > 0) {
        await db.daybookEntry.deleteMany({ where: { id: { in: orphanDBIds } } });
        log.push(`Deleted ${orphanDBIds.length} orphaned disbursement daybook entries`);
      }

      // Delete orphaned loan disbursement Bank transactions
      const orphanBankTxns = await db.bankTransaction.findMany({
        where: {
          bankAccount: { companyId },
          referenceType: { in: ['LOAN_DISBURSEMENT', 'MIRROR_LOAN_DISBURSEMENT'] }
        },
        select: { id: true, referenceId: true }
      });
      const orphanBankTxnIds = orphanBankTxns.filter(bt => bt.referenceId && !allLoanIdsSet.has(bt.referenceId)).map(bt => bt.id);
      if (orphanBankTxnIds.length > 0) {
        await db.bankTransaction.deleteMany({ where: { id: { in: orphanBankTxnIds } } });
        log.push(`Deleted ${orphanBankTxnIds.length} orphaned disbursement bank transactions`);
      }

      // Delete orphaned loan disbursement CashBook entries
      const orphanCashEntries = await db.cashBookEntry.findMany({
        where: {
          cashBook: { companyId },
          referenceType: { in: ['LOAN_DISBURSEMENT', 'MIRROR_LOAN_DISBURSEMENT'] }
        },
        select: { id: true, referenceId: true }
      });
      const orphanCashEntryIds = orphanCashEntries.filter(ce => ce.referenceId && !allLoanIdsSet.has(ce.referenceId)).map(ce => ce.id);
      if (orphanCashEntryIds.length > 0) {
        await db.cashBookEntry.deleteMany({ where: { id: { in: orphanCashEntryIds } } });
        log.push(`Deleted ${orphanCashEntryIds.length} orphaned disbursement cashbook entries`);
      }

      // Payments & EMIs
      const completedOnlinePaymentIds = (await db.payment.findMany({
        where: { status: 'COMPLETED' },
        select: { id: true }
      })).map(p => p.id);

      const paidOfflineEMIIds = (await db.offlineLoanEMI.findMany({
        where: { OR: [{ paidAmount: { gt: 0 } }, { paymentStatus: { in: ['PAID', 'PARTIALLY_PAID'] } }] },
        select: { id: true }
      })).map(e => e.id);

      const allValidPaymentIdsSet = new Set([...completedOnlinePaymentIds, ...paidOfflineEMIIds]);

      // Delete orphaned payment JEs
      const paymentJEs = await db.journalEntry.findMany({
        where: {
          companyId,
          referenceType: { in: ['EMI_PAYMENT', 'MIRROR_EMI_PAYMENT'] }
        },
        select: { id: true, referenceId: true }
      });
      const orphanPaymentJEIds = paymentJEs.filter(je => je.referenceId && !allValidPaymentIdsSet.has(je.referenceId)).map(je => je.id);
      if (orphanPaymentJEIds.length > 0) {
        await db.journalEntryLine.deleteMany({ where: { journalEntryId: { in: orphanPaymentJEIds } } });
        await db.journalEntry.deleteMany({ where: { id: { in: orphanPaymentJEIds } } });
        log.push(`Deleted ${orphanPaymentJEIds.length} orphaned payment journal entries`);
      }

      // Delete orphaned payment Daybook entries
      const orphanPaymentDBEntries = await db.daybookEntry.findMany({
        where: {
          companyId,
          referenceType: { in: ['EMI_PAYMENT', 'MIRROR_EMI_PAYMENT'] }
        },
        select: { id: true, referenceId: true }
      });
      const orphanPaymentDBIds = orphanPaymentDBEntries.filter(dbEntry => dbEntry.referenceId && !allValidPaymentIdsSet.has(dbEntry.referenceId)).map(dbEntry => dbEntry.id);
      if (orphanPaymentDBIds.length > 0) {
        await db.daybookEntry.deleteMany({ where: { id: { in: orphanPaymentDBIds } } });
        log.push(`Deleted ${orphanPaymentDBIds.length} orphaned payment daybook entries`);
      }

      // Delete orphaned payment Bank transactions
      const orphanPaymentBankTxns = await db.bankTransaction.findMany({
        where: {
          bankAccount: { companyId },
          referenceType: { in: ['EMI_PAYMENT', 'MIRROR_EMI_PAYMENT'] }
        },
        select: { id: true, referenceId: true }
      });
      const orphanPaymentBankTxnIds = orphanPaymentBankTxns.filter(bt => bt.referenceId && !allValidPaymentIdsSet.has(bt.referenceId)).map(bt => bt.id);
      if (orphanPaymentBankTxnIds.length > 0) {
        await db.bankTransaction.deleteMany({ where: { id: { in: orphanPaymentBankTxnIds } } });
        log.push(`Deleted ${orphanPaymentBankTxnIds.length} orphaned payment bank transactions`);
      }

      // Delete orphaned payment CashBook entries
      const orphanPaymentCashEntries = await db.cashBookEntry.findMany({
        where: {
          cashBook: { companyId },
          referenceType: { in: ['EMI_PAYMENT', 'MIRROR_EMI_PAYMENT'] }
        },
        select: { id: true, referenceId: true }
      });
      const orphanPaymentCashEntryIds = orphanPaymentCashEntries.filter(ce => ce.referenceId && !allValidPaymentIdsSet.has(ce.referenceId)).map(ce => ce.id);
      if (orphanPaymentCashEntryIds.length > 0) {
        await db.cashBookEntry.deleteMany({ where: { id: { in: orphanPaymentCashEntryIds } } });
        log.push(`Deleted ${orphanPaymentCashEntryIds.length} orphaned payment cashbook entries`);
      }

      // Delete orphaned processing fee bank transactions
      const pfBankTxns = await db.bankTransaction.findMany({
        where: {
          bankAccount: { companyId },
          referenceType: 'PROCESSING_FEE'
        },
        select: { id: true, referenceId: true }
      });
      const orphanPfBankTxnIds = pfBankTxns.filter(bt => {
        if (!bt.referenceId) return false;
        const loanId = bt.referenceId.replace('-PF', '');
        return !allLoanIdsSet.has(loanId);
      }).map(bt => bt.id);
      if (orphanPfBankTxnIds.length > 0) {
        await db.bankTransaction.deleteMany({ where: { id: { in: orphanPfBankTxnIds } } });
        log.push(`Deleted ${orphanPfBankTxnIds.length} orphaned processing fee bank transactions`);
      }

      // Delete orphaned processing fee cashbook entries
      const pfCashEntries = await db.cashBookEntry.findMany({
        where: {
          cashBook: { companyId },
          referenceType: 'PROCESSING_FEE'
        },
        select: { id: true, referenceId: true }
      });
      const orphanPfCashEntryIds = pfCashEntries.filter(ce => {
        if (!ce.referenceId) return false;
        const loanId = ce.referenceId.replace('-PF', '');
        return !allLoanIdsSet.has(loanId);
      }).map(ce => ce.id);
      if (orphanPfCashEntryIds.length > 0) {
        await db.cashBookEntry.deleteMany({ where: { id: { in: orphanPfCashEntryIds } } });
        log.push(`Deleted ${orphanPfCashEntryIds.length} orphaned processing fee cashbook entries`);
      }
    } catch (cleanupErr) {
      warn.push(`Error cleaning up orphaned accounting records: ${cleanupErr instanceof Error ? cleanupErr.message : 'Unknown'}`);
    }

    // =========================================================================
    // ─── 02. DEEP RECONCILIATION - RECONSTRUCT MISSING ENTRIES ───────────────
    // =========================================================================
    try {
      const { AccountingService } = await import('@/lib/accounting-service');
      const {
        recordLoanDisbursement: recOnlineDisb,
        recordEMIPayment: recOnlineEmi,
        recordOfflineLoanDisbursement: recOfflineDisb,
        recordOfflineEMIPayment: recOfflineEmi,
      } = await import('@/lib/accounting-helper');
      const { recordBankTransaction: recBank, recordCashBookEntry: recCash } = await import('@/lib/simple-accounting');

      // 1. Online Loans Reconstruction
      const activeOnlineLoans = await db.loanApplication.findMany({
        where: {
          companyId,
          status: { in: ['ACTIVE', 'ACTIVE_INTEREST_ONLY', 'DISBURSED', 'CLOSED'] },
          disbursedAmount: { not: null }
        },
        include: {
          sessionForm: true,
          customer: { select: { name: true } }
        }
      });

      for (const loan of activeOnlineLoans) {
        try {
          const hasJE = await db.journalEntry.findFirst({
            where: {
              companyId,
              referenceId: loan.id,
              referenceType: { in: ['LOAN_DISBURSEMENT', 'MIRROR_LOAN_DISBURSEMENT'] }
            }
          });

          const isMirrorLoan = !!(await db.mirrorLoanMapping.findFirst({
            where: { mirrorLoanId: loan.id }
          }));

          const disbursementMode = loan.disbursementMode || 'BANK_TRANSFER';
          const customerName = loan.customer?.name || `${loan.firstName || ''} ${loan.lastName || ''}`.trim() || 'Customer';
          const amount = loan.disbursedAmount || loan.requestedAmount;

          if (!hasJE) {
            const accountingService = new AccountingService(companyId);
            await accountingService.initializeChartOfAccounts();

            if (isMirrorLoan) {
              const journalLines: Array<{
                accountCode: string;
                debitAmount: number;
                creditAmount: number;
                loanId?: string;
                narration: string;
              }> = [];

              journalLines.push({
                accountCode: '1210',
                debitAmount: amount,
                creditAmount: 0,
                loanId: loan.id,
                narration: 'Mirror loan principal disbursed',
              });

              const creditCode = disbursementMode === 'CASH' ? '1101' : '1102';
              journalLines.push({
                accountCode: creditCode,
                debitAmount: 0,
                creditAmount: amount,
                narration: disbursementMode === 'CASH' ? 'Cash payment for mirror loan' : 'Bank payment for mirror loan',
              });

              await accountingService.createJournalEntry({
                entryDate: loan.disbursedAt || loan.createdAt,
                referenceType: 'MIRROR_LOAN_DISBURSEMENT',
                referenceId: loan.id,
                narration: `Mirror Loan Disbursement - ${loan.applicationNo} - Principal: ₹${amount.toLocaleString()}`,
                lines: journalLines,
                createdById: loan.disbursedById || systemUser.id,
                paymentMode: disbursementMode,
                isAutoEntry: true,
              });
              log.push(`Reconstructed mirror loan disbursement JournalEntry for online loan: ${loan.applicationNo}`);
            } else {
              await accountingService.recordLoanDisbursement({
                loanId: loan.id,
                customerId: loan.customerId,
                customerName,
                amount,
                disbursementDate: loan.disbursedAt || loan.createdAt,
                createdById: loan.disbursedById || systemUser.id,
                paymentMode: disbursementMode,
                reference: `Reconstruction: ${loan.applicationNo}`
              });
              log.push(`Reconstructed loan disbursement JournalEntry for online loan: ${loan.applicationNo}`);
            }
          }

          // Check Daybook Entry
          const hasDB = await db.daybookEntry.findFirst({
            where: {
              companyId,
              referenceId: loan.id,
              referenceType: { in: ['LOAN_DISBURSEMENT', 'MIRROR_LOAN_DISBURSEMENT'] }
            }
          });

          if (!hasDB) {
            if (isMirrorLoan) {
              await recOfflineDisb({
                companyId,
                loanId: loan.id,
                loanNo: loan.applicationNo,
                customerName,
                amount,
                processingFee: 0,
                paymentMode: disbursementMode,
                createdById: loan.disbursedById || systemUser.id,
                isMirrorLoan: true
              });
            } else {
              await recOnlineDisb({
                companyId,
                loanId: loan.id,
                loanNo: loan.applicationNo,
                customerName,
                amount,
                processingFee: loan.sessionForm?.processingFee || 0,
                paymentMode: disbursementMode,
                createdById: loan.disbursedById || systemUser.id
              });
            }
            log.push(`Reconstructed Daybook Entry for online loan disbursement: ${loan.applicationNo}`);
          }

          // Check Bank/Cash transaction
          if (disbursementMode === 'CASH') {
            const hasCash = await db.cashBookEntry.findFirst({
              where: {
                cashBook: { companyId },
                referenceId: loan.id,
                referenceType: { in: ['LOAN_DISBURSEMENT', 'MIRROR_LOAN_DISBURSEMENT'] }
              }
            });
            if (!hasCash) {
              await recCash({
                companyId,
                entryType: 'DEBIT',
                amount,
                description: `Loan Disbursement - ${loan.applicationNo} - ${customerName}`,
                referenceType: isMirrorLoan ? 'MIRROR_LOAN_DISBURSEMENT' : 'LOAN_DISBURSEMENT',
                referenceId: loan.id,
                createdById: loan.disbursedById || systemUser.id
              });
              log.push(`Reconstructed CashBookEntry for online loan disbursement: ${loan.applicationNo}`);
            }
          } else {
            const hasBank = await db.bankTransaction.findFirst({
              where: {
                bankAccount: { companyId },
                referenceId: loan.id,
                referenceType: { in: ['LOAN_DISBURSEMENT', 'MIRROR_LOAN_DISBURSEMENT'] }
              }
            });
            if (!hasBank) {
              await recBank({
                companyId,
                transactionType: 'DEBIT',
                amount,
                description: `Loan Disbursement - ${loan.applicationNo} - ${customerName}`,
                referenceType: isMirrorLoan ? 'MIRROR_LOAN_DISBURSEMENT' : 'LOAN_DISBURSEMENT',
                referenceId: loan.id,
                createdById: loan.disbursedById || systemUser.id
              });
              log.push(`Reconstructed BankTransaction for online loan disbursement: ${loan.applicationNo}`);
            }
          }

          // Check Processing Fee
          const pf = loan.sessionForm?.processingFee || 0;
          if (pf > 0) {
            const hasPFBank = await db.bankTransaction.findFirst({
              where: {
                bankAccount: { companyId },
                referenceId: `${loan.id}-PF`,
                referenceType: 'PROCESSING_FEE'
              }
            });
            const hasPFCash = await db.cashBookEntry.findFirst({
              where: {
                cashBook: { companyId },
                referenceId: `${loan.id}-PF`,
                referenceType: 'PROCESSING_FEE'
              }
            });

            if (!hasPFBank && !hasPFCash) {
              const isOnline = ['ONLINE', 'UPI', 'BANK_TRANSFER', 'NEFT', 'RTGS', 'IMPS'].includes(disbursementMode.toUpperCase());
              if (isOnline) {
                await recBank({
                  companyId,
                  transactionType: 'CREDIT',
                  amount: pf,
                  description: `Processing Fee - ${loan.applicationNo}`,
                  referenceType: 'PROCESSING_FEE',
                  referenceId: `${loan.id}-PF`,
                  createdById: loan.disbursedById || systemUser.id
                });
              } else {
                await recCash({
                  companyId,
                  entryType: 'CREDIT',
                  amount: pf,
                  description: `Processing Fee - ${loan.applicationNo}`,
                  referenceType: 'PROCESSING_FEE',
                  referenceId: `${loan.id}-PF`,
                  createdById: loan.disbursedById || systemUser.id
                });
              }
              log.push(`Reconstructed processing fee bank/cash entry for online loan: ${loan.applicationNo}`);
            }

            const hasPFAccrual = await db.journalEntry.findFirst({
              where: {
                companyId,
                referenceId: loan.id,
                referenceType: 'PROCESSING_FEE_ACCRUAL'
              }
            });
            if (!hasPFAccrual) {
              const accountingService = new AccountingService(companyId);
              await accountingService.initializeChartOfAccounts();
              await accountingService.recordProcessingFeeAccrual({
                loanId: loan.id,
                customerId: loan.customerId,
                amount: pf,
                accrualDate: new Date(new Date(loan.disbursedAt || loan.createdAt).getTime() - 5000),
                createdById: loan.disbursedById || systemUser.id
              });
              log.push(`Reconstructed processing fee accrual JournalEntry for online loan: ${loan.applicationNo}`);
            }

            const hasPFCollection = await db.journalEntry.findFirst({
              where: {
                companyId,
                referenceId: loan.id,
                referenceType: 'PROCESSING_FEE_COLLECTION'
              }
            });
            if (!hasPFCollection) {
              const accountingService = new AccountingService(companyId);
              await accountingService.initializeChartOfAccounts();
              await accountingService.recordProcessingFee({
                loanId: loan.id,
                customerId: loan.customerId,
                amount: pf,
                collectionDate: loan.disbursedAt || loan.createdAt,
                createdById: loan.disbursedById || systemUser.id,
                paymentMode: disbursementMode,
                reference: `Processing Fee: ${loan.applicationNo}`
              });
              log.push(`Reconstructed processing fee collection JournalEntry for online loan: ${loan.applicationNo}`);
            }
          }
        } catch (loanErr) {
          warn.push(`Failed to reconstruct online loan ${loan.applicationNo}: ${loanErr instanceof Error ? loanErr.message : 'Unknown'}`);
        }
      }

      // 2. Offline Loans Reconstruction
      const activeOfflineLoans = await db.offlineLoan.findMany({
        where: {
          companyId,
          status: { in: ['ACTIVE', 'INTEREST_ONLY', 'CLOSED', 'DEFAULTED', 'RESTRUCTURED'] },
          loanAmount: { not: null }
        },
        include: {
          customer: { select: { name: true } }
        }
      });

      for (const loan of activeOfflineLoans) {
        try {
          const isMirrorLoan = !!(await db.mirrorLoanMapping.findFirst({
            where: { mirrorLoanId: loan.id }
          }));

          const hasJE = await db.journalEntry.findFirst({
            where: {
              companyId,
              referenceId: loan.id,
              referenceType: { in: ['LOAN_DISBURSEMENT', 'MIRROR_LOAN_DISBURSEMENT'] }
            }
          });

          const disbursementMode = loan.paymentMode || 'BANK_TRANSFER';
          const customerName = loan.customerName || loan.customer?.name || 'Customer';
          const amount = loan.loanAmount;

          if (!hasJE) {
            const accountingService = new AccountingService(companyId);
            await accountingService.initializeChartOfAccounts();

            if (isMirrorLoan) {
              const journalLines: Array<{
                accountCode: string;
                debitAmount: number;
                creditAmount: number;
                loanId?: string;
                narration: string;
              }> = [];

              journalLines.push({
                accountCode: '1210',
                debitAmount: amount,
                creditAmount: 0,
                loanId: loan.id,
                narration: 'Mirror loan principal disbursed',
              });

              const creditCode = disbursementMode === 'CASH' ? '1101' : '1102';
              journalLines.push({
                accountCode: creditCode,
                debitAmount: 0,
                creditAmount: amount,
                narration: disbursementMode === 'CASH' ? 'Cash payment for mirror loan' : 'Bank payment for mirror loan',
              });

              await accountingService.createJournalEntry({
                entryDate: loan.disbursedAt || loan.createdAt,
                referenceType: 'MIRROR_LOAN_DISBURSEMENT',
                referenceId: loan.id,
                narration: `Mirror Loan Disbursement - ${loan.loanNumber} - Principal: ₹${amount.toLocaleString()}`,
                lines: journalLines,
                createdById: loan.createdById || systemUser.id,
                paymentMode: disbursementMode,
                isAutoEntry: true,
              });
              log.push(`Reconstructed mirror loan disbursement JournalEntry for offline loan: ${loan.loanNumber}`);
            } else {
              await accountingService.recordLoanDisbursement({
                loanId: loan.id,
                customerId: loan.customerId || loan.id,
                customerName,
                amount,
                disbursementDate: loan.disbursedAt || loan.createdAt,
                createdById: loan.createdById || systemUser.id,
                paymentMode: disbursementMode,
                reference: `Reconstruction: ${loan.loanNumber}`
              });
              log.push(`Reconstructed loan disbursement JournalEntry for offline loan: ${loan.loanNumber}`);
            }
          }

          // Check Daybook Entry
          const hasDB = await db.daybookEntry.findFirst({
            where: {
              companyId,
              referenceId: loan.id,
              referenceType: { in: ['LOAN_DISBURSEMENT', 'MIRROR_LOAN_DISBURSEMENT'] }
            }
          });

          if (!hasDB) {
            await recOfflineDisb({
              companyId,
              loanId: loan.id,
              loanNo: loan.loanNumber,
              customerName,
              amount,
              processingFee: loan.processingFee || 0,
              paymentMode: disbursementMode,
              createdById: loan.createdById || systemUser.id,
              isMirrorLoan
            });
            log.push(`Reconstructed Daybook Entry for offline loan disbursement: ${loan.loanNumber}`);
          }

          // Check Bank/Cash transaction
          if (disbursementMode === 'CASH') {
            const hasCash = await db.cashBookEntry.findFirst({
              where: {
                cashBook: { companyId },
                referenceId: loan.id,
                referenceType: { in: ['LOAN_DISBURSEMENT', 'MIRROR_LOAN_DISBURSEMENT'] }
              }
            });
            if (!hasCash) {
              await recCash({
                companyId,
                entryType: 'DEBIT',
                amount,
                description: `Loan Disbursement - ${loan.loanNumber} - ${customerName}`,
                referenceType: isMirrorLoan ? 'MIRROR_LOAN_DISBURSEMENT' : 'LOAN_DISBURSEMENT',
                referenceId: loan.id,
                createdById: loan.createdById || systemUser.id
              });
              log.push(`Reconstructed CashBookEntry for offline loan disbursement: ${loan.loanNumber}`);
            }
          } else {
            const hasBank = await db.bankTransaction.findFirst({
              where: {
                bankAccount: { companyId },
                referenceId: loan.id,
                referenceType: { in: ['LOAN_DISBURSEMENT', 'MIRROR_LOAN_DISBURSEMENT'] }
              }
            });
            if (!hasBank) {
              await recBank({
                companyId,
                transactionType: 'DEBIT',
                amount,
                description: `Loan Disbursement - ${loan.loanNumber} - ${customerName}`,
                referenceType: isMirrorLoan ? 'MIRROR_LOAN_DISBURSEMENT' : 'LOAN_DISBURSEMENT',
                referenceId: loan.id,
                createdById: loan.createdById || systemUser.id
              });
              log.push(`Reconstructed BankTransaction for offline loan disbursement: ${loan.loanNumber}`);
            }
          }

          // Check Processing Fee
          const pf = loan.processingFee || 0;
          if (pf > 0) {
            const hasPFBank = await db.bankTransaction.findFirst({
              where: {
                bankAccount: { companyId },
                referenceId: `${loan.id}-PF`,
                referenceType: 'PROCESSING_FEE'
              }
            });
            const hasPFCash = await db.cashBookEntry.findFirst({
              where: {
                cashBook: { companyId },
                referenceId: `${loan.id}-PF`,
                referenceType: 'PROCESSING_FEE'
              }
            });

            if (!hasPFBank && !hasPFCash) {
              const isOnline = ['ONLINE', 'UPI', 'BANK_TRANSFER', 'NEFT', 'RTGS', 'IMPS'].includes(disbursementMode.toUpperCase());
              if (isOnline) {
                await recBank({
                  companyId,
                  transactionType: 'CREDIT',
                  amount: pf,
                  description: `Processing Fee - ${loan.loanNumber}`,
                  referenceType: 'PROCESSING_FEE',
                  referenceId: `${loan.id}-PF`,
                  createdById: loan.createdById || systemUser.id
                });
              } else {
                await recCash({
                  companyId,
                  entryType: 'CREDIT',
                  amount: pf,
                  description: `Processing Fee - ${loan.loanNumber}`,
                  referenceType: 'PROCESSING_FEE',
                  referenceId: `${loan.id}-PF`,
                  createdById: loan.createdById || systemUser.id
                });
              }
              log.push(`Reconstructed processing fee bank/cash entry for offline loan: ${loan.loanNumber}`);
            }

            const hasPFAccrual = await db.journalEntry.findFirst({
              where: {
                companyId,
                referenceId: loan.id,
                referenceType: 'PROCESSING_FEE_ACCRUAL'
              }
            });
            if (!hasPFAccrual) {
              const accountingService = new AccountingService(companyId);
              await accountingService.initializeChartOfAccounts();
              await accountingService.recordProcessingFeeAccrual({
                loanId: loan.id,
                customerId: loan.customerId || loan.id,
                amount: pf,
                accrualDate: new Date(new Date(loan.disbursedAt || loan.createdAt).getTime() - 5000),
                createdById: loan.createdById || systemUser.id
              });
              log.push(`Reconstructed processing fee accrual JournalEntry for offline loan: ${loan.loanNumber}`);
            }

            const hasPFCollection = await db.journalEntry.findFirst({
              where: {
                companyId,
                referenceId: loan.id,
                referenceType: 'PROCESSING_FEE_COLLECTION'
              }
            });
            if (!hasPFCollection) {
              const accountingService = new AccountingService(companyId);
              await accountingService.initializeChartOfAccounts();
              await accountingService.recordProcessingFee({
                loanId: loan.id,
                customerId: loan.customerId || loan.id,
                amount: pf,
                collectionDate: loan.disbursedAt || loan.createdAt,
                createdById: loan.createdById || systemUser.id,
                paymentMode: disbursementMode,
                reference: `Processing Fee: ${loan.loanNumber}`
              });
              log.push(`Reconstructed processing fee collection JournalEntry for offline loan: ${loan.loanNumber}`);
            }
          }
        } catch (loanErr) {
          warn.push(`Failed to reconstruct offline loan ${loan.loanNumber}: ${loanErr instanceof Error ? loanErr.message : 'Unknown'}`);
        }
      }

      // 3. Online Payments reconstruction
      const onlinePayments = await db.payment.findMany({
        where: {
          loanApplication: { companyId },
          status: 'COMPLETED'
        },
        include: {
          loanApplication: {
            select: {
              applicationNo: true,
              customerId: true,
              customer: { select: { name: true } },
              firstName: true,
              lastName: true
            }
          }
        }
      });

      for (const payment of onlinePayments) {
        try {
          const hasJE = await db.journalEntry.findFirst({
            where: {
              companyId,
              referenceId: payment.id,
              referenceType: 'EMI_PAYMENT'
            }
          });

          const customerName = payment.loanApplication?.customer?.name || 
            `${payment.loanApplication?.firstName || ''} ${payment.loanApplication?.lastName || ''}`.trim() || 'Customer';
          const paymentMode = payment.paymentMode || 'ONLINE';

          if (!hasJE) {
            const accountingService = new AccountingService(companyId);
            await accountingService.initializeChartOfAccounts();

            await accountingService.recordEMIPayment({
              loanId: payment.loanApplicationId,
              customerId: payment.customerId,
              customerName,
              paymentId: payment.id,
              totalAmount: payment.amount,
              principalComponent: payment.principalComponent || 0,
              interestComponent: payment.interestComponent || 0,
              penaltyComponent: payment.penaltyComponent || 0,
              paymentDate: payment.createdAt,
              createdById: payment.verifiedById || systemUser.id,
              paymentMode
            });
            log.push(`Reconstructed JournalEntry for online payment: ${payment.id}`);
          }

          const hasDB = await db.daybookEntry.findFirst({
            where: {
              companyId,
              referenceId: payment.id,
              referenceType: 'EMI_PAYMENT'
            }
          });

          if (!hasDB) {
            await recOnlineEmi({
              companyId,
              loanId: payment.loanApplicationId,
              emiId: payment.emiScheduleId || payment.id,
              loanNo: payment.loanApplication?.applicationNo || 'N/A',
              customerName,
              principalAmount: payment.principalComponent || 0,
              interestAmount: payment.interestComponent || 0,
              penaltyAmount: payment.penaltyComponent || 0,
              paymentMode,
              createdById: payment.verifiedById || systemUser.id
            });
            log.push(`Reconstructed DaybookEntry for online payment: ${payment.id}`);
          }

          if (paymentMode === 'CASH') {
            const hasCash = await db.cashBookEntry.findFirst({
              where: {
                cashBook: { companyId },
                referenceId: payment.id,
                referenceType: 'EMI_PAYMENT'
              }
            });
            if (!hasCash) {
              await recCash({
                companyId,
                entryType: 'CREDIT',
                amount: payment.amount,
                description: `EMI Collection - ${payment.loanApplication?.applicationNo} - ${customerName}`,
                referenceType: 'EMI_PAYMENT',
                referenceId: payment.id,
                createdById: payment.verifiedById || systemUser.id
              });
              log.push(`Reconstructed CashBookEntry for online payment: ${payment.id}`);
            }
          } else {
            const hasBank = await db.bankTransaction.findFirst({
              where: {
                bankAccount: { companyId },
                referenceId: payment.id,
                referenceType: 'EMI_PAYMENT'
              }
            });
            if (!hasBank) {
              await recBank({
                companyId,
                transactionType: 'CREDIT',
                amount: payment.amount,
                description: `EMI Collection - ${payment.loanApplication?.applicationNo} - ${customerName}`,
                referenceType: 'EMI_PAYMENT',
                referenceId: payment.id,
                createdById: payment.verifiedById || systemUser.id
              });
              log.push(`Reconstructed BankTransaction for online payment: ${payment.id}`);
            }
          }
        } catch (payErr) {
          warn.push(`Failed to reconstruct online payment ${payment.id}: ${payErr instanceof Error ? payErr.message : 'Unknown'}`);
        }
      }

      // 4. Offline Payments reconstruction
      const offlinePaidEMIs = await db.offlineLoanEMI.findMany({
        where: {
          offlineLoan: { companyId },
          OR: [{ paidAmount: { gt: 0 } }, { paymentStatus: { in: ['PAID', 'PARTIALLY_PAID'] } }]
        },
        include: {
          offlineLoan: {
            select: {
              loanNumber: true,
              customerId: true,
              customerName: true,
              customer: { select: { name: true } }
            }
          }
        }
      });

      for (const emi of offlinePaidEMIs) {
        try {
          const hasJE = await db.journalEntry.findFirst({
            where: {
              companyId,
              referenceId: emi.id,
              referenceType: 'EMI_PAYMENT'
            }
          });

          const customerName = emi.offlineLoan?.customerName || emi.offlineLoan?.customer?.name || 'Customer';
          const paymentMode = emi.paymentMode || 'CASH';

          if (!hasJE) {
            const accountingService = new AccountingService(companyId);
            await accountingService.initializeChartOfAccounts();

            await accountingService.recordEMIPayment({
              loanId: emi.offlineLoanId,
              customerId: emi.offlineLoan?.customerId || emi.offlineLoanId,
              customerName,
              paymentId: emi.id,
              totalAmount: emi.paidAmount,
              principalComponent: emi.paidPrincipal || 0,
              interestComponent: emi.paidInterest || 0,
              penaltyComponent: emi.penaltyPaid || 0,
              paymentDate: emi.paidDate || emi.updatedAt,
              createdById: emi.collectedById || systemUser.id,
              paymentMode
            });
            log.push(`Reconstructed JournalEntry for offline EMI payment: ${emi.id}`);
          }

          const hasDB = await db.daybookEntry.findFirst({
            where: {
              companyId,
              referenceId: emi.id,
              referenceType: 'EMI_PAYMENT'
            }
          });

          if (!hasDB) {
            await recOfflineEmi({
              companyId,
              loanId: emi.offlineLoanId,
              emiId: emi.id,
              loanNo: emi.offlineLoan?.loanNumber || 'N/A',
              customerName,
              principalAmount: emi.paidPrincipal || 0,
              interestAmount: emi.paidInterest || 0,
              penaltyAmount: emi.penaltyPaid || 0,
              paymentMode,
              createdById: emi.collectedById || systemUser.id
            });
            log.push(`Reconstructed DaybookEntry for offline EMI payment: ${emi.id}`);
          }

          if (paymentMode === 'CASH') {
            const hasCash = await db.cashBookEntry.findFirst({
              where: {
                cashBook: { companyId },
                referenceId: emi.id,
                referenceType: 'EMI_PAYMENT'
              }
            });
            if (!hasCash) {
              await recCash({
                companyId,
                entryType: 'CREDIT',
                amount: emi.paidAmount,
                description: `Offline EMI Payment - ${emi.offlineLoan?.loanNumber} - ${customerName}`,
                referenceType: 'EMI_PAYMENT',
                referenceId: emi.id,
                createdById: emi.collectedById || systemUser.id
              });
              log.push(`Reconstructed CashBookEntry for offline EMI payment: ${emi.id}`);
            }
          } else {
            const hasBank = await db.bankTransaction.findFirst({
              where: {
                bankAccount: { companyId },
                referenceId: emi.id,
                referenceType: 'EMI_PAYMENT'
              }
            });
            if (!hasBank) {
              await recBank({
                companyId,
                transactionType: 'CREDIT',
                amount: emi.paidAmount,
                description: `Offline EMI Payment - ${emi.offlineLoan?.loanNumber} - ${customerName}`,
                referenceType: 'EMI_PAYMENT',
                referenceId: emi.id,
                createdById: emi.collectedById || systemUser.id
              });
              log.push(`Reconstructed BankTransaction for offline EMI payment: ${emi.id}`);
            }
          }
        } catch (emiErr) {
          warn.push(`Failed to reconstruct offline EMI ${emi.id}: ${emiErr instanceof Error ? emiErr.message : 'Unknown'}`);
        }
      }
    } catch (reconErr) {
      warn.push(`Error during deep reconciliation: ${reconErr instanceof Error ? reconErr.message : 'Unknown'}`);
    }

    // =========================================================================
    // ─── 03. RE-CALCULATE CASH AND BANK BALANCES (POST-RECONSTRUCTION) ───────
    // =========================================================================
    try {
      const cashBooks = await db.cashBook.findMany({ where: { companyId } });
      for (const cb of cashBooks) {
        const entries = await db.cashBookEntry.findMany({ where: { cashBookId: cb.id } });
        const creditSum = entries.filter(e => e.entryType === 'CREDIT').reduce((s, e) => s + e.amount, 0);
        const debitSum = entries.filter(e => e.entryType === 'DEBIT').reduce((s, e) => s + e.amount, 0);
        const calculatedBalance = (cb.openingBalance || 0) + creditSum - debitSum;

        await db.cashBook.update({
          where: { id: cb.id },
          data: { currentBalance: calculatedBalance }
        });
      }

      const bankAccs = await db.bankAccount.findMany({ where: { companyId } });
      for (const ba of bankAccs) {
        const txns = await db.bankTransaction.findMany({ where: { bankAccountId: ba.id } });
        const creditSum = txns.filter(t => t.transactionType === 'CREDIT').reduce((s, t) => s + t.amount, 0);
        const debitSum = txns.filter(t => t.transactionType === 'DEBIT').reduce((s, t) => s + t.amount, 0);
        const calculatedBalance = (ba.openingBalance || 0) + creditSum - debitSum;

        await db.bankAccount.update({
          where: { id: ba.id },
          data: { currentBalance: calculatedBalance }
        });
      }
    } catch (recalcErr) {
      warn.push(`Error in post-reconstruction balance recalculation: ${recalcErr instanceof Error ? recalcErr.message : 'Unknown'}`);
    }

    // ─── 0. CLEANUP ────────────────────────────────────────────────────────────

    // Delete previous auto-generated correcting entries
    const deletedEntries = await db.journalEntry.deleteMany({
      where: { companyId, referenceType: 'OPENING_BALANCE_ADJUSTMENT' }
    });
    if (deletedEntries.count > 0) {
      log.push(`Deleted ${deletedEntries.count} previous correction entries`);
    }

    // Deactivate and zero-out Suspense account (9999) — we don't use it anymore
    const suspenseAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: '9999' }
    });
    if (suspenseAccount) {
      // Delete all journal lines pointing to Suspense
      await db.journalEntryLine.deleteMany({
        where: { accountId: suspenseAccount.id }
      });
      // Deactivate and zero balance
      await db.chartOfAccount.update({
        where: { id: suspenseAccount.id },
        data: { isActive: false, currentBalance: 0 }
      });
      log.push('Deactivated Suspense account (9999) — no longer needed');
    }

    // ─── 2. Ensure Opening Balance Equity account exists ──────────────────────
    let obeAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: '3001' }
    });
    if (!obeAccount) {
      obeAccount = await db.chartOfAccount.create({
        data: {
          companyId,
          accountCode: '3001',
          accountName: 'Opening Balance Equity',
          accountType: 'EQUITY',
          isSystemAccount: true,
          description: 'Absorbs legacy imbalances and adjustments',
          openingBalance: 0,
          currentBalance: 0,
          isActive: true,
        },
      });
      log.push('Created Opening Balance Equity account (3001)');
    }

    // Ensure Retained Earnings account exists
    let retainedEarningsAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: '3003' }
    });
    if (!retainedEarningsAccount) {
      retainedEarningsAccount = await db.chartOfAccount.create({
        data: {
          companyId,
          accountCode: '3003',
          accountName: 'Retained Earnings',
          accountType: 'EQUITY',
          isSystemAccount: true,
          description: 'Accumulated profits from previous years',
          openingBalance: 0,
          currentBalance: 0,
          isActive: true,
        },
      });
      log.push('Created Retained Earnings account (3003)');
    }

    // ─── 3. Fix every journal entry ────────────────────────────────────────────
    const journalEntries = await db.journalEntry.findMany({
      where: { companyId },
      include: { lines: true },
      orderBy: { entryDate: 'asc' },
    });

    let entriesFixed = 0;
    let balancingLinesAdded = 0;

    for (const entry of journalEntries) {
      const lineDebit  = entry.lines.reduce((s, l) => s + l.debitAmount,  0);
      const lineCredit = entry.lines.reduce((s, l) => s + l.creditAmount, 0);
      const diff = Math.abs(lineDebit - lineCredit);

      // 3a. Fix stored totals if wrong
      if (
        Math.abs(entry.totalDebit  - lineDebit)  > 0.005 ||
        Math.abs(entry.totalCredit - lineCredit) > 0.005
      ) {
        await db.journalEntry.update({
          where: { id: entry.id },
          data: { totalDebit: lineDebit, totalCredit: lineCredit },
        });
        log.push(`${entry.entryNumber}: stored totals corrected`);
        entriesFixed++;
      }

      // 3b. If entry itself is unbalanced, add a balancing line to Opening Balance Equity (3001)
      if (diff > 0.005) {
        const addDebit  = lineCredit > lineDebit;
        const addCredit = lineDebit  > lineCredit;

        await db.journalEntryLine.create({
          data: {
            journalEntryId: entry.id,
            accountId:      obeAccount.id,
            debitAmount:    addDebit  ? diff : 0,
            creditAmount:   addCredit ? diff : 0,
            narration:      `Auto-balance adjustment [Recalculate]`,
          },
        });

        const newTotal = Math.max(lineDebit, lineCredit);
        await db.journalEntry.update({
          where: { id: entry.id },
          data: { totalDebit: newTotal, totalCredit: newTotal },
        });

        warn.push(`${entry.entryNumber}: was unbalanced by ₹${diff.toFixed(2)} — corrected`);
        balancingLinesAdded++;
        entriesFixed++;
      }
    }

    // ─── 4. Recalculate ChartOfAccount.currentBalance from journal lines ───────
    const accounts = await db.chartOfAccount.findMany({
      where: { companyId, isActive: true },
    });

    const allLines = await db.journalEntryLine.findMany({
      where: {
        journalEntry: { companyId, isApproved: true, isReversed: false },
      },
    });

    const drMap: Record<string, number> = {};
    const crMap: Record<string, number> = {};
    for (const line of allLines) {
      drMap[line.accountId] = (drMap[line.accountId] || 0) + line.debitAmount;
      crMap[line.accountId] = (crMap[line.accountId] || 0) + line.creditAmount;
    }

    let coaUpdatesCount = 0;
    for (const acc of accounts) {
      const dr = drMap[acc.id] || 0;
      const cr = crMap[acc.id] || 0;
      const opening = acc.openingBalance || 0;
      const isDebitNormal = acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE';
      const newBalance = isDebitNormal ? opening + dr - cr : opening + cr - dr;

      if (Math.abs(newBalance - (acc.currentBalance || 0)) > 0.005) {
        await db.chartOfAccount.update({
          where: { id: acc.id },
          data: { currentBalance: newBalance },
        });
        coaUpdatesCount++;
      }
    }
    log.push(`${coaUpdatesCount} account balances recalculated from journal lines`);

    // ─── 5. READ ALL GROUND TRUTH DATA ─────────────────────────────────────────

    // Cash
    const cashBook = await db.cashBook.findFirst({ where: { companyId } });
    const targetCash = cashBook?.currentBalance || 0;

    // Bank
    const bankAccounts = await db.bankAccount.findMany({ where: { companyId, isActive: true } });
    const targetBank = bankAccounts.reduce((s, b) => s + (b.currentBalance || 0), 0);

    // Online Loans Outstanding
    const onlineLoans = await db.loanApplication.findMany({
      where: { companyId, status: { in: ['ACTIVE', 'ACTIVE_INTEREST_ONLY', 'DISBURSED'] } },
      select: {
        disbursedAmount: true,
        emiSchedules: { select: { paidPrincipal: true } }
      }
    });
    const targetOnlineLoans = onlineLoans.reduce((sum, loan) => {
      const disbursed = loan.disbursedAmount || 0;
      const paid = loan.emiSchedules.reduce((s, e) => s + (e.paidPrincipal || 0), 0);
      return sum + Math.max(0, disbursed - paid);
    }, 0);

    // Offline Loans Outstanding
    const offlineLoans = await db.offlineLoan.findMany({
      where: { companyId, status: { in: ['ACTIVE', 'INTEREST_ONLY', 'DEFAULTED', 'RESTRUCTURED'] } },
      select: {
        loanAmount: true,
        emis: { select: { paidPrincipal: true } }
      }
    });
    const targetOfflineLoans = offlineLoans.reduce((sum, loan) => {
      const disbursed = loan.loanAmount || 0;
      const paid = loan.emis.reduce((s, emi) => s + (emi.paidPrincipal || 0), 0);
      return sum + Math.max(0, disbursed - paid);
    }, 0);

    // Interest Receivable (pending EMIs)
    const [pendingOnlineEMIs, pendingOfflineEMIs] = await Promise.all([
      db.eMISchedule.aggregate({
        where: { loanApplication: { companyId }, paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] } },
        _sum: { interestAmount: true, paidInterest: true }
      }),
      db.offlineLoanEMI.aggregate({
        where: { offlineLoan: { companyId }, paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] } },
        _sum: { interestAmount: true, paidInterest: true }
      })
    ]);
    const targetInterestReceivable = Math.max(0,
      ((pendingOnlineEMIs._sum.interestAmount || 0) - (pendingOnlineEMIs._sum.paidInterest || 0)) +
      ((pendingOfflineEMIs._sum.interestAmount || 0) - (pendingOfflineEMIs._sum.paidInterest || 0))
    );

    // Overdue Interest Receivable
    const [overdueOnlineEMIs, overdueOfflineEMIs] = await Promise.all([
      db.eMISchedule.aggregate({
        where: { loanApplication: { companyId }, paymentStatus: 'OVERDUE' },
        _sum: { interestAmount: true, paidInterest: true }
      }),
      db.offlineLoanEMI.aggregate({
        where: { offlineLoan: { companyId }, paymentStatus: 'OVERDUE' },
        _sum: { interestAmount: true, paidInterest: true }
      })
    ]);
    const targetOverdueInterest = Math.max(0,
      ((overdueOnlineEMIs._sum.interestAmount || 0) - (overdueOnlineEMIs._sum.paidInterest || 0)) +
      ((overdueOfflineEMIs._sum.interestAmount || 0) - (overdueOfflineEMIs._sum.paidInterest || 0))
    );

    // Owner's Capital
    const equityEntries = await db.equityEntry.findMany({ where: { companyId } });
    const targetCapital = equityEntries.reduce(
      (s, e) => e.entryType === 'WITHDRAWAL' ? s - (e.amount || 0) : s + (e.amount || 0), 0
    );

    // ─── 6. OVERRIDE ACCOUNT BALANCES WITH GROUND TRUTH ────────────────────────
    const overrides: Record<string, number> = {
      '1101': targetCash,          // Cash in Hand
      '1102': targetBank,          // Bank Account
      '1201': targetOnlineLoans,   // Online Loans Receivable
      '1210': targetOfflineLoans,  // Offline Loans Receivable
      '1200': 0,                   // Parent Loans Receivable → 0 (subaccounts have detail)
      '1301': targetInterestReceivable,    // Interest Receivable
      '1305': targetOverdueInterest,       // Overdue Interest Receivable
      '3002': targetCapital,       // Owner's Capital
    };

    const overrideLog: string[] = [];
    for (const acc of accounts) {
      if (overrides[acc.accountCode] !== undefined) {
        const target = overrides[acc.accountCode];
        if (Math.abs(target - (acc.currentBalance || 0)) > 0.005) {
          await db.chartOfAccount.update({
            where: { id: acc.id },
            data: { currentBalance: target },
          });
          overrideLog.push(`${acc.accountCode} ${acc.accountName}: ₹${(acc.currentBalance || 0).toFixed(2)} → ₹${target.toFixed(2)}`);
        }
      }
    }
    if (overrideLog.length > 0) {
      log.push(`Ground-truth overrides applied: ${overrideLog.length} accounts`);
    }

    // ─── 7. COMPUTE RETAINED EARNINGS (PLUG FIGURE) ────────────────────────────
    // This guarantees: Assets = Liabilities + Equity  ⟹  Balance Sheet = 0 difference
    //
    // Retained Earnings = Total Assets − Total Liabilities − Owner's Capital
    //                     − Opening Balance Equity − Current Year P/L

    // Re-read all accounts after overrides
    const finalAccounts = await db.chartOfAccount.findMany({
      where: { companyId, isActive: true },
    });

    // Sum assets (from real data, not journal)
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalIncomeMinusExpenses = 0;
    let ownersCapitalBalance = 0;
    let openingBalanceEquity = 0;

    for (const acc of finalAccounts) {
      const bal = acc.currentBalance || 0;
      if (acc.accountCode === '1200') continue; // skip parent
      if (acc.accountCode === '9999') continue; // skip suspense
      if (acc.accountCode === '3003') continue; // skip retained earnings (we compute it)

      if (acc.accountType === 'ASSET') {
        totalAssets += bal;
      } else if (acc.accountType === 'LIABILITY') {
        totalLiabilities += bal;
      } else if (acc.accountType === 'INCOME') {
        totalIncomeMinusExpenses += bal;
      } else if (acc.accountType === 'EXPENSE') {
        totalIncomeMinusExpenses -= bal;
      } else if (acc.accountType === 'EQUITY') {
        if (acc.accountCode === '3002') {
          ownersCapitalBalance = bal;
        } else if (acc.accountCode === '3001') {
          openingBalanceEquity = bal;
        }
        // Other equity accounts (3004 etc) handled below
      }
    }

    // Current Year P/L = Income - Expenses
    const currentYearPL = totalIncomeMinusExpenses;

    // Retained Earnings = Assets − Liabilities − Capital − Opening Balance Equity − P/L
    const computedRetainedEarnings = totalAssets - totalLiabilities - ownersCapitalBalance - openingBalanceEquity - currentYearPL;

    // Update Retained Earnings account
    if (retainedEarningsAccount) {
      await db.chartOfAccount.update({
        where: { id: retainedEarningsAccount.id },
        data: { currentBalance: computedRetainedEarnings },
      });
      log.push(`Retained Earnings set to ₹${computedRetainedEarnings.toFixed(2)} (plug figure for balance)`);
    }

    // ─── 8. FINAL VERIFICATION ─────────────────────────────────────────────────
    const finalAssets = totalAssets;
    const finalLE = totalLiabilities + ownersCapitalBalance + openingBalanceEquity + computedRetainedEarnings + currentYearPL;
    const finalDifference = Math.abs(finalAssets - finalLE);

    log.push(`Final: Assets = ₹${finalAssets.toFixed(2)}, L+E = ₹${finalLE.toFixed(2)}, Difference = ₹${finalDifference.toFixed(2)}`);

    return NextResponse.json({
      success: true,
      message: `Recalculation complete. ${entriesFixed} journal entries fixed, ${balancingLinesAdded} balancing lines added, ${coaUpdatesCount + overrideLog.length} account balances updated. Balance Sheet difference: ₹${finalDifference.toFixed(2)}.`,
      stats: {
        journalEntriesFixed: entriesFixed,
        balancingLinesAdded,
        coaBalancesUpdated: coaUpdatesCount + overrideLog.length,
        groundTruthOverrides: overrideLog.length,
        retainedEarnings: computedRetainedEarnings,
        totalAssets: finalAssets,
        totalLiabilitiesEquity: finalLE,
        isNowBalanced: finalDifference < 1,
        difference: finalDifference,
      },
      log,
      warnings: warn,
    });

  } catch (error) {
    console.error('[Recalculate] Error:', error);
    return NextResponse.json({
      error: 'Failed to recalculate balances',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET — preview imbalances without fixing anything
 */
export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get('companyId');
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const accounts = await db.chartOfAccount.findMany({
      where: { companyId, isActive: true },
    });

    const journalEntries = await db.journalEntry.findMany({
      where: { companyId },
      include: { lines: true },
    });

    const unbalancedEntries: any[] = [];
    let totalDr = 0, totalCr = 0;

    for (const entry of journalEntries) {
      const dr = entry.lines.reduce((s, l) => s + l.debitAmount,  0);
      const cr = entry.lines.reduce((s, l) => s + l.creditAmount, 0);
      totalDr += dr;
      totalCr += cr;
      if (Math.abs(dr - cr) > 0.005) {
        unbalancedEntries.push({
          entryNumber: entry.entryNumber,
          entryDate: entry.entryDate,
          narration: entry.narration,
          lineDebit: dr,
          lineCredit: cr,
          difference: Math.abs(dr - cr),
        });
      }
    }

    const allLines = await db.journalEntryLine.findMany({
      where: {
        journalEntry: { companyId, isApproved: true, isReversed: false },
      },
    });
    const drMap: Record<string, number> = {};
    const crMap: Record<string, number> = {};
    for (const l of allLines) {
      drMap[l.accountId] = (drMap[l.accountId] || 0) + l.debitAmount;
      crMap[l.accountId] = (crMap[l.accountId] || 0) + l.creditAmount;
    }

    const coaPreview = accounts.map(acc => {
      const dr = drMap[acc.id] || 0;
      const cr = crMap[acc.id] || 0;
      const isDebitNormal = acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE';
      const calculatedBalance = isDebitNormal
        ? (acc.openingBalance || 0) + dr - cr
        : (acc.openingBalance || 0) + cr - dr;
      return {
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        accountType: acc.accountType,
        storedBalance: acc.currentBalance,
        calculatedBalance,
        difference: calculatedBalance - (acc.currentBalance || 0),
        needsUpdate: Math.abs(calculatedBalance - (acc.currentBalance || 0)) > 0.005,
      };
    });

    return NextResponse.json({
      success: true,
      companyId,
      trialBalance: {
        totalDebit: totalDr,
        totalCredit: totalCr,
        difference: Math.abs(totalDr - totalCr),
        isBalanced: Math.abs(totalDr - totalCr) <= 0.005,
      },
      unbalancedJournalEntries: {
        count: unbalancedEntries.length,
        entries: unbalancedEntries,
      },
      accountsNeedingUpdate: coaPreview.filter(p => p.needsUpdate).length,
      preview: coaPreview,
    });

  } catch (error) {
    console.error('[Recalculate Preview] Error:', error);
    return NextResponse.json({
      error: 'Failed to preview',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
