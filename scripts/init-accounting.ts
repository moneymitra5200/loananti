/**
 * Initialize Chart of Accounts for all companies
 * Run with: npx tsx scripts/init-accounting.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMPLETE_CHART_OF_ACCOUNTS = [
  // ASSETS
  { accountCode: '1000', accountName: 'Current Assets', accountType: 'ASSET', isSystemAccount: true, description: 'Assets that can be converted to cash within 1 year' },
  { accountCode: '1100', accountName: 'Cash and Cash Equivalents', accountType: 'ASSET', isSystemAccount: true, description: 'Cash on hand' },
  { accountCode: '1101', accountName: 'Cash in Hand', accountType: 'ASSET', isSystemAccount: true, description: 'Physical cash on hand' },
  { accountCode: '1200', accountName: 'Loans Receivable', accountType: 'ASSET', isSystemAccount: true, description: 'Money given as loans to customers' },
  { accountCode: '1201', accountName: 'Online Loans Receivable', accountType: 'ASSET', isSystemAccount: true, description: 'Online loans principal outstanding' },
  { accountCode: '1210', accountName: 'Offline Loans Receivable', accountType: 'ASSET', isSystemAccount: true, description: 'Offline loans principal outstanding' },
  { accountCode: '1300', accountName: 'Accounts Receivable', accountType: 'ASSET', isSystemAccount: true, description: 'Money owed to the business' },
  { accountCode: '1301', accountName: 'Interest Receivable', accountType: 'ASSET', isSystemAccount: true, description: 'Interest accrued but not received' },
  { accountCode: '1302', accountName: 'EMI Receivable', accountType: 'ASSET', isSystemAccount: true, description: 'EMI due but not paid' },
  { accountCode: '1303', accountName: 'Processing Fee Receivable', accountType: 'ASSET', isSystemAccount: true, description: 'Processing fees to be collected' },
  { accountCode: '1304', accountName: 'Penalty Receivable', accountType: 'ASSET', isSystemAccount: true, description: 'Late payment penalties receivable' },
  
  // LIABILITIES
  { accountCode: '2000', accountName: 'Current Liabilities', accountType: 'LIABILITY', isSystemAccount: true, description: 'Obligations due within 1 year' },
  { accountCode: '2001', accountName: 'Accounts Payable', accountType: 'LIABILITY', isSystemAccount: true, description: 'Money owed to vendors' },
  { accountCode: '2002', accountName: 'Salary Payable', accountType: 'LIABILITY', isSystemAccount: true, description: 'Salaries owed to employees' },
  { accountCode: '2003', accountName: 'Interest Payable', accountType: 'LIABILITY', isSystemAccount: true, description: 'Interest owed on borrowed funds' },
  { accountCode: '2100', accountName: 'Long-term Liabilities', accountType: 'LIABILITY', isSystemAccount: true, description: 'Obligations due after 1 year' },
  { accountCode: '2101', accountName: 'Bank Loans', accountType: 'LIABILITY', isSystemAccount: true, description: 'Loans from banks for capital' },
  { accountCode: '2110', accountName: 'Investor Capital', accountType: 'LIABILITY', isSystemAccount: true, description: 'Capital from investors' },
  { accountCode: '2120', accountName: 'Borrowed Funds', accountType: 'LIABILITY', isSystemAccount: true, description: 'Funds borrowed from other sources' },
  
  // EQUITY
  { accountCode: '3000', accountName: 'Equity', accountType: 'EQUITY', isSystemAccount: true, description: 'Owner\'s stake in business' },
  { accountCode: '3001', accountName: 'Opening Balance Equity', accountType: 'EQUITY', isSystemAccount: true, description: 'Initial capital from bank + cash' },
  { accountCode: '3002', accountName: 'Owner\'s Capital', accountType: 'EQUITY', isSystemAccount: true, description: 'Owner\'s capital investment' },
  { accountCode: '3003', accountName: 'Retained Earnings', accountType: 'EQUITY', isSystemAccount: true, description: 'Accumulated profits from previous years' },
  { accountCode: '3004', accountName: 'Current Year Profit', accountType: 'EQUITY', isSystemAccount: true, description: 'Profit/loss for current year' },
  
  // INCOME
  { accountCode: '4000', accountName: 'Income', accountType: 'INCOME', isSystemAccount: true, description: 'Revenue earned' },
  { accountCode: '4100', accountName: 'Operating Income', accountType: 'INCOME', isSystemAccount: true, description: 'Income from core business' },
  { accountCode: '4110', accountName: 'Interest Income', accountType: 'INCOME', isSystemAccount: true, description: 'Interest earned on loans' },
  { accountCode: '4111', accountName: 'Interest Income - Online Loans', accountType: 'INCOME', isSystemAccount: true, description: 'Interest from online loans' },
  { accountCode: '4112', accountName: 'Interest Income - Offline Loans', accountType: 'INCOME', isSystemAccount: true, description: 'Interest from offline loans' },
  { accountCode: '4113', accountName: 'Interest Income - Mirror Loans', accountType: 'INCOME', isSystemAccount: true, description: 'Interest profit from mirror loans' },
  { accountCode: '4120', accountName: 'Fee Income', accountType: 'INCOME', isSystemAccount: true, description: 'Fees collected' },
  { accountCode: '4121', accountName: 'Processing Fee Income', accountType: 'INCOME', isSystemAccount: true, description: 'Processing fees collected' },
  { accountCode: '4122', accountName: 'Late Fee Income', accountType: 'INCOME', isSystemAccount: true, description: 'Late payment charges' },
  { accountCode: '4123', accountName: 'Bounce Charges Income', accountType: 'INCOME', isSystemAccount: true, description: 'Cheque/ECS bounce charges' },
  { accountCode: '4124', accountName: 'Foreclosure Charges', accountType: 'INCOME', isSystemAccount: true, description: 'Foreclosure/prepayment fees' },
  { accountCode: '4200', accountName: 'Other Income', accountType: 'INCOME', isSystemAccount: true, description: 'Non-operating income' },
  { accountCode: '4201', accountName: 'Bank Interest Received', accountType: 'INCOME', isSystemAccount: true, description: 'Interest from bank deposits' },
  
  // EXPENSES
  { accountCode: '5000', accountName: 'Expenses', accountType: 'EXPENSE', isSystemAccount: true, description: 'Costs incurred' },
  { accountCode: '5100', accountName: 'Operating Expenses', accountType: 'EXPENSE', isSystemAccount: true, description: 'Day-to-day business costs' },
  { accountCode: '5110', accountName: 'Employee Expenses', accountType: 'EXPENSE', isSystemAccount: true, description: 'Staff-related costs' },
  { accountCode: '5111', accountName: 'Staff Salary', accountType: 'EXPENSE', isSystemAccount: true, description: 'Employee salaries' },
  { accountCode: '5120', accountName: 'Administrative Expenses', accountType: 'EXPENSE', isSystemAccount: true, description: 'Office administration costs' },
  { accountCode: '5121', accountName: 'Office Rent', accountType: 'EXPENSE', isSystemAccount: true, description: 'Office rent expense' },
  { accountCode: '5122', accountName: 'Utilities', accountType: 'EXPENSE', isSystemAccount: true, description: 'Electricity, water, internet' },
  { accountCode: '5130', accountName: 'Professional Fees', accountType: 'EXPENSE', isSystemAccount: true, description: 'Professional services' },
  { accountCode: '5131', accountName: 'Audit Fees', accountType: 'EXPENSE', isSystemAccount: true, description: 'Audit and accounting fees' },
  { accountCode: '5132', accountName: 'Legal Fees', accountType: 'EXPENSE', isSystemAccount: true, description: 'Legal consultation fees' },
  { accountCode: '5140', accountName: 'Marketing & Travel', accountType: 'EXPENSE', isSystemAccount: true, description: 'Marketing and travel costs' },
  { accountCode: '5141', accountName: 'Marketing Expense', accountType: 'EXPENSE', isSystemAccount: true, description: 'Marketing and advertising' },
  { accountCode: '5142', accountName: 'Travel Expense', accountType: 'EXPENSE', isSystemAccount: true, description: 'Travel and conveyance' },
  { accountCode: '5200', accountName: 'Financial Expenses', accountType: 'EXPENSE', isSystemAccount: true, description: 'Finance-related costs' },
  { accountCode: '5201', accountName: 'Interest Expense', accountType: 'EXPENSE', isSystemAccount: true, description: 'Interest paid on borrowed funds' },
  { accountCode: '5202', accountName: 'Interest Expense - Bank Loans', accountType: 'EXPENSE', isSystemAccount: true, description: 'Interest paid to banks' },
  { accountCode: '5203', accountName: 'Bank Charges', accountType: 'EXPENSE', isSystemAccount: true, description: 'Bank transaction fees' },
  { accountCode: '5204', accountName: 'Commission Paid', accountType: 'EXPENSE', isSystemAccount: true, description: 'Agent commissions' },
  { accountCode: '5300', accountName: 'Bad Debts & Provisions', accountType: 'EXPENSE', isSystemAccount: true, description: 'Loan losses and provisions' },
  { accountCode: '5301', accountName: 'Bad Debt Written Off', accountType: 'EXPENSE', isSystemAccount: true, description: 'Uncollectible loans written off' },
  { accountCode: '5302', accountName: 'Provision for Bad Debts', accountType: 'EXPENSE', isSystemAccount: true, description: 'Provision for potential losses' },
  { accountCode: '5400', accountName: 'Depreciation', accountType: 'EXPENSE', isSystemAccount: true, description: 'Asset depreciation' },
];

async function main() {
  console.log('Starting Chart of Accounts initialization...\n');
  
  // Get all companies
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true }
  });
  
  console.log(`Found ${companies.length} companies:\n`);
  companies.forEach(c => console.log(`  - ${c.name} (${c.code}): ${c.id}`));
  console.log('');
  
  for (const company of companies) {
    console.log(`\nInitializing ${company.name}...`);
    
    // Check if already initialized
    const existingCount = await prisma.chartOfAccount.count({
      where: { companyId: company.id }
    });
    
    if (existingCount > 0) {
      console.log(`  ✓ Already has ${existingCount} accounts, skipping...`);
      continue;
    }
    
    // Create accounts
    for (const account of COMPLETE_CHART_OF_ACCOUNTS) {
      await prisma.chartOfAccount.create({
        data: {
          companyId: company.id,
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountType: account.accountType as any,
          isSystemAccount: account.isSystemAccount,
          description: account.description,
          isActive: true,
          openingBalance: 0,
          currentBalance: 0
        }
      });
    }
    
    console.log(`  ✓ Created ${COMPLETE_CHART_OF_ACCOUNTS.length} accounts`);
    
    // Create default bank account if not exists
    const existingBank = await prisma.bankAccount.findFirst({
      where: { companyId: company.id }
    });
    
    if (!existingBank) {
      await prisma.bankAccount.create({
        data: {
          companyId: company.id,
          bankName: 'Default Bank',
          accountNumber: `${company.code}-001`,
          accountName: 'Operating Account',
          accountType: 'CURRENT',
          openingBalance: 0,
          currentBalance: 0,
          isDefault: true,
          isActive: true
        }
      });
      console.log(`  ✓ Created default bank account`);
    }
    
    // Create cashbook if not exists
    const existingCashbook = await prisma.cashBook.findUnique({
      where: { companyId: company.id }
    });
    
    if (!existingCashbook) {
      await prisma.cashBook.create({
        data: {
          companyId: company.id,
          currentBalance: 0
        }
      });
      console.log(`  ✓ Created cashbook`);
    }
    
    // Create financial year if not exists
    const currentYear = new Date().getFullYear();
    const yearName = `FY ${currentYear}-${currentYear + 1}`;
    
    const existingFY = await prisma.financialYear.findFirst({
      where: { companyId: company.id, name: yearName }
    });
    
    if (!existingFY) {
      const startDate = new Date(currentYear, 3, 1); // April 1
      const endDate = new Date(currentYear + 1, 2, 31); // March 31
      
      await prisma.financialYear.create({
        data: {
          companyId: company.id,
          name: yearName,
          startDate,
          endDate,
          isClosed: false
        }
      });
      console.log(`  ✓ Created financial year ${yearName}`);
    }
  }
  
  console.log('\n✅ Chart of Accounts initialization complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
