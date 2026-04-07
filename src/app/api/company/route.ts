import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const noCache = searchParams.get('noCache');

    // Generate cache key
    const cacheKey = isActive ? `companies:active` : CacheKeys.companiesList();

    // Check cache first (skip if noCache is true)
    if (noCache !== 'true') {
      const cachedCompanies = cache.get(cacheKey);
      if (cachedCompanies) {
        return NextResponse.json({ companies: cachedCompanies, cached: true });
      }
    }

    const where: any = {};
    if (isActive === 'true') {
      where.isActive = true;
    }

    const companies = await db.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        defaultInterestRate: true,
        defaultInterestType: true,
        enableMirrorLoan: true,
        mirrorInterestRate: true,
        mirrorInterestType: true,
        maxLoanAmount: true,
        minLoanAmount: true,
        maxTenureMonths: true,
        createdAt: true,
        contactEmail: true,
        contactPhone: true,
        isMirrorCompany: true,
        accountingType: true,
        logoUrl: true,
        address: true,
        city: true,
        state: true,
        gstNumber: true,
        panNumber: true,
        ownerName: true,
        ownerPhone: true,
      }
    });

    // Deduplicate by code (in case of database issues)
    const seenCodes = new Set<string>();
    const deduplicatedCompanies = companies.filter(company => {
      if (seenCodes.has(company.code)) {
        return false; // Skip duplicate
      }
      seenCodes.add(company.code);
      return true;
    });

    // Format response
    const formattedCompanies = deduplicatedCompanies.map(c => ({
      ...c,
      loanCount: 0 // Will be fetched separately if needed
    }));

    // Cache the result
    cache.set(cacheKey, formattedCompanies, CacheTTL.LONG);

    return NextResponse.json({ companies: formattedCompanies });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      code, 
      contactEmail, 
      contactPhone, 
      defaultInterestRate, 
      defaultInterestType, 
      isActive,
      // New profile fields
      address,
      city,
      state,
      pincode,
      country,
      gstNumber,
      panNumber,
      website,
      ownerName,
      ownerPhone,
      ownerEmail,
      ownerPan,
      ownerAadhaar,
      logoUrl,
      // Mirror settings
      isMirrorCompany,
      mirrorInterestRate,
      mirrorInterestType,
      enableMirrorLoan,
      // Accounting settings
      accountingType,
      maxLoanAmount,
      minLoanAmount,
      maxTenureMonths
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    // Generate code if not provided
    const companyCode = code || `COMP-${Date.now().toString(36).toUpperCase()}`;

    const company = await db.company.create({
      data: {
        name,
        code: companyCode,
        contactEmail,
        contactPhone,
        address,
        city,
        state,
        pincode,
        country: country || 'India',
        gstNumber,
        panNumber,
        website,
        ownerName,
        ownerPhone,
        ownerEmail,
        ownerPan,
        ownerAadhaar,
        logoUrl,
        defaultInterestRate: defaultInterestRate || 12,
        defaultInterestType: defaultInterestType || 'FLAT',
        isActive: isActive ?? true,
        // Mirror settings
        isMirrorCompany: isMirrorCompany ?? true,
        mirrorInterestRate: mirrorInterestRate || null,
        mirrorInterestType: mirrorInterestType || 'REDUCING',
        enableMirrorLoan: enableMirrorLoan ?? false,
        // Accounting settings
        accountingType: accountingType || 'FULL',
        maxLoanAmount: maxLoanAmount || 10000000,
        minLoanAmount: minLoanAmount || 10000,
        maxTenureMonths: maxTenureMonths || 60,
      }
    });

    // Invalidate company cache
    cache.deletePattern('companies:');

    return NextResponse.json({ success: true, company });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const company = await db.company.update({
      where: { id },
      data: updateData
    });

    // Invalidate company cache
    cache.deletePattern('companies:');
    cache.delete(CacheKeys.company(id));

    return NextResponse.json({ success: true, company });
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    console.log('[Company DELETE] Starting permanent delete for company:', id);

    if (!id) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Check for related loans
    const loansCount = await db.loanApplication.count({
      where: { companyId: id }
    });

    if (loansCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete company. It has ${loansCount} loan(s) associated with it.`,
        hasRelations: true 
      }, { status: 400 });
    }

    // Delete all related records for this company (PERMANENT DELETE)
    console.log('[Company DELETE] Deleting related records...');
    
    // Delete in order respecting foreign key constraints
    await Promise.all([
      // Delete chart of accounts
      db.ledgerBalance.deleteMany({ where: { account: { companyId: id } } }),
      db.journalEntryLine.deleteMany({ where: { account: { companyId: id } } }),
      db.chartOfAccount.deleteMany({ where: { companyId: id } }),
      // Delete financial years
      db.ledgerBalance.deleteMany({ where: { financialYear: { companyId: id } } }),
      db.financialYear.deleteMany({ where: { companyId: id } }),
      // Delete bank accounts
      db.bankAccount.deleteMany({ where: { companyId: id } }),
      // Delete other related records
      db.ledger.deleteMany({ where: { companyId: id } }),
      db.expense.deleteMany({ where: { companyId: id } }),
      db.journalEntry.deleteMany({ where: { companyId: id } }),
      db.gstConfig.deleteMany({ where: { companyId: id } }),
      db.fixedAsset.deleteMany({ where: { companyId: id } }),
      db.commissionSlab.deleteMany({ where: { companyId: id } }),
      db.gracePeriodConfig.deleteMany({ where: { companyId: id } }),
      db.preApprovedOffer.deleteMany({ where: { companyId: id } }),
      db.agentPerformance.deleteMany({ where: { companyId: id } }),
    ]);

    // PERMANENT DELETE - Hard delete the company
    console.log('[Company DELETE] Permanently deleting company:', id);
    await db.company.delete({ where: { id } });

    // Clear ALL caches
    cache.deletePattern('companies:');
    cache.deletePattern('users:');

    console.log('[Company DELETE] Company permanently deleted successfully');

    return NextResponse.json({ 
      success: true, 
      message: 'Company permanently deleted from database',
      deletedCompanyId: id 
    });
  } catch (error) {
    console.error('[Company DELETE] Error deleting company:', error);
    
    // Handle foreign key constraint errors
    if (error instanceof Error && error.message.includes('Foreign key constraint failed')) {
      return NextResponse.json({ 
        error: 'Cannot delete company. It has related records in the system.' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to delete company',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
