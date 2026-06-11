const fs = require('fs');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
const lines = schema.split('\n');
let show = false;
lines.forEach((line, index) => {
  if (line.includes('model EMISchedule {')) show = true;
  if (show) {
    console.log(`${index + 1}: ${line}`);
    if (line.includes('}')) show = false;
  }
});
