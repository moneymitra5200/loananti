import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: 'mysql://u366636586_new_loan:Mahadev%406163@77.37.35.177:3306/u366636586_new_loan'
});

async function main() {
  // Fix Company 1 (MONEY MITRA)
  const company1 = await prisma.user.update({
    where: { email: 'company1@test.com' },
    data: { companyId: 'cmnol82e50000im20xengy3nk' },
    select: { id: true, email: true, name: true, companyId: true }
  });
  console.log('✅ Fixed Company 1:', company1);
  
  // Fix Company 2 (KESARDEEP)
  const company2 = await prisma.user.update({
    where: { email: 'company2@test.com' },
    data: { companyId: 'cmnol8i820005im20xiz1n874' },
    select: { id: true, email: true, name: true, companyId: true }
  });
  console.log('✅ Fixed Company 2:', company2);
  
  // Verify all company users now have companyId
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
  
  console.log('\n=== FIXED COMPANY USERS ===');
  console.log(JSON.stringify(companyUsers, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
