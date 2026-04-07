import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Clean up seed data - removes only the default seed companies and users
// Seed companies: Company 1, Company 2, Company 3 (codes: COMP1, COMP2, COMP3)
// Seed users: admin@test.com, company1@test.com, company2@test.com, company3@test.com

export async function POST() {
  try {
    console.log('[cleanup-seed] Starting seed data cleanup...');

    // Seed company codes
    const seedCompanyCodes = ['COMP1', 'COMP2', 'COMP3'];
    
    // Seed user emails
    const seedUserEmails = [
      'admin@test.com',
      'company1@test.com',
      'company2@test.com',
      'company3@test.com'
    ];

    // Get seed companies
    const seedCompanies = await db.company.findMany({
      where: {
        code: { in: seedCompanyCodes }
      },
      select: { id: true, name: true, code: true }
    });

    console.log('[cleanup-seed] Found seed companies:', seedCompanies);

    // Get seed company IDs
    const seedCompanyIds = seedCompanies.map(c => c.id);

    // Delete users associated with seed companies
    let deletedCompanyUsers = 0;
    if (seedCompanyIds.length > 0) {
      const result = await db.user.deleteMany({
        where: {
          companyId: { in: seedCompanyIds }
        }
      });
      deletedCompanyUsers = result.count;
    }

    // Delete seed users by email
    const deletedSeedUsers = await db.user.deleteMany({
      where: {
        email: { in: seedUserEmails }
      }
    });

    // Delete seed companies
    const deletedCompanies = await db.company.deleteMany({
      where: {
        code: { in: seedCompanyCodes }
      }
    });

    console.log('[cleanup-seed] Cleanup complete');

    return NextResponse.json({
      success: true,
      message: 'Seed data cleaned up successfully',
      details: {
        deletedCompanies: deletedCompanies.count,
        deletedCompanyUsers,
        deletedSeedUsers: deletedSeedUsers.count
      }
    });
  } catch (error) {
    console.error('[cleanup-seed] Error:', error);
    return NextResponse.json({
      error: 'Failed to cleanup seed data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
