import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Personal Ledger API
 * 
 * Shows ALL journal entries for a specific customer/loan:
 * - Loan Disbursement
 * - EMI Payments (Principal + Interest)
 * - Penalty Collection
 * - Processing Fees
 * - Any other entries
 * 
 * This is REAL accounting - each customer has their own "Khata"
 */

// GET - Fetch Personal Ledger for a customer or loan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const loanId = searchParams.get('loanId');
    const companyId = searchParams.get('companyId');

    console.log(`[Personal Ledger] customerId: ${customerId}, loanId: ${loanId}, companyId: ${companyId}`);

    // Get all journal entry lines for this customer/loan
    const whereClause: any = {};
    
    if (customerId) {
      whereClause.customerId = customerId;
    }
    if (loanId) {
      whereClause.loanId = loanId;
    }

    // Fetch journal entry lines with journal entry details
    const journalLines = await db.journalEntryLine.findMany({
      where: whereClause,
      include: {
        journalEntry: {
          select: {
            id: true,
            entryNumber: true,
            entryDate: true,
            referenceType: true,
            referenceId: true,
            narration: true,
            paymentMode: true,
            isAutoEntry: true,
            createdById: true
          }
        },
        account: { 
          select: { 
            id: true, 
            accountCode: true, 
            accountName: true, 
            accountType: true 
          } 
        }
      },
      orderBy: {
        journalEntry: {
          entryDate: 'asc'
        }
      }
    });

    // Group by journal entry
    const entriesMap = new Map<string, any>();

    for (const line of journalLines) {
      const entryId = line.journalEntryId;
      
      if (!entriesMap.has(entryId)) {
        entriesMap.set(entryId, {
          id: entryId,
          entryNumber: line.journalEntry.entryNumber,
          date: line.journalEntry.entryDate,
          referenceType: line.journalEntry.referenceType,
          referenceId: line.journalEntry.referenceId,
          narration: line.journalEntry.narration,
          paymentMode: line.journalEntry.paymentMode,
          createdBy: line.journalEntry.createdById || 'System',
          isAutoEntry: line.journalEntry.isAutoEntry,
          lines: []
        });
      }

      entriesMap.get(entryId)!.lines.push({
        accountId: line.accountId,
        accountCode: line.account?.accountCode,
        accountName: line.account?.accountName,
        accountType: line.account?.accountType,
        debitAmount: line.debitAmount,
        creditAmount: line.creditAmount,
        narration: line.narration
      });
    }

    const entries = Array.from(entriesMap.values());

    // Calculate running balance for loan receivable
    let runningBalance = 0;
    const entriesWithBalance = entries.map(entry => {
      // Calculate net effect on Loans Receivable (account code 1200, 1201, 1210)
      let loanReceivableChange = 0;
      
      for (const line of entry.lines) {
        if (['1200', '1201', '1210'].includes(line.accountCode)) {
          // Loans Receivable is an ASSET - Debit increases, Credit decreases
          loanReceivableChange += line.debitAmount - line.creditAmount;
        }
      }
      
      runningBalance += loanReceivableChange;
      
      return {
        ...entry,
        loanReceivableChange,
        runningBalance
      };
    });

    // Get customer summary
    let customerSummary: any = null;
    
    if (customerId) {
      const customer = await db.user.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true
        }
      });

      if (customer) {
        // Get all loans for this customer
        const onlineLoans = await db.loanApplication.findMany({
          where: { customerId, status: { in: ['ACTIVE', 'DISBURSED', 'CLOSED'] } },
          select: {
            id: true,
            applicationNo: true,
            status: true,
            disbursedAmount: true,
            disbursedAt: true,
            sessionForm: { select: { approvedAmount: true, interestRate: true, tenure: true } }
          }
        });

        const offlineLoans = await db.offlineLoan.findMany({
          where: { customerId, status: { in: ['ACTIVE', 'INTEREST_ONLY', 'CLOSED'] } },
          select: {
            id: true,
            loanNumber: true,
            status: true,
            loanAmount: true,
            disbursementDate: true,
            interestRate: true,
            tenure: true
          }
        });

        customerSummary = {
          ...customer,
          onlineLoans: onlineLoans.map(l => ({
            id: l.id,
            loanNumber: l.applicationNo,
            type: 'ONLINE',
            status: l.status,
            amount: l.sessionForm?.approvedAmount || l.disbursedAmount || 0,
            disbursementDate: l.disbursedAt,
            interestRate: l.sessionForm?.interestRate,
            tenure: l.sessionForm?.tenure
          })),
          offlineLoans: offlineLoans.map(l => ({
            id: l.id,
            loanNumber: l.loanNumber,
            type: 'OFFLINE',
            status: l.status,
            amount: l.loanAmount,
            disbursementDate: l.disbursementDate,
            interestRate: l.interestRate,
            tenure: l.tenure
          }))
        };
      }
    }

    // Get loan summary if specific loan requested
    let loanSummary: any = null;
    
    if (loanId) {
      // Try online loan first
      const onlineLoan = await db.loanApplication.findUnique({
        where: { id: loanId },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          company: { select: { id: true, name: true } },
          sessionForm: true
        }
      });

      if (onlineLoan) {
        loanSummary = {
          id: onlineLoan.id,
          loanNumber: onlineLoan.applicationNo,
          type: 'ONLINE',
          status: onlineLoan.status,
          amount: onlineLoan.sessionForm?.approvedAmount || onlineLoan.requestedAmount,
          customer: onlineLoan.customer,
          company: onlineLoan.company
        };
      } else {
        // Try offline loan
        const offlineLoan = await db.offlineLoan.findUnique({
          where: { id: loanId },
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            company: { select: { id: true, name: true } }
          }
        });

        if (offlineLoan) {
          loanSummary = {
            id: offlineLoan.id,
            loanNumber: offlineLoan.loanNumber,
            type: 'OFFLINE',
            status: offlineLoan.status,
            amount: offlineLoan.loanAmount,
            customer: offlineLoan.customer,
            company: offlineLoan.company
          };
        }
      }
    }

    // Calculate totals
    const totals = {
      totalDebits: entries.reduce((sum, e) => sum + e.lines.reduce((s, l) => s + l.debitAmount, 0), 0),
      totalCredits: entries.reduce((sum, e) => sum + e.lines.reduce((s, l) => s + l.creditAmount, 0), 0),
      totalEntries: entries.length,
      currentOutstanding: runningBalance
    };

    return NextResponse.json({
      success: true,
      entries: entriesWithBalance,
      customerSummary,
      loanSummary,
      totals
    });

  } catch (error) {
    console.error('[Personal Ledger] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch personal ledger',
      details: (error as Error).message
    }, { status: 500 });
  }
}
