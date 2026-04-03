import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Test database connection
    await db.$queryRaw`SELECT 1 as test`;
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasDirectUrl: !!process.env.DIRECT_DATABASE_URL,
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'unhealthy',
      database: 'disconnected',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasDirectUrl: !!process.env.DIRECT_DATABASE_URL,
    }, { status: 500 });
  }
}
