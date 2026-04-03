import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch comprehensive loan details (OPTIMIZED)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    const minimal = searchParams.get('minimal') === 'true'; // For faster refresh

    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    // Minimal mode - just get EMI schedules for quick refresh
    if (minimal) {
      const [loan, emiSchedules] = await Promise.all([
        db.loanApplication.findUnique({
          where: { id: loanId },
          select: {
            id: true,
            applicationNo: true,
            status: true,
            loanType: true,
            isInterestOnlyLoan: true,
            customerId: true,
            companyId: true,
            customer: { select: { id: true, name: true, phone: true } },
            company: { select: { id: true, name: true, code: true } },
            sessionForm: { select: { approvedAmount: true, emiAmount: true, tenure: true, interestRate: true, interestType: true } }
          }
        }),
        db.eMISchedule.findMany({
          where: { loanApplicationId: loanId },
          orderBy: { installmentNumber: 'asc' },
          select: {
            id: true,
            installmentNumber: true,
            dueDate: true,
            principalAmount: true,
            interestAmount: true,
            totalAmount: true,
            outstandingPrincipal: true,
            paymentStatus: true,
            paidAmount: true,
            paidDate: true,
            paymentMode: true,
            paymentReference: true,
            proofUrl: true,
            penaltyAmount: true,
            isInterestOnly: true,
            principalDeferred: true,
            notes: true
          }
        })
      ]);

      if (!loan) {
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
      }

      const duration = Date.now() - startTime;
      console.log(`[Loan Details] Minimal fetch completed in ${duration}ms`);

      return NextResponse.json({
        success: true,
        loan: { ...loan, emiSchedules },
        emiSummary: {
          totalEMIs: emiSchedules.length,
          paidEMIs: emiSchedules.filter(s => s.paymentStatus === 'PAID' || s.paymentStatus === 'INTEREST_ONLY_PAID').length,
          interestOnlyPaid: emiSchedules.filter(s => s.paymentStatus === 'INTEREST_ONLY_PAID').length,
          totalAmount: emiSchedules.reduce((sum, s) => sum + s.totalAmount, 0),
          totalPaid: emiSchedules.reduce((sum, s) => sum + (s.paidAmount || 0), 0)
        }
      });
    }

    // Full mode - get all details
    const loan = await db.loanApplication.findUnique({
      where: { id: loanId },
      select: {
        id: true,
        applicationNo: true,
        status: true,
        requestedAmount: true,
        loanType: true,
        isInterestOnlyLoan: true,
        createdAt: true,
        submittedAt: true,
        saApprovedAt: true,
        companyApprovedAt: true,
        agentApprovedAt: true,
        loanFormCompletedAt: true,
        sessionCreatedAt: true,
        customerApprovedAt: true,
        finalApprovedAt: true,
        disbursedAt: true,
        customerId: true,
        companyId: true,
        disbursedById: true,
        rejectedById: true,
        rejectionReason: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            panNumber: true,
            aadhaarNumber: true,
            dateOfBirth: true,
            address: true,
            city: true,
            state: true,
            pincode: true,
            employmentType: true,
            monthlyIncome: true,
            bankAccountNumber: true,
            bankIfsc: true,
            bankName: true
          }
        },
        company: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            city: true,
            state: true,
            contactEmail: true,
            contactPhone: true
          }
        },
        loanForm: true,
        sessionForm: {
          select: {
            id: true,
            approvedAmount: true,
            interestRate: true,
            interestType: true,
            tenure: true,
            emiAmount: true,
            totalInterest: true,
            totalAmount: true,
            processingFee: true,
            agent: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        workflowLogs: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            action: true,
            previousStatus: true,
            newStatus: true,
            remarks: true,
            createdAt: true,
            actionBy: {
              select: { id: true, name: true, email: true, role: true }
            }
          }
        },
        emiSchedules: {
          orderBy: { installmentNumber: 'asc' }
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            amount: true,
            paymentMode: true,
            status: true,
            createdAt: true,
            cashier: { select: { id: true, name: true } }
          }
        },
        disbursedBy: { select: { id: true, name: true, email: true } },
        rejectedBy: { select: { id: true, name: true, email: true } },
        goldLoanDetail: true,
        vehicleLoanDetail: true
      }
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Calculate EMI summary - include INTEREST_ONLY_PAID in paid count
    const emiSummary = {
      totalEMIs: loan.emiSchedules.length,
      paidEMIs: loan.emiSchedules.filter(s => s.paymentStatus === 'PAID' || s.paymentStatus === 'INTEREST_ONLY_PAID').length,
      interestOnlyPaid: loan.emiSchedules.filter(s => s.paymentStatus === 'INTEREST_ONLY_PAID').length,
      pendingEMIs: loan.emiSchedules.filter(s => s.paymentStatus === 'PENDING').length,
      overdueEMIs: loan.emiSchedules.filter(s => s.paymentStatus === 'OVERDUE').length,
      partiallyPaid: loan.emiSchedules.filter(s => s.paymentStatus === 'PARTIALLY_PAID').length,
      totalAmount: loan.emiSchedules.reduce((sum, s) => sum + s.totalAmount, 0),
      totalPaid: loan.emiSchedules.reduce((sum, s) => sum + (s.paidAmount || 0), 0),
      totalPenalty: loan.emiSchedules.reduce((sum, s) => sum + (s.penaltyAmount || 0), 0),
      nextDueDate: null as Date | null,
      nextDueAmount: 0
    };

    // Find next pending EMI (exclude both PAID and INTEREST_ONLY_PAID)
    const nextPending = loan.emiSchedules.find(s => s.paymentStatus !== 'PAID' && s.paymentStatus !== 'INTEREST_ONLY_PAID');
    if (nextPending) {
      emiSummary.nextDueDate = nextPending.dueDate;
      emiSummary.nextDueAmount = nextPending.totalAmount - (nextPending.paidAmount || 0);
    }

    const workflowPipeline = buildWorkflowPipeline(loan.workflowLogs, loan);

    const duration = Date.now() - startTime;
    console.log(`[Loan Details] Full fetch completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      loan,
      emiSummary,
      workflowPipeline
    });
  } catch (error) {
    console.error('Loan details fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch loan details' }, { status: 500 });
  }
}

function buildWorkflowPipeline(workflowLogs: any[], loan: any) {
  const stages = [
    { status: 'SUBMITTED', label: 'Application Submitted', role: 'Customer', timestamp: loan.submittedAt || loan.createdAt },
    { status: 'SA_APPROVED', label: 'Super Admin Approved', role: 'SUPER_ADMIN', timestamp: loan.saApprovedAt },
    { status: 'COMPANY_APPROVED', label: 'Company Approved', role: 'COMPANY', timestamp: loan.companyApprovedAt },
    { status: 'AGENT_APPROVED_STAGE1', label: 'Agent Approved', role: 'AGENT', timestamp: loan.agentApprovedAt },
    { status: 'LOAN_FORM_COMPLETED', label: 'Form Completed', role: 'STAFF', timestamp: loan.loanFormCompletedAt },
    { status: 'SESSION_CREATED', label: 'Sanction Created', role: 'AGENT', timestamp: loan.sessionCreatedAt },
    { status: 'CUSTOMER_SESSION_APPROVED', label: 'Customer Approved', role: 'CUSTOMER', timestamp: loan.customerApprovedAt },
    { status: 'FINAL_APPROVED', label: 'Final Approved', role: 'SUPER_ADMIN', timestamp: loan.finalApprovedAt },
    { status: 'ACTIVE', label: 'Disbursed', role: 'CASHIER', timestamp: loan.disbursedAt }
  ];

  const currentStatusIndex = stages.findIndex(s => s.status === loan.status);

  return stages.map((stage, index) => {
    const log = workflowLogs.find(l => l.newStatus === stage.status);
    const isCompleted = index <= currentStatusIndex || (loan.status.startsWith('REJECTED') && stage.status === loan.status);
    const isCurrent = stage.status === loan.status;

    return {
      ...stage,
      isCompleted,
      isCurrent,
      actionBy: log?.actionBy || null,
      remarks: log?.remarks || null,
      timestamp: log?.createdAt || stage.timestamp
    };
  });
}
