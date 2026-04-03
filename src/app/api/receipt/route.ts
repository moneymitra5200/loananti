import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper function to generate sequential receipt number
async function generateReceiptNumber(companyCode: string): Promise<string> {
  const lastPayment = await db.payment.findFirst({
    where: {
      receiptNumber: { startsWith: `RCP-${companyCode}-` }
    },
    orderBy: { createdAt: 'desc' },
    select: { receiptNumber: true }
  });
  
  let nextNumber = 1;
  if (lastPayment?.receiptNumber) {
    const parts = lastPayment.receiptNumber.split('-');
    const lastNumber = parseInt(parts[parts.length - 1] || '0', 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }
  
  return `RCP-${companyCode}-${nextNumber}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const emiScheduleId = searchParams.get('emiScheduleId');
    const paymentId = searchParams.get('paymentId');

    if (!emiScheduleId && !paymentId) {
      return NextResponse.json({ error: 'EMI Schedule ID or Payment ID is required' }, { status: 400 });
    }

    let payment;
    
    if (paymentId) {
      payment = await db.payment.findUnique({
        where: { id: paymentId },
        include: {
          emiSchedule: {
            include: {
              loanApplication: {
                include: {
                  company: true,
                  customer: {
                    select: {
                      id: true,
                      name: true,
                      phone: true,
                      address: true,
                      city: true,
                      state: true,
                      pincode: true
                    }
                  },
                  sessionForm: {
                    include: {
                      agent: {
                        select: { id: true, name: true, email: true }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
    } else if (emiScheduleId) {
      // First try to find payment with receipt generated
      payment = await db.payment.findFirst({
        where: { 
          emiScheduleId,
          receiptGenerated: true 
        },
        include: {
          emiSchedule: {
            include: {
              loanApplication: {
                include: {
                  company: true,
                  customer: {
                    select: {
                      id: true,
                      name: true,
                      phone: true,
                      address: true,
                      city: true,
                      state: true,
                      pincode: true
                    }
                  },
                  sessionForm: {
                    include: {
                      agent: {
                        select: { id: true, name: true, email: true }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // If no receipt found, check if EMI is paid and generate receipt on the fly
      if (!payment) {
        const emi = await db.eMISchedule.findUnique({
          where: { id: emiScheduleId },
          include: {
            loanApplication: {
              include: {
                company: true,
                customer: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    address: true,
                    city: true,
                    state: true,
                    pincode: true
                  }
                },
                sessionForm: {
                  include: {
                    agent: {
                      select: { id: true, name: true, email: true }
                    }
                  }
                }
              }
            }
          }
        });

        // Check if EMI is paid (PAID or INTEREST_ONLY_PAID)
        if (emi && (emi.paymentStatus === 'PAID' || emi.paymentStatus === 'INTEREST_ONLY_PAID')) {
          const companyCode = emi.loanApplication?.company?.code || 'MM';
          
          // Find any existing payment for this EMI
          const existingPayment = await db.payment.findFirst({
            where: { emiScheduleId },
            orderBy: { createdAt: 'desc' }
          });

          if (existingPayment) {
            // Update existing payment with receipt info
            const receiptNo = await generateReceiptNumber(companyCode);
            payment = await db.payment.update({
              where: { id: existingPayment.id },
              data: {
                receiptGenerated: true,
                receiptNumber: receiptNo
              },
              include: {
                emiSchedule: {
                  include: {
                    loanApplication: {
                      include: {
                        company: true,
                        customer: {
                          select: {
                            id: true,
                            name: true,
                            phone: true,
                            address: true,
                            city: true,
                            state: true,
                            pincode: true
                          }
                        },
                        sessionForm: {
                          include: {
                            agent: {
                              select: { id: true, name: true, email: true }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            });
            console.log(`[Receipt API] Generated receipt for existing payment: ${receiptNo}`);
          } else {
            // Create a new payment record with receipt
            const receiptNo = await generateReceiptNumber(companyCode);
            payment = await db.payment.create({
              data: {
                loanApplicationId: emi.loanApplicationId,
                emiScheduleId: emi.id,
                customerId: emi.loanApplication?.customerId || '',
                amount: emi.paidAmount || emi.totalAmount,
                principalComponent: emi.paidPrincipal || emi.principalAmount,
                interestComponent: emi.paidInterest || emi.interestAmount,
                paymentMode: 'CASH',
                status: 'COMPLETED',
                receiptNumber: receiptNo,
                receiptGenerated: true,
                paidById: emi.loanApplication?.customerId || '',
                paymentType: emi.paymentStatus === 'INTEREST_ONLY_PAID' ? 'INTEREST_ONLY' : 'FULL_EMI'
              },
              include: {
                emiSchedule: {
                  include: {
                    loanApplication: {
                      include: {
                        company: true,
                        customer: {
                          select: {
                            id: true,
                            name: true,
                            phone: true,
                            address: true,
                            city: true,
                            state: true,
                            pincode: true
                          }
                        },
                        sessionForm: {
                          include: {
                            agent: {
                              select: { id: true, name: true, email: true }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            });
            console.log(`[Receipt API] Created new payment with receipt: ${receiptNo}`);
          }
        }
      }
    }

    if (!payment) {
      return NextResponse.json({ error: 'Receipt not found - EMI may not be paid yet' }, { status: 404 });
    }

    const emi = payment.emiSchedule;
    const loan = emi?.loanApplication;
    const customer = loan?.customer;
    const company = loan?.company;
    const sessionForm = loan?.sessionForm;

    // Check for mirror loan and get mirror interest rate
    const mirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loan?.id }
    });

    // Use mirror interest rate if mirror loan exists, otherwise use original rate
    const effectiveInterestRate = mirrorMapping?.mirrorInterestRate || sessionForm?.interestRate || 0;

    // Get father/husband name from session form
    const fatherName = sessionForm?.fatherName || '';

    // Calculate balance due
    const allEmis = await db.eMISchedule.findMany({
      where: { loanApplicationId: loan?.id }
    });
    const paidEmis = allEmis.filter(e => e.paymentStatus === 'PAID');
    const totalLoanAmount = sessionForm?.loanAmount || 0;
    const totalPaidAmount = paidEmis.reduce((sum, e) => sum + (e.paidAmount || 0), 0);
    const balanceDue = totalLoanAmount - totalPaidAmount;

    const totalEmis = allEmis.length;

    // For interest-only payments, use the mirror interest rate to calculate interest
    let displayInterestAmount = payment.interestComponent || emi?.interestAmount || 0;
    
    // If this is a mirror loan transaction, use mirror interest
    if (mirrorMapping && emi) {
      const mirrorMonthlyRate = mirrorMapping.mirrorInterestRate / 12 / 100;
      displayInterestAmount = Math.round((emi.outstandingPrincipal || emi.principalAmount) * mirrorMonthlyRate * 100) / 100;
    }

    const receiptData = {
      receiptNo: payment.receiptNumber || `RCP-${company?.code || 'MM'}-1`,
      date: payment.createdAt.toISOString(),
      customerName: `${loan?.firstName || ''} ${loan?.lastName || ''}`.trim() || customer?.name || '',
      fatherName: fatherName,
      phone: customer?.phone || loan?.phone || '',
      address: [customer?.address, customer?.city, customer?.state, customer?.pincode].filter(Boolean).join(', ') || loan?.address || '',
      loanAccountNo: loan?.applicationNo || '',
      loanAmount: totalLoanAmount,
      interestRate: sessionForm?.interestRate || 0,
      mirrorInterestRate: effectiveInterestRate,
      tenure: sessionForm?.tenure || 0,
      emiNumber: emi?.installmentNumber || 0,
      totalEmis: totalEmis,
      dueDate: emi?.dueDate?.toISOString() || '',
      paymentDate: emi?.paidDate?.toISOString() || payment.createdAt.toISOString(),
      principalAmount: payment.principalComponent || emi?.principalAmount || 0,
      interestAmount: displayInterestAmount,
      totalAmount: payment.amount || emi?.totalAmount || 0,
      paymentMode: payment.paymentMode || 'CASH',
      referenceNo: loan?.applicationNo || '',
      balanceDue: balanceDue,
      companyName: company?.name || 'Money Mitra',
      companyCode: company?.code || 'MM',
      isInterestOnly: payment.paymentType === 'INTEREST_ONLY' || emi?.paymentStatus === 'INTEREST_ONLY_PAID'
    };

    return NextResponse.json({
      success: true,
      receiptData,
      payment: {
        id: payment.id,
        receiptNumber: payment.receiptNumber,
        receiptGenerated: payment.receiptGenerated,
        createdAt: payment.createdAt
      }
    });

  } catch (error) {
    console.error('[Receipt API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch receipt data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
