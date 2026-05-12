import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountType } from '@prisma/client';

/**
 * POST /api/accounting/withdraw-capital
 *
 * Owner's Capital Withdrawal (Drawing) with double-entry accounting
 *
 * - Debit:  Owner's Capital (3002) — reduces equity
 * - Credit: Cash in Hand (1101) / Bank Account — reduces asset
 *
 * Also writes to EquityEntry table (WITHDRAWAL) so the balance sheet
 * and ledger reflect the withdrawal even without journal-entry sync.
 *
 * KEY FIX: Auto-creates missing chartOfAccount rows instead of returning
 * "Account not found" error (old code crashed if accounts weren't pre-seeded).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyId,
      cashAmount,
      bankAmount,
      bankAccountId,
      date,
      description,
      createdById,
    } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const cash  = parseFloat(cashAmount)  || 0;
    const bank  = parseFloat(bankAmount)  || 0;
    const totalWithdrawal = cash + bank;

    if (totalWithdrawal <= 0) {
      return NextResponse.json(
        { error: 'At least one amount (cash or bank) must be greater than 0' },
        { status: 400 }
      );
    }

    if (bank > 0 && !bankAccountId) {
      return NextResponse.json(
        { error: 'Bank account ID is required when bank amount is provided' },
        { status: 400 }
      );
    }

    // Verify company exists
    const company = await db.company.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!company) {
      return NextResponse.json({ error: `Company not found: ${companyId}` }, { status: 404 });
    }

    // Check sufficient cash balance
    if (cash > 0) {
      const cashBook = await db.cashBook.findUnique({ where: { companyId } });
      if (!cashBook || (cashBook.currentBalance || 0) < cash) {
        return NextResponse.json(
          { error: `Insufficient cash balance. Available: ₹${(cashBook?.currentBalance || 0).toLocaleString()}` },
          { status: 400 }
        );
      }
    }

    // Check sufficient bank balance
    if (bank > 0 && bankAccountId) {
      const bankRow = await db.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (!bankRow || (bankRow.currentBalance || 0) < bank) {
        return NextResponse.json(
          { error: `Insufficient bank balance. Available: ₹${(bankRow?.currentBalance || 0).toLocaleString()}` },
          { status: 400 }
        );
      }
    }

    const entryDate = date ? new Date(date) : new Date();

    // ── Helper: get or auto-create a chartOfAccount row ───────────────────────
    const getOrCreateAccount = async (code: string, name: string, type: AccountType) => {
      let acc = await db.chartOfAccount.findFirst({
        where: { companyId, accountCode: code },
        select: { id: true, accountCode: true, accountType: true, currentBalance: true }
      });
      if (!acc) {
        acc = await db.chartOfAccount.create({
          data: {
            companyId,
            accountCode: code,
            accountName: name,
            accountType: type,
            openingBalance: 0,
            currentBalance: 0,
            isActive: true,
          },
          select: { id: true, accountCode: true, accountType: true, currentBalance: true }
        });
        console.log(`[withdraw-capital] Auto-created missing account ${code} - ${name}`);
      }
      return acc;
    };

    // ── Resolve required chart-of-account entries ─────────────────────────────
    // Owner's Capital (3002)
    const capitalAcc = await getOrCreateAccount('3002', "Owner's Capital", 'EQUITY');

    // Cash in Hand (1101)
    const cashAcc = cash > 0 ? await getOrCreateAccount('1101', 'Cash in Hand', 'ASSET') : null;

    // Bank chart-of-account (try to find by name, else auto-create)
    let bankChartAcc: { id: string; accountCode: string; accountType: string } | null = null;
    if (bank > 0 && bankAccountId) {
      const bankRow = await db.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (bankRow) {
        // Try exact name match first
        let found = await db.chartOfAccount.findFirst({
          where: {
            companyId,
            accountCode: { startsWith: '14' },
            accountName: { contains: bankRow.bankName },
          },
          select: { id: true, accountCode: true, accountType: true }
        });
        // Fall back to first 1102 account
        if (!found) {
          found = await db.chartOfAccount.findFirst({
            where: { companyId, accountCode: { startsWith: '1102' } },
            select: { id: true, accountCode: true, accountType: true }
          });
        }
        // Auto-create if still not found
        if (!found) {
          const count = await db.chartOfAccount.count({
            where: { companyId, accountCode: { startsWith: '14' } }
          });
          found = await db.chartOfAccount.create({
            data: {
              companyId,
              accountCode: `140${count + 1}`,
              accountName: `${bankRow.bankName} - ${bankRow.accountNumber.slice(-4)}`,
              accountType: 'ASSET',
              openingBalance: 0,
              currentBalance: bankRow.currentBalance || 0,
              isActive: true,
            },
            select: { id: true, accountCode: true, accountType: true }
          });
          console.log(`[withdraw-capital] Auto-created bank chart account ${found.accountCode}`);
        }
        bankChartAcc = found;
      }
    }

    // ── Build journal lines ───────────────────────────────────────────────────
    type JLine = { accountId: string; debitAmount: number; creditAmount: number; narration: string };
    const lines: JLine[] = [];

    // Debit: Owner's Capital (reduces equity)
    lines.push({
      accountId: capitalAcc.id,
      debitAmount: totalWithdrawal,
      creditAmount: 0,
      narration: description || "Owner's Capital Withdrawal (Drawing)",
    });

    // Credit: Cash
    if (cash > 0 && cashAcc) {
      lines.push({
        accountId: cashAcc.id,
        debitAmount: 0,
        creditAmount: cash,
        narration: 'Cash withdrawn by owner',
      });
    }

    // Credit: Bank
    if (bank > 0 && bankChartAcc) {
      lines.push({
        accountId: bankChartAcc.id,
        debitAmount: 0,
        creditAmount: bank,
        narration: 'Bank withdrawal by owner',
      });
    }

    // ── Create journal entry ──────────────────────────────────────────────────
    const jeCount = await db.journalEntry.count({ where: { companyId } });
    const entryNumber = `JE${String(jeCount + 1).padStart(6, '0')}`;
    const totalDebit  = lines.reduce((s, l) => s + l.debitAmount,  0);
    const totalCredit = lines.reduce((s, l) => s + l.creditAmount, 0);

    const je = await db.journalEntry.create({
      data: {
        companyId,
        entryNumber,
        entryDate,
        referenceType: 'CAPITAL_WITHDRAWAL',
        referenceId: `${companyId}-CW-${Date.now()}`,
        narration: description || `Owner's Capital Withdrawal – Cash: ₹${cash.toLocaleString()}, Bank: ₹${bank.toLocaleString()}`,
        totalDebit,
        totalCredit,
        isAutoEntry: true,
        isApproved: true,
        createdById: createdById || 'system',
        paymentMode: bank > 0 ? 'BANK_TRANSFER' : 'CASH',
        lines: { create: lines },
      },
    });

    // ── Update chartOfAccount balances ────────────────────────────────────────
    await db.chartOfAccount.update({
      where: { id: capitalAcc.id },
      data: { currentBalance: { decrement: totalWithdrawal } },
    });
    if (cash > 0 && cashAcc) {
      await db.chartOfAccount.update({
        where: { id: cashAcc.id },
        data: { currentBalance: { decrement: cash } },
      });
    }
    if (bank > 0 && bankChartAcc) {
      await db.chartOfAccount.update({
        where: { id: bankChartAcc.id },
        data: { currentBalance: { decrement: bank } },
      });
    }

    // ── Write to EquityEntry table (source of truth for capital) ─────────────
    await (db.equityEntry as any).create({
      data: {
        companyId,
        entryType: 'WITHDRAWAL',
        amount: totalWithdrawal,
        description: description || "Owner's Capital Withdrawal",
        referenceId: je.id,
        createdAt: entryDate,
      },
    }).catch((err: Error) => {
      console.warn('[withdraw-capital] EquityEntry create warn (non-fatal):', err.message);
    });

    // ── Update BankAccount + create BankTransaction ───────────────────────────
    if (bank > 0 && bankAccountId) {
      await db.bankAccount.update({
        where: { id: bankAccountId },
        data: { currentBalance: { decrement: bank } },
      });
      const updatedBank = await db.bankAccount.findUnique({
        where: { id: bankAccountId },
        select: { currentBalance: true },
      });
      await db.bankTransaction.create({
        data: {
          bankAccountId,
          transactionType: 'DEBIT',
          amount: bank,
          description: description || "Owner's Capital Withdrawal",
          referenceType: 'CAPITAL_WITHDRAWAL',
          referenceId: je.id,
          transactionDate: entryDate,
          balanceAfter: updatedBank?.currentBalance || 0,
          createdById: createdById || 'system',
        },
      });
    }

    // ── Update CashBook + create CashBookEntry ────────────────────────────────
    if (cash > 0) {
      const cashBook = await db.cashBook.findUnique({ where: { companyId } });
      if (cashBook) {
        const newBalance = (cashBook.currentBalance || 0) - cash;
        await db.cashBookEntry.create({
          data: {
            cashBookId: cashBook.id,
            entryType: 'DEBIT',
            amount: cash,
            balanceAfter: newBalance,
            description: description || "Owner's Capital Withdrawal (Cash)",
            referenceType: 'CAPITAL_WITHDRAWAL',
            referenceId: je.id,
            entryDate,
            createdById: createdById || 'system',
          },
        });
        await db.cashBook.update({
          where: { id: cashBook.id },
          data: { currentBalance: newBalance },
        });
      }
    }

    // ── Return updated equity balance ─────────────────────────────────────────
    const updatedCapital = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: '3002' },
    });

    return NextResponse.json({
      success: true,
      journalEntryId: je.id,
      entryNumber,
      summary: {
        cashWithdrawn: cash,
        bankWithdrawn: bank,
        totalWithdrawal,
        equityBalance: updatedCapital?.currentBalance || 0,
      },
      message: `Successfully withdrew ₹${totalWithdrawal.toLocaleString('en-IN')} from Owner's Capital`,
    });

  } catch (error) {
    console.error('[withdraw-capital] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process capital withdrawal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
