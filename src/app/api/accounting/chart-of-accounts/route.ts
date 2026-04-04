import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService, DEFAULT_CHART_OF_ACCOUNTS } from '@/lib/accounting-service';
import { AccountType } from '@prisma/client';

// GET - Fetch chart of accounts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || 'default';
    const accountType = searchParams.get('accountType');
    const isActive = searchParams.get('isActive');

    const where: any = { companyId };
    if (accountType && accountType !== 'all') {
      where.accountType = accountType;
    }
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const accounts = await db.chartOfAccount.findMany({
      where,
      orderBy: [
        { accountType: 'asc' },
        { accountCode: 'asc' },
      ],
    });

    // If no accounts exist, auto-initialize default chart of accounts
    if (accounts.length === 0) {
      console.log(`[ChartOfAccounts] No accounts found for company ${companyId}, auto-initializing...`);
      await initializeDefaultAccounts(companyId);
      
      // Fetch again after initialization
      const newAccounts = await db.chartOfAccount.findMany({
        where: { companyId },
        orderBy: [
          { accountType: 'asc' },
          { accountCode: 'asc' },
        ],
      });
      
      return NextResponse.json({ accounts: newAccounts, initialized: true });
    }

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch accounts', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// Helper function to initialize default accounts
async function initializeDefaultAccounts(companyId: string) {
  const allAccounts = [
    ...DEFAULT_CHART_OF_ACCOUNTS.ASSETS,
    ...DEFAULT_CHART_OF_ACCOUNTS.LIABILITIES,
    ...DEFAULT_CHART_OF_ACCOUNTS.INCOME,
    ...DEFAULT_CHART_OF_ACCOUNTS.EXPENSES,
    ...DEFAULT_CHART_OF_ACCOUNTS.EQUITY,
  ];

  for (const account of allAccounts) {
    try {
      const existing = await db.chartOfAccount.findFirst({
        where: { companyId, accountCode: account.code },
      });

      if (!existing) {
        await db.chartOfAccount.create({
          data: {
            companyId,
            accountCode: account.code,
            accountName: account.name,
            accountType: account.type as AccountType,
            isSystemAccount: account.isSystemAccount,
            description: account.description,
            openingBalance: 0,
            currentBalance: 0,
            isActive: true,
          },
        });
      }
    } catch (err) {
      console.error(`Failed to create account ${account.code}:`, err);
    }
  }
  
  console.log(`[ChartOfAccounts] Initialized ${allAccounts.length} accounts for company ${companyId}`);
}

// POST - Create new account(s) - supports both single and bulk creation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if this is a bulk initialization request
    if (body.accounts && Array.isArray(body.accounts)) {
      const { companyId, accounts } = body;
      const createdAccounts: any[] = [];
      const errors: Array<{ code: string; error: string }> = [];
      
      for (const acc of accounts) {
        try {
          // Check if account code already exists
          const existing = await db.chartOfAccount.findFirst({
            where: { 
              companyId: companyId || 'default', 
              accountCode: acc.accountCode 
            },
          });

          if (!existing) {
            const account = await db.chartOfAccount.create({
              data: {
                companyId: companyId || 'default',
                accountCode: acc.accountCode,
                accountName: acc.accountName,
                accountType: acc.accountType as AccountType,
                description: acc.description,
                openingBalance: acc.openingBalance || 0,
                currentBalance: acc.openingBalance || 0,
                parentAccountId: acc.parentAccountId,
                isSystemAccount: acc.isSystemAccount || false,
                isActive: true,
              },
            });
            createdAccounts.push(account);
          }
        } catch (err) {
          errors.push({ code: acc.accountCode, error: err instanceof Error ? err.message : 'Unknown error' });
        }
      }
      
      return NextResponse.json({ 
        message: `Created ${createdAccounts.length} accounts`,
        accounts: createdAccounts,
        errors: errors.length > 0 ? errors : undefined
      });
    }
    
    // Single account creation
    const { 
      companyId, 
      accountCode, 
      accountName, 
      accountType, 
      description, 
      openingBalance,
      parentAccountId,
      isSystemAccount = false 
    } = body;

    // Check if account code already exists
    const existing = await db.chartOfAccount.findFirst({
      where: { 
        companyId: companyId || 'default', 
        accountCode 
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Account code already exists' }, { status: 400 });
    }

    const account = await db.chartOfAccount.create({
      data: {
        companyId: companyId || 'default',
        accountCode,
        accountName,
        accountType: accountType as AccountType,
        description,
        openingBalance: openingBalance || 0,
        currentBalance: openingBalance || 0,
        parentAccountId,
        isSystemAccount,
        isActive: true,
      },
    });

    return NextResponse.json({ account });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json({ 
      error: 'Failed to create account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT - Update account
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, accountName, description, isActive } = body;

    const account = await db.chartOfAccount.update({
      where: { id },
      data: {
        accountName,
        description,
        isActive,
      },
    });

    return NextResponse.json({ account });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json({ 
      error: 'Failed to update account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Deactivate account (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Check if account is a system account
    const account = await db.chartOfAccount.findUnique({ where: { id } });
    if (account?.isSystemAccount) {
      return NextResponse.json({ error: 'Cannot delete system account' }, { status: 400 });
    }

    // Check if account has transactions
    const lines = await db.journalEntryLine.count({
      where: { accountId: id },
    });

    if (lines > 0) {
      // Soft delete - just deactivate
      await db.chartOfAccount.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ message: 'Account deactivated (has transactions)' });
    }

    // Hard delete if no transactions
    await db.chartOfAccount.delete({ where: { id } });
    return NextResponse.json({ message: 'Account deleted' });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ 
      error: 'Failed to delete account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
