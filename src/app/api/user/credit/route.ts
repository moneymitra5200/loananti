import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch user's credit balances by userId (from query params)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        personalCredit: true,
        companyCredit: true,
        credit: true,
        role: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      personalCredit: user.personalCredit || 0,
      companyCredit: user.companyCredit || 0,
      totalCredit: user.credit || 0,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Error fetching user credit:', error);
    return NextResponse.json({ error: 'Failed to fetch user credit' }, { status: 500 });
  }
}
