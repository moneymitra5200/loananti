import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';

/**
 * POST /api/company/fix-mirror
 * One-time data correction: finds every company that should be an
 * "original" company (code ends in '3', or explicitly passed via body)
 * and sets isMirrorCompany = false.
 *
 * Also accepts a body: { companyId: string, isMirrorCompany: boolean }
 * to manually fix a single company.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // ── Manual single-company fix ───────────────────────────────────────────
    if (body?.companyId !== undefined) {
      const updated = await db.company.update({
        where: { id: body.companyId },
        data: { isMirrorCompany: body.isMirrorCompany === true },
        select: { id: true, name: true, code: true, isMirrorCompany: true },
      });
      cache.deletePattern('companies:');
      return NextResponse.json({ success: true, fixed: [updated] });
    }

    // ── Auto-fix: correct all companies with C3-type codes ──────────────────
    // Fetch all companies
    const all = await db.company.findMany({
      select: { id: true, name: true, code: true, isMirrorCompany: true },
    });

    const toFix = all.filter(c => {
      const cu = (c.code || '').toUpperCase();
      // A company is "original" if its code ends in 3 (C3, COMP3, etc.)
      const shouldBeOriginal = cu.endsWith('3') || cu === 'C3';
      // Fix if it's marked as mirror but should be original
      return shouldBeOriginal && c.isMirrorCompany === true;
    });

    const fixed = await Promise.all(
      toFix.map(c =>
        db.company.update({
          where: { id: c.id },
          data: { isMirrorCompany: false },
          select: { id: true, name: true, code: true, isMirrorCompany: true },
        })
      )
    );

    // Clear company cache so next fetch picks up corrected data
    cache.deletePattern('companies:');

    console.log(`[fix-mirror] Fixed ${fixed.length} companies:`, fixed.map(c => c.name));

    return NextResponse.json({
      success: true,
      checked: all.length,
      fixedCount: fixed.length,
      fixed,
    });
  } catch (error) {
    console.error('[fix-mirror] Error:', error);
    return NextResponse.json({ error: 'Failed to fix mirror companies' }, { status: 500 });
  }
}
