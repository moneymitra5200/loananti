const fs = require('fs');
const path = require('path');

try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    for (const line of envConfig.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value.trim();
      }
    }
  }
} catch (e) {
  console.error('Error loading .env file:', e);
}

const { db } = require('./src/lib/db');

async function main() {
  const loans = await db.offlineLoan.findMany({
    where: {
      OR: [
        { loanNumber: { contains: '00012' } },
        { loanNumber: { contains: 'C3' } },
        { loanNumber: { contains: 'C2' } }
      ]
    },
    include: {
      emis: true
    }
  });
  console.log('Found offline loans:', JSON.stringify(loans, null, 2));
  await db.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
