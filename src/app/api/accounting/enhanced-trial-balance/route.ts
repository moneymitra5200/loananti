import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Calculate Trial Balance
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // 1. Get all account heads with balances
    const accountHeads = await db.accountHead.findMany({
      where: { companyId }
    });

    // 2. Get all daybook entries
    const daybookEntries = await db.daybookEntry.findMany({
      where: { companyId }
    });

    // 3. Calculate Bank Balance
    const bankAccounts = await db.bankAccount.findMany({
      where: { companyId, isActive: true }
    });
    const bankBalance = bankAccounts.reduce((sum, b) => sum + b.currentBalance, 0);

    // 4. Calculate Cashbook Balance
    const cashBook = await db.cashBook.findUnique({
      where: { companyId }
    });
    const cashbookBalance = cashBook?.currentBalance || 0;

    // 5. Calculate Loan Principal (Outstanding)
    // Online loans
    const onlineLoans = await db.loanApplication.findMany({
      where: { companyId, status: { in: ['DISBURSED', 'ACTIVE'] } },
      include: { emiSchedules: true }
    });
    
    let loanPrincipal = 0;
    const loanDetails: any[] = [];
    
    for (const loan of onlineLoans) {
      const outstandingPrincipal = loan.emiSchedules.reduce((sum, emi) => {
        return sum + (emi.principalAmount - emi.paidPrincipal);
      }, 0);
      loanPrincipal += outstandingPrincipal;
      if (outstandingPrincipal > 0) {
        loanDetails.push({
          loanNo: loan.applicationNo,
          customer: `${loan.firstName || ''} ${loan.lastName || ''}`.trim(),
          outstanding: outstandingPrincipal
        });
      }
    }

    // Offline loans
    const offlineLoans = await db.offlineLoan.findMany({
      where: { companyId, status: { in: ['ACTIVE', 'INTEREST_ONLY'] } },
      include: { emis: true }
    });
    
    for (const loan of offlineLoans) {
      const outstandingPrincipal = loan.emis.reduce((sum, emi) => {
        return sum + (emi.principalAmount - (emi.paidPrincipal || 0));
      }, 0);
      loanPrincipal += outstandingPrincipal;
      if (outstandingPrincipal > 0) {
        loanDetails.push({
          loanNo: loan.loanNumber,
          customer: loan.customerName,
          outstanding: outstandingPrincipal
        });
      }
    }

    // 6. Get Equity entries
    const equityEntries = await db.equityEntry.findMany({
      where: { companyId }
    });
    
    const totalEquity = equityEntries.reduce((sum, e) => {
      if (e.entryType === 'WITHDRAWAL') {
        return sum - e.amount;
      }
      return sum + e.amount;
    }, 0);

    // 7. Get Borrowed Money
    const borrowedMoney = await db.borrowedMoney.findMany({
      where: { companyId }
    });
    
    const totalBorrowed = borrowedMoney.reduce((sum, b) => sum + (b.amount - (b.amountRepaid || 0)), 0);

    // 8. Get Invest Money
    const investMoney = await db.investMoney.findMany({
      where: { companyId }
    });
    
    const totalInvested = investMoney.reduce((sum, i) => sum + i.amount, 0);

    // 9. Calculate Interest Receivable - Pending interest from all active loans
    let interestReceivable = 0;
    const interestDetails: any[] = [];
    
    // Online loans - pending interest from EMI schedules
    for (const loan of onlineLoans) {
      const pendingInterest = loan.emiSchedules.reduce((sum, emi) => {
        return sum + (emi.interestAmount - (emi.paidInterest || 0));
      }, 0);
      interestReceivable += pendingInterest;
      if (pendingInterest > 0) {
        interestDetails.push({
          loanNo: loan.applicationNo,
          customer: `${loan.firstName || ''} ${loan.lastName || ''}`.trim(),
          pendingInterest
        });
      }
    }
    
    // Offline loans - pending interest
    for (const loan of offlineLoans) {
      const pendingInterest = loan.emis.reduce((sum, emi) => {
        return sum + (emi.interestAmount - (emi.paidInterest || 0));
      }, 0);
      interestReceivable += pendingInterest;
      if (pendingInterest > 0) {
        interestDetails.push({
          loanNo: loan.loanNumber,
          customer: loan.customerName,
          pendingInterest
        });
      }
    }

    // 10. Calculate P&L from daybook
    const incomeEntries = daybookEntries.filter(e => e.accountType === 'INCOME');
    const expenseEntries = daybookEntries.filter(e => e.accountType === 'EXPENSE');
    
    const totalIncome = incomeEntries.reduce((sum, e) => sum + e.credit, 0);
    const totalExpenses = expenseEntries.reduce((sum, e) => sum + e.debit, 0);
    const netProfitLoss = totalIncome - totalExpenses;
    const isProfit = netProfitLoss >= 0;

    // 10. Calculate Final Equity
    const finalEquity = totalEquity + netProfitLoss;

    // Calculate totals
    const totalLiabilities = finalEquity + totalBorrowed;
    const totalAssets = totalInvested + bankBalance + cashbookBalance + loanPrincipal + interestReceivable;

    return NextResponse.json({
      leftSide: {
        equity: {
          total: totalEquity,
          entries: equityEntries.map(e => ({
            ...e,
            type: e.entryType,
            amount: e.entryType === 'WITHDRAWAL' ? -e.amount : e.amount
          }))
        },
        borrowedMoney: {
          total: totalBorrowed,
          entries: borrowedMoney
        },
        finalEquity: {
          initialEquity: totalEquity,
          netProfitLoss,
          finalEquity,
          isProfit
        },
        totalLiabilities
      },
      rightSide: {
        investMoney: {
          total: totalInvested,
          entries: investMoney
        },
        bankBalance: {
          total: bankBalance,
          accounts: bankAccounts.map(b => ({
            bankName: b.bankName,
            accountNumber: b.accountNumber,
            balance: b.currentBalance
          }))
        },
        cashbookBalance: {
          total: cashbookBalance,
          hasCashBook: !!cashBook
        },
        loanPrincipal: {
          total: loanPrincipal,
          loans: loanDetails,
          activeLoanCount: loanDetails.length
        },
        interestReceivable: {
          total: interestReceivable,
          details: interestDetails
        },
        totalAssets
      },
      summary: {
        totalLiabilities,
        totalAssets,
        difference: Math.abs(totalLiabilities - totalAssets),
        isBalanced: Math.abs(totalLiabilities - totalAssets) < 1,
        netWorth: totalAssets - totalBorrowed
      },
      profitLoss: {
        income: {
          interest: incomeEntries.filter(e => e.accountHeadName.toLowerCase().includes('interest')).reduce((sum, e) => sum + e.credit, 0),
          processingFee: incomeEntries.filter(e => e.accountHeadName.toLowerCase().includes('processing')).reduce((sum, e) => sum + e.credit, 0),
          penalty: incomeEntries.filter(e => e.accountHeadName.toLowerCase().includes('penalty')).reduce((sum, e) => sum + e.credit, 0),
          other: incomeEntries.filter(e => 
            !e.accountHeadName.toLowerCase().includes('interest') &&
            !e.accountHeadName.toLowerCase().includes('processing') &&
            !e.accountHeadName.toLowerCase().includes('penalty')
          ).reduce((sum, e) => sum + e.credit, 0),
          total: totalIncome
        },
        expenses: {
          total: totalExpenses
        },
        netProfitLoss
      }
    });
  } catch (error) {
    console.error('Error calculating trial balance:', error);
    return NextResponse.json({ error: 'Failed to calculate trial balance' }, { status: 500 });
  }
}
