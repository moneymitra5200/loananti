const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const content = fs.readFileSync(schemaPath, 'utf8');

const lines = content.split('\n');

function printModel(modelName) {
  let inside = false;
  let modelLines = [];
  for (let line of lines) {
    if (line.includes(`model ${modelName} `)) {
      inside = true;
    }
    if (inside) {
      modelLines.push(line);
      if (line.trim() === '}') {
        inside = false;
        break;
      }
    }
  }
  console.log(`\nModel ${modelName}:`);
  console.log(modelLines.join('\n'));
}

printModel('CreditTransaction');
printModel('OfflineLoanEMI');

// Also print PaymentModeType or similar enums
let insideEnum = false;
let enumLines = [];
for (let line of lines) {
  if (line.includes('enum ') && (line.includes('PaymentMode') || line.includes('PaymentType'))) {
    insideEnum = true;
  }
  if (insideEnum) {
    enumLines.push(line);
    if (line.trim() === '}') {
      insideEnum = false;
      console.log(`\nEnum:`);
      console.log(enumLines.join('\n'));
      enumLines = [];
    }
  }
}
