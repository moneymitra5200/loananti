const fs = require('fs');
const path = require('path');

const root = process.argv[2] || 'src';
const query = process.argv[3] || 'recordEMIPayment';

console.log(`Searching for "${query}" in "${root}":`);

function walk(dir) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        walk(full);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.json')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.toLowerCase().includes(query.toLowerCase())) {
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes(query.toLowerCase())) {
            console.log(`${full}:${idx + 1}: ${line.trim().slice(0, 120)}`);
          }
        });
      }
    }
  }
}

walk(root);
