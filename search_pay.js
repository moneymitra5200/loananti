const fs = require('fs');

const content = fs.readFileSync('c:\\Users\\bscom\\Desktop\\reallll\\src\\app\\api\\emi\\pay\\route.ts', 'utf8');
const lines = content.split('\n');

for (let i = 540; i <= 600; i++) {
  console.log(`${i}: ${lines[i - 1]}`);
}
