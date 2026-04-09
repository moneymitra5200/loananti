import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService, ACCOUNT_CODES } from '@/lib/accounting-service';

/**
 * INVEST MONEY API (Correct implementation using ChartOfAccount)
 *
 * When company invests money (FD, MF, Bonds, etc.):
 *   Dr Investments (1500 – Fixed Assets/Investments category)
 *   Cr Bank Account (1102) or Cash in Hand (1101)
 *
 * This correctly reduces cash/bank and increases investment asset.
 */

// GET - Fetch all invest money entries for a company
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const investEntries = await db.investMoney.findMany({
      where: { companyId },
      orderBy: { investedDate: 'desc' },
    });

    const totalInvested     = investEntries.reduce((s, e) => s + e.amount, 0);
    const totalCurrentValue = investEntries.reduce((s, e) => s + (e.currentValue || e.amount), 0);

    const byInvestmentType = investEntries.reduce((acc, entry) => {
      if (!acc[entry.investmentType]) {
        acc[entry.investmentType] = { count: 0, total: 0, currentValue: 0 };
      }
      acc[entry.investmentType].count++;
      acc[entry.investmentType].total        += entry.amount;
      acc[entry.investmentType].currentValue += entry.currentValue || entry.amount;
      return acc;
    }, {} as Record<string, { count: number; total: number; currentValue: number }>);

    return NextResponse.json({
      investEntries,
      totalInvested,
      totalCurrentValue,
      byInvestmentType,
      activeCount:    investEntries.filter(e => e.status === 'ACTIVE').length,
      maturedCount:   investEntries.filter(e => e.status === 'MATURED').length,
      withdrawnCount: investEntries.filter(e => e.status === 'WITHDRAWN').length,
    });
  } catch (error) {
    console.error('Error fetching invest money entries:', error);
    return NextResponse.json({ error: 'Failed to fetch invest money entries' }, { status: 500 });
  }
}

// POST - Add new invest money entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyId,
      investmentType,
      investmentName,
      amount,
      interestRate,
      maturityDate,
      investedDate,
      description,
      createdById,
      paymentMode = 'BANK_TRANSFER', // BANK_TRANSFER or CASH
    } = body;

    if (!companyId || !investmentType || !investmentName || !amount || !createdById) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);

    // Initialize chart of accounts
    const accountingService = new AccountingService(companyId);
    await accountingService.initializeChartOfAccounts();

    const result = await db.$transaction(async (tx) => {
      // ─── 1. Determine source account (Cash or Bank) ──────────────
      const sourceAccountCode = paymentMode === 'CASH'
        ? ACCOUNT_CODES.CASH_IN_HAND
        : ACCOUNT_CODES.BANK_ACCOUNT;

      const sourceAccount = await tx.chartOfAccount.findFirst({
        where: { companyId, accountCode: sourceAccountCode },
      });

      if (!sourceAccount) {
        throw new Error(`Source account (${sourceAccountCode}) not found. Please initialize chart of accounts.`);
      }

      if ((sourceAccount.currentBalance || 0) < parsedAmount) {
        throw new Error(`Insufficient balance. Available: ₹${sourceAccount.currentBalance}, Required: ₹${parsedAmount}`);
      }

      // ─── 2. Get or create Fixed Assets account (1500) ─────────────
      let investAccount = await tx.chartOfAccount.findFirst({
        where: { companyId, accountCode: '1500' },
      });

      if (!investAccount) {
        investAccount = await tx.chartOfAccount.create({
          data: {
            companyId,
            accountCode:  '1500',
            accountName:  'Fixed Assets / Investments',
            accountType:  'ASSET',
            description:  'Long-term investments and fixed assets',
            isSystemAccount: true,
            openingBalance:  0,
            currentBalance:  0,
            isActive: true,
          },
        });
      }

      // ─── 3. Create InvestMoney record ────────────────────────────
      const investEntry = await tx.investMoney.create({
        data: {
          companyId,
          investmentType,
          investmentName,
          amount:        parsedAmount,
          interestRate:  interestRate ? parseFloat(interestRate) : null,
          maturityDate:  maturityDate ? new Date(maturityDate) : null,
          investedDate:  investedDate ? new Date(investedDate) : new Date(),
          description,
          createdById,
        },
      });

      // ─── 4. Build journal entry ────────────────────────────────────
      //   Dr Investments/Fixed Assets (asset increases)
      //   Cr Bank / Cash (asset decreases – money goes OUT to investment)
      const count = await tx.journalEntry.count({ where: { companyId } });
      const entryNumber = `JE${String(count + 1).padStart(6, '0')}`;

      const journalEntry = await tx.journalEntry.create({
        data: {
          companyId,
          entryNumber,
          entryDate:     investEntry.investedDate,
          referenceType: 'INVEST_MONEY',
          referenceId:   investEntry.id,
          narration:     description || `Investment: ${investmentName} (${investmentType})`,
          totalDebit:    parsedAmount,
          totalCredit:   parsedAmount,
          isAutoEntry:   true,
          isApproved:    true,
          createdById,
          lines: {
            create: [
              {
                // Dr Investments
                accountId:    investAccount.id,
                debitAmount:  parsedAmount,
                creditAmount: 0,
                narration:    `Investment in ${investmentName}`,
              },
              {
                // Cr Bank/Cash
                accountId:    sourceAccount.id,
                debitAmount:  0,
                creditAmount: parsedAmount,
                narration:    `Payment for investment ${investmentName}`,
              },
            ],
          },
        },
      });

      // ─── 5. Update ChartOfAccount balances ────────────────────────
      // Investment account increases (debit = increase for asset)
      await tx.chartOfAccount.update({
        where: { id: investAccount.id },
        data: { currentBalance: investAccount.currentBalance + parsedAmount },
      });

      // Source account decreases (credit = decrease for asset)
      await tx.chartOfAccount.update({
        where: { id: sourceAccount.id },
        data: { currentBalance: sourceAccount.currentBalance - parsedAmount },
      });

      // ─── 6. Update actual Bank/Cash tables ────────────────────────
      if (paymentMode === 'CASH') {
        const cashBook = await tx.cashBook.findUnique({ where: { companyId } });
        if (cashBook) {
          const newBal = cashBook.currentBalance - parsedAmount;
          await tx.cashBook.update({
            where: { id: cashBook.id },
            data: { currentBalance: newBal, lastUpdatedAt: new Date() },
          });
          await tx.cashBookEntry.create({
            data: {
              cashBookId:    cashBook.id,
              entryType:     'DEBIT',
              amount:        parsedAmount,
              balanceAfter:  newBal,
              description:   `Investment: ${investmentName}`,
              referenceType: 'INVEST_MONEY',
              referenceId:   investEntry.id,
              createdById,
              entryDate:     investEntry.investedDate,
            },
          });
        }
      } else {
        // Bank transfer
        const defaultBank = await tx.bankAccount.findFirst({
          where: { companyId, isDefault: true, isActive: true },
        });
        if (defaultBank) {
          const newBal = defaultBank.currentBalance - parsedAmount;
          await tx.bankAccount.update({
            where: { id: defaultBank.id },
            data: { currentBalance: newBal },
          });
          await tx.bankTransaction.create({
            data: {
              bankAccountId:   defaultBank.id,
              transactionType: 'DEBIT',
              amount:          parsedAmount,
              balanceAfter:    newBal,
              description:     `Investment: ${investmentName}`,
              referenceType:   'INVEST_MONEY',
              referenceId:     investEntry.id,
              transactionDate: investEntry.investedDate,
              createdById,
            },
          });
        }
      }

      // Update invest entry with journal reference
      await tx.investMoney.update({
        where: { id: investEntry.id },
        data:  { journalEntryId: journalEntry.id },
      });

      return { investEntry, journalEntry };
    }, { maxWait: 30000, timeout: 60000 });

    return NextResponse.json({
      success:     true,
      investEntry: result.investEntry,
      journalEntry: result.journalEntry,
    });
  } catch (error) {
    console.error('Error creating invest money entry:', error);
    return NextResponse.json({
      error:   'Failed to create invest money entry',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
