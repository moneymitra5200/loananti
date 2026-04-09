import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LoanStatus } from '@prisma/client';

// GET - List all Interest Only Loans
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const loanId = searchParams.get('loanId');

    // Get specific loan details
    if (action === 'details' && loanId) {
      const loan = await db.interestOnlyLoan.findUnique({
        where: { id: loanId },
        include: {
          loanApplication: {
            include: {
              customer: {
                select: { id: true, name: true, email: true, phone: true }
              },
              company: { select: { id: true, name: true } }
            }
          },
          interestPayments: {
            orderBy: { createdAt: 'desc' },
            take: 12
          },
          startedEmiPhaseBy: {
            select: { id: true, name: true }
          }
        }
      });

      if (!loan) {
        return NextResponse.json({ error: 'Interest Only Loan not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, loan });
    }

    // List all interest only loans
    const filter: any = {};
    
    if (searchParams.get('phase')) {
      filter.currentPhase = searchParams.get('phase');
    }
    if (searchParams.get('isActive')) {
      filter.isActive = searchParams.get('isActive') === 'true';
    }

    const loans = await db.interestOnlyLoan.findMany({
      where: filter,
      include: {
        loanApplication: {
          include: {
            customer: {
              select: { id: true, name: true, email: true, phone: true }
            },
            company: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate summary stats
    const stats = {
      totalLoans: loans.length,
      interestOnlyPhase: loans.filter(l => l.currentPhase === 'INTEREST_ONLY').length,
      emiPhase: loans.filter(l => l.currentPhase === 'EMI_PHASE').length,
      totalPrincipal: loans.reduce((sum, l) => sum + l.principalAmount, 0),
      totalInterestCollected: loans.reduce((sum, l) => sum + l.totalInterestPaid, 0),
    };

    return NextResponse.json({ 
      success: true, 
      loans,
      stats
    });

  } catch (error) {
    console.error('Error fetching interest only loans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch interest only loans' },
      { status: 500 }
    );
  }
}

// POST - Create new Interest Only Loan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      principalAmount,
      interestOnlyRate,
      purpose,
      title,
      firstName,
      lastName,
      fatherName,
      panNumber,
      aadhaarNumber,
      dateOfBirth,
      address,
      city,
      state,
      pincode,
      phone,
      employmentType,
      monthlyIncome,
      bankAccountNumber,
      bankIfsc,
      bankName,
      documents,
      userId,
      // Guardian details
      ref1Name,
      ref1Phone,
      ref1Relation,
      ref1Address,
      ref2Name,
      ref2Phone,
      ref2Relation,
      ref2Address,
      creditScore
    } = body;

    // Validate required fields
    if (!customerId || !principalAmount || !interestOnlyRate) {
      return NextResponse.json({
        error: 'Missing required fields: customerId, principalAmount, interestOnlyRate'
      }, { status: 400 });
    }

    // Calculate monthly interest
    const monthlyInterestAmount = (principalAmount * interestOnlyRate) / 100 / 12;

    // Generate application number
    const applicationNo = `IOL${Date.now().toString(36).toUpperCase()}`;

    // Create loan application and interest only loan in transaction
    const result = await db.$transaction(async (tx) => {
      // Create loan application
      const loanApplication = await tx.loanApplication.create({
        data: {
          applicationNo,
          customerId,
          loanType: 'INTEREST_ONLY',
          status: LoanStatus.FINAL_APPROVED, // Auto-approve since it's created by Super Admin
          requestedAmount: principalAmount,
          requestedTenure: 0, // Will be set when EMI phase starts
          requestedInterestRate: interestOnlyRate,
          purpose: purpose || 'Interest Only Loan',
          title,
          firstName,
          lastName,
          fatherName,
          panNumber,
          aadhaarNumber,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          address,
          city,
          state,
          pincode,
          phone,
          employmentType,
          monthlyIncome,
          bankAccountNumber,
          bankIfsc,
          bankName,
          // Guardian details
          reference1Name: ref1Name,
          reference1Phone: ref1Phone,
          reference1Relation: ref1Relation,
          reference1Address: ref1Address,
          reference2Name: ref2Name,
          reference2Phone: ref2Phone,
          reference2Relation: ref2Relation,
          reference2Address: ref2Address,
          // Documents
          panCardDoc: documents?.panCard,
          aadhaarFrontDoc: documents?.aadhaarFront,
          aadhaarBackDoc: documents?.aadhaarBack,
          incomeProofDoc: documents?.incomeProof,
          addressProofDoc: documents?.addressProof,
          photoDoc: documents?.photo,
          electionCardDoc: documents?.electionCard,
          housePhotoDoc: documents?.housePhoto,
        }
      });

      // Create interest only loan
      const interestOnlyLoan = await tx.interestOnlyLoan.create({
        data: {
          loanApplicationId: loanApplication.id,
          principalAmount,
          interestRate: interestOnlyRate,
          interestOnlyRate,
          monthlyInterestAmount,
          startDate: new Date(),
          interestOnlyStartDate: new Date(),
          nextPaymentDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        }
      });

      // Create first month's interest payment record
      await tx.interestOnlyPayment.create({
        data: {
          interestOnlyLoanId: interestOnlyLoan.id,
          paymentMonth: new Date().getMonth() + 1,
          paymentYear: new Date().getFullYear(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          interestAmount: monthlyInterestAmount,
        }
      });

      // Create loan form with credit score
      await tx.loanForm.create({
        data: {
          loanApplicationId: loanApplication.id,
          riskScore: creditScore ? Math.round((900 - creditScore) / 6) : 0, // Convert credit score to risk score
          internalRemarks: `Credit Score: ${creditScore || 'Not provided'}`,
        }
      });

      // Create workflow log
      await tx.workflowLog.create({
        data: {
          loanApplicationId: loanApplication.id,
          actionById: userId || 'system',
          previousStatus: null,
          newStatus: LoanStatus.FINAL_APPROVED,
          action: 'CREATE_INTEREST_ONLY_LOAN',
          remarks: 'Interest Only Loan application created and approved'
        }
      });

      return { loanApplication, interestOnlyLoan };
    });

    return NextResponse.json({
      success: true,
      message: 'Interest Only Loan created successfully',
      loan: result.loanApplication,
      interestOnlyLoan: result.interestOnlyLoan
    });

  } catch (error) {
    console.error('Error creating interest only loan:', error);
    return NextResponse.json(
      { error: 'Failed to create interest only loan', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT - Update Interest Only Loan (Start EMI Phase)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      action,
      interestLoanId,
      emiInterestRate,
      emiTenureMonths,
      userId
    } = body;

    // Start EMI Phase
    if (action === 'start_emi_phase') {
      if (!interestLoanId || !emiInterestRate || !emiTenureMonths) {
        return NextResponse.json({
          error: 'Missing required fields: interestLoanId, emiInterestRate, emiTenureMonths'
        }, { status: 400 });
      }

      const interestLoan = await db.interestOnlyLoan.findUnique({
        where: { id: interestLoanId },
        include: { loanApplication: true }
      });

      if (!interestLoan) {
        return NextResponse.json({ error: 'Interest Only Loan not found' }, { status: 404 });
      }

      if (interestLoan.currentPhase !== 'INTEREST_ONLY') {
        return NextResponse.json({ error: 'Loan is not in Interest Only phase' }, { status: 400 });
      }

      // Calculate EMI
      const P = interestLoan.principalAmount;
      const r = emiInterestRate / 100 / 12; // Monthly interest rate
      const n = emiTenureMonths;
      
      // EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
      const emiAmount = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
      const totalAmount = emiAmount * n;
      const totalInterest = totalAmount - P;

      const result = await db.$transaction(async (tx) => {
        // Update interest only loan
        const updated = await tx.interestOnlyLoan.update({
          where: { id: interestLoanId },
          data: {
            currentPhase: 'EMI_PHASE',
            emiInterestRate,
            emiTenureMonths,
            emiAmount,
            totalInterestInEmiPhase: totalInterest,
            totalAmountInEmiPhase: totalAmount,
            emiPhaseStartDate: new Date(),
            interestOnlyEndDate: new Date(),
            startedEmiPhase: true,
            startedEmiPhaseById: userId,
            startedEmiPhaseAt: new Date()
          }
        });

        // Update loan application
        await tx.loanApplication.update({
          where: { id: interestLoan.loanApplicationId },
          data: {
            tenure: emiTenureMonths,
            interestRate: emiInterestRate,
            emiAmount,
            loanAmount: interestLoan.principalAmount,
            status: LoanStatus.ACTIVE
          }
        });

        // Create EMI schedules
        const emiSchedules: any[] = [];
        let dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 1);
        dueDate.setDate(5); // Set due date to 5th of each month

        for (let i = 1; i <= n; i++) {
          const principalComponent = P * r * Math.pow(1 + r, i - 1) / (Math.pow(1 + r, n) - 1);
          const interestComponent = emiAmount - principalComponent;

          const schedule = await tx.eMISchedule.create({
            data: {
              loanApplicationId: interestLoan.loanApplicationId,
              installmentNumber: i,
              dueDate: new Date(dueDate),
              originalDueDate: new Date(dueDate),
              principalAmount: principalComponent,
              interestAmount: interestComponent,
              totalAmount: emiAmount,
              outstandingPrincipal: principalComponent,
              outstandingInterest: interestComponent,
              paymentStatus: 'PENDING'
            }
          });
          emiSchedules.push(schedule);

          // Move to next month
          dueDate.setMonth(dueDate.getMonth() + 1);
        }

        // Create workflow log
        await tx.workflowLog.create({
          data: {
            loanApplicationId: interestLoan.loanApplicationId,
            actionById: userId || 'system',
            previousStatus: LoanStatus.FINAL_APPROVED,
            newStatus: LoanStatus.ACTIVE,
            action: 'START_EMI_PHASE',
            remarks: `EMI Phase started. EMI: ${emiAmount.toFixed(2)}, Tenure: ${emiTenureMonths} months`
          }
        });

        return { updated, emiSchedules };
      });

      return NextResponse.json({
        success: true,
        message: 'EMI Phase started successfully',
        emiAmount,
        totalInterest,
        totalAmount,
        emiSchedulesCreated: result.emiSchedules.length
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error updating interest only loan:', error);
    return NextResponse.json(
      { error: 'Failed to update interest only loan', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE - Delete Interest Only Loan
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');

    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    await db.interestOnlyLoan.delete({
      where: { id: loanId }
    });

    return NextResponse.json({ success: true, message: 'Interest Only Loan deleted' });

  } catch (error) {
    console.error('Error deleting interest only loan:', error);
    return NextResponse.json(
      { error: 'Failed to delete interest only loan' },
      { status: 500 }
    );
  }
}
