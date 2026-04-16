import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Force recompilation after database sync - SecondaryPaymentPage now has companyId
// GET - Fetch EMI Payment Settings
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const emiScheduleId = searchParams.get('emiScheduleId');
    const loanApplicationId = searchParams.get('loanApplicationId');
    const action = searchParams.get('action');

    // Get all secondary payment pages for a company
    if (action === 'secondary-pages') {
      const companyId = searchParams.get('companyId');
      
      // Build where clause - if companyId is 'all' or not provided, don't filter by company
      const whereClause: any = { isActive: true };
      if (companyId && companyId !== 'all') {
        whereClause.companyId = companyId;
      }

      const pages = await db.secondaryPaymentPage.findMany({
        where: whereClause,
        include: {
          role: {
            select: { id: true, name: true, email: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json({ success: true, pages });
    }

    // Get company default bank account for payment
    if (action === 'company-default') {
      const companyId = searchParams.get('companyId');
      if (!companyId) {
        return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
      }

      // Get company's default bank account
      const defaultBankAccount = await db.bankAccount.findFirst({
        where: { 
          companyId,
          isActive: true,
          isDefault: true 
        }
      });

      // Get company payment settings for UPI/QR
      const paymentSettings = await db.companyPaymentSettings.findUnique({
        where: { companyId }
      });

      return NextResponse.json({ 
        success: true, 
        bankAccount: defaultBankAccount,
        paymentSettings 
      });
    }

    // Get settings for a specific EMI
    if (emiScheduleId) {
      let settings = await db.eMIPaymentSetting.findUnique({
        where: { emiScheduleId },
        include: {
          secondaryPaymentPage: true
        }
      });

      if (!settings) {
        // Create default settings
        const emi = await db.eMISchedule.findUnique({
          where: { id: emiScheduleId },
          include: {
            loanApplication: {
              select: { companyId: true }
            }
          }
        });

        if (emi) {
          settings = await db.eMIPaymentSetting.create({
            data: {
              emiScheduleId,
              loanApplicationId: emi.loanApplicationId,
              enableFullPayment:    true,
              enablePartialPayment: false,
              enableInterestOnly:   false,
              // @ts-ignore -- prisma client will have this field after db push
              enablePrincipalOnly:  false,
              useDefaultCompanyPage: true
            } as any,
            include: { secondaryPaymentPage: true }
          });
        }
      }

      return NextResponse.json({ success: true, settings });
    }

    // Get all settings for a loan application
    if (loanApplicationId) {
      const settings = await db.eMIPaymentSetting.findMany({
        where: { loanApplicationId },
        include: {
          secondaryPaymentPage: true
        }
      });

      return NextResponse.json({ success: true, settings });
    }

    // Get all EMIs with secondary payment pages assigned (for tracking/audit)
    if (action === 'secondary-page-assignments') {
      const pageId = searchParams.get('pageId');
      
      // Build where clause - only get settings that have a secondary payment page assigned
      const whereClause: any = {
        secondaryPaymentPageId: { not: null },
        useDefaultCompanyPage: false
      };
      
      // Filter by specific page if provided
      if (pageId) {
        whereClause.secondaryPaymentPageId = pageId;
      }

      const assignments = await db.eMIPaymentSetting.findMany({
        where: whereClause,
        include: {
          secondaryPaymentPage: {
            include: {
              role: {
                select: { id: true, name: true, email: true, role: true }
              }
            }
          },
          emiSchedule: {
            include: {
              loanApplication: {
                include: {
                  customer: {
                    select: { id: true, name: true, email: true, phone: true }
                  },
                  company: {
                    select: { id: true, name: true, code: true }
                  }
                }
              }
            }
          },
          modifiedBy: {
            select: { id: true, name: true, email: true, role: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      return NextResponse.json({ success: true, assignments });
    }

    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching EMI payment settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// POST - Create or Update EMI Payment Settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      emiScheduleId,
      loanApplicationId,
      enableFullPayment,
      enablePartialPayment,
      enableInterestOnly,
      useDefaultCompanyPage,
      secondaryPaymentPageId,
      modifiedById
    } = body;

    if (!emiScheduleId || !loanApplicationId) {
      return NextResponse.json({ error: 'EMI Schedule ID and Loan Application ID are required' }, { status: 400 });
    }

    // Convert empty string to null for foreign key field
    const validSecondaryPaymentPageId = secondaryPaymentPageId && secondaryPaymentPageId.trim() !== ''
      ? secondaryPaymentPageId
      : null;

    const settings = await db.eMIPaymentSetting.upsert({
      where: { emiScheduleId },
      create: {
        emiScheduleId,
        loanApplicationId,
        enableFullPayment:    enableFullPayment    ?? true,
        enablePartialPayment: enablePartialPayment ?? false,
        enableInterestOnly:   enableInterestOnly   ?? false,
        // @ts-ignore
        enablePrincipalOnly:  body.enablePrincipalOnly ?? false,
        useDefaultCompanyPage: useDefaultCompanyPage ?? true,
        secondaryPaymentPageId: validSecondaryPaymentPageId,
        lastModifiedById: modifiedById
      } as any,
      update: {
        enableFullPayment,
        enablePartialPayment,
        enableInterestOnly,
        // @ts-ignore
        enablePrincipalOnly:  body.enablePrincipalOnly ?? false,
        useDefaultCompanyPage,
        secondaryPaymentPageId: validSecondaryPaymentPageId,
        lastModifiedById: modifiedById
      } as any,
      include: { secondaryPaymentPage: true }
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error saving EMI payment settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}

// PUT - Create Secondary Payment Page
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      upiId,
      qrCodeUrl,
      bankName,
      accountNumber,
      accountName,
      ifscCode,
      roleId,
      roleType,
      createdById,
      companyId
    } = body;

    console.log('[Payment Page] Creating with data:', { name, companyId, createdById, roleId });

    // Only name and createdById are required
    if (!name || !createdById) {
      return NextResponse.json({ error: 'Name and creator ID are required' }, { status: 400 });
    }

    // Convert empty strings/undefined to null for optional fields
    const validQrCodeUrl = qrCodeUrl && qrCodeUrl.trim() !== '' ? qrCodeUrl : null;
    const validCompanyId = companyId && companyId.trim() !== '' ? companyId : null;
    const validRoleId = roleId && roleId.trim() !== '' ? roleId : null;

    // Use raw query to bypass Prisma client cache issues
    const id = `cm${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`;
    
    await db.$executeRaw`
      INSERT INTO SecondaryPaymentPage 
      (id, companyId, name, description, upiId, qrCodeUrl, bankName, accountNumber, accountName, ifscCode, roleId, roleType, isActive, createdById, createdAt, updatedAt)
      VALUES 
      (${id}, ${validCompanyId}, ${name}, ${description || null}, ${upiId || null}, ${validQrCodeUrl}, ${bankName || null}, ${accountNumber || null}, ${accountName || null}, ${ifscCode || null}, ${validRoleId}, ${roleType || null}, true, ${createdById}, NOW(), NOW())
    `;

    // Fetch the created page
    const page = await db.secondaryPaymentPage.findUnique({
      where: { id },
      include: {
        role: {
          select: { id: true, name: true, email: true, role: true }
        },
        company: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json({ success: true, page });
  } catch (error) {
    console.error('Error creating secondary payment page:', error);
    return NextResponse.json({ error: 'Failed to create payment page' }, { status: 500 });
  }
}

// DELETE - Delete Secondary Payment Page
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageId = searchParams.get('pageId');

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
    }

    // Soft delete by setting isActive to false
    await db.secondaryPaymentPage.update({
      where: { id: pageId },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true, message: 'Payment page deactivated' });
  } catch (error) {
    console.error('Error deleting secondary payment page:', error);
    return NextResponse.json({ error: 'Failed to delete payment page' }, { status: 500 });
  }
}
