const fs = require('fs');
const content = fs.readFileSync('src/app/api/accounting/personal-ledger/route.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('getSingleLoanLedger')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
