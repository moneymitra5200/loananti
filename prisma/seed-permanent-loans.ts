import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Setting up permanent loan products...');

  // Find or create Gold Loan product
  let goldLoan = await prisma.cMSService.findFirst({
    where: { loanType: 'GOLD' }
  });

  if (goldLoan) {
    goldLoan = await prisma.cMSService.update({
      where: { id: goldLoan.id },
      data: {
        isPermanent: true,
        isActive: true,
      },
    });
    console.log('Gold Loan product updated:', goldLoan.id);
  } else {
    goldLoan = await prisma.cMSService.create({
      data: {
        title: 'Gold Loan',
        description: 'Get instant loans against your gold jewelry with attractive interest rates. Quick disbursement with minimal documentation.',
        icon: '🏆',
        loanType: 'GOLD',
        minInterestRate: 7,
        maxInterestRate: 15,
        defaultInterestRate: 10,
        minTenure: 3,
        maxTenure: 36,
        defaultTenure: 12,
        minAmount: 10000,
        maxAmount: 50000000,
        processingFeePercent: 0.5,
        processingFeeMin: 500,
        processingFeeMax: 5000,
        latePaymentPenaltyPercent: 2,
        gracePeriodDays: 7,
        bounceCharges: 500,
        allowMoratorium: false,
        maxMoratoriumMonths: 0,
        allowPrepayment: true,
        prepaymentCharges: 1,
        isPermanent: true,
        isActive: true,
        order: 1,
      },
    });
    console.log('Gold Loan product created:', goldLoan.id);
  }

  // Find or create Vehicle Loan product
  let vehicleLoan = await prisma.cMSService.findFirst({
    where: { loanType: 'VEHICLE' }
  });

  if (vehicleLoan) {
    vehicleLoan = await prisma.cMSService.update({
      where: { id: vehicleLoan.id },
      data: {
        isPermanent: true,
        isActive: true,
      },
    });
    console.log('Vehicle Loan product updated:', vehicleLoan.id);
  } else {
    vehicleLoan = await prisma.cMSService.create({
      data: {
        title: 'Vehicle Loan',
        description: 'Finance your dream vehicle with competitive interest rates. Loans for cars, bikes, and commercial vehicles.',
        icon: '🚗',
        loanType: 'VEHICLE',
        minInterestRate: 8,
        maxInterestRate: 18,
        defaultInterestRate: 12,
        minTenure: 12,
        maxTenure: 84,
        defaultTenure: 36,
        minAmount: 50000,
        maxAmount: 10000000,
        processingFeePercent: 1,
        processingFeeMin: 1000,
        processingFeeMax: 10000,
        latePaymentPenaltyPercent: 3,
        gracePeriodDays: 5,
        bounceCharges: 500,
        allowMoratorium: true,
        maxMoratoriumMonths: 3,
        allowPrepayment: true,
        prepaymentCharges: 2,
        isPermanent: true,
        isActive: true,
        order: 2,
      },
    });
    console.log('Vehicle Loan product created:', vehicleLoan.id);
  }

  console.log('Permanent loan products setup complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
