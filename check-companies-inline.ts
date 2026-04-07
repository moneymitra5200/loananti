import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: 'mysql://u366636586_new_loan:Mahadev%406163@77.37.35.177:3306/u366636586_new_loan'
});

async function main() {
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      isMirrorCompany: true
    }
  });
  
  console.log('=== ALL COMPANIES ===');
  console.log(JSON.stringify(companies, null, 2));
  
  const companyUsers = await prisma.user.findMany({
    where: { role: 'COMPANY' },
    select: {
      id: true,
      email: true,
      name: true,
      companyId: true,
      company: {
        select: { id: true, name: true, code: true, isMirrorCompany: true }
      }
    }
  });
  
  console.log('\n=== COMPANY USERS ===');
  console.log(JSON.stringify(companyUsers, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
