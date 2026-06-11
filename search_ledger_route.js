const fs = require('fs');
const code = fs.readFileSync('src/app/api/offline-loan/route.ts', 'utf8');
const lines = code.split('\n');
lines.forEach((line, index) => {
  if (line.includes('isInterestOnly') || line.includes('isInterestOnlyLoan')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
