import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Stable build identifier — set by Vercel on each deploy, falls back to start-time
const BUILD_ID =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.BUILD_ID ||
  `build-${Date.now()}`;

export async function GET() {
  const startTime = Date.now();

  try {
    await db.$queryRaw`SELECT 1 as test`;
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'healthy',
        database: 'connected',
        buildId: BUILD_ID,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          ETag: `"${BUILD_ID}"`,
        },
      }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        buildId: BUILD_ID,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          ETag: `"${BUILD_ID}"`,
        },
      }
    );
  }
}
