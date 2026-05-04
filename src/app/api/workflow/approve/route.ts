import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { identifyCompanyType } from '@/lib/mirror-company-utils';
import { invalidateLoanCache } from '@/lib/cache';
import NotificationService from '@/lib/notification-service';
import { AccountingService, ACCOUNT_CODES } from '@/lib/accounting-service';
import { sendPushNotificationToRole, sendPushNotificationToUser } from '@/lib/push-notification-service';

// Local type definitions - Prisma schema uses strings, not enums
type LoanStatus = 'SUBMITTED' | 'SA_APPROVED' | 'COMPANY_APPROVED' | 'AGENT_APPROVED_STAGE1' | 'LOAN_FORM_COMPLETED' | 'SESSION_CREATED' | 'CUSTOMER_SESSION_APPROVED' | 'FINAL_APPROVED' | 'ACTIVE' | 'ACTIVE_INTEREST_ONLY' | 'REJECTED_BY_SA' | 'REJECTED_BY_COMPANY' | 'REJECTED_FINAL' | 'SESSION_REJECTED' | 'CANCELLED' | 'CLOSED' | 'DISBURSED';
type LoanType = 'PERSONAL' | 'GOLD' | 'VEHICLE' | 'BUSINESS' | 'HOME' | 'EDUCATION' | 'AGRICULTURAL' | 'MORTGAGE' | 'INTEREST_ONLY';

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

  // Count ALL loans with this prefix regardless of status to prevent
  // duplicate application numbers when loans are rejected or closed.
  const count = await db.loanApplication.count({
    where: {
      applicationNo: { startsWith: prefix }
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
    approve: { nextStatus: 'SA_APPROVED', roles: ['SUPER_ADMIN'], requiresAssignment: 'companyId' },
    reject: { nextStatus: 'REJECTED_BY_SA', roles: ['SUPER_ADMIN'] }
  },
  SA_APPROVED: {
    approve: { nextStatus: 'COMPANY_APPROVED', roles: ['COMPANY'], requiresAssignment: 'agentId' },
    agent_direct_approve: { nextStatus: 'AGENT_APPROVED_STAGE1', roles: ['AGENT'], requiresAssignment: 'staffId' },
    reject: { nextStatus: 'REJECTED_BY_COMPANY', roles: ['COMPANY', 'AGENT'] },
    send_back: { nextStatus: 'SUBMITTED', roles: ['SUPER_ADMIN'] }
  },
  COMPANY_APPROVED: {
    approve: { nextStatus: 'AGENT_APPROVED_STAGE1', roles: ['AGENT'], requiresAssignment: 'staffId' },
    reject: { nextStatus: 'REJECTED_FINAL', roles: ['AGENT'] },
    send_back: { nextStatus: 'SA_APPROVED', roles: ['COMPANY', 'SUPER_ADMIN'] }
  },
  AGENT_APPROVED_STAGE1: {
    complete_form: { nextStatus: 'LOAN_FORM_COMPLETED', roles: ['STAFF'] },
    reject: { nextStatus: 'REJECTED_FINAL', roles: ['STAFF'] },
    send_back: { nextStatus: 'SA_APPROVED', roles: ['AGENT', 'COMPANY', 'SUPER_ADMIN'] }
  },
  LOAN_FORM_COMPLETED: {
    create_session: { nextStatus: 'SESSION_CREATED', roles: ['AGENT'] },
    send_back: { nextStatus: 'AGENT_APPROVED_STAGE1', roles: ['AGENT', 'SUPER_ADMIN'] }
  },
  SESSION_CREATED: {
    approve_session: { nextStatus: 'CUSTOMER_SESSION_APPROVED', roles: ['CUSTOMER', 'SUPER_ADMIN'] },
    fast_approve: { nextStatus: 'FINAL_APPROVED', roles: ['SUPER_ADMIN'] },
    reject_session: { nextStatus: 'SESSION_REJECTED', roles: ['CUSTOMER', 'SUPER_ADMIN'] },
    send_back: { nextStatus: 'LOAN_FORM_COMPLETED', roles: ['AGENT', 'SUPER_ADMIN'] }
  },
  CUSTOMER_SESSION_APPROVED: {
    approve: { nextStatus: 'FINAL_APPROVED', roles: ['SUPER_ADMIN'] },
    reject: { nextStatus: 'REJECTED_FINAL', roles: ['SUPER_ADMIN'] },
    send_back: { nextStatus: 'SESSION_CREATED', roles: ['SUPER_ADMIN'] }
  },
  FINAL_APPROVED: {
    disburse: { nextStatus: 'ACTIVE', roles: ['CASHIER'] },
    send_back: { nextStatus: 'CUSTOMER_SESSION_APPROVED', roles: ['CASHIER', 'SUPER_ADMIN'] }
  },
  ACTIVE: {
    send_back: { nextStatus: 'FINAL_APPROVED', roles: ['SUPER_ADMIN'] }
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanId, loanIds, action, remarks, role, userId, companyId, agentId, staffId, disbursementData, isBulk, mirrorLoanConfig, signatureData } = body;

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
            signatureData,
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
      loanId, action, remarks, role, userId, companyId, agentId, staffId, disbursementData, mirrorLoanConfig, signatureData, request
    });

    return NextResponse.json({ success: true, loan: { id: loanId, status: result.nextStatus } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

async function processSingleApproval({
  loanId, action, remarks, role, userId, companyId, agentId, staffId, disbursementData, mirrorLoanConfig, signatureData, request
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
    isCashPayment?: boolean;
    // Split Payment fields
    useSplitPayment?: boolean;
    bankAmount?: number;
    cashAmount?: number;
  };
  mirrorLoanConfig?: { enabled: boolean; mirrorCompanyId?: string; mirrorType?: string };
  signatureData?: string;
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
    case 'SA_APPROVED': updateData.saApprovedAt = new Date(); break;
    case 'COMPANY_APPROVED': updateData.companyApprovedAt = new Date(); break;
    case 'AGENT_APPROVED_STAGE1': updateData.agentApprovedAt = new Date(); break;
    case 'LOAN_FORM_COMPLETED':
      updateData.loanFormCompletedAt = new Date();
      updateData.currentStage = 'SESSION_CREATION';
      if (userId) {
        const staff = await db.user.findUnique({ where: { id: userId }, select: { agentId: true } });
        if (staff?.agentId) updateData.currentHandlerId = staff.agentId;
      }
      break;
    case 'SESSION_CREATED': updateData.sessionCreatedAt = new Date(); break;
    case 'CUSTOMER_SESSION_APPROVED': 
      updateData.customerApprovedAt = new Date(); 
      break;
    case 'FINAL_APPROVED': updateData.finalApprovedAt = new Date(); break;
    case 'ACTIVE':
    case 'ACTIVE_INTEREST_ONLY':
      // Check if this is an INTEREST_ONLY loan
      if (loan.isInterestOnlyLoan) {
        // For INTEREST_ONLY loans, set status to ACTIVE_INTEREST_ONLY
        updateData.status = 'ACTIVE_INTEREST_ONLY';
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
    case 'REJECTED_BY_SA':
    case 'REJECTED_BY_COMPANY':
    case 'REJECTED_FINAL':
    case 'SESSION_REJECTED':
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = remarks;
      updateData.rejectedById = userId;
      break;
    // Send Back Cases - Reset to previous stage
    case 'SUBMITTED':
      // Sending back from SA_APPROVED to SUBMITTED
      updateData.saApprovedAt = null;
      updateData.currentStage = 'SA_REVIEW';
      updateData.currentHandlerId = null;
      break;
    case 'SA_APPROVED':
      // Sending back from COMPANY_APPROVED or AGENT_APPROVED_STAGE1 to SA_APPROVED
      updateData.companyApprovedAt = null;
      updateData.agentApprovedAt = null;
      updateData.currentStage = 'COMPANY_ASSIGNMENT';
      break;
    case 'AGENT_APPROVED_STAGE1':
      // Sending back from LOAN_FORM_COMPLETED to AGENT_APPROVED_STAGE1
      updateData.loanFormCompletedAt = null;
      updateData.currentStage = 'STAFF_VERIFICATION';
      break;
    case 'SESSION_CREATED':
      // Sending back from CUSTOMER_SESSION_APPROVED to SESSION_CREATED
      updateData.customerApprovedAt = null;
      updateData.currentStage = 'CUSTOMER_APPROVAL';
      break;
    case 'CUSTOMER_SESSION_APPROVED':
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

  // ── PRE-INIT ACCOUNTING TO PREVENT P2028 TIMEOUTS ────────────────────────
  // initializeChartOfAccounts takes 5-10s sometimes. If it runs inside
  // db.$transaction, Prisma will throw P2028 (timeout). Doing it here
  // ensures the slow setup is finished before the transaction starts.
  const targetCompanyId = loan.companyId || companyId;
  if (nextStatus === 'ACTIVE' && disbursementData?.amount && targetCompanyId) {
    try {
      const { AccountingService: PreAccSvc } = await import('@/lib/accounting-service');
      const preAccSvc = new PreAccSvc(targetCompanyId);
      await preAccSvc.initializeChartOfAccounts();
      console.log(`[WORKFLOW] Pre-initialized accounting for company ${targetCompanyId} (outside tx)`);
    } catch (e) {
      console.warn(`[WORKFLOW] Accounting pre-init failed (will retry inside tx):`, e);
    }
  }

  // Single transaction for all critical operations
  await db.$transaction(async (tx) => {
    // Update loan
    await tx.loanApplication.update({ where: { id: loanId }, data: updateData as any });

    if (nextStatus === 'CUSTOMER_SESSION_APPROVED' && signatureData) {
      await tx.sessionForm.update({
        where: { loanApplicationId: loanId },
        data: { customerSignature: signatureData }
      });
      console.log(`[WORKFLOW] Saved customer signature to SessionForm for loan ${loanId}`);
    }

    // Create first Interest EMI for Interest Only loans
    if (loan.isInterestOnlyLoan && (nextStatus === 'ACTIVE' || nextStatus === 'ACTIVE_INTEREST_ONLY')) {
      const approvedAmount = loan.sessionForm?.approvedAmount || loan.requestedAmount || 0;
      const interestRate = loan.sessionForm?.interestRate || 0;
      const monthlyInterest = (approvedAmount * interestRate / 100) / 12;
      
      // Create the first interest EMI due in 1 month
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(1); // Issue 8 Fix: 1st of next month (standard EMI day; was hardcoded 5)
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
          paymentStatus: 'PENDING' as any,
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
    if (nextStatus === 'ACTIVE' && disbursementData?.amount) {
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
        const isCompany3 = companyType === 'ORIGINAL_COMPANY';
        
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
            
            if (bank) {
              const newBankBalance = bank.currentBalance - disbursementData.bankAmount;
              await tx.bankAccount.update({
                where: { id: disbursementData.bankAccountId },
                data: { currentBalance: newBankBalance }
              });
              
              await tx.bankTransaction.create({
                data: {
                  bankAccountId: disbursementData.bankAccountId,
                  transactionType: 'DEBIT',
                  amount: disbursementData.bankAmount,
                  balanceAfter: newBankBalance,
                  description: `Loan Disbursement (Bank Portion) - ${loan.applicationNo}`,
                  referenceType: 'LOAN_DISBURSEMENT',
                  referenceId: loanId,
                  createdById: userId || 'SYSTEM'
                }
              });
              console.log(`[Disbursement] Bank deduction: ₹${disbursementData.bankAmount}, New Balance: ₹${newBankBalance}`);
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

          // ── Issue 4 Fix: Double-entry journal for split disbursement ─────────
          // Raw CashBook + BankTransaction already created above for the ledger.
          // Now create proper journal entries so the trial balance / ledger reflect it.
          const splitTargetCompanyId = loan.companyId || companyId;
          if (splitTargetCompanyId) {
            try {
              const splitAccSvc = new AccountingService(splitTargetCompanyId);
              await splitAccSvc.initializeChartOfAccounts();
              if ((disbursementData.bankAmount || 0) > 0) {
                await splitAccSvc.recordLoanDisbursement({
                  loanId, customerId: loan.customerId, amount: disbursementData.bankAmount!,
                  disbursementDate: new Date(), createdById: userId || 'SYSTEM',
                  bankAccountId: disbursementData.bankAccountId,
                  paymentMode: 'BANK_TRANSFER',
                  reference: `Split Disbursement (Bank) - ${loan.applicationNo}`
                }, tx);
              }
              if ((disbursementData.cashAmount || 0) > 0) {
                await splitAccSvc.recordLoanDisbursement({
                  loanId, customerId: loan.customerId, amount: disbursementData.cashAmount!,
                  disbursementDate: new Date(), createdById: userId || 'SYSTEM',
                  paymentMode: 'CASH',
                  reference: `Split Disbursement (Cash) - ${loan.applicationNo}`
                }, tx);
              }
              console.log(`[Split Disb. Journal] Bank ₹${disbursementData.bankAmount} + Cash ₹${disbursementData.cashAmount} recorded in ledger`);
            } catch (splitJEErr) {
              console.error('[Split Disb. Journal] Failed (non-critical):', splitJEErr);
            }
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
      } else if (disbursementData?.isCashPayment && company) {
        // Cash payment from cash book
        console.log(`[Disbursement] Processing CASH payment for company ${company.name}`);
        
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
            description: `Loan Disbursement (Cash) - ${loan.applicationNo}`,
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
        
        console.log(`[Disbursement] Cash Book updated: Balance ${cashBook.currentBalance} → ${newBalance}`);
      } else if (disbursementData?.bankAccountId) {
        // Other companies: Use BankAccount — allow overdraft (no balance check)
        const bank = await tx.bankAccount.findUnique({ 
          where: { id: disbursementData.bankAccountId },
          select: { currentBalance: true }
        });
        
        if (bank) {
          const newBalance = bank.currentBalance - disbursementData.amount;
          await tx.bankAccount.update({
            where: { id: disbursementData.bankAccountId },
            data: { currentBalance: newBalance }
          });
          
          await tx.bankTransaction.create({
            data: {
              bankAccountId: disbursementData.bankAccountId,
              transactionType: 'DEBIT',
              amount: disbursementData.amount,
              balanceAfter: newBalance,
              description: `Loan Disbursement - ${loan.applicationNo}`,
              referenceType: 'LOAN_DISBURSEMENT',
              referenceId: loanId,
              createdById: userId || 'SYSTEM'
            }
          });
          console.log(`[Disbursement] Bank deduction: ₹${disbursementData.amount}, New Balance: ₹${newBalance}`);
        } else {
          console.warn(`[Disbursement] Bank account ${disbursementData.bankAccountId} not found — journal entry will still be created`);
        }
      }
      
      // ============ UNIFIED ACCOUNTING - LOAN DISBURSEMENT ============
      // NOTE: Skip for split payments — raw bankTransaction + cashBookEntry already created above,
      // running AccountingService here too would create DUPLICATE journal entries.
      const targetCompanyId = loan.companyId || companyId;
      const isSplitPayment = !!(disbursementData.useSplitPayment && disbursementData.bankAmount && disbursementData.cashAmount);
      if (targetCompanyId && disbursementData.amount > 0 && !isSplitPayment) {
        try {
          const accountingService = new AccountingService(targetCompanyId);
          await accountingService.initializeChartOfAccounts();

          await accountingService.recordLoanDisbursement({
            loanId,
            customerId: loan.customerId,
            amount: disbursementData.amount,
            disbursementDate: new Date(),
            createdById: userId || 'SYSTEM',
            bankAccountId: disbursementData.bankAccountId,
            paymentMode: disbursementData.mode || (disbursementData.isCashPayment ? 'CASH' : 'BANK_TRANSFER'),
            reference: `Workflow Approval: ${loan.applicationNo}`
          }, tx);
          
          console.log(`[Disbursement] Journal Entry created via AccountingService for ${loan.applicationNo}`);
        } catch (accError) {
          console.error(`[Disbursement] Error creating journal entry:`, accError);
        }
      } else if (isSplitPayment) {
        console.log(`[Disbursement] SPLIT PAYMENT — skipping AccountingService (raw entries already created). Bank: ₹${disbursementData.bankAmount}, Cash: ₹${disbursementData.cashAmount}`);
      }
      } // End of else block (no pending mirror loan)
    }

    // Create workflow log
    await tx.workflowLog.create({
      data: {
        loanApplicationId: loanId,
        actionById: userId || 'system',
        previousStatus: currentStatus as any,
        newStatus: nextStatus as any,
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
            status: nextStatus as any,
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
            paymentStatus: 'WAIVED' as any,
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
      
      // ============ NOTIFY SUPER_ADMIN on every workflow transition ============
      // Determine the actual status for notifications (may be ACTIVE_INTEREST_ONLY for interest-only loans)
      const actualStatus = (updateData.status as string) || nextStatus;

      // Super Admin must know whenever ANY status changes in the system
      const statusLabels: Record<string, string> = {
        SA_APPROVED:              '✅ Application SA Approved — Awaiting Company Assignment',
        COMPANY_APPROVED:         '✅ Company Approved — Awaiting Agent Assignment',
        AGENT_APPROVED_STAGE1:    '✅ Agent Approved — Staff Verification Pending',
        LOAN_FORM_COMPLETED:      '📋 Form Completed — Session Creation Pending',
        SESSION_CREATED:          '📄 Sanction Sent — Awaiting Customer Approval',
        CUSTOMER_SESSION_APPROVED:'❗ Customer Approved Sanction — Your Final Action Required',
        FINAL_APPROVED:           '✅ Final Approval Done — Ready for Disbursement',
        ACTIVE:                   '💰 Loan Disbursed — Loan is Now Active',
        ACTIVE_INTEREST_ONLY:     '💰 Interest-Only Loan Disbursed — Active',
        REJECTED_BY_SA:           '❌ Rejected by SA',
        REJECTED_BY_COMPANY:      '❌ Rejected by Company',
        REJECTED_FINAL:           '❌ Final Rejection',
        SESSION_REJECTED:         '❌ Customer Rejected Sanction',
        CLOSED:                   '🔒 Loan Closed',
      };
      const saStatusLabel = statusLabels[actualStatus] || `Status: ${actualStatus}`;

      // Always notify SUPER_ADMIN of every transition
      parallelOps.push(
        sendPushNotificationToRole('SUPER_ADMIN', {
          title: `🏦 Loan Update: ${loan.applicationNo}`,
          body: saStatusLabel,
          data: { loanId: loan.id, applicationNo: loan.applicationNo, status: actualStatus, type: 'LOAN_WORKFLOW', actionUrl: '/super-admin/loans' },
          actionUrl: '/super-admin/loans',
        })
      );

      // Notify CASHIER when loan is FINAL_APPROVED (ready for disbursement)
      if (actualStatus === 'FINAL_APPROVED') {
        parallelOps.push(
          sendPushNotificationToRole('CASHIER', {
            title: '💸 Loan Ready for Disbursement',
            body: `Loan ${loan.applicationNo} is final approved. Please disburse the amount.`,
            data: { loanId: loan.id, applicationNo: loan.applicationNo, type: 'LOAN_WORKFLOW', actionUrl: '/cashier/loans' },
            actionUrl: '/cashier/loans',
          })
        );
      }

      // Notify AGENT when SA approves (SA_APPROVED stage)
      if (actualStatus === 'SA_APPROVED') {
        parallelOps.push(
          sendPushNotificationToRole('AGENT', {
            title: '👍 SA Approved Application',
            body: `Application ${loan.applicationNo} has been SA approved. Assign to a company/agent.`,
            data: { loanId: loan.id, applicationNo: loan.applicationNo, type: 'LOAN_WORKFLOW', actionUrl: '/agent/loans' },
            actionUrl: '/agent/loans',
          })
        );
      }

      // Send notification to customer
      if (loan.customerId) {
        const notificationPromises: Promise<unknown>[] = [];
        
        if (actualStatus === 'FINAL_APPROVED') {
          notificationPromises.push(
            NotificationService.sendLoanStatusNotification(loan.customerId, {
              status: 'FINAL_APPROVED',
              applicationNo: loan.applicationNo,
              loanId: loan.id,
              amount: loan.sessionForm?.approvedAmount || loan.requestedAmount,
            })
          );
        } else if (actualStatus === 'ACTIVE' || actualStatus === 'ACTIVE_INTEREST_ONLY') {
          notificationPromises.push(
            NotificationService.sendLoanStatusNotification(loan.customerId, {
              status: 'DISBURSED',
              applicationNo: loan.applicationNo,
              loanId: loan.id,
              amount: disbursementData?.amount || loan.sessionForm?.approvedAmount || loan.requestedAmount,
            })
          );
        } else if (actualStatus === 'SESSION_CREATED') {
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
          notificationPromises.push(
            NotificationService.sendLoanStatusNotification(loan.customerId, {
              status: actualStatus,
              applicationNo: loan.applicationNo,
              loanId: loan.id,
              message: remarks,
            })
          );
        }
        
        for (const p of notificationPromises) {
          parallelOps.push(p);
        }
      }
      
      // Notify assigned Agent when assigned
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
        // Also send push to specific agent
        parallelOps.push(
          sendPushNotificationToUser({
            userId: agentId,
            title: '📎 New Application Assigned',
            body: `Application ${loan.applicationNo} assigned to you. Please process.`,
            data: { loanId: loan.id, type: 'LOAN_WORKFLOW', actionUrl: `/agent/application/${loan.id}` },
            actionUrl: `/agent/application/${loan.id}`,
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
