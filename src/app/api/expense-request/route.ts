import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService } from '@/lib/accounting-service';
import NotificationService from '@/lib/notification-service';

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

// Non-blocking journal entry — awaited so errors are caught, not truly non-blocking
async function createJournalEntry(companyId: string, expense: any, createdById: string, bankAccountId?: string, paymentMode?: string) {
  try {
    if (!companyId) {
      console.error('[ExpenseRequest] createJournalEntry: companyId is empty — skipping');
      return;
    }
    const accountCode = EXPENSE_ACCOUNT_CODES[expense.expenseType || 'MISCELLANEOUS'] || '5400';
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
    console.log(`[ExpenseRequest] ✅ Journal entry created: ${expense.expenseNumber} ₹${expense.amount} in company ${companyId}`);
  } catch (err) {
    console.error('[ExpenseRequest] Journal entry failed:', err);
  }
}

// GET — Fetch expense requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const companyId = searchParams.get('companyId');
    const limit = parseInt(searchParams.get('limit') || '100');

    const where: any = {};
    if (companyId) where.companyId = companyId;

    if (status && status !== 'ALL') {
      where.categoryId = status;
    }
    if (role === 'CASHIER' && userId) {
      where.payeeId = userId;
    }
    if (role === 'SUPER_ADMIN' && !status) {
      where.categoryId = 'PENDING';
    }

    const expenses = await db.expense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Attach requester (cashier) user info for each expense
    const payeeIds = [...new Set(expenses.map((e: any) => e.payeeId).filter(Boolean))];
    const approverIds = [...new Set(expenses.map((e: any) => e.approvedById).filter(Boolean))];
    const allIds = [...new Set([...payeeIds, ...approverIds])];
    const users = allIds.length > 0
      ? await db.user.findMany({ where: { id: { in: allIds as string[] } }, select: { id: true, name: true, role: true } })
      : [];
    const userMap: Record<string, any> = {};
    for (const u of users) userMap[u.id] = u;

    const requests = expenses.map((e: any) => ({
      ...e,
      requester: e.payeeId ? userMap[e.payeeId] || null : null,
      approver:  e.approvedById ? userMap[e.approvedById] || null : null,
    }));

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
      
      // Notify Super Admins
      NotificationService.getUserIdsByRole('SUPER_ADMIN').then(adminIds => {
        if (adminIds.length > 0) {
          NotificationService.createNotificationsForUsers(adminIds, {
            type: 'SYSTEM_ANNOUNCEMENT',
            category: 'SYSTEM',
            title: 'New Expense Request',
            message: `A new expense request for ₹${amount.toLocaleString()} has been submitted.`,
            actionUrl: '/super-admin/expense'
          });
        }
      }).catch(err => console.error('[ExpenseRequest] Failed to notify admins:', err));

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

      // Journal entry — awaited so entry is guaranteed before response
      await createJournalEntry(effectiveCompanyId, result.expense, userId, bankAccount?.id, resolvedPaymentMode);

      return NextResponse.json({
        success: true,
        expense: result.expense,
        newBankBalance: result.newBankBalance,
        newCashBalance: result.newCashBalance,
        bankName: result.bankAccount?.bankName,
        message: `Expense ₹${amount} recorded in ${result.bankAccount ? result.bankAccount.bankName + ' Bank' : 'Cash Book'} and posted to accounting`,
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
    const { id, action, adminId, rejectionReason, adminPaymentSource, adminBankAccountId, adminCompanyId } = body;
    // adminPaymentSource: 'BANK'|'CASH' — admin's deduction source decision
    // adminBankAccountId: specific bank account chosen by admin
    // adminCompanyId: which company's books to post the expense to (overrides cashier's company)

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

      // Notify the requester
      if (expense.payeeId) {
        NotificationService.createNotification({
          userId: expense.payeeId,
          type: 'SYSTEM_ANNOUNCEMENT',
          category: 'SYSTEM',
          title: 'Expense Request Rejected',
          message: `Your expense request for ₹${(expense.amount || 0).toLocaleString()} was rejected: ${rejectionReason || 'No reason provided'}`,
          actionUrl: '/cashier/expense'
        }).catch(err => console.error('[ExpenseRequest] Failed to notify requester:', err));
      }

      return NextResponse.json({ success: true, message: 'Expense request rejected' });
    }

    if (action === 'APPROVE') {
      // Admin's choices take full priority over whatever the cashier stored
      const paymentSource = (adminPaymentSource as 'BANK' | 'CASH') || expense.payeeName || 'CASH';
      const storedBankAccountId = adminBankAccountId || expense.paymentReference;

      // effectiveCompanyId: admin's selection > expense's stored companyId > first company fallback
      let effectiveCompanyId: string = adminCompanyId || expense.companyId || '';
      if (!effectiveCompanyId) {
        const first = await db.company.findFirst({ select: { id: true } });
        if (first) effectiveCompanyId = first.id;
      }
      console.log(`[ExpenseRequest APPROVE] using companyId=${effectiveCompanyId} paymentSource=${paymentSource}`);

      let bankAccount: any = null;
      if (paymentSource === 'BANK') {
        if (storedBankAccountId) {
          bankAccount = await db.bankAccount.findUnique({ where: { id: storedBankAccountId } });
          // Verify the bank account belongs to effectiveCompanyId (security check)
          if (bankAccount && bankAccount.companyId !== effectiveCompanyId) bankAccount = null;
        }
        if (!bankAccount && effectiveCompanyId) {
          bankAccount = await db.bankAccount.findFirst({
            where: { companyId: effectiveCompanyId, isActive: true, isDefault: true },
          });
        }
        if (!bankAccount && effectiveCompanyId) {
          bankAccount = await db.bankAccount.findFirst({ where: { companyId: effectiveCompanyId, isActive: true } });
        }
        if (!bankAccount) {
          return NextResponse.json({ error: 'No bank account found for the selected company. Use Cash instead.' }, { status: 400 });
        }
      }

      const effectiveExpense = { ...expense, companyId: effectiveCompanyId };

      const result = await db.$transaction(async (tx) => {
        await tx.expense.update({
          where: { id },
          data: {
            categoryId: 'APPROVED',
            isApproved: true,
            approvedById: adminId,
            approvedAt: new Date(),
            companyId: effectiveCompanyId,  // persist admin's company choice
            payeeName: paymentSource,        // persist admin's payment source choice
            paymentReference: bankAccount?.id || null,
          },
        });

        const balances = await postToAccounting(tx, expense.id, effectiveExpense, adminId, bankAccount, paymentSource);
        return { ...balances, bankAccount };
      });

      // Journal entry — awaited, uses admin's chosen company
      await createJournalEntry(
        effectiveCompanyId,
        effectiveExpense,
        adminId,
        bankAccount?.id,
        paymentSource === 'BANK' ? 'BANK_TRANSFER' : 'CASH'
      );

      // Notify the requester
      if (expense.payeeId && expense.payeeId !== adminId) {
        NotificationService.createNotification({
          userId: expense.payeeId,
          type: 'SYSTEM_ANNOUNCEMENT',
          category: 'SYSTEM',
          title: 'Expense Request Approved ✅',
          message: `Your expense request (${expense.expenseNumber}) for ₹${(expense.amount || 0).toLocaleString()} has been approved and posted to accounting.`,
          actionUrl: '/cashier/expense'
        }).catch(err => console.error('[ExpenseRequest] Failed to notify requester:', err));
      }

      return NextResponse.json({
        success: true,
        message: `Expense approved & posted to ${bankAccount ? bankAccount.bankName + ' Bank' : 'Cash Book'}`,
        newBankBalance: result.newBankBalance,
        newCashBalance: result.newCashBalance,
        bankName: result.bankAccount?.bankName,
        companyId: effectiveCompanyId,
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use APPROVE or REJECT' }, { status: 400 });
  } catch (error) {
    console.error('[ExpenseRequest] PUT error:', error);
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 });
  }
}
