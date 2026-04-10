const fs = require('fs');
const file = 'c:/Users/bscom/Desktop/reallll/src/components/admin/modules/ActiveLoansSection.tsx';
let c = fs.readFileSync(file, 'utf8');

// Show area around line 1291 (approx)
const lines = c.split('\n');
for (let i = 1285; i < 1300; i++) {
  console.log(i+1, JSON.stringify(lines[i]));
}
