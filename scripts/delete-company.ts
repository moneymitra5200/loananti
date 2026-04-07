import { db } from '@/lib/db';

async function main() {
  console.log('Deleting Money Mitra Finance Ltd company...');

  // Find the company
  const company = await db.company.findFirst({
    where: {
      OR: [
        { name: { contains: 'Money Mitra' } },
        { name: { contains: 'Moneymitra' } },
        { code: 'MMF001' }
      ]
    }
  });

  if (!company) {
    console.log('Company not found');
    return;
  }

  console.log('Found company:', company.name, company.code);

  // First, remove company association from users
  const updatedUsers = await db.user.updateMany({
    where: { companyId: company.id },
    data: { companyId: null }
  });
  console.log('Updated users:', updatedUsers.count);

  // Delete related records
  // 1. Delete ledgers
  await db.ledger.deleteMany({ where: { companyId: company.id } });
  
  // 2. Delete chart of accounts
  await db.chartOfAccount.deleteMany({ where: { companyId: company.id } });
  
  // 3. Delete financial years
  await db.financialYear.deleteMany({ where: { companyId: company.id } });
  
  // 4. Delete journal entries (lines will cascade)
  const journalEntries = await db.journalEntry.findMany({ where: { companyId: company.id } });
  for (const je of journalEntries) {
    await db.journalEntryLine.deleteMany({ where: { journalEntryId: je.id } });
  }
  await db.journalEntry.deleteMany({ where: { companyId: company.id } });
  
  // 5. Delete expenses
  await db.expense.deleteMany({ where: { companyId: company.id } });
  
  // 6. Delete bank accounts
  await db.bankAccount.deleteMany({ where: { companyId: company.id } });
  
  // 7. Delete GST configs
  await db.gSTConfig.deleteMany({ where: { companyId: company.id } });
  
  // 8. Delete commission slabs
  await db.commissionSlab.deleteMany({ where: { companyId: company.id } });
  
  // 9. Delete grace period configs
  await db.gracePeriodConfig.deleteMany({ where: { companyId: company.id } });
  
  // 10. Delete offline loans
  const offlineLoans = await db.offlineLoan.findMany({ where: { companyId: company.id } });
  for (const loan of offlineLoans) {
    await db.offlineLoanEMI.deleteMany({ where: { offlineLoanId: loan.id } });
  }
  await db.offlineLoan.deleteMany({ where: { companyId: company.id } });
  
  // 11. Delete fixed assets
  await db.fixedAsset.deleteMany({ where: { companyId: company.id } });
  
  // 12. Delete pre-approved offers
  await db.preApprovedOffer.deleteMany({ where: { companyId: company.id } });
  
  // 13. Delete agent performance
  await db.agentPerformance.deleteMany({ where: { companyId: company.id } });
  
  // 14. Update loan applications to remove company reference
  await db.loanApplication.updateMany({
    where: { companyId: company.id },
    data: { companyId: null }
  });

  // Finally delete the company
  await db.company.delete({ where: { id: company.id } });
  console.log('Company deleted successfully!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
