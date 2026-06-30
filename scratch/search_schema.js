const fs = require('fs');
const content = fs.readFileSync('prisma/schema.prisma', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('mirror')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
