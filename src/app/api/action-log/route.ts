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
        ],
        isReversed: false
      },
      include: { lines: { include: { account: true } } }
    });

    console.log(`[Undo Reversal] Found ${originalEntries.length} journal entries to reverse for refId: ${refId}`);

    for (const originalEntry of originalEntries) {
      const companyId = originalEntry.companyId;
      const count = await tx.journalEntry.count({ where: { companyId } });
      const entryNumber = `JE${String(count + 1).padStart(6, '0')}`;

      const accService = new AccountingService(companyId);
      const financialYearId = await accService.getCurrentFinancialYear();

      // Mark original as reversed
      await tx.journalEntry.update({
        where: { id: originalEntry.id },
        data: {
          isReversed: true,
          reversedById: userId,
          reversedAt: new Date(),
        },
      });

      // Create reversal entry
      const reversal = await tx.journalEntry.create({
        data: {
          companyId,
          entryNumber,
          entryDate: new Date(),
          referenceType: originalEntry.referenceType || 'MANUAL_ENTRY',
          referenceId: `${originalEntry.referenceId}-REV`,
          narration: `REVERSAL: ${originalEntry.narration}. Reason: Undo Action Log`,
          totalDebit: originalEntry.totalCredit,
          totalCredit: originalEntry.totalDebit,
          isAutoEntry: true,
          isApproved: true,
          createdById: userId,
        },
      });

      // Create reversal lines
      for (const line of originalEntry.lines) {
        await tx.journalEntryLine.create({
          data: {
            journalEntryId: reversal.id,
            accountId: line.accountId,
            debitAmount: line.creditAmount,
            creditAmount: line.debitAmount,
            narration: `Reversal of ${originalEntry.entryNumber}`,
            loanId: line.loanId,
            customerId: line.customerId,
          },
        });

        // Update account balance
        const account = line.account;
        if (account) {
          let balanceChange = 0;
          if (account.accountType === 'ASSET' || account.accountType === 'EXPENSE') {
            balanceChange = line.creditAmount - line.debitAmount;
          } else {
            balanceChange = line.debitAmount - line.creditAmount;
          }

          await tx.chartOfAccount.update({
            where: { id: line.accountId },
            data: {
              currentBalance: { increment: balanceChange }
            },
          });

          // Update ledger balance
          if (financialYearId) {
            await tx.ledgerBalance.updateMany({
              where: {
                accountId: line.accountId,
                financialYearId,
              },
              data: {
                totalDebits: { increment: line.creditAmount },
                totalCredits: { increment: line.debitAmount },
                closingBalance: { increment: balanceChange },
              },
            });
          }
        }
      }
      console.log(`[Undo Reversal] Successfully reversed journal entry ${originalEntry.entryNumber} (${originalEntry.id})`);
    }
  } catch (err) {
    console.error('[Undo Reversal] Error reversing journal entries:', err);
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

      const previousData = actionLog.previousData ? JSON.parse(actionLog.previousData) : null;
      const newData      = actionLog.newData      ? JSON.parse(actionLog.newData)      : null;
      const undoResult = await db.$transaction(async (tx) => {
        let localUndoResult: { type: string; recordId: string; detail?: string } | null = null;
        // ── OFFLINE LOAN ─────────────────────────────────────────────────────────
        if (actionLog.module === 'OFFLINE_LOAN') {
          // CREATE → fully reverse the loan + mirror + accounting
          if (actionLog.actionType === 'CREATE') {
            const loan = await tx.offlineLoan.findUnique({ where: { id: actionLog.recordId } });
            if (!loan) throw new Error('Loan not found');

            // 1. Find and clean up mirror loan mapping + mirror loan
            const mirrorMapping = await tx.mirrorLoanMapping.findFirst({
              where: { originalLoanId: actionLog.recordId }
            });
            if (mirrorMapping) {
              if (mirrorMapping.mirrorLoanId) {
                await tx.offlineLoanEMI.deleteMany({ where: { offlineLoanId: mirrorMapping.mirrorLoanId } });
                await tx.offlineLoan.update({ where: { id: mirrorMapping.mirrorLoanId }, data: { status: 'CLOSED' } });

                // Reverse mirror company disbursement (credit back to bank/cash)
                const mirrorCompanyId = mirrorMapping.mirrorCompanyId;
                try {
                  const loanAmt = loan.loanAmount;
                  // Try bank reversal first
                  const mirrorBank = await tx.bankAccount.findFirst({ where: { companyId: mirrorCompanyId, isActive: true } });
                  if (mirrorBank) {
                    await tx.bankAccount.update({
                      where: { id: mirrorBank.id },
                      data: { currentBalance: { increment: loanAmt } }
                    });
                    await tx.bankTransaction.create({
                      data: {
                        bankAccountId: mirrorBank.id,
                        transactionType: 'CREDIT',
                        amount: loanAmt,
                        balanceAfter: mirrorBank.currentBalance + loanAmt,
                        description: `[UNDO] Reversal of mirror loan disbursement - ${loan.loanNumber}`,
                        referenceType: 'UNDO_REVERSAL',
                        referenceId: `${actionLog.recordId}-MIR-REV`,
                        createdById: userId
                      }
                    });
                  } else {
                    // Cash reversal
                    const cashBook = await tx.cashBook.findUnique({ where: { companyId: mirrorCompanyId } });
                    if (cashBook) {
                      await tx.cashBook.update({ where: { companyId: mirrorCompanyId }, data: { currentBalance: { increment: loanAmt } } });
                      await tx.cashBookEntry.create({
                        data: {
                          cashBookId: cashBook.id,
                          entryType: 'CREDIT',
                          amount: loanAmt,
                          balanceAfter: cashBook.currentBalance + loanAmt,
                          description: `[UNDO] Reversal of mirror loan disbursement - ${loan.loanNumber}`,
                          referenceType: 'UNDO_REVERSAL',
                          referenceId: `${actionLog.recordId}-MIR-REV`,
                          createdById: userId
                        }
                      });
                    }
                  }
                } catch (mirrorReversalErr) {
                  console.error('[Undo] Mirror company bank reversal failed (non-critical):', mirrorReversalErr);
                }

                // Reverse mirror loan journal entries
                await reverseJournalEntriesForRef(mirrorMapping.mirrorLoanId, userId, tx);
              }
              await tx.mirrorLoanMapping.delete({ where: { id: mirrorMapping.id } });
            }

            // 2. Reverse original company disbursement
            const origCompanyId = loan.companyId;
            if (origCompanyId) {
              const loanAmt = loan.loanAmount;
              const origBank = await tx.bankAccount.findFirst({ where: { companyId: origCompanyId, isActive: true } });
              if (origBank) {
                await tx.bankAccount.update({ where: { id: origBank.id }, data: { currentBalance: { increment: loanAmt } } });
                await tx.bankTransaction.create({
                  data: {
                    bankAccountId: origBank.id,
                    transactionType: 'CREDIT',
                    amount: loanAmt,
                    balanceAfter: origBank.currentBalance + loanAmt,
                    description: `[UNDO] Reversal of loan disbursement - ${loan.loanNumber}`,
                    referenceType: 'UNDO_REVERSAL',
                    referenceId: `${actionLog.recordId}-REV`,
                    createdById: userId
                  }
                });
              } else {
                const cashBook = await tx.cashBook.findUnique({ where: { companyId: origCompanyId } });
                if (cashBook) {
                  await tx.cashBook.update({ where: { companyId: origCompanyId }, data: { currentBalance: { increment: loanAmt } } });
                  await tx.cashBookEntry.create({
                    data: {
                      cashBookId: cashBook.id,
                      entryType: 'CREDIT',
                      amount: loanAmt,
                      balanceAfter: cashBook.currentBalance + loanAmt,
                      description: `[UNDO] Reversal of loan disbursement - ${loan.loanNumber}`,
                      referenceType: 'UNDO_REVERSAL',
                      referenceId: `${actionLog.recordId}-REV`,
                      createdById: userId
                    }
                  });
                }
              }
            }

            // 3. Delete EMIs and close the original loan
            await tx.offlineLoanEMI.deleteMany({ where: { offlineLoanId: actionLog.recordId } });
            await tx.offlineLoan.update({ where: { id: actionLog.recordId }, data: { status: 'CLOSED' } });

            // Reverse original loan journal entries
            await reverseJournalEntriesForRef(actionLog.recordId, userId, tx);

            localUndoResult = { type: 'loan_creation_reversed', recordId: actionLog.recordId, detail: `Loan ${loan.loanNumber} closed + disbursement reversed` };
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
            await tx.offlineLoan.update({
              where: { id: actionLog.recordId },
              data: { status: previousData.status || 'ACTIVE', closedAt: null }
            });

            // Reverse writeoff / foreclosure journal entries
            await reverseJournalEntriesForRef(`${actionLog.recordId}-LOSS`, userId, tx);
            await reverseJournalEntriesForRef(`${actionLog.recordId}-FORECLOSURE`, userId, tx);

            localUndoResult = { type: 'loan_reopened', recordId: actionLog.recordId };
          }
        }

        // ── EMI PAYMENT (Offline) ─────────────────────────────────────────────
        else if (actionLog.module === 'EMI_PAYMENT') {
          if (actionLog.actionType === 'PAY' && previousData) {
            // 1. Revert the EMI record to its pre-payment state
            await tx.offlineLoanEMI.update({
              where: { id: actionLog.recordId },
              data: {
                paidAmount:      previousData.paidAmount      ?? 0,
                paidPrincipal:   previousData.paidPrincipal   ?? 0,
                paidInterest:    previousData.paidInterest    ?? 0,
                paymentStatus:   previousData.paymentStatus   ?? 'PENDING',
                paidDate:        null,
                paymentMode:     null,
                collectedById:   null,
                collectedByName: null,
                collectedAt:     null
              }
            });

            // 2. Reverse bank/cash balance change
            if (newData) {
              const paymentAmount = newData.paymentAmount || newData.amount || 0;
              const companyId     = newData.companyId;
              const paymentMode   = (newData.paymentMode || '').toUpperCase();

              if (companyId && paymentAmount > 0) {
                try {
                  const isOnline = ['ONLINE','UPI','BANK_TRANSFER','NEFT','RTGS','IMPS','CHEQUE'].includes(paymentMode);
                  if (isOnline) {
                    const bank = await tx.bankAccount.findFirst({ where: { companyId, isActive: true } });
                    if (bank) {
                      await tx.bankAccount.update({ where: { id: bank.id }, data: { currentBalance: { decrement: paymentAmount } } });
                      await tx.bankTransaction.create({
                        data: {
                          bankAccountId: bank.id, transactionType: 'DEBIT', amount: paymentAmount,
                          balanceAfter: bank.currentBalance - paymentAmount,
                          description: `[UNDO] Reversal of EMI payment`,
                          referenceType: 'UNDO_REVERSAL', referenceId: `${actionLog.recordId}-REV`, createdById: userId
                        }
                      });
                    }
                  } else {
                    const cashBook = await tx.cashBook.findUnique({ where: { companyId } });
                    if (cashBook) {
                      await tx.cashBook.update({ where: { companyId }, data: { currentBalance: { decrement: paymentAmount } } });
                      await tx.cashBookEntry.create({
                        data: {
                          cashBookId: cashBook.id, entryType: 'DEBIT', amount: paymentAmount,
                          balanceAfter: cashBook.currentBalance - paymentAmount,
                          description: `[UNDO] Reversal of EMI payment`,
                          referenceType: 'UNDO_REVERSAL', referenceId: `${actionLog.recordId}-REV`, createdById: userId
                        }
                      });
                    }
                  }
                } catch (balanceErr) {
                  console.error('[Undo] Balance reversal failed (non-critical):', balanceErr);
                }
              }

              // 3. Reverse collector credit
              if (newData.collectorId && paymentAmount > 0) {
                const user = await tx.user.findUnique({ where: { id: newData.collectorId }, select: { credit: true } });
                await tx.user.update({
                  where: { id: newData.collectorId },
                  data: { credit: Math.max(0, (user?.credit || 0) - paymentAmount) }
                });
              }
            }

            // 4. Reverse journal entries
            await reverseJournalEntriesForRef(actionLog.recordId, userId, tx);

            localUndoResult = { type: 'payment_reverted', recordId: actionLog.recordId };
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
                  paidDate:      null,
                  paymentMode:   null
                }
              });
            }

            // Reverse balance
            if (newData) {
              const paymentAmount = newData.amount || newData.paymentAmount || 0;
              const companyId     = newData.companyId;
              const paymentMode   = (newData.paymentMode || '').toUpperCase();

              if (companyId && paymentAmount > 0) {
                try {
                  const isOnline = ['ONLINE','UPI','BANK_TRANSFER','NEFT','RTGS','IMPS','CHEQUE'].includes(paymentMode);
                  if (isOnline) {
                    const bank = await tx.bankAccount.findFirst({ where: { companyId, isActive: true } });
                    if (bank) {
                      await tx.bankAccount.update({ where: { id: bank.id }, data: { currentBalance: { decrement: paymentAmount } } });
                      await tx.bankTransaction.create({
                        data: {
                          bankAccountId: bank.id, transactionType: 'DEBIT', amount: paymentAmount,
                          balanceAfter: bank.currentBalance - paymentAmount,
                          description: `[UNDO] Reversal of Online EMI payment`,
                          referenceType: 'UNDO_REVERSAL', referenceId: `${actionLog.recordId}-REV`, createdById: userId
                        }
                      });
                    }
                  } else {
                    const cashBook = await tx.cashBook.findUnique({ where: { companyId } });
                    if (cashBook) {
                      await tx.cashBook.update({ where: { companyId }, data: { currentBalance: { decrement: paymentAmount } } });
                      await tx.cashBookEntry.create({
                        data: {
                          cashBookId: cashBook.id, entryType: 'DEBIT', amount: paymentAmount,
                          balanceAfter: cashBook.currentBalance - paymentAmount,
                          description: `[UNDO] Reversal of Online EMI payment`,
                          referenceType: 'UNDO_REVERSAL', referenceId: `${actionLog.recordId}-REV`, createdById: userId
                        }
                      });
                    }
                  }
                } catch (e) { console.error('[Undo Online EMI] Balance reversal failed:', e); }
              }

              // Reverse collector credit
              if (newData.collectorId && paymentAmount > 0) {
                const user = await tx.user.findUnique({ where: { id: newData.collectorId }, select: { credit: true } });
                await tx.user.update({
                  where: { id: newData.collectorId },
                  data: { credit: Math.max(0, (user?.credit || 0) - paymentAmount) }
                });
              }
            }

            // Reverse journal entries
            await reverseJournalEntriesForRef(actionLog.recordId, userId, tx);

            localUndoResult = { type: 'online_payment_reverted', recordId: actionLog.recordId };
          }
        }

        // ── SETTLEMENT ───────────────────────────────────────────────────────
        else if (actionLog.module === 'SETTLEMENT') {
          if (actionLog.actionType === 'CREATE') {
            const settlement = await tx.cashierSettlement.findUnique({ where: { id: actionLog.recordId } });
            if (settlement) {
              await tx.cashierSettlement.update({ where: { id: actionLog.recordId }, data: { status: 'REJECTED' } });
              const user = await tx.user.findUnique({ where: { id: settlement.userId }, select: { credit: true } });
              await tx.user.update({
                where: { id: settlement.userId },
                data: { credit: (user?.credit || 0) + settlement.amount }
              });

              // Reverse settlement journal entries
              await reverseJournalEntriesForRef(actionLog.recordId, userId, tx);

              localUndoResult = { type: 'settlement_reverted', recordId: actionLog.recordId };
            }
          }
        }

        // ── LOAN CLOSE (Online) ───────────────────────────────────────────────
        else if (actionLog.module === 'LOAN_CLOSE' || actionLog.module === 'LOAN') {
          if (actionLog.actionType === 'CLOSE' && previousData) {
            await tx.loanApplication.update({
              where: { id: actionLog.recordId },
              data: { status: previousData.status || 'ACTIVE' }
            });

            // Reverse writeoff / foreclosure journal entries
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
              if (expense.isApproved) {
                // Revert bank/cash balance
                if (expense.payeeName === 'BANK' && expense.paymentReference) {
                  const bank = await tx.bankAccount.findUnique({ where: { id: expense.paymentReference } });
                  if (bank) {
                    await tx.bankAccount.update({ where: { id: bank.id }, data: { currentBalance: { increment: expense.amount } } });
                    await tx.bankTransaction.create({
                      data: {
                        bankAccountId: bank.id, transactionType: 'CREDIT', amount: expense.amount,
                        balanceAfter: bank.currentBalance + expense.amount,
                        description: `[UNDO] Reversal of Expense: ${expense.description}`,
                        referenceType: 'UNDO_REVERSAL', referenceId: `${expense.id}-REV`, createdById: userId
                      }
                    });
                  }
                } else {
                  const cashBook = await tx.cashBook.findUnique({ where: { companyId: expense.companyId } });
                  if (cashBook) {
                    await tx.cashBook.update({ where: { companyId: expense.companyId }, data: { currentBalance: { increment: expense.amount } } });
                    await tx.cashBookEntry.create({
                      data: {
                        cashBookId: cashBook.id, entryType: 'CREDIT', amount: expense.amount,
                        balanceAfter: cashBook.currentBalance + expense.amount,
                        description: `[UNDO] Reversal of Expense: ${expense.description}`,
                        referenceType: 'UNDO_REVERSAL', referenceId: `${expense.id}-REV`, createdById: userId
                      }
                    });
                  }
                }
                // Reverse journal entries
                await reverseJournalEntriesForRef(expense.id, userId, tx);
              }
              // Mark expense as rejected
              await tx.expense.update({
                where: { id: expense.id },
                data: { categoryId: 'REJECTED', isApproved: false }
              });

              localUndoResult = { type: 'expense_reverted', recordId: actionLog.recordId };
            }
          }
        }

        // ── CREDIT TRANSFER ──────────────────────────────────────────────────
        else if (actionLog.module === 'CREDIT_TRANSFER') {
          if (actionLog.actionType === 'TRANSFER' && newData) {
            const amount = newData.amount;
            const creditType = newData.creditType;

            if (newData.toUserId) {
              // User-to-user reversal
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
                await tx.creditTransaction.create({
                  data: {
                    userId: newData.toUserId,
                    transactionType: 'CREDIT_DECREASE',
                    amount: -amount,
                    paymentMode: newData.paymentMode || 'CASH',
                    creditType: creditType,
                    companyBalanceAfter: creditType === 'COMPANY' ? toUser.companyCredit - amount : toUser.companyCredit,
                    personalBalanceAfter: creditType === 'PERSONAL' ? toUser.personalCredit - amount : toUser.personalCredit,
                    balanceAfter: toUser.credit - amount,
                    sourceType: 'CREDIT_TRANSFER_REVERSAL',
                    description: `[UNDO] Transfer reversal to sender`,
                    transactionDate: new Date()
                  }
                });
              }

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
                await tx.creditTransaction.create({
                  data: {
                    userId: actionLog.recordId,
                    transactionType: 'CREDIT_INCREASE',
                    amount: amount,
                    paymentMode: newData.paymentMode || 'CASH',
                    creditType: creditType,
                    companyBalanceAfter: creditType === 'COMPANY' ? fromUser.companyCredit + amount : fromUser.companyCredit,
                    personalBalanceAfter: creditType === 'PERSONAL' ? fromUser.personalCredit + amount : fromUser.personalCredit,
                    balanceAfter: fromUser.credit + amount,
                    sourceType: 'CREDIT_TRANSFER_REVERSAL',
                    description: `[UNDO] Transfer reversal from receiver`,
                    transactionDate: new Date()
                  }
                });
              }

              localUndoResult = { type: 'credit_transfer_reverted', recordId: actionLog.recordId };
            } else if (newData.bankAccountId) {
              // User-to-bank reversal
              const bank = await tx.bankAccount.findUnique({ where: { id: newData.bankAccountId } });
              if (bank) {
                await tx.bankAccount.update({
                  where: { id: newData.bankAccountId },
                  data: { currentBalance: { decrement: amount } }
                });
                await tx.bankTransaction.create({
                  data: {
                    bankAccountId: newData.bankAccountId,
                    transactionType: 'DEBIT',
                    amount: amount,
                    balanceAfter: bank.currentBalance - amount,
                    description: `[UNDO] Reversal of credit deposit to bank`,
                    referenceType: 'CREDIT_TRANSFER',
                    referenceId: `CREDIT-TRANSFER-${actionLog.recordId}-REV`,
                    createdById: userId,
                    transactionDate: new Date()
                  }
                });
              }

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
                await tx.creditTransaction.create({
                  data: {
                    userId: actionLog.recordId,
                    transactionType: 'CREDIT_INCREASE',
                    amount: amount,
                    paymentMode: 'BANK_TRANSFER',
                    creditType: creditType,
                    companyBalanceAfter: creditType === 'COMPANY' ? fromUser.companyCredit + amount : fromUser.companyCredit,
                    personalBalanceAfter: creditType === 'PERSONAL' ? fromUser.personalCredit + amount : fromUser.personalCredit,
                    balanceAfter: fromUser.credit + amount,
                    sourceType: 'BANK_DEPOSIT_REVERSAL',
                    description: `[UNDO] Reversal of bank deposit`,
                    transactionDate: new Date()
                  }
                });
              }

              localUndoResult = { type: 'credit_deposit_reverted', recordId: actionLog.recordId };
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

      const newData = actionLog.newData ? JSON.parse(actionLog.newData) : null;
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
