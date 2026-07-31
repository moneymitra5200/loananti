import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService } from '@/lib/accounting-service';

async function deleteDaybookEntriesForRef(refId: string, tx: any) {
  try {
    const entries = await tx.daybookEntry.findMany({
      where: {
        OR: [
          { referenceId: refId },
          { referenceId: { startsWith: refId } },
          { referenceId: { contains: refId } },
          { sourceType: refId },
          { sourceId: refId },
          { sourceId: { startsWith: refId } },
          { sourceId: { contains: refId } }
        ]
      }
    });

    console.log(`[Undo Daybook] Found ${entries.length} daybook entries to delete for refId: ${refId}`);

    for (const entry of entries) {
      // Revert account head balance
      const balanceChange = entry.debit - entry.credit;
      await tx.accountHead.update({
        where: { id: entry.accountHeadId },
        data: {
          currentBalance: { decrement: balanceChange }
        }
      });

      // Delete daybook entry
      await tx.daybookEntry.delete({
        where: { id: entry.id }
      });
      console.log(`[Undo Daybook] Deleted daybook entry ${entry.entryNumber} and reverted account head balance by ${balanceChange}`);
    }
  } catch (err) {
    console.error('[Undo Daybook] Error deleting daybook entries:', err);
    throw err;
  }
}

async function reverseJournalEntriesForRef(refId: string, userId: string, tx: any) {
  try {
    // Revert and delete Daybook entries matching this reference/source ID
    await deleteDaybookEntriesForRef(refId, tx);

    const originalEntries = await tx.journalEntry.findMany({
      where: {
        OR: [
          { referenceId: refId },
          { referenceId: { startsWith: refId } },
          { referenceId: { contains: refId } }
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

      console.log(`[Undo Delete] Reversals completed for journal entry ${originalEntry.entryNumber}`);
    }
  } catch (err) {
    console.error('[Undo Delete] Error deleting journal entries:', err);
    throw err;
  }
}

async function deleteBankOrCashEntriesForRef(refId: string, tx: any) {
  try {
    // Revert and delete Daybook entries matching this reference/source ID
    await deleteDaybookEntriesForRef(refId, tx);

    // 1. Revert and delete BankTransactions
    const bankTransactions = await tx.bankTransaction.findMany({
      where: {
        OR: [
          { referenceId: refId },
          { referenceId: { startsWith: refId } },
          { referenceId: { contains: refId } }
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
          { referenceId: { startsWith: refId } },
          { referenceId: { contains: refId } }
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
        createdAt: { gte: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) } // last 10 days
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

function salvageJson(str: string | null): any {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.warn('[ActionLog Salvage] Failed to parse JSON, attempting salvage. Raw:', str);
    const obj: any = {};
    const stringRegex = /"([^"]+)"\s*:\s*"([^"]*)"/g;
    let match;
    while ((match = stringRegex.exec(str)) !== null) {
      obj[match[1]] = match[2];
    }
    const numRegex = /"([^"]+)"\s*:\s*(-?\d+(?:\.\d+)?)/g;
    while ((match = numRegex.exec(str)) !== null) {
      obj[match[1]] = Number(match[2]);
    }
    const boolRegex = /"([^"]+)"\s*:\s*(true|false)/g;
    while ((match = boolRegex.exec(str)) !== null) {
      obj[match[1]] = match[2] === 'true';
    }
    const nullRegex = /"([^"]+)"\s*:\s*(null)/g;
    while ((match = nullRegex.exec(str)) !== null) {
      obj[match[1]] = null;
    }
    const truncatedMatch = str.match(/"([^"]+)"\s*:\s*"([^"]*)$/);
    if (truncatedMatch) {
      obj[truncatedMatch[1]] = truncatedMatch[2];
    }
    return Object.keys(obj).length > 0 ? obj : null;
  }
}

// PUT - Undo or Redo an action
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, actionLogId, userId } = body;

    if (!actionLogId || !userId) {
      return NextResponse.json({ error: 'actionLogId and userId are required' }, { status: 400 });
    }

    // Verify user identity & role from DB (prevent role-spoofing in request body)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const realUserRole = user.role;

    const actionLog = await db.actionLog.findUnique({ where: { id: actionLogId } });
    if (!actionLog) {
      return NextResponse.json({ error: 'Action log not found' }, { status: 404 });
    }

    // Ownership check — Super Admin & Admin can undo anyone's actions; staff can only undo their own
    const userRoleStr = (realUserRole as string) || '';
    if (userRoleStr !== 'SUPER_ADMIN' && userRoleStr !== 'ADMIN' && actionLog.userId !== userId) {
      return NextResponse.json({ error: 'You can only undo/redo your own actions' }, { status: 403 });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // UNDO ACTION
    // ────────────────────────────────────────────────────────────────────────────
    if (action === 'undo') {
      if (!actionLog.canUndo || actionLog.isUndone) {
        return NextResponse.json({ error: 'This action cannot be undone' }, { status: 400 });
      }

      const previousData = salvageJson(actionLog.previousData);
      const newData = salvageJson(actionLog.newData);
      const undoResult = await db.$transaction(async (tx) => {
        let localUndoResult: { type: string; recordId: string; detail?: string } | null = null;
        // ── OFFLINE LOAN ─────────────────────────────────────────────────────────
        if (actionLog.module === 'OFFLINE_LOAN') {
          // CREATE → fully delete the loan + mirror + accounting
          if (actionLog.actionType === 'CREATE') {
            const loan = await tx.offlineLoan.findUnique({ where: { id: actionLog.recordId } });
            if (!loan) throw new Error('Loan not found');

            // Fetch everything before delete so REDO can restore it
            const originalEmis = await tx.offlineLoanEMI.findMany({ where: { offlineLoanId: actionLog.recordId } });
            const originalGold = await tx.goldLoanDetail.findFirst({ where: { offlineLoanId: actionLog.recordId } });
            const originalVehicle = await tx.vehicleLoanDetail.findFirst({ where: { offlineLoanId: actionLog.recordId } });

            // 1. Find and clean up mirror loan mapping + mirror loan
            const mirrorMapping = await tx.mirrorLoanMapping.findFirst({
              where: { originalLoanId: actionLog.recordId }
            });

            let mirrorMappingData: any = null;
            let mirrorLoanData: any = null;
            let mirrorEmisData: any[] = [];
            let mirrorGoldData: any = null;
            let mirrorVehicleData: any = null;

            if (mirrorMapping) {
              mirrorMappingData = mirrorMapping;
              if (mirrorMapping.mirrorLoanId) {
                mirrorLoanData = await tx.offlineLoan.findUnique({ where: { id: mirrorMapping.mirrorLoanId } });
                if (mirrorLoanData) {
                  mirrorEmisData = await tx.offlineLoanEMI.findMany({ where: { offlineLoanId: mirrorMapping.mirrorLoanId } });
                  mirrorGoldData = await tx.goldLoanDetail.findFirst({ where: { offlineLoanId: mirrorMapping.mirrorLoanId } });
                  mirrorVehicleData = await tx.vehicleLoanDetail.findFirst({ where: { offlineLoanId: mirrorMapping.mirrorLoanId } });
                }
              }
            }

            const deletePayload = {
              loan: {
                ...loan,
                emis: originalEmis,
                goldLoanDetail: originalGold || null,
                vehicleLoanDetail: originalVehicle || null
              },
              mirrorMapping: mirrorMappingData,
              mirrorLoan: mirrorLoanData ? {
                ...mirrorLoanData,
                emis: mirrorEmisData,
                goldLoanDetail: mirrorGoldData || null,
                vehicleLoanDetail: mirrorVehicleData || null
              } : null
            };

            // Save this serialized data into actionLog.previousData
            await tx.actionLog.update({
              where: { id: actionLog.id },
              data: {
                previousData: JSON.stringify(deletePayload)
              }
            });

            if (mirrorMapping) {
              if (mirrorMapping.mirrorLoanId) {
                // ── Reverse accrual entries for mirror EMIs ──
                const mirrorEmiIds = (await tx.offlineLoanEMI.findMany({
                  where: { offlineLoanId: mirrorMapping.mirrorLoanId },
                  select: { id: true }
                })).map(e => e.id);

                for (const emiId of mirrorEmiIds) {
                  await reverseJournalEntriesForRef(emiId, userId, tx);
                }

                // Delete mirror EMIs
                await tx.offlineLoanEMI.deleteMany({ where: { offlineLoanId: mirrorMapping.mirrorLoanId } });
                
                // Delete mirror loan bank/cash transactions & revert balances
                await deleteBankOrCashEntriesForRef(mirrorMapping.mirrorLoanId, tx);
                
                // Delete mirror loan journal entries (disbursement etc)
                await reverseJournalEntriesForRef(mirrorMapping.mirrorLoanId, userId, tx);

                // Delete mirror loan record
                await tx.offlineLoan.delete({ where: { id: mirrorMapping.mirrorLoanId } });
              }
              await tx.mirrorLoanMapping.delete({ where: { id: mirrorMapping.id } });
            }

            // 2. Delete original loan bank/cash transactions & revert balances
            await deleteBankOrCashEntriesForRef(actionLog.recordId, tx);

            // 3. ── Reverse accrual entries for original EMIs ──
            //    Accrual journal entries use referenceId = emi.id (NOT loanId),
            //    so we must find each EMI ID and reverse its accrual entries.
            const originalEmiIds = (await tx.offlineLoanEMI.findMany({
              where: { offlineLoanId: actionLog.recordId },
              select: { id: true }
            })).map(e => e.id);

            for (const emiId of originalEmiIds) {
              await reverseJournalEntriesForRef(emiId, userId, tx);
            }

            // 4. Delete EMIs, journal entries (disbursement etc), and original loan record
            await tx.offlineLoanEMI.deleteMany({ where: { offlineLoanId: actionLog.recordId } });
            await reverseJournalEntriesForRef(actionLog.recordId, userId, tx);
            await tx.offlineLoan.delete({ where: { id: actionLog.recordId } });

            // Revert global sequence number if it was the last generated sequence
            const seqMatch = loan.loanNumber.match(/-(\d+)$/);
            if (seqMatch) {
              const loanSeq = parseInt(seqMatch[1], 10);
              const seqRecord = await tx.loanSequence.findFirst();
              if (seqRecord && seqRecord.currentSequence === loanSeq) {
                await tx.loanSequence.update({
                  where: { id: seqRecord.id },
                  data: { currentSequence: { decrement: 1 } }
                });
                console.log(`[Undo Sequence] Reverted global loan sequence to ${seqRecord.currentSequence - 1} because loan ${loan.loanNumber} (sequence: ${loanSeq}) was deleted via undo`);
              }
            }

            localUndoResult = { type: 'loan_creation_deleted', recordId: actionLog.recordId, detail: `Loan ${loan.loanNumber} and all its accounting entries (including accruals) were completely deleted` };
          }

          // DELETE → restore loan to ACTIVE (and recreate structural data if hard-deleted)
          else if (actionLog.actionType === 'DELETE' && previousData) {
            if (previousData.loan) {
              const loanData = previousData.loan;
              const { 
                emis, 
                goldLoanDetail, 
                vehicleLoanDetail, 
                company, 
                customer, 
                creator, 
                ...loanFields 
              } = loanData;

              // Recreate original loan
              await tx.offlineLoan.create({
                data: {
                  ...loanFields,
                  disbursementDate: loanFields.disbursementDate ? new Date(loanFields.disbursementDate) : null,
                  startDate: loanFields.startDate ? new Date(loanFields.startDate) : null,
                  interestOnlyStartDate: loanFields.interestOnlyStartDate ? new Date(loanFields.interestOnlyStartDate) : null,
                  loanStartedAt: loanFields.loanStartedAt ? new Date(loanFields.loanStartedAt) : null,
                  closedAt: loanFields.closedAt ? new Date(loanFields.closedAt) : null,
                  createdAt: loanFields.createdAt ? new Date(loanFields.createdAt) : undefined,
                  updatedAt: loanFields.updatedAt ? new Date(loanFields.updatedAt) : undefined,
                }
              });

              // Recreate EMIs
              if (emis && Array.isArray(emis)) {
                for (const emi of emis) {
                  const { offlineLoan: _ol, collector: _col, ...emiFields } = emi;
                  await tx.offlineLoanEMI.create({
                    data: {
                      ...emiFields,
                      dueDate: emiFields.dueDate ? new Date(emiFields.dueDate) : null,
                      paidDate: emiFields.paidDate ? new Date(emiFields.paidDate) : null,
                      collectedAt: emiFields.collectedAt ? new Date(emiFields.collectedAt) : null,
                      reminderSentAt: emiFields.reminderSentAt ? new Date(emiFields.reminderSentAt) : null,
                      originalDueDate: emiFields.originalDueDate ? new Date(emiFields.originalDueDate) : null,
                      interestOnlyPaidAt: emiFields.interestOnlyPaidAt ? new Date(emiFields.interestOnlyPaidAt) : null,
                      nextPaymentDate: emiFields.nextPaymentDate ? new Date(emiFields.nextPaymentDate) : null,
                      createdAt: emiFields.createdAt ? new Date(emiFields.createdAt) : undefined,
                      updatedAt: emiFields.updatedAt ? new Date(emiFields.updatedAt) : undefined,
                    }
                  });
                }
              }

              // Recreate gold details
              if (goldLoanDetail) {
                const { loanApplication, offlineLoan: _ol, ...goldFields } = goldLoanDetail;
                await tx.goldLoanDetail.create({
                  data: {
                    ...goldFields,
                    verificationDate: goldFields.verificationDate ? new Date(goldFields.verificationDate) : null,
                    createdAt: goldFields.createdAt ? new Date(goldFields.createdAt) : undefined,
                    updatedAt: goldFields.updatedAt ? new Date(goldFields.updatedAt) : undefined,
                  }
                });
              }

              // Recreate vehicle details
              if (vehicleLoanDetail) {
                const { loanApplication, offlineLoan: _ol, ...vehicleFields } = vehicleLoanDetail;
                await tx.vehicleLoanDetail.create({
                  data: {
                    ...vehicleFields,
                    verificationDate: vehicleFields.verificationDate ? new Date(vehicleFields.verificationDate) : null,
                    createdAt: vehicleFields.createdAt ? new Date(vehicleFields.createdAt) : undefined,
                    updatedAt: vehicleFields.updatedAt ? new Date(vehicleFields.updatedAt) : undefined,
                  }
                });
              }

              // Recreate mirror mapping
              const mirrorMapping = previousData.mirrorMapping;
              if (mirrorMapping) {
                const { mirrorCompany, originalCompany, ...mappingFields } = mirrorMapping;
                await tx.mirrorLoanMapping.create({
                  data: {
                    ...mappingFields,
                    mirrorCompletedAt: mappingFields.mirrorCompletedAt ? new Date(mappingFields.mirrorCompletedAt) : null,
                    createdAt: mappingFields.createdAt ? new Date(mappingFields.createdAt) : undefined,
                    updatedAt: mappingFields.updatedAt ? new Date(mappingFields.updatedAt) : undefined,
                  }
                });
              }

              // Recreate mirror loan and its EMIs/details
              const mirrorLoan = previousData.mirrorLoan;
              if (mirrorLoan) {
                const {
                  emis: mirrorEmis,
                  goldLoanDetail: mirrorGold,
                  vehicleLoanDetail: mirrorVehicle,
                  company: _c,
                  customer: _cu,
                  creator: _cr,
                  ...mirrorFields
                } = mirrorLoan;

                await tx.offlineLoan.create({
                  data: {
                    ...mirrorFields,
                    disbursementDate: mirrorFields.disbursementDate ? new Date(mirrorFields.disbursementDate) : null,
                    startDate: mirrorFields.startDate ? new Date(mirrorFields.startDate) : null,
                    interestOnlyStartDate: mirrorFields.interestOnlyStartDate ? new Date(mirrorFields.interestOnlyStartDate) : null,
                    loanStartedAt: mirrorFields.loanStartedAt ? new Date(mirrorFields.loanStartedAt) : null,
                    closedAt: mirrorFields.closedAt ? new Date(mirrorFields.closedAt) : null,
                    createdAt: mirrorFields.createdAt ? new Date(mirrorFields.createdAt) : undefined,
                    updatedAt: mirrorFields.updatedAt ? new Date(mirrorFields.updatedAt) : undefined,
                  }
                });

                if (mirrorEmis && Array.isArray(mirrorEmis)) {
                  for (const emi of mirrorEmis) {
                    const { offlineLoan: _ol, collector: _col, ...emiFields } = emi;
                    await tx.offlineLoanEMI.create({
                      data: {
                        ...emiFields,
                        dueDate: emiFields.dueDate ? new Date(emiFields.dueDate) : null,
                        paidDate: emiFields.paidDate ? new Date(emiFields.paidDate) : null,
                        collectedAt: emiFields.collectedAt ? new Date(emiFields.collectedAt) : null,
                        reminderSentAt: emiFields.reminderSentAt ? new Date(emiFields.reminderSentAt) : null,
                        originalDueDate: emiFields.originalDueDate ? new Date(emiFields.originalDueDate) : null,
                        interestOnlyPaidAt: emiFields.interestOnlyPaidAt ? new Date(emiFields.interestOnlyPaidAt) : null,
                        nextPaymentDate: emiFields.nextPaymentDate ? new Date(emiFields.nextPaymentDate) : null,
                        createdAt: emiFields.createdAt ? new Date(emiFields.createdAt) : undefined,
                        updatedAt: emiFields.updatedAt ? new Date(emiFields.updatedAt) : undefined,
                      }
                    });
                  }
                }

                if (mirrorGold) {
                  const { loanApplication, offlineLoan: _ol, ...goldFields } = mirrorGold;
                  await tx.goldLoanDetail.create({
                    data: {
                      ...goldFields,
                      verificationDate: goldFields.verificationDate ? new Date(goldFields.verificationDate) : null,
                      createdAt: goldFields.createdAt ? new Date(goldFields.createdAt) : undefined,
                      updatedAt: goldFields.updatedAt ? new Date(goldFields.updatedAt) : undefined,
                    }
                  });
                }

                if (mirrorVehicle) {
                  const { loanApplication, offlineLoan: _ol, ...vehicleFields } = mirrorVehicle;
                  await tx.vehicleLoanDetail.create({
                    data: {
                      ...vehicleFields,
                      verificationDate: vehicleFields.verificationDate ? new Date(vehicleFields.verificationDate) : null,
                      createdAt: vehicleFields.createdAt ? new Date(vehicleFields.createdAt) : undefined,
                      updatedAt: vehicleFields.updatedAt ? new Date(vehicleFields.updatedAt) : undefined,
                    }
                  });
                }
              }

              localUndoResult = { type: 'loan_recreated', recordId: actionLog.recordId, detail: 'Loan and all its structural relations restored successfully' };
            } else {
              // Fallback for old format
              const existingLoan = await tx.offlineLoan.findUnique({
                where: { id: actionLog.recordId }
              });
              if (existingLoan) {
                await tx.offlineLoan.update({
                  where: { id: actionLog.recordId },
                  data: { status: previousData.status || 'ACTIVE' }
                });
                localUndoResult = { type: 'loan_restored', recordId: actionLog.recordId };
              } else {
                const {
                  emis,
                  goldLoanDetail,
                  vehicleLoanDetail,
                  company,
                  customer,
                  creator,
                  ...loanFields
                } = previousData;
                await tx.offlineLoan.create({
                  data: {
                    ...loanFields,
                    id: actionLog.recordId,
                    disbursementDate: loanFields.disbursementDate ? new Date(loanFields.disbursementDate) : null,
                    startDate: loanFields.startDate ? new Date(loanFields.startDate) : null,
                    interestOnlyStartDate: loanFields.interestOnlyStartDate ? new Date(loanFields.interestOnlyStartDate) : null,
                    loanStartedAt: loanFields.loanStartedAt ? new Date(loanFields.loanStartedAt) : null,
                    closedAt: loanFields.closedAt ? new Date(loanFields.closedAt) : null,
                    createdAt: loanFields.createdAt ? new Date(loanFields.createdAt) : undefined,
                    updatedAt: loanFields.updatedAt ? new Date(loanFields.updatedAt) : undefined,
                  }
                });

                // Recreate EMIs
                if (emis && Array.isArray(emis)) {
                  for (const emi of emis) {
                    const { offlineLoan: _ol, collector: _col, ...emiFields } = emi;
                    await tx.offlineLoanEMI.create({
                      data: {
                        ...emiFields,
                        dueDate: emiFields.dueDate ? new Date(emiFields.dueDate) : null,
                        paidDate: emiFields.paidDate ? new Date(emiFields.paidDate) : null,
                        collectedAt: emiFields.collectedAt ? new Date(emiFields.collectedAt) : null,
                        reminderSentAt: emiFields.reminderSentAt ? new Date(emiFields.reminderSentAt) : null,
                        originalDueDate: emiFields.originalDueDate ? new Date(emiFields.originalDueDate) : null,
                        interestOnlyPaidAt: emiFields.interestOnlyPaidAt ? new Date(emiFields.interestOnlyPaidAt) : null,
                        nextPaymentDate: emiFields.nextPaymentDate ? new Date(emiFields.nextPaymentDate) : null,
                        createdAt: emiFields.createdAt ? new Date(emiFields.createdAt) : undefined,
                        updatedAt: emiFields.updatedAt ? emiFields.updatedAt ? new Date(emiFields.updatedAt) : undefined : undefined,
                      }
                    });
                  }
                }

                // Recreate gold details
                if (goldLoanDetail) {
                  const { loanApplication, offlineLoan: _ol, ...goldFields } = goldLoanDetail;
                  await tx.goldLoanDetail.create({
                    data: {
                      ...goldFields,
                      verificationDate: goldFields.verificationDate ? new Date(goldFields.verificationDate) : null,
                      createdAt: goldFields.createdAt ? new Date(goldFields.createdAt) : undefined,
                      updatedAt: goldFields.updatedAt ? new Date(goldFields.updatedAt) : undefined,
                    }
                  });
                }

                // Recreate vehicle details
                if (vehicleLoanDetail) {
                  const { loanApplication, offlineLoan: _ol, ...vehicleFields } = vehicleLoanDetail;
                  await tx.vehicleLoanDetail.create({
                    data: {
                      ...vehicleFields,
                      verificationDate: vehicleFields.verificationDate ? new Date(vehicleFields.verificationDate) : null,
                      createdAt: vehicleFields.createdAt ? new Date(vehicleFields.createdAt) : undefined,
                      updatedAt: vehicleFields.updatedAt ? new Date(vehicleFields.updatedAt) : undefined,
                    }
                  });
                }

                // Recreate mirror mapping
                const mirrorMapping = previousData.mirrorMapping;
                if (mirrorMapping) {
                  const { mirrorCompany, originalCompany, ...mappingFields } = mirrorMapping;
                  await tx.mirrorLoanMapping.create({
                    data: {
                      ...mappingFields,
                      mirrorCompletedAt: mappingFields.mirrorCompletedAt ? new Date(mappingFields.mirrorCompletedAt) : null,
                      createdAt: mappingFields.createdAt ? new Date(mappingFields.createdAt) : undefined,
                      updatedAt: mappingFields.updatedAt ? new Date(mappingFields.updatedAt) : undefined,
                    }
                  });
                }

                // Recreate mirror loan
                const mirrorLoan = previousData.mirrorLoan;
                if (mirrorLoan) {
                  const {
                    emis: mirrorEmis,
                    goldLoanDetail: mirrorGold,
                    vehicleLoanDetail: mirrorVehicle,
                    company: _c,
                    customer: _cu,
                    creator: _cr,
                    ...mirrorFields
                  } = mirrorLoan;

                  await tx.offlineLoan.create({
                    data: {
                      ...mirrorFields,
                      disbursementDate: mirrorFields.disbursementDate ? new Date(mirrorFields.disbursementDate) : null,
                      startDate: mirrorFields.startDate ? new Date(mirrorFields.startDate) : null,
                      interestOnlyStartDate: mirrorFields.interestOnlyStartDate ? new Date(mirrorFields.interestOnlyStartDate) : null,
                      loanStartedAt: mirrorFields.loanStartedAt ? new Date(mirrorFields.loanStartedAt) : null,
                      closedAt: mirrorFields.closedAt ? new Date(mirrorFields.closedAt) : null,
                      createdAt: mirrorFields.createdAt ? new Date(mirrorFields.createdAt) : undefined,
                      updatedAt: mirrorFields.updatedAt ? new Date(mirrorFields.updatedAt) : undefined,
                    }
                  });

                  if (mirrorEmis && Array.isArray(mirrorEmis)) {
                    for (const emi of mirrorEmis) {
                      const { offlineLoan: _ol, collector: _col, ...emiFields } = emi;
                      await tx.offlineLoanEMI.create({
                        data: {
                          ...emiFields,
                          dueDate: emiFields.dueDate ? new Date(emiFields.dueDate) : null,
                          paidDate: emiFields.paidDate ? new Date(emiFields.paidDate) : null,
                          collectedAt: emiFields.collectedAt ? new Date(emiFields.collectedAt) : null,
                          reminderSentAt: emiFields.reminderSentAt ? new Date(emiFields.reminderSentAt) : null,
                          originalDueDate: emiFields.originalDueDate ? new Date(emiFields.originalDueDate) : null,
                          interestOnlyPaidAt: emiFields.interestOnlyPaidAt ? new Date(emiFields.interestOnlyPaidAt) : null,
                          nextPaymentDate: emiFields.nextPaymentDate ? new Date(emiFields.nextPaymentDate) : null,
                          createdAt: emiFields.createdAt ? new Date(emiFields.createdAt) : undefined,
                          updatedAt: emiFields.updatedAt ? new Date(emiFields.updatedAt) : undefined,
                        }
                      });
                    }
                  }

                  if (mirrorGold) {
                    const { loanApplication, offlineLoan: _ol, ...goldFields } = mirrorGold;
                    await tx.goldLoanDetail.create({
                      data: {
                        ...goldFields,
                        verificationDate: goldFields.verificationDate ? new Date(goldFields.verificationDate) : null,
                        createdAt: goldFields.createdAt ? new Date(goldFields.createdAt) : undefined,
                        updatedAt: goldFields.updatedAt ? new Date(goldFields.updatedAt) : undefined,
                      }
                    });
                  }

                  if (mirrorVehicle) {
                    const { loanApplication, offlineLoan: _ol, ...vehicleFields } = mirrorVehicle;
                    await tx.vehicleLoanDetail.create({
                      data: {
                        ...vehicleFields,
                        verificationDate: vehicleFields.verificationDate ? new Date(vehicleFields.verificationDate) : null,
                        createdAt: vehicleFields.createdAt ? new Date(vehicleFields.createdAt) : undefined,
                        updatedAt: vehicleFields.updatedAt ? new Date(vehicleFields.updatedAt) : undefined,
                      }
                    });
                  }
                }

                localUndoResult = { type: 'loan_recreated_fallback', recordId: actionLog.recordId, detail: 'Loan and all child records recreated successfully from fallback previousData.' };
              }
            }
          }

          // UPDATE → revert fields to previous state
          else if (actionLog.actionType === 'UPDATE' && previousData) {
            if (previousData.action === 'LOAN_STARTED') {
              // 1. Revert original loan
              await tx.offlineLoan.update({
                where: { id: actionLog.recordId },
                data: {
                  status: previousData.status || 'ACTIVE',
                  tenure: previousData.tenure ?? 0,
                  interestRate: previousData.interestRate,
                  interestType: previousData.interestType,
                  emiAmount: previousData.emiAmount,
                  isInterestOnlyLoan: previousData.isInterestOnlyLoan !== undefined ? previousData.isInterestOnlyLoan : false,
                  partialPaymentEnabled: previousData.partialPaymentEnabled ?? false,
                  processingFee: previousData.processingFee ?? 0,
                  processingFeeRecorded: previousData.processingFeeRecorded ?? false,
                  bankAccountId: previousData.bankAccountId,
                  secondaryPaymentPageId: previousData.secondaryPaymentPageId,
                }
              });

              // 2. Re-create Interest Only placeholder EMI for original loan (only if it was interest-only)
              if (previousData.isInterestOnlyLoan === true) {
                await tx.offlineLoanEMI.deleteMany({ where: { offlineLoanId: actionLog.recordId } });
                
                const originalLoan = await tx.offlineLoan.findUnique({
                  where: { id: actionLog.recordId },
                  select: { disbursementDate: true, loanAmount: true, loanNumber: true, interestOnlyMonthlyAmount: true }
                });
                if (originalLoan) {
                  const monthlyInterestAmount = originalLoan.interestOnlyMonthlyAmount || previousData.emiAmount || 0;
                  const _d = originalLoan.disbursementDate ? new Date(originalLoan.disbursementDate) : new Date();
                  const _year  = _d.getMonth() === 11 ? _d.getFullYear() + 1 : _d.getFullYear();
                  const _month = (_d.getMonth() + 1) % 12;
                  const _lastDay = new Date(_year, _month + 1, 0).getDate();
                  const _day   = Math.min(_d.getDate(), _lastDay);
                  const dueDate = new Date(_year, _month, _day, 0, 0, 0, 0);
                  await tx.offlineLoanEMI.create({
                    data: {
                      offlineLoanId: actionLog.recordId,
                      installmentNumber: 1,
                      dueDate,
                      originalDueDate: dueDate,
                      principalAmount: 0,
                      interestAmount: monthlyInterestAmount,
                      totalAmount: monthlyInterestAmount,
                      outstandingPrincipal: originalLoan.loanAmount,
                      paymentStatus: 'PENDING',
                      isInterestOnly: true,
                      interestOnlyAmount: monthlyInterestAmount
                    }
                  });
                }
              }

              // 3. Delete processing fee bank/cash transactions for original loan
              //    (referenceId is loanId, referenceType is PROCESSING_FEE)
              await deleteBankOrCashEntriesForRef(actionLog.recordId, tx);

              // 4. Delete processing fee journal entries for original loan
              //    (referencing loanId with PROCESSING_FEE)
              await reverseJournalEntriesForRef(actionLog.recordId, userId, tx);

              // 5. Revert mirror mapping
              if (previousData.mirrorMappingId) {
                await tx.mirrorLoanMapping.update({
                  where: { id: previousData.mirrorMappingId },
                  data: {
                    mirrorTenure: previousData.mirrorTenure,
                    originalTenure: previousData.tenure,
                    mirrorProcessingFee: previousData.mirrorProcessingFee,
                    processingFeeRecorded: previousData.mirrorProcessingFeeRecorded ?? false,
                    extraEMIPaymentPageId: previousData.secondaryPaymentPageId,
                  }
                });
              }

              // 6. Revert mirror loan + recreate its interest only placeholder EMI
              if (previousData.mirrorLoanId) {
                await tx.offlineLoan.update({
                  where: { id: previousData.mirrorLoanId },
                  data: {
                    status: previousData.mirrorStatus || 'ACTIVE',
                    tenure: previousData.mirrorLoanTenure ?? 0,
                    interestRate: previousData.mirrorInterestRate,
                    interestType: previousData.mirrorInterestType,
                    emiAmount: previousData.mirrorEmiAmount,
                    isInterestOnlyLoan: previousData.mirrorIsInterestOnlyLoan !== undefined ? previousData.mirrorIsInterestOnlyLoan : false,
                    partialPaymentEnabled: previousData.mirrorPartialPaymentEnabled ?? false,
                    processingFee: previousData.mirrorProcessingFeeValue ?? 0,
                  }
                });

                if (previousData.mirrorIsInterestOnlyLoan === true) {
                  await tx.offlineLoanEMI.deleteMany({ where: { offlineLoanId: previousData.mirrorLoanId } });

                  const mirrorLoan = await tx.offlineLoan.findUnique({
                    where: { id: previousData.mirrorLoanId },
                    select: { disbursementDate: true, loanAmount: true, interestRate: true, interestOnlyMonthlyAmount: true }
                  });
                  if (mirrorLoan) {
                    const monthlyMirrorInterest = mirrorLoan.interestOnlyMonthlyAmount || Math.round((mirrorLoan.loanAmount * (mirrorLoan.interestRate || 0) / 100 / 12) * 100) / 100;
                    const firstDueDate = mirrorLoan.disbursementDate ? new Date(mirrorLoan.disbursementDate) : new Date();
                    firstDueDate.setMonth(firstDueDate.getMonth() + 1);
                    firstDueDate.setDate(mirrorLoan.disbursementDate ? new Date(mirrorLoan.disbursementDate).getDate() : new Date().getDate());
                    firstDueDate.setHours(0, 0, 0, 0);
                    await tx.offlineLoanEMI.create({
                      data: {
                        offlineLoanId: previousData.mirrorLoanId,
                        installmentNumber: 1,
                        dueDate: firstDueDate,
                        originalDueDate: firstDueDate,
                        principalAmount: 0,
                        interestAmount: monthlyMirrorInterest,
                        totalAmount: monthlyMirrorInterest,
                        outstandingPrincipal: mirrorLoan.loanAmount,
                        paymentStatus: 'PENDING',
                        isInterestOnly: true,
                        interestOnlyAmount: monthlyMirrorInterest,
                      }
                    });
                  }
                }

                // 7. Delete mirror processing fee journal entries in mirror company
                //    (referencing mirrorLoanId with PROCESSING_FEE)
                await deleteBankOrCashEntriesForRef(previousData.mirrorLoanId, tx);
                await reverseJournalEntriesForRef(previousData.mirrorLoanId, userId, tx);
              }

              localUndoResult = {
                type: 'loan_started_reverted',
                recordId: actionLog.recordId,
                detail: `Loan start reversed: reverted to Interest Only phase and removed processing fee entries.`
              };
            } else {
              const { id: _id, createdAt: _c, updatedAt: _u, ...safeFields } = previousData;
              await tx.offlineLoan.update({ where: { id: actionLog.recordId }, data: safeFields });
              localUndoResult = { type: 'loan_reverted', recordId: actionLog.recordId };
            }
          }

          // CLOSE → re-activate the loan
          else if (actionLog.actionType === 'CLOSE' && previousData) {
            // 1. Re-activate loan
            await tx.offlineLoan.update({
              where: { id: actionLog.recordId },
              data: { status: previousData.status || 'ACTIVE', closedAt: null }
            });

            // 1.5. Re-activate mirror loan if it exists
            const mirrorMapping = await tx.mirrorLoanMapping.findFirst({
              where: { originalLoanId: actionLog.recordId }
            });
            if (mirrorMapping && mirrorMapping.mirrorLoanId) {
              const mirrorLoan = await tx.offlineLoan.findUnique({
                where: { id: mirrorMapping.mirrorLoanId },
                select: { isInterestOnlyLoan: true }
              });
              const mirrorReopenStatus = mirrorLoan?.isInterestOnlyLoan ? 'INTEREST_ONLY' : 'ACTIVE';
              await tx.offlineLoan.update({
                where: { id: mirrorMapping.mirrorLoanId },
                data: { status: mirrorReopenStatus, closedAt: null }
              });
            }

            // 2. Revert EMIs marked paid during foreclosure
            const closedEMIIds = newData?.closedEMIIds || [];
            let revertedInstNumbers: number[] = [];
            if (closedEMIIds.length > 0) {
              const revertedEMIs = await tx.offlineLoanEMI.findMany({
                where: { id: { in: closedEMIIds } },
                select: { installmentNumber: true }
              });
              revertedInstNumbers = revertedEMIs.map(e => e.installmentNumber);

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

              revertedInstNumbers = emis.map(e => e.installmentNumber);

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

            // 2.5. Revert corresponding mirror EMIs
            if (mirrorMapping && mirrorMapping.mirrorLoanId && revertedInstNumbers.length > 0) {
              await tx.offlineLoanEMI.updateMany({
                where: {
                  offlineLoanId: mirrorMapping.mirrorLoanId,
                  installmentNumber: { in: revertedInstNumbers }
                },
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

            // 3. Delete foreclosure bank/cash transactions and revert balances
            await deleteBankOrCashEntriesForRef(`${actionLog.recordId}-REV-CLOSE`, tx);
            await deleteBankOrCashEntriesForRef(actionLog.recordId, tx);
            if (mirrorMapping && mirrorMapping.mirrorLoanId) {
              await deleteBankOrCashEntriesForRef(`${mirrorMapping.mirrorLoanId}-FORECLOSURE`, tx);
            }

            // Revert collector credit for foreclosure if applicable
            if (newData && newData.closeType === 'PAYMENT' && newData.collectorId) {
              const paymentAmount = newData.totalForeclosureAmount || 0;
              const paymentMode = (newData.paymentMode || '').toUpperCase();
              const isOnlinePayment = ['ONLINE','UPI','BANK_TRANSFER','NEFT','RTGS','IMPS','CHEQUE'].includes(paymentMode);
              if (paymentAmount > 0 && !isOnlinePayment) {
                const creditType = newData.creditType || 'COMPANY';
                const user = await tx.user.findUnique({ where: { id: newData.collectorId }, select: { credit: true, personalCredit: true, companyCredit: true } });
                if (user) {
                  const companyCreditBefore = user.companyCredit || 0;
                  const personalCreditBefore = user.personalCredit || 0;
                  
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
                } else {
                  console.warn(`[Undo] Collector user ${newData.collectorId} not found; skipping credit reversion`);
                }
              }
            }

            // Delete credit transactions tied to this foreclosure
            await tx.creditTransaction.deleteMany({
              where: {
                sourceType: 'FORECLOSURE',
                sourceId: `${actionLog.recordId}-FORECLOSURE`
              }
            });

            // 4. Delete writeoff / foreclosure journal entries
            await reverseJournalEntriesForRef(`${actionLog.recordId}-LOSS`, userId, tx);
            await reverseJournalEntriesForRef(`${actionLog.recordId}-FORECLOSURE`, userId, tx);
            if (mirrorMapping && mirrorMapping.mirrorLoanId) {
              await reverseJournalEntriesForRef(`${mirrorMapping.mirrorLoanId}-FORECLOSURE`, userId, tx);
              await reverseJournalEntriesForRef(`${mirrorMapping.mirrorLoanId}-LOSS`, userId, tx);
            }

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
                penaltyAmount:   previousData.penaltyAmount   ?? 0,
                penaltyPaid:     previousData.penaltyPaid     ?? 0,
              }
            });
            console.log(`[Undo EMI] Reverted EMI ${emiId} to ${previousData.paymentStatus ?? 'PENDING'}`);

            // 2. Delete the rolling NEXT EMI that was auto-created after this payment (for interest-only loans)
            //    or clean up deferred EMI (for interest-only payment on fixed-tenure loans)
            if (loanId) {
              const loan = await tx.offlineLoan.findUnique({
                where: { id: loanId },
                select: { isInterestOnlyLoan: true }
              });
              const paidEMI = await tx.offlineLoanEMI.findUnique({
                where: { id: emiId }, select: { installmentNumber: true }
              });
              if (loan?.isInterestOnlyLoan && paidEMI) {
                const nextInstNum = paidEMI.installmentNumber + 1;
                const deletedCount = await tx.offlineLoanEMI.deleteMany({
                  where: {
                    offlineLoanId: loanId,
                    installmentNumber: nextInstNum,
                    paymentStatus: 'PENDING'
                  }
                });
                console.log(`[Undo EMI] Deleted ${deletedCount.count} rolling next-EMI (#${nextInstNum}) for loan ${loanId}`);
              } else if (paidEMI) {
                // If a deferred EMI was created during an Interest-Only payment on a fixed-tenure loan
                const deferredEMI = await tx.offlineLoanEMI.findFirst({
                  where: { offlineLoanId: loanId, deferredFromEMI: paidEMI.installmentNumber }
                });
                if (deferredEMI) {
                  const subsequentEmis = await tx.offlineLoanEMI.findMany({
                    where: { offlineLoanId: loanId, installmentNumber: { gt: deferredEMI.installmentNumber } },
                    orderBy: { installmentNumber: 'asc' }
                  });
                  await tx.offlineLoanEMI.delete({ where: { id: deferredEMI.id } });
                  for (const sub of subsequentEmis) {
                    const prevDue = new Date(sub.dueDate);
                    prevDue.setMonth(prevDue.getMonth() - 1);
                    await tx.offlineLoanEMI.update({
                      where: { id: sub.id },
                      data: { installmentNumber: sub.installmentNumber - 1, dueDate: prevDue }
                    });
                  }
                  const mMapping = await tx.mirrorLoanMapping.findFirst({ where: { originalLoanId: loanId } });
                  if (mMapping) {
                    await tx.mirrorLoanMapping.update({
                      where: { id: mMapping.id },
                      data: { mirrorTenure: Math.max(0, mMapping.mirrorTenure - 1) }
                    });
                  }
                  console.log(`[Undo EMI] Deleted deferred EMI and shifted subsequent EMIs back for loan ${loanId}`);
                }
              }
            }

            // 3. Revert mirror loan EMI and delete mirror's rolling next EMI / deferred EMI
            if (mirrorLoanId) {
              const paidEMI = await tx.offlineLoanEMI.findUnique({
                where: { id: emiId }, select: { installmentNumber: true }
              });
              const installmentNumber = paidEMI?.installmentNumber;

              if (installmentNumber) {
                const mirrorEMIs = await tx.offlineLoanEMI.findMany({
                  where: {
                    offlineLoanId: mirrorLoanId,
                    installmentNumber,
                    paymentStatus: { in: ['PAID', 'INTEREST_ONLY_PAID', 'PARTIALLY_PAID'] }
                  }
                });

                for (const memi of mirrorEMIs) {
                  await deleteBankOrCashEntriesForRef(memi.id, tx);
                  await reverseJournalEntriesForRef(memi.id, userId, tx);
                }

                await tx.offlineLoanEMI.updateMany({
                  where: {
                    offlineLoanId: mirrorLoanId,
                    installmentNumber,
                    paymentStatus: { in: ['PAID', 'INTEREST_ONLY_PAID', 'PARTIALLY_PAID'] }
                  },
                  data: {
                    paymentStatus: 'PENDING',
                    paidAmount: 0, paidPrincipal: 0, paidInterest: 0,
                    paidDate: null, paymentMode: null,
                    collectedById: null, collectedByName: null, collectedAt: null,
                    interestOnlyPaidAt: null,
                  }
                });
                console.log(`[Undo EMI] Mirror EMI #${installmentNumber} reverted to PENDING (including PARTIALLY_PAID)`);

                const mirrorLoan = await tx.offlineLoan.findUnique({
                  where: { id: mirrorLoanId },
                  select: { isInterestOnlyLoan: true }
                });
                if (mirrorLoan?.isInterestOnlyLoan) {
                  await tx.offlineLoanEMI.deleteMany({
                    where: {
                      offlineLoanId: mirrorLoanId,
                      installmentNumber: installmentNumber + 1,
                      paymentStatus: 'PENDING'
                    }
                  });
                  console.log(`[Undo EMI] Mirror EMI #${installmentNumber} reverted, next mirror EMI deleted`);
                } else {
                  // If a mirror deferred EMI exists, clean it up
                  const mirrorDeferred = await tx.offlineLoanEMI.findFirst({
                    where: { offlineLoanId: mirrorLoanId, deferredFromEMI: installmentNumber }
                  });
                  if (mirrorDeferred) {
                    const subMirrorEmis = await tx.offlineLoanEMI.findMany({
                      where: { offlineLoanId: mirrorLoanId, installmentNumber: { gt: mirrorDeferred.installmentNumber } },
                      orderBy: { installmentNumber: 'asc' }
                    });
                    await tx.offlineLoanEMI.delete({ where: { id: mirrorDeferred.id } });
                    for (const sub of subMirrorEmis) {
                      const prevDue = new Date(sub.dueDate);
                      prevDue.setMonth(prevDue.getMonth() - 1);
                      await tx.offlineLoanEMI.update({
                        where: { id: sub.id },
                        data: { installmentNumber: sub.installmentNumber - 1, dueDate: prevDue }
                      });
                    }
                    console.log(`[Undo EMI] Mirror deferred EMI deleted for mirror loan ${mirrorLoanId}`);
                  }
                }
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
                const loan = await tx.offlineLoan.findUnique({
                  where: { id: loanId },
                  select: { isInterestOnlyLoan: true }
                });
                const reopenStatus = loan?.isInterestOnlyLoan ? 'INTEREST_ONLY' : 'ACTIVE';
                await tx.offlineLoan.updateMany({
                  where: { id: loanId, status: 'CLOSED', closedAt: { gte: new Date(new Date(actionLog.createdAt).getTime() - 60000) } },
                  data: { status: reopenStatus, closedAt: null }
                });
              }
            }

            // 5. Revert collector credit & secondary payment page credit accurately
            if (newData) {
              const rawPaymentAmount = newData.paymentAmount || newData.interestAmount || newData.amount || 0;
              const paymentMode   = (newData.paymentMode || '').toUpperCase();
              const isOnlineMode  = ['ONLINE','UPI','BANK_TRANSFER','NEFT','RTGS','IMPS','CHEQUE'].includes(paymentMode);
              const isSplit       = newData.isSplitPayment || paymentMode === 'SPLIT';

              let effectiveCreditReversion = 0;
              if (newData.creditIncreaseAmount !== undefined) {
                effectiveCreditReversion = Number(newData.creditIncreaseAmount) || 0;
              } else if (isSplit) {
                effectiveCreditReversion = Number(newData.splitCashAmount) || 0;
              } else if (isOnlineMode) {
                effectiveCreditReversion = 0;
              } else {
                effectiveCreditReversion = rawPaymentAmount;
              }

              if (newData.collectorId && effectiveCreditReversion > 0) {
                const creditType = newData.creditType || 'COMPANY';
                const user = await tx.user.findUnique({
                  where: { id: newData.collectorId },
                  select: { credit: true, personalCredit: true, companyCredit: true }
                });
                if (user) {
                  const companyCreditAfter  = creditType === 'COMPANY'
                    ? Math.max(0, (user.companyCredit  || 0) - effectiveCreditReversion)
                    : (user.companyCredit  || 0);
                  const personalCreditAfter = creditType === 'PERSONAL'
                    ? Math.max(0, (user.personalCredit || 0) - effectiveCreditReversion)
                    : (user.personalCredit || 0);
                  await tx.user.update({
                    where: { id: newData.collectorId },
                    data: {
                      credit: companyCreditAfter + personalCreditAfter,
                      companyCredit: companyCreditAfter,
                      personalCredit: personalCreditAfter
                    }
                  });
                  console.log(`[Undo EMI] Reverted collector (${newData.collectorId}) credit by ₹${effectiveCreditReversion}`);
                } else {
                  console.warn(`[Undo EMI] Collector user ${newData.collectorId} not found; skipping credit reversion`);
                }
              }

              // Revert secondary payment page owner credit if used
              const secPageId = newData.secondaryPaymentPageId || previousData?.secondaryPaymentPageId;
              if (secPageId) {
                const secPage = await tx.secondaryPaymentPage.findUnique({
                  where: { id: secPageId },
                  select: { roleId: true }
                });
                if (secPage?.roleId) {
                  const secUser = await tx.user.findUnique({
                    where: { id: secPage.roleId },
                    select: { credit: true, personalCredit: true, companyCredit: true }
                  });
                  if (secUser) {
                    const revAmt = effectiveCreditReversion > 0 ? effectiveCreditReversion : rawPaymentAmount;
                    const newPersCr = Math.max(0, (secUser.personalCredit || 0) - revAmt);
                    await tx.user.update({
                      where: { id: secPage.roleId },
                      data: {
                        personalCredit: newPersCr,
                        credit: (secUser.companyCredit || 0) + newPersCr
                      }
                    });
                    console.log(`[Undo EMI] Reverted secondary payment page user (${secPage.roleId}) credit by ₹${revAmt}`);
                  }
                }
              }
            }

            // 6. Delete bank/cash transactions tied to this EMI
            await deleteBankOrCashEntriesForRef(emiId, tx);
            if (newData?.paymentId) {
              await deleteBankOrCashEntriesForRef(newData.paymentId, tx);
            }

            // 7. Delete ALL journal entries referencing this EMI id / paymentId:
            await reverseJournalEntriesForRef(emiId, userId, tx);
            if (newData?.paymentId) {
              await reverseJournalEntriesForRef(newData.paymentId, userId, tx);
            }

            // 8. Delete credit transactions referencing this EMI
            if (loanId) {
              await tx.creditTransaction.deleteMany({
                where: {
                  OR: [
                    { sourceId: emiId },
                    ...(newData?.paymentId ? [{ sourceId: newData.paymentId }] : []),
                    { sourceId: loanId, sourceType: 'INTEREST_ONLY_PAYMENT' },
                    { emiScheduleId: emiId }
                  ],
                  createdAt: { gte: new Date(new Date(actionLog.createdAt).getTime() - 60000) }
                }
              });
            }

            localUndoResult = { type: 'payment_fully_reversed', recordId: emiId,
              detail: 'EMI reverted, rolling/deferred EMI deleted, mirror synced, journals deleted, credit restored' };
          }
        }


        // ── ONLINE EMI PAYMENT ────────────────────────────────────────────────
        else if (actionLog.module === 'ONLINE_LOAN' || actionLog.module === 'PAYMENT') {
          if ((actionLog.actionType === 'PAY' || actionLog.actionType === 'PAYMENT') && actionLog.recordType !== 'INTEREST_ONLY_PAYMENT' && previousData) {
            // Revert EMI schedule status
            const emiId = newData?.emiId || previousData?.emiId || actionLog.recordId;
            let emi: any = null;
            if (emiId) {
              emi = await tx.eMISchedule.findUnique({ where: { id: emiId } });
              if (emi) {
                await tx.eMISchedule.update({
                  where: { id: emiId },
                  data: {
                    paymentStatus: previousData.emiStatus    || 'PENDING',
                    paidAmount:    previousData.paidAmount    ?? 0,
                    paidPrincipal: previousData.paidPrincipal ?? 0,
                    paidInterest:  previousData.paidInterest  ?? 0,
                    paidDate:      previousData.paidDate ? new Date(previousData.paidDate) : null,
                    paymentMode:   previousData.paymentMode || null
                  }
                });
                console.log(`[Undo] Reverted EMI #${emi.installmentNumber} (${emiId}) status to ${previousData.emiStatus || 'PENDING'}`);
              }
            }

            // Revert PaymentRequest if applicable
            // ── FIX Bug-3: set to CANCELLED not PENDING so the customer sees it was reversed
            //    and cannot re-submit the same request as if it never happened.
            const prId = newData?.paymentRequestId || newData?.paymentRequest?.id;
            if (prId) {
              await tx.paymentRequest.update({
                where: { id: prId },
                data: {
                  status: 'CANCELLED',
                  reviewedById: null,
                  reviewedAt: null,
                  paymentConfirmedAt: null,
                  reviewRemarks: '[UNDO] Payment reversed by admin/cashier'
                }
              });
              console.log(`[Undo] Reverted PaymentRequest ${prId} status to CANCELLED (undo)`);
            }

            const loanId = newData?.loanId || emi?.loanApplicationId;
            if (loanId) {
              // Revert sessionForm totals if a deferred EMI was created
              const deferredEMI = await tx.eMISchedule.findFirst({
                where: { originalEMIId: emiId }
              });
              if (deferredEMI) {
                // Shift subsequent EMIs on original loan back by -1 month/installment
                const subsequentEmis = await tx.eMISchedule.findMany({
                  where: {
                    loanApplicationId: loanId,
                    installmentNumber: { gt: deferredEMI.installmentNumber }
                  },
                  orderBy: { installmentNumber: 'asc' }
                });

                // Delete the deferred EMI first
                await tx.eMISchedule.delete({ where: { id: deferredEMI.id } });
                console.log(`[Undo] Deleted deferred EMI #${deferredEMI.installmentNumber} on original loan`);

                for (const sub of subsequentEmis) {
                  const prevInstNum = sub.installmentNumber - 1;
                  const prevDue = new Date(sub.dueDate);
                  prevDue.setMonth(prevDue.getMonth() - 1);
                  await tx.eMISchedule.update({
                    where: { id: sub.id },
                    data: {
                      installmentNumber: prevInstNum,
                      dueDate: prevDue
                    }
                  });
                }
                console.log(`[Undo] Shifted back ${subsequentEmis.length} original EMIs`);

                // Revert sessionForm tenure & interest
                const loan = await tx.loanApplication.findUnique({
                  where: { id: loanId },
                  include: { sessionForm: true }
                });
                if (loan?.sessionForm) {
                  const sf = loan.sessionForm;
                  const deferredInterest = deferredEMI.interestAmount || 0;
                  await tx.sessionForm.update({
                    where: { loanApplicationId: loanId },
                    data: {
                      tenure: Math.max(0, (sf.tenure || 0) - 1),
                      totalInterest: Math.max(0, (sf.totalInterest || 0) - deferredInterest),
                      totalAmount: Math.max(0, (sf.totalAmount || 0) - deferredInterest)
                    }
                  });
                  console.log(`[Undo] Reverted sessionForm tenure and interest`);
                }
              }

              // Handle mirror loan sync reversals
              const mirrorMapping = await tx.mirrorLoanMapping.findFirst({
                where: { originalLoanId: loanId }
              });
              if (mirrorMapping) {
                const mirrorLoanId = mirrorMapping.mirrorLoanId;
                if (mirrorLoanId && emi) {
                  // Find mirror EMI corresponding to this installment number
                  const mirrorEMI = await tx.eMISchedule.findFirst({
                    where: { loanApplicationId: mirrorLoanId, installmentNumber: emi.installmentNumber }
                  });
                  if (mirrorEMI) {
                    // Revert mirror EMI status
                    await tx.eMISchedule.update({
                      where: { id: mirrorEMI.id },
                      data: {
                        paymentStatus: 'PENDING',
                        paidAmount: 0,
                        paidPrincipal: 0,
                        paidInterest: 0,
                        paidDate: null,
                        paymentMode: null
                      }
                    });
                    console.log(`[Undo] Reverted mirror EMI #${emi.installmentNumber} status to PENDING`);

                    // Find mirror deferred EMI
                    const mirrorDeferredEMI = await tx.eMISchedule.findFirst({
                      where: { originalEMIId: mirrorEMI.id }
                    });
                    if (mirrorDeferredEMI) {
                      // Shift subsequent mirror EMIs back
                      const subsequentMirrorEmis = await tx.eMISchedule.findMany({
                        where: {
                          loanApplicationId: mirrorLoanId,
                          installmentNumber: { gt: mirrorDeferredEMI.installmentNumber }
                        },
                        orderBy: { installmentNumber: 'asc' }
                      });

                      // Delete mirror deferred EMI
                      await tx.eMISchedule.delete({ where: { id: mirrorDeferredEMI.id } });
                      console.log(`[Undo] Deleted deferred mirror EMI #${mirrorDeferredEMI.installmentNumber}`);

                      for (const sub of subsequentMirrorEmis) {
                        const prevInstNum = sub.installmentNumber - 1;
                        const prevDue = new Date(sub.dueDate);
                        prevDue.setMonth(prevDue.getMonth() - 1);
                        await tx.eMISchedule.update({
                          where: { id: sub.id },
                          data: {
                            installmentNumber: prevInstNum,
                            dueDate: prevDue
                          }
                        });
                      }
                      console.log(`[Undo] Shifted back ${subsequentMirrorEmis.length} mirror EMIs`);

                      // Decrement mirrorTenure
                      // ── FIX Bug-2: Do NOT decrement mirrorTenure — it was set at loan-start
                      //    and is used as the gate (emi.installmentNumber > mirrorTenure).
                      //    Decrementing it would corrupt future extra-EMI detection.
                      await tx.mirrorLoanMapping.update({
                        where: { id: mirrorMapping.id },
                        data: {
                          mirrorEMIsPaid: Math.max(0, (mirrorMapping.mirrorEMIsPaid || 0) - 1)
                        }
                      });
                      console.log(`[Undo] Decremented mirrorEMIsPaid (mirrorTenure preserved)`);
                    } else {
                      // Just decrement mirrorEMIsPaid
                      await tx.mirrorLoanMapping.update({
                        where: { id: mirrorMapping.id },
                        data: {
                          mirrorEMIsPaid: Math.max(0, (mirrorMapping.mirrorEMIsPaid || 0) - 1)
                        }
                      });
                    }
                  }
                }
              }

              // Reopen original loan if it was CLOSED
              const loanObj = await tx.loanApplication.findUnique({ where: { id: loanId } });
              if (loanObj && loanObj.status === 'CLOSED') {
                const isIO = emi?.isInterestOnly || loanObj.interestRate === 0;
                await tx.loanApplication.update({
                  where: { id: loanId },
                  data: { status: isIO ? 'ACTIVE_INTEREST_ONLY' : 'ACTIVE', closedAt: null }
                });
                console.log(`[Undo] Restored loan status to ${isIO ? 'ACTIVE_INTEREST_ONLY' : 'ACTIVE'}`);
              }

              // Reopen mirror loan if it was CLOSED
              if (mirrorMapping?.mirrorLoanId) {
                const mirrorLoanObj = await tx.loanApplication.findUnique({ where: { id: mirrorMapping.mirrorLoanId } });
                if (mirrorLoanObj && mirrorLoanObj.status === 'CLOSED') {
                  await tx.loanApplication.update({
                    where: { id: mirrorMapping.mirrorLoanId },
                    data: { status: 'ACTIVE', closedAt: null }
                  });
                  console.log(`[Undo] Restored mirror loan status to ACTIVE`);
                }
              }

              // Revert processing fee if installment 1 is undone
              if (emi && emi.installmentNumber === 1) {
                await tx.mirrorLoanMapping.updateMany({
                  where: {
                    OR: [
                      { originalLoanId: loanId },
                      { mirrorLoanId: loanId }
                    ]
                  },
                  data: {
                    processingFeeRecorded: false,
                    mirrorProcessingFee: 0
                  }
                });

                // ── Delete bank/cash passbook entries ──────────────────────────
                // Case A & C: original/self-mirror loan's PF bank entry
                await deleteBankOrCashEntriesForRef(`${loanId}-PF`, tx);
                // Case C: alternate refId for standard online loans
                await deleteBankOrCashEntriesForRef(`${loanId}-PF-PR`, tx);

                // Case B: mirror loan's PF bank entry keyed on mirrorLoanId
                const mirrorMappingForPF = await tx.mirrorLoanMapping.findFirst({
                  where: { originalLoanId: loanId },
                  select: { mirrorLoanId: true }
                });
                if (mirrorMappingForPF?.mirrorLoanId) {
                  await deleteBankOrCashEntriesForRef(`${mirrorMappingForPF.mirrorLoanId}-PF`, tx);
                }

                // ── Reverse journal entries ─────────────────────────────────────
                // AccountingService uses loanId / mirrorLoanId as the referenceId.
                // Cases A & C: journals recorded against loanId
                await reverseJournalEntriesForRef(loanId, userId, tx);
                // Case B: journals recorded against mirrorLoanId
                if (mirrorMappingForPF?.mirrorLoanId) {
                  await reverseJournalEntriesForRef(mirrorMappingForPF.mirrorLoanId, userId, tx);
                }

                // Backward-compat: stale refIds from pre-refactor forward path
                await reverseJournalEntriesForRef(`${loanId}-PF-JE`, userId, tx);
                await reverseJournalEntriesForRef(`${loanId}-MIR-PF-JE`, userId, tx);
                await deleteBankOrCashEntriesForRef(`${loanId}-MIR-PF`, tx);

                console.log(`[Undo] ✅ Processing fee reversed for loan ${loanId} (installment #1 undo)`);
              }
            }

            // Clean up payments, credit transactions, and audit logs - define paymentsToDelete first
            const paymentsToDelete = [actionLog.recordId];
            if (loanId && emi) {
              const mirrorMapping = await tx.mirrorLoanMapping.findFirst({
                where: { originalLoanId: loanId }
              });
              if (mirrorMapping?.mirrorLoanId) {
                const mirrorEMI = await tx.eMISchedule.findFirst({
                  where: { loanApplicationId: mirrorMapping.mirrorLoanId, installmentNumber: emi.installmentNumber }
                });
                if (mirrorEMI) {
                  const mirrorPayments = await tx.payment.findMany({
                    where: { emiScheduleId: mirrorEMI.id },
                    select: { id: true }
                  });
                  paymentsToDelete.push(...mirrorPayments.map((p: any) => p.id));
                }
              }
            }

            // Delete bank/cash transactions & revert balances for all payments (including mirror payments)
            for (const pid of paymentsToDelete) {
              await deleteBankOrCashEntriesForRef(pid, tx);
            }

            // Revert collector credit
            if (newData) {
              const paymentAmount = newData.amount || newData.paymentAmount || 0;
              const paymentMode   = (newData.paymentMode || '').toUpperCase();
              const isOnlinePayment = ['ONLINE','UPI','BANK_TRANSFER','NEFT','RTGS','IMPS','CHEQUE'].includes(paymentMode);
              if (newData.collectorId && paymentAmount > 0 && !isOnlinePayment) {
                const creditType = newData.creditType || 'COMPANY';
                const user = await tx.user.findUnique({ where: { id: newData.collectorId }, select: { credit: true, personalCredit: true, companyCredit: true } });
                if (user) {
                  const companyCreditBefore = user.companyCredit || 0;
                  const personalCreditBefore = user.personalCredit || 0;
                  
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
                  console.log(`[Undo] Reverted collector credit by ${paymentAmount}`);
                } else {
                  console.warn(`[Undo] Collector user ${newData.collectorId} not found; skipping credit reversion`);
                }
              }
            }

            // Delete journal entries for all payments (including mirror payments)
            for (const pid of paymentsToDelete) {
              await reverseJournalEntriesForRef(pid, userId, tx);
            }

            await tx.auditLog.deleteMany({
              where: { paymentId: { in: paymentsToDelete } }
            });

            await tx.creditTransaction.deleteMany({
              where: { sourceId: { in: paymentsToDelete } }
            });

            await tx.payment.deleteMany({
              where: { id: { in: paymentsToDelete } }
            });
            console.log(`[Undo] Successfully deleted Payments and related records:`, paymentsToDelete);

            localUndoResult = { type: 'online_payment_deleted', recordId: actionLog.recordId };
          }

          // ── IO INTEREST PAYMENT UNDO ────────────────────────────────────────────
          // Exact inverse of loan/interest-payment forward path.
          // Bank stays bank, cash stays cash — deleteBankOrCashEntriesForRef uses
          // payment.id as the ref so it deletes exactly what was written.
          else if (actionLog.actionType === 'PAY' && actionLog.recordType === 'INTEREST_ONLY_PAYMENT' && newData) {
            const paymentId   = newData.paymentId || actionLog.recordId;
            const ioLoanId    = newData.loanId;
            const ioAmount    = newData.amount || 0;
            const paidInstNum = newData.paidInstNum;
            const partnerLoanIdForSync = newData.partnerLoanIdForSync;
            const ioCollector = newData.collectedBy;

            if (!ioLoanId) throw new Error('[Undo IO] loanId missing from newData');

            // 1. Reverse journal entries (mirrors accSvc.createJournalEntry { referenceId: paymentId })
            await reverseJournalEntriesForRef(paymentId, userId, tx);
            console.log(`[Undo IO] Reversed journal for payment ${paymentId}`);

            // 2. Partner EMI sync reversal
            if (partnerLoanIdForSync && paidInstNum != null) {
              await tx.eMISchedule.deleteMany({
                where: { loanApplicationId: partnerLoanIdForSync, installmentNumber: paidInstNum + 1, isInterestOnly: true, paymentStatus: 'PENDING' }
              });
              const partnerEMI = await tx.eMISchedule.findFirst({
                where: { loanApplicationId: partnerLoanIdForSync, installmentNumber: paidInstNum }
              });
              if (partnerEMI) {
                await tx.eMISchedule.update({
                  where: { id: partnerEMI.id },
                  data: { paymentStatus: 'PENDING', paidAmount: 0, paidInterest: 0, paidDate: null, interestOnlyPaidAt: null, interestOnlyAmount: 0, notes: null }
                });
                console.log(`[Undo IO] Reverted partner EMI #${paidInstNum} for ${partnerLoanIdForSync} → PENDING`);
              }
            }

            // 3. Delete bank/cash passbook entry — same channel as written
            //    Forward: bank → bankTransaction(referenceId=paymentId)
            //             cash → cashBookEntry(referenceId=paymentId)
            await deleteBankOrCashEntriesForRef(paymentId, tx);
            console.log(`[Undo IO] Deleted bank/cash entry for ${paymentId}`);

            // 4. Revert credit + delete creditTransactions
            // creditTransaction has no direct companyId — mirror the forward path:
            //   creditType COMPANY: resolve loanApplicationId → loan.companyId → company.companyCredit -= amount
            //   creditType PERSONAL: user.personalCredit -= amount, user.credit -= amount
            const ioCreditTxs = await tx.creditTransaction.findMany({
              where: { sourceId: paymentId },
              select: { id: true, userId: true, amount: true, creditType: true, loanApplicationId: true }
            });
            for (const ctx of ioCreditTxs) {
              if (ctx.creditType === 'COMPANY' && ctx.loanApplicationId) {
                const loanForCredit = await tx.loanApplication.findUnique({
                  where: { id: ctx.loanApplicationId }, select: { companyId: true }
                });
                if (loanForCredit?.companyId) {
                  const co = await tx.company.findUnique({ where: { id: loanForCredit.companyId }, select: { companyCredit: true } });
                  if (co) {
                    await tx.company.update({ where: { id: loanForCredit.companyId }, data: { companyCredit: Math.max(0, (co.companyCredit || 0) - ioAmount) } });
                    console.log(`[Undo IO] Reverted company credit ₹${ioAmount} for company ${loanForCredit.companyId}`);
                  }
                }
              } else if (ctx.creditType === 'PERSONAL' && ctx.userId) {
                const u = await tx.user.findUnique({ where: { id: ctx.userId }, select: { credit: true, personalCredit: true } });
                if (u) {
                  await tx.user.update({ where: { id: ctx.userId }, data: { personalCredit: Math.max(0, (u.personalCredit || 0) - ioAmount), credit: Math.max(0, (u.credit || 0) - ioAmount) } });
                  console.log(`[Undo IO] Reverted personal credit ₹${ioAmount} for user ${ctx.userId}`);
                }
              }
            }
            await tx.creditTransaction.deleteMany({ where: { sourceId: paymentId } });

            // 5. Delete rolling next IO EMI + restore paid IO EMI → PENDING
            if (paidInstNum != null) {
              await tx.eMISchedule.deleteMany({
                where: { loanApplicationId: ioLoanId, installmentNumber: paidInstNum + 1, isInterestOnly: true, paymentStatus: 'PENDING' }
              });
              const ioEMI = await tx.eMISchedule.findFirst({
                where: { loanApplicationId: ioLoanId, installmentNumber: paidInstNum, isInterestOnly: true }
              });
              if (ioEMI) {
                await tx.eMISchedule.update({
                  where: { id: ioEMI.id },
                  data: { paymentStatus: 'PENDING', paidAmount: 0, paidInterest: 0, paidDate: null, paymentMode: null, interestOnlyPaidAt: null, interestOnlyAmount: 0, notes: null }
                });
                console.log(`[Undo IO] Restored IO EMI #${paidInstNum} → PENDING`);
              }
            }

            // 6. Decrement totalInterestOnlyPaid (mirrors { increment: amount })
            await tx.loanApplication.update({
              where: { id: ioLoanId },
              data: { totalInterestOnlyPaid: { decrement: ioAmount } }
            });

            // 7. Delete payment record (mirrors payment.create)
            await tx.auditLog.deleteMany({ where: { paymentId } });
            await tx.payment.deleteMany({ where: { id: paymentId } });
            console.log(`[Undo IO] ✅ IO interest payment ${paymentId} fully reversed`);

            localUndoResult = { type: 'io_interest_payment_reversed', recordId: paymentId };
          }

          // ── LOAN START UNDO ─────────────────────────────────────────────────────
          // Exact inverse of loan/start forward path.
          // Restores loan → ACTIVE_INTEREST_ONLY, deletes new amortizing schedules,
          // reverses PF accounting using same loanId/mirrorLoanId refs (bank stays bank).
          else if (actionLog.actionType === 'UPDATE' && actionLog.recordType === 'LOAN_START' && previousData) {
            const startLoanId  = actionLog.recordId;
            const startMirrorId = newData?.mirrorLoanId;
            const pf           = Number(previousData.processingFee ?? 0);

            const isInterestOnly = previousData.isInterestOnlyLoan !== undefined 
              ? previousData.isInterestOnlyLoan 
              : (previousData.status === 'ACTIVE_INTEREST_ONLY');
            const targetStatus = previousData.status || (isInterestOnly ? 'ACTIVE_INTEREST_ONLY' : 'ACTIVE');

            // 1. Restore loan
            await tx.loanApplication.update({
              where: { id: startLoanId },
              data: {
                status: targetStatus,
                isInterestOnlyLoan: isInterestOnly,
                loanStartedAt: null,
                tenure: previousData.tenure || 0,
                interestRate: previousData.interestRate || 0,
                emiAmount: previousData.emiAmount || 0,
              }
            });
            console.log(`[Undo Start] Restored loan ${startLoanId} → ${targetStatus}`);

            // 2. Restore sessionForm (mirrors sessionForm.update { tenure, interestRate, ... })
            await tx.sessionForm.updateMany({
              where: { loanApplicationId: startLoanId },
              data: {
                tenure: previousData.tenure || 0,
                interestRate: previousData.interestRate || 0,
                emiAmount: previousData.emiAmount || 0,
                totalInterest: previousData.totalInterest || 0,
                totalAmount: previousData.totalAmount || 0,
              }
            });

            // 3. Delete new EMI payment settings + amortizing schedules (mirrors createMany)
            //    Nullify FK on payment/paymentRequest first to avoid constraint errors
            await tx.payment.updateMany({ where: { emiSchedule: { loanApplicationId: startLoanId } }, data: { emiScheduleId: null } });
            await tx.paymentRequest.updateMany({ where: { emiSchedule: { loanApplicationId: startLoanId } }, data: { emiScheduleId: null } });
            await tx.eMIPaymentSetting.deleteMany({ where: { loanApplicationId: startLoanId } });
            await tx.eMISchedule.deleteMany({ where: { loanApplicationId: startLoanId } });
            console.log(`[Undo Start] Deleted new EMI schedules for ${startLoanId}`);

            // 4. Mirror loan reversal (mirrors the CASCADE mirror start inside transaction)
            if (startMirrorId) {
              await tx.payment.updateMany({ where: { emiSchedule: { loanApplicationId: startMirrorId } }, data: { emiScheduleId: null } });
              await tx.paymentRequest.updateMany({ where: { emiSchedule: { loanApplicationId: startMirrorId } }, data: { emiScheduleId: null } });
              await tx.eMIPaymentSetting.deleteMany({ where: { loanApplicationId: startMirrorId } });
              await tx.eMISchedule.deleteMany({ where: { loanApplicationId: startMirrorId } });
              
              const mirrorLoanApp = await tx.loanApplication.findUnique({
                where: { id: startMirrorId },
                select: { isInterestOnlyLoan: true }
              });
              const mirrorIsIO = mirrorLoanApp?.isInterestOnlyLoan ?? isInterestOnly;
              const mirrorStatus = mirrorIsIO ? 'ACTIVE_INTEREST_ONLY' : 'ACTIVE';

              await tx.loanApplication.update({
                where: { id: startMirrorId },
                data: { status: mirrorStatus, isInterestOnlyLoan: mirrorIsIO, loanStartedAt: null }
              });
              // Revert mirrorLoanMapping (mirrors mirrorLoanMapping.update { processingFeeRecorded:false })
              await tx.mirrorLoanMapping.updateMany({
                where: { mirrorLoanId: startMirrorId },
                data: { processingFeeRecorded: false, mirrorProcessingFee: 0, mirrorTenure: 0, originalTenure: 0 }
              });
              // Reverse mirror PF accrual journal (recorded with referenceId: mirrorLoanId)
              await reverseJournalEntriesForRef(startMirrorId, userId, tx);
              console.log(`[Undo Start] Reversed mirror ${startMirrorId}`);
            }

            // 5. Reverse PF accounting on original loan:
            //    Forward wrote: bankTransaction(referenceId=startLoanId) OR cashBookEntry(referenceId=startLoanId)
            //    + journalEntries(referenceId=startLoanId) for accrual and collection
            //    Bank stays bank, cash stays cash — deleteBankOrCashEntriesForRef uses startLoanId
            if (pf > 0) {
              await reverseJournalEntriesForRef(startLoanId, userId, tx);
              await deleteBankOrCashEntriesForRef(startLoanId, tx);
              // Backward-compat stale ref patterns
              await deleteBankOrCashEntriesForRef(`${startLoanId}-PF`, tx);
              await reverseJournalEntriesForRef(`${startLoanId}-PF-JE`, userId, tx);
              console.log(`[Undo Start] Reversed PF ₹${pf} accounting for ${startLoanId}`);
            }

            console.log(`[Undo Start] ✅ Loan start fully reversed for ${startLoanId}`);
            localUndoResult = { type: 'loan_start_reversed', recordId: startLoanId };
          }
        }

        // ── SETTLEMENT ───────────────────────────────────────────────────────
        else if (actionLog.module === 'SETTLEMENT') {
          if (actionLog.actionType === 'CREATE') {
            const settlement = await tx.cashierSettlement.findUnique({ where: { id: actionLog.recordId } });
            if (settlement) {
              // Revert cashier credit
              const user = await tx.user.findUnique({ where: { id: settlement.userId }, select: { credit: true, personalCredit: true, companyCredit: true } });
              if (user) {
                const creditTx = await tx.creditTransaction.findFirst({
                  where: { settlementId: actionLog.recordId, userId: settlement.userId }
                });
                const creditType = creditTx?.creditType || 'COMPANY';
                const companyCreditAfter = creditType === 'COMPANY' ? (user.companyCredit || 0) + settlement.amount : (user.companyCredit || 0);
                const personalCreditAfter = creditType === 'PERSONAL' ? (user.personalCredit || 0) + settlement.amount : (user.personalCredit || 0);
                const creditAfter = companyCreditAfter + personalCreditAfter;

                await tx.user.update({
                  where: { id: settlement.userId },
                  data: {
                    credit: creditAfter,
                    companyCredit: companyCreditAfter,
                    personalCredit: personalCreditAfter
                  }
                });
              } else {
                console.warn(`[Undo Settlement] User ${settlement.userId} not found; skipping credit reversion`);
              }

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
              data: { status: previousData.status || 'ACTIVE', closedAt: null }
            });

            // 1.5. Re-activate partner loan if it exists
            const mirrorMapping = await tx.mirrorLoanMapping.findFirst({
              where: {
                OR: [
                  { originalLoanId: actionLog.recordId },
                  { mirrorLoanId: actionLog.recordId }
                ]
              }
            });
            const partnerLoanId = mirrorMapping
              ? (actionLog.recordId === mirrorMapping.originalLoanId ? mirrorMapping.mirrorLoanId : mirrorMapping.originalLoanId)
              : null;
            if (partnerLoanId) {
              const partnerLoan = await tx.loanApplication.findUnique({
                where: { id: partnerLoanId },
                select: { sessionForm: { select: { interestRate: true } } }
              });
              const isIO = partnerLoan?.sessionForm?.interestRate === 0;
              await tx.loanApplication.update({
                where: { id: partnerLoanId },
                data: { status: isIO ? 'ACTIVE_INTEREST_ONLY' : 'ACTIVE', closedAt: null }
              });
            }

            // 2. Revert EMIs marked paid during foreclosure
            const closedEMIIds = newData?.closedEMIIds || [];
            let revertedInstNumbers: number[] = [];
            if (closedEMIIds.length > 0) {
              const revertedEMIs = await tx.eMISchedule.findMany({
                where: { id: { in: closedEMIIds } },
                select: { installmentNumber: true }
              });
              revertedInstNumbers = revertedEMIs.map(e => e.installmentNumber);

              await tx.eMISchedule.updateMany({
                where: { id: { in: closedEMIIds } },
                data: {
                  paymentStatus: 'PENDING',
                  paidAmount: 0,
                  paidPrincipal: 0,
                  paidInterest: 0,
                  paidDate: null,
                  paymentMode: null,
                  notes: null
                }
              });
            } else {
              const logTime = new Date(actionLog.createdAt).getTime();
              const revertedEMIs = await tx.eMISchedule.findMany({
                where: {
                  loanApplicationId: actionLog.recordId,
                  paymentStatus: 'PAID',
                  paidDate: {
                    gte: new Date(logTime - 360000), // 6 minutes tolerance
                    lte: new Date(logTime + 360000)
                  }
                },
                select: { installmentNumber: true }
              });
              revertedInstNumbers = revertedEMIs.map(e => e.installmentNumber);

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
                  paidPrincipal: 0,
                  paidInterest: 0,
                  paidDate: null,
                  paymentMode: null,
                  notes: null
                }
              });
            }

            // Revert partner EMIs if partner exists
            if (partnerLoanId && revertedInstNumbers.length > 0) {
              await tx.eMISchedule.updateMany({
                where: {
                  loanApplicationId: partnerLoanId,
                  installmentNumber: { in: revertedInstNumbers }
                },
                data: {
                  paymentStatus: 'PENDING',
                  paidAmount: 0,
                  paidPrincipal: 0,
                  paidInterest: 0,
                  paidDate: null,
                  paymentMode: null,
                  notes: null
                }
              });
            }

            // 3. Delete bank/cash transactions & revert balances
            await deleteBankOrCashEntriesForRef(`${actionLog.recordId}-REV-CLOSE`, tx);
            await deleteBankOrCashEntriesForRef(actionLog.recordId, tx);
            if (partnerLoanId) {
              await deleteBankOrCashEntriesForRef(`${partnerLoanId}-FORECLOSURE`, tx);
            }

            // Revert collector credit
            if (newData && newData.closeType === 'PAYMENT' && newData.collectorId) {
              const paymentAmount = newData.totalForeclosureAmount || 0;
              const paymentMode = (newData.paymentMode || '').toUpperCase();
              const isOnlinePayment = ['ONLINE','UPI','BANK_TRANSFER','NEFT','RTGS','IMPS','CHEQUE'].includes(paymentMode);
              if (paymentAmount > 0 && !isOnlinePayment) {
                const creditType = newData.creditType || 'COMPANY';
                const user = await tx.user.findUnique({ where: { id: newData.collectorId }, select: { credit: true, personalCredit: true, companyCredit: true } });
                if (user) {
                  const companyCreditBefore = user.companyCredit || 0;
                  const personalCreditBefore = user.personalCredit || 0;
                  
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
                } else {
                  console.warn(`[Undo] Collector user ${newData.collectorId} not found; skipping credit reversion`);
                }
              }
            }

            // 4. Delete writeoff / foreclosure journal entries
            await reverseJournalEntriesForRef(`${actionLog.recordId}-LOSS`, userId, tx);
            await reverseJournalEntriesForRef(`${actionLog.recordId}-FORECLOSURE`, userId, tx);
            if (partnerLoanId) {
              await reverseJournalEntriesForRef(`${partnerLoanId}-FORECLOSURE`, userId, tx);
              await reverseJournalEntriesForRef(`${partnerLoanId}-LOSS`, userId, tx);
            }

            // 5. Delete payments and credit transactions created during foreclosure
            await tx.payment.deleteMany({
              where: {
                loanApplicationId: { in: [actionLog.recordId, partnerLoanId].filter(Boolean) as string[] },
                paymentType: 'FORECLOSURE'
              }
            });
            await tx.creditTransaction.deleteMany({
              where: {
                loanApplicationId: { in: [actionLog.recordId, partnerLoanId].filter(Boolean) as string[] },
                sourceType: 'FORECLOSURE'
              }
            });

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
            const transferRefId = newData.transferRefId || actionLog.recordId;

            // 1. Revert bank & cash transactions matching the transferRefId and recordId
            await deleteBankOrCashEntriesForRef(transferRefId, tx);
            if (transferRefId !== actionLog.recordId) {
              await deleteBankOrCashEntriesForRef(actionLog.recordId, tx);
            }

            // 2. Reverse double-entry journal entries matching the transferRefId and recordId
            await reverseJournalEntriesForRef(transferRefId, userId, tx);
            if (transferRefId !== actionLog.recordId) {
              await reverseJournalEntriesForRef(actionLog.recordId, userId, tx);
            }

            if (newData.toUserId) {
              // Revert receiver credit (decrement)
              const toUser = await tx.user.findUnique({ where: { id: newData.toUserId } });
              if (toUser) {
                await tx.user.update({
                  where: { id: newData.toUserId },
                  data: {
                    personalCredit: creditType === 'PERSONAL' ? { decrement: amount } : undefined,
                    companyCredit: creditType === 'COMPANY' ? { decrement: amount } : undefined,
                    credit: { decrement: amount }
                  }
                });
              }

              // Revert sender credit (increment)
              const fromUser = await tx.user.findUnique({ where: { id: actionLog.recordId } });
              if (fromUser) {
                await tx.user.update({
                  where: { id: actionLog.recordId },
                  data: {
                    personalCredit: creditType === 'PERSONAL' ? { increment: amount } : undefined,
                    companyCredit: creditType === 'COMPANY' ? { increment: amount } : undefined,
                    credit: { increment: amount }
                  }
                });
              }

              localUndoResult = { type: 'credit_transfer_deleted', recordId: actionLog.recordId };
            } else if (newData.bankAccountId) {
              // Revert sender credit (increment)
              const fromUser = await tx.user.findUnique({ where: { id: actionLog.recordId } });
              if (fromUser) {
                await tx.user.update({
                  where: { id: actionLog.recordId },
                  data: {
                    personalCredit: creditType === 'PERSONAL' ? { increment: amount } : undefined,
                    companyCredit: creditType === 'COMPANY' ? { increment: amount } : undefined,
                    credit: { increment: amount }
                  }
                });
              }

              localUndoResult = { type: 'credit_deposit_deleted', recordId: actionLog.recordId };
            } else if (newData.companyId) {
              // Revert company myCash (decrement)
              await tx.company.update({
                where: { id: newData.companyId },
                data: { myCash: { decrement: amount } }
              });

              // Revert sender credit (increment)
              const fromUser = await tx.user.findUnique({ where: { id: actionLog.recordId } });
              if (fromUser) {
                await tx.user.update({
                  where: { id: actionLog.recordId },
                  data: {
                    personalCredit: creditType === 'PERSONAL' ? { increment: amount } : undefined,
                    companyCredit: creditType === 'COMPANY' ? { increment: amount } : undefined,
                    credit: { increment: amount }
                  }
                });
              }

              localUndoResult = { type: 'credit_cash_deposit_deleted', recordId: actionLog.recordId };
            } else {
              // Add-cash or Add-to-bank
              const isCompany = actionLog.recordType === 'Company';
              if (isCompany) {
                // Add-cash: Revert company myCash (decrement)
                await tx.company.update({
                  where: { id: actionLog.recordId },
                  data: { myCash: { decrement: amount } }
                });
                localUndoResult = { type: 'add_cash_deleted', recordId: actionLog.recordId };
              } else {
                // Add-to-bank: bankAccount balance was already decremented by deleteBankOrCashEntriesForRef(transferRefId)
                localUndoResult = { type: 'add_to_bank_deleted', recordId: actionLog.recordId };
              }
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

      const newData = salvageJson(actionLog.newData);

      const redoResult = await db.$transaction(async (tx) => {
        let localRedoResult: { type: string; recordId: string } | null = null;

        if (actionLog.module === 'OFFLINE_LOAN') {
          if (actionLog.actionType === 'CREATE') {
            await tx.offlineLoan.update({ where: { id: actionLog.recordId }, data: { status: 'ACTIVE' } });
            localRedoResult = { type: 'loan_re_activated', recordId: actionLog.recordId };
          } else if (actionLog.actionType === 'UPDATE' && newData) {
            const { id: _id, createdAt: _c, updatedAt: _u, ...safeFields } = newData;
            await tx.offlineLoan.update({ where: { id: actionLog.recordId }, data: safeFields });
            localRedoResult = { type: 'loan_updated', recordId: actionLog.recordId };
          }
        }

        else if (
          actionLog.module === 'EMI_PAYMENT' ||
          actionLog.module === 'ONLINE_LOAN' ||
          actionLog.module === 'PAYMENT'
        ) {
          if ((actionLog.actionType === 'PAY' || actionLog.actionType === 'PAYMENT') && newData) {
            const emiId = newData?.emiId || actionLog.recordId;
            const paymentAmount = newData.paymentAmount || newData.amount || newData.interestAmount || 0;
            const paymentMode = (newData.paymentMode || '').toUpperCase();
            const isOnline = ['ONLINE','UPI','BANK_TRANSFER','NEFT','RTGS','IMPS','CHEQUE'].includes(paymentMode);

            if (actionLog.module === 'EMI_PAYMENT') {
              await tx.offlineLoanEMI.update({
                where: { id: actionLog.recordId },
                data: {
                  paidAmount:    newData.paidAmount || paymentAmount,
                  paidPrincipal: newData.paidPrincipal || 0,
                  paidInterest:  newData.paidInterest || 0,
                  paymentStatus: newData.paymentStatus || 'PAID',
                  paidDate:      new Date(),
                  paymentMode:   newData.paymentMode,
                  collectedById: newData.collectorId,
                  collectedByName: newData.collectorName,
                  collectedAt:   new Date()
                }
              });
            }

            if (actionLog.module === 'ONLINE_LOAN' || actionLog.module === 'PAYMENT') {
              if (emiId) {
                // ── FIX Bug-7: derive the correct EMI status from the original paymentType
                //    REDO must restore the same status the forward payment set, not always 'PAID'
                const redoPaymentType = (newData.paymentType || '').toUpperCase();
                const redoEmiStatus = redoPaymentType === 'PARTIAL_PAYMENT'
                  ? 'PARTIALLY_PAID'
                  : redoPaymentType === 'INTEREST_ONLY'
                    ? 'INTEREST_ONLY_PAID'
                    : 'PAID';

                await tx.eMISchedule.update({
                  where: { id: emiId },
                  data: {
                    paymentStatus: redoEmiStatus,
                    paidAmount:    newData.paidAmount || paymentAmount,
                    paidPrincipal: newData.paidPrincipal || 0,
                    paidInterest:  newData.paidInterest || 0,
                    paidDate:      new Date(),
                    paymentMode:   paymentMode
                  }
                });
              }

              const prId = newData?.paymentRequestId || newData?.paymentRequest?.id;
              if (prId) {
                await tx.paymentRequest.update({
                  where: { id: prId },
                  data: {
                    status: 'APPROVED',
                    paymentConfirmedAt: new Date()
                  }
                });
              }

              const loanApp = await tx.loanApplication.findUnique({
                where: { id: newData.loanId },
                select: { customerId: true }
              });
              const customerId = loanApp?.customerId || '';

              let payment = await tx.payment.findUnique({ where: { id: actionLog.recordId } });
              if (!payment && customerId) {
                await tx.payment.create({
                  data: {
                    id: actionLog.recordId,
                    loanApplicationId: newData.loanId,
                    emiScheduleId: emiId,
                    customerId: customerId,
                    amount: paymentAmount,
                    paymentMode: paymentMode,
                    status: 'COMPLETED',
                    cashierId: newData.collectorId
                  }
                });
              }
            }

            // Re-increment collector credit
            if (newData.collectorId && paymentAmount > 0 && !isOnline) {
              const creditType = newData.creditType || 'COMPANY';
              const user = await tx.user.findUnique({
                where: { id: newData.collectorId },
                select: { credit: true, personalCredit: true, companyCredit: true }
              });
              if (user) {
                const companyCreditAfter = creditType === 'COMPANY'
                  ? (user.companyCredit || 0) + paymentAmount
                  : (user.companyCredit || 0);
                const personalCreditAfter = creditType === 'PERSONAL'
                  ? (user.personalCredit || 0) + paymentAmount
                  : (user.personalCredit || 0);

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
            localRedoResult = { type: 'payment_re_applied', recordId: actionLog.recordId };
          }
        }

        else if (actionLog.module === 'SETTLEMENT') {
          if (actionLog.actionType === 'CREATE' && newData) {
            const settlementNumber = newData.settlementNumber;
            const amount = newData.amount;
            const cashierId = newData.cashierId;
            const paymentMode = newData.paymentMode;

            const settlementId = actionLog.recordId === actionLog.userId ? undefined : actionLog.recordId;

            const settlement = await tx.cashierSettlement.create({
              data: {
                ...(settlementId ? { id: settlementId } : {}),
                settlementNumber,
                userId: actionLog.userId,
                cashierId,
                amount,
                paymentMode,
                status: 'PENDING',
                remarks: 'Reapplied via REDO'
              }
            });

            const user = await tx.user.findUnique({ where: { id: actionLog.userId }, select: { credit: true, personalCredit: true, companyCredit: true } });
            const creditType = newData.creditType || 'COMPANY';
            let finalCredit = 0;
            let finalCompanyCredit = 0;
            let finalPersonalCredit = 0;

            if (user) {
              finalCompanyCredit = creditType === 'COMPANY' ? Math.max(0, (user.companyCredit || 0) - amount) : (user.companyCredit || 0);
              finalPersonalCredit = creditType === 'PERSONAL' ? Math.max(0, (user.personalCredit || 0) - amount) : (user.personalCredit || 0);
              finalCredit = finalCompanyCredit + finalPersonalCredit;

              await tx.user.update({
                where: { id: actionLog.userId },
                data: {
                  credit: finalCredit,
                  companyCredit: finalCompanyCredit,
                  personalCredit: finalPersonalCredit
                }
              });
            }

            await tx.creditTransaction.create({
              data: {
                userId: actionLog.userId,
                transactionType: 'CREDIT_DECREASE',
                amount,
                paymentMode,
                creditType: creditType as any,
                companyBalanceAfter: finalCompanyCredit,
                personalBalanceAfter: finalPersonalCredit,
                balanceAfter: finalCredit,
                sourceType: 'SETTLEMENT',
                settlementId: settlement.id,
                remarks: `Settlement ${settlementNumber} (Redone)`
              }
            });

            localRedoResult = { type: 'settlement_re_applied', recordId: settlement.id };
          }
        }

        else if (actionLog.module === 'LOAN_CLOSE' || actionLog.module === 'LOAN') {
          if (actionLog.actionType === 'CLOSE' && newData) {
            await tx.loanApplication.update({
              where: { id: actionLog.recordId },
              data: { status: 'CLOSED', closedAt: new Date() }
            });

            const paymentAmount = newData.totalForeclosureAmount || 0;
            const paymentMode = (newData.paymentMode || '').toUpperCase();
            const isOnline = ['ONLINE','UPI','BANK_TRANSFER','NEFT','RTGS','IMPS','CHEQUE'].includes(paymentMode);
            if (newData.collectorId && paymentAmount > 0 && !isOnline) {
              const creditType = newData.creditType || 'COMPANY';
              const user = await tx.user.findUnique({
                where: { id: newData.collectorId },
                select: { credit: true, personalCredit: true, companyCredit: true }
              });
              if (user) {
                const companyCreditAfter = creditType === 'COMPANY'
                  ? (user.companyCredit || 0) + paymentAmount
                  : (user.companyCredit || 0);
                const personalCreditAfter = creditType === 'PERSONAL'
                  ? (user.personalCredit || 0) + paymentAmount
                  : (user.personalCredit || 0);

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
            localRedoResult = { type: 'loan_closed_re_applied', recordId: actionLog.recordId };
          }
        }

        else if (actionLog.module === 'CREDIT_TRANSFER') {
          if (actionLog.actionType === 'TRANSFER' && newData) {
            const amount = newData.amount;
            const creditType = newData.creditType;
            const transferRefId = newData.transferRefId || `CT-${Date.now()}`;

            if (newData.toUserId) {
              // User-to-User
              // Deduct from sender
              await tx.user.update({
                where: { id: actionLog.recordId },
                data: {
                  personalCredit: creditType === 'PERSONAL' ? { decrement: amount } : undefined,
                  companyCredit: creditType === 'COMPANY' ? { decrement: amount } : undefined,
                  credit: { decrement: amount }
                }
              });

              // Add to receiver
              await tx.user.update({
                where: { id: newData.toUserId },
                data: {
                  personalCredit: creditType === 'PERSONAL' ? { increment: amount } : undefined,
                  companyCredit: creditType === 'COMPANY' ? { increment: amount } : undefined,
                  credit: { increment: amount }
                }
              });

              const fromUser = await tx.user.findUnique({ where: { id: actionLog.recordId } });
              const toUser = await tx.user.findUnique({ where: { id: newData.toUserId } });

              // Create transaction record for sender
              await tx.creditTransaction.create({
                data: {
                  userId: actionLog.recordId,
                  transactionType: 'CREDIT_DECREASE',
                  amount: -amount,
                  paymentMode: newData.paymentMode || 'CASH',
                  creditType: creditType as any,
                  companyBalanceAfter: fromUser?.companyCredit || 0,
                  personalBalanceAfter: fromUser?.personalCredit || 0,
                  balanceAfter: fromUser?.credit || 0,
                  sourceType: 'CREDIT_TRANSFER',
                  sourceId: transferRefId,
                  description: `Credit transferred (Redone)`,
                  transactionDate: new Date()
                }
              });

              // Create transaction record for receiver
              await tx.creditTransaction.create({
                data: {
                  userId: newData.toUserId,
                  transactionType: 'CREDIT_INCREASE',
                  amount: amount,
                  paymentMode: newData.paymentMode || 'CASH',
                  creditType: creditType as any,
                  companyBalanceAfter: toUser?.companyCredit || 0,
                  personalBalanceAfter: toUser?.personalCredit || 0,
                  balanceAfter: toUser?.credit || 0,
                  sourceType: 'CREDIT_TRANSFER',
                  sourceId: transferRefId,
                  description: `Credit received (Redone)`,
                  transactionDate: new Date()
                }
              });

              localRedoResult = { type: 'credit_transfer_re_applied', recordId: actionLog.recordId };
            } else if (newData.bankAccountId) {
              // User-to-Bank
              // Deduct from user
              await tx.user.update({
                where: { id: actionLog.recordId },
                data: {
                  personalCredit: creditType === 'PERSONAL' ? { decrement: amount } : undefined,
                  companyCredit: creditType === 'COMPANY' ? { decrement: amount } : undefined,
                  credit: { decrement: amount }
                }
              });

              // Add to bank account
              const bankAccount = await tx.bankAccount.findUnique({ where: { id: newData.bankAccountId } });
              if (bankAccount) {
                const newBalance = bankAccount.currentBalance + amount;
                await tx.bankAccount.update({
                  where: { id: newData.bankAccountId },
                  data: { currentBalance: newBalance }
                });

                // Create bank transaction
                await tx.bankTransaction.create({
                  data: {
                    bankAccountId: newData.bankAccountId,
                    transactionType: 'CREDIT',
                    amount: amount,
                    balanceAfter: newBalance,
                    description: `Credit deposit (Redone)`,
                    referenceType: 'CREDIT_TRANSFER',
                    referenceId: transferRefId,
                    createdById: actionLog.userId,
                    transactionDate: new Date()
                  }
                });

                // Create journal entry for company
                await tx.journalEntry.create({
                  data: {
                    companyId: bankAccount.companyId,
                    entryNumber: `JE-CT-${Date.now()}`,
                    entryDate: new Date(),
                    referenceType: 'BANK_DEPOSIT',
                    referenceId: transferRefId,
                    narration: `Credit deposit to bank (Redone)`,
                    totalDebit: amount,
                    totalCredit: amount,
                    isAutoEntry: true,
                    isApproved: true,
                    bankAccountId: newData.bankAccountId,
                    createdById: actionLog.userId,
                    lines: {
                      create: [
                        {
                          accountId: 'BANK_ACCOUNT',
                          debitAmount: amount,
                          creditAmount: 0,
                          narration: 'Bank deposit from user credit'
                        },
                        {
                          accountId: 'CAPITAL_ACCOUNT',
                          debitAmount: 0,
                          creditAmount: amount,
                          narration: 'Credit transfer from user'
                        }
                      ]
                    }
                  }
                });
              }

              const fromUser = await tx.user.findUnique({ where: { id: actionLog.recordId } });

              // Create transaction record for user
              await tx.creditTransaction.create({
                data: {
                  userId: actionLog.recordId,
                  transactionType: 'CREDIT_DECREASE',
                  amount: -amount,
                  paymentMode: newData.paymentMode || 'ONLINE',
                  creditType: creditType as any,
                  companyBalanceAfter: fromUser?.companyCredit || 0,
                  personalBalanceAfter: fromUser?.personalCredit || 0,
                  balanceAfter: fromUser?.credit || 0,
                  sourceType: 'BANK_DEPOSIT',
                  sourceId: transferRefId,
                  description: `Credit deposited to bank (Redone)`,
                  transactionDate: new Date()
                }
              });

              localRedoResult = { type: 'credit_deposit_re_applied', recordId: actionLog.recordId };
            } else if (newData.companyId) {
              // User-to-Cash
              // Deduct from user
              await tx.user.update({
                where: { id: actionLog.recordId },
                data: {
                  personalCredit: creditType === 'PERSONAL' ? { decrement: amount } : undefined,
                  companyCredit: creditType === 'COMPANY' ? { decrement: amount } : undefined,
                  credit: { decrement: amount }
                }
              });

              // Add to company myCash
              await tx.company.update({
                where: { id: newData.companyId },
                data: { myCash: { increment: amount } }
              });

              // Create journal entry
              await tx.journalEntry.create({
                data: {
                  companyId: newData.companyId,
                  entryNumber: `JE-CT-${Date.now()}`,
                  entryDate: new Date(),
                  referenceType: 'CASH_DEPOSIT',
                  referenceId: transferRefId,
                  narration: `Cash deposit from user credit (Redone)`,
                  totalDebit: amount,
                  totalCredit: amount,
                  isAutoEntry: true,
                  isApproved: true,
                  createdById: actionLog.userId,
                  lines: {
                    create: [
                      {
                        accountId: 'CASH_ACCOUNT',
                        debitAmount: amount,
                        creditAmount: 0,
                        narration: 'Cash received from user'
                      },
                      {
                        accountId: 'CAPITAL_ACCOUNT',
                        debitAmount: 0,
                        creditAmount: amount,
                        narration: 'Credit transfer from user'
                      }
                    ]
                  }
                }
              });

              const fromUser = await tx.user.findUnique({ where: { id: actionLog.recordId } });

              // Create transaction record for user
              await tx.creditTransaction.create({
                data: {
                  userId: actionLog.recordId,
                  transactionType: 'CREDIT_DECREASE',
                  amount: -amount,
                  paymentMode: 'CASH',
                  creditType: creditType as any,
                  companyBalanceAfter: fromUser?.companyCredit || 0,
                  personalBalanceAfter: fromUser?.personalCredit || 0,
                  balanceAfter: fromUser?.credit || 0,
                  sourceType: 'CASH_DEPOSIT',
                  sourceId: transferRefId,
                  description: `Cash deposited to company myCash (Redone)`,
                  transactionDate: new Date()
                }
              });

              localRedoResult = { type: 'credit_cash_deposit_re_applied', recordId: actionLog.recordId };
            } else {
              // Add-cash or Add-to-bank
              const isCompany = actionLog.recordType === 'Company';
              if (isCompany) {
                // Add-cash
                await tx.company.update({
                  where: { id: actionLog.recordId },
                  data: { myCash: { increment: amount } }
                });

                // Create journal entry
                await tx.journalEntry.create({
                  data: {
                    companyId: actionLog.recordId,
                    entryNumber: `JE-CT-${Date.now()}`,
                    entryDate: new Date(),
                    referenceType: 'CASH_ADDITION',
                    referenceId: transferRefId,
                    narration: `Cash added to company (Redone)`,
                    totalDebit: amount,
                    totalCredit: amount,
                    isAutoEntry: true,
                    isApproved: true,
                    createdById: actionLog.userId,
                    lines: {
                      create: [
                        {
                          accountId: 'CASH_ACCOUNT',
                          debitAmount: amount,
                          creditAmount: 0,
                          narration: 'Cash added'
                        },
                        {
                          accountId: 'CAPITAL_ACCOUNT',
                          debitAmount: 0,
                          creditAmount: amount,
                          narration: 'Capital contribution'
                        }
                      ]
                    }
                  }
                });

                localRedoResult = { type: 'add_cash_re_applied', recordId: actionLog.recordId };
              } else {
                // Add-to-bank
                const bankAccount = await tx.bankAccount.findUnique({ where: { id: actionLog.recordId } });
                if (bankAccount) {
                  const newBalance = bankAccount.currentBalance + amount;
                  await tx.bankAccount.update({
                    where: { id: actionLog.recordId },
                    data: { currentBalance: newBalance }
                  });

                  // Create bank transaction
                  await tx.bankTransaction.create({
                    data: {
                      bankAccountId: actionLog.recordId,
                      transactionType: 'CREDIT',
                      amount: amount,
                      balanceAfter: newBalance,
                      description: `Funds added to bank account (Redone)`,
                      referenceType: 'BANK_DEPOSIT',
                      referenceId: transferRefId,
                      createdById: actionLog.userId,
                      transactionDate: new Date()
                    }
                  });

                  // Create journal entry
                  await tx.journalEntry.create({
                    data: {
                      companyId: bankAccount.companyId,
                      entryNumber: `JE-CT-${Date.now()}`,
                      entryDate: new Date(),
                      referenceType: 'BANK_DEPOSIT',
                      referenceId: transferRefId,
                      narration: `Bank deposit (Redone)`,
                      totalDebit: amount,
                      totalCredit: amount,
                      isAutoEntry: true,
                      isApproved: true,
                      bankAccountId: actionLog.recordId,
                      createdById: actionLog.userId,
                      lines: {
                        create: [
                          {
                            accountId: 'BANK_ACCOUNT',
                            debitAmount: amount,
                            creditAmount: 0,
                            narration: 'Bank deposit'
                          },
                          {
                            accountId: 'CAPITAL_ACCOUNT',
                            debitAmount: 0,
                            creditAmount: amount,
                            narration: 'Capital contribution'
                          }
                        ]
                      }
                    }
                  });
                }

                localRedoResult = { type: 'add_to_bank_re_applied', recordId: actionLog.recordId };
              }
            }
          }
        }

        await tx.actionLog.update({
          where: { id: actionLogId },
          data: { isRedone: true, redoneAt: new Date(), redoneById: userId, canRedo: false }
        });

        return localRedoResult;
      });

      return NextResponse.json({ success: true, message: 'Action redone successfully', redoResult });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Action undo/redo error:', error);
    return NextResponse.json({ error: 'Failed to process undo/redo', detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
