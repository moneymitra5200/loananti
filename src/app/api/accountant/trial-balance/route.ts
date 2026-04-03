import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService } from '@/lib/accounting-service';

// GET - Fetch Trial Balance
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || 'default';

    const accountingService = new AccountingService(companyId);
    
    // Get trial balance
    const trialBalance = await accountingService.getTrialBalance();
    
    // Calculate totals
    const totalDebits = trialBalance.reduce((sum, acc) => sum + acc.debitBalance, 0);
    const totalCredits = trialBalance.reduce((sum, acc) => sum + acc.creditBalance, 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    return NextResponse.json({
      trialBalance,
      totalDebits,
      totalCredits,
      isBalanced,
      asOfDate: new Date(),
    });
  } catch (error) {
    console.error('Error fetching trial balance:', error);
    return NextResponse.json({ error: 'Failed to fetch trial balance' }, { status: 500 });
  }
}
