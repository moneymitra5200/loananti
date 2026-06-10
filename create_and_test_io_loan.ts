import fs from 'fs';
import path from 'path';
import { GET as getPersonalLedgerRoute } from './src/app/api/accounting/personal-ledger/route';
import { NextRequest } from 'next/server';

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

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// We simulate payment of EMI #1. Let's find the logic in pay-interest-only-loan action.
// The pay-interest-only-loan action does:
// 1. Update current EMI as PAID
// 2. Create next month's interest EMI on original
// 3. Update mirror current EMI as PAID
// 4. Create next month's interest EMI on mirror
// 5. Create accounting entries (Journal entries)

async function testScenario() {
  const originalCompanyId = 'cmq0sdura0000oweseq4j4xkj'; // KESARDEEP FINANCIAL ADVISOR (C3)
  const mirrorCompanyId = 'cmq0sdvhy0001owes4zr8gemk'; // MONEY MITRA FINANCIAL ADVISOR (C1)
  const userId = 'cmnrimde10000xtqmd8t8pw6j'; // Money Mitra Admin
  
  const customerName = 'mitra group test';
  const customerPhone = '9999999999';
  const customerId = `offline_name_${customerName.trim().toLowerCase().replace(/\s+/g, '_')}_${customerPhone.trim()}`;

  console.log('Cleaning up existing test data...');
  // Find test loans
  const oldLoans = await db.offlineLoan.findMany({
    where: {
      OR: [
        { customerPhone },
        { customerName: { contains: 'mitra group test' } }
      ]
    }
  });
  const oldLoanIds = oldLoans.map((l: any) => l.id);
  if (oldLoanIds.length > 0) {
    await db.journalEntryLine.deleteMany({ where: { loanId: { in: oldLoanIds } } });
    await db.journalEntry.deleteMany({
      where: {
        OR: [
          { referenceId: { in: oldLoanIds } },
          { narration: { contains: 'mitra group test' } }
        ]
      }
    });
    await db.offlineLoanEMI.deleteMany({ where: { offlineLoanId: { in: oldLoanIds } } });
    await db.mirrorLoanMapping.deleteMany({ where: { originalLoanId: { in: oldLoanIds } } });
    await db.offlineLoan.deleteMany({ where: { id: { in: oldLoanIds } } });
  }

  // Delete customer user if exists
  const oldUser = await db.user.findUnique({ where: { id: customerId } });
  if (oldUser) {
    await db.user.delete({ where: { id: customerId } });
  }

  console.log('Creating customer user...');
  await db.user.create({
    data: {
      id: customerId,
      firebaseUid: `fb_${customerId}`,
      email: `${customerId}@test.com`,
      name: customerName,
      phone: customerPhone,
      role: 'CUSTOMER'
    }
  });

  console.log('Creating original offline loan...');
  const disDate = new Date('2026-06-10T12:00:00Z');
  
  // Create original loan
  const originalLoan = await db.offlineLoan.create({
    data: {
      loanNumber: 'PD-IO-TEST-100',
      customerId,
      customerName,
      customerPhone,
      customerEmail: 'test@example.com',
      companyId: originalCompanyId,
      loanAmount: 10000,
      interestRate: 24,
      tenure: 2,
      emiAmount: 200,
      processingFee: 0,
      disbursementDate: disDate,
      startDate: disDate,
      status: 'INTEREST_ONLY',
      isInterestOnlyLoan: true,
      interestOnlyMonthlyAmount: 200,
      allowInterestOnly: true,
      createdByRole: 'SUPER_ADMIN',
      createdById: userId
    }
  });

  // Create original EMI #1
  const emi1DueDate = new Date('2026-07-10T00:00:00.000Z');
  const originalEMI1 = await db.offlineLoanEMI.create({
    data: {
      offlineLoanId: originalLoan.id,
      installmentNumber: 1,
      dueDate: emi1DueDate,
      originalDueDate: emi1DueDate,
      principalAmount: 0,
      interestAmount: 200,
      totalAmount: 200,
      outstandingPrincipal: 10000,
      paymentStatus: 'PENDING',
      isInterestOnly: true,
      interestOnlyAmount: 200
    }
  });

  console.log('Creating mirror offline loan and mapping...');
  // Create mirror loan
  const mirrorLoan = await db.offlineLoan.create({
    data: {
      loanNumber: 'KM-IO-TEST-100', // Mirror loan number
      customerId,
      customerName,
      customerPhone,
      customerEmail: 'test@example.com',
      companyId: mirrorCompanyId,
      loanAmount: 10000,
      interestRate: 15,
      tenure: 2,
      emiAmount: 200,
      processingFee: 0,
      disbursementDate: disDate,
      startDate: disDate,
      status: 'ACTIVE',
      isMirrorLoan: true,
      originalLoanId: originalLoan.id,
      isInterestOnlyLoan: true,
      allowInterestOnly: true,
      createdByRole: 'SUPER_ADMIN',
      createdById: userId
    }
  });

  // Create mirror EMI #1
  const mirrorEMI1 = await db.offlineLoanEMI.create({
    data: {
      offlineLoanId: mirrorLoan.id,
      installmentNumber: 1,
      dueDate: emi1DueDate,
      originalDueDate: emi1DueDate,
      principalAmount: 0,
      interestAmount: 125, // 15% rate
      totalAmount: 125,
      outstandingPrincipal: 10000,
      paymentStatus: 'PENDING',
      isInterestOnly: true,
      interestOnlyAmount: 125
    }
  });

  // Create mirror mapping
  await db.mirrorLoanMapping.create({
    data: {
      originalLoanId: originalLoan.id,
      mirrorLoanId: mirrorLoan.id,
      originalCompanyId: originalCompanyId,
      mirrorCompanyId,
      mirrorType: 'COMPANY_1_15_PERCENT',
      isOfflineLoan: true,
      originalInterestRate: 24,
      originalInterestType: 'FLAT',
      mirrorInterestRate: 15,
      mirrorInterestType: 'REDUCING',
      originalEMIAmount: 200,
      originalTenure: 2,
      mirrorTenure: 2,
      createdBy: userId
    }
  });

  console.log('Original and mirror loans created successfully.');

  // Let's verify status before payment
  console.log('\n--- BEFORE PAYMENT STATE ---');
  await printState(originalLoan.id, mirrorLoan.id);

  console.log('\n--- BEFORE PAYMENT: PERSONAL LEDGER (Original Company Context) ---');
  const reqOrigBefore = new NextRequest(`http://localhost:3000/api/accounting/personal-ledger?customerId=${customerId}&companyId=${originalCompanyId}`);
  const resOrigBefore = await getPersonalLedgerRoute(reqOrigBefore);
  const dataOrigBefore = await resOrigBefore.json();
  console.log(JSON.stringify(dataOrigBefore, null, 2));

  console.log('\n--- BEFORE PAYMENT: PERSONAL LEDGER (Mirror Company Context) ---');
  const reqMirrorBefore = new NextRequest(`http://localhost:3000/api/accounting/personal-ledger?customerId=${customerId}&companyId=${mirrorCompanyId}`);
  const resMirrorBefore = await getPersonalLedgerRoute(reqMirrorBefore);
  const dataMirrorBefore = await resMirrorBefore.json();
  console.log(JSON.stringify(dataMirrorBefore, null, 2));

  // Now, simulate call to pay-interest-only-loan action
  console.log('\nSimulating payment of EMI #1 (Interest-Only)...');
  await payInterestOnly(originalLoan.id, originalEMI1.id, userId);

  console.log('\n--- AFTER PAYMENT STATE ---');
  await printState(originalLoan.id, mirrorLoan.id);

  console.log('\n--- PERSONAL LEDGER (Original Company Context) ---');
  const reqOrig = new NextRequest(`http://localhost:3000/api/accounting/personal-ledger?customerId=${customerId}&companyId=${originalCompanyId}`);
  const resOrig = await getPersonalLedgerRoute(reqOrig);
  const dataOrig = await resOrig.json();
  console.log(JSON.stringify(dataOrig, null, 2));

  console.log('\n--- PERSONAL LEDGER (Mirror Company Context) ---');
  const reqMirror = new NextRequest(`http://localhost:3000/api/accounting/personal-ledger?customerId=${customerId}&companyId=${mirrorCompanyId}`);
  const resMirror = await getPersonalLedgerRoute(reqMirror);
  const dataMirror = await resMirror.json();
  console.log(JSON.stringify(dataMirror, null, 2));

  await db.$disconnect();
}

async function payInterestOnly(loanId: string, emiId: string, userId: string) {
  // We mimic the backend code from src/app/api/offline-loan/route.ts
  const loan = await db.offlineLoan.findUnique({
    where: { id: loanId },
    include: { company: true }
  });
  const currentEMI = await db.offlineLoanEMI.findUnique({
    where: { id: emiId }
  });
  const user = await db.user.findUnique({
    where: { id: userId }
  });

  if (!loan || !currentEMI || !user) {
    throw new Error('Required records not found for payment simulation');
  }

  const interestAmount = currentEMI.interestAmount;
  const now = new Date();

  // Next original EMI due date (always next month)
  const nextDueDate = new Date(currentEMI.dueDate);
  const currentMonthIndex = nextDueDate.getMonth();
  nextDueDate.setMonth(currentMonthIndex + 1);
  if (nextDueDate.getMonth() !== (currentMonthIndex + 1) % 12) {
    nextDueDate.setDate(0);
  }

  // Find mirror mapping
  const mirrorMapForIO = await db.mirrorLoanMapping.findFirst({
    where: { originalLoanId: loanId },
    select: { mirrorLoanId: true, mirrorCompanyId: true, mirrorInterestRate: true }
  });

  const hasMirror = !!(mirrorMapForIO && mirrorMapForIO.mirrorLoanId);

  await db.$transaction(async (tx: any) => {
    // 1. Mark original current EMI as PAID
    await tx.offlineLoanEMI.update({
      where: { id: currentEMI.id },
      data: {
        paymentStatus: 'PAID',
        paidAmount: interestAmount,
        paidInterest: interestAmount,
        paidDate: now,
        paymentMode: 'CASH',
        collectedById: userId,
        collectedByName: user.name,
        collectedAt: now,
        interestOnlyPaidAt: now
      }
    });

    // 2. Create next month's interest EMI on original
    const nextInstallmentNumber = currentEMI.installmentNumber + 1;
    const monthlyInterest = loan.interestOnlyMonthlyAmount || 0;
    await tx.offlineLoanEMI.create({
      data: {
        offlineLoanId: loanId,
        installmentNumber: nextInstallmentNumber,
        dueDate: nextDueDate,
        originalDueDate: nextDueDate,
        principalAmount: 0,
        interestAmount: monthlyInterest,
        totalAmount: monthlyInterest,
        outstandingPrincipal: loan.loanAmount,
        paymentStatus: 'PENDING',
        isInterestOnly: true,
        interestOnlyAmount: monthlyInterest
      }
    });

    // 3. Update original loan
    await tx.offlineLoan.update({
      where: { id: loanId },
      data: {
        totalInterestPaid: (loan.totalInterestPaid || 0) + interestAmount
      }
    });

    // 4. Mirror rolling sync
    if (hasMirror) {
      const mirrorLoanId = mirrorMapForIO.mirrorLoanId;
      const mirrorCompanyId = mirrorMapForIO.mirrorCompanyId;
      const mirrorRate = Number(mirrorMapForIO.mirrorInterestRate || 0);
      const mirrorInterest = Math.round((loan.loanAmount * mirrorRate / 100 / 12) * 100) / 100;

      // Mark mirror current EMI as PAID
      const curMirrorEMI = await tx.offlineLoanEMI.findFirst({
        where: { offlineLoanId: mirrorLoanId, installmentNumber: currentEMI.installmentNumber }
      });
      if (curMirrorEMI) {
        await tx.offlineLoanEMI.update({
          where: { id: curMirrorEMI.id },
          data: {
            paymentStatus: 'PAID',
            paidAmount: mirrorInterest,
            paidInterest: mirrorInterest,
            paidDate: now,
            paymentMode: 'CASH',
            interestOnlyPaidAt: now
          }
        });
      }

      // Create next mirror EMI
      const nextInstNum = currentEMI.installmentNumber + 1;
      const nextDue = new Date(currentEMI.dueDate);
      const currentMonthIndexMirror = nextDue.getMonth();
      nextDue.setMonth(currentMonthIndexMirror + 1);
      if (nextDue.getMonth() !== (currentMonthIndexMirror + 1) % 12) {
        nextDue.setDate(0);
      }

      await tx.offlineLoanEMI.create({
        data: {
          offlineLoanId: mirrorLoanId,
          installmentNumber: nextInstNum,
          dueDate: nextDue,
          originalDueDate: nextDue,
          principalAmount: 0,
          interestAmount: mirrorInterest,
          totalAmount: mirrorInterest,
          outstandingPrincipal: loan.loanAmount,
          paymentStatus: 'PENDING',
          isInterestOnly: true,
          interestOnlyAmount: mirrorInterest
        }
      });

      // 5. Accounting Entries for Mirror (Dr Cash/Bank, Cr Interest Income)
      // Get Chart accounts
      const mirrorCashAccount = await tx.chartOfAccount.findFirst({
        where: { accountCode: '1101', companyId: mirrorCompanyId }
      });
      const mirrorInterestAccount = await tx.chartOfAccount.findFirst({
        where: { accountCode: '4110', companyId: mirrorCompanyId }
      });
      const mirrorLRAccount = await tx.chartOfAccount.findFirst({
        where: { accountCode: '1200', companyId: mirrorCompanyId }
      });

      if (mirrorCashAccount && mirrorInterestAccount && mirrorLRAccount) {
        // Create Payment Journal Entry for Mirror
        const paymentJE = await tx.journalEntry.create({
          data: {
            entryNumber: 'JE-TEST-' + Date.now(),
            companyId: mirrorCompanyId,
            entryDate: now,
            createdById: userId,
            referenceType: 'INTEREST_ONLY_PAYMENT',
            referenceId: currentEMI.id,
            narration: `By-CASH - IO EMI #${currentEMI.installmentNumber} - Mitra Test (Interest)`,
            lines: {
              create: [
                {
                  accountId: mirrorCashAccount.id,
                  debitAmount: mirrorInterest,
                  creditAmount: 0,
                  narration: `By-CASH - IO EMI #${currentEMI.installmentNumber} - Mitra Test (Interest)`,
                  loanId: mirrorLoanId
                },
                {
                  accountId: mirrorLRAccount.id,
                  debitAmount: 0,
                  creditAmount: mirrorInterest,
                  narration: `By-CASH - IO EMI #${currentEMI.installmentNumber} - Mitra Test (Interest)`,
                  loanId: mirrorLoanId
                }
              ]
            }
          }
        });
        console.log(`Created payment journal entry for mirror loan: JE_ID=${paymentJE.id}`);
      }
    }
  }, { timeout: 30000 });
}

async function printState(originalLoanId: string, mirrorLoanId: string) {
  const origEMIs = await db.offlineLoanEMI.findMany({
    where: { offlineLoanId: originalLoanId },
    orderBy: { installmentNumber: 'asc' }
  });
  console.log('Original EMIs:');
  for (const emi of origEMIs) {
    console.log(`  EMI #${emi.installmentNumber}: dueDate=${emi.dueDate.toISOString()} | status=${emi.paymentStatus} | paidAmount=${emi.paidAmount} | interestAmount=${emi.interestAmount}`);
  }

  const mirrorEMIs = await db.offlineLoanEMI.findMany({
    where: { offlineLoanId: mirrorLoanId },
    orderBy: { installmentNumber: 'asc' }
  });
  console.log('Mirror EMIs:');
  for (const emi of mirrorEMIs) {
    console.log(`  EMI #${emi.installmentNumber}: dueDate=${emi.dueDate.toISOString()} | status=${emi.paymentStatus} | paidAmount=${emi.paidAmount} | interestAmount=${emi.interestAmount}`);
  }

  const jes = await db.journalEntry.findMany({
    where: {
      lines: {
        some: {
          loanId: { in: [originalLoanId, mirrorLoanId] }
        }
      }
    },
    include: {
      lines: {
        include: {
          account: true
        }
      }
    }
  });
  console.log('Journal Entries:');
  for (const je of jes) {
    console.log(`  JE ID=${je.id} | Date=${je.entryDate.toISOString()} | RefType=${je.referenceType} | Narration=${je.narration}`);
    for (const l of je.lines) {
      console.log(`    Line: Account=${l.account.accountCode} | Dr=${l.debitAmount} | Cr=${l.creditAmount} | LoanId=${l.loanId}`);
    }
  }
}

testScenario().catch(e => { console.error(e); process.exit(1); });
