import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LoanStatus, LoanType } from '@prisma/client';
import { identifyCompanyType } from '@/lib/mirror-company-utils';
import { invalidateLoanCache } from '@/lib/cache';
import NotificationService from '@/lib/notification-service';
import { AccountingService, ACCOUNT_CODES } from '@/lib/accounting-service';

// Generate loan number with company code prefix
// Format: {CompanyCode}{ProductCode}{Sequence}
// Example: C3PL00001 (Company 3, Personal Loan, #00001)
async function generateLoanNo(loanType: string, companyId: string): Promise<string> {
  // Get company code (should be C1, C2, C3 after fix)
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { code: true }
  });

  // Get product code from CMSService (PL, GL, VL, etc.)
  const product = await db.cMSService.findFirst({
    where: { loanType },
    select: { code: true }
  });

  // Company code - use directly if it's C1/C2/C3 format, otherwise extract number
  let companyCode = 'C3'; // default to Company 3
  if (company?.code) {
    if (company.code.match(/^C\d$/)) {
      // Already in C1, C2, C3 format
      companyCode = company.code;
    } else {
      // Extract number from code
      const codeMatch = company.code.match(/(\d+)/);
      if (codeMatch) {
        companyCode = `C${codeMatch[1]}`;
      }
    }
  }

  // Product code - use from CMSService or default based on loan type
  let productCode = 'PL'; // default to Personal Loan
  if (product?.code) {
    productCode = product.code.toUpperCase();
  } else {
    // Fallback to loan type codes
    const loanTypeCodes: Record<string, string> = {
      'PERSONAL': 'PL',
      'GOLD': 'GL',
      'VEHICLE': 'VL',
      'BUSINESS': 'BL',
      'HOME': 'HL',
      'EDUCATION': 'EL',
      'AGRICULTURAL': 'AL',
      'MORTGAGE': 'ML',
    };
    productCode = loanTypeCodes[loanType?.toUpperCase()] || loanType?.substring(0, 2).toUpperCase() || 'PL';
  }

  const prefix = `${companyCode}${productCode}`;

  // Get count of loans with this prefix (only ACTIVE loans)
  const count = await db.loanApplication.count({
    where: {
      applicationNo: { startsWith: prefix },
      status: 'ACTIVE'
    }
  });

  const sequence = (count + 1).toString().padStart(5, '0');
  console.log(`[generateLoanNo] Company: ${companyCode}, Product: ${productCode}, Sequence: ${sequence} → ${prefix}${sequence}`);
  return `${prefix}${sequence}`;
}

const ALLOWED_ACTIONS: Record<string, Record<string, { 
  nextStatus: LoanStatus; 
  roles: string[];
  requiresAssignment?: 'companyId' | 'agentId' | 'staffId';
}>> = {
  SUBMITTED: {
    approve: { nextStatus: LoanStatus.SA_APPROVED, roles: ['SUPER_ADMIN'], requiresAssignment: 'companyId' },
    reject: { nextStatus: LoanStatus.REJECTED_BY_SA, roles: ['SUPER_ADMIN'] }
  },
  SA_APPROVED: {
    approve: { nextStatus: LoanStatus.COMPANY_APPROVED, roles: ['COMPANY'], requiresAssignment: 'agentId' },
    agent_direct_approve: { nextStatus: LoanStatus.AGENT_APPROVED_STAGE1, roles: ['AGENT'], requiresAssignment: 'staffId' },
    reject: { nextStatus: LoanStatus.REJECTED_BY_COMPANY, roles: ['COMPANY', 'AGENT'] },
    send_back: { nextStatus: LoanStatus.SUBMITTED, roles: ['SUPER_ADMIN'] }
  },
  COMPANY_APPROVED: {
    approve: { nextStatus: LoanStatus.AGENT_APPROVED_STAGE1, roles: ['AGENT'], requiresAssignment: 'staffId' },
    reject: { nextStatus: LoanStatus.REJECTED_FINAL, roles: ['AGENT'] },
    send_back: { nextStatus: LoanStatus.SA_APPROVED, roles: ['COMPANY', 'SUPER_ADMIN'] }
  },
  AGENT_APPROVED_STAGE1: {
    complete_form: { nextStatus: LoanStatus.LOAN_FORM_COMPLETED, roles: ['STAFF'] },
    reject: { nextStatus: LoanStatus.REJECTED_FINAL, roles: ['STAFF'] },
    send_back: { nextStatus: LoanStatus.SA_APPROVED, roles: ['AGENT', 'COMPANY', 'SUPER_ADMIN'] }
  },
  LOAN_FORM_COMPLETED: {
    create_session: { nextStatus: LoanStatus.SESSION_CREATED, roles: ['AGENT'] },
    send_back: { nextStatus: LoanStatus.AGENT_APPROVED_STAGE1, roles: ['AGENT', 'SUPER_ADMIN'] }
  },
  SESSION_CREATED: {
    approve_session: { nextStatus: LoanStatus.CUSTOMER_SESSION_APPROVED, roles: ['CUSTOMER'] },
    reject_session: { nextStatus: LoanStatus.SESSION_REJECTED, roles: ['CUSTOMER'] },
    send_back: { nextStatus: LoanStatus.LOAN_FORM_COMPLETED, roles: ['AGENT', 'SUPER_ADMIN'] }
  },
  CUSTOMER_SESSION_APPROVED: {
    approve: { nextStatus: LoanStatus.FINAL_APPROVED, roles: ['SUPER_ADMIN'] },
    reject: { nextStatus: LoanStatus.REJECTED_FINAL, roles: ['SUPER_ADMIN'] },
    send_back: { nextStatus: LoanStatus.SESSION_CREATED, roles: ['SUPER_ADMIN'] }
  },
  FINAL_APPROVED: {
    disburse: { nextStatus: LoanStatus.ACTIVE, roles: ['CASHIER'] },
    send_back: { nextStatus: LoanStatus.CUSTOMER_SESSION_APPROVED, roles: ['CASHIER', 'SUPER_ADMIN'] }
  },
  ACTIVE: {
    send_back: { nextStatus: LoanStatus.FINAL_APPROVED, roles: ['SUPER_ADMIN'] }
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanId, loanIds, action, remarks, role, userId, companyId, agentId, staffId, disbursementData, isBulk, mirrorLoanConfig } = body;

    // Handle bulk approval
    if (isBulk && loanIds && Array.isArray(loanIds) && loanIds.length > 0) {
      const results: { id: string; success: boolean; error?: string }[] = [];
      
      for (const id of loanIds) {
        try {
          await processSingleApproval({
            loanId: id,
            action,
            remarks,
            role,
            userId,
            companyId,
            agentId,
            staffId,
            disbursementData,
            mirrorLoanConfig,
            request
          });
          results.push({ id, success: true });
        } catch (error) {
          results.push({ id, success: false, error: (error as Error).message });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      
      return NextResponse.json({
        success: successCount > 0,
        message: `Processed ${successCount}/${loanIds.length} applications`,
        results
      });
    }

    // Single approval
    if (!loanId || !action || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await processSingleApproval({
      loanId, action, remarks, role, userId, companyId, agentId, staffId, disbursementData, mirrorLoanConfig, request
    });

    return NextResponse.json({ success: true, loan: { id: loanId, status: result.nextStatus } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

async function processSingleApproval({
  loanId, action, remarks, role, userId, companyId, agentId, staffId, disbursementData, mirrorLoanConfig, request
}: {
  loanId: string;
  action: string;
  remarks?: string;
  role: string;
  userId?: string;
  companyId?: string;
  agentId?: string;
  staffId?: string;
  disbursementData?: {
    amount: number;
    mode: string;
    reference: string;
    bankAccountId?: string;
    // Split Payment fields
    useSplitPayment?: boolean;
    bankAmount?: number;
    cashAmount?: number;
  };
  mirrorLoanConfig?: { enabled: boolean; mirrorCompanyId?: string; mirrorType?: string };
  request: NextRequest;
}): Promise<{ nextStatus: LoanStatus }> {

  // Fast loan lookup - only get what we need
  const loan = await db.loanApplication.findUnique({
    where: { id: loanId },
    select: {
      id: true,
      status: true,
      applicationNo: true,
      customerId: true,
      companyId: true,
      currentHandlerId: true,
      loanType: true,
      purpose: true,
      isInterestOnlyLoan: true,
      interestOnlyMonthlyAmount: true,
      requestedAmount: true,
      // Customer details for mirror loan
      title: true,
      firstName: true,
      lastName: true,
      fatherName: true,
      panNumber: true,
      aadhaarNumber: true,
      dateOfBirth: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
      phone: true,
      employmentType: true,
      employerName: true,
      monthlyIncome: true,
      bankAccountNumber: true,
      bankIfsc: true,
      bankName: true,
      sessionForm: { 
        select: { 
          processingFee: true,
          approvedAmount: true,
          interestRate: true,
          interestType: true,
          tenure: true,
          emiAmount: true,
          agentId: true,
        } 
      },
      company: {
        select: { id: true, code: true, name: true }
      }
    }
  });

  if (!loan) throw new Error('Loan not found');

  const currentStatus = loan.status as string;
  const statusActions = ALLOWED_ACTIONS[currentStatus];
  if (!statusActions) throw new Error(`No actions for status: ${currentStatus}`);

  const normalizedRole = role.toUpperCase().replace(/\s+/g, '_');
  let normalizedAction = action.toLowerCase().replace(/\s+/g, '_');
  
  // Auto-detect agent_direct_approve
  if (currentStatus === 'SA_APPROVED' && normalizedAction === 'approve' && normalizedRole === 'AGENT') {
    if (loan.currentHandlerId && userId && loan.currentHandlerId === userId) {
      normalizedAction = 'agent_direct_approve';
    }
  }
  
  const actionConfig = statusActions[normalizedAction];
  if (!actionConfig) throw new Error(`Action '${action}' not allowed`);
  if (!actionConfig.roles.includes(normalizedRole)) throw new Error(`Role '${role}' not authorized`);

  const nextStatus = actionConfig.nextStatus;

  // Validation
  if (actionConfig.requiresAssignment === 'companyId' && !companyId) throw new Error('Company required');
  if (actionConfig.requiresAssignment === 'agentId' && !agentId) throw new Error('Agent required');
  if (actionConfig.requiresAssignment === 'staffId' && !staffId) throw new Error('Staff required');

  // Build update data
  const updateData: Record<string, unknown> = { status: nextStatus };
  if (companyId) updateData.companyId = companyId;
  if (staffId) { updateData.currentHandlerId = staffId; updateData.currentStage = 'STAFF_VERIFICATION'; }
  if (agentId) { updateData.currentHandlerId = agentId; updateData.currentStage = 'AGENT_SESSION'; }

  // Status-specific updates
  switch (nextStatus) {
    case LoanStatus.SA_APPROVED: updateData.saApprovedAt = new Date(); break;
    case LoanStatus.COMPANY_APPROVED: updateData.companyApprovedAt = new Date(); break;
    case LoanStatus.AGENT_APPROVED_STAGE1: updateData.agentApprovedAt = new Date(); break;
    case LoanStatus.LOAN_FORM_COMPLETED:
      updateData.loanFormCompletedAt = new Date();
      updateData.currentStage = 'SESSION_CREATION';
      if (userId) {
        const staff = await db.user.findUnique({ where: { id: userId }, select: { agentId: true } });
        if (staff?.agentId) updateData.currentHandlerId = staff.agentId;
      }
      break;
    case LoanStatus.SESSION_CREATED: updateData.sessionCreatedAt = new Date(); break;
    case LoanStatus.CUSTOMER_SESSION_APPROVED: updateData.customerApprovedAt = new Date(); break;
    case LoanStatus.FINAL_APPROVED: updateData.finalApprovedAt = new Date(); break;
    case LoanStatus.ACTIVE:
    case LoanStatus.ACTIVE_INTEREST_ONLY:
      // Check if this is an INTEREST_ONLY loan
      if (loan.isInterestOnlyLoan) {
        // For INTEREST_ONLY loans, set status to ACTIVE_INTEREST_ONLY
        updateData.status = LoanStatus.ACTIVE_INTEREST_ONLY;
        updateData.interestOnlyStartDate = new Date();
        
        // Calculate monthly interest amount based on approved amount and interest rate
        const approvedAmount = loan.sessionForm?.approvedAmount || loan.requestedAmount || 0;
        const interestRate = loan.sessionForm?.interestRate || 0;
        const monthlyInterest = (approvedAmount * interestRate / 100) / 12;
        updateData.interestOnlyMonthlyAmount = monthlyInterest;
        
        console.log(`[WORKFLOW] INTEREST_ONLY loan disbursement - Monthly Interest: ${monthlyInterest}`);
      }
      
      updateData.disbursedAt = new Date();
      updateData.disbursedById = userId;
      updateData.currentStage = 'ACTIVE_LOAN';
      
      if (disbursementData) {
        updateData.disbursedAmount = disbursementData.amount;
        updateData.disbursementMode = disbursementData.mode;
        updateData.disbursementRef = disbursementData.reference;
      }
      
      // Generate new loan number with company code prefix
      // Only if current application number starts with 'A' (simple format)
      if (loan.applicationNo?.startsWith('A')) {
        const company = loan.companyId || companyId;
        if (company && loan.loanType) {
          const newApplicationNo = await generateLoanNo(loan.loanType, company);
          updateData.applicationNo = newApplicationNo;
          console.log(`[WORKFLOW] Generated loan number: ${newApplicationNo} for loan ${loanId}`);
        }
      }
      break;
    case LoanStatus.REJECTED_BY_SA:
    case LoanStatus.REJECTED_BY_COMPANY:
    case LoanStatus.REJECTED_FINAL:
    case LoanStatus.SESSION_REJECTED:
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = remarks;
      updateData.rejectedById = userId;
      break;
    // Send Back Cases - Reset to previous stage
    case LoanStatus.SUBMITTED:
      // Sending back from SA_APPROVED to SUBMITTED
      updateData.saApprovedAt = null;
      updateData.currentStage = 'SA_REVIEW';
      updateData.currentHandlerId = null;
      break;
    case LoanStatus.SA_APPROVED:
      // Sending back from COMPANY_APPROVED or AGENT_APPROVED_STAGE1 to SA_APPROVED
      updateData.companyApprovedAt = null;
      updateData.agentApprovedAt = null;
      updateData.currentStage = 'COMPANY_ASSIGNMENT';
      break;
    case LoanStatus.AGENT_APPROVED_STAGE1:
      // Sending back from LOAN_FORM_COMPLETED to AGENT_APPROVED_STAGE1
      updateData.loanFormCompletedAt = null;
      updateData.currentStage = 'STAFF_VERIFICATION';
      break;
    case LoanStatus.SESSION_CREATED:
      // Sending back from CUSTOMER_SESSION_APPROVED to SESSION_CREATED
      updateData.customerApprovedAt = null;
      updateData.currentStage = 'CUSTOMER_APPROVAL';
      break;
    case LoanStatus.CUSTOMER_SESSION_APPROVED:
      // Sending back from FINAL_APPROVED or ACTIVE to CUSTOMER_SESSION_APPROVED
      updateData.finalApprovedAt = null;
      updateData.disbursedAt = null;
      updateData.disbursedById = null;
      updateData.disbursedAmount = null;
      updateData.disbursementMode = null;
      updateData.disbursementRef = null;
      updateData.currentStage = 'CUSTOMER_APPROVAL';
      break;
  }

  // Single transaction for all critical operations
  await db.$transaction(async (tx) => {
    // Update loan
    await tx.loanApplication.update({ where: { id: loanId }, data: updateData });

    // Create first Interest EMI for Interest Only loans
    if (loan.isInterestOnlyLoan && (nextStatus === LoanStatus.ACTIVE || nextStatus === LoanStatus.ACTIVE_INTEREST_ONLY)) {
      const approvedAmount = loan.sessionForm?.approvedAmount || loan.requestedAmount || 0;
      const interestRate = loan.sessionForm?.interestRate || 0;
      const monthlyInterest = (approvedAmount * interestRate / 100) / 12;
      
      // Create the first interest EMI due in 1 month
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(5); // Due on 5th of next month
      dueDate.setHours(0, 0, 0, 0);
      
      await tx.eMISchedule.create({
        data: {
          loanApplicationId: loanId,
          installmentNumber: 1,
          dueDate,
          originalDueDate: dueDate,
          principalAmount: 0,
          interestAmount: monthlyInterest,
          totalAmount: monthlyInterest,
          outstandingPrincipal: approvedAmount,
          outstandingInterest: 0,
          paidAmount: 0,
          paidPrincipal: 0,
          paidInterest: 0,
          paymentStatus: 'PENDING',
          penaltyAmount: 0,
          penaltyPaid: 0,
          daysOverdue: 0,
          isInterestOnly: true,
          interestOnlyAmount: monthlyInterest
        }
      });
      
      console.log(`[WORKFLOW] Created first Interest EMI for loan ${loan.applicationNo}, Amount: ${monthlyInterest}, Due: ${dueDate.toISOString()}`);
    }

    // Handle disbursement accounting
    if (nextStatus === LoanStatus.ACTIVE && disbursementData?.amount) {
      // Check if there's a pending mirror loan for this loan
      // If yes, skip the disbursement accounting here - it will be handled when mirror loan is disbursed
      const pendingMirrorLoan = await tx.pendingMirrorLoan.findFirst({
        where: { 
          originalLoanId: loanId,
          status: 'APPROVED' // Only skip if mirror loan is approved and waiting for disbursement
        }
      });
      
      if (pendingMirrorLoan) {
        console.log(`[Disbursement] SKIP: Loan has pending mirror loan ${pendingMirrorLoan.id}. Disbursement will happen from mirror company.`);
        console.log(`[Disbursement] Mirror Company: ${pendingMirrorLoan.mirrorCompanyId}, Amount will be deducted from mirror company's bank account.`);
      } else {
        // Check if this is Company 3 (uses CashBook instead of BankAccount)
        const company = loan.company || (companyId ? await db.company.findUnique({ where: { id: companyId } }) : null);
        const companyType = company ? identifyCompanyType(company) : 'UNKNOWN';
        const isCompany3 = companyType === 'COMPANY_3';
        
        console.log(`[Disbursement] Company: ${company?.name}, Type: ${companyType}, Is Company 3: ${isCompany3}`);
        
        // Handle Split Payment
        if (disbursementData.useSplitPayment && disbursementData.bankAmount && disbursementData.cashAmount) {
          console.log(`[Disbursement] Split Payment: Bank ₹${disbursementData.bankAmount}, Cash ₹${disbursementData.cashAmount}`);
          
          // 1. Handle Bank Portion
          if (disbursementData.bankAmount > 0 && disbursementData.bankAccountId) {
            const bank = await tx.bankAccount.findUnique({ 
              where: { id: disbursementData.bankAccountId },
              select: { currentBalance: true }
            });
            
            if (bank && bank.currentBalance >= disbursementData.bankAmount) {
              await tx.bankAccount.update({
                where: { id: disbursementData.bankAccountId },
                data: { currentBalance: { decrement: disbursementData.bankAmount } }
              });
              
              await tx.bankTransaction.create({
                data: {
                  bankAccountId: disbursementData.bankAccountId,
                  transactionType: 'DEBIT',
                  amount: disbursementData.bankAmount,
                  balanceAfter: bank.currentBalance - disbursementData.bankAmount,
                  description: `Loan Disbursement (Bank Portion) - ${loan.applicationNo}`,
                  referenceType: 'LOAN_DISBURSEMENT',
                  referenceId: loanId,
                  createdById: userId || 'SYSTEM'
                }
              });
              console.log(`[Disbursement] Bank deduction: ₹${disbursementData.bankAmount}`);
            }
          }
          
          // 2. Handle Cash Portion
          if (disbursementData.cashAmount > 0 && company) {
            let cashBook = await tx.cashBook.findUnique({
              where: { companyId: company.id }
            });
            
            if (!cashBook) {
              cashBook = await tx.cashBook.create({
                data: {
                  companyId: company.id,
                  currentBalance: 0
                }
              });
            }
            
            const newCashBalance = cashBook.currentBalance - disbursementData.cashAmount;
            
            await tx.cashBookEntry.create({
              data: {
                cashBookId: cashBook.id,
                entryType: 'DEBIT',
                amount: disbursementData.cashAmount,
                balanceAfter: newCashBalance,
                description: `Loan Disbursement (Cash Portion) - ${loan.applicationNo}`,
                referenceType: 'LOAN_DISBURSEMENT',
                referenceId: loanId,
                createdById: userId || 'SYSTEM'
              }
            });
            
            await tx.cashBook.update({
              where: { id: cashBook.id },
              data: {
                currentBalance: newCashBalance,
                lastUpdatedById: userId,
                lastUpdatedAt: new Date()
              }
            });
            console.log(`[Disbursement] Cash deduction: ₹${disbursementData.cashAmount}, New Balance: ₹${newCashBalance}`);
          }
        } else if (isCompany3 && company) {
        // Company 3: Use CashBook instead of BankAccount
        // Get or create cash book for Company 3
        let cashBook = await tx.cashBook.findUnique({
          where: { companyId: company.id }
        });
        
        if (!cashBook) {
          cashBook = await tx.cashBook.create({
            data: {
              companyId: company.id,
              currentBalance: 0
            }
          });
        }
        
        const newBalance = cashBook.currentBalance - disbursementData.amount;
        
        // Create cash book entry for disbursement
        await tx.cashBookEntry.create({
          data: {
            cashBookId: cashBook.id,
            entryType: 'DEBIT',
            amount: disbursementData.amount,
            balanceAfter: newBalance,
            description: `Loan Disbursement - ${loan.applicationNo}`,
            referenceType: 'LOAN_DISBURSEMENT',
            referenceId: loanId,
            createdById: userId || 'SYSTEM'
          }
        });
        
        // Update cash book balance
        await tx.cashBook.update({
          where: { id: cashBook.id },
          data: {
            currentBalance: newBalance,
            lastUpdatedById: userId,
            lastUpdatedAt: new Date()
          }
        });
        
        console.log(`[Disbursement] Company 3 CashBook updated: Balance ${cashBook.currentBalance} → ${newBalance}`);
      } else if (disbursementData?.bankAccountId) {
        // Other companies: Use BankAccount
        const bank = await tx.bankAccount.findUnique({ 
          where: { id: disbursementData.bankAccountId },
          select: { currentBalance: true }
        });
        
        if (bank && bank.currentBalance >= disbursementData.amount) {
          await tx.bankAccount.update({
            where: { id: disbursementData.bankAccountId },
            data: { currentBalance: { decrement: disbursementData.amount } }
          });
          
          await tx.bankTransaction.create({
            data: {
              bankAccountId: disbursementData.bankAccountId,
              transactionType: 'DEBIT',
              amount: disbursementData.amount,
              balanceAfter: bank.currentBalance - disbursementData.amount,
              description: `Loan Disbursement - ${loan.applicationNo}`,
              referenceType: 'LOAN_DISBURSEMENT',
              referenceId: loanId,
              createdById: userId || 'SYSTEM'
            }
          });
        }
      }
      
      // ============ CHART OF ACCOUNTS JOURNAL ENTRY ============
      // Create journal entry for loan disbursement in Chart of Accounts
      // Debit: Loans Receivable (Asset increases)
      // Credit: Cash/Bank (Asset decreases)
      const targetCompanyId = loan.companyId || companyId;
      if (targetCompanyId && disbursementData.amount > 0) {
        try {
          const accountingService = new AccountingService(targetCompanyId);
          await accountingService.initializeChartOfAccounts();
          
          // Get Loans Receivable account
          const loansReceivableAccount = await tx.chartOfAccount.findFirst({
            where: { companyId: targetCompanyId, accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE }
          });
          
          // Get Cash/Bank account
          let cashAccount = await tx.chartOfAccount.findFirst({
            where: { companyId: targetCompanyId, accountCode: ACCOUNT_CODES.CASH_IN_HAND }
          });
          
          // If bank transfer, find bank account
          if (disbursementData.bankAccountId) {
            const bankChartAccount = await tx.chartOfAccount.findFirst({
              where: { 
                companyId: targetCompanyId, 
                accountCode: { startsWith: '14' } 
              }
            });
            if (bankChartAccount) {
              cashAccount = bankChartAccount;
            }
          }
          
          if (loansReceivableAccount && cashAccount) {
            const entryNumber = await accountingService.generateEntryNumber();
            
            // Create journal entry
            await tx.journalEntry.create({
              data: {
                companyId: targetCompanyId,
                entryNumber,
                entryDate: new Date(),
                referenceType: 'LOAN_DISBURSEMENT',
                referenceId: loanId,
                narration: `Loan Disbursement - ${loan.applicationNo}`,
                totalDebit: disbursementData.amount,
                totalCredit: disbursementData.amount,
                isAutoEntry: true,
                isApproved: true,
                createdById: userId || 'SYSTEM',
                lines: {
                  create: [
                    {
                      accountId: loansReceivableAccount.id,
                      debitAmount: disbursementData.amount,
                      creditAmount: 0,
                      loanId: loanId,
                      customerId: loan.customerId,
                      narration: 'Loan principal disbursed'
                    },
                    {
                      accountId: cashAccount.id,
                      debitAmount: 0,
                      creditAmount: disbursementData.amount,
                      narration: disbursementData.mode === 'BANK_TRANSFER' 
                        ? 'Bank transfer for loan disbursement' 
                        : 'Cash paid out for loan'
                    }
                  ]
                }
              }
            });
            
            // Update account balances
            await tx.chartOfAccount.update({
              where: { id: loansReceivableAccount.id },
              data: { currentBalance: { increment: disbursementData.amount } }
            });
            
            await tx.chartOfAccount.update({
              where: { id: cashAccount.id },
              data: { currentBalance: { decrement: disbursementData.amount } }
            });
            
            console.log(`[Disbursement] Journal Entry created: Loans Receivable +${disbursementData.amount}, Cash/Bank -${disbursementData.amount}`);
          } else {
            console.log(`[Disbursement] WARNING: Chart of Accounts not found for company ${targetCompanyId}`);
          }
        } catch (accError) {
          console.error(`[Disbursement] Error creating journal entry:`, accError);
          // Don't fail the disbursement if accounting fails
        }
      }
      } // End of else block (no pending mirror loan)
    }

    // Create workflow log
    await tx.workflowLog.create({
      data: {
        loanApplicationId: loanId,
        actionById: userId || 'system',
        previousStatus: currentStatus,
        newStatus: nextStatus,
        action: normalizedAction,
        remarks,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });
    
    // ============ MIRROR LOAN REJECTION/CANCELLATION SYNC ============
    // If original loan is rejected/cancelled, also reject/cancel the mirror loan
    if (['REJECTED_BY_SA', 'REJECTED_BY_COMPANY', 'REJECTED_FINAL', 'SESSION_REJECTED', 'CANCELLED'].includes(nextStatus)) {
      const mirrorMapping = await tx.mirrorLoanMapping.findFirst({
        where: { originalLoanId: loanId }
      });
      
      if (mirrorMapping?.mirrorLoanId) {
        await tx.loanApplication.update({
          where: { id: mirrorMapping.mirrorLoanId },
          data: {
            status: nextStatus,
            rejectedAt: new Date(),
            rejectionReason: remarks || 'Original loan rejected/cancelled',
            rejectedById: userId
          }
        });
        
        console.log(`[Mirror Loan] Synced rejection ${nextStatus} to mirror loan ${mirrorMapping.mirrorLoanId}`);
      }
    }
    
    // ============ MIRROR LOAN FORECLOSURE SYNC ============
    // If original loan is closed (foreclosure), also close the mirror loan
    if (nextStatus === 'CLOSED') {
      const mirrorMapping = await tx.mirrorLoanMapping.findFirst({
        where: { originalLoanId: loanId }
      });
      
      if (mirrorMapping?.mirrorLoanId) {
        await tx.loanApplication.update({
          where: { id: mirrorMapping.mirrorLoanId },
          data: {
            status: 'CLOSED',
            closedAt: new Date()
          }
        });
        
        // Mark all pending EMIs in mirror loan as skipped
        await tx.eMISchedule.updateMany({
          where: {
            loanApplicationId: mirrorMapping.mirrorLoanId,
            paymentStatus: 'PENDING'
          },
          data: {
            paymentStatus: 'WAIVED',
            notes: 'Loan closed due to original loan foreclosure'
          }
        });
        
        console.log(`[Mirror Loan] Synced closure to mirror loan ${mirrorMapping.mirrorLoanId}`);
      }
    }
  });

  // Invalidate cache for this loan
  invalidateLoanCache(loanId);

  // Non-critical operations - run in parallel (don't await)
  setImmediate(async () => {
    try {
      const parallelOps: Promise<unknown>[] = [];
      
      // ============ ENHANCED NOTIFICATIONS ============
      // Determine the actual status for notifications (may be different for INTEREST_ONLY loans)
      const actualStatus = (updateData.status as string) || nextStatus;
      
      // Send notification to customer
      if (loan.customerId) {
        const notificationPromises: Promise<unknown>[] = [];
        
        if (actualStatus === 'FINAL_APPROVED') {
          // Loan approved notification
          notificationPromises.push(
            NotificationService.sendLoanStatusNotification(loan.customerId, {
              status: 'FINAL_APPROVED',
              applicationNo: loan.applicationNo,
              loanId: loan.id,
              amount: loan.sessionForm?.approvedAmount || loan.requestedAmount,
            })
          );
        } else if (actualStatus === 'ACTIVE' || actualStatus === 'ACTIVE_INTEREST_ONLY') {
          // Loan disbursed notification
          notificationPromises.push(
            NotificationService.sendLoanStatusNotification(loan.customerId, {
              status: 'DISBURSED',
              applicationNo: loan.applicationNo,
              loanId: loan.id,
              amount: disbursementData?.amount || loan.sessionForm?.approvedAmount || loan.requestedAmount,
            })
          );
        } else if (actualStatus === 'SESSION_CREATED') {
          // Session created notification
          notificationPromises.push(
            NotificationService.createNotification({
              userId: loan.customerId,
              type: 'LOAN_STATUS_UPDATE',
              category: 'LOAN',
              priority: 'HIGH',
              title: 'Sanction Letter Ready',
              message: `Your sanction letter for loan ${loan.applicationNo} is ready. Please review and approve to proceed.`,
              actionUrl: `/customer/loan/${loan.id}`,
              actionText: 'Review Sanction',
              data: { loanId: loan.id, applicationNo: loan.applicationNo },
            })
          );
        } else if (['REJECTED_BY_SA', 'REJECTED_BY_COMPANY', 'REJECTED_FINAL', 'SESSION_REJECTED'].includes(actualStatus)) {
          // Rejection notification
          notificationPromises.push(
            NotificationService.sendLoanStatusNotification(loan.customerId, {
              status: actualStatus,
              applicationNo: loan.applicationNo,
              loanId: loan.id,
              message: remarks,
            })
          );
        }
        
        // Execute all customer notifications
        for (const p of notificationPromises) {
          parallelOps.push(p);
        }
      }
      
      // Notify assigned users (Agent/Staff/Company) about status changes
      if (agentId && actualStatus === 'AGENT_APPROVED_STAGE1') {
        parallelOps.push(
          NotificationService.createNotification({
            userId: agentId,
            type: 'LOAN_STATUS_UPDATE',
            category: 'LOAN',
            priority: 'NORMAL',
            title: 'New Application Assigned',
            message: `Application ${loan.applicationNo} has been assigned to you for processing.`,
            actionUrl: `/agent/application/${loan.id}`,
            actionText: 'View Application',
            data: { loanId: loan.id },
          })
        );
      }
      
      if (staffId && actualStatus === 'LOAN_FORM_COMPLETED') {
        parallelOps.push(
          NotificationService.createNotification({
            userId: staffId,
            type: 'LOAN_STATUS_UPDATE',
            category: 'LOAN',
            priority: 'NORMAL',
            title: 'Verification Completed',
            message: `Verification for application ${loan.applicationNo} has been completed.`,
            actionUrl: `/staff/application/${loan.id}`,
            actionText: 'View Application',
            data: { loanId: loan.id },
          })
        );
      }

      // Timeline
      parallelOps.push(db.loanProgressTimeline.create({
        data: {
          loanApplicationId: loanId,
          stage: nextStatus,
          status: 'COMPLETED',
          handlerId: userId || 'system',
          notes: remarks || `${currentStatus} → ${nextStatus}`
        }
      }));

      await Promise.all(parallelOps);
    } catch {}
  });

  // Note: Mirror loan creation is now handled in FinalApprovalSection.tsx
  // When Super Admin approves with mirror loan enabled, it directly creates APPROVED pending mirror loan
  // No second approval step needed - mirror loan is ready for Cashier disbursement
  // Note: INTEREST_ONLY loans do NOT have mirror loans

  // Return the actual status (may be ACTIVE_INTEREST_ONLY for interest-only loans)
  return { nextStatus: (updateData.status as LoanStatus) || nextStatus };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const loanId = searchParams.get('loanId');
  if (!loanId) return NextResponse.json({ error: 'Loan ID required' }, { status: 400 });

  const loan = await db.loanApplication.findUnique({
    where: { id: loanId },
    select: {
      status: true,
      workflowLogs: { 
        orderBy: { createdAt: 'desc' }, 
        take: 10, 
        select: { action: true, newStatus: true, createdAt: true, actionBy: { select: { name: true } } }
      }
    }
  });

  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

  const statusActions = ALLOWED_ACTIONS[loan.status as string] || {};
  return NextResponse.json({
    currentStatus: loan.status,
    possibleActions: Object.entries(statusActions).map(([action, config]) => ({
      action, nextStatus: config.nextStatus, allowedRoles: config.roles
    })),
    history: loan.workflowLogs
  });
}
