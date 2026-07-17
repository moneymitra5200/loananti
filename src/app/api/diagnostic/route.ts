import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const companies = await db.company.findMany({
      select: { id: true, name: true, code: true, isMirrorCompany: true }
    });

    const loans = await db.loanApplication.findMany({
      select: {
        id: true,
        applicationNo: true,
        companyId: true,
        customerId: true,
        status: true,
        requestedAmount: true,
        loanAmount: true,
        processingFee: true,
        disbursedAmount: true,
        disbursedAt: true,
        disbursementMode: true
      }
    });

    const cashBooks = await db.cashBook.findMany();
    const bankAccounts = await db.bankAccount.findMany();

    const journalEntries = await db.journalEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        lines: {
          include: {
            account: {
              select: { accountCode: true, accountName: true, accountType: true }
            }
          }
        }
      }
    });

    const chartOfAccounts = await db.chartOfAccount.findMany({
      select: { id: true, companyId: true, accountCode: true, accountName: true, currentBalance: true, accountType: true }
    });

    return NextResponse.json({
      companies,
      loans,
      cashBooks,
      bankAccounts,
      journalEntries,
      chartOfAccounts
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
