import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * API to add Borrowed Money
 * Updates the Chart of Account for Borrowed Funds (account code 2202)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, amount, source, description, createdById } = body;

    if (!companyId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid request. Company ID and amount are required.' }, { status: 400 });
    }

    // Find or create Borrowed Funds account (account code 2202)
    let borrowedAccount = await db.chartOfAccount.findFirst({
      where: { 
        companyId, 
        accountCode: '2202'
      }
    });

    if (!borrowedAccount) {
      // Create borrowed funds account if not exists
      borrowedAccount = await db.chartOfAccount.create({
        data: {
          companyId,
          accountCode: '2202',
          accountName: 'Borrowed Funds',
          accountType: 'LIABILITY',
          description: 'Funds borrowed from banks and financial institutions',
          isSystemAccount: true,
          currentBalance: 0
        }
      });
    }

    // Update balance (liability increases with credit)
    const updatedAccount = await db.chartOfAccount.update({
      where: { id: borrowedAccount.id },
      data: {
        currentBalance: borrowedAccount.currentBalance + amount
      }
    });

    // Create a journal entry for this
    const entryNumber = `JE-${Date.now()}`;
    const narration = description || `Borrowed funds from ${source || 'external source'}`;
    
    await db.journalEntry.create({
      data: {
        companyId,
        entryNumber,
        entryDate: new Date(),
        referenceType: 'BORROWED_MONEY',
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
              debitAmount: 0,
              creditAmount: amount,
              narration
            }
          ]
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Borrowed money recorded successfully',
      newBalance: updatedAccount.currentBalance
    });

  } catch (error) {
    console.error('Error adding borrowed money:', error);
    return NextResponse.json({ 
      error: 'Failed to record borrowed money',
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

    const borrowedAccount = await db.chartOfAccount.findFirst({
      where: { 
        companyId, 
        accountCode: '2202'
      }
    });

    return NextResponse.json({ 
      borrowedMoney: borrowedAccount?.currentBalance || 0,
      account: borrowedAccount
    });

  } catch (error) {
    console.error('Error fetching borrowed money:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch borrowed money',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
