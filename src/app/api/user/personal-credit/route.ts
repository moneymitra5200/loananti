import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/user/personal-credit
 * Adds an amount to a user's personal credit.
 * Used when cashier enters a charges amount during disbursement.
 * NO accounting journal entry is created — purely personal credit.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, amount, loanId, description } = body;

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'userId and a positive amount are required' }, { status: 400 });
    }

    // Atomically increment personalCredit and credit on the user
    const updated = await db.user.update({
      where: { id: userId },
      data: {
        personalCredit: { increment: amount },
        credit: { increment: amount }
      },
      select: { id: true, name: true, personalCredit: true, credit: true }
    });

    // Log it as a notification so the user sees the credit
    await db.notification.create({
      data: {
        userId,
        type: 'PERSONAL_CREDIT',
        title: 'Personal Credit Added',
        message: `₹${amount.toLocaleString('en-IN')} charges credited to your personal account${loanId ? ` for loan disbursement` : ''}.${description ? ` Note: ${description}` : ''}`,
        data: JSON.stringify({ amount, loanId })
      }
    });

    return NextResponse.json({
      success: true,
      message: `₹${amount} personal credit added`,
      user: updated
    });
  } catch (error) {
    console.error('[Personal Credit] Error:', error);
    return NextResponse.json({ error: 'Failed to add personal credit' }, { status: 500 });
  }
}
