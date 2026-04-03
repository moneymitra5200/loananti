import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * API to add Equity capital
 * Updates the Chart of Account for Equity (account code 5000 or 5100)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, amount, description, createdById } = body;

    if (!companyId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid request. Company ID and amount are required.' }, { status: 400 });
    }

    // Find or create Equity account (account code 5000 or 5100)
    let equityAccount = await db.chartOfAccount.findFirst({
      where: { 
        companyId, 
        accountCode: { in: ['5000', '5100'] }
      },
      orderBy: { accountCode: 'asc' }
    });

    if (!equityAccount) {
      // Create equity account if not exists
      equityAccount = await db.chartOfAccount.create({
        data: {
          companyId,
          accountCode: '5000',
          accountName: 'EQUITY',
          accountType: 'EQUITY',
          description: 'Owners Equity',
          isSystemAccount: true,
          currentBalance: 0
        }
      });
    }

    // Update balance
    const updatedAccount = await db.chartOfAccount.update({
      where: { id: equityAccount.id },
      data: {
        currentBalance: equityAccount.currentBalance + amount
      }
    });

    // Create a journal entry for this
    const entryNumber = `JE-${Date.now()}`;
    await db.journalEntry.create({
      data: {
        companyId,
        entryNumber,
        entryDate: new Date(),
        referenceType: 'EQUITY_ADDITION',
        narration: description || 'Equity capital added',
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
              narration: description || 'Equity capital added'
            }
          ]
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Equity added successfully',
      newBalance: updatedAccount.currentBalance
    });

  } catch (error) {
    console.error('Error adding equity:', error);
    return NextResponse.json({ 
      error: 'Failed to add equity',
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

    const equityAccount = await db.chartOfAccount.findFirst({
      where: { 
        companyId, 
        accountCode: { in: ['5000', '5100'] }
      },
      orderBy: { accountCode: 'asc' }
    });

    return NextResponse.json({ 
      equity: equityAccount?.currentBalance || 0,
      account: equityAccount
    });

  } catch (error) {
    console.error('Error fetching equity:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch equity',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
