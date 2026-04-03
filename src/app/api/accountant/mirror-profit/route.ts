import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get mirror loan profit for a specific company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    // Check if this company is a mirror company (Company 1 or 2) or original company (Company 3)
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, code: true }
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Determine company type based on code
    // Company with code containing '1' or '2' is a mirror company (operational)
    // Company with code containing '3' is the original company (profit center)
    const isMirrorCompany = company.code.includes('1') || company.code.includes('2');
    const isProfitCenter = company.code.includes('3'); // Company 3

    if (isMirrorCompany) {
      // This is Company 1 or 2 - Show MIRROR INTEREST income
      const mirrorMappings = await db.mirrorLoanMapping.findMany({
        where: { mirrorCompanyId: companyId },
        include: {
          originalLoan: {
            select: { 
              applicationNo: true, 
              id: true,
              customerId: true,
              customer: { select: { name: true } }
            }
          }
        }
      });

      // Get mirror interest transactions from bank transactions
      const mirrorInterestTransactions = await db.bankTransaction.findMany({
        where: {
          bankAccount: { companyId },
          referenceType: 'MIRROR_INTEREST'
        },
        select: {
          id: true,
          amount: true,
          description: true,
          transactionDate: true,
          referenceType: true
        }
      });

      const totalMirrorInterestReceived = mirrorInterestTransactions.reduce((sum, t) => sum + t.amount, 0);

      const portfolio = mirrorMappings.map(mapping => ({
        id: mapping.id,
        loanApplicationNo: mapping.originalLoan?.applicationNo,
        customerName: mapping.originalLoan?.customer?.name || 'N/A',
        originalTenure: mapping.originalTenure,
        mirrorTenure: mapping.mirrorTenure,
        mirrorEMIsPaid: mapping.mirrorEMIsPaid,
        mirrorInterestRate: mapping.mirrorInterestRate,
        originalEMIAmount: mapping.originalEMIAmount,
        totalMirrorInterest: mapping.totalMirrorInterest,
        isCompleted: mapping.mirrorEMIsPaid >= mapping.mirrorTenure
      }));

      return NextResponse.json({
        success: true,
        companyType: 'MIRROR_COMPANY',
        companyName: company.name,
        portfolio,
        transactions: mirrorInterestTransactions,
        totalMirrorInterestReceived,
        activeMirrorLoans: mirrorMappings.filter(m => m.mirrorEMIsPaid < m.mirrorTenure).length,
        completedMirrorLoans: mirrorMappings.filter(m => m.mirrorEMIsPaid >= m.mirrorTenure).length
      });
    }

    if (isProfitCenter) {
      // This is Company 3 - Show EXTRA EMI PROFIT
      // Get mirror mappings where the original loan belongs to this company
      const mirrorMappings = await db.mirrorLoanMapping.findMany({
        where: {
          originalLoan: { companyId }
        },
        include: {
          originalLoan: {
            select: { 
              applicationNo: true, 
              id: true,
              customer: { select: { name: true } }
            }
          },
          mirrorCompany: { select: { name: true, code: true } }
        }
      });

      // Get extra EMI profit transactions
      const extraEMIProfitTransactions = await db.bankTransaction.findMany({
        where: {
          bankAccount: { companyId },
          referenceType: 'EXTRA_EMI_PROFIT'
        },
        select: {
          id: true,
          amount: true,
          description: true,
          transactionDate: true,
          referenceType: true
        }
      });

      const totalProfitReceived = mirrorMappings.reduce((sum, m) => sum + m.totalProfitReceived, 0);
      const totalPotentialProfit = mirrorMappings.reduce((sum, m) => sum + (m.extraEMICount * m.originalEMIAmount), 0);

      const profitDetails = mirrorMappings
        .filter(m => m.extraEMICount > 0)
        .map(mapping => ({
          id: mapping.id,
          loanApplicationNo: mapping.originalLoan?.applicationNo,
          customerName: mapping.originalLoan?.customer?.name || 'N/A',
          mirrorCompany: mapping.mirrorCompany?.name,
          extraEMICount: mapping.extraEMICount,
          extraEMIsPaid: mapping.extraEMIsPaid,
          emiAmount: mapping.originalEMIAmount,
          potentialProfit: mapping.extraEMICount * mapping.originalEMIAmount,
          receivedProfit: mapping.totalProfitReceived,
          mirrorCompleted: !!mapping.mirrorCompletedAt,
          createdAt: mapping.createdAt
        }));

      return NextResponse.json({
        success: true,
        companyType: 'PROFIT_CENTER',
        companyName: company.name,
        profitDetails,
        transactions: extraEMIProfitTransactions,
        totalPotentialProfit,
        totalProfitReceived,
        totalExtraEMIs: mirrorMappings.reduce((sum, m) => sum + m.extraEMICount, 0),
        totalExtraEMIsPaid: mirrorMappings.reduce((sum, m) => sum + m.extraEMIsPaid, 0),
        mirrorLoansWithExtraEMIs: mirrorMappings.filter(m => m.extraEMICount > 0).length
      });
    }

    // Default - no specific mirror loan data for this company type
    return NextResponse.json({
      success: true,
      companyType: 'STANDARD',
      companyName: company.name,
      message: 'This company is not configured for mirror loan operations'
    });

  } catch (error) {
    console.error('Error fetching mirror profit:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch mirror profit data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
