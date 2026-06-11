const fs = require('fs');
const path = require('path');

try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    for (const line of envConfig.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value.trim();
      }
    }
  }
} catch (e) {
  console.error('Error loading .env file:', e);
}

const { db } = require('./src/lib/db');

async function main() {
  const jes = await db.journalEntry.findMany({
    include: {
      lines: {
        include: {
          account: true
        }
      }
    }
  });
  console.log('Total Journal Entries:', jes.length);
  for (const je of jes) {
    console.log(`JE: ID=${je.id} | Date=${je.entryDate.toISOString()} | RefType=${je.referenceType} | RefId=${je.referenceId} | Narration=${je.narration} | CompanyId=${je.companyId}`);
    for (const l of je.lines) {
      console.log(`  Line: Account=${l.account.accountCode} (${l.account.accountName}) | Dr=${l.debitAmount} | Cr=${l.creditAmount} | LoanId=${l.loanId}`);
    }
  }

  // Also print all offline loan EMIs in the DB
  const emis = await db.offlineLoanEMI.findMany();
  console.log('\nTotal Offline Loan EMIs:', emis.length);
  for (const emi of emis) {
    console.log(`EMI: ID=${emi.id} | Inst#=${emi.installmentNumber} | Due=${emi.dueDate.toISOString()} | Status=${emi.paymentStatus} | PaidAmt=${emi.paidAmount} | PaidDate=${emi.paidDate?.toISOString()}`);
  }

  // Also print all offline loans
  const loans = await db.offlineLoan.findMany();
  console.log('\nTotal Offline Loans:', loans.length);
  for (const l of loans) {
    console.log(`Loan: ID=${l.id} | Loan#=${l.loanNumber} | CustName=${l.customerName} | Status=${l.status} | CompanyId=${l.companyId} | isMirror=${l.isMirrorLoan}`);
  }

  await db.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
