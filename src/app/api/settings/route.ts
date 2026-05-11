import { NextRequest, NextResponse } from 'next/server';
import { db, dbWithTimeout } from '@/lib/db';
import { cache, CacheKeys } from '@/lib/cache';

export async function GET() {
  try {
    // Serve from cache instantly if available (settings rarely change)
    const cached = cache.get(CacheKeys.systemSettings());
    if (cached) {
      const settingsObj: Record<string, string> = {};
      for (const s of cached as any[]) settingsObj[s.key] = s.value;
      settingsObj['companyLogo'] = '/mm-logo.png';
      return NextResponse.json({ settings: settingsObj, cached: true }, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
      });
    }

    // Hard 6s timeout — settings must not block the app from loading
    let settings: { key: string; value: string }[];
    try {
      settings = await dbWithTimeout(
        () => db.systemSetting.findMany({ select: { key: true, value: true } }),
        6000
      );
      cache.set(CacheKeys.systemSettings(), settings, 300000);
    } catch {
      // DB timeout — return empty settings so the app still loads
      settings = [];
    }

    const settingsObj: Record<string, string> = {};
    for (const setting of settings) settingsObj[setting.key] = setting.value;
    settingsObj['companyLogo'] = '/mm-logo.png';

    return NextResponse.json({ settings: settingsObj }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (error) {
    return NextResponse.json({ settings: { companyLogo: '/mm-logo.png' } }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Settings object is required' }, { status: 400 });
    }

    // Batch upsert using transaction
    const updates = Object.entries(settings).map(([key, value]) =>
      db.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      })
    );

    await db.$transaction(updates);

    // Clear cache after update
    cache.delete(CacheKeys.systemSettings());

    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
