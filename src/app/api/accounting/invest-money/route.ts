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
      orderBy: { investedDate: 'desc' }
    });

    // Calculate totals
    const totalInvested = investEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalCurrentValue = investEntries.reduce((sum, entry) => sum + (entry.currentValue || entry.amount), 0);

    // Group by investment type
    const byInvestmentType = investEntries.reduce((acc, entry) => {
      if (!acc[entry.investmentType]) {
        acc[entry.investmentType] = { count: 0, total: 0, currentValue: 0 };
      }
      acc[entry.investmentType].count++;
      acc[entry.investmentType].total += entry.amount;
      acc[entry.investmentType].currentValue += entry.currentValue || entry.amount;
      return acc;
    }, {} as Record<string, { count: number; total: number; currentValue: number }>);

    return NextResponse.json({
      investEntries,
      totalInvested,
      totalCurrentValue,
      byInvestmentType,
      activeCount: investEntries.filter(e => e.status === 'ACTIVE').length,
      maturedCount: investEntries.filter(e => e.status === 'MATURED').length,
      withdrawnCount: investEntries.filter(e => e.status === 'WITHDRAWN').length
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
      investmentType, 
      investmentName, 
      amount, 
      interestRate,
      maturityDate,
      investedDate,
      description, 
      createdById 
    } = body;

    if (!companyId || !investmentType || !investmentName || !amount || !createdById) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create invest money entry
    const investEntry = await db.investMoney.create({
      data: {
        companyId,
        investmentType,
        investmentName,
        amount: parseFloat(amount),
        interestRate: interestRate ? parseFloat(interestRate) : null,
        maturityDate: maturityDate ? new Date(maturityDate) : null,
        investedDate: investedDate ? new Date(investedDate) : new Date(),
        description,
        createdById
      }
    });

    // Create journal entry
    const entryNumber = `JE-INV-${Date.now()}`;
    
    // Get or create Invest Money account head
    let investAccount = await db.accountHead.findFirst({
      where: { companyId, headCode: 'EQUITY-INV-001' }
    });

    if (!investAccount) {
      investAccount = await db.accountHead.create({
        data: {
          companyId,
          headCode: 'EQUITY-INV-001',
          headName: 'Invest Money',
          headType: 'EQUITY',
          isSystemHead: true
        }
      });
    }

    // Get or create Bank account head
    let bankAccount = await db.accountHead.findFirst({
      where: { companyId, headCode: 'ASSET-BANK-001' }
    });

    if (!bankAccount) {
      bankAccount = await db.accountHead.create({
        data: {
          companyId,
          headCode: 'ASSET-BANK-001',
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
        entryDate: investEntry.investedDate,
        referenceType: 'INVEST_MONEY',
        referenceId: investEntry.id,
        narration: description || `Investment: ${investmentName}`,
        totalDebit: parseFloat(amount),
        totalCredit: parseFloat(amount),
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
          entryDate: investEntry.investedDate,
          accountHeadId: bankAccount.id,
          accountHeadName: bankAccount.headName,
          accountType: 'ASSET',
          particular: description || `Investment: ${investmentName}`,
          referenceType: 'INVEST_MONEY',
          referenceId: investEntry.id,
          debit: parseFloat(amount),
          credit: 0,
          sourceType: 'JOURNAL_ENTRY',
          sourceId: journalEntry.id,
          createdById
        },
        {
          companyId,
          entryNumber: `DB-${Date.now()}-2`,
          entryDate: investEntry.investedDate,
          accountHeadId: investAccount.id,
          accountHeadName: investAccount.headName,
          accountType: 'EQUITY',
          particular: description || `Investment: ${investmentName}`,
          referenceType: 'INVEST_MONEY',
          referenceId: investEntry.id,
          debit: 0,
          credit: parseFloat(amount),
          sourceType: 'JOURNAL_ENTRY',
          sourceId: journalEntry.id,
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
