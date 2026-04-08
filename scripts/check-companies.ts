process.env.DATABASE_URL = "mysql://u366636586_new_loan:Mahadev%406163@77.37.35.177:3306/u366636586_new_loan";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCompanies() {
  const companies = await prisma.company.findMany();
  console.log('Companies:', JSON.stringify(companies, null, 2));
  await prisma.$disconnect();
}

checkCompanies();
