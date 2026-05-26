import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await db.$queryRaw<[{ test: number }]>`SELECT 1 as test`;
    return NextResponse.json({ status: 'CONNECTED', dbResult: result });
  } catch (err: any) {
    return NextResponse.json({ status: 'FAILED', error: err?.message || String(err) }, { status: 500 });
  }
}
