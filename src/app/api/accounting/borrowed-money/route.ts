import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService, ACCOUNT_CODES } from '@/lib/accounting-service';

// GET - Fetch all borrowed money entries for a company
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const borrowedEntries = await db.borrowedMoney.findMany({
      where: { companyId },
      orderBy: { borrowedDate: 'desc' }
    });

    // Calculate totals
    const totalBorrowed = borrowedEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalRepaid = borrowedEntries.reduce((sum, entry) => sum + entry.amountRepaid, 0);
    const totalOutstanding = totalBorrowed - totalRepaid;

    // Group by source type
    const bySourceType = borrowedEntries.reduce((acc, entry) => {
      if (!acc[entry.sourceType]) {
        acc[entry.sourceType] = { count: 0, total: 0, repaid: 0 };
      }
      acc[entry.sourceType].count++;
      acc[entry.sourceType].total += entry.amount;
      acc[entry.sourceType].repaid += entry.amountRepaid;
      return acc;
    }, {} as Record<string, { count: number; total: number; repaid: number }>);

    // Get liability account balances from Chart of Accounts
    const bankLoansAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: ACCOUNT_CODES.BANK_LOANS }
    });
    const borrowedFundsAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: ACCOUNT_CODES.BORROWED_FUNDS }
    });
    const investorCapitalAccount = await db.chartOfAccount.findFirst({
      where: { companyId, accountCode: ACCOUNT_CODES.INVESTOR_CAPITAL }
    });

    return NextResponse.json({
      borrowedEntries,
      totalBorrowed,
      totalRepaid,
      totalOutstanding,
      bySourceType,
      activeCount: borrowedEntries.filter(e => e.status === 'ACTIVE').length,
      partiallyPaidCount: borrowedEntries.filter(e => e.status === 'PARTIALLY_PAID').length,
      fullyPaidCount: borrowedEntries.filter(e => e.status === 'FULLY_PAID').length,
      // Chart of Account balances
      chartOfAccountBalances: {
        bankLoans: bankLoansAccount?.currentBalance || 0,
        borrowedFunds: borrowedFundsAccount?.currentBalance || 0,
        investorCapital: investorCapitalAccount?.currentBalance || 0,
        totalLiabilities: (bankLoansAccount?.currentBalance || 0) + 
                          (borrowedFundsAccount?.currentBalance || 0) + 
                          (investorCapitalAccount?.currentBalance || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching borrowed money entries:', error);
    return NextResponse.json({ error: 'Failed to fetch borrowed money entries' }, { status: 500 });
  }
}

// POST - Add new borrowed money entry with proper double-entry accounting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      companyId, 
      sourceType, // 'BANK_LOAN' | 'BORROWED_FUNDS' | 'INVESTOR_CAPITAL'
      sourceName, 
      sourceId,
      amount, 
      interestRate, 
      dueDate,
      description, 
      borrowedDate,
      bankAccountId,
      createdById 
    } = body;

    if (!companyId || !sourceType || !sourceName || !amount || !createdById) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate sourceType
    const validSourceTypes = ['BANK_LOAN', 'BORROWED_FUNDS', 'INVESTOR_CAPITAL'];
    if (!validSourceTypes.includes(sourceType)) {
      return NextResponse.json({ error: 'Invalid source type. Must be BANK_LOAN, BORROWED_FUNDS, or INVESTOR_CAPITAL' }, { status: 400 });
    }

    // Create borrowed money record for tracking
    const borrowedEntry = await db.borrowedMoney.create({
      data: {
        companyId,
        sourceType,
        sourceName,
        sourceId,
        amount: parseFloat(amount),
        interestRate: interestRate ? parseFloat(interestRate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        description,
        borrowedDate: borrowedDate ? new Date(borrowedDate) : new Date(),
        createdById
      }
    });

    // Use AccountingService for proper double-entry accounting
    const accountingService = new AccountingService(companyId);
    
    // Ensure chart of accounts is initialized
    await accountingService.initializeChartOfAccounts();

    // Create journal entry using the new method
    const journalEntryId = await accountingService.recordExternalBorrowing({
      amount: parseFloat(amount),
      source: sourceName,
      loanType: sourceType as 'BANK_LOAN' | 'BORROWED_FUNDS' | 'INVESTOR_CAPITAL',
      borrowingDate: borrowedEntry.borrowedDate,
      createdById,
      bankAccountId,
      description: description || `Loan received from ${sourceName}`,
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined
    });

    // Update borrowed entry with journal reference
    await db.borrowedMoney.update({
      where: { id: borrowedEntry.id },
      data: { journalEntryId }
    });

    // Get bank account to update its balance
    if (bankAccountId) {
      const bankAccount = await db.bankAccount.findUnique({
        where: { id: bankAccountId }
      });
      
      if (bankAccount) {
        await db.bankAccount.update({
          where: { id: bankAccountId },
          data: {
            currentBalance: bankAccount.currentBalance + parseFloat(amount)
          }
        });

        // Create bank transaction record
        await db.bankTransaction.create({
          data: {
            bankAccountId,
            transactionType: 'CREDIT',
            amount: parseFloat(amount),
            balanceAfter: bankAccount.currentBalance + parseFloat(amount),
            description: description || `Loan received from ${sourceName}`,
            referenceType: 'BORROWED_MONEY',
            referenceId: borrowedEntry.id,
            transactionDate: borrowedEntry.borrowedDate
          }
        });
      }
    }

    // Sync bank balance to Chart of Accounts
    await accountingService.syncAllBankCashBalances();

    return NextResponse.json({
      success: true,
      message: `Successfully recorded borrowing of ₹${parseFloat(amount).toLocaleString()} from ${sourceName}`,
      borrowedEntry,
      journalEntryId
    });
  } catch (error) {
    console.error('Error creating borrowed money entry:', error);
    return NextResponse.json({ 
      error: 'Failed to create borrowed money entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT - Record repayment of borrowed money
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyId,
      borrowedMoneyId,
      principalAmount,
      interestAmount,
      repaymentDate,
      bankAccountId,
      description,
      createdById
    } = body;

    if (!companyId || !borrowedMoneyId || !principalAmount || !createdById) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the borrowed money entry
    const borrowedEntry = await db.borrowedMoney.findUnique({
      where: { id: borrowedMoneyId }
    });

    if (!borrowedEntry) {
      return NextResponse.json({ error: 'Borrowed money entry not found' }, { status: 404 });
    }

    const totalPayment = parseFloat(principalAmount) + (parseFloat(interestAmount) || 0);

    // Use AccountingService for proper double-entry accounting
    const accountingService = new AccountingService(companyId);

    // Create journal entry for repayment
    const journalEntryId = await accountingService.recordLoanRepayment({
      amount: totalPayment,
      principalComponent: parseFloat(principalAmount),
      interestComponent: parseFloat(interestAmount) || 0,
      source: borrowedEntry.sourceName,
      loanType: borrowedEntry.sourceType as 'BANK_LOAN' | 'BORROWED_FUNDS' | 'INVESTOR_CAPITAL',
      repaymentDate: repaymentDate ? new Date(repaymentDate) : new Date(),
      createdById,
      bankAccountId,
      description: description || `Repayment to ${borrowedEntry.sourceName}`
    });

    // Update borrowed money entry
    const newAmountRepaid = borrowedEntry.amountRepaid + parseFloat(principalAmount);
    const newStatus = newAmountRepaid >= borrowedEntry.amount ? 'FULLY_PAID' : 
                      newAmountRepaid > 0 ? 'PARTIALLY_PAID' : 'ACTIVE';

    await db.borrowedMoney.update({
      where: { id: borrowedMoneyId },
      data: {
        amountRepaid: newAmountRepaid,
        status: newStatus,
        lastPaymentDate: new Date()
      }
    });

    // Update bank account balance
    if (bankAccountId) {
      const bankAccount = await db.bankAccount.findUnique({
        where: { id: bankAccountId }
      });
      
      if (bankAccount) {
        await db.bankAccount.update({
          where: { id: bankAccountId },
          data: {
            currentBalance: bankAccount.currentBalance - totalPayment
          }
        });

        // Create bank transaction record
        await db.bankTransaction.create({
          data: {
            bankAccountId,
            transactionType: 'DEBIT',
            amount: totalPayment,
            balanceAfter: bankAccount.currentBalance - totalPayment,
            description: description || `Loan repayment to ${borrowedEntry.sourceName}`,
            referenceType: 'LOAN_REPAYMENT',
            referenceId: borrowedMoneyId,
            transactionDate: repaymentDate ? new Date(repaymentDate) : new Date()
          }
        });
      }
    }

    // Sync bank balance to Chart of Accounts
    await accountingService.syncAllBankCashBalances();

    return NextResponse.json({
      success: true,
      message: `Successfully recorded repayment of ₹${totalPayment.toLocaleString()} to ${borrowedEntry.sourceName}`,
      journalEntryId,
      newStatus
    });
  } catch (error) {
    console.error('Error recording repayment:', error);
    return NextResponse.json({ 
      error: 'Failed to record repayment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
