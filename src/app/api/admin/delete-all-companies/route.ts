import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';

// POST - Delete ALL companies (DANGEROUS - Admin only)
export async function POST() {
  try {
    // First delete all company users
    const deletedUsers = await db.user.deleteMany({
      where: { role: 'COMPANY' }
    });

    // Then delete all companies
    const deletedCompanies = await db.company.deleteMany({});

    // ── CRITICAL: Clear server-side cache so next fetch returns empty list ──
    cache.deletePattern('companies:');
    cache.deletePattern('users:');
    cache.clear(); // nuclear clear to be safe

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCompanies.count} companies and ${deletedUsers.count} company users`,
      deletedCompanies: deletedCompanies.count,
      deletedUsers: deletedUsers.count
    });
  } catch (error) {
    console.error('Error deleting companies:', error);
    return NextResponse.json({
      error: 'Failed to delete companies',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
