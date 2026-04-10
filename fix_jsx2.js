const fs = require('fs');
const file = 'c:/Users/bscom/Desktop/reallll/src/components/admin/modules/ActiveLoansSection.tsx';
let c = fs.readFileSync(file, 'utf8');

const lines = c.split('\n');
// Line 1291 (0-indexed: 1290) is the extra </div>, remove it
lines.splice(1290, 1);
fs.writeFileSync(file, lines.join('\n'));
console.log('Removed extra line 1291. New lines around area:');
for (let i = 1287; i < 1298; i++) {
  console.log(i+1, lines[i]);
}
