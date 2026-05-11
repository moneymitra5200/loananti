import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ACCOUNT_CODES } from '@/lib/accounting-service';

/**
 * POST /api/accounting/withdraw-capital
 *
 * Owner's Capital Withdrawal (Drawing) with double-entry accounting
 *
 * Example: Owner withdraws ₹50,000 cash
 * - Debit:  Owner's Drawings / Capital (3002) – reduces equity
 * - Credit: Cash in Hand (1101) / Bank Account (14xx) – reduces asset
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

    const cash = parseFloat(cashAmount) || 0;
    const bank = parseFloat(bankAmount) || 0;
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
      const bankAcc = await db.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (!bankAcc || (bankAcc.currentBalance || 0) < bank) {
        return NextResponse.json(
          { error: `Insufficient bank balance. Available: ₹${(bankAcc?.currentBalance || 0).toLocaleString()}` },
          { status: 400 }
        );
      }
    }

    const entryDate = date ? new Date(date) : new Date();

    // Get chart of accounts needed
    const accountCodes: string[] = [ACCOUNT_CODES.OWNERS_CAPITAL];
    if (cash > 0) accountCodes.push(ACCOUNT_CODES.CASH_IN_HAND);

    let bankAccountCode = '1400';
    if (bank > 0 && bankAccountId) {
      const bankAccount = await db.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (bankAccount) {
        let bankChartAccount = await db.chartOfAccount.findFirst({
          where: {
            companyId,
            accountCode: { startsWith: '14' },
            accountName: { contains: bankAccount.bankName },
          },
        });
        if (bankChartAccount) {
          bankAccountCode = bankChartAccount.accountCode;
        }
      }
      accountCodes.push(bankAccountCode);
    }

    const accounts = await db.chartOfAccount.findMany({
      where: { companyId, accountCode: { in: accountCodes } },
      select: { id: true, accountCode: true, accountType: true },
    });
    const accMap = new Map(accounts.map((a) => [a.accountCode, a.id]));
    const accountTypeMap = new Map(accounts.map((a) => [a.accountCode, a.accountType as string]));

    // Validate all accounts exist
    for (const code of accountCodes) {
      if (!accMap.get(code)) {
        return NextResponse.json(
          { error: `Account not found for code: ${code}. Please initialize chart of accounts first.` },
          { status: 400 }
        );
      }
    }

    // Build journal lines
    // Debit: Owner's Capital (reduces equity)
    // Credit: Cash / Bank (reduces asset)
    const lines: Array<{
      accountCode: string;
      debitAmount: number;
      creditAmount: number;
      narration: string;
    }> = [];

    lines.push({
      accountCode: ACCOUNT_CODES.OWNERS_CAPITAL,
      debitAmount: totalWithdrawal,
      creditAmount: 0,
      narration: description || "Owner's Capital Withdrawal (Drawing)",
    });

    if (cash > 0) {
      lines.push({
        accountCode: ACCOUNT_CODES.CASH_IN_HAND,
        debitAmount: 0,
        creditAmount: cash,
        narration: 'Cash withdrawn by owner',
      });
    }

    if (bank > 0) {
      lines.push({
        accountCode: bankAccountCode,
        debitAmount: 0,
        creditAmount: bank,
        narration: 'Bank withdrawal by owner',
      });
    }

    // Create journal entry
    const jeCount = await db.journalEntry.count({ where: { companyId } });
    const entryNumber = `JE${String(jeCount + 1).padStart(6, '0')}`;
    const totalDebit = lines.reduce((s, l) => s + l.debitAmount, 0);
    const totalCredit = lines.reduce((s, l) => s + l.creditAmount, 0);

    const je = await db.journalEntry.create({
      data: {
        companyId,
        entryNumber,
        entryDate,
        referenceType: 'CAPITAL_WITHDRAWAL',
        referenceId: `${companyId}-CW-${Date.now()}`,
        narration:
          description ||
          `Owner's Capital Withdrawal - Cash: ₹${cash.toLocaleString()}, Bank: ₹${bank.toLocaleString()}`,
        totalDebit,
        totalCredit,
        isAutoEntry: true,
        isApproved: true,
        createdById: createdById || 'system',
        paymentMode: bank > 0 ? 'BANK_TRANSFER' : 'CASH',
        lines: {
          create: lines.map((l) => ({
            accountId: accMap.get(l.accountCode)!,
            debitAmount: l.debitAmount,
            creditAmount: l.creditAmount,
            narration: l.narration,
          })),
        },
      },
    });

    // Update chart of account balances
    for (const line of lines) {
      const accId = accMap.get(line.accountCode)!;
      const accType = accountTypeMap.get(line.accountCode) || 'ASSET';
      const isCreditNormal = accType === 'EQUITY' || accType === 'LIABILITY' || accType === 'INCOME';
      // For withdrawal: equity is debited (decreases), assets are credited (decrease)
      const delta = isCreditNormal
        ? line.creditAmount - line.debitAmount  // credit-normal: debit reduces
        : line.debitAmount - line.creditAmount; // debit-normal: credit reduces
      await db.chartOfAccount.update({
        where: { id: accId },
        data: { currentBalance: { increment: delta } },
      });
    }

    // Update bank account balance
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

    // Update CashBook balance
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

    // Get updated equity balance
    const equityAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: ACCOUNT_CODES.OWNERS_CAPITAL },
    });

    return NextResponse.json({
      success: true,
      journalEntryId: je.id,
      entryNumber,
      summary: {
        cashWithdrawn: cash,
        bankWithdrawn: bank,
        totalWithdrawal,
        equityBalance: equityAccount?.currentBalance || 0,
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
