import { NextRequest, NextResponse } from 'next/server';
import { runAutoReconciliation } from '@/lib/accounting-auto-reconciler';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;

    const res = await runAutoReconciliation(companyId);
    return NextResponse.json(res);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Reconciliation failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const res = await runAutoReconciliation(body.companyId);
    return NextResponse.json(res);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Reconciliation failed' }, { status: 500 });
  }
}
