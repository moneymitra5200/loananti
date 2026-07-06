import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT handler to update user profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...updateData } = body;

    // If userId is not provided in body, try to get from query params
    const targetUserId = userId || new URL(request.url).searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prepare the update object with only allowed fields
    const allowedFields = [
      'name', 'phone', 'profilePicture', 
      'address', 'city', 'state', 'pincode',
      'panNumber', 'aadhaarNumber', 'dateOfBirth',
      'employmentType', 'monthlyIncome', 
      'bankName', 'bankAccountNumber', 'bankIfsc'
    ];

    const dataToUpdate: any = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        dataToUpdate[field] = updateData[field];
      }
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update the user
    const updatedUser = await db.user.update({
      where: { id: targetUserId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profilePicture: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        panNumber: true,
        aadhaarNumber: true,
        dateOfBirth: true,
        employmentType: true,
        monthlyIncome: true,
        bankName: true,
        bankAccountNumber: true,
        bankIfsc: true,
        companyId: true,
        agentId: true,
        company: {
          select: { id: true, name: true, code: true, isMirrorCompany: true }
        },
        agent: {
          select: { id: true, name: true, agentCode: true }
        },
        agentCode: true,
        staffCode: true,
        cashierCode: true,
        accountantCode: true,
        isActive: true,
        isLocked: true
      }
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating user details:', error);
    return NextResponse.json({ 
      error: 'Failed to update user details',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (userId.startsWith('offline_')) {
      const phone = userId.replace('offline_', '');
      let offlineLoans = await db.offlineLoan.findMany({
        where: {
          OR: [
            { customerPhone: phone },
            { customerPhone: { contains: phone } }
          ],
          isMirrorLoan: false
        },
        include: {
          emis: true,
          company: { select: { id: true, name: true, code: true } }
        }
      });
      
      if (offlineLoans.length === 0) {
        // Fallback: search by clean phone
        const allLoans = await db.offlineLoan.findMany({
          where: { isMirrorLoan: false },
          include: {
            emis: true,
            company: { select: { id: true, name: true, code: true } }
          }
        });
        const targetClean = phone.replace(/[^0-9]/g, '');
        offlineLoans = allLoans.filter(l => 
          l.customerPhone.replace(/[^0-9]/g, '') === targetClean
        );
      }
      
      if (offlineLoans.length === 0) {
        return NextResponse.json({ error: 'Offline customer not found' }, { status: 404 });
      }
      
      const primaryLoan = offlineLoans[0];
      const user = {
        id: userId,
        name: primaryLoan.customerName,
        email: primaryLoan.customerEmail || `${primaryLoan.customerPhone}@offline.loan`,
        phone: primaryLoan.customerPhone,
        role: 'CUSTOMER',
        isActive: offlineLoans.some(l => l.status !== 'CLOSED'),
        isLocked: false,
        createdAt: primaryLoan.createdAt.toISOString(),
        lastLoginAt: null,
        lastActivityAt: null,
        panNumber: primaryLoan.customerPan || 'N/A',
        aadhaarNumber: primaryLoan.customerAadhaar || 'N/A',
        dateOfBirth: primaryLoan.customerDOB ? primaryLoan.customerDOB.toISOString() : null,
        address: primaryLoan.customerAddress || 'N/A',
        city: primaryLoan.customerCity || 'N/A',
        state: primaryLoan.customerState || 'N/A',
        pincode: primaryLoan.customerPincode || 'N/A',
        employmentType: primaryLoan.customerOccupation || 'N/A',
        monthlyIncome: primaryLoan.customerMonthlyIncome || 0,
        bankName: 'N/A',
        bankAccountNumber: 'N/A',
        companyId: primaryLoan.companyId,
        company: primaryLoan.company,
        isOffline: true,
        roleSpecificData: {
          totalLoans: offlineLoans.length,
          activeLoans: offlineLoans.filter(l => l.status !== 'CLOSED').length,
          emiSchedules: offlineLoans.reduce((sum, l) => sum + l.emis.length, 0),
          payments: offlineLoans.reduce((sum, l) => sum + l.emis.filter(e => e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID').length, 0),
          offlineLoans: offlineLoans.map(l => ({
            id: l.id,
            loanNumber: l.loanNumber,
            loanAmount: l.loanAmount,
            interestRate: l.interestRate,
            tenure: l.tenure,
            emiAmount: l.emiAmount,
            status: l.status,
            disbursementDate: l.disbursementDate.toISOString(),
            createdAt: l.createdAt.toISOString(),
            isInterestOnlyLoan: l.isInterestOnlyLoan,
            interestOnlyMonthlyAmount: l.interestOnlyMonthlyAmount,
            totalInterestPaid: l.totalInterestPaid,
            reference1Name: l.reference1Name,
            reference1Phone: l.reference1Phone,
            reference1Relation: l.reference1Relation,
            reference2Name: l.reference2Name,
            reference2Phone: l.reference2Phone,
            reference2Relation: l.reference2Relation,
            panCardDoc: l.panCardDoc,
            aadhaarFrontDoc: l.aadhaarFrontDoc,
            aadhaarBackDoc: l.aadhaarBackDoc,
            incomeProofDoc: l.incomeProofDoc,
            addressProofDoc: l.addressProofDoc,
            photoDoc: l.photoDoc,
            electionCardDoc: l.electionCardDoc,
            housePhotoDoc: l.housePhotoDoc,
            guarantorPhotoDoc: l.guarantorPhotoDoc,
            passbookPhotoDoc: l.passbookPhotoDoc,
            otherDocs: l.otherDocs
          }))
        },
        loanAnalytics: {
          totalLoanAmount: offlineLoans.reduce((sum, l) => sum + l.loanAmount, 0),
          disbursedLoanAmount: offlineLoans.reduce((sum, l) => sum + l.loanAmount, 0),
          avgLoanAmount: offlineLoans.reduce((sum, l) => sum + l.loanAmount, 0) / offlineLoans.length,
          approvalRate: '100',
          totalPaidAmount: offlineLoans.reduce((sum, l) => sum + l.emis.reduce((s, e) => s + e.paidAmount, 0) + (l.totalInterestPaid || 0), 0),
          outstandingAmount: offlineLoans.reduce((sum, l) => {
            let outstanding = l.emis
              .filter(e => e.paymentStatus !== 'PAID')
              .reduce((s, e) => s + (e.totalAmount - e.paidAmount), 0);
            if (l.isInterestOnlyLoan || l.status === 'INTEREST_ONLY') {
              outstanding = l.loanAmount || 0;
            }
            return sum + outstanding;
          }, 0),
          overdueEMIs: offlineLoans.reduce((sum, l) => sum + l.emis.filter(e => e.paymentStatus === 'OVERDUE').length, 0),
          loanStatusDistribution: offlineLoans.reduce((acc: any, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {}),
          recentPayments: offlineLoans.flatMap(l => l.emis.filter(e => e.paidAmount > 0).map(e => ({
            amount: e.paidAmount,
            paymentMode: e.paymentMode || 'N/A',
            status: e.paymentStatus === 'PAID' ? 'COMPLETED' : e.paymentStatus,
            createdAt: (e.paidDate || e.updatedAt).toISOString()
          }))).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10)
        }
      };
      
      return NextResponse.json({ success: true, user });
    }

    // Fetch user with all related data
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isLocked: true,
        createdAt: true,
        lastLoginAt: true,
        lastActivityAt: true,
        
        // Codes
        agentCode: true,
        staffCode: true,
        cashierCode: true,
        accountantCode: true,
        
        // Credits
        companyCredit: true,
        personalCredit: true,
        credit: true,
        
        // Personal Info
        panNumber: true,
        aadhaarNumber: true,
        dateOfBirth: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        
        // Employment
        employmentType: true,
        monthlyIncome: true,
        bankName: true,
        bankAccountNumber: true,
        
        // Relations
        companyId: true,
        agentId: true,
        company: {
          select: { id: true, name: true, code: true, isMirrorCompany: true }
        },
        agent: {
          select: { id: true, name: true, agentCode: true }
        },
        
        // Counts of related data
        _count: {
          select: {
            loanApplications: true,
            disbursedLoans: true,
            payments: true,
            auditLogs: true,
            notifications: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch role-specific data
    let roleSpecificData: any = {};

    if (user.role === 'COMPANY') {
      // Get agents under this company
      const companyAgents = await db.user.count({
        where: { companyId: user.companyId, role: 'AGENT' }
      });
      
      // Get loans for this company
      const companyLoans = await db.loanApplication.count({
        where: { companyId: user.companyId }
      });
      
      // Get company's active loans
      const activeCompanyLoans = await db.loanApplication.count({
        where: { companyId: user.companyId, status: { in: ['ACTIVE', 'DISBURSED'] } }
      });
      
      roleSpecificData = {
        agentsCount: companyAgents,
        totalLoans: companyLoans,
        activeLoans: activeCompanyLoans
      };
    }

    if (user.role === 'AGENT') {
      // Get staff under this agent
      const staffCount = await db.user.count({
        where: { agentId: user.id, role: 'STAFF' }
      });
      
      // Get loans processed by this agent
      const processedLoans = await db.loanApplication.count({
        where: { currentHandlerId: user.id }
      });
      
      // Get session forms created by this agent
      const sessionsCreated = await db.sessionForm.count({
        where: { agentId: user.id }
      });
      
      // Get active loans disbursed through this agent
      const activeLoans = await db.loanApplication.count({
        where: { disbursedById: user.id, status: { in: ['ACTIVE', 'DISBURSED'] } }
      });
      
      roleSpecificData = {
        staffCount,
        processedLoans,
        sessionsCreated,
        activeLoans
      };
    }

    if (user.role === 'STAFF') {
      // Get loans verified by this staff
      const verifiedLoans = await db.loanForm.count({
        where: { verifiedById: user.id }
      });
      
      // Get location logs
      const locationLogs = await db.locationLog.count({
        where: { userId: user.id }
      });
      
      roleSpecificData = {
        verifiedLoans,
        locationLogs
      };
    }

    if (user.role === 'CASHIER') {
      // Get payments processed
      const paymentsProcessed = await db.payment.count({
        where: { cashierId: user.id }
      });
      
      // Get loans disbursed
      const loansDisbursed = await db.loanApplication.count({
        where: { disbursedById: user.id }
      });
      
      roleSpecificData = {
        paymentsProcessed,
        loansDisbursed
      };
    }

    if (user.role === 'CUSTOMER') {
      // Get customer's loan applications
      const loanApplications = await db.loanApplication.findMany({
        where: { customerId: user.id },
        select: {
          id: true,
          applicationNo: true,
          status: true,
          requestedAmount: true,
          loanType: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      
      // Get EMI schedules
      const emiSchedules = await db.eMISchedule.count({
        where: { loanApplication: { customerId: user.id } }
      });
      
      // Get payments made
      const payments = await db.payment.count({
        where: { customerId: user.id }
      });
      
      roleSpecificData = {
        loanApplications,
        totalLoans: loanApplications.length,
        emiSchedules,
        payments
      };
    }

    // Get recent activity logs for this user
    const recentActivity = await db.auditLog.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        action: true,
        module: true,
        description: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        roleSpecificData,
        recentActivity
      }
    });

  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch user details',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
