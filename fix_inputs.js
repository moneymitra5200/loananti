const fs = require('fs');
const file = 'c:/Users/bscom/Desktop/reallll/src/components/payment/SecondaryPaymentPagesSection.tsx';
let c = fs.readFileSync(file, 'utf8');

// Fix all onChange to use functional updater (prevents cursor loss on re-render)
c = c.replace(
  /onChange=\{.*?setFormData\(\{ \.\.\.formData, (\w+): e\.target\.value \}\)\}/g,
  (match, field) => `onChange={(e) => setFormData(prev => ({ ...prev, ${field}: e.target.value }))}`
);

// Fix onValueChange for Select elements  
c = c.replace(
  /onValueChange=\{.*?setFormData\(\{ \.\.\.formData, (\w+): value \}\)\}/g,
  (match, field) => `onValueChange={(value) => setFormData(prev => ({ ...prev, ${field}: value }))}`
);

fs.writeFileSync(file, c);
console.log('Fixed', (c.match(/setFormData\(prev/g) || []).length, 'handlers');
