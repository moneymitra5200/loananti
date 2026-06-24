import { POST } from '../src/app/api/accounting/recalculate-balances/route';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';

const db = new PrismaClient();

async function run() {
  const companies = await db.company.findMany();
  for (const c of companies) {
    console.log(`\n=== Recalculating for Company: ${c.name} (${c.code} / ${c.id}) ===`);
    const mockReq = new NextRequest(`http://localhost/api/accounting/recalculate-balances`, {
      method: 'POST',
      body: JSON.stringify({ companyId: c.id }),
    });

    try {
      const res = await POST(mockReq);
      const data = await res.json();
      console.log(`Success:`, data.success);
      console.log(`Message:`, data.message);
      if (data.log) {
        console.log(`Log snippets:`);
        data.log.slice(-3).forEach((l: string) => console.log(`  - ${l}`));
      }
      if (data.warnings && data.warnings.length > 0) {
        console.log(`Warnings:`);
        data.warnings.forEach((w: string) => console.log(`  - ${w}`));
      }
    } catch (err) {
      console.error(`Error recalculating for ${c.code}:`, err);
    }
  }
}

run().catch(console.error).finally(() => db.$disconnect());
