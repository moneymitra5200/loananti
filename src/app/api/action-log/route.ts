import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService } from '@/lib/accounting-service';

async function reverseJournalEntriesForRef(refId: string, userId: string, tx: any) {
  try {
    const originalEntries = await tx.journalEntry.findMany({
      where: {
        OR: [
          { referenceId: refId },
          { referenceId: { startsWith: refId } }
        ]
      },
      include: { lines: { include: { account: true } } }
    });

    console.log(`[Undo Delete] Found ${originalEntries.length} journal entries to delete for refId: ${refId}`);

    for (const originalEntry of originalEntries) {
      const companyId = originalEntry.companyId;
      const accService = new AccountingService(companyId);
      const financialYearId = await accService.getCurrentFinancialYear(tx);

      // Revert ChartOfAccount and LedgerBalances for each line
      for (const line of originalEntry.lines) {
        const account = line.account;
        if (account) {
          let balanceChange = 0;
          if (account.accountType === 'ASSET' || account.accountType === 'EXPENSE') {
            balanceChange = line.debitAmount - line.creditAmount;
          } else {
            balanceChange = line.creditAmount - line.debitAmount;
          }

          // To undo/delete the entry, we subtract the original balanceChange!
          await tx.chartOfAccount.update({
            where: { id: line.accountId },
            data: {
              currentBalance: { decrement: balanceChange }
            },
          });

          // Revert the ledger balance counts
          if (financialYearId) {
            await tx.ledgerBalance.updateMany({
              where: {
                accountId: line.accountId,
                financialYearId,
              },
              data: {
                totalDebits: { decrement: line.debitAmount },
                totalCredits: { decrement: line.creditAmount },
                closingBalance: { decrement: balanceChange },
              },
            });
          }
        }
      }

      // Delete the lines and the journal entry itself
      await tx.journalEntryLine.deleteMany({
        where: { journalEntryId: originalEntry.id }
      });
      await tx.journalEntry.delete({
        where: { id: originalEntry.id }
      });

      console.log(`[Undo Delete] Successfully deleted journal entry ${originalEntry.entryNumber} (${originalEntry.id})`);
    }
  } catch (err) {
    console.error('[Undo Delete] Error deleting journal entries:', err);
    throw err;
  }
}

async function deleteBankOrCashEntriesForRef(refId: string, tx: any) {
  try {
    // 1. Revert and delete BankTransactions
    const bankTransactions = await tx.bankTransaction.findMany({
      where: {
        OR: [
          { referenceId: refId },
          { referenceId: { startsWith: refId } }
        ]
      }
    });

    for (const bt of bankTransactions) {
      const multiplier = bt.transactionType === 'CREDIT' ? -1 : 1;
      await tx.bankAccount.update({
        where: { id: bt.bankAccountId },
        data: {
          currentBalance: { increment: bt.amount * multiplier }
        }
      });
      await tx.bankTransaction.delete({ where: { id: bt.id } });
      console.log(`[Undo] Deleted BankTransaction ${bt.id} and reverted balance by ${bt.amount * multiplier}`);
    }

    // 2. Revert and delete CashBookEntries
    const cashBookEntries = await tx.cashBookEntry.findMany({
      where: {
        OR: [
          { referenceId: refId },
          { referenceId: { startsWith: refId } }
        ]
      }
    });

    for (const cbe of cashBookEntries) {
      const multiplier = cbe.entryType === 'CREDIT' ? -1 : 1;
      await tx.cashBook.update({
        where: { id: cbe.cashBookId },
        data: {
          currentBalance: { increment: cbe.amount * multiplier }
        }
      });
      await tx.cashBookEntry.delete({ where: { id: cbe.id } });
      console.log(`[Undo] Deleted CashBookEntry ${cbe.id} and reverted balance by ${cbe.amount * multiplier}`);
    }

    // 3. Delete CreditTransactions
    await tx.creditTransaction.deleteMany({
      where: {
        OR: [
          { sourceId: refId },
          { loanApplicationId: refId },
          { emiScheduleId: refId }
        ]
      }
    });
    console.log(`[Undo] Deleted related CreditTransactions for refId: ${refId}`);
  } catch (err) {
    console.error('[Undo] Error in deleteBankOrCashEntriesForRef:', err);
    throw err;
  }
}


// GET - Fetch action logs for a user (for undo/redo)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    const recordId = searchParams.get('recordId');
    const moduleType = searchParams.get('module');

    // Get undoable actions for a user (or all users if admin)
    if (action === 'undoable') {
      const where: Record<string, unknown> = {
        canUndo: true,
        isUndone: false,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // last 24h
      };
      // Non-admin: only their own
      // if (userId && userRole !== 'SUPER_ADMIN') where.userId = userId;
      // requested by user: all roles should see undo actions (except we hide the tab for accountant)

      const actions = await db.actionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      return NextResponse.json({ success: true, actions });
    }

    // Get redoable actions for a user
    if (action === 'redoable') {
      const where: Record<string, unknown> = {
        canRedo: true,
        isUndone: true,
        isRedone: false,
        undoneAt: { gte: new Date(Date.now() - 1 * 60 * 60 * 1000) } // last 1h
      };
      if (userId && userRole !== 'SUPER_ADMIN') where.userId = userId;

      const actions = await db.actionLog.findMany({
        where,
        orderBy: { undoneAt: 'desc' },
        take: 10
      });

      return NextResponse.json({ success: true, actions });
    }

    // Get action history
    if (action === 'history') {
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (userId) where.userId = userId;
      if (moduleType) where.module = moduleType;
      if (recordId) where.recordId = recordId;
      if (userRole !== 'SUPER_ADMIN' && userId) where.userId = userId;

      const [actions, total] = await Promise.all([
        db.actionLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
        db.actionLog.count({ where })
      ]);

      return NextResponse.json({
        success: true,
        actions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Action log fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch action logs' }, { status: 500 });
  }
}

// POST - Log a new action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId, userRole, actionType, module: moduleValue,
      recordId, recordType, previousData, newData, description, canUndo = true
    } = body;

    if (!userId || !actionType || !moduleValue || !recordId || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const actionLog = await db.actionLog.create({
      data: {
        userId,
        userRole: userRole || 'UNKNOWN',
        actionType,
        module: moduleValue,
        recordId,
        recordType: recordType || moduleValue,
        previousData: previousData ? JSON.stringify(previousData) : null,
        newData: newData ? JSON.stringify(newData) : null,
        description,
        canUndo
      }
    });

    return NextResponse.json({ success: true, actionLog });
  } catch (error) {
    console.error('Action log creation error:', error);
    return NextResponse.json({ error: 'Failed to create action log' }, { status: 500 });
  }
}

// PUT - Undo or Redo an action
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, actionLogId, userId, userRole } = body;

    if (!actionLogId || !userId) {
      return NextResponse.json({ error: 'actionLogId and userId are required' }, { status: 400 });
    }

    const actionLog = await db.actionLog.findUnique({ where: { id: actionLogId } });
    if (!actionLog) {
      return NextResponse.json({ error: 'Action log not found' }, { status: 404 });
    }

    // Ownership check — Super Admin can undo anyone's actions
    if (userRole !== 'SUPER_ADMIN' && actionLog.userId !== userId) {
      return NextResponse.json({ error: 'You can only undo/redo your own actions' }, { status: 403 });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // UNDO ACTION
    // ────────────────────────────────────────────────────────────────────────────
    if (action === 'undo') {
      if (!actionLog.canUndo || actionLog.isUndone) {
        return NextResponse.json({ error: 'This action cannot be undone' }, { status: 400 });
      }

      let previousData: any = null;
      try {
        previousData = actionLog.previousData ? JSON.parse(actionLog.previousData) : null;
      } catch (parseErr) {
        console.error('[ActionLog Undo] Failed to parse previousData:', parseErr, 'Raw:', actionLog.previousData);
      }

      let newData: any = null;
      try {
        newData = actionLog.newData ? JSON.parse(actionLog.newData) : null;
      } catch (parseErr) {
        console.error('[ActionLog Undo] Failed to parse newData:', parseErr, 'Raw:', actionLog.newData);
      }
      const undoResult = await db.$transaction(async (tx) => {
        let localUndoResult: { type: string; recordId: string; detail?: string } | null = null;
        // ── OFFLINE LOAN ─────────────────────────────────────────────────────────
        if (actionLog.module === 'OFFLINE_LOAN') {
          // CREATE → fully delete the loan + mirror + accounting
          if (actionLog.actionType === 'CREATE') {
            const loan = await tx.offlineLoan.findUnique({ where: { id: actionLog.recordId } });
            if (!loan) throw new Error('Loan not found');

            // 1. Find and clean up mirror loan mapping + mirror loan
            const mirrorMapping = await tx.mirrorLoanMapping.findFirst({
              where: { originalLoanId: actionLog.recordId }
            });
            if (mirrorMapping) {
              if (mirrorMapping.mirrorLoanId) {
                // Delete mirror EMIs
                await tx.offlineLoanEMI.deleteMany({ where: { offlineLoanId: mirrorMapping.mirrorLoanId } });
                
                // Delete mirror loan bank/cash transactions & revert balances
                await deleteBankOrCashEntriesForRef(mirrorMapping.mirrorLoanId, tx);
                
                // Delete mirror loan journal entries
                await reverseJournalEntriesForRef(mirrorMapping.mirrorLoanId, userId, tx);

                // Delete mirror loan record
                await tx.offlineLoan.delete({ where: { id: mirrorMapping.mirrorLoanId } });
              }
              await tx.mirrorLoanMapping.delete({ where: { id: mirrorMapping.id } });
            }

            // 2. Delete original loan bank/cash transactions & revert balances
            await deleteBankOrCashEntriesForRef(actionLog.recordId, tx);

            // 3. Delete EMIs, journal entries, and original loan record
            await tx.offlineLoanEMI.deleteMany({ where: { offlineLoanId: actionLog.recordId } });
            await reverseJournalEntriesForRef(actionLog.recordId, userId, tx);
            await tx.offlineLoan.delete({ where: { id: actionLog.recordId } });

            localUndoResult = { type: 'loan_creation_deleted', recordId: actionLog.recordId, detail: `Loan ${loan.loanNumber} and all its accounting entries were completely deleted` };
          }

          // DELETE → restore loan to ACTIVE
          else if (actionLog.actionType === 'DELETE' && previousData) {
            await tx.offlineLoan.update({
              where: { id: actionLog.recordId },
              data: { status: previousData.status || 'ACTIVE' }
            });
            localUndoResult = { type: 'loan_restored', recordId: actionLog.recordId };
          }

          // UPDATE → revert fields to previous state
          else if (actionLog.actionType === 'UPDATE' && previousData) {
            const { id: _id, createdAt: _c, updatedAt: _u, ...safeFields } = previousData;
            await tx.offlineLoan.update({ where: { id: actionLog.recordId }, data: safeFields });
            localUndoResult = { type: 'loan_reverted', recordId: actionLog.recordId };
          }

          // CLOSE → re-activate the loan
          else if (actionLog.actionType === 'CLOSE' && previousData) {
            // 1. Re-activate loan
            await tx.offlineLoan.update({
              where: { id: actionLog.recordId },
              data: { status: previousData.status || 'ACTIVE', closedAt: null }
            });

            // 2. Revert EMIs marked paid during foreclosure
            const closedEMIIds = newData?.closedEMIIds || [];
            if (closedEMIIds.length > 0) {
              await tx.offlineLoanEMI.updateMany({
                where: { id: { in: closedEMIIds } },
                data: {
                  paymentStatus: 'PENDING',
                  paidAmount: 0,
                  paidPrincipal: 0,
                  paidInterest: 0,
                  paidDate: null,
                  paymentMode: null,
                  collectedById: null,
                  collectedByName: null,
                  collectedAt: null
                }
              });
            } else {
              const logTime = new Date(actionLog.createdAt).getTime();
              const emis = await tx.offlineLoanEMI.findMany({
                where: {
                  offlineLoanId: actionLog.recordId,
                  paymentStatus: 'PAID',
                  paidDate: {
                    gte: new Date(logTime - 360000), // 6 minutes tolerance
                    lte: new Date(logTime + 360000)
                  }
                }
              });

              for (const emi of emis) {
                await tx.offlineLoanEMI.update({
                  where: { id: emi.id },
                  data: {
                    paymentStatus: 'PENDING',
                    paidAmount: 0,
                    paidPrincipal: 0,
                    paidInterest: 0,
                    paidDate: null,
                    paymentMode: null,
                    collectedById: null,
                    collectedByName: null,
                    collectedAt: null
                  }
                });
              }
            }

            // 3. Delete foreclosure bank/cash transactions and revert balances
            await deleteBankOrCashEntriesForRef(`${actionLog.recordId}-REV-CLOSE`, tx);
            await deleteBankOrCashEntriesForRef(actionLog.recordId, tx);

            // Revert collector credit for foreclosure if applicable
            if (newData && newData.closeType === 'PAYMENT' && newData.collectorId) {
              const paymentAmount = newData.totalForeclosureAmount || 0;
              const paymentMode = (newData.paymentMode || '').toUpperCase();
              const isOnlinePayment = ['ONLINE','UPI','BANK_TRANSFER','NEFT','RTGS','IMPS','CHEQUE'].includes(paymentMode);
              if (paymentAmount > 0 && !isOnlinePayment) {
                const creditType = newData.creditType || 'COMPANY';
                const user = await tx.user.findUnique({ where: { id: newData.collectorId }, select: { credit: true, personalCredit: true, companyCredit: true } });
                const companyCreditBefore = user?.companyCredit || 0;
                const personalCreditBefore = user?.personalCredit || 0;
                
                const companyCreditAfter = creditType === 'COMPANY' ? Math.max(0, companyCreditBefore - paymentAmount) : companyCreditBefore;
                const personalCreditAfter = creditType === 'PERSONAL' ? Math.max(0, personalCreditBefore - paymentAmount) : personalCreditBefore;
                const creditAfter = companyCreditAfter + personalCreditAfter;
                
                await tx.user.update({
                  where: { id: newData.collectorId },
                  data: {
                    credit: creditAfter,
                    companyCredit: companyCreditAfter,
                    personalCredit: personalCreditAfter
                  }
                });
              }
            }

            // 4. Delete writeoff / foreclosure journal entries
            await reverseJournalEntriesForRef(`${actionLog.recordId}-LOSS`, userId, tx);
            await reverseJournalEntriesForRef(`${actionLog.recordId}-FORECLOSURE`, userId, tx);

            localUndoResult = { type: 'loan_reopened', recordId: actionLog.recordId };
          }
        }

        // ── EMI PAYMENT (Offline) ─────────────────────────────────────────────
        else if (actionLog.module === 'EMI_PAYMENT') {
          if (actionLog.actionType === 'PAY' && previousData) {
            const emiId  = actionLog.recordId;
            const loanId = newData?.loanId || newData?.sourceId || null;
            // Look up mirror loan dynamically — not stored in newData (older logs)
            const mirrorMapping = loanId
              ? await tx.mirrorLoanMapping.findFirst({ where: { originalLoanId: loanId }, select: { mirrorLoanId: true } })
              : null;
            const mirrorLoanId = newData?.mirrorLoanId || mirrorMapping?.mirrorLoanId || null;

            // 1. Revert the paid EMI back to its pre-payment state
            await tx.offlineLoanEMI.update({
              where: { id: emiId },
              data: {
                paidAmount:      previousData.paidAmount      ?? 0,
                paidPrincipal:   previousData.paidPrincipal   ?? 0,
                paidInterest:    previousData.paidInterest    ?? 0,
                paymentStatus:   previousData.paymentStatus   ?? 'PENDING',
                paidDate:        previousData.paidDate ? new Date(previousData.paidDate) : null,
                paymentMode:     previousData.paymentMode || null,
                collectedById:   previousData.collectedById   || null,
                collectedByName: previousData.collectedByName || null,
                collectedAt:     previousData.collectedAt ? new Date(previousData.collectedAt) : null,
                interestOnlyPaidAt: null,
              }
            });
            console.log(`[Undo EMI] Reverted EMI ${emiId} to ${previousData.paymentStatus ?? 'PENDING'}`);

            // 2. Delete the rolling NEXT EMI that was auto-created after this payment
            //    (installmentNumber = paid EMI's installmentNumber + 1)
            if (loanId) {
              const paidEMI = await tx.offlineLoanEMI.findUnique({
                where: { id: emiId }, select: { installmentNumber: true }
              });
              if (paidEMI) {
                const nextInstNum = paidEMI.installmentNumber + 1;
                // Only delete if it has NEVER been paid (PENDING) — safety guard
                const deletedCount = await tx.offlineLoanEMI.deleteMany({
                  where: {
                    offlineLoanId: loanId,
                    installmentNumber: nextInstNum,
                    paymentStatus: 'PENDING'
                  }
                });
                console.log(`[Undo EMI] Deleted ${deletedCount.count} rolling next-EMI (#${nextInstNum}) for loan ${loanId}`);
              }
            }

            // 3. Revert mirror loan EMI and delete mirror's rolling next EMI
            if (mirrorLoanId) {
              const paidEMI = await tx.offlineLoanEMI.findUnique({
                where: { id: emiId }, select: { installmentNumber: true }
              });
              const installmentNumber = paidEMI?.installmentNumber;

              if (installmentNumber) {
                // Revert mirror EMI to PENDING
                await tx.offlineLoanEMI.updateMany({
                  where: {
                    offlineLoanId: mirrorLoanId,
                    installmentNumber,
                    paymentStatus: { in: ['PAID', 'INTEREST_ONLY_PAID'] }
                  },
                  data: {
                    paymentStatus: 'PENDING',
                    paidAmount: 0, paidPrincipal: 0, paidInterest: 0,
                    paidDate: null, paymentMode: null,
                    collectedById: null, collectedByName: null, collectedAt: null,
                    interestOnlyPaidAt: null,
                  }
                });

                // Delete mirror's rolling next EMI
                await tx.offlineLoanEMI.deleteMany({
                  where: {
                    offlineLoanId: mirrorLoanId,
                    installmentNumber: installmentNumber + 1,
                    paymentStatus: 'PENDING'
                  }
                });
                console.log(`[Undo EMI] Mirror EMI #${installmentNumber} reverted, next mirror EMI deleted`);
              }
            }

            // 4. Revert loan's totalInterestPaid
            if (loanId) {
              const interestPaid = newData?.interestAmount || newData?.paymentAmount || 0;
              if (interestPaid > 0) {
                await tx.offlineLoan.update({
                  where: { id: loanId },
                  data: { totalInterestPaid: { decrement: interestPaid } }
                });
                // Also re-open loan if it was auto-closed by this payment
                await tx.offlineLoan.updateMany({
                  where: { id: loanId, status: 'CLOSED', closedAt: { gte: new Date(new Date(actionLog.createdAt).getTime() - 60000) } },
                  data: { status: 'INTEREST_ONLY', closedAt: null }
                });
              }
            }

            // 5. Revert collector credit
            if (newData) {
              const paymentAmount = newData.paymentAmount || newData.interestAmount || newData.amount || 0;
              const paymentMode   = (newData.paymentMode || '').toUpperCase();
              const isOnline = ['ONLINE','UPI','BANK_TRANSFER','NEFT','RTGS','IMPS','CHEQUE'].includes(paymentMode);
              if (newData.collectorId && paymentAmount > 0 && !isOnline) {
                const creditType = newData.creditType || 'COMPANY';
                const user = await tx.user.findUnique({
                  where: { id: newData.collectorId },
                  select: { credit: true, personalCredit: true, companyCredit: true }
                });
                const companyCreditAfter  = creditType === 'COMPANY'
                  ? Math.max(0, (user?.companyCredit  || 0) - paymentAmount)
                  : (user?.companyCredit  || 0);
                const personalCreditAfter = creditType === 'PERSONAL'
                  ? Math.max(0, (user?.personalCredit || 0) - paymentAmount)
                  : (user?.personalCredit || 0);
                await tx.user.update({
                  where: { id: newData.collectorId },
                  data: {
                    credit: companyCreditAfter + personalCreditAfter,
                    companyCredit: companyCreditAfter,
                    personalCredit: personalCreditAfter
                  }
                });
              }
            }

            // 6. Delete bank/cash transactions tied to this EMI
            await deleteBankOrCashEntriesForRef(emiId, tx);

            // 7. Delete ALL journal entries referencing this EMI id:
            //    covers INTEREST_ACCRUAL + INTEREST_ONLY_PAYMENT + EMI_PAYMENT
            await reverseJournalEntriesForRef(emiId, userId, tx);

            // 8. Also delete credit transactions referencing this EMI (IO_PAYMENT sourceId = loanId)
            if (loanId) {
              await tx.creditTransaction.deleteMany({
                where: {
                  OR: [
                    { sourceId: emiId },
                    { sourceId: loanId, sourceType: 'INTEREST_ONLY_PAYMENT' },
                    { emiScheduleId: emiId }
                  ],
                  createdAt: { gte: new Date(new Date(actionLog.createdAt).getTime() - 60000) }
                }
              });
            }

            localUndoResult = { type: 'payment_fully_reversed', recordId: emiId,
              detail: 'EMI reverted, rolling EMI deleted, mirror synced, journals deleted, credit restored' };
          }
        }


        // ── ONLINE EMI PAYMENT ────────────────────────────────────────────────
        else if (actionLog.module === 'ONLINE_LOAN' || actionLog.module === 'PAYMENT') {
          if ((actionLog.actionType === 'PAY' || actionLog.actionType === 'PAYMENT') && previousData) {
            // Revert EMI schedule status
            const emiId = newData?.emiId || actionLog.recordId;
            if (emiId) {
              await tx.eMISchedule.update({
                where: { id: emiId },
                data: {
                  paymentStatus: previousData.emiStatus   || 'PENDING',
                  paidAmount:    previousData.paidAmount   ?? 0,
                  paidDate:      previousData.paidDate ? new Date(previousData.paidDate) : null,
                  paymentMode:   previousData.paymentMode || null
                }
              });
            }

            // Delete bank/cash transactions & revert balances
            await deleteBankOrCashEntriesForRef(actionLog.recordId, tx);

            // Revert collector credit
            if (newData) {
              const paymentAmount = newData.amount || newData.paymentAmount || 0;
              const paymentMode   = (newData.paymentMode || '').toUpperCase();
              const isOnlinePayment = ['ONLINE','UPI','BANK_TRANSFER','NEFT','RTGS','IMPS','CHEQUE'].includes(paymentMode);
              if (newData.collectorId && paymentAmount > 0 && !isOnlinePayment) {
                const creditType = newData.creditType || 'COMPANY';
                const user = await tx.user.findUnique({ where: { id: newData.collectorId }, select: { credit: true, personalCredit: true, companyCredit: true } });
                
                const companyCreditBefore = user?.companyCredit || 0;
                const personalCreditBefore = user?.personalCredit || 0;
                
                const companyCreditAfter = creditType === 'COMPANY' ? Math.max(0, companyCreditBefore - paymentAmount) : companyCreditBefore;
                const personalCreditAfter = creditType === 'PERSONAL' ? Math.max(0, personalCreditBefore - paymentAmount) : personalCreditBefore;
                const creditAfter = companyCreditAfter + personalCreditAfter;

                await tx.user.update({
                  where: { id: newData.collectorId },
                  data: {
                    credit: creditAfter,
                    companyCredit: companyCreditAfter,
                    personalCredit: personalCreditAfter
                  }
                });
              }
            }

            // Delete journal entries
            await reverseJournalEntriesForRef(actionLog.recordId, userId, tx);

            localUndoResult = { type: 'online_payment_deleted', recordId: actionLog.recordId };
          }
        }

        // ── SETTLEMENT ───────────────────────────────────────────────────────
        else if (actionLog.module === 'SETTLEMENT') {
          if (actionLog.actionType === 'CREATE') {
            const settlement = await tx.cashierSettlement.findUnique({ where: { id: actionLog.recordId } });
            if (settlement) {
              // Revert cashier credit
              const user = await tx.user.findUnique({ where: { id: settlement.userId }, select: { credit: true } });
              await tx.user.update({
                where: { id: settlement.userId },
                data: { credit: (user?.credit || 0) + settlement.amount }
              });

              // Delete settlement bank/cash transactions & revert balances
              await deleteBankOrCashEntriesForRef(actionLog.recordId, tx);

              // Delete settlement journal entries
              await reverseJournalEntriesForRef(actionLog.recordId, userId, tx);

              // Delete the settlement record itself
              await tx.cashierSettlement.delete({ where: { id: actionLog.recordId } });

              localUndoResult = { type: 'settlement_deleted', recordId: actionLog.recordId };
            }
          }
        }

        // ── LOAN CLOSE (Online) ───────────────────────────────────────────────
        else if (actionLog.module === 'LOAN_CLOSE' || actionLog.module === 'LOAN') {
          if (actionLog.actionType === 'CLOSE' && previousData) {
            // 1. Re-activate loan
            await tx.loanApplication.update({
              where: { id: actionLog.recordId },
              data: { status: previousData.status || 'ACTIVE' }
            });

            // 2. Revert EMIs marked paid during foreclosure
            const closedEMIIds = newData?.closedEMIIds || [];
            if (closedEMIIds.length > 0) {
              await tx.eMISchedule.updateMany({
                where: { id: { in: closedEMIIds } },
                data: {
                  paymentStatus: 'PENDING',
                  paidAmount: 0,
                  paidDate: null,
                  paymentMode: null,
                  notes: null
                }
              });
            } else {
              const logTime = new Date(actionLog.createdAt).getTime();
              await tx.eMISchedule.updateMany({
                where: {
                  loanApplicationId: actionLog.recordId,
                  paymentStatus: 'PAID',
                  paidDate: {
                    gte: new Date(logTime - 360000), // 6 minutes tolerance
                    lte: new Date(logTime + 360000)
                  }
                },
                data: {
                  paymentStatus: 'PENDING',
                  paidAmount: 0,
                  paidDate: null,
                  paymentMode: null,
                  notes: null
                }
              });
            }

            // 3. Delete bank/cash transactions & revert balances
            await deleteBankOrCashEntriesForRef(`${actionLog.recordId}-REV-CLOSE`, tx);
            await deleteBankOrCashEntriesForRef(actionLog.recordId, tx);

            // Revert collector credit
            if (newData && newData.closeType === 'PAYMENT' && newData.collectorId) {
              const paymentAmount = newData.totalForeclosureAmount || 0;
              const paymentMode = (newData.paymentMode || '').toUpperCase();
              const isOnlinePayment = ['ONLINE','UPI','BANK_TRANSFER','NEFT','RTGS','IMPS','CHEQUE'].includes(paymentMode);
              if (paymentAmount > 0 && !isOnlinePayment) {
                const creditType = newData.creditType || 'COMPANY';
                const user = await tx.user.findUnique({ where: { id: newData.collectorId }, select: { credit: true, personalCredit: true, companyCredit: true } });
                
                const companyCreditBefore = user?.companyCredit || 0;
                const personalCreditBefore = user?.personalCredit || 0;
                
                const companyCreditAfter = creditType === 'COMPANY' ? Math.max(0, companyCreditBefore - paymentAmount) : companyCreditBefore;
                const personalCreditAfter = creditType === 'PERSONAL' ? Math.max(0, personalCreditBefore - paymentAmount) : personalCreditBefore;
                const creditAfter = companyCreditAfter + personalCreditAfter;

                await tx.user.update({
                  where: { id: newData.collectorId },
                  data: {
                    credit: creditAfter,
                    companyCredit: companyCreditAfter,
                    personalCredit: personalCreditAfter
                  }
                });
              }
            }

            // 4. Delete writeoff / foreclosure journal entries
            await reverseJournalEntriesForRef(`${actionLog.recordId}-LOSS`, userId, tx);
            await reverseJournalEntriesForRef(`${actionLog.recordId}-FORECLOSURE`, userId, tx);

            localUndoResult = { type: 'loan_reopened', recordId: actionLog.recordId };
          }
        }

        // ── EXPENSE ──────────────────────────────────────────────────────────
        else if (actionLog.module === 'EXPENSE') {
          if (actionLog.actionType === 'CREATE') {
            const expense = await tx.expense.findUnique({ where: { id: actionLog.recordId } });
            if (expense) {
              // Delete expense bank/cash transactions & revert balances
              await deleteBankOrCashEntriesForRef(expense.id, tx);

              // Delete journal entries
              await reverseJournalEntriesForRef(expense.id, userId, tx);

              // Delete the expense record itself
              await tx.expense.delete({ where: { id: expense.id } });

              localUndoResult = { type: 'expense_deleted', recordId: actionLog.recordId };
            }
          }
        }

        // ── CREDIT TRANSFER ──────────────────────────────────────────────────
        else if (actionLog.module === 'CREDIT_TRANSFER') {
          if (actionLog.actionType === 'TRANSFER' && newData) {
            const amount = newData.amount;
            const creditType = newData.creditType;

            if (newData.toUserId) {
              // Revert receiver credit
              const toUser = await tx.user.findUnique({ where: { id: newData.toUserId } });
              if (toUser) {
                await tx.user.update({
                  where: { id: newData.toUserId },
                  data: {
                    personalCredit: creditType === 'PERSONAL' ? { decrement: amount } : toUser.personalCredit,
                    companyCredit: creditType === 'COMPANY' ? { decrement: amount } : toUser.companyCredit,
                    credit: { decrement: amount }
                  }
                });
              }

              // Revert sender credit
              const fromUser = await tx.user.findUnique({ where: { id: actionLog.recordId } });
              if (fromUser) {
                await tx.user.update({
                  where: { id: actionLog.recordId },
                  data: {
                    personalCredit: creditType === 'PERSONAL' ? { increment: amount } : fromUser.personalCredit,
                    companyCredit: creditType === 'COMPANY' ? { increment: amount } : fromUser.companyCredit,
                    credit: { increment: amount }
                  }
                });
              }

              // Delete credit transactions
              await deleteBankOrCashEntriesForRef(actionLog.recordId, tx);

              localUndoResult = { type: 'credit_transfer_deleted', recordId: actionLog.recordId };
            } else if (newData.bankAccountId) {
              // Revert bank and sender credit
              await deleteBankOrCashEntriesForRef(actionLog.recordId, tx);

              const fromUser = await tx.user.findUnique({ where: { id: actionLog.recordId } });
              if (fromUser) {
                await tx.user.update({
                  where: { id: actionLog.recordId },
                  data: {
                    personalCredit: creditType === 'PERSONAL' ? { increment: amount } : fromUser.personalCredit,
                    companyCredit: creditType === 'COMPANY' ? { increment: amount } : fromUser.companyCredit,
                    credit: { increment: amount }
                  }
                });
              }

              localUndoResult = { type: 'credit_deposit_deleted', recordId: actionLog.recordId };
            }
          }
        }

        // ── USER UPDATE ──────────────────────────────────────────────────────
        else if (actionLog.module === 'USER') {
          if (actionLog.actionType === 'UPDATE' && previousData) {
            const { id: _id, createdAt: _c, updatedAt: _u, password: _p, ...safeFields } = previousData;
            await tx.user.update({ where: { id: actionLog.recordId }, data: safeFields });
            localUndoResult = { type: 'user_reverted', recordId: actionLog.recordId };
          }
        }

        // Mark as undone
        await tx.actionLog.update({
          where: { id: actionLogId },
          data: { isUndone: true, undoneAt: new Date(), undoneById: userId, canRedo: true }
        });

        return localUndoResult;
      });


      // Bust active-loans cache so UI reflects the change
      try {
        const { cache } = await import('@/lib/cache');
        cache.deletePattern('active-loans:');
      } catch { /* non-critical */ }

      return NextResponse.json({
        success: true,
        message: undoResult
          ? `Undone successfully: ${undoResult.type}`
          : 'Action marked as undone (no data reversal needed)',
        undoResult
      });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // REDO ACTION
    // ────────────────────────────────────────────────────────────────────────────
    if (action === 'redo') {
      if (!actionLog.canRedo || !actionLog.isUndone || actionLog.isRedone) {
        return NextResponse.json({ error: 'This action cannot be redone' }, { status: 400 });
      }

      let newData: any = null;
      try {
        newData = actionLog.newData ? JSON.parse(actionLog.newData) : null;
      } catch (parseErr) {
        console.error('[ActionLog Redo] Failed to parse newData:', parseErr, 'Raw:', actionLog.newData);
      }
      let redoResult: { type: string; recordId: string } | null = null;

      if (actionLog.module === 'OFFLINE_LOAN') {
        if (actionLog.actionType === 'CREATE') {
          await db.offlineLoan.update({ where: { id: actionLog.recordId }, data: { status: 'ACTIVE' } });
          redoResult = { type: 'loan_re_activated', recordId: actionLog.recordId };
        } else if (actionLog.actionType === 'UPDATE' && newData) {
          const { id: _id, createdAt: _c, updatedAt: _u, ...safeFields } = newData;
          await db.offlineLoan.update({ where: { id: actionLog.recordId }, data: safeFields });
          redoResult = { type: 'loan_updated', recordId: actionLog.recordId };
        }
      }

      else if (actionLog.module === 'EMI_PAYMENT') {
        if ((actionLog.actionType === 'PAY' || actionLog.actionType === 'PAYMENT') && newData) {
          await db.offlineLoanEMI.update({
            where: { id: actionLog.recordId },
            data: {
              paidAmount:    newData.paidAmount,
              paidPrincipal: newData.paidPrincipal,
              paidInterest:  newData.paidInterest,
              paymentStatus: newData.paymentStatus || 'PAID',
              paidDate: new Date(),
              paymentMode: newData.paymentMode,
              collectedById: newData.collectorId,
              collectedByName: newData.collectorName,
              collectedAt: new Date()
            }
          });
          if (newData.collectorId && newData.paymentAmount) {
            const user = await db.user.findUnique({ where: { id: newData.collectorId }, select: { credit: true } });
            await db.user.update({ where: { id: newData.collectorId }, data: { credit: (user?.credit || 0) + newData.paymentAmount } });
          }
          redoResult = { type: 'payment_re_applied', recordId: actionLog.recordId };
        }
      }

      await db.actionLog.update({
        where: { id: actionLogId },
        data: { isRedone: true, redoneAt: new Date(), redoneById: userId, canRedo: false }
      });

      return NextResponse.json({ success: true, message: 'Action redone successfully', redoResult });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Action undo/redo error:', error);
    return NextResponse.json({ error: 'Failed to process undo/redo', detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
