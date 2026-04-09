import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService, ACCOUNT_CODES } from '@/lib/accounting-service';

/**
 * EQUITY API (Correct implementation using ChartOfAccount)
 *
 * When owner adds equity:
 *   Dr Cash in Hand (1101)     → cashAmount
 *   Dr Bank Account (1102)     → bankAmount
 *   Cr Owner's Capital (3002)  → totalAmount
 *
 * Also syncs CashBook and BankAccount tables for actual balance tracking.
 */

// GET - Fetch equity data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Get Owner's Capital account (3002)
    const equityAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: ACCOUNT_CODES.OWNERS_CAPITAL },
    });

    // Get Cash in Hand account (1101)
    const cashAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: ACCOUNT_CODES.CASH_IN_HAND },
    });

    // Get Bank Account (1102 – aggregated total of real bank accounts)
    const bankAccounts = await db.bankAccount.findMany({
      where: { companyId, isActive: true },
    });
    const totalBankBalance = bankAccounts.reduce((s, b) => s + (b.currentBalance || 0), 0);

    // Get all equity journal entries
    const equityEntries = await db.journalEntry.findMany({
      where: { companyId, referenceType: 'EQUITY_INVESTMENT' },
      include: { lines: { include: { account: true } } },
      orderBy: { entryDate: 'desc' },
    });

    // Also get EquityEntry records (legacy helper table)
    const equityEntryRecords = await db.equityEntry.findMany({
      where: { companyId },
      orderBy: { entryDate: 'desc' },
    });

    const totalEquity = equityAccount?.currentBalance ?? 0;

    return NextResponse.json({
      equity: totalEquity,
      cashInHand: cashAccount?.currentBalance || 0,
      bankBalance: totalBankBalance,
      accounts: {
        equity: equityAccount,
        cash:   cashAccount,
      },
      entries:            equityEntries,
      equityEntryRecords,
    });
  } catch (error) {
    console.error('Error fetching equity:', error);
    return NextResponse.json({ error: 'Failed to fetch equity' }, { status: 500 });
  }
}

// POST - Add new equity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyId,
      cashAmount = 0,
      bankAmount = 0,
      description,
      createdById,
      // Legacy single-amount support
      entryType,
      amount,
      entryDate,
    } = body;

    // Support both new (cashAmount/bankAmount) and old (entryType/amount) format
    let effectiveCash = cashAmount;
    let effectiveBank = bankAmount;

    if (amount && (cashAmount === 0 && bankAmount === 0)) {
      // Legacy call – treat entire amount as bank if entryType is provided
      effectiveCash = 0;
      effectiveBank = parseFloat(amount);
    }

    const totalAmount = effectiveCash + effectiveBank;

    if (!companyId || totalAmount <= 0) {
      return NextResponse.json({
        error: 'Invalid request. Company ID and at least one amount (cash or bank) are required.',
      }, { status: 400 });
    }

    // Initialize chart of accounts for this company if needed
    const accountingService = new AccountingService(companyId);
    await accountingService.initializeChartOfAccounts();

    const result = await db.$transaction(async (tx) => {
      // ─── 1. Get accounts ─────────────────────────────────────────────
      const equityAcc = await tx.chartOfAccount.findFirst({
        where: { companyId, accountCode: ACCOUNT_CODES.OWNERS_CAPITAL },
      });
      const cashAcc = effectiveCash > 0
        ? await tx.chartOfAccount.findFirst({ where: { companyId, accountCode: ACCOUNT_CODES.CASH_IN_HAND } })
        : null;
      const bankAcc = effectiveBank > 0
        ? await tx.chartOfAccount.findFirst({ where: { companyId, accountCode: ACCOUNT_CODES.BANK_ACCOUNT } })
        : null;

      if (!equityAcc) throw new Error('Owner\'s Capital (3002) account not found. Please initialize chart of accounts.');

      // ─── 2. Build journal lines ────────────────────────────────────
      const journalLines: Array<{ accountId: string; debitAmount: number; creditAmount: number; narration: string }> = [];

      if (effectiveCash > 0 && cashAcc) {
        journalLines.push({
          accountId:    cashAcc.id,
          debitAmount:  effectiveCash,
          creditAmount: 0,
          narration:    'Owner equity - Cash',
        });

        // Update ChartOfAccount balance
        await tx.chartOfAccount.update({
          where: { id: cashAcc.id },
          data: { currentBalance: cashAcc.currentBalance + effectiveCash },
        });

        // Update CashBook
        let cashBook = await tx.cashBook.findUnique({ where: { companyId } });
        if (!cashBook) {
          cashBook = await tx.cashBook.create({
            data: { companyId, openingBalance: 0, currentBalance: 0 },
          });
        }
        const newCashBalance = cashBook.currentBalance + effectiveCash;
        await tx.cashBook.update({
          where: { id: cashBook.id },
          data: { currentBalance: newCashBalance, lastUpdatedAt: new Date() },
        });
        await tx.cashBookEntry.create({
          data: {
            cashBookId:    cashBook.id,
            entryType:     'CREDIT',
            amount:        effectiveCash,
            balanceAfter:  newCashBalance,
            description:   description || 'Owner equity investment – Cash',
            referenceType: 'EQUITY_INVESTMENT',
            createdById:   createdById || 'system',
            entryDate:     entryDate ? new Date(entryDate) : new Date(),
          },
        });
      }

      if (effectiveBank > 0 && bankAcc) {
        journalLines.push({
          accountId:    bankAcc.id,
          debitAmount:  effectiveBank,
          creditAmount: 0,
          narration:    'Owner equity - Bank',
        });

        // Update ChartOfAccount balance for bank (1102)
        await tx.chartOfAccount.update({
          where: { id: bankAcc.id },
          data: { currentBalance: bankAcc.currentBalance + effectiveBank },
        });

        // Update actual BankAccount table
        const defaultBank = await tx.bankAccount.findFirst({
          where: { companyId, isDefault: true, isActive: true },
        });
        if (defaultBank) {
          const newBankBalance = defaultBank.currentBalance + effectiveBank;
          await tx.bankAccount.update({
            where: { id: defaultBank.id },
            data: { currentBalance: newBankBalance },
          });
          await tx.bankTransaction.create({
            data: {
              bankAccountId:   defaultBank.id,
              transactionType: 'CREDIT',
              amount:          effectiveBank,
              balanceAfter:    newBankBalance,
              description:     description || 'Owner equity investment – Bank',
              referenceType:   'EQUITY_INVESTMENT',
              transactionDate: entryDate ? new Date(entryDate) : new Date(),
              createdById:     createdById || 'system',
            },
          });
        }
      }

      // ─── 3. Credit Owner's Capital ────────────────────────────────
      journalLines.push({
        accountId:    equityAcc.id,
        debitAmount:  0,
        creditAmount: totalAmount,
        narration:    description || "Owner's capital investment",
      });

      await tx.chartOfAccount.update({
        where: { id: equityAcc.id },
        data: { currentBalance: equityAcc.currentBalance + totalAmount },
      });

      // ─── 4. Create journal entry ───────────────────────────────────
      const count = await tx.journalEntry.count({ where: { companyId } });
      const entryNumber = `JE${String(count + 1).padStart(6, '0')}`;

      const journalEntry = await tx.journalEntry.create({
        data: {
          companyId,
          entryNumber,
          entryDate: entryDate ? new Date(entryDate) : new Date(),
          referenceType: 'EQUITY_INVESTMENT',
          narration: description || `Owner's capital investment – Cash: ₹${effectiveCash}, Bank: ₹${effectiveBank}`,
          totalDebit:  totalAmount,
          totalCredit: totalAmount,
          isAutoEntry: false,
          isApproved:  true,
          createdById: createdById || 'system',
          lines: { create: journalLines },
        },
        include: { lines: { include: { account: true } } },
      });

      // ─── 5. Also create EquityEntry record for history ────────────
      const equityEntryRecord = await tx.equityEntry.create({
        data: {
          companyId,
          entryType:      entryType || 'ADDITIONAL',
          amount:         totalAmount,
          description:    description || 'Owner equity investment',
          entryDate:      entryDate ? new Date(entryDate) : new Date(),
          createdById:    createdById || 'system',
          journalEntryId: journalEntry.id,
        },
      }).catch(() => null); // Don't fail if EquityEntry creation fails

      return { journalEntry, equityBalance: equityAcc.currentBalance + totalAmount, equityEntryRecord };
    }, { maxWait: 30000, timeout: 60000 });

    return NextResponse.json({
      success: true,
      message: 'Equity added successfully',
      entryNumber:    result.journalEntry.entryNumber,
      journalEntry:   result.journalEntry,
      summary: {
        cashAdded:       effectiveCash,
        bankAdded:       effectiveBank,
        totalEquity:     totalAmount,
        newEquityBalance: result.equityBalance,
      },
    });
  } catch (error) {
    console.error('Error adding equity:', error);
    return NextResponse.json({
      error:   'Failed to add equity',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
