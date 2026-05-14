import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Default receipt template fields shown on every EMI receipt
const DEFAULT_TEMPLATE = {
  type: 'EMI',
  name: 'Default EMI Receipt',
  companyName: 'Money Mitra Finance',
  bgColor: '#ffffff',
  accentColor: '#1e40af',
  fields: JSON.stringify({
    showCustomerName: true,
    showFatherName: true,
    showPhone: true,
    showAddress: true,
    showLoanAccount: true,
    showEmiNumber: true,
    showDueDate: true,
    showPaymentDate: true,
    showPrincipal: true,
    showInterest: true,
    showPenalty: true,
    showTotalAmount: true,
    showAmountInWords: true,
    showPaymentMode: true,
    showReferenceNo: true,
    showBalanceDue: true,
    showSplitBreakdown: true,
    showRemainingDue: true,
    showSignatureSection: true,
    showCompanyStamp: true,
    footerText: 'This is a computer generated receipt.',
    headerSubtitle: 'Your Trusted Financial Partner',
  }),
  isDefault: true,
};

// GET — Fetch receipt settings
export async function GET() {
  try {
    let template = await db.receiptTemplate.findFirst({
      where: { type: 'EMI', isDefault: true },
    });

    if (!template) {
      // Create default template on first use
      template = await db.receiptTemplate.create({
        data: DEFAULT_TEMPLATE,
      });
    }

    // Parse fields JSON
    const fields = template.fields ? JSON.parse(template.fields) : {};

    return NextResponse.json({
      success: true,
      settings: {
        companyName: template.companyName,
        bgColor: template.bgColor,
        accentColor: template.accentColor,
        footerText: fields.footerText || '',
        headerSubtitle: fields.headerSubtitle || '',
        showCustomerName: fields.showCustomerName ?? true,
        showFatherName: fields.showFatherName ?? true,
        showPhone: fields.showPhone ?? true,
        showAddress: fields.showAddress ?? true,
        showLoanAccount: fields.showLoanAccount ?? true,
        showEmiNumber: fields.showEmiNumber ?? true,
        showDueDate: fields.showDueDate ?? true,
        showPaymentDate: fields.showPaymentDate ?? true,
        showPrincipal: fields.showPrincipal ?? true,
        showInterest: fields.showInterest ?? true,
        showPenalty: fields.showPenalty ?? true,
        showTotalAmount: fields.showTotalAmount ?? true,
        showAmountInWords: fields.showAmountInWords ?? true,
        showPaymentMode: fields.showPaymentMode ?? true,
        showReferenceNo: fields.showReferenceNo ?? true,
        showBalanceDue: fields.showBalanceDue ?? true,
        showSplitBreakdown: fields.showSplitBreakdown ?? true,
        showRemainingDue: fields.showRemainingDue ?? true,
        showSignatureSection: fields.showSignatureSection ?? true,
        showCompanyStamp: fields.showCompanyStamp ?? true,
      },
    });
  } catch (error) {
    console.error('[ReceiptSettings] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch receipt settings' }, { status: 500 });
  }
}

// PUT — Save receipt settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName, bgColor, accentColor, footerText, headerSubtitle, ...toggles } = body;

    const fields = JSON.stringify({
      ...toggles,
      footerText: footerText || 'This is a computer generated receipt.',
      headerSubtitle: headerSubtitle || 'Your Trusted Financial Partner',
    });

    const existing = await db.receiptTemplate.findFirst({
      where: { type: 'EMI', isDefault: true },
    });

    let template;
    if (existing) {
      template = await db.receiptTemplate.update({
        where: { id: existing.id },
        data: {
          companyName: companyName || existing.companyName,
          bgColor: bgColor || existing.bgColor,
          accentColor: accentColor || existing.accentColor,
          fields,
          updatedAt: new Date(),
        },
      });
    } else {
      template = await db.receiptTemplate.create({
        data: {
          ...DEFAULT_TEMPLATE,
          companyName: companyName || DEFAULT_TEMPLATE.companyName,
          bgColor: bgColor || DEFAULT_TEMPLATE.bgColor,
          accentColor: accentColor || DEFAULT_TEMPLATE.accentColor,
          fields,
        },
      });
    }

    const parsedFields = JSON.parse(template.fields);
    return NextResponse.json({
      success: true,
      message: 'Receipt settings saved successfully',
      settings: { companyName: template.companyName, bgColor: template.bgColor, accentColor: template.accentColor, ...parsedFields },
    });
  } catch (error) {
    console.error('[ReceiptSettings] PUT error:', error);
    return NextResponse.json({ error: 'Failed to save receipt settings' }, { status: 500 });
  }
}
