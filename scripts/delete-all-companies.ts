// Delete all companies and all related records
process.env.DATABASE_URL = "mysql://u366636586_new_loan:Mahadev%406163@77.37.35.177:3306/u366636586_new_loan";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllCompanies() {
  console.log('Starting delete all companies...');
  
  try {
    // Get all companies
    const companies = await prisma.company.findMany({
      select: { id: true, name: true, code: true }
    });
    
    console.log(`Found ${companies.length} companies to delete`);
    
    if (companies.length === 0) {
      console.log('No companies to delete');
      return;
    }
    
    const companyIds = companies.map(c => c.id);
    
    // Delete ALL users associated with these companies
    console.log('Deleting users associated with companies...');
    const usersToDelete = await prisma.user.findMany({
      where: { companyId: { in: companyIds } }
    });
    
    if (usersToDelete.length > 0) {
      const userIds = usersToDelete.map(u => u.id);
      
      // Delete user-related records
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.workflowLog.deleteMany({ where: { actionById: { in: userIds } } });
      await prisma.locationLog.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.reminder.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.notificationSetting.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.deviceFingerprint.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.blacklist.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.userSession.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.userPreference.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.agentPerformance.deleteMany({ where: { agentId: { in: userIds } } });
      await prisma.preApprovedOffer.deleteMany({ where: { customerId: { in: userIds } } });
      await prisma.loanApplication.deleteMany({ where: { customerId: { in: userIds } } });
      await prisma.offlineLoan.deleteMany({ where: { customerId: { in: userIds } } });
      
      // Create deleted user records
      for (const user of usersToDelete) {
        try {
          await prisma.deletedUser.create({
            data: {
              email: user.email,
              firebaseUid: user.firebaseUid,
              originalRole: user.role
            }
          });
        } catch {}
      }
      
      // Delete the users
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      console.log(`Deleted ${usersToDelete.length} users`);
    }
    
    // Delete ALL company-related data in bulk
    console.log('Deleting all company-related data...');
    
    // Loans and related
    const loans = await prisma.loanApplication.findMany({
      where: { companyId: { in: companyIds } },
      select: { id: true }
    });
    const loanIds = loans.map(l => l.id);
    
    if (loanIds.length > 0) {
      console.log(`  Deleting ${loanIds.length} loans and related records...`);
      await prisma.eMISchedule.deleteMany({ where: { loanApplicationId: { in: loanIds } } });
      await prisma.sessionForm.deleteMany({ where: { loanApplicationId: { in: loanIds } } });
      await prisma.payment.deleteMany({ where: { loanApplicationId: { in: loanIds } } });
      await prisma.secureDocument.deleteMany({ where: { loanApplicationId: { in: loanIds } } });
      await prisma.workflowLog.deleteMany({ where: { loanApplicationId: { in: loanIds } } });
      await prisma.loanTopUp.deleteMany({ where: { loanApplicationId: { in: loanIds } } });
      await prisma.foreclosureRequest.deleteMany({ where: { loanApplicationId: { in: loanIds } } });
      await prisma.eMIDateChangeRequest.deleteMany({ where: { loanApplicationId: { in: loanIds } } });
      await prisma.counterOffer.deleteMany({ where: { loanApplicationId: { in: loanIds } } });
      await prisma.documentRequest.deleteMany({ where: { loanApplicationId: { in: loanIds } } });
      await prisma.loanRestructure.deleteMany({ where: { loanApplicationId: { in: loanIds } } });
      await prisma.nPATracking.deleteMany({ where: { loanApplicationId: { in: loanIds } } });
    }
    
    // Mirror loans
    await prisma.mirrorLoanMapping.deleteMany({
      where: { 
        OR: [
          { originalCompanyId: { in: companyIds } },
          { mirrorCompanyId: { in: companyIds } }
        ]
      }
    });
    await prisma.pendingMirrorLoan.deleteMany({
      where: {
        OR: [
          { originalCompanyId: { in: companyIds } },
          { mirrorCompanyId: { in: companyIds } }
        ]
      }
    });
    
    // Offline loans
    await prisma.offlineLoan.deleteMany({ where: { companyId: { in: companyIds } } });
    
    // Loan applications
    await prisma.loanApplication.deleteMany({ where: { companyId: { in: companyIds } } });
    
    // Accounting records
    console.log('  Deleting accounting records...');
    try { await prisma.ledgerBalance.deleteMany({ where: { account: { companyId: { in: companyIds } } } }); } catch {}
    try { await prisma.journalEntryLine.deleteMany({ where: { account: { companyId: { in: companyIds } } } }); } catch {}
    await prisma.chartOfAccount.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.journalEntry.deleteMany({ where: { companyId: { in: companyIds } } });
    try { await prisma.ledgerBalance.deleteMany({ where: { financialYear: { companyId: { in: companyIds } } } }); } catch {}
    await prisma.financialYear.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.ledger.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.bankAccount.deleteMany({ where: { companyId: { in: companyIds } } });
    
    // Other company records - only models with companyId field
    console.log('  Deleting other company records...');
    await prisma.expense.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.gSTConfig.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.fixedAsset.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.commissionSlab.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.gracePeriodConfig.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.preApprovedOffer.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.agentPerformance.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.companyAccountingSettings.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.companyPaymentSettings.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.companyPaymentPage.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.daybookEntry.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.borrowedMoney.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.investMoney.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.equityEntry.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.cashBook.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.accountHead.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.secondaryPaymentPage.deleteMany({ where: { companyId: { in: companyIds } } });
    
    // Finally delete the companies
    console.log('Deleting companies...');
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    
    console.log(`\nSuccessfully deleted ${companies.length} companies`);
    
    // Verify
    const remaining = await prisma.company.count();
    console.log(`Remaining companies: ${remaining}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllCompanies();
