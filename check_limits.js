const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const loanId = "cmpnzdjxo003md5u9semgi74q"; // from the screenshot URL: /customer/loan/cmpnzdjxo003md5u9semgi74q
  const settings = await prisma.paymentOptionSettings.findFirst({
    where: { loanApplicationId: loanId }
  });
  console.log("Settings:", settings);
  
  const existingInterestOnly = await prisma.paymentRequest.count({
    where: {
      loanApplicationId: loanId,
      paymentType: 'INTEREST_ONLY',
      status: 'APPROVED'
    }
  });
  console.log("Existing Interest Only payments:", existingInterestOnly);
}
check().finally(() => prisma.$disconnect());
