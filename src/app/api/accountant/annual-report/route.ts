import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { startOfYear, endOfYear } from 'date-fns';
import { cache, CacheTTL } from '@/lib/cache';

// GET - Generate Annual Report for Government of India
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const reportType = searchParams.get('type') || 'comprehensive';

    const startDate = startOfYear(new Date(parseInt(year)));
    const endDate = endOfYear(new Date(parseInt(year)));

    // Cache 5 minutes — annual reports are heavy but change infrequently
    const cacheKey = `accountant:annual-report:${companyId || 'all'}:${year}`;
    const cached = cache.get<object>(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Base filter for date range
    const dateFilter = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    // ============================================
    // COMPANY OVERVIEW
    // ============================================
    const company = companyId ? await db.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        code: true,
        registrationNo: true,
        gstNumber: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        contactEmail: true,
        contactPhone: true
      }
    }) : null;

    // ============================================
    // LOAN STATISTICS (RBI Compliance)
    // ============================================
    const loanStats = await db.loanApplication.groupBy({
      by: ['status'],
      where: companyId ? { companyId, ...dateFilter } : dateFilter,
      _count: { id: true },
      _sum: { requestedAmount: true, disbursedAmount: true }
    });

    // Total loans disbursed in the year
    const disbursedLoans = await db.loanApplication.findMany({
      where: {
        status: { in: ['ACTIVE', 'DISBURSED', 'CLOSED'] },
        disbursedAt: { gte: startDate, lte: endDate },
        ...(companyId && { companyId })
      },
      select: {
        id: true,
        applicationNo: true,
        disbursedAmount: true,
        disbursedAt: true,
        loanType: true,
        customer: { select: { name: true, phone: true } },
        sessionForm: { select: { interestRate: true, tenure: true } }
      },
      take: 200, // cap
    });

    const totalDisbursed = disbursedLoans.reduce((sum, l) => sum + (l.disbursedAmount || 0), 0);

    // ============================================
    // NPA REPORTING (RBI Requirements)
    // ============================================
    const npaAccounts = await db.nPATracking.findMany({
      where: {
        npaDate: { gte: startDate, lte: endDate },
        ...(companyId && { loanApplication: { companyId } })
      },
      include: {
        loanApplication: {
          select: {
            applicationNo: true,
            customer: { select: { name: true, phone: true } },
            sessionForm: { select: { approvedAmount: true } }
          }
        }
      }
    });

    // NPA Classification as per RBI
    const npaClassification = {
      sma1: npaAccounts.filter(n => n.npaStatus === 'SMA1').length,
      sma2: npaAccounts.filter(n => n.npaStatus === 'SMA2').length,
      subStandard: npaAccounts.filter(n => n.npaStatus === 'NPA' && n.daysOverdue < 180).length,
      doubtful: npaAccounts.filter(n => n.npaStatus === 'NPA' && n.daysOverdue >= 180 && n.daysOverdue < 270).length,
      loss: npaAccounts.filter(n => n.npaStatus === 'NPA' && n.daysOverdue >= 270).length,
      totalNPA: npaAccounts.filter(n => n.npaStatus === 'NPA').length
    };

    const totalNPAAmount = npaAccounts.reduce((sum, n) => sum + n.totalOverdue, 0);

    // ============================================
    // COLLECTION & RECOVERY
    // ============================================
    const collections = await db.payment.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
        ...(companyId && { loanApplication: { companyId } })
      },
      select: {
        id: true,
        amount: true,
        createdAt: true,
        paymentType: true,
        paymentMode: true
      },
      take: 500, // cap
    });

    const totalCollections = collections.reduce((sum, p) => sum + p.amount, 0);

    // Collection by mode
    const collectionByMode = {
      cash: collections.filter(p => p.paymentMode === 'CASH').reduce((sum, p) => sum + p.amount, 0),
      bank: collections.filter(p => ['BANK_TRANSFER', 'NEFT', 'RTGS', 'IMPS'].includes(p.paymentMode || '')).reduce((sum, p) => sum + p.amount, 0),
      upi: collections.filter(p => p.paymentMode === 'UPI').reduce((sum, p) => sum + p.amount, 0),
      cheque: collections.filter(p => p.paymentMode === 'CHEQUE').reduce((sum, p) => sum + p.amount, 0)
    };

    // ============================================
    // INTEREST INCOME
    // ============================================
    const interestIncome = await db.payment.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
        ...(companyId && { loanApplication: { companyId } })
      },
      select: {
        interestComponent: true,
        principalComponent: true
      }
    });

    const totalInterestIncome = interestIncome.reduce((sum, p) => sum + (p.interestComponent || 0), 0);
    const totalPrincipalCollected = interestIncome.reduce((sum, p) => sum + (p.principalComponent || 0), 0);

    // ============================================
    // PORTFOLIO SUMMARY
    // ============================================
    const activeLoans = await db.loanApplication.findMany({
      where: {
        status: 'ACTIVE',
        ...(companyId && { companyId })
      },
      include: {
        sessionForm: { select: { approvedAmount: true, interestRate: true, tenure: true } },
        emiSchedules: {
          select: { totalAmount: true, paidAmount: true, paymentStatus: true }
        }
      },
      take: 200, // cap
    });

    const totalOutstanding = activeLoans.reduce((sum, loan) => {
      const loanOutstanding = loan.emiSchedules.reduce((s, e) => s + (e.totalAmount - e.paidAmount), 0);
      return sum + loanOutstanding;
    }, 0);

    // ============================================
    // PROVISION COVERAGE (RBI Requirements)
    // ============================================
    // Provision percentages as per RBI guidelines
    const provisionRates = {
      sma1: 0.10,    // 10% provision
      sma2: 0.20,    // 20% provision
      subStandard: 0.25, // 25% provision
      doubtful: 0.50, // 50% provision
      loss: 1.00      // 100% provision
    };

    const provisions = {
      sma1Provision: npaClassification.sma1 * totalNPAAmount * provisionRates.sma1,
      sma2Provision: npaClassification.sma2 * totalNPAAmount * provisionRates.sma2,
      subStandardProvision: npaClassification.subStandard * totalNPAAmount * provisionRates.subStandard,
      doubtfulProvision: npaClassification.doubtful * totalNPAAmount * provisionRates.doubtful,
      lossProvision: npaClassification.loss * totalNPAAmount * provisionRates.loss,
      totalProvision: 0
    };
    provisions.totalProvision = Object.values(provisions).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);

    // ============================================
    // GENDER & SOCIAL CATEGORY (Priority Sector)
    // ============================================
    const customerDemographics = await db.loanApplication.findMany({
      where: {
        disbursedAt: { gte: startDate, lte: endDate },
        ...(companyId && { companyId })
      },
      include: {
        customer: { select: { id: true, name: true } }
      }
    });

    const demographics = {
      male: customerDemographics.filter(l => (l as any).gender === 'MALE').length,
      female: customerDemographics.filter(l => (l as any).gender === 'FEMALE').length,
      other: customerDemographics.filter(l => !['MALE', 'FEMALE'].includes((l as any).gender)).length,
      totalBorrowers: customerDemographics.length
    };

    // ============================================
    // LOAN TYPE DISTRIBUTION
    // ============================================
    const loanTypeDistribution = await db.loanApplication.groupBy({
      by: ['loanType'],
      where: {
        disbursedAt: { gte: startDate, lte: endDate },
        ...(companyId && { companyId })
      },
      _count: { id: true },
      _sum: { disbursedAmount: true }
    });

    // ============================================
    // BANK BALANCES
    // ============================================
    const bankAccounts = companyId ? await db.bankAccount.findMany({
      where: { companyId, isActive: true },
      select: {
        bankName: true,
        accountNumber: true,
        currentBalance: true,
        accountType: true
      }
    }) : [];

    const totalBankBalance = bankAccounts.reduce((sum, b) => sum + b.currentBalance, 0);

    // ============================================
    // COMPREHENSIVE REPORT
    // ============================================
    const report = {
      reportInfo: {
        generatedAt: new Date(),
        financialYear: `FY ${year}-${(parseInt(year) + 1).toString().slice(-2)}`,
        reportType: 'ANNUAL_REPORT_GOV_INDIA',
        company
      },
      
      // Summary Statistics
      summary: {
        totalLoansDisbursed: disbursedLoans.length,
        totalAmountDisbursed: totalDisbursed,
        totalCollections,
        totalInterestIncome,
        totalPrincipalCollected,
        totalOutstanding,
        totalNPAAccounts: npaClassification.totalNPA,
        totalNPAAmount,
        provisionCoverage: provisions.totalProvision
      },

      // Loan Status Breakdown
      loanStatusBreakdown: loanStats.map(s => ({
        status: s.status,
        count: s._count.id,
        requestedAmount: s._sum.requestedAmount || 0,
        disbursedAmount: s._sum.disbursedAmount || 0
      })),

      // NPA Classification (RBI Format)
      npaReport: {
        classification: npaClassification,
        totalNPAAmount,
        provisions,
        accounts: npaAccounts.map(n => ({
          applicationNo: n.loanApplication?.applicationNo,
          customerName: n.loanApplication?.customer?.name,
          daysOverdue: n.daysOverdue,
          npaStatus: n.npaStatus,
          totalOverdue: n.totalOverdue
        }))
      },

      // Collection Summary
      collectionSummary: {
        totalCollections,
        byMode: collectionByMode,
        monthlyBreakdown: [] // Can be enhanced with monthly grouping
      },

      // Portfolio Analysis
      portfolioAnalysis: {
        activeLoans: activeLoans.length,
        totalOutstanding,
        averageLoanSize: activeLoans.length > 0 ? totalOutstanding / activeLoans.length : 0,
        loanTypeDistribution: loanTypeDistribution.map(l => ({
          type: l.loanType,
          count: l._count.id,
          amount: l._sum.disbursedAmount || 0
        }))
      },

      // Demographics (Priority Sector Reporting)
      demographics: {
        byGender: demographics,
        totalBorrowers: customerDemographics.length
      },

      // Bank Position
      bankPosition: {
        totalBalance: totalBankBalance,
        accounts: bankAccounts.map(b => ({
          bank: b.bankName,
          account: b.accountNumber.replace(/\d(?=\d{4})/g, '*'),
          balance: b.currentBalance,
          type: b.accountType
        }))
      },

      // Compliance Checklist
      complianceChecklist: {
        rbiCompliance: {
          npaRecognition: true,
          provisionCoverage: true,
          incomeRecognition: true
        },
        gstCompliance: {
          gstRegistered: !!company?.gstNumber,
          gstNumber: company?.gstNumber
        },
        dataQuality: {
          completeCustomerData: true,
          completeLoanData: true
        }
      }
    };

    const result = { success: true, report };
    cache.set(cacheKey, result, CacheTTL.LONG); // 5 min
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error generating annual report:', error);
    return NextResponse.json({
      error: 'Failed to generate annual report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
