import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch all borrowed money entries for a company
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const borrowedEntries = await db.borrowedMoney.findMany({
      where: { companyId },
      orderBy: { borrowedDate: 'desc' }
    });

    // Calculate totals
    const totalBorrowed = borrowedEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalRepaid = borrowedEntries.reduce((sum, entry) => sum + entry.amountRepaid, 0);
    const totalOutstanding = totalBorrowed - totalRepaid;

    // Group by source type
    const bySourceType = borrowedEntries.reduce((acc, entry) => {
      if (!acc[entry.sourceType]) {
        acc[entry.sourceType] = { count: 0, total: 0, repaid: 0 };
      }
      acc[entry.sourceType].count++;
      acc[entry.sourceType].total += entry.amount;
      acc[entry.sourceType].repaid += entry.amountRepaid;
      return acc;
    }, {} as Record<string, { count: number; total: number; repaid: number }>);

    return NextResponse.json({
      borrowedEntries,
      totalBorrowed,
      totalRepaid,
      totalOutstanding,
      bySourceType,
      activeCount: borrowedEntries.filter(e => e.status === 'ACTIVE').length,
      partiallyPaidCount: borrowedEntries.filter(e => e.status === 'PARTIALLY_PAID').length,
      fullyPaidCount: borrowedEntries.filter(e => e.status === 'FULLY_PAID').length
    });
  } catch (error) {
    console.error('Error fetching borrowed money entries:', error);
    return NextResponse.json({ error: 'Failed to fetch borrowed money entries' }, { status: 500 });
  }
}

// POST - Add new borrowed money entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      companyId, 
      sourceType, 
      sourceName, 
      sourceId,
      amount, 
      interestRate, 
      dueDate,
      description, 
      borrowedDate,
      createdById 
    } = body;

    if (!companyId || !sourceType || !sourceName || !amount || !createdById) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create borrowed money entry
    const borrowedEntry = await db.borrowedMoney.create({
      data: {
        companyId,
        sourceType,
        sourceName,
        sourceId,
        amount: parseFloat(amount),
        interestRate: interestRate ? parseFloat(interestRate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        description,
        borrowedDate: borrowedDate ? new Date(borrowedDate) : new Date(),
        createdById
      }
    });

    // Create journal entry
    const entryNumber = `JE-BM-${Date.now()}`;
    
    // Get or create Borrowed Money account head (Liability)
    let borrowedAccount = await db.accountHead.findFirst({
      where: { companyId, headCode: 'LIAB-001' }
    });

    if (!borrowedAccount) {
      borrowedAccount = await db.accountHead.create({
        data: {
          companyId,
          headCode: 'LIAB-001',
          headName: 'Borrowed Money',
          headType: 'LIABILITY',
          isSystemHead: true
        }
      });
    }

    // Get or create Bank account head
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
        entryDate: borrowedEntry.borrowedDate,
        referenceType: 'BORROWED_MONEY',
        referenceId: borrowedEntry.id,
        narration: description || `Borrowed from ${sourceName}`,
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
              accountId: borrowedAccount.id,
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
          entryDate: borrowedEntry.borrowedDate,
          accountHeadId: bankAccount.id,
          accountHeadName: bankAccount.headName,
          accountType: 'ASSET',
          particular: description || `Borrowed from ${sourceName}`,
          referenceType: 'BORROWED_MONEY',
          referenceId: borrowedEntry.id,
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
          entryDate: borrowedEntry.borrowedDate,
          accountHeadId: borrowedAccount.id,
          accountHeadName: borrowedAccount.headName,
          accountType: 'LIABILITY',
          particular: description || `Borrowed from ${sourceName}`,
          referenceType: 'BORROWED_MONEY',
          referenceId: borrowedEntry.id,
          debit: 0,
          credit: parseFloat(amount),
          sourceType: 'JOURNAL_ENTRY',
          sourceId: journalEntry.id,
          journalEntryId: journalEntry.id,
          createdById
        }
      ]
    });

    // Update borrowed entry with journal reference
    await db.borrowedMoney.update({
      where: { id: borrowedEntry.id },
      data: { journalEntryId: journalEntry.id }
    });

    return NextResponse.json({
      success: true,
      borrowedEntry,
      journalEntry
    });
  } catch (error) {
    console.error('Error creating borrowed money entry:', error);
    return NextResponse.json({ error: 'Failed to create borrowed money entry' }, { status: 500 });
  }
}
