import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('secret') !== 'mitra-diag-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Fix IO Ledger] Starting migration to fix missing loanIds in Interest Only Journal Entries...');
    
    const entries = await db.journalEntry.findMany({
      where: { referenceType: 'INTEREST_ONLY_PAYMENT' },
      include: { lines: true }
    });
    
    let updated = 0;
    const details = [];
    
    for (const je of entries) {
      if (!je.lines.some(l => !l.loanId)) continue;
      
      let targetLoanId = null;
      const offlineEmi = await db.offlineLoanEMI.findUnique({
        where: { id: je.referenceId },
        select: { offlineLoanId: true }
      });
      
      if (offlineEmi) {
        targetLoanId = offlineEmi.offlineLoanId;
      } else {
        const payment = await db.payment.findUnique({
          where: { id: je.referenceId },
          select: { loanApplicationId: true }
        });
        if (payment) targetLoanId = payment.loanApplicationId;
      }
      
      if (targetLoanId) {
        await db.journalEntryLine.updateMany({
          where: { journalEntryId: je.id, loanId: null },
          data: { loanId: targetLoanId }
        });
        details.push(`Updated Journal Entry ${je.entryNumber} lines to point to loan ${targetLoanId}`);
        updated++;
      } else {
        details.push(`WARNING: Could not resolve loanId for Journal Entry ${je.entryNumber} (Ref: ${je.referenceId})`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Migration complete! Updated ${updated} journal entries out of ${entries.length} total INTEREST_ONLY_PAYMENT entries.`,
      details
    });
  } catch (error: any) {
    console.error('[Fix IO Ledger] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
