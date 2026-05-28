
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const prs = await prisma.paymentRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      loanApplication: true,
      eMISchedule: true,
    }
  });
  
  for (const pr of prs) {
    console.log("PR:", pr.id, pr.status, pr.paymentType, "RequestedAmt:", pr.requestedAmount);
    console.log("EMI ID:", pr.emiScheduleId);
    
    const payments = await prisma.payment.findMany({
      where: { emiScheduleId: pr.emiScheduleId },
      orderBy: { createdAt: 'desc' }
    });
    console.log("Payments for this EMI:", payments.map(p => ({
      id: p.id,
      amount: p.amount,
      principal: p.principalComponent,
      interest: p.interestComponent,
      status: p.status
    })));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
