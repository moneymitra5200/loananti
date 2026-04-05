import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * DEBUG API - Check accounting data
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      // List all companies
      const companies = await db.company.findMany({
        select: { id: true, name: true, code: true }
      });
      return NextResponse.json({ companies });
    }

    // Get Chart of Accounts for company
    const accounts = await db.chartOfAccount.findMany({
      where: { companyId },
      orderBy: { accountCode: 'asc' },
      select: {
        id: true,
        accountCode: true,
        accountName: true,
        accountType: true,
        openingBalance: true,
        currentBalance: true,
        isActive: true,
      }
    });

    // Get Journal Entries for company
    const journalEntries = await db.journalEntry.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        lines: {
          include: {
            account: {
              select: { accountCode: true, accountName: true }
            }
          }
        }
      }
    });

    // Get Journal Entry Lines count
    const jeLinesCount = await db.journalEntryLine.count({
      where: {
        journalEntry: { companyId }
      }
    });

    // Get CashBook entries
    const cashBook = await db.cashBook.findUnique({
      where: { companyId },
      include: {
        entries: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    return NextResponse.json({
      companyId,
      accounts,
      accountsCount: accounts.length,
      journalEntries,
      journalEntriesCount: journalEntries.length,
      totalJELines: jeLinesCount,
      cashBook,
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
