const fs = require('fs');

const content = fs.readFileSync('c:\\Users\\bscom\\Desktop\\reallll\\src\\components\\loan\\LoanDetailPanel.tsx', 'utf8');
const lines = content.split('\n');

let start = -1;
lines.forEach((line, index) => {
  if (line.includes('const handleEMIPayment')) {
    start = index;
  }
});

if (start !== -1) {
  for (let i = start; i <= start + 100; i++) {
    console.log(`${i}: ${lines[i - 1]}`);
  }
}
