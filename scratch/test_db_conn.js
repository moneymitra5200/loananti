const { PrismaClient } = require('@prisma/client');

async function test() {
  const url = "mysql://u366636586_dhruvilchitrod:Mahadev%406163@srv914.hstgr.io:3306/u366636586_anigrativ_loan";
  process.env.DATABASE_URL = url;
  
  console.log("Connecting with URL:", url);
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url
      }
    }
  });

  try {
    const counts = await prisma.offlineLoan.count();
    console.log("Success! Offline loans count:", counts);
    
    const customers = await prisma.customer.findMany({ take: 5 });
    console.log("Found customers:", customers.map(c => c.name));
  } catch (e) {
    console.error("Connection failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
