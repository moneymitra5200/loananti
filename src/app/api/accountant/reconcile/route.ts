import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Comprehensive reconcile API that:
// 1. Scans all loans and EMIs
// 2. Creates missing transactions
// 3. Deletes orphaned transactions (loan doesn't exist)
// 4. Recalculates balances

export async function POST(request: NextRequest) {
  try {
    console.log('[reconcile] Starting comprehensive reconciliation...');
    
    const body = await request.json().catch(() => ({}));
    const { companyId } = body;
    
    // Get system user for createdById
    const systemUser = await db.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true }
    }) || await db.user.findFirst({ select: { id: true } });
    
    if (!systemUser) {
      return NextResponse.json({ error: 'No system user found' }, { status: 500 });
    }
    
    const createdById = systemUser.id;

    const result = {
      created: [] as any[],
      deleted: [] as any[],
      errors: [] as string[],
      summary: {
        loansProcessed: 0,
        transactionsCreated: 0,
        transactionsDeleted: 0,
        bankBalanceAdjustment: 0,
        cashbookBalanceAdjustment: 0
      }
    };

    // Get all companies or specific company
    const companies = companyId 
      ? await db.company.findMany({ where: { id: companyId } })
      : await db.company.findMany();

    for (const company of companies) {
      console.log(`[reconcile] Processing company: ${company.name} (${company.code})`);

      // Get bank accounts for this company
      const bankAccounts = await db.bankAccount.findMany({
        where: { companyId: company.id }
      });

      // Get cashbook for this company
      let cashbook = await db.cashBook.findFirst({
        where: { companyId: company.id }
      });

      if (!cashbook) {
        cashbook = await db.cashBook.create({
          data: {
            companyId: company.id,
            currentBalance: 0
          }
        });
      }

      // ============ ONLINE LOANS ============
      const onlineLoans = await db.loanApplication.findMany({
        where: { 
          companyId: company.id,
          status: { in: ['ACTIVE', 'DISBURSED'] }
        },
        include: {
          customer: { select: { id: true, name: true } },
          emiSchedules: true
        }
      });

      const validOnlineLoanIds = new Set(onlineLoans.map(l => l.id));
      const validOnlineEmiIds = new Set<string>();

      for (const loan of onlineLoans) {
        loan.emiSchedules.forEach(emi => validOnlineEmiIds.add(emi.id));
      }

      // ============ OFFLINE LOANS ============
      const offlineLoans = await db.offlineLoan.findMany({
        where: { 
          companyId: company.id,
          status: 'ACTIVE'
        },
        include: {
          customer: { select: { id: true, name: true } },
          emis: true
        }
      });

      const validOfflineLoanIds = new Set(offlineLoans.map(l => l.id));
      const validOfflineEmiIds = new Set<string>();

      for (const loan of offlineLoans) {
        loan.emis.forEach(emi => validOfflineEmiIds.add(emi.id));
      }

      // ============ DELETE ORPHANED TRANSACTIONS ============
      // Bank transactions with non-existent loan references
      const allBankTxns = await db.bankTransaction.findMany({
        where: {
          bankAccount: { companyId: company.id },
          referenceType: { in: [
            'LOAN_DISBURSEMENT', 'EMI_PAYMENT',
            'OFFLINE_LOAN_DISBURSEMENT', 'OFFLINE_EMI_PAYMENT',
            'MIRROR_LOAN_DISBURSEMENT'
          ]}
        }
      });

      for (const txn of allBankTxns) {
        let isOrphaned = false;
        
        if (txn.referenceType === 'LOAN_DISBURSEMENT' && txn.referenceId && !validOnlineLoanIds.has(txn.referenceId)) {
          isOrphaned = true;
        } else if (txn.referenceType === 'EMI_PAYMENT' && txn.referenceId && !validOnlineEmiIds.has(txn.referenceId)) {
          isOrphaned = true;
        } else if (txn.referenceType === 'OFFLINE_LOAN_DISBURSEMENT' && txn.referenceId && !validOfflineLoanIds.has(txn.referenceId)) {
          isOrphaned = true;
        } else if (txn.referenceType === 'OFFLINE_EMI_PAYMENT' && txn.referenceId && !validOfflineEmiIds.has(txn.referenceId)) {
          isOrphaned = true;
        } else if (txn.referenceType === 'MIRROR_LOAN_DISBURSEMENT' && txn.referenceId) {
          // Check if the mirror loan still exists
          const mirrorLoan = await db.offlineLoan.findUnique({ where: { id: txn.referenceId } });
          if (!mirrorLoan || mirrorLoan.status !== 'ACTIVE') {
            isOrphaned = true;
          }
        }

        if (isOrphaned) {
          console.log(`[reconcile] Deleting orphaned bank transaction: ${txn.id} (${txn.referenceType})`);
          await db.bankTransaction.delete({ where: { id: txn.id } });
          result.deleted.push({
            type: 'BANK',
            id: txn.id,
            referenceType: txn.referenceType,
            amount: txn.amount,
            description: txn.description
          });
          result.summary.transactionsDeleted++;
        }
      }

      // Cashbook entries with non-existent loan references
      const allCashEntries = await db.cashBookEntry.findMany({
        where: {
          cashBookId: cashbook.id,
          referenceType: { in: [
            'LOAN_DISBURSEMENT', 'EMI_PAYMENT',
            'OFFLINE_LOAN_DISBURSEMENT', 'OFFLINE_EMI_PAYMENT',
            'MIRROR_LOAN_DISBURSEMENT'
          ]}
        }
      });

      for (const entry of allCashEntries) {
        let isOrphaned = false;
        
        if (entry.referenceType === 'LOAN_DISBURSEMENT' && entry.referenceId && !validOnlineLoanIds.has(entry.referenceId)) {
          isOrphaned = true;
        } else if (entry.referenceType === 'EMI_PAYMENT' && entry.referenceId && !validOnlineEmiIds.has(entry.referenceId)) {
          isOrphaned = true;
        } else if (entry.referenceType === 'OFFLINE_LOAN_DISBURSEMENT' && entry.referenceId && !validOfflineLoanIds.has(entry.referenceId)) {
          isOrphaned = true;
        } else if (entry.referenceType === 'OFFLINE_EMI_PAYMENT' && entry.referenceId && !validOfflineEmiIds.has(entry.referenceId)) {
          isOrphaned = true;
        } else if (entry.referenceType === 'MIRROR_LOAN_DISBURSEMENT' && entry.referenceId) {
          const mirrorLoan = await db.offlineLoan.findUnique({ where: { id: entry.referenceId } });
          if (!mirrorLoan || mirrorLoan.status !== 'ACTIVE') {
            isOrphaned = true;
          }
        }

        if (isOrphaned) {
          console.log(`[reconcile] Deleting orphaned cashbook entry: ${entry.id} (${entry.referenceType})`);
          await db.cashBookEntry.delete({ where: { id: entry.id } });
          result.deleted.push({
            type: 'CASHBOOK',
            id: entry.id,
            referenceType: entry.referenceType,
            amount: entry.amount,
            description: entry.description
          });
          result.summary.transactionsDeleted++;
        }
      }

      // ============ CREATE MISSING TRANSACTIONS ============
      
      // Process online loans
      for (const loan of onlineLoans) {
        result.summary.loansProcessed++;

        // Check for disbursement transaction
        if (loan.disbursedAmount && loan.disbursedAt) {
          const existingDisbursement = await db.bankTransaction.findFirst({
            where: {
              referenceType: 'LOAN_DISBURSEMENT',
              referenceId: loan.id
            }
          });

          if (!existingDisbursement && bankAccounts.length > 0) {
            const bankAccount = bankAccounts.find(b => b.isDefault) || bankAccounts[0];
            
            await db.bankTransaction.create({
              data: {
                bankAccountId: bankAccount.id,
                transactionType: 'DEBIT',
                amount: loan.disbursedAmount,
                balanceAfter: 0, // Will be recalculated
                description: `Loan Disbursement - ${loan.applicationNo} (${loan.customer?.name || 'Customer'})`,
                referenceType: 'LOAN_DISBURSEMENT',
                referenceId: loan.id,
                createdById: createdById,
                transactionDate: loan.disbursedAt
              }
            });

            result.created.push({
              type: 'DISBURSEMENT',
              loanNo: loan.applicationNo,
              amount: loan.disbursedAmount,
              date: loan.disbursedAt
            });
            result.summary.transactionsCreated++;
          }
        }

        // Check for EMI payments
        for (const emi of loan.emiSchedules) {
          if (emi.paymentStatus === 'PAID' && emi.paidAmount && emi.paidDate) {
            const existingPayment = await db.bankTransaction.findFirst({
              where: {
                referenceType: 'EMI_PAYMENT',
                referenceId: emi.id
              }
            });

            if (!existingPayment && bankAccounts.length > 0) {
              const bankAccount = bankAccounts.find(b => b.isDefault) || bankAccounts[0];
              
              await db.bankTransaction.create({
                data: {
                  bankAccountId: bankAccount.id,
                  transactionType: 'CREDIT',
                  amount: emi.paidAmount,
                  balanceAfter: 0,
                  description: `EMI Payment - ${loan.applicationNo} EMI #${emi.installmentNumber} (${loan.customer?.name || 'Customer'})`,
                  referenceType: 'EMI_PAYMENT',
                  referenceId: emi.id,
                  createdById: createdById,
                  transactionDate: emi.paidDate
                }
              });

              result.created.push({
                type: 'EMI_PAYMENT',
                loanNo: loan.applicationNo,
                emiNo: emi.installmentNumber,
                amount: emi.paidAmount,
                date: emi.paidDate
              });
              result.summary.transactionsCreated++;
            }
          }
        }
      }

      // Process offline loans
      for (const loan of offlineLoans) {
        result.summary.loansProcessed++;

        // Check for disbursement - determine if bank or cash
        const existingBankDisbursement = await db.bankTransaction.findFirst({
          where: {
            referenceType: 'OFFLINE_LOAN_DISBURSEMENT',
            referenceId: loan.id
          }
        });

        const existingCashDisbursement = await db.cashBookEntry.findFirst({
          where: {
            referenceType: 'OFFLINE_LOAN_DISBURSEMENT',
            referenceId: loan.id
          }
        });

        if (!existingBankDisbursement && !existingCashDisbursement && loan.disbursementDate) {
          // Determine based on company type or payment mode
          const isCashBasedCompany = company.code === 'C3';
          
          if (isCashBasedCompany) {
            // Create cashbook entry
            await db.cashBookEntry.create({
              data: {
                cashBookId: cashbook.id,
                entryType: 'DEBIT',
                amount: loan.loanAmount,
                balanceAfter: 0,
                description: `Loan Disbursement - ${loan.loanNumber} (${loan.customerName || 'Customer'})`,
                referenceType: 'OFFLINE_LOAN_DISBURSEMENT',
                referenceId: loan.id,
                createdById: createdById,
                entryDate: loan.disbursementDate
              }
            });
          } else if (bankAccounts.length > 0) {
            // Create bank transaction
            const bankAccount = bankAccounts.find(b => b.isDefault) || bankAccounts[0];
            
            await db.bankTransaction.create({
              data: {
                bankAccountId: bankAccount.id,
                transactionType: 'DEBIT',
                amount: loan.loanAmount,
                balanceAfter: 0,
                description: `Offline Loan Disbursement - ${loan.loanNumber} (${loan.customerName || 'Customer'})`,
                referenceType: 'OFFLINE_LOAN_DISBURSEMENT',
                referenceId: loan.id,
                createdById: createdById,
                transactionDate: loan.disbursementDate
              }
            });
          }

          result.created.push({
            type: 'OFFLINE_DISBURSEMENT',
            loanNo: loan.loanNumber,
            amount: loan.loanAmount,
            date: loan.disbursementDate
          });
          result.summary.transactionsCreated++;
        }

        // Check for EMI payments
        for (const emi of loan.emis) {
          if (emi.paymentStatus === 'PAID' && emi.paidAmount && emi.paidDate) {
            const existingBankPayment = await db.bankTransaction.findFirst({
              where: {
                referenceType: 'OFFLINE_EMI_PAYMENT',
                referenceId: emi.id
              }
            });

            const existingCashPayment = await db.cashBookEntry.findFirst({
              where: {
                referenceType: 'OFFLINE_EMI_PAYMENT',
                referenceId: emi.id
              }
            });

            if (!existingBankPayment && !existingCashPayment) {
              const isCashBasedCompany = company.code === 'C3';
              
              if (isCashBasedCompany) {
                await db.cashBookEntry.create({
                  data: {
                    cashBookId: cashbook.id,
                    entryType: 'CREDIT',
                    amount: emi.paidAmount,
                    balanceAfter: 0,
                    description: `EMI Payment - ${loan.loanNumber} EMI #${emi.installmentNumber} (${loan.customerName || 'Customer'})`,
                    referenceType: 'OFFLINE_EMI_PAYMENT',
                    referenceId: emi.id,
                    createdById: createdById,
                    entryDate: emi.paidDate
                  }
                });
              } else if (bankAccounts.length > 0) {
                const bankAccount = bankAccounts.find(b => b.isDefault) || bankAccounts[0];
                
                await db.bankTransaction.create({
                  data: {
                    bankAccountId: bankAccount.id,
                    transactionType: 'CREDIT',
                    amount: emi.paidAmount,
                    balanceAfter: 0,
                    description: `Offline EMI Payment - ${loan.loanNumber} EMI #${emi.installmentNumber} (${loan.customerName || 'Customer'})`,
                    referenceType: 'OFFLINE_EMI_PAYMENT',
                    referenceId: emi.id,
                    createdById: createdById,
                    transactionDate: emi.paidDate
                  }
                });
              }

              result.created.push({
                type: 'OFFLINE_EMI_PAYMENT',
                loanNo: loan.loanNumber,
                emiNo: emi.installmentNumber,
                amount: emi.paidAmount,
                date: emi.paidDate
              });
              result.summary.transactionsCreated++;
            }
          }
        }
      }

      // ============ RECALCULATE BALANCES ============
      
      // Recalculate bank account balances
      for (const bankAccount of bankAccounts) {
        const transactions = await db.bankTransaction.findMany({
          where: { bankAccountId: bankAccount.id },
          orderBy: { transactionDate: 'asc' }
        });

        let runningBalance = 0;
        for (const txn of transactions) {
          if (txn.transactionType === 'CREDIT') {
            runningBalance += txn.amount;
          } else {
            runningBalance -= txn.amount;
          }
          await db.bankTransaction.update({
            where: { id: txn.id },
            data: { balanceAfter: runningBalance }
          });
        }

        const oldBalance = bankAccount.currentBalance;
        await db.bankAccount.update({
          where: { id: bankAccount.id },
          data: { currentBalance: runningBalance }
        });
        result.summary.bankBalanceAdjustment += (runningBalance - oldBalance);
      }

      // Recalculate cashbook balance
      const cashEntries = await db.cashBookEntry.findMany({
        where: { cashBookId: cashbook.id },
        orderBy: { entryDate: 'asc' }
      });

      let cashRunningBalance = 0;
      for (const entry of cashEntries) {
        if (entry.entryType === 'CREDIT') {
          cashRunningBalance += entry.amount;
        } else {
          cashRunningBalance -= entry.amount;
        }
        await db.cashBookEntry.update({
          where: { id: entry.id },
          data: { balanceAfter: cashRunningBalance }
        });
      }

      const oldCashBalance = cashbook.currentBalance;
      await db.cashBook.update({
        where: { id: cashbook.id },
        data: { currentBalance: cashRunningBalance }
      });
      result.summary.cashbookBalanceAdjustment += (cashRunningBalance - oldCashBalance);
    }

    console.log(`[reconcile] Completed. Created: ${result.summary.transactionsCreated}, Deleted: ${result.summary.transactionsDeleted}`);

    return NextResponse.json({
      success: true,
      message: `Reconciliation completed successfully`,
      ...result
    });

  } catch (error) {
    console.error('Error during reconciliation:', error);
    return NextResponse.json({ 
      error: 'Failed to reconcile transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
