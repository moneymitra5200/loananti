import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch all invest money entries for a company
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const investEntries = await db.investMoney.findMany({
      where: { companyId },
      orderBy: { investmentDate: 'desc' }
    });

    // Calculate totals
    const totalInvested = investEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalReceived = investEntries.reduce((sum, entry) => sum + entry.receivedAmount, 0);
    const totalReceivable = investEntries.reduce((sum, entry) => sum + entry.receivableAmount, 0);

    // Group by investor type
    const byInvestorType = investEntries.reduce((acc, entry) => {
      if (!acc[entry.investorType]) {
        acc[entry.investorType] = { count: 0, total: 0, received: 0, receivable: 0 };
      }
      acc[entry.investorType].count++;
      acc[entry.investorType].total += entry.amount;
      acc[entry.investorType].received += entry.receivedAmount;
      acc[entry.investorType].receivable += entry.receivableAmount;
      return acc;
    }, {} as Record<string, { count: number; total: number; received: number; receivable: number }>);

    return NextResponse.json({
      investEntries,
      totalInvested,
      totalReceived,
      totalReceivable,
      byInvestorType,
      activeCount: investEntries.filter(e => e.status === 'ACTIVE').length,
      maturedCount: investEntries.filter(e => e.status === 'MATURED').length,
      closedCount: investEntries.filter(e => e.status === 'CLOSED').length
    });
  } catch (error) {
    console.error('Error fetching invest money entries:', error);
    return NextResponse.json({ error: 'Failed to fetch invest money entries' }, { status: 500 });
  }
}

// POST - Add new invest money entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      companyId, 
      investorType, 
      investorName, 
      investorContact,
      amount, 
      investmentDate,
      expectedReturn,
      returnAmount,
      returnDueDate,
      description, 
      createdById 
    } = body;

    if (!companyId || !investorType || !investorName || !amount || !createdById) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create invest money entry
    const investEntry = await db.investMoney.create({
      data: {
        companyId,
        investorType,
        investorName,
        investorContact,
        amount: parseFloat(amount),
        investmentDate: investmentDate ? new Date(investmentDate) : new Date(),
        expectedReturn: expectedReturn ? parseFloat(expectedReturn) : null,
        returnAmount: returnAmount ? parseFloat(returnAmount) : null,
        returnDueDate: returnDueDate ? new Date(returnDueDate) : null,
        receivableAmount: returnAmount ? parseFloat(returnAmount) : 0,
        description,
        createdById
      }
    });

    // Create journal entry
    const entryNumber = `JE-INV-${Date.now()}`;
    
    // Get or create Invest Money account head (Liability)
    let investAccount = await db.accountHead.findFirst({
      where: { companyId, headCode: 'LIAB-002' }
    });

    if (!investAccount) {
      investAccount = await db.accountHead.create({
        data: {
          companyId,
          headCode: 'LIAB-002',
          headName: 'Invest Money',
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
        entryDate: investEntry.investmentDate,
        referenceType: 'INVEST_MONEY',
        referenceId: investEntry.id,
        narration: description || `Investment from ${investorName}`,
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
              accountId: investAccount.id,
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
          entryDate: investEntry.investmentDate,
          accountHeadId: bankAccount.id,
          accountHeadName: bankAccount.headName,
          accountType: 'ASSET',
          particular: description || `Investment from ${investorName}`,
          referenceType: 'INVEST_MONEY',
          referenceId: investEntry.id,
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
          entryDate: investEntry.investmentDate,
          accountHeadId: investAccount.id,
          accountHeadName: investAccount.headName,
          accountType: 'LIABILITY',
          particular: description || `Investment from ${investorName}`,
          referenceType: 'INVEST_MONEY',
          referenceId: investEntry.id,
          debit: 0,
          credit: parseFloat(amount),
          sourceType: 'JOURNAL_ENTRY',
          sourceId: journalEntry.id,
          journalEntryId: journalEntry.id,
          createdById
        }
      ]
    });

    // Update invest entry with journal reference
    await db.investMoney.update({
      where: { id: investEntry.id },
      data: { journalEntryId: journalEntry.id }
    });

    return NextResponse.json({
      success: true,
      investEntry,
      journalEntry
    });
  } catch (error) {
    console.error('Error creating invest money entry:', error);
    return NextResponse.json({ error: 'Failed to create invest money entry' }, { status: 500 });
  }
}
