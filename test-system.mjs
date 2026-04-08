import { PrismaClient, UserRole, LoanStatus, EMIPaymentStatus, PaymentType, PaymentStatus, AccountType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient({ log: ['error'] })

const log = (section, message) => console.log(`\n[${section}] ${message}`)
const logSuccess = (section, message) => console.log(`\n✅ [${section}] ${message}`)
const logError = (section, message) => console.log(`\n❌ [${section}] ${message}`)
const logInfo = (section, message) => console.log(`   → ${message}`)

async function main() {
  try {
    // ========================================
    // STEP 1: Reset System
    // ========================================
    log('RESET', 'Starting system reset...')
    
    // Delete all data in order
    await prisma.workflowLog.deleteMany({})
    await prisma.auditLog.deleteMany({})
    await prisma.actionLog.deleteMany({})
    await prisma.locationLog.deleteMany({})
    await prisma.notification.deleteMany({})
    await prisma.reminder.deleteMany({})
    await prisma.notificationSetting.deleteMany({})
    await prisma.notificationTemplate.deleteMany({})
    await prisma.chatbotMessage.deleteMany({})
    await prisma.chatbotSession.deleteMany({})
    await prisma.liveChatMessage.deleteMany({})
    await prisma.liveChatSession.deleteMany({})
    await prisma.ticketActivity.deleteMany({})
    await prisma.ticketMessage.deleteMany({})
    await prisma.supportTicket.deleteMany({})
    await prisma.journalEntryLine.deleteMany({})
    await prisma.journalEntry.deleteMany({})
    await prisma.bankTransaction.deleteMany({})
    await prisma.expense.deleteMany({})
    await prisma.ledgerBalance.deleteMany({})
    await prisma.cashierSettlement.deleteMany({})
    await prisma.dailyCollection.deleteMany({})
    await prisma.creditTransaction.deleteMany({})
    await prisma.interestPaymentHistory.deleteMany({})
    await prisma.eMIReminderLog.deleteMany({})
    await prisma.eMIPaymentSetting.deleteMany({})
    await prisma.payment.deleteMany({})
    await prisma.eMISchedule.deleteMany({})
    await prisma.loanTopUp.deleteMany({})
    await prisma.foreclosureRequest.deleteMany({})
    await prisma.eMIDateChangeRequest.deleteMany({})
    await prisma.counterOffer.deleteMany({})
    await prisma.documentRequest.deleteMany({})
    await prisma.loanRestructure.deleteMany({})
    await prisma.nPATracking.deleteMany({})
    await prisma.fraudAlert.deleteMany({})
    await prisma.appointment.deleteMany({})
    await prisma.loanAgreement.deleteMany({})
    await prisma.loanProgressTimeline.deleteMany({})
    await prisma.applicationFingerprint.deleteMany({})
    await prisma.creditRiskScore.deleteMany({})
    await prisma.preApprovedOffer.deleteMany({})
    await prisma.referral.deleteMany({})
    await prisma.paymentRequest.deleteMany({})
    await prisma.secondaryPaymentPage.deleteMany({})
    await prisma.secureDocument.deleteMany({})
    await prisma.commissionSlab.deleteMany({})
    await prisma.agentPerformance.deleteMany({})
    await prisma.gracePeriodConfig.deleteMany({})
    await prisma.mirrorLoanMapping.deleteMany({})
    await prisma.pendingMirrorLoan.deleteMany({})
    await prisma.sessionForm.deleteMany({})
    await prisma.loanForm.deleteMany({})
    await prisma.goldLoanDetail.deleteMany({})
    await prisma.vehicleLoanDetail.deleteMany({})
    await prisma.loanApplication.deleteMany({})
    await prisma.offlineLoanEMI.deleteMany({})
    await prisma.offlineLoan.deleteMany({})
    
    // Delete CUSTOMER users only
    await prisma.deviceFingerprint.deleteMany({})
    await prisma.blacklist.deleteMany({})
    await prisma.userSession.deleteMany({})
    await prisma.userPreference.deleteMany({})
    
    // Delete customer users
    await prisma.user.deleteMany({ where: { role: 'CUSTOMER' } })
    
    // Reset staff credits
    await prisma.user.updateMany({
      where: { role: { not: 'CUSTOMER' } },
      data: { companyCredit: 0, personalCredit: 0, credit: 0, companyId: null, agentId: null }
    })
    
    // Accounting
    await prisma.chartOfAccount.deleteMany({})
    await prisma.financialYear.deleteMany({})
    await prisma.gSTConfig.deleteMany({})
    await prisma.cashBookEntry.deleteMany({})
    await prisma.cashBook.deleteMany({})
    await prisma.accountingSettings.deleteMany({})
    await prisma.companyAccountingSettings.deleteMany({})
    await prisma.assetDepreciationLog.deleteMany({})
    await prisma.fixedAsset.deleteMany({})
    await prisma.ledger.deleteMany({})
    await prisma.reportsCache.deleteMany({})
    await prisma.loanSequence.deleteMany({})
    await prisma.bankAccount.deleteMany({})
    
    // CMS and Config
    await prisma.cMSService.deleteMany({})
    await prisma.cMSBanner.deleteMany({})
    await prisma.cMSTestimonial.deleteMany({})
    await prisma.formConfig.deleteMany({})
    await prisma.paymentOptionSettings.deleteMany({})
    await prisma.companyPaymentSettings.deleteMany({})
    await prisma.companyPaymentPage.deleteMany({})
    await prisma.uploadedFile.deleteMany({})
    await prisma.contactEnquiry.deleteMany({})
    await prisma.deletedUser.deleteMany({})
    await prisma.company.deleteMany({})
    
    logSuccess('RESET', 'All data deleted')
    
    // ========================================
    // STEP 2: Create Companies
    // ========================================
    log('COMPANIES', 'Creating companies...')
    
    const company1 = await prisma.company.create({
      data: {
        name: 'Company 1',
        code: 'C1',
        isActive: true,
        isMirrorCompany: true,
        enableMirrorLoan: false,
        defaultInterestType: 'REDUCING',
      }
    })
    logInfo('COMPANIES', `Created Company 1 (ID: ${company1.id})`)
    
    const company2 = await prisma.company.create({
      data: {
        name: 'Company 2',
        code: 'C2',
        isActive: true,
        isMirrorCompany: true,
        enableMirrorLoan: false,
        defaultInterestType: 'REDUCING',
      }
    })
    logInfo('COMPANIES', `Created Company 2 (ID: ${company2.id})`)
    
    const company3 = await prisma.company.create({
      data: {
        name: 'Company 3',
        code: 'C3',
        isActive: true,
        isMirrorCompany: false,
        enableMirrorLoan: true,
        defaultInterestType: 'FLAT',
      }
    })
    logInfo('COMPANIES', `Created Company 3 (ID: ${company3.id}) - Original company with mirror loan enabled`)
    
    logSuccess('COMPANIES', 'All companies created')
    
    // ========================================
    // STEP 3: Create Super Admin
    // ========================================
    log('USERS', 'Creating Super Admin...')
    
    const hashedPassword = await bcrypt.hash('1122334455', 10)
    
    const superAdmin = await prisma.user.upsert({
      where: { email: 'moneymitra@gmail.com' },
      update: {
        password: hashedPassword,
        plainPassword: '1122334455',
        isActive: true,
        isLocked: false,
        role: 'SUPER_ADMIN',
        name: 'Money Mitra Admin',
      },
      create: {
        email: 'moneymitra@gmail.com',
        password: hashedPassword,
        plainPassword: '1122334455',
        name: 'Money Mitra Admin',
        firebaseUid: 'super-admin-permanent-moneymitra',
        role: 'SUPER_ADMIN',
        isActive: true,
        isLocked: false,
      }
    })
    logSuccess('USERS', `Super Admin: ${superAdmin.email} (ID: ${superAdmin.id})`)
    
    // ========================================
    // STEP 4: Create Company Admins
    // ========================================
    log('USERS', 'Creating Company Admins...')
    
    const company1Admin = await prisma.user.upsert({
      where: { email: 'company1@test.com' },
      update: {
        password: hashedPassword,
        plainPassword: '1122334455',
        name: 'Company 1 Admin',
        role: 'COMPANY',
        companyId: company1.id,
        isActive: true,
      },
      create: {
        email: 'company1@test.com',
        password: hashedPassword,
        plainPassword: '1122334455',
        name: 'Company 1 Admin',
        firebaseUid: 'company1-admin-' + Date.now(),
        role: 'COMPANY',
        companyId: company1.id,
        isActive: true,
      }
    })
    logInfo('USERS', `Company 1 Admin: ${company1Admin.email}`)
    
    const company3Admin = await prisma.user.upsert({
      where: { email: 'company3@test.com' },
      update: {
        password: hashedPassword,
        plainPassword: '1122334455',
        name: 'Company 3 Admin',
        role: 'COMPANY',
        companyId: company3.id,
        isActive: true,
      },
      create: {
        email: 'company3@test.com',
        password: hashedPassword,
        plainPassword: '1122334455',
        name: 'Company 3 Admin',
        firebaseUid: 'company3-admin-' + Date.now(),
        role: 'COMPANY',
        companyId: company3.id,
        isActive: true,
      }
    })
    logInfo('USERS', `Company 3 Admin: ${company3Admin.email}`)
    
    // ========================================
    // STEP 5: Create Accountant for Company 3
    // ========================================
    log('USERS', 'Creating Accountant...')
    
    const accountant = await prisma.user.upsert({
      where: { email: 'accountant@test.com' },
      update: {
        password: hashedPassword,
        plainPassword: '1122334455',
        name: 'Accountant',
        role: 'ACCOUNTANT',
        companyId: company3.id,
        accountantCode: 'ACC001',
        isActive: true,
      },
      create: {
        email: 'accountant@test.com',
        password: hashedPassword,
        plainPassword: '1122334455',
        name: 'Accountant',
        firebaseUid: 'accountant-' + Date.now(),
        role: 'ACCOUNTANT',
        companyId: company3.id,
        accountantCode: 'ACC001',
        isActive: true,
      }
    })
    logSuccess('USERS', `Accountant: ${accountant.email}`)
    
    // ========================================
    // STEP 6: Create Customer
    // ========================================
    log('USERS', 'Creating Customer...')
    
    const customer = await prisma.user.upsert({
      where: { email: 'customer@test.com' },
      update: {
        password: hashedPassword,
        plainPassword: '1122334455',
        name: 'Test Customer',
        role: 'CUSTOMER',
        phone: '9876543210',
        isActive: true,
      },
      create: {
        email: 'customer@test.com',
        password: hashedPassword,
        plainPassword: '1122334455',
        name: 'Test Customer',
        firebaseUid: 'customer-' + Date.now(),
        role: 'CUSTOMER',
        phone: '9876543210',
        isActive: true,
      }
    })
    logSuccess('USERS', `Customer: ${customer.email} (ID: ${customer.id})`)
    
    // ========================================
    // STEP 7: Create Bank Accounts for Company 1
    // ========================================
    log('BANK', 'Creating bank account for Company 1...')
    
    const bankAccount1 = await prisma.bankAccount.create({
      data: {
        companyId: company1.id,
        bankName: 'HDFC Bank',
        accountNumber: '1234567890',
        accountName: 'Company 1 Account',
        ifscCode: 'HDFC0001234',
        accountType: 'CURRENT',
        currentBalance: 1000000,
        isActive: true,
      }
    })
    logSuccess('BANK', `Bank Account created for Company 1: ${bankAccount1.bankName} - Balance: ₹${bankAccount1.currentBalance}`)
    
    // ========================================
    // STEP 8: Create Cash Book for Company 3
    // ========================================
    log('CASHBOOK', 'Creating cash book for Company 3...')
    
    const cashBook3 = await prisma.cashBook.create({
      data: {
        companyId: company3.id,
        currentBalance: 500000,
      }
    })
    logSuccess('CASHBOOK', `Cash Book created for Company 3 - Balance: ₹${cashBook3.currentBalance}`)
    
    // ========================================
    // STEP 9: Create Chart of Accounts
    // ========================================
    log('ACCOUNTING', 'Creating Chart of Accounts...')
    
    // Company 1 Chart of Accounts
    const coa1 = await prisma.chartOfAccount.createMany({
      data: [
        { companyId: company1.id, accountCode: '1000', accountName: 'Cash', accountType: 'ASSET', currentBalance: 1000000 },
        { companyId: company1.id, accountCode: '1100', accountName: 'Bank', accountType: 'ASSET', currentBalance: 1000000 },
        { companyId: company1.id, accountCode: '1200', accountName: 'Loans Receivable', accountType: 'ASSET', currentBalance: 0 },
        { companyId: company1.id, accountCode: '2000', accountName: 'Capital', accountType: 'EQUITY', currentBalance: 2000000 },
        { companyId: company1.id, accountCode: '3000', accountName: 'Interest Income', accountType: 'INCOME', currentBalance: 0 },
        { companyId: company1.id, accountCode: '4000', accountName: 'Interest Expense', accountType: 'EXPENSE', currentBalance: 0 },
      ]
    })
    logInfo('ACCOUNTING', `Created ${coa1.count} accounts for Company 1`)
    
    // Company 3 Chart of Accounts
    const coa3 = await prisma.chartOfAccount.createMany({
      data: [
        { companyId: company3.id, accountCode: '1000', accountName: 'Cash', accountType: 'ASSET', currentBalance: 500000 },
        { companyId: company3.id, accountCode: '1200', accountName: 'Loans Receivable', accountType: 'ASSET', currentBalance: 0 },
        { companyId: company3.id, accountCode: '1300', accountName: 'Mirror Loan Receivable', accountType: 'ASSET', currentBalance: 0 },
        { companyId: company3.id, accountCode: '2000', accountName: 'Capital', accountType: 'EQUITY', currentBalance: 500000 },
        { companyId: company3.id, accountCode: '3000', accountName: 'Interest Income', accountType: 'INCOME', currentBalance: 0 },
        { companyId: company3.id, accountCode: '3100', accountName: 'Mirror Interest Income', accountType: 'INCOME', currentBalance: 0 },
        { companyId: company3.id, accountCode: '4000', accountName: 'Interest Expense', accountType: 'EXPENSE', currentBalance: 0 },
        { companyId: company3.id, accountCode: '4100', accountName: 'Mirror Interest Expense', accountType: 'EXPENSE', currentBalance: 0 },
      ]
    })
    logInfo('ACCOUNTING', `Created ${coa3.count} accounts for Company 3`)
    logSuccess('ACCOUNTING', 'Chart of Accounts created')
    
    // ========================================
    // STEP 10: Create Financial Year
    // ========================================
    log('FINANCIAL YEAR', 'Creating financial year...')
    
    const financialYear = await prisma.financialYear.create({
      data: {
        companyId: company3.id,
        name: 'FY 2024-25',
        startDate: new Date('2024-04-01'),
        endDate: new Date('2025-03-31'),
        isClosed: false,
      }
    })
    logSuccess('FINANCIAL YEAR', `Financial Year: ${financialYear.name}`)
    
    // ========================================
    // STEP 11: Create Loan Sequence
    // ========================================
    log('LOAN SEQUENCE', 'Creating loan sequence...')
    
    const loanSequence = await prisma.loanSequence.create({
      data: { currentSequence: 0 }
    })
    logSuccess('LOAN SEQUENCE', 'Loan sequence initialized')
    
    // ========================================
    // STEP 12: Create ONLINE Loan (Company 3 → Mirror to Company 1)
    // ========================================
    log('ONLINE LOAN', 'Creating online loan application...')
    
    // Generate loan number
    const seq = await prisma.loanSequence.update({
      where: { id: loanSequence.id },
      data: { currentSequence: { increment: 1 } }
    })
    const loanNumber = `LN${String(seq.currentSequence).padStart(6, '0')}`
    
    // Create loan application
    const onlineLoan = await prisma.loanApplication.create({
      data: {
        applicationNo: loanNumber,
        customerId: customer.id,
        companyId: company3.id,
        loanType: 'PERSONAL',
        status: 'DISBURSED',
        requestedAmount: 100000,
        requestedTenure: 12,
        requestedInterestRate: 12,
        loanAmount: 100000,
        tenure: 12,
        interestRate: 12,
        emiAmount: 8888,
        firstName: 'Test',
        lastName: 'Customer',
        phone: '9876543210',
        disbursedAmount: 100000,
        disbursedAt: new Date(),
        disbursedById: superAdmin.id,
        disbursementMode: 'CASH',
      }
    })
    logInfo('ONLINE LOAN', `Created loan: ${onlineLoan.applicationNo}`)
    logInfo('ONLINE LOAN', `Amount: ₹${onlineLoan.loanAmount}, Tenure: ${onlineLoan.tenure} months, Rate: ${onlineLoan.interestRate}%`)
    
    // ========================================
    // STEP 13: Create EMI Schedule for Online Loan
    // ========================================
    log('EMI SCHEDULE', 'Creating EMI schedule for online loan...')
    
    const emiAmount = 8888
    const principalPerEmi = 100000 / 12
    const interestPerEmi = (100000 * 12 / 100) / 12
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + 30)
    
    const emiSchedules = []
    for (let i = 1; i <= 12; i++) {
      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + (i - 1))
      
      const emi = await prisma.eMISchedule.create({
        data: {
          loanApplicationId: onlineLoan.id,
          installmentNumber: i,
          dueDate: dueDate,
          originalDueDate: dueDate,
          principalAmount: principalPerEmi,
          interestAmount: interestPerEmi,
          totalAmount: emiAmount,
          outstandingPrincipal: 100000 - (principalPerEmi * (i - 1)),
          outstandingInterest: interestPerEmi,
          paymentStatus: 'PENDING',
        }
      })
      emiSchedules.push(emi)
    }
    logSuccess('EMI SCHEDULE', `Created ${emiSchedules.length} EMI schedules for online loan`)
    
    // ========================================
    // STEP 14: Create Mirror Loan (Company 1)
    // ========================================
    log('MIRROR LOAN', 'Creating mirror loan in Company 1...')
    
    const mirrorSeq = await prisma.loanSequence.update({
      where: { id: loanSequence.id },
      data: { currentSequence: { increment: 1 } }
    })
    const mirrorLoanNumber = `LN${String(mirrorSeq.currentSequence).padStart(6, '0')}`
    
    const mirrorLoan = await prisma.loanApplication.create({
      data: {
        applicationNo: mirrorLoanNumber,
        customerId: customer.id,
        companyId: company1.id,
        loanType: 'PERSONAL',
        status: 'DISBURSED',
        requestedAmount: 100000,
        requestedTenure: 12,
        requestedInterestRate: 15, // Higher rate for mirror
        loanAmount: 100000,
        tenure: 12,
        interestRate: 15,
        emiAmount: 9025,
        firstName: 'Test',
        lastName: 'Customer',
        phone: '9876543210',
        disbursedAmount: 100000,
        disbursedAt: new Date(),
        disbursedById: superAdmin.id,
        disbursementMode: 'BANK_TRANSFER',
      }
    })
    logInfo('MIRROR LOAN', `Created mirror loan: ${mirrorLoan.applicationNo}`)
    
    // Create EMI Schedule for Mirror Loan
    const mirrorEmiAmount = 9025
    const mirrorPrincipalPerEmi = 100000 / 12
    const mirrorInterestPerEmi = (100000 * 15 / 100) / 12
    
    const mirrorEmiSchedules = []
    for (let i = 1; i <= 12; i++) {
      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + (i - 1))
      
      const emi = await prisma.eMISchedule.create({
        data: {
          loanApplicationId: mirrorLoan.id,
          installmentNumber: i,
          dueDate: dueDate,
          originalDueDate: dueDate,
          principalAmount: mirrorPrincipalPerEmi,
          interestAmount: mirrorInterestPerEmi,
          totalAmount: mirrorEmiAmount,
          outstandingPrincipal: 100000 - (mirrorPrincipalPerEmi * (i - 1)),
          outstandingInterest: mirrorInterestPerEmi,
          paymentStatus: 'PENDING',
        }
      })
      mirrorEmiSchedules.push(emi)
    }
    logSuccess('MIRROR LOAN', `Created ${mirrorEmiSchedules.length} EMI schedules for mirror loan`)
    
    // ========================================
    // STEP 15: Create Mirror Loan Mapping
    // ========================================
    log('MIRROR MAPPING', 'Creating mirror loan mapping...')
    
    const mirrorMapping = await prisma.mirrorLoanMapping.create({
      data: {
        originalLoanId: onlineLoan.id,
        mirrorLoanId: mirrorLoan.id,
        originalCompanyId: company3.id,
        mirrorCompanyId: company1.id,
        mirrorType: 'COMPANY_1_15_PERCENT',
        isOfflineLoan: false,
        originalInterestRate: 12,
        mirrorInterestRate: 15,
        originalInterestType: 'FLAT',
        mirrorInterestType: 'REDUCING',
        originalEMIAmount: emiAmount,
        originalTenure: 12,
        mirrorTenure: 12,
        extraEMICount: 0,
        createdBy: superAdmin.id,
      }
    })
    logSuccess('MIRROR MAPPING', `Mapping created: Company 3 Loan → Company 1 Loan`)
    
    // ========================================
    // STEP 16: Create OFFLINE Loan (Company 3 → Mirror to Company 1)
    // ========================================
    log('OFFLINE LOAN', 'Creating offline loan...')
    
    const offlineSeq = await prisma.loanSequence.update({
      where: { id: loanSequence.id },
      data: { currentSequence: { increment: 1 } }
    })
    const offlineLoanNumber = `OFF${String(offlineSeq.currentSequence).padStart(6, '0')}`
    
    const offlineLoan = await prisma.offlineLoan.create({
      data: {
        loanNumber: offlineLoanNumber,
        companyId: company3.id,
        customerId: customer.id,
        customerName: customer.name || 'Test Customer',
        customerPhone: customer.phone || '9876543210',
        customerEmail: customer.email,
        loanType: 'PERSONAL',
        loanAmount: 50000,
        interestRate: 12,
        interestType: 'FLAT',
        tenure: 6,
        emiAmount: 9333,
        disbursementDate: new Date(),
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        disbursementMode: 'CASH',
        createdById: superAdmin.id,
        createdByRole: 'SUPER_ADMIN',
      }
    })
    logInfo('OFFLINE LOAN', `Created offline loan: ${offlineLoan.loanNumber}`)
    logInfo('OFFLINE LOAN', `Amount: ₹${offlineLoan.loanAmount}, Tenure: ${offlineLoan.tenure} months`)
    
    // Create EMI Schedule for Offline Loan
    const offlineEmiSchedules = []
    for (let i = 1; i <= 6; i++) {
      const dueDate = new Date()
      dueDate.setMonth(dueDate.getMonth() + i)
      
      const emi = await prisma.offlineLoanEMI.create({
        data: {
          offlineLoanId: offlineLoan.id,
          installmentNumber: i,
          dueDate: dueDate,
          originalDueDate: dueDate,
          principalAmount: 50000 / 6,
          interestAmount: 6000 / 6,
          totalAmount: 9333,
          outstandingPrincipal: 50000 - ((50000 / 6) * (i - 1)),
          paymentStatus: 'PENDING',
        }
      })
      offlineEmiSchedules.push(emi)
    }
    logSuccess('OFFLINE LOAN', `Created ${offlineEmiSchedules.length} EMI schedules for offline loan`)
    
    // ========================================
    // STEP 17: Create Mirror for Offline Loan
    // ========================================
    log('OFFLINE MIRROR', 'Creating mirror for offline loan...')
    
    const offlineMirrorSeq = await prisma.loanSequence.update({
      where: { id: loanSequence.id },
      data: { currentSequence: { increment: 1 } }
    })
    const offlineMirrorLoanNumber = `OFF${String(offlineMirrorSeq.currentSequence).padStart(6, '0')}`
    
    const offlineMirrorLoan = await prisma.offlineLoan.create({
      data: {
        loanNumber: offlineMirrorLoanNumber,
        companyId: company1.id,
        customerId: customer.id,
        customerName: customer.name || 'Test Customer',
        customerPhone: customer.phone || '9876543210',
        customerEmail: customer.email,
        loanType: 'PERSONAL',
        loanAmount: 50000,
        interestRate: 15,
        interestType: 'REDUCING',
        tenure: 6,
        emiAmount: 9583,
        disbursementDate: new Date(),
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        disbursementMode: 'BANK_TRANSFER',
        createdById: superAdmin.id,
        createdByRole: 'SUPER_ADMIN',
        isMirrorLoan: true,
        originalLoanId: offlineLoan.id,
      }
    })
    logInfo('OFFLINE MIRROR', `Created mirror offline loan: ${offlineMirrorLoan.loanNumber}`)
    
    // Create EMI Schedule for Offline Mirror Loan
    const offlineMirrorEmiSchedules = []
    for (let i = 1; i <= 6; i++) {
      const dueDate = new Date()
      dueDate.setMonth(dueDate.getMonth() + i)
      
      const emi = await prisma.offlineLoanEMI.create({
        data: {
          offlineLoanId: offlineMirrorLoan.id,
          installmentNumber: i,
          dueDate: dueDate,
          originalDueDate: dueDate,
          principalAmount: 50000 / 6,
          interestAmount: 7500 / 6,
          totalAmount: 9583,
          outstandingPrincipal: 50000 - ((50000 / 6) * (i - 1)),
          paymentStatus: 'PENDING',
        }
      })
      offlineMirrorEmiSchedules.push(emi)
    }
    logSuccess('OFFLINE MIRROR', `Created ${offlineMirrorEmiSchedules.length} EMI schedules for offline mirror`)
    
    // ========================================
    // VERIFICATION SECTION
    // ========================================
    
    console.log('\n' + '='.repeat(60))
    console.log('VERIFICATION SECTION')
    console.log('='.repeat(60))
    
    // Verify Companies
    const companies = await prisma.company.findMany({ orderBy: { code: 'asc' } })
    log('VERIFY', `Companies: ${companies.length}`)
    companies.forEach(c => logInfo('VERIFY', `${c.code} - ${c.name} (Mirror: ${c.isMirrorCompany})`))
    
    // Verify Users
    const users = await prisma.user.findMany({ orderBy: { role: 'asc' } })
    log('VERIFY', `Users: ${users.length}`)
    users.forEach(u => logInfo('VERIFY', `${u.role} - ${u.email}`))
    
    // Verify Online Loans
    const onlineLoans = await prisma.loanApplication.findMany({
      include: { company: true, _count: { select: { emiSchedules: true } } }
    })
    log('VERIFY', `Online Loans: ${onlineLoans.length}`)
    onlineLoans.forEach(l => logInfo('VERIFY', `${l.applicationNo} - ${l.company?.name} - ₹${l.loanAmount} - EMIs: ${l._count.emiSchedules}`))
    
    // Verify Offline Loans
    const offlineLoans = await prisma.offlineLoan.findMany({
      include: { company: true, _count: { select: { emis: true } } }
    })
    log('VERIFY', `Offline Loans: ${offlineLoans.length}`)
    offlineLoans.forEach(l => logInfo('VERIFY', `${l.loanNumber} - ${l.company?.name} - ₹${l.principalAmount} - EMIs: ${l._count.emis}`))
    
    // Verify Mirror Mappings
    const mappings = await prisma.mirrorLoanMapping.findMany({
      include: {
        originalLoan: { select: { applicationNo: true } },
        mirrorLoan: { select: { applicationNo: true } }
      }
    })
    log('VERIFY', `Mirror Mappings: ${mappings.length}`)
    mappings.forEach(m => logInfo('VERIFY', `${m.originalLoan?.applicationNo} → ${m.mirrorLoan?.applicationNo}`))
    
    // Verify EMI Schedules
    const emiCount = await prisma.eMISchedule.count()
    const offlineEmiCount = await prisma.offlineLoanEMI.count()
    log('VERIFY', `Online EMI Schedules: ${emiCount}`)
    log('VERIFY', `Offline EMI Schedules: ${offlineEmiCount}`)
    
    // Verify Chart of Accounts
    const coaCount = await prisma.chartOfAccount.count()
    log('VERIFY', `Chart of Accounts: ${coaCount} accounts`)
    
    // Verify Bank Accounts
    const bankCount = await prisma.bankAccount.count()
    log('VERIFY', `Bank Accounts: ${bankCount}`)
    
    // Verify Cash Books
    const cashBookCount = await prisma.cashBook.count()
    log('VERIFY', `Cash Books: ${cashBookCount}`)
    
    console.log('\n' + '='.repeat(60))
    logSuccess('COMPLETE', 'System reset and test data created successfully!')
    console.log('='.repeat(60))
    
    // Summary
    console.log('\n📊 SUMMARY:')
    console.log('   Companies: 3 (C1, C2, C3)')
    console.log('   Online Loans: 2 (Original + Mirror)')
    console.log('   Offline Loans: 2 (Original + Mirror)')
    console.log('   Online EMIs: 24 (12 + 12)')
    console.log('   Offline EMIs: 12 (6 + 6)')
    console.log('\n🔐 LOGIN CREDENTIALS:')
    console.log('   Super Admin: moneymitra@gmail.com / 1122334455')
    console.log('   Company 1 Admin: company1@test.com / 1122334455')
    console.log('   Company 3 Admin: company3@test.com / 1122334455')
    console.log('   Accountant: accountant@test.com / 1122334455')
    console.log('   Customer: customer@test.com / 1122334455')
    
  } catch (error) {
    console.error('\n❌ ERROR:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
