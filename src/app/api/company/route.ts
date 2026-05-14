import { NextRequest, NextResponse } from 'next/server';
import { db, dbWithTimeout } from '@/lib/db';
import { fireAudit } from '@/lib/audit';
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const noCache = searchParams.get('noCache');

    const cacheKey = isActive ? `companies:active` : CacheKeys.companiesList();

    // Serve from cache instantly if available
    if (noCache !== 'true') {
      const cachedCompanies = cache.get(cacheKey);
      if (cachedCompanies) {
        return NextResponse.json({ companies: cachedCompanies, cached: true });
      }
    }

    const where: any = {};
    if (isActive === 'true') where.isActive = true;

    const fullSelect = {
      id: true, name: true, code: true, isActive: true,
      defaultInterestRate: true, defaultInterestType: true,
      enableMirrorLoan: true, mirrorInterestRate: true, mirrorInterestType: true,
      maxLoanAmount: true, minLoanAmount: true, maxTenureMonths: true,
      createdAt: true, contactEmail: true, contactPhone: true,
      isMirrorCompany: true, accountingType: true,
      logoUrl: true, address: true, city: true, state: true,
      gstNumber: true, panNumber: true, ownerName: true, ownerPhone: true,
    };

    const safeSelect = {
      id: true, name: true, code: true, isActive: true,
      defaultInterestRate: true, defaultInterestType: true,
      enableMirrorLoan: true, mirrorInterestRate: true, mirrorInterestType: true,
      maxLoanAmount: true, minLoanAmount: true, maxTenureMonths: true,
      createdAt: true, contactEmail: true, contactPhone: true,
      isMirrorCompany: true,
      logoUrl: true, address: true, city: true, state: true,
      gstNumber: true, panNumber: true, ownerName: true, ownerPhone: true,
    };

    let companies: any[];
    try {
      // 8s hard timeout — prevents this from hanging 30-120s
      companies = await dbWithTimeout(
        () => db.company.findMany({ where, orderBy: { createdAt: 'desc' }, select: fullSelect }),
        8000
      );
    } catch (selectError: any) {
      if (selectError.message?.includes('DB_TIMEOUT')) throw selectError;
      // Schema fallback: retry without accountingType (older production schema)
      console.warn('[Company GET] Full select failed, using safe fallback:', selectError.message);
      companies = await dbWithTimeout(
        () => db.company.findMany({ where, orderBy: { createdAt: 'desc' }, select: safeSelect }),
        8000
      );
    }

    // Deduplicate by code
    const seenCodes = new Set<string>();
    const deduplicatedCompanies = companies.filter(company => {
      if (seenCodes.has(company.code)) return false;
      seenCodes.add(company.code);
      return true;
    });

    const formattedCompanies = deduplicatedCompanies.map(c => ({
      ...c,
      accountingType: (c as any).accountingType ?? 'FULL',
      loanCount: 0
    }));

    cache.set(cacheKey, formattedCompanies, CacheTTL.LONG);

    return NextResponse.json({ companies: formattedCompanies });
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    // On DB timeout, return empty list so dashboard still loads
    if (error.message?.includes('DB_TIMEOUT')) {
      return NextResponse.json({ companies: [], timedOut: true }, { status: 200 });
    }
    return NextResponse.json({ error: 'Failed to fetch companies', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
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

    // isMirrorCompany MUST be explicitly set to true to enable accounting.
    // Default is FALSE — original/lending companies must NOT get accounting access.
    // Hard rule: any company whose code ends in '3' (e.g. C3) is always the original.
    const codeUpper = companyCode.toUpperCase();
    const resolvedIsMirror =
      codeUpper.endsWith('3') || codeUpper === 'C3'
        ? false                          // force original
        : isMirrorCompany === true;      // only true when EXPLICITLY sent as true

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
        // Mirror settings — use resolved value
        isMirrorCompany: resolvedIsMirror,
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

    fireAudit('system', 'CREATE', 'COMPANY', `Company created: "${company.name}" (Code: ${company.code}, isMirrorCompany: ${company.isMirrorCompany})`);

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

    fireAudit('system', 'UPDATE', 'COMPANY', `Company updated: ID ${id}`, { newValue: updateData });

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
    const force = searchParams.get('force') === 'true';

    if (!id) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    console.log(`[Company DELETE] Force-cascade delete for company: ${id}`);

    // Helper: cascade delete all data for one company ID
    async function cascadeDelete(companyId: string) {
      // ── 1. Deepest loan data ──────────────────────────────────────────────
      await db.eMIReminderLog.deleteMany({}).catch(() => {}); // safe: reminders regenerate
      await db.offlineLoanEMI.deleteMany({ where: { offlineLoan: { companyId } } }).catch(() => {});
      await db.offlineLoan.deleteMany({ where: { companyId } }).catch(() => {});

      // ── 2. Online loan data ───────────────────────────────────────────────
      await db.eMISchedule.deleteMany({ where: { loanApplication: { companyId } } }).catch(() => {});
      await db.payment.deleteMany({ where: { loanApplication: { companyId } } }).catch(() => {});
      await db.loanApplication.deleteMany({ where: { companyId } }).catch(() => {});

      // ── 3. Accounting data ────────────────────────────────────────────────
      await db.journalEntryLine.deleteMany({ where: { journalEntry: { companyId } } }).catch(() => {});
      await db.journalEntry.deleteMany({ where: { companyId } }).catch(() => {});
      await db.ledgerBalance.deleteMany({ where: { account: { companyId } } }).catch(() => {});
      await db.ledgerBalance.deleteMany({ where: { financialYear: { companyId } } }).catch(() => {});
      await db.chartOfAccount.deleteMany({ where: { companyId } }).catch(() => {});
      await db.financialYear.deleteMany({ where: { companyId } }).catch(() => {});
      await db.bankAccount.deleteMany({ where: { companyId } }).catch(() => {});
      await db.ledger.deleteMany({ where: { companyId } }).catch(() => {});
      await db.expense.deleteMany({ where: { companyId } }).catch(() => {});
      await (db as any).cashBookEntry?.deleteMany({ where: { cashBook: { companyId } } }).catch(() => {});
      await (db as any).cashBook?.deleteMany({ where: { companyId } }).catch(() => {});
      await (db as any).equityEntry?.deleteMany({ where: { companyId } }).catch(() => {});
      await (db as any).borrowedMoney?.deleteMany({ where: { companyId } }).catch(() => {});
      await (db as any).investMoney?.deleteMany({ where: { companyId } }).catch(() => {});
      await (db as any).expenseRequest?.deleteMany({ where: { companyId } }).catch(() => {});

      // ── 4. Config data ────────────────────────────────────────────────────
      await db.gSTConfig.deleteMany({ where: { companyId } }).catch(() => {});
      await db.fixedAsset.deleteMany({ where: { companyId } }).catch(() => {});
      await db.commissionSlab.deleteMany({ where: { companyId } }).catch(() => {});
      await db.gracePeriodConfig.deleteMany({ where: { companyId } }).catch(() => {});
      await db.preApprovedOffer.deleteMany({ where: { companyId } }).catch(() => {});
      await db.agentPerformance.deleteMany({ where: { companyId } }).catch(() => {});
      await (db as any).paymentSource?.deleteMany({ where: { companyId } }).catch(() => {});
      await (db as any).companyPaymentPage?.deleteMany({ where: { companyId } }).catch(() => {});
      await (db as any).companyPaymentSettings?.deleteMany({ where: { companyId } }).catch(() => {});
      await (db as any).companyAccountingSettings?.deleteMany({ where: { companyId } }).catch(() => {});

      // ── 5. Users linked to this company ──────────────────────────────────
      // Delete COMPANY-role users; unlink other roles
      await db.user.deleteMany({ where: { companyId, role: 'COMPANY' } }).catch(() => {});
      await db.user.updateMany({ where: { companyId }, data: { companyId: null } }).catch(() => {});

      // ── 6. Delete the company itself ─────────────────────────────────────
      await db.company.delete({ where: { id: companyId } });
    }

    // Special: delete ALL companies
    if (id === '__ALL__') {
      const all = await db.company.findMany({ select: { id: true, name: true } });
      console.log(`[Company DELETE] Deleting ALL ${all.length} companies`);
      for (const c of all) {
        console.log(`  Deleting ${c.name} (${c.id})...`);
        await cascadeDelete(c.id);
      }
      cache.deletePattern('companies:');
      cache.deletePattern('users:');
      return NextResponse.json({ success: true, message: `Deleted ${all.length} companies`, deletedCount: all.length });
    }

    // Single company delete
    const company = await db.company.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    await cascadeDelete(id);

    cache.deletePattern('companies:');
    cache.deletePattern('users:');

    console.log(`[Company DELETE] ✅ Permanently deleted: ${company.name}`);
    fireAudit('system', 'DELETE', 'COMPANY', `Company permanently deleted: "${company.name}" (ID: ${id})`);

    return NextResponse.json({
      success: true,
      message: 'Company and all related data permanently deleted',
      deletedCompanyId: id,
    });
  } catch (error) {
    console.error('[Company DELETE] Error:', error);
    return NextResponse.json({
      error: 'Failed to delete company',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

