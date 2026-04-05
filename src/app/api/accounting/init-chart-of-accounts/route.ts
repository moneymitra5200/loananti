import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PERMANENT_CHART_OF_ACCOUNTS } from '@/lib/permanent-accounts';

/**
 * Initialize Chart of Accounts for a Company
 * 
 * This API creates permanent accounts for a company if they don't exist.
 * It's called when:
 * 1. A new company is created
 * 2. Database is reset and needs re-initialization
 * 3. Manually triggered for existing companies missing accounts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Verify company exists
    const company = await db.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get existing accounts for this company
    const existingAccounts = await db.chartOfAccount.findMany({
      where: { companyId },
      select: { accountCode: true }
    });
    const existingCodes = new Set(existingAccounts.map(a => a.accountCode));

    // Create missing accounts
    const accountsToCreate = PERMANENT_CHART_OF_ACCOUNTS.filter(
      account => !existingCodes.has(account.accountCode)
    );

    let created = 0;
    for (const account of accountsToCreate) {
      await db.chartOfAccount.create({
        data: {
          companyId,
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountType: account.accountType,
          isSystemAccount: account.isSystemAccount,
          description: account.description,
          openingBalance: 0,
          currentBalance: 0,
          isActive: true,
        }
      });
      created++;
    }

    return NextResponse.json({
      success: true,
      message: `Chart of accounts initialized for ${company.name}`,
      company: {
        id: company.id,
        name: company.name,
        code: company.code
      },
      accountsCreated: created,
      totalAccounts: PERMANENT_CHART_OF_ACCOUNTS.length,
      alreadyExisted: existingCodes.size
    });
  } catch (error) {
    console.error('Error initializing chart of accounts:', error);
    return NextResponse.json({
      error: 'Failed to initialize chart of accounts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Initialize Chart of Accounts for ALL Companies
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const allCompanies = searchParams.get('all') === 'true';

    if (allCompanies) {
      // Get all active companies
      const companies = await db.company.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true }
      });

      const results: Array<{ company: string; code: string; created: number; alreadyExisted: number }> = [];
      
      for (const company of companies) {
        // Get existing accounts
        const existingAccounts = await db.chartOfAccount.findMany({
          where: { companyId: company.id },
          select: { accountCode: true }
        });
        const existingCodes = new Set(existingAccounts.map(a => a.accountCode));

        // Create missing accounts
        const accountsToCreate = PERMANENT_CHART_OF_ACCOUNTS.filter(
          account => !existingCodes.has(account.accountCode)
        );

        let created = 0;
        for (const account of accountsToCreate) {
          await db.chartOfAccount.create({
            data: {
              companyId: company.id,
              accountCode: account.accountCode,
              accountName: account.accountName,
              accountType: account.accountType,
              isSystemAccount: account.isSystemAccount,
              description: account.description,
              openingBalance: 0,
              currentBalance: 0,
              isActive: true,
            }
          });
          created++;
        }

        results.push({
          company: company.name,
          code: company.code,
          created,
          alreadyExisted: existingCodes.size
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Chart of accounts initialized for all companies',
        results
      });
    }

    // Just return the permanent accounts list
    return NextResponse.json({
      success: true,
      permanentAccounts: PERMANENT_CHART_OF_ACCOUNTS,
      total: PERMANENT_CHART_OF_ACCOUNTS.length
    });
  } catch (error) {
    console.error('Error initializing chart of accounts:', error);
    return NextResponse.json({
      error: 'Failed to initialize chart of accounts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
