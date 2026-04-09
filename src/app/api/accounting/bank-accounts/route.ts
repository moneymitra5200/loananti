import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper function to get or create default company
async function getOrCreateDefaultCompany(providedCompanyId: string | null) {
  if (providedCompanyId && providedCompanyId !== 'default') {
    // Check if company exists
    const company = await db.company.findUnique({
      where: { id: providedCompanyId },
    });
    if (company) {
      return providedCompanyId;
    }
  }
  
  // Try to find any existing company
  const anyCompany = await db.company.findFirst();
  if (anyCompany) {
    return anyCompany.id;
  }
  
  // Create a default company if none exists
  const defaultCompany = await db.company.create({
    data: {
      name: 'Default Company',
      code: 'DEFAULT',
      isActive: true,
    },
  });
  return defaultCompany.id;
}

// GET - Fetch bank accounts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const isActive = searchParams.get('isActive');
    const getAll = searchParams.get('getAll') === 'true'; // Explicit flag to get all

    // Build where clause
    let where: any = {};
    
    // If companyId is explicitly provided (not null), filter by it strictly
    if (companyId && companyId !== 'all') {
      // Verify the company exists
      const company = await db.company.findUnique({ where: { id: companyId } });
      if (company) {
        where.companyId = companyId;
      } else {
        // Company not found, return empty
        return NextResponse.json({ bankAccounts: [], message: 'Company not found' });
      }
    }
    // If companyId is 'all' or getAll is true, don't filter by company (show all)
    // If companyId is null/undefined, also show all (for backward compatibility)
    
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const bankAccounts = await db.bankAccount.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, code: true }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { bankName: 'asc' },
      ],
    });

    return NextResponse.json({ bankAccounts });
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json({ bankAccounts: [] });
  }
}

// POST - Create new bank account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      companyId: providedCompanyId,
      bankName, 
      accountNumber, 
      accountName, 
      ownerName,
      branchName, 
      ifscCode, 
      accountType,
      openingBalance = 0,
      isDefault = false,
      // Payment settings
      upiId,
      qrCodeUrl,
    } = body;

    // Get or create a valid company ID
    const companyId = await getOrCreateDefaultCompany(providedCompanyId);

    // Check if account number already exists for this company
    const existing = await db.bankAccount.findFirst({
      where: { 
        companyId, 
        accountNumber 
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Bank account number already exists' }, { status: 400 });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.bankAccount.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const bankAccount = await db.bankAccount.create({
      data: {
        companyId,
        bankName,
        accountNumber,
        accountName: accountName || bankName,
        ownerName,
        branchName,
        ifscCode,
        accountType: accountType || 'CURRENT',
        openingBalance,
        currentBalance: openingBalance,
        isDefault,
        isActive: true,
        upiId,
        qrCodeUrl,
      },
    });

    // Auto-create or update company payment page if this is the default bank account
    if (isDefault || upiId || qrCodeUrl) {
      try {
        // Check if company already has a payment page
        const existingPage = await db.companyPaymentPage.findUnique({
          where: { companyId }
        });

        if (existingPage) {
          // Update existing payment page with new details
          await db.companyPaymentPage.update({
            where: { id: existingPage.id },
            data: {
              upiId: upiId || existingPage.upiId,
              qrCodeUrl: qrCodeUrl || existingPage.qrCodeUrl,
              bankAccountId: bankAccount.id,
              bankName: bankAccount.bankName,
              accountNumber: bankAccount.accountNumber,
              accountName: bankAccount.accountName,
              ifscCode: bankAccount.ifscCode,
              isActive: true
            }
          });
        } else {
          // Create new payment page for this company
          await db.companyPaymentPage.create({
            data: {
              companyId,
              upiId,
              qrCodeUrl,
              bankAccountId: bankAccount.id,
              bankName: bankAccount.bankName,
              accountNumber: bankAccount.accountNumber,
              accountName: bankAccount.accountName,
              ifscCode: bankAccount.ifscCode,
              isActive: true
            }
          });
        }
      } catch (pageError) {
        console.error('Error auto-creating payment page:', pageError);
        // Don't fail the bank account creation if payment page creation fails
      }
    }

    return NextResponse.json({ bankAccount });
  } catch (error) {
    console.error('Error creating bank account:', error);
    return NextResponse.json({ error: 'Failed to create bank account' }, { status: 500 });
  }
}

// PUT - Update bank account
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, bankName, accountName, ownerName, branchName, ifscCode, isDefault, isActive, upiId, qrCodeUrl } = body;

    const bankAccount = await db.bankAccount.findUnique({ where: { id } });
    if (!bankAccount) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.bankAccount.updateMany({
        where: { companyId: bankAccount.companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await db.bankAccount.update({
      where: { id },
      data: {
        bankName,
        accountName,
        ownerName,
        branchName,
        ifscCode,
        isDefault,
        isActive,
        upiId,
        qrCodeUrl,
      },
    });

    // Update company payment page if this is the default bank account or has payment details
    if (isDefault || upiId || qrCodeUrl) {
      try {
        const existingPage = await db.companyPaymentPage.findUnique({
          where: { companyId: bankAccount.companyId }
        });

        if (existingPage) {
          await db.companyPaymentPage.update({
            where: { id: existingPage.id },
            data: {
              upiId: upiId || existingPage.upiId,
              qrCodeUrl: qrCodeUrl || existingPage.qrCodeUrl,
              bankAccountId: updated.id,
              bankName: updated.bankName,
              accountNumber: updated.accountNumber,
              accountName: updated.accountName,
              ifscCode: updated.ifscCode,
              isActive: isActive !== false
            }
          });
        } else {
          await db.companyPaymentPage.create({
            data: {
              companyId: bankAccount.companyId,
              upiId,
              qrCodeUrl,
              bankAccountId: updated.id,
              bankName: updated.bankName,
              accountNumber: updated.accountNumber,
              accountName: updated.accountName,
              ifscCode: updated.ifscCode,
              isActive: isActive !== false
            }
          });
        }
      } catch (pageError) {
        console.error('Error updating payment page:', pageError);
      }
    }

    return NextResponse.json({ bankAccount: updated });
  } catch (error) {
    console.error('Error updating bank account:', error);
    return NextResponse.json({ error: 'Failed to update bank account' }, { status: 500 });
  }
}

// DELETE - Permanently delete bank account
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const permanent = searchParams.get('permanent') === 'true';

    if (!id) {
      return NextResponse.json({ error: 'Bank account ID required' }, { status: 400 });
    }

    // Check if bank account exists
    const bankAccount = await db.bankAccount.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });

    if (!bankAccount) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    // If permanent delete requested
    if (permanent) {
      // First delete all related transactions
      await db.bankTransaction.deleteMany({
        where: { bankAccountId: id }
      });

      // Delete related company payment pages
      await db.companyPaymentPage.deleteMany({
        where: { bankAccountId: id }
      });

      // Now permanently delete the bank account
      await db.bankAccount.delete({
        where: { id }
      });

      return NextResponse.json({ 
        message: 'Bank account permanently deleted', 
        deletedTransactions: bankAccount._count.transactions 
      });
    }

    // Default: Soft delete - just deactivate
    const updated = await db.bankAccount.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Bank account deactivated', bankAccount: updated });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    return NextResponse.json({ error: 'Failed to delete bank account' }, { status: 500 });
  }
}
