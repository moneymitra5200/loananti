import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch all equity entries for a company
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const equityEntries = await db.equityEntry.findMany({
      where: { companyId },
      orderBy: { entryDate: 'desc' }
    });

    // Calculate total equity
    const totalEquity = equityEntries.reduce((sum, entry) => {
      if (entry.entryType === 'WITHDRAWAL') {
        return sum - entry.amount;
      }
      return sum + entry.amount;
    }, 0);

    return NextResponse.json({
      equityEntries,
      totalEquity,
      openingEquity: equityEntries.find(e => e.entryType === 'OPENING')?.amount || 0,
      additionalEquity: equityEntries
        .filter(e => e.entryType === 'ADDITIONAL')
        .reduce((sum, e) => sum + e.amount, 0),
      withdrawals: equityEntries
        .filter(e => e.entryType === 'WITHDRAWAL')
        .reduce((sum, e) => sum + e.amount, 0)
    });
  } catch (error) {
    console.error('Error fetching equity entries:', error);
    return NextResponse.json({ error: 'Failed to fetch equity entries' }, { status: 500 });
  }
}

// POST - Add new equity entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, entryType, amount, description, entryDate, createdById } = body;

    if (!companyId || !entryType || !amount || !createdById) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create equity entry
    const equityEntry = await db.equityEntry.create({
      data: {
        companyId,
        entryType,
        amount: parseFloat(amount),
        description,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        createdById
      }
    });

    // Create journal entry for this equity
    const entryNumber = `JE-EQ-${Date.now()}`;
    
    // Get or create Equity account head
    let equityAccount = await db.accountHead.findFirst({
      where: { companyId, headCode: 'EQUITY-001' }
    });

    if (!equityAccount) {
      equityAccount = await db.accountHead.create({
        data: {
          companyId,
          headCode: 'EQUITY-001',
          headName: 'Owner\'s Equity',
          headType: 'EQUITY',
          isSystemHead: true
        }
      });
    }

    // Get or create Cash/Bank account head
    let bankAccount = await db.accountHead.findFirst({
      where: { companyId, headCode: 'ASSET-001' }
    });

    if (!bankAccount) {
      bankAccount = await db.accountHead.create({
        data: {
          companyId,
          headCode: 'ASSET-001',
          headName: 'Bank Account',
          headType: 'ASSET',
          isSystemHead: true
        }
      });
    }

    // Create journal entry
    const journalEntry = await db.journalEntry.create({
      data: {
        companyId,
        entryNumber,
        entryDate: equityEntry.entryDate,
        referenceType: 'EQUITY_ENTRY',
        referenceId: equityEntry.id,
        narration: description || `${entryType} Equity Entry`,
        totalDebit: amount,
        totalCredit: amount,
        isAutoEntry: true,
        createdById,
        lines: {
          create: [
            {
              accountId: bankAccount.id,
              debitAmount: parseFloat(amount),
              creditAmount: 0
            },
            {
              accountId: equityAccount.id,
              debitAmount: 0,
              creditAmount: parseFloat(amount)
            }
          ]
        }
      }
    });

    // Create daybook entries
    await db.daybookEntry.createMany({
      data: [
        {
          companyId,
          entryNumber: `DB-${Date.now()}-1`,
          entryDate: equityEntry.entryDate,
          accountHeadId: bankAccount.id,
          accountHeadName: bankAccount.headName,
          accountType: 'ASSET',
          particular: description || `${entryType} Equity Entry`,
          referenceType: 'EQUITY_ENTRY',
          referenceId: equityEntry.id,
          debit: parseFloat(amount),
          credit: 0,
          sourceType: 'JOURNAL_ENTRY',
          sourceId: journalEntry.id,
          journalEntryId: journalEntry.id,
          createdById
        },
        {
          companyId,
          entryNumber: `DB-${Date.now()}-2`,
          entryDate: equityEntry.entryDate,
          accountHeadId: equityAccount.id,
          accountHeadName: equityAccount.headName,
          accountType: 'EQUITY',
          particular: description || `${entryType} Equity Entry`,
          referenceType: 'EQUITY_ENTRY',
          referenceId: equityEntry.id,
          debit: 0,
          credit: parseFloat(amount),
          sourceType: 'JOURNAL_ENTRY',
          sourceId: journalEntry.id,
          journalEntryId: journalEntry.id,
          createdById
        }
      ]
    });

    // Update equity entry with journal reference
    await db.equityEntry.update({
      where: { id: equityEntry.id },
      data: { journalEntryId: journalEntry.id }
    });

    return NextResponse.json({
      success: true,
      equityEntry,
      journalEntry
    });
  } catch (error) {
    console.error('Error creating equity entry:', error);
    return NextResponse.json({ error: 'Failed to create equity entry' }, { status: 500 });
  }
}
