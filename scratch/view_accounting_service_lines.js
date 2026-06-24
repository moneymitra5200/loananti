const fs = require('fs');
const content = fs.readFileSync('src/lib/accounting-service.ts', 'utf8');
const lines = content.split('\n');
for (let i = 1049; i <= 1099; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
