const fs = require('fs');
const f = 'c:/Users/bscom/Desktop/reallll/src/components/cashier/modules/DisbursementDialog.tsx';
let c = fs.readFileSync(f, 'utf8');
c = c.replace("import { ScrollArea } from '@/components/ui/scroll-area';\n", '');
fs.writeFileSync(f, c);
console.log('Cleaned ScrollArea import');
