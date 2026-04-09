import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAllBankAccountsSummary } from '@/lib/bank-transaction-service';
import { AccountingService, ACCOUNT_CODES } from '@/lib/accounting-service';

/**
 * GET - Get comprehensive money management data for accountant
 * Optimized with parallel queries for faster loading
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || 'default';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    // Determine if we should fetch ecosystem-wide data
    // 'all' or 'default' means ecosystem-wide view
    // Comma-separated companyIds means multiple specific companies selected
    const isEcosystemWide = !companyId || companyId === 'default' || companyId === 'null' || companyId === 'all';

    // Build company filter for queries
    // Parse comma-separated company IDs
    const companyIds = companyId.split(',').filter(id => id && id !== 'null' && id !== 'all' && id !== 'default');

    // Build the appropriate filter
    let companyFilter: any = {};
    if (!isEcosystemWide) {
      if (companyIds.length > 1) {
        // Multiple companies selected - filter by those IDs
        companyFilter = { companyId: { in: companyIds } };
      } else if (companyIds.length === 1) {
        // Single company selected
        companyFilter = { companyId: companyIds[0] };
      }
    }
    // If isEcosystemWide, companyFilter remains {} (all data)

    // For bank accounts, pass the company IDs to filter properly
    // Single company: pass that company ID
    // Multiple companies: pass array of company IDs
    // All companies: pass null
    const bankAccountCompanyId = isEcosystemWide
      ? null
      : companyIds.length === 1
        ? companyIds[0]
        : companyIds; // Pass array for multiple companies

    // Run all queries in parallel for faster loading
    const [bankSummary, onlineLoans, offlineLoans, bankTransactions, journalEntries, firstCompany] = await Promise.all([
      // 1. Bank Accounts Summary
      getAllBankAccountsSummary(bankAccountCompanyId),
      
      // 2. Online Active Loans (limited fields for speed)
      db.loanApplication.findMany({
        where: {
          ...companyFilter,
          status: { in: ['ACTIVE', 'DISBURSED'] }
        },
        select: {
          id: true,
          applicationNo: true,
          status: true,
          requestedAmount: true,
          disbursedAt: true,
          companyId: true,
          customer: { select: { id: true, name: true, email: true, phone: true } },
          company: { select: { id: true, name: true, code: true } },
          sessionForm: { select: { approvedAmount: true, interestRate: true, tenure: true, emiAmount: true } },
          emiSchedules: {
            where: { paymentStatus: { in: ['PENDING', 'OVERDUE'] } },
            select: { dueDate: true, totalAmount: true, paymentStatus: true },
            orderBy: { dueDate: 'asc' },
            take: 1
          }
        }
      }),
      
      // 3. Offline Active Loans (limited fields for speed)
      db.offlineLoan.findMany({
        where: {
          ...companyFilter,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          loanNumber: true,
          status: true,
          loanAmount: true,
          interestRate: true,
          tenure: true,
          emiAmount: true,
          disbursementDate: true,
          customerName: true,
          customerPhone: true,
          companyId: true,
          customer: { select: { id: true, name: true, email: true, phone: true } },
          company: { select: { id: true, name: true, code: true } },
          emis: {
            where: { paymentStatus: { in: ['PENDING', 'OVERDUE'] } },
            select: { dueDate: true, totalAmount: true, paymentStatus: true },
            orderBy: { dueDate: 'asc' },
            take: 1
          }
        }
      }),
      
      // 4. Bank Transactions (last 50 only for dashboard)
      db.bankTransaction.findMany({
        where: {
          ...(isEcosystemWide
            ? {}
            : { bankAccount: companyIds.length > 1
                ? { companyId: { in: companyIds } }
                : { companyId: companyIds[0] } }),
          transactionDate: { gte: start, lte: end }
        },
        select: {
          id: true,
          transactionType: true,
          amount: true,
          balanceAfter: true,
          description: true,
          referenceType: true,
          transactionDate: true,
          bankAccount: { select: { bankName: true, accountNumber: true } }
        },
        orderBy: { transactionDate: 'desc' },
        take: 50
      }),
      
      // 5. Journal Entries (last 50 only for dashboard)
      db.journalEntry.findMany({
        where: {
          ...companyFilter,
          entryDate: { gte: start, lte: end },
          isReversed: false
        },
        select: {
          id: true,
          entryNumber: true,
          entryDate: true,
          narration: true,
          totalDebit: true,
          totalCredit: true,
          referenceType: true,
          isAutoEntry: true,
          isApproved: true,
          lines: {
            select: {
              id: true,
              debitAmount: true,
              creditAmount: true,
              account: { select: { accountCode: true, accountName: true, accountType: true } }
            }
          }
        },
        orderBy: { entryDate: 'desc' },
        take: 50
      }),
      
      // 6. Get first company for accounting service if ecosystem wide
      isEcosystemWide ? db.company.findFirst({ where: { isActive: true }, select: { id: true } }) : null
    ]);

    // Calculate loan totals
    const onlineLoanTotal = onlineLoans.reduce((sum, loan) => 
      sum + (loan.sessionForm?.approvedAmount || loan.requestedAmount), 0);
    
    const offlineLoanTotal = offlineLoans.reduce((sum, loan) => sum + loan.loanAmount, 0);
    const totalDisbursed = onlineLoanTotal + offlineLoanTotal;

    // Get accounting data (can be slow, so we do it after the main queries)
    let accountingCompanyId = isEcosystemWide ? (firstCompany?.id || 'default') : companyId;
    
    let trialBalance: any[] = [];
    let profitAndLoss: any = { income: [], expenses: [], totalIncome: 0, totalExpenses: 0, netProfit: 0 };
    let balanceSheet: any = { assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 };
    
    // Only fetch accounting reports if needed (skip for initial load speed)
    const fetchReports = searchParams.get('fetchReports') === 'true';
    if (fetchReports) {
      try {
        const accountingService = new AccountingService(accountingCompanyId);
        await accountingService.initializeChartOfAccounts();
        
        trialBalance = await accountingService.getTrialBalance();
        profitAndLoss = await accountingService.getProfitAndLoss(start, end);
        balanceSheet = await accountingService.getBalanceSheet(end);
      } catch (accError) {
        console.error('Accounting service error:', accError);
      }
    }

    // Format loans for display
    const formattedOnlineLoans = onlineLoans.map(loan => ({
      id: loan.id,
      identifier: loan.applicationNo,
      loanType: 'ONLINE',
      status: loan.status,
      approvedAmount: loan.sessionForm?.approvedAmount || loan.requestedAmount,
      interestRate: loan.sessionForm?.interestRate || 0,
      tenure: loan.sessionForm?.tenure || 0,
      emiAmount: loan.sessionForm?.emiAmount || 0,
      disbursementDate: loan.disbursedAt,
      customer: loan.customer,
      company: loan.company,
      companyId: loan.companyId,
      nextEmi: loan.emiSchedules[0] ? {
        dueDate: loan.emiSchedules[0].dueDate,
        amount: loan.emiSchedules[0].totalAmount,
        status: loan.emiSchedules[0].paymentStatus
      } : null
    }));

    const formattedOfflineLoans = offlineLoans.map(loan => ({
      id: loan.id,
      identifier: loan.loanNumber,
      loanType: 'OFFLINE',
      status: loan.status,
      approvedAmount: loan.loanAmount,
      interestRate: loan.interestRate,
      tenure: loan.tenure,
      emiAmount: loan.emiAmount,
      disbursementDate: loan.disbursementDate,
      customer: loan.customer || { name: loan.customerName, phone: loan.customerPhone },
      company: loan.company,
      companyId: loan.companyId,
      nextEmi: loan.emis[0] ? {
        dueDate: loan.emis[0].dueDate,
        amount: loan.emis[0].totalAmount,
        status: loan.emis[0].paymentStatus
      } : null
    }));

    return NextResponse.json({
      bankAccounts: bankSummary.accounts,
      bankTotals: bankSummary.totals,
      onlineLoans: formattedOnlineLoans,
      offlineLoans: formattedOfflineLoans,
      allLoans: [...formattedOnlineLoans, ...formattedOfflineLoans].sort(
        (a, b) => new Date(b.disbursementDate || 0).getTime() - new Date(a.disbursementDate || 0).getTime()
      ),
      loanStats: {
        totalOnlineLoans: onlineLoans.length,
        totalOfflineLoans: offlineLoans.length,
        onlineLoanAmount: onlineLoanTotal,
        offlineLoanAmount: offlineLoanTotal,
        totalDisbursed
      },
      bankTransactions,
      journalEntries,
      trialBalance,
      profitAndLoss,
      balanceSheet
    });

  } catch (error) {
    console.error('Error fetching money management data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch money management data',
      details: (error as Error).message 
    }, { status: 500 });
  }
}

/**
 * POST - Sync existing data to create bank transactions
 * This is useful for migrating existing loan data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, action } = body;

    if (action === 'sync-existing-loans') {
      // Get all active online loans without bank transactions
      const onlineLoans = await db.loanApplication.findMany({
        where: {
          companyId,
          status: { in: ['ACTIVE', 'DISBURSED'] },
          disbursedAt: { not: null }
        },
        include: { sessionForm: true }
      });

      // Get all offline loans
      const offlineLoans = await db.offlineLoan.findMany({
        where: { companyId, status: 'ACTIVE' }
      });

      // Get default bank account
      const defaultBank = await db.bankAccount.findFirst({
        where: { companyId, isDefault: true }
      });

      if (!defaultBank) {
        return NextResponse.json({ 
          error: 'No default bank account found. Please create one first.' 
        }, { status: 400 });
      }

      // Count transactions to create
      const stats = {
        onlineLoansFound: onlineLoans.length,
        offlineLoansFound: offlineLoans.length,
        message: 'Data analyzed. Use individual sync endpoints for actual migration.'
      };

      return NextResponse.json(stats);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error syncing money management data:', error);
    return NextResponse.json({ error: 'Failed to sync data' }, { status: 500 });
  }
}
