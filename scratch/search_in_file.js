const fs = require('fs');

function search(filePath, pattern) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes(pattern)) {
      console.log(`\n=== MATCH IN ${filePath}:${idx + 1} ===`);
      for (let i = Math.max(0, idx - 5); i <= Math.min(lines.length - 1, idx + 5); i++) {
        console.log(`${i + 1}: ${lines[i]}`);
      }
    }
  });
}

search('src/lib/accounting-service.ts', 'PRINCIPAL_ONLY_PAYMENT');
search('src/app/api/loan/close/route.ts', 'PRINCIPAL_ONLY_PAYMENT');
