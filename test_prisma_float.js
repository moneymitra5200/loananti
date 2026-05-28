
const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
const Decimal = Prisma.Decimal;

async function run() {
  try {
    const val = new Decimal(200);
    // Let's see if we can insert this Decimal into a Float field
    // We'll use Payment.amount which is a Float (wait, is Payment.amount a Decimal or Float?)
    // Let's check schema for JournalLine.debitAmount
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
