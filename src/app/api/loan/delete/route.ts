import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// ============================================================
// ONLINE-ONLY: Reverse bank / cashbook running balances BEFORE
// deleting the disbursement entries for an online loan.
// This prevents balance drift when a loan is deleted.
// OFFLINE loans are never passed through this function.
// ============================================================
async function reverseOnlineLoanDisbursementBalances(loanId: string, companyId: string | null | undefined): Promise<void> {
  if (!companyId) return;

  const disbursementRefTypes = ['LOAN_DISBURSEMENT', 'MIRROR_LOAN_DISBURSEMENT'] as string[];
  const processingFeeRefTypes = ['PROCESSING_FEE', 'PROCESSING_FEE_COLLECTION'] as string[];

  // 1. Bank DEBIT → disbursement went OUT → add back
  try {
    const bankDebits = await db.bankTransaction.findMany({
      where: { referenceId: loanId, referenceType: { in: disbursementRefTypes }, transactionType: 'DEBIT' },
      select: { bankAccountId: true, amount: true }
    });
    for (const txn of bankDebits) {
      await db.bankAccount.update({
        where: { id: txn.bankAccountId },
        data: { currentBalance: { increment: Number(txn.amount) } }
      }).catch(e => console.error(`[DELETE LOAN] Bank DEBIT restore failed (${txn.bankAccountId}):`, e));
      console.log(`[DELETE LOAN] ✅ Restored ₹${txn.amount} to bank acct ${txn.bankAccountId} (disburse)`);
    }
  } catch (e) { console.error('[DELETE LOAN] Error reversing bank DEBIT balances:', e); }

  // 2. Bank CREDIT → processing fee came IN → subtract back
  try {
    const bankCredits = await db.bankTransaction.findMany({
      where: { referenceId: { in: [loanId, `${loanId}-PF`] }, referenceType: { in: processingFeeRefTypes }, transactionType: 'CREDIT' },
      select: { bankAccountId: true, amount: true }
    });
    for (const txn of bankCredits) {
      await db.bankAccount.update({
        where: { id: txn.bankAccountId },
        data: { currentBalance: { decrement: Number(txn.amount) } }
      }).catch(e => console.error(`[DELETE LOAN] Bank CREDIT reverse failed (${txn.bankAccountId}):`, e));
      console.log(`[DELETE LOAN] ✅ Reversed ₹${txn.amount} from bank acct ${txn.bankAccountId} (proc fee)`);
    }
  } catch (e) { console.error('[DELETE LOAN] Error reversing bank CREDIT balances:', e); }

  // 3. CashBook DEBIT → disbursement went OUT → add back
  try {
    const cashDebits = await db.cashBookEntry.findMany({
      where: { referenceId: loanId, referenceType: { in: disbursementRefTypes }, entryType: 'DEBIT' },
      select: { cashBookId: true, amount: true }
    });
    for (const entry of cashDebits) {
      await db.cashBook.update({
        where: { id: entry.cashBookId },
        data: { currentBalance: { increment: Number(entry.amount) }, lastUpdatedAt: new Date() }
      }).catch(e => console.error(`[DELETE LOAN] CashBook DEBIT restore failed (${entry.cashBookId}):`, e));
      console.log(`[DELETE LOAN] ✅ Restored ₹${entry.amount} to cashbook ${entry.cashBookId} (disburse)`);
    }
  } catch (e) { console.error('[DELETE LOAN] Error reversing cashbook DEBIT balances:', e); }

  // 4. CashBook CREDIT → processing fee came IN → subtract back
  try {
    const cashCredits = await db.cashBookEntry.findMany({
      where: { referenceId: { in: [loanId, `${loanId}-PF`] }, referenceType: { in: processingFeeRefTypes }, entryType: 'CREDIT' },
      select: { cashBookId: true, amount: true }
    });
    for (const entry of cashCredits) {
      await db.cashBook.update({
        where: { id: entry.cashBookId },
        data: { currentBalance: { decrement: Number(entry.amount) }, lastUpdatedAt: new Date() }
      }).catch(e => console.error(`[DELETE LOAN] CashBook CREDIT reverse failed (${entry.cashBookId}):`, e));
      console.log(`[DELETE LOAN] ✅ Reversed ₹${entry.amount} from cashbook ${entry.cashBookId} (proc fee)`);
    }
  } catch (e) { console.error('[DELETE LOAN] Error reversing cashbook CREDIT balances:', e); }
}

// Helper function to delete all related records for a loan
async function deleteAllLoanRelatedRecords(loanId: string) {
  console.log(`[DELETE LOAN] Deleting all related records for loan: ${loanId}`);

  // ==========================================
  // DELETE ACCOUNTING ENTRIES FIRST
  // ==========================================
  // CashBook entries with reference to this loan
  const accountingReferenceTypes = [
    'EMI_PAYMENT_PERSONAL',
    'EMI_PAYMENT_ONLINE', 
    'EMI_PAYMENT_CASH',
    'MIRROR_EMI_PAYMENT',
    'EXTRA_EMI_PAYMENT',
    'LOAN_DISBURSEMENT',
    'MIRROR_LOAN_DISBURSEMENT',
    'PROCESSING_FEE',
    'PROCESSING_FEE_COLLECTION',
    'EMI_PAYMENT',
    'OFFLINE_LOAN',
    'OFFLINE_EMI'
  ];

  // Delete CashBook entries
  try {
    const deletedCashEntries = await db.cashBookEntry.deleteMany({
      where: {
        referenceId: loanId,
        referenceType: { in: accountingReferenceTypes }
      }
    });
    console.log(`[DELETE LOAN] Deleted ${deletedCashEntries.count} CashBook entries`);
  } catch (e) {
    console.error('[DELETE LOAN] Error deleting CashBook entries:', e);
  }

  // Delete Bank transactions
  try {
    const deletedBankTxns = await db.bankTransaction.deleteMany({
      where: {
        referenceId: loanId,
        referenceType: { in: accountingReferenceTypes }
      }
    });
    console.log(`[DELETE LOAN] Deleted ${deletedBankTxns.count} Bank transactions`);
  } catch (e) {
    console.error('[DELETE LOAN] Error deleting Bank transactions:', e);
  }

  // Also delete accounting entries for all EMIs of this loan
  // Get all EMI IDs first
  try {
    const emiSchedules = await db.eMISchedule.findMany({
      where: { loanApplicationId: loanId },
      select: { id: true }
    });
    const emiIds = emiSchedules.map(e => e.id);

    if (emiIds.length > 0) {
      // Delete CashBook entries for EMIs
      await db.cashBookEntry.deleteMany({
        where: {
          referenceId: { in: emiIds },
          referenceType: { in: accountingReferenceTypes }
        }
      }).catch(() => {});

      // Delete Bank transactions for EMIs
      await db.bankTransaction.deleteMany({
        where: {
          referenceId: { in: emiIds },
          referenceType: { in: accountingReferenceTypes }
        }
      }).catch(() => {});
      
      console.log(`[DELETE LOAN] Deleted accounting entries for ${emiIds.length} EMIs`);
    }
  } catch (e) {
    console.error('[DELETE LOAN] Error deleting EMI accounting entries:', e);
  }

  // ==========================================
  // DELETE JOURNAL ENTRIES (double-entry ledger)
  // ==========================================
  // JournalEntry + JournalEntryLine records keyed by loanId must be cleaned
  // so they don't produce ghost rows in the trial balance / Chart of Accounts.
  // We also clean up EMI-keyed journal entries.
  try {
    // Collect EMI IDs again (may have been populated above, but scope is local)
    const emiSchedulesForJE = await db.eMISchedule.findMany({
      where: { loanApplicationId: loanId },
      select: { id: true }
    });
    const emiIdsForJE = emiSchedulesForJE.map(e => e.id);

    const journalRefIds = [loanId, `${loanId}-PF`, `${loanId}-FORECLOSURE`, `${loanId}-FORECLOSURE-JE`, `${loanId}-LOSS-WRITEOFF`, ...emiIdsForJE];

    // Delete JournalEntryLines first (FK child)
    await db.journalEntryLine.deleteMany({
      where: {
        journalEntry: {
          referenceId: { in: journalRefIds }
        }
      }
    }).catch(e => console.error('[DELETE LOAN] Error deleting JournalEntryLines:', e));

    // Delete JournalEntries (parent)
    const deletedJEs = await db.journalEntry.deleteMany({
      where: { referenceId: { in: journalRefIds } }
    });
    console.log(`[DELETE LOAN] Deleted ${deletedJEs.count} JournalEntry rows`);
  } catch (e) {
    console.error('[DELETE LOAN] Error deleting Journal Entries:', e);
  }

  // ==========================================
  // DELETE OTHER RELATED RECORDS
  // ==========================================
  // Delete EMI Reminder Logs
  await db.eMIReminderLog.deleteMany({ where: { loanId: loanId } }).catch(() => {});

  // Delete EMI Payment Settings
  await db.eMIPaymentSetting.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Gold Loan Details
  await db.goldLoanDetail.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Vehicle Loan Details
  await db.vehicleLoanDetail.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Payment Requests
  await db.paymentRequest.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Secondary Payment Pages
  await db.secondaryPaymentPage.deleteMany({ where: { id: loanId } }).catch(() => {});

  // Delete EMI Schedules
  await db.eMISchedule.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Payments
  await db.payment.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Session Form
  await db.sessionForm.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Loan Form
  await db.loanForm.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Workflow Logs
  await db.workflowLog.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Loan Top-ups
  await db.loanTopUp.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Foreclosure Requests
  await db.foreclosureRequest.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete EMI Date Change Requests
  await db.eMIDateChangeRequest.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Counter Offers
  await db.counterOffer.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Document Requests
  await db.documentRequest.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Loan Restructures
  await db.loanRestructure.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete NPA Trackings
  await db.nPATracking.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Fraud Alerts
  await db.fraudAlert.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Appointments
  await db.appointment.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Credit Transactions
  await db.creditTransaction.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Loan Agreement
  await db.loanAgreement.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Application Fingerprint
  await db.applicationFingerprint.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Loan Progress Timeline
  await db.loanProgressTimeline.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Credit Risk Score
  await db.creditRiskScore.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Location Log
  await db.locationLog.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Audit Logs
  await db.auditLog.deleteMany({ where: { loanApplicationId: loanId } }).catch(() => {});

  // Delete Mirror Loan Mappings
  await db.mirrorLoanMapping.deleteMany({
    where: {
      OR: [
        { originalLoanId: loanId },
        { mirrorLoanId: loanId }
      ]
    }
  }).catch(() => {});

  // Delete Pending Mirror Loans (only has originalLoanId field)
  await db.pendingMirrorLoan.deleteMany({
    where: { originalLoanId: loanId }
  }).catch(() => {});

  // Delete Notifications related to this loan (by matching loan ID in data or message)
  await db.notification.deleteMany({ 
    where: { 
      OR: [
        { message: { contains: loanId } },
        { title: { contains: loanId } }
      ]
    } 
  }).catch(() => {});

  console.log(`[DELETE LOAN] All related records deleted for loan: ${loanId}`);
}

// DELETE loan with audit log recording
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    const userId = searchParams.get('userId');
    const reason = searchParams.get('reason') || 'No reason provided';
    const note = searchParams.get('note') || '';
    const loanType = searchParams.get('loanType') || 'ONLINE';

    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    // Get the first super admin for audit logging
    const superAdmin = await db.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true }
    });
    
    const auditUserId = userId || superAdmin?.id;

    if (loanType === 'ONLINE') {
      // Fetch online loan details
      const loanDetails = await db.loanApplication.findUnique({
        where: { id: loanId },
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          company: { select: { id: true, name: true } },
        }
      });

      if (!loanDetails) {
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
      }

      const applicationNo = loanDetails.applicationNo;
      const customerName = loanDetails.customer?.name || 'Unknown';

      try {
        console.log(`[DELETE LOAN] Starting deletion for loan: ${applicationNo}`);

        // ==========================================
        // ONLINE-ONLY: REVERSE BANK / CASHBOOK BALANCES
        // Must happen BEFORE entries are deleted so we can read the amounts.
        // Offline loans are never routed through this branch.
        // ==========================================
        await reverseOnlineLoanDisbursementBalances(loanId, loanDetails.companyId);

        // ==========================================
        // CHECK FOR MIRROR LOAN
        // ==========================================
        let mirrorLoanId: string | null = null;
        let isMirrorLoan = false;
        let originalLoanId: string | null = null;

        // Check if this loan IS a mirror loan
        const mirrorMappingAsMirror = await db.mirrorLoanMapping.findFirst({
          where: { mirrorLoanId: loanId }
        });

        if (mirrorMappingAsMirror) {
          isMirrorLoan = true;
          originalLoanId = mirrorMappingAsMirror.originalLoanId;
          console.log(`[DELETE LOAN] This is a MIRROR loan. Original: ${originalLoanId}`);
        }

        // Check if this loan HAS a mirror loan
        const mirrorMappingAsOriginal = await db.mirrorLoanMapping.findFirst({
          where: { originalLoanId: loanId }
        });

        if (mirrorMappingAsOriginal) {
          mirrorLoanId = mirrorMappingAsOriginal.mirrorLoanId;
          console.log(`[DELETE LOAN] This loan has a MIRROR: ${mirrorLoanId}`);
        }

        // ==========================================
        // DELETE MIRROR LOAN (if this is original)
        // ==========================================
        if (mirrorLoanId) {
          console.log(`[DELETE LOAN] Deleting mirror loan: ${mirrorLoanId}`);

          // ONLINE-ONLY: Reverse mirror company bank/cashbook balances FIRST.
          // The mirror loan was disbursed from the mirror company's account,
          // so we must restore that before wiping its entries.
          const mirrorCompanyForRestore = mirrorMappingAsOriginal?.mirrorCompanyId;
          await reverseOnlineLoanDisbursementBalances(mirrorLoanId, mirrorCompanyForRestore);

          // Delete all related records for mirror loan
          await deleteAllLoanRelatedRecords(mirrorLoanId);
          
          // Delete the mirror loan application
          const mirrorLoanDetails = await db.loanApplication.findUnique({
            where: { id: mirrorLoanId },
            select: { applicationNo: true }
          });
          
          await db.loanApplication.delete({ 
            where: { id: mirrorLoanId } 
          }).catch((e) => console.error('Error deleting mirror loan:', e));
          
          console.log(`[DELETE LOAN] Mirror loan ${mirrorLoanDetails?.applicationNo} deleted`);
        }

        // ==========================================
        // DELETE ORIGINAL LOAN REFERENCE (if this is mirror)
        // ==========================================
        if (isMirrorLoan && originalLoanId) {
          // Just remove the mapping, don't delete the original loan
          console.log(`[DELETE LOAN] Removing mirror loan mapping`);
        }

        // ==========================================
        // DELETE MIRROR LOAN MAPPINGS
        // ==========================================
        await db.mirrorLoanMapping.deleteMany({
          where: { 
            OR: [
              { originalLoanId: loanId },
              { mirrorLoanId: loanId }
            ]
          }
        }).catch(() => {});

        // ==========================================
        // DELETE PENDING MIRROR LOANS (only has originalLoanId field)
        // ==========================================
        await db.pendingMirrorLoan.deleteMany({
          where: { originalLoanId: loanId }
        }).catch(() => {});

        // ==========================================
        // DELETE ALL RELATED RECORDS FOR MAIN LOAN
        // ==========================================
        await deleteAllLoanRelatedRecords(loanId);

        // ==========================================
        // DELETE THE MAIN LOAN APPLICATION
        // ==========================================
        await db.loanApplication.delete({ 
          where: { id: loanId } 
        });

        console.log(`[DELETE LOAN] Loan ${applicationNo} deleted successfully`);

        // ==========================================
        // CREATE AUDIT LOG
        // ==========================================
        if (auditUserId) {
          try {
            await db.auditLog.create({
              data: {
                userId: auditUserId,
                action: 'DELETE',
                module: 'LOAN',
                description: `Loan ${applicationNo} deleted. Reason: ${reason}. Customer: ${customerName}${mirrorLoanId ? `. Mirror loan also deleted.` : ''}${isMirrorLoan ? `. (This was a mirror loan)` : ''}`,
                oldValue: JSON.stringify({
                  applicationNo,
                  status: loanDetails.status,
                  requestedAmount: loanDetails.requestedAmount,
                  customerName,
                  reason,
                  mirrorLoanId,
                  isMirrorLoan
                }),
                newValue: null,
                recordId: loanId,
                recordType: 'LOAN_APPLICATION'
              }
            });
          } catch (e) {
            console.error('Failed to create audit log:', e);
          }
        }

        // ==========================================
        // NOTIFY SUPER ADMINS
        // ==========================================
        try {
          const superAdmins = await db.user.findMany({
            where: { role: 'SUPER_ADMIN', isActive: true },
            select: { id: true }
          });
          const deletedByUser = await db.user.findUnique({ where: { id: auditUserId! }, select: { name: true } }).catch(() => null);
          if (superAdmins.length > 0) {
            await db.notification.createMany({
              data: superAdmins.map((sa: { id: string }) => ({
                userId: sa.id,
                type: 'LOAN_DELETED',
                title: '🗑️ Loan Permanently Deleted',
                message: `Loan ${applicationNo} (Customer: ${customerName}) was permanently deleted by ${deletedByUser?.name || 'Super Admin'}. Reason: ${reason}.${note ? ` Note: ${note}` : ''}${mirrorLoanId ? ' Mirror loan also deleted.' : ''}`,
                isRead: false,
                priority: 'HIGH',
              }))
            });
          }
        } catch(e) { console.error('[DELETE LOAN] SA notification error:', e); }

        return NextResponse.json({ 
          success: true, 
          message: `Loan ${applicationNo} deleted successfully${mirrorLoanId ? ' along with mirror loan' : ''}`
        });

      } catch (deleteError) {
        console.error('Error during deletion:', deleteError);
        
        const errorMessage = deleteError instanceof Error ? deleteError.message : 'Unknown error';
        
        return NextResponse.json({ 
          error: 'Failed to delete loan - foreign key constraint',
          details: errorMessage,
          hint: 'There may be additional related records that need to be removed first'
        }, { status: 500 });
      }

    } else {
      // OFFLINE loan deletion
      const loanDetails = await db.offlineLoan.findUnique({
        where: { id: loanId }
      });

      if (!loanDetails) {
        return NextResponse.json({ error: 'Offline loan not found' }, { status: 404 });
      }

      // Delete offline loan EMIs first
      await db.offlineLoanEMI.deleteMany({ 
        where: { offlineLoanId: loanId } 
      }).catch(() => {});

      // Delete the offline loan
      await db.offlineLoan.delete({ 
        where: { id: loanId } 
      });

      // Revert global sequence number if it was the last generated sequence
      const seqMatch = loanDetails.loanNumber.match(/-(\d+)$/);
      if (seqMatch) {
        const loanSeq = parseInt(seqMatch[1], 10);
        const seqRecord = await db.loanSequence.findFirst();
        if (seqRecord && seqRecord.currentSequence === loanSeq) {
          await db.loanSequence.update({
            where: { id: seqRecord.id },
            data: { currentSequence: { decrement: 1 } }
          });
          console.log(`[DELETE OFFLINE LOAN] Reverted global loan sequence to ${seqRecord.currentSequence - 1} because loan ${loanDetails.loanNumber} (sequence: ${loanSeq}) was deleted`);
        }
      }

      // Create audit log
      if (auditUserId) {
        try {
          await db.auditLog.create({
            data: {
              userId: auditUserId,
              action: 'DELETE',
              module: 'OFFLINE_LOAN',
              description: `Offline Loan ${loanDetails.loanNumber} deleted. Reason: ${reason}`,
              oldValue: JSON.stringify({
                loanNumber: loanDetails.loanNumber,
                status: loanDetails.status,
                loanAmount: loanDetails.loanAmount,
                customerName: loanDetails.customerName,
                reason
              }),
              newValue: null,
              recordId: loanId,
              recordType: 'OFFLINE_LOAN'
            }
          });
        } catch (e) {
          console.error('Failed to create audit log:', e);
        }
      }

      // Notify Super Admins
      try {
        const superAdmins = await db.user.findMany({
          where: { role: 'SUPER_ADMIN', isActive: true },
          select: { id: true }
        });
        const deletedByUser = auditUserId ? await db.user.findUnique({ where: { id: auditUserId }, select: { name: true } }).catch(() => null) : null;
        if (superAdmins.length > 0) {
          await db.notification.createMany({
            data: superAdmins.map((sa: { id: string }) => ({
              userId: sa.id,
              type: 'LOAN_DELETED',
              title: '🗑️ Offline Loan Permanently Deleted',
              message: `Offline loan ${loanDetails.loanNumber} (Customer: ${loanDetails.customerName}) was permanently deleted by ${deletedByUser?.name || 'Super Admin'}. Reason: ${reason}.${note ? ` Note: ${note}` : ''}`,
              isRead: false,
              priority: 'HIGH',
            }))
          });
        }
      } catch(e) { console.error('[DELETE LOAN] SA notification error:', e); }

      return NextResponse.json({ 
        success: true, 
        message: `Offline loan ${loanDetails.loanNumber} deleted successfully`
      });
    }

  } catch (error) {
    console.error('Error deleting loan:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isPrismaError = error instanceof Prisma.PrismaClientKnownRequestError;
    
    return NextResponse.json({ 
      error: 'Failed to delete loan',
      details: errorMessage,
      code: isPrismaError ? (error as Prisma.PrismaClientKnownRequestError).code : undefined
    }, { status: 500 });
  }
}
