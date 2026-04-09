import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Fix mirror loan accounting for existing disbursements
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mirrorLoanId, bankAccountId, bankAmount, cashAmount } = body;
    
    console.log('[Fix Mirror Accounting] Request received:', { mirrorLoanId, bankAccountId, bankAmount, cashAmount });
    
    if (!mirrorLoanId) {
      return NextResponse.json({ error: 'Mirror loan ID is required' }, { status: 400 });
    }
    
    // Get the mirror loan
    const mirrorLoan = await db.loanApplication.findUnique({
      where: { id: mirrorLoanId },
      include: {
        company: { select: { id: true, name: true, code: true } }
      }
    });
    
    if (!mirrorLoan) {
      return NextResponse.json({ error: 'Mirror loan not found' }, { status: 404 });
    }
    
    // Get the mirror loan mapping - query separately since it's not a relation
    const mirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: { mirrorLoanId: mirrorLoanId }
    });
    
    if (!mirrorMapping) {
      return NextResponse.json({ error: 'Mirror loan mapping not found' }, { status: 404 });
    }
    
    const mirrorCompanyId = mirrorLoan.companyId;
    const disbursementAmount = mirrorLoan.disbursedAmount || mirrorLoan.requestedAmount;
    
    console.log('[Fix Mirror Accounting] Mirror Company:', mirrorCompanyId);
    console.log('[Fix Mirror Accounting] Disbursement Amount:', disbursementAmount);
    
    const results = {
      bankTransaction: null as any,
      cashEntry: null as any,
      bankBalanceBefore: 0,
      bankBalanceAfter: 0,
      cashBalanceBefore: 0,
      cashBalanceAfter: 0
    };
    
    // Check if we have existing transactions
    const existingBankTxns = await db.bankTransaction.findMany({
      where: { referenceId: mirrorLoanId, referenceType: 'LOAN_DISBURSEMENT' }
    });
    
    const existingCashEntries = await db.cashBookEntry.findMany({
      where: { referenceId: mirrorLoanId, referenceType: 'LOAN_DISBURSEMENT' }
    });
    
    if (existingBankTxns.length > 0 || existingCashEntries.length > 0) {
      return NextResponse.json({ 
        error: 'Transactions already exist for this loan',
        existingBankTxns: existingBankTxns.length,
        existingCashEntries: existingCashEntries.length
      }, { status: 400 });
    }
    
    // Handle Bank Portion
    if (bankAccountId && bankAmount > 0) {
      const bank = await db.bankAccount.findUnique({
        where: { id: bankAccountId },
        select: { currentBalance: true, companyId: true, bankName: true, accountNumber: true }
      });
      
      if (!bank) {
        return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
      }
      
      if (bank.companyId !== mirrorCompanyId) {
        console.warn(`[Fix Mirror Accounting] Warning: Bank account belongs to company ${bank.companyId}, not mirror company ${mirrorCompanyId}`);
      }
      
      results.bankBalanceBefore = bank.currentBalance;
      results.bankBalanceAfter = bank.currentBalance - bankAmount;
      
      // Update bank balance
      await db.bankAccount.update({
        where: { id: bankAccountId },
        data: { currentBalance: results.bankBalanceAfter }
      });
      
      // Create bank transaction
      results.bankTransaction = await db.bankTransaction.create({
        data: {
          bankAccountId: bankAccountId,
          transactionType: 'DEBIT',
          amount: bankAmount,
          balanceAfter: results.bankBalanceAfter,
          description: `Mirror Loan Disbursement (Bank Portion) - ${mirrorLoan.applicationNo} [FIXED]`,
          referenceType: 'LOAN_DISBURSEMENT',
          referenceId: mirrorLoanId,
          createdById: 'SYSTEM_FIX'
        }
      });
      
      console.log(`[Fix Mirror Accounting] Bank transaction created: ${bank.bankName} -${bankAmount}`);
    }
    
    // Handle Cash Portion
    if (cashAmount > 0) {
      if (!mirrorCompanyId) {
        return NextResponse.json({ error: 'Mirror company ID is required for cash disbursement' }, { status: 400 });
      }
      
      let cashBook = await db.cashBook.findUnique({
        where: { companyId: mirrorCompanyId }
      });
      
      if (!cashBook) {
        cashBook = await db.cashBook.create({
          data: {
            companyId: mirrorCompanyId,
            openingBalance: 0,
            currentBalance: 0
          }
        });
      }
      
      results.cashBalanceBefore = cashBook.currentBalance;
      results.cashBalanceAfter = cashBook.currentBalance - cashAmount;
      
      // Create cash book entry
      results.cashEntry = await db.cashBookEntry.create({
        data: {
          cashBookId: cashBook.id,
          entryType: 'DEBIT',
          amount: cashAmount,
          balanceAfter: results.cashBalanceAfter,
          description: `Mirror Loan Disbursement (Cash Portion) - ${mirrorLoan.applicationNo} [FIXED]`,
          referenceType: 'LOAN_DISBURSEMENT',
          referenceId: mirrorLoanId,
          createdById: 'SYSTEM_FIX'
        }
      });
      
      // Update cash book balance
      await db.cashBook.update({
        where: { id: cashBook.id },
        data: {
          currentBalance: results.cashBalanceAfter,
          lastUpdatedAt: new Date()
        }
      });
      
      console.log(`[Fix Mirror Accounting] Cash entry created: -${cashAmount}`);
    }
    
    // Update the mirror loan mapping with disbursement info
    await db.mirrorLoanMapping.update({
      where: { id: mirrorMapping.id },
      data: {
        disbursementBankAccountId: bankAccountId || null,
        disbursementCompanyId: mirrorCompanyId || null
      }
    });
    
    console.log('[Fix Mirror Accounting] Completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Mirror loan accounting fixed successfully',
      mirrorLoan: {
        id: mirrorLoan.id,
        applicationNo: mirrorLoan.applicationNo,
        companyId: mirrorLoan.companyId,
        companyName: mirrorLoan.company?.name
      },
      results: {
        bankTransaction: results.bankTransaction ? {
          id: results.bankTransaction.id,
          amount: results.bankTransaction.amount,
          balanceBefore: results.bankBalanceBefore,
          balanceAfter: results.bankBalanceAfter
        } : null,
        cashEntry: results.cashEntry ? {
          id: results.cashEntry.id,
          amount: results.cashEntry.amount,
          balanceBefore: results.cashBalanceBefore,
          balanceAfter: results.cashBalanceAfter
        } : null
      }
    });
    
  } catch (error) {
    console.error('[Fix Mirror Accounting] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fix mirror loan accounting',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - List mirror loans that may need fixing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    
    // Get all mirror loan mappings first
    const mirrorMappings = await db.mirrorLoanMapping.findMany({
      where: {
        mirrorLoanId: { not: null }  // Only online loans have mirrorLoanId
      },
      select: {
        id: true,
        originalLoanId: true,
        mirrorLoanId: true,
        originalCompanyId: true,
        mirrorCompanyId: true,
        isOfflineLoan: true
      }
    });
    
    // Get the mirror loan IDs
    const mirrorLoanIds = mirrorMappings
      .filter(m => m.mirrorLoanId)
      .map(m => m.mirrorLoanId as string);
    
    // Get all mirror loans (loans that have mirrorLoanMappings)
    const mirrorLoans = await db.loanApplication.findMany({
      where: {
        id: { in: mirrorLoanIds },
        status: 'ACTIVE'
      },
      include: {
        company: { select: { id: true, name: true, code: true } }
      },
      orderBy: { disbursedAt: 'desc' },
      take: 20
    });
    
    // Create a map of mirrorLoanId -> mapping
    const mappingByMirrorLoanId = new Map<string, typeof mirrorMappings[0]>();
    mirrorMappings.forEach(m => {
      if (m.mirrorLoanId) {
        mappingByMirrorLoanId.set(m.mirrorLoanId, m);
      }
    });
    
    // Get original loan info for the mappings
    const originalLoanIds = mirrorMappings.map(m => m.originalLoanId);
    const originalLoans = await db.loanApplication.findMany({
      where: { id: { in: originalLoanIds } },
      select: { id: true, applicationNo: true, company: { select: { id: true, name: true } } }
    });
    const originalLoanMap = new Map(originalLoans.map(l => [l.id, l]));
    
    // Check which ones have missing accounting
    const loansWithStatus = await Promise.all(mirrorLoans.map(async (loan) => {
      const bankTxns = await db.bankTransaction.count({
        where: { referenceId: loan.id, referenceType: 'LOAN_DISBURSEMENT' }
      });
      
      const cashEntries = await db.cashBookEntry.count({
        where: { referenceId: loan.id, referenceType: 'LOAN_DISBURSEMENT' }
      });
      
      const mapping = mappingByMirrorLoanId.get(loan.id);
      const originalLoan = mapping ? originalLoanMap.get(mapping.originalLoanId) : null;
      
      return {
        id: loan.id,
        applicationNo: loan.applicationNo,
        mirrorCompanyId: loan.companyId,
        mirrorCompanyName: loan.company?.name,
        originalLoan: originalLoan ? {
          applicationNo: originalLoan.applicationNo,
          company: originalLoan.company
        } : null,
        disbursedAmount: loan.disbursedAmount,
        disbursedAt: loan.disbursedAt,
        hasBankTransaction: bankTxns > 0,
        hasCashEntry: cashEntries > 0,
        needsFix: bankTxns === 0 && cashEntries === 0
      };
    }));
    
    // Filter by company if specified
    const filtered = companyId 
      ? loansWithStatus.filter(l => l.mirrorCompanyId === companyId)
      : loansWithStatus;
    
    return NextResponse.json({
      success: true,
      mirrorLoans: filtered,
      needsFix: filtered.filter(l => l.needsFix)
    });
    
  } catch (error) {
    console.error('[Fix Mirror Accounting] Error:', error);
    return NextResponse.json({ error: 'Failed to list mirror loans' }, { status: 500 });
  }
}
