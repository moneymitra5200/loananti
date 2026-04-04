import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * API to add Equity capital
 * Updates the Chart of Account for Equity (account code 5000 or 5100)
 * 
 * IMPORTANT: Double-entry accounting requires:
 * - Debit: Bank Account or Cash Account (asset increases)
 * - Credit: Equity (source of funds)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, amount, description, createdById, paymentMode, bankAccountId } = body;

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
          accountName: 'Owner Equity',
          accountType: 'EQUITY',
          description: 'Owners Equity',
          isSystemAccount: true,
          currentBalance: 0
        }
      });
    }

    // Find Bank or Cash account based on payment mode
    let assetAccount = null;
    if (paymentMode === 'BANK' && bankAccountId) {
      // Get the bank account
      const bankAcc = await db.bankAccount.findUnique({
        where: { id: bankAccountId }
      });
      if (bankAcc) {
        // Find or create Bank Account in chart of accounts
        assetAccount = await db.chartOfAccount.findFirst({
          where: { companyId, accountCode: '1400' }
        });
        if (!assetAccount) {
          assetAccount = await db.chartOfAccount.create({
            data: {
              companyId,
              accountCode: '1400',
              accountName: 'Bank Account',
              accountType: 'ASSET',
              description: 'Bank accounts',
              isSystemAccount: true,
              currentBalance: 0
            }
          });
        }
        // Update bank account balance
        await db.bankAccount.update({
          where: { id: bankAccountId },
          data: { currentBalance: { increment: amount } }
        });
      }
    } else {
      // Default to Cash Account
      assetAccount = await db.chartOfAccount.findFirst({
        where: { companyId, accountCode: '1500' }
      });
      if (!assetAccount) {
        assetAccount = await db.chartOfAccount.create({
          data: {
            companyId,
            accountCode: '1500',
            accountName: 'Cash Account',
            accountType: 'ASSET',
            description: 'Cash in hand',
            isSystemAccount: true,
            currentBalance: 0
          }
        });
      }
      // Update cashbook balance
      await db.cashBook.upsert({
        where: { companyId },
        create: {
          companyId,
          currentBalance: amount,
          openingBalance: 0
        },
        update: {
          currentBalance: { increment: amount }
        }
      });
    }

    if (!assetAccount) {
      return NextResponse.json({ error: 'Could not find or create asset account' }, { status: 500 });
    }

    // Generate entry number
    const count = await db.journalEntry.count({ where: { companyId } });
    const entryNumber = `JE${String(count + 1).padStart(6, '0')}`;

    // Create a proper double-entry journal entry with TWO lines
    const journalEntry = await db.journalEntry.create({
      data: {
        companyId,
        entryNumber,
        entryDate: new Date(),
        referenceType: 'MANUAL_ENTRY',
        narration: description || 'Equity capital added',
        totalDebit: amount,
        totalCredit: amount,
        isAutoEntry: false,
        isApproved: true,
        createdById: createdById || 'system',
        paymentMode: paymentMode || 'CASH',
        bankAccountId: bankAccountId || null,
        lines: {
          create: [
            {
              // Debit: Bank/Cash Account (Asset increases)
              accountId: assetAccount.id,
              debitAmount: amount,
              creditAmount: 0,
              narration: description || 'Equity capital received'
            },
            {
              // Credit: Equity Account (Source of funds)
              accountId: equityAccount.id,
              debitAmount: 0,
              creditAmount: amount,
              narration: description || 'Equity capital added'
            }
          ]
        }
      }
    });

    // Update equity account balance (Credit increases equity)
    await db.chartOfAccount.update({
      where: { id: equityAccount.id },
      data: {
        currentBalance: equityAccount.currentBalance + amount
      }
    });

    // Update asset account balance (Debit increases asset)
    await db.chartOfAccount.update({
      where: { id: assetAccount.id },
      data: {
        currentBalance: assetAccount.currentBalance + amount
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Equity added successfully',
      entryNumber: journalEntry.entryNumber,
      equityBalance: equityAccount.currentBalance + amount
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
