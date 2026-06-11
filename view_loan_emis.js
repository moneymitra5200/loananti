const fs = require('fs');
const path = require('path');

// Manually load .env to avoid package issues
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

// Print database url to debug
console.log('DATABASE_URL loaded in node process:', process.env.DATABASE_URL);

const { db } = require('./src/lib/db');

async function main() {
  const count = await db.offlineLoan.count();
  console.log('Total offline loans in DB:', count);

  const someLoans = await db.offlineLoan.findMany({
    take: 10,
    select: { loanNumber: true, status: true, isMirrorLoan: true }
  });
  console.log('Sample loans:', someLoans);

  await db.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
