const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  try {
    const companies = await prisma.company.findMany({
      select: { id: true, name: true, code: true, isMirrorCompany: true }
    });

    const loans = await prisma.loanApplication.findMany({
      select: {
        id: true,
        applicationNo: true,
        companyId: true,
        customerId: true,
        status: true,
        requestedAmount: true,
        loanAmount: true,
        processingFee: true,
        disbursedAmount: true,
        disbursedAt: true,
        disbursementMode: true
      }
    });

    const cashBooks = await prisma.cashBook.findMany();
    const bankAccounts = await prisma.bankAccount.findMany();

    const journalEntries = await prisma.journalEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        lines: {
          include: {
            account: {
              select: { accountCode: true, accountName: true, accountType: true }
            }
          }
        }
      }
    });

    const chartOfAccounts = await prisma.chartOfAccount.findMany({
      select: { id: true, companyId: true, accountCode: true, accountName: true, currentBalance: true, accountType: true }
    });

    fs.writeFileSync('diagnostic_output.json', JSON.stringify({
      companies,
      loans,
      cashBooks,
      bankAccounts,
      journalEntries,
      chartOfAccounts
    }, null, 2), 'utf8');
    console.log('Done');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
