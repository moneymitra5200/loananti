import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    // Generate cache key
    const cacheKey = isActive ? `companies:active` : CacheKeys.companiesList();

    // Check cache first
    const cachedCompanies = cache.get(cacheKey);
    if (cachedCompanies) {
      return NextResponse.json({ companies: cachedCompanies, cached: true });
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

    // Format response
    const formattedCompanies = companies.map(c => ({
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

    await db.company.delete({ where: { id } });

    // Invalidate company cache
    cache.deletePattern('companies:');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}
