const companies = [
  { code: 'KM', id: 'cmnromrpl0000xj7nal9vp2ky' },
  { code: 'MM', id: 'cmnroraaz0000h1on8xt96nh8' },
  { code: 'PD', id: 'cmnrov0qf0000wkwrht7etsal' },
  { code: 'C3', id: 'cmq0sdura0000oweseq4j4xkj' },
  { code: 'C1', id: 'cmq0sdvhy0001owes4zr8gemk' },
  { code: 'TCO', id: 'cmq88ud5300004ufg8z7k5ary' }
];

async function main() {
  for (const c of companies) {
    console.log(`\n========================================`);
    console.log(`Triggering recalculate for ${c.code} (${c.id})...`);
    try {
      const response = await fetch('http://localhost:3000/api/accounting/recalculate-balances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ companyId: c.id })
      });
      const data = await response.json();
      console.log('Response Status:', response.status);
      console.log('Response Data:', JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Error triggering recalculate:', err.message);
    }
  }
}

main();
