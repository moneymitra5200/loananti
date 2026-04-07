import { db } from './src/lib/db';

async function main() {
  const companies = await db.company.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      isMirrorCompany: true
    }
  });
  
  console.log('=== ALL COMPANIES ===');
  console.log(JSON.stringify(companies, null, 2));
  
  const companyUsers = await db.user.findMany({
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

main().catch(console.error);
