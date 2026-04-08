process.env.DATABASE_URL = "mysql://u366636586_new_loan:Mahadev%406163@77.37.35.177:3306/u366636586_new_loan";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, companyId: true, isActive: true }
  });
  console.log('Users:', JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}

checkUsers();
