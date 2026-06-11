const fs = require('fs');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
const lines = schema.split('\n');
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('offlineloan')) {
    console.log(`${index + 1}: ${line}`);
  }
});
