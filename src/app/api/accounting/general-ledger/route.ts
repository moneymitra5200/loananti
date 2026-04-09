import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get General Ledger (Account Heads with entries)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const accountHeadId = searchParams.get('accountHeadId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // 1. Get all account heads
    const accountHeads = await db.accountHead.findMany({
      where: { companyId, isActive: true },
      orderBy: [{ headType: 'asc' }, { headCode: 'asc' }]
    });

    // 2. Get all daybook entries for this company
    const daybookEntries = await db.daybookEntry.findMany({
      where: { companyId },
      orderBy: { entryDate: 'asc' }
    });

    // 3. Calculate totals for each account head
    const accountHeadsWithTotals = accountHeads.map(head => {
      const entries = daybookEntries.filter(e => e.accountHeadId === head.id);
      const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
      const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
      
      return {
        id: head.id,
        code: head.headCode,
        name: head.headName,
        type: head.headType,
        openingBalance: head.openingBalance,
        totalDebit,
        totalCredit,
        currentBalance: head.openingBalance + totalDebit - totalCredit,
        entryCount: entries.length,
        isSystemHead: head.isSystemHead
      };
    });

    // 4. Group by type
    const groupedByType = accountHeadsWithTotals.reduce((acc, head) => {
      if (!acc[head.type]) {
        acc[head.type] = [];
      }
      acc[head.type].push(head);
      return acc;
    }, {} as Record<string, any[]>);

    // 5. Calculate type totals
    const typeTotals: Record<string, any> = {};
    Object.entries(groupedByType).forEach(([type, heads]) => {
      typeTotals[type] = {
        totalDebit: heads.reduce((sum: number, h: any) => sum + h.totalDebit, 0),
        totalCredit: heads.reduce((sum: number, h: any) => sum + h.totalCredit, 0),
        currentBalance: heads.reduce((sum: number, h: any) => sum + h.currentBalance, 0),
        accountCount: heads.length
      };
    });

    // 6. If specific account head requested, get entries for that head
    let entries: any[] = [];
    let summary: any = null;
    
    if (accountHeadId) {
      entries = daybookEntries
        .filter(e => e.accountHeadId === accountHeadId)
        .map(e => ({
          id: e.id,
          date: e.entryDate,
          particular: e.particular,
          referenceType: e.referenceType,
          debit: e.debit,
          credit: e.credit
        }));

      // Calculate summary
      const head = accountHeads.find(h => h.id === accountHeadId);
      if (head) {
        let runningBalance = head.openingBalance;
        const entriesWithBalance = entries.map(e => {
          runningBalance += e.debit - e.credit;
          return { ...e, balance: runningBalance };
        });
        entries = entriesWithBalance;
        
        summary = {
          openingBalance: head.openingBalance,
          totalDebit: entries.reduce((sum, e) => sum + e.debit, 0),
          totalCredit: entries.reduce((sum, e) => sum + e.credit, 0),
          closingBalance: runningBalance,
          entryCount: entries.length
        };
      }
    }

    return NextResponse.json({
      accountHeads: accountHeadsWithTotals,
      groupedByType,
      typeTotals,
      totalAccounts: accountHeads.length,
      entries,
      summary
    });
  } catch (error) {
    console.error('Error fetching general ledger:', error);
    return NextResponse.json({ error: 'Failed to fetch general ledger' }, { status: 500 });
  }
}

// POST - Create new account head
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, headCode, headName, headType, openingBalance, description } = body;

    if (!companyId || !headCode || !headName || !headType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if code already exists
    const existing = await db.accountHead.findFirst({
      where: { companyId, headCode }
    });

    if (existing) {
      return NextResponse.json({ error: 'Account code already exists' }, { status: 400 });
    }

    const accountHead = await db.accountHead.create({
      data: {
        companyId,
        headCode,
        headName,
        headType,
        openingBalance: openingBalance || 0,
        currentBalance: openingBalance || 0,
        description,
        isSystemHead: false,
        isActive: true
      }
    });

    // If opening balance, create daybook entry
    if (openingBalance && openingBalance > 0) {
      const lastEntry = await db.daybookEntry.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'desc' }
      });
      
      const entryNumber = lastEntry 
        ? `DB-${String(parseInt(lastEntry.entryNumber.split('-')[1] || '0') + 1).padStart(6, '0')}`
        : 'DB-000001';

      await db.daybookEntry.create({
        data: {
          companyId,
          entryNumber,
          entryDate: new Date(),
          accountHeadId: accountHead.id,
          accountHeadName: headName,
          accountType: headType,
          particular: `Opening Balance - ${headName}`,
          referenceType: 'OPENING_BALANCE',
          debit: headType === 'ASSET' || headType === 'EXPENSE' ? openingBalance : 0,
          credit: headType === 'LIABILITY' || headType === 'INCOME' || headType === 'EQUITY' ? openingBalance : 0,
          sourceType: 'MANUAL',
          createdById: 'system'
        }
      });
    }

    return NextResponse.json({ success: true, accountHead });
  } catch (error) {
    console.error('Error creating account head:', error);
    return NextResponse.json({ error: 'Failed to create account head' }, { status: 500 });
  }
}
