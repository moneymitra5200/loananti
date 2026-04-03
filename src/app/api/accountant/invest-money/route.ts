import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * API to add Invest Money
 * Updates the Chart of Account for Investor Capital (account code 2201)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, amount, destination, description, createdById } = body;

    if (!companyId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid request. Company ID and amount are required.' }, { status: 400 });
    }

    // Find or create Investor Capital account (account code 2201)
    let investAccount = await db.chartOfAccount.findFirst({
      where: { 
        companyId, 
        accountCode: '2201'
      }
    });

    if (!investAccount) {
      // Create investor capital account if not exists
      investAccount = await db.chartOfAccount.create({
        data: {
          companyId,
          accountCode: '2201',
          accountName: 'Investor Capital',
          accountType: 'LIABILITY',
          description: 'Capital invested by investors',
          isSystemAccount: true,
          currentBalance: 0
        }
      });
    }

    // Update balance
    const updatedAccount = await db.chartOfAccount.update({
      where: { id: investAccount.id },
      data: {
        currentBalance: investAccount.currentBalance + amount
      }
    });

    // Create a journal entry for this
    const entryNumber = `JE-${Date.now()}`;
    const narration = description || `Investment made to ${destination || 'external investment'}`;
    
    await db.journalEntry.create({
      data: {
        companyId,
        entryNumber,
        entryDate: new Date(),
        referenceType: 'INVEST_MONEY',
        narration,
        totalDebit: amount,
        totalCredit: amount,
        isAutoEntry: false,
        isApproved: true,
        createdById: createdById || 'system',
        lines: {
          create: [
            {
              accountId: updatedAccount.id,
              debitAmount: amount,
              creditAmount: 0,
              narration
            }
          ]
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Investment recorded successfully',
      newBalance: updatedAccount.currentBalance
    });

  } catch (error) {
    console.error('Error adding investment:', error);
    return NextResponse.json({ 
      error: 'Failed to record investment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const investAccount = await db.chartOfAccount.findFirst({
      where: { 
        companyId, 
        accountCode: '2201'
      }
    });

    return NextResponse.json({ 
      investMoney: investAccount?.currentBalance || 0,
      account: investAccount
    });

  } catch (error) {
    console.error('Error fetching investment:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch investment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
