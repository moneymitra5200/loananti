import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService } from '@/lib/accounting-service';

// Expense type → account code mapping (must match DEFAULT_CHART_OF_ACCOUNTS in accounting-service.ts)
const EXPENSE_ACCOUNT_CODES: Record<string, string> = {
  SALARY:            '5101', // Salaries & Wages
  OFFICE_RENT:       '5102', // Rent Expense
  UTILITIES:         '5103', // Electricity & Utilities
  TELECOMMUNICATION: '5103', // Utilities
  OFFICE_SUPPLIES:   '5104', // Office Supplies
  TRAVEL:            '5106', // Travel & Conveyance
  CONVEYANCE:        '5106', // Travel & Conveyance
  MARKETING:         '5107', // Marketing Expense
  ADVERTISEMENT:     '5107', // Marketing Expense
  BANK_CHARGES:      '5203', // Bank Charges
  COMMISSION:        '5202', // Commission Paid
  SOFTWARE:          '5400', // Miscellaneous Expense
  PROFESSIONAL_FEES: '5400', // Miscellaneous Expense
  INSURANCE:         '5400', // Miscellaneous Expense
  TAX_PAID:          '5400', // Miscellaneous Expense
  MAINTENANCE:       '5100', // Operating Expenses
  MISCELLANEOUS:     '5400', // Miscellaneous Expense
};


// Helper: post accounting journal + deduct from bank/cash
async function postToAccounting(tx: any, expenseId: string, expense: any, adminId: string, bankAccount: any | null, paymentSource: string) {
  let newBankBalance: number | undefined;
  let newCashBalance: number | undefined;

  if (paymentSource === 'BANK' && bankAccount) {
    newBankBalance = bankAccount.currentBalance - expense.amount;
    await tx.bankAccount.update({ where: { id: bankAccount.id }, data: { currentBalance: newBankBalance } });
    await tx.bankTransaction.create({
      data: {
        bankAccountId: bankAccount.id,
        transactionType: 'DEBIT',
        amount: expense.amount,
        balanceAfter: newBankBalance,
        description: `Expense: ${expense.description}`,
        referenceType: 'EXPENSE_ENTRY',
        referenceId: expenseId,
        createdById: adminId,
        transactionDate: new Date(),
      },
    });
  } else {
    // Cash book
    let cashBook = await tx.cashBook.findFirst({ where: { companyId: expense.companyId } });
    if (!cashBook) {
      cashBook = await tx.cashBook.create({
        data: { companyId: expense.companyId, currentBalance: 0 },
      });
    }
    newCashBalance = cashBook.currentBalance - expense.amount;
    await tx.cashBook.update({ where: { id: cashBook.id }, data: { currentBalance: newCashBalance } });
    await tx.cashBookEntry.create({
      data: {
        cashBookId: cashBook.id,
        entryType: 'DEBIT',
        amount: expense.amount,
        balanceAfter: newCashBalance,
        description: `Expense: ${expense.description}`,
        referenceType: 'EXPENSE_ENTRY',
        referenceId: expenseId,
        createdById: adminId,
      },
    });
  }

  return { newBankBalance, newCashBalance };
}

// Non-blocking journal entry
async function createJournalEntry(companyId: string, expense: any, createdById: string, bankAccountId?: string, paymentMode?: string) {
  try {
    const accountCode = EXPENSE_ACCOUNT_CODES[expense.expenseType || 'MISCELLANEOUS'] || '4800';
    const accountingService = new AccountingService(companyId);
    await accountingService.initializeChartOfAccounts();
    await accountingService.recordExpense({
      expenseId: expense.id,
      expenseType: expense.expenseType || 'MISCELLANEOUS',
      expenseAccountCode: accountCode,
      amount: expense.amount,
      description: expense.description,
      expenseDate: new Date(),
      createdById,
      paymentMode: paymentMode || 'CASH',
      bankAccountId,
      isPayable: false,
    });
  } catch (err) {
    console.error('[ExpenseRequest] Journal entry failed (non-critical):', err);
  }
}

// ------------------------------------------------------------
// GET — Fetch expense requests
// ?role=CASHIER&userId=xxx   → own requests
// ?role=SUPER_ADMIN           → all pending requests (status filter available)
// ?status=PENDING|APPROVED|REJECTED|ALL
// ------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status'); // PENDING | APPROVED | REJECTED | ALL
    const companyId = searchParams.get('companyId');
    const limit = parseInt(searchParams.get('limit') || '100');

    const where: any = {};
    if (companyId) where.companyId = companyId;

    // categoryId stores status: PENDING | APPROVED | REJECTED
    if (status && status !== 'ALL') {
      where.categoryId = status;
    }

    // Cashier: only see own submissions
    if (role === 'CASHIER' && userId) {
      where.payeeId = userId;
    }

    // Default Super Admin view: show all pending if no explicit status
    if (role === 'SUPER_ADMIN' && !status) {
      where.categoryId = 'PENDING';
    }

    const requests = await db.expense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error('[ExpenseRequest] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch expense requests' }, { status: 500 });
  }
}

// ------------------------------------------------------------
// POST — Submit or directly post expense
// body: { role, userId, companyId, expenseType, description, amount,
//         paymentSource: 'BANK'|'CASH', bankAccountId?, remarks? }
// CASHIER → creates PENDING request (no accounting yet)
// SUPER_ADMIN | ACCOUNTANT → posts directly (accounting immediately)
// ------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, userId, companyId, expenseType, description, amount, paymentSource, bankAccountId, remarks } = body;

    if (!description || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Description and valid amount are required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Resolve company
    let effectiveCompanyId = companyId || 'default';
    if (effectiveCompanyId === 'default') {
      const anyCompany = await db.company.findFirst();
      if (anyCompany) effectiveCompanyId = anyCompany.id;
    }

    const isCashier = role === 'CASHIER';
    const isDirect = role === 'SUPER_ADMIN' || role === 'ACCOUNTANT';

    // Generate expense number
    const count = await db.expense.count({ where: { companyId: effectiveCompanyId } });
    const expenseNumber = `EXP${String(count + 1).padStart(6, '0')}`;

    if (isCashier) {
      // Cashier: create pending request — no accounting, no balance deduction yet
      const expense = await db.expense.create({
        data: {
          companyId: effectiveCompanyId,
          expenseNumber,
          expenseType: expenseType || 'MISCELLANEOUS',
          description,
          amount,
          paymentDate: new Date(),
          paymentMode: paymentSource === 'BANK' ? 'BANK_TRANSFER' : 'CASH',
          paymentReference: bankAccountId || null, // store selected bank account id
          payeeName: paymentSource || 'CASH',      // store payment source preference
          payeeId: userId,                          // requesting cashier
          categoryId: 'PENDING',                   // request status
          isApproved: false,
          createdById: userId,
          remarks: remarks || null,
        },
      });
      return NextResponse.json({ success: true, expense, message: 'Expense request submitted for Super Admin approval' });
    }

    if (isDirect) {
      const resolvedPaymentMode = paymentSource === 'BANK' ? 'BANK_TRANSFER' : 'CASH';

      // Find bank account
      let bankAccount: any = null;
      if (paymentSource === 'BANK') {
        if (bankAccountId) {
          bankAccount = await db.bankAccount.findUnique({ where: { id: bankAccountId } });
        }
        if (!bankAccount) {
          bankAccount = await db.bankAccount.findFirst({
            where: { companyId: effectiveCompanyId, isActive: true, isDefault: true },
          });
        }
        if (!bankAccount) {
          bankAccount = await db.bankAccount.findFirst({ where: { companyId: effectiveCompanyId, isActive: true } });
        }
        if (!bankAccount) {
          return NextResponse.json({ error: 'No bank account found. Please use Cash or configure a bank account.' }, { status: 400 });
        }
      }

      const result = await db.$transaction(async (tx) => {
        const expense = await tx.expense.create({
          data: {
            companyId: effectiveCompanyId,
            expenseNumber,
            expenseType: expenseType || 'MISCELLANEOUS',
            description,
            amount,
            paymentDate: new Date(),
            paymentMode: resolvedPaymentMode,
            paymentReference: bankAccount?.id || null,
            payeeName: paymentSource || 'CASH',
            payeeId: userId,
            categoryId: 'APPROVED',
            isApproved: true,
            approvedById: userId,
            approvedAt: new Date(),
            createdById: userId,
            remarks: remarks || null,
          },
        });

        const balances = await postToAccounting(tx, expense.id, expense, userId, bankAccount, paymentSource);
        return { expense, ...balances, bankAccount };
      });

      // Journal entry (non-blocking)
      await createJournalEntry(effectiveCompanyId, result.expense, userId, bankAccount?.id, resolvedPaymentMode);

      return NextResponse.json({
        success: true,
        expense: result.expense,
        newBankBalance: result.newBankBalance,
        newCashBalance: result.newCashBalance,
        bankName: result.bankAccount?.bankName,
        message: 'Expense recorded successfully in accounting',
      });
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  } catch (error) {
    console.error('[ExpenseRequest] POST error:', error);
    return NextResponse.json({ error: 'Failed to process expense' }, { status: 500 });
  }
}

// ------------------------------------------------------------
// PUT — Super Admin approves or rejects a cashier's pending request
// body: { id, action: 'APPROVE'|'REJECT', adminId, rejectionReason? }
// ------------------------------------------------------------
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, adminId, rejectionReason } = body;

    if (!id || !action || !adminId) {
      return NextResponse.json({ error: 'id, action and adminId are required' }, { status: 400 });
    }

    const expense = await db.expense.findUnique({ where: { id } });
    if (!expense) return NextResponse.json({ error: 'Expense request not found' }, { status: 404 });
    if (expense.categoryId !== 'PENDING') {
      return NextResponse.json({ error: 'This request has already been processed' }, { status: 400 });
    }

    if (action === 'REJECT') {
      await db.expense.update({
        where: { id },
        data: {
          categoryId: 'REJECTED',
          isApproved: false,
          approvedById: adminId,
          approvedAt: new Date(),
          remarks: rejectionReason || 'Rejected by admin',
        },
      });
      return NextResponse.json({ success: true, message: 'Expense request rejected' });
    }

    if (action === 'APPROVE') {
      const paymentSource = expense.payeeName || 'CASH'; // cashier stored their preference here
      const storedBankAccountId = expense.paymentReference; // cashier stored bank account id here

      let bankAccount: any = null;
      if (paymentSource === 'BANK') {
        if (storedBankAccountId) {
          bankAccount = await db.bankAccount.findUnique({ where: { id: storedBankAccountId } });
        }
        if (!bankAccount) {
          bankAccount = await db.bankAccount.findFirst({
            where: { companyId: expense.companyId, isActive: true, isDefault: true },
          });
        }
        if (!bankAccount) {
          bankAccount = await db.bankAccount.findFirst({ where: { companyId: expense.companyId, isActive: true } });
        }
      }

      const result = await db.$transaction(async (tx) => {
        // Mark approved
        await tx.expense.update({
          where: { id },
          data: {
            categoryId: 'APPROVED',
            isApproved: true,
            approvedById: adminId,
            approvedAt: new Date(),
          },
        });

        const balances = await postToAccounting(tx, expense.id, expense, adminId, bankAccount, paymentSource);
        return { ...balances, bankAccount };
      });

      // Journal entry (non-blocking)
      await createJournalEntry(expense.companyId, expense, adminId, bankAccount?.id, paymentSource === 'BANK' ? 'BANK_TRANSFER' : 'CASH');

      return NextResponse.json({
        success: true,
        message: 'Expense approved and posted to accounting',
        newBankBalance: result.newBankBalance,
        newCashBalance: result.newCashBalance,
        bankName: result.bankAccount?.bankName,
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use APPROVE or REJECT' }, { status: 400 });
  } catch (error) {
    console.error('[ExpenseRequest] PUT error:', error);
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 });
  }
}
