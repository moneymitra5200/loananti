const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const pnlRes = await fetch('http://localhost:3000/api/accounting/reports?type=profit-loss&companyId=cm4awu7yo0001yxx526h56w5f').then(r => r.json()).catch(()=>null);
  console.log(JSON.stringify(pnlRes, null, 2));
}
main().finally(() => db.$disconnect());
