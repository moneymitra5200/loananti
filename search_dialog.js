const fs = require('fs');

const content = fs.readFileSync('c:\\Users\\bscom\\Desktop\\reallll\\src\\components\\loan\\sections\\EMIPaymentDialog.tsx', 'utf8');
const lines = content.split('\n');

let submitStart = -1;
lines.forEach((line, index) => {
  if (line.includes('handleSubmit') || line.includes('handlePay') || line.includes('onPay') || line.includes('onSubmit') || line.includes('const handle')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
