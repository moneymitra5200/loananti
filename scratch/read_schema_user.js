const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const content = fs.readFileSync(schemaPath, 'utf8');

const lines = content.split('\n');
let insideUser = false;
let userLines = [];

for (let line of lines) {
  if (line.includes('model User ')) {
    insideUser = true;
  }
  if (insideUser) {
    userLines.push(line);
    if (line.trim() === '}') {
      insideUser = false;
      break;
    }
  }
}

console.log('User Model:');
console.log(userLines.join('\n'));

// Also search for UserRole enum or similar
let insideEnum = false;
let enumLines = [];
for (let line of lines) {
  if (line.includes('enum ') && line.includes('Role')) {
    insideEnum = true;
  }
  if (insideEnum) {
    enumLines.push(line);
    if (line.trim() === '}') {
      insideEnum = false;
      console.log('\nRole Enum:');
      console.log(enumLines.join('\n'));
      enumLines = [];
    }
  }
}
