import { db } from '../src/lib/db';

async function main() {
  console.log('--- RECONCILING GHOST PENALTIES IN DB ---');

  // Find offline EMIs that are PAID / INTEREST_ONLY_PAID / WAIVED
  // but have penaltyPaid > 0 even though they were paid on time / in advance OR paidAmount <= totalAmount with no penalty record
  const emis = await db.offlineLoanEMI.findMany({
    where: {
      paymentStatus: { in: ['PAID', 'WAIVED', 'INTEREST_ONLY_PAID'] },
      OR: [
        { penaltyPaid: { gt: 0 } },
        { penaltyAmount: { gt: 0 } }
      ]
    },
    include: {
      offlineLoan: true
    }
  });

  console.log(`Found ${emis.length} paid/waived offline EMIs with penalty fields > 0.`);

  let updatedCount = 0;
  for (const emi of emis) {
    const paidDate = emi.paidDate ? new Date(emi.paidDate) : null;
    const dueDate = new Date(emi.dueDate);

    // If paid on or before due date (advance or on time)
    const isPaidOnTimeOrAdvance = paidDate ? paidDate <= dueDate : false;
    
    // If paidAmount matches exact principal + interest (no penalty collected)
    const exactEMIOnly = Math.abs((emi.paidAmount || 0) - emi.totalAmount) < 1;

    if (isPaidOnTimeOrAdvance || exactEMIOnly) {
      console.log(`Clearing ghost penalty for loan ${emi.offlineLoan?.loanNumber} (EMI #${emi.installmentNumber}): penaltyPaid was ${emi.penaltyPaid}, penaltyAmount was ${emi.penaltyAmount}`);
      await db.offlineLoanEMI.update({
        where: { id: emi.id },
        data: {
          penaltyPaid: 0,
          penaltyAmount: 0,
          daysOverdue: 0
        }
      });
      updatedCount++;
    }
  }

  console.log(`--- RECONCILIATION COMPLETE: Cleaned ${updatedCount} EMI records ---`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
