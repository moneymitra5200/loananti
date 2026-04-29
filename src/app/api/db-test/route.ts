import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Show which env vars are present (masked)
  const dbHost = process.env.DB_HOST;
  const dbUser = process.env.DB_USER;
  const dbPass = process.env.DB_PASS;
  const dbName = process.env.DB_NAME;
  const databaseUrl = process.env.DATABASE_URL;

  const config = {
    DB_HOST: dbHost || '(not set)',
    DB_USER: dbUser || '(not set)',
    DB_PASS: dbPass ? `${dbPass.substring(0, 4)}****` : '(not set)',
    DB_NAME: dbName || '(not set)',
    DATABASE_URL: databaseUrl
      ? databaseUrl.replace(/:([^:@]+)@/, ':****@') // mask password
      : '(not set)',
    usingComponents: !!(dbHost && dbUser && dbPass && dbName),
  };

  try {
    const result = await db.$queryRaw<[{ test: number }]>`SELECT 1 as test`;
    return NextResponse.json({
      status: '✅ CONNECTED',
      config,
      dbResult: result,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: '❌ FAILED',
      error: err?.message || String(err),
      config,
    }, { status: 500 });
  }
}
