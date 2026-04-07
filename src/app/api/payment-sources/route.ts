import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch combined payment sources (Bank Accounts + Cash Book)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    console.log('[Payment Sources API] Request received for companyId:', companyId);

    if (!companyId || companyId.startsWith(':') || companyId.length < 10) {
      console.error('[Payment Sources API] Invalid companyId received:', companyId);
      return NextResponse.json({ 
        error: 'Valid Company ID is required',
        receivedId: companyId 
      }, { status: 400 });
    }

    // Fetch company details to check if it's a mirror company
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { 
        id: true, 
        name: true, 
        code: true, 
        isMirrorCompany: true 
      }
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const paymentSources: any[] = [];

    // 1. Fetch Bank Accounts (for all companies)
    const bankAccounts = await db.bankAccount.findMany({
      where: { 
        companyId,
        isActive: true 
      },
      orderBy: { isDefault: 'desc' },
      select: {
        id: true,
        bankName: true,
        accountNumber: true,
        accountName: true,
        ownerName: true,
        currentBalance: true,
        companyId: true,
        isDefault: true,
        ifscCode: true,
        upiId: true,
        branchName: true,
        accountType: true,
        isActive: true,
      }
    });

    // Add bank accounts to payment sources
    bankAccounts.forEach(account => {
      paymentSources.push({
        id: account.id,
        type: 'BANK',
        name: account.bankName,
        displayName: `${account.bankName} - ${account.accountNumber}`,
        accountNumber: account.accountNumber,
        ifscCode: account.ifscCode,
        currentBalance: account.currentBalance,
        isDefault: account.isDefault,
        details: account,
      });
    });

    // 2. Fetch Cash Book (for all companies)
    let cashBook = await db.cashBook.findUnique({
      where: { companyId },
      include: {
        company: { select: { id: true, name: true, code: true } }
      }
    });

    // Create cash book if not exists
    if (!cashBook) {
      cashBook = await db.cashBook.create({
        data: {
          companyId,
          currentBalance: 0,
        },
        include: {
          company: { select: { id: true, name: true, code: true } }
        }
      });
    }

    // Add cash book as a payment source
    paymentSources.push({
      id: `cash_${companyId}`,
      type: 'CASH',
      name: 'Cash Book',
      displayName: `Cash in Hand (${company.name})`,
      accountNumber: null,
      ifscCode: null,
      currentBalance: cashBook.currentBalance,
      isDefault: bankAccounts.length === 0, // Default if no bank accounts
      details: {
        cashBookId: cashBook.id,
        company: cashBook.company,
      },
    });

    console.log('[Payment Sources API] Found', paymentSources.length, 'payment sources');

    return NextResponse.json({ 
      success: true,
      company: {
        id: company.id,
        name: company.name,
        code: company.code,
        isMirrorCompany: company.isMirrorCompany,
      },
      paymentSources,
      summary: {
        totalBankAccounts: bankAccounts.length,
        hasCashBook: true,
        totalBalance: paymentSources.reduce((sum, s) => sum + s.currentBalance, 0),
      }
    });

  } catch (error) {
    console.error('[Payment Sources API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to get payment sources',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
