import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      customerPan,
      customerAadhaar,
      customerAddress,
      customerCity,
      customerState,
      customerPincode,
      customerDOB,
      customerOccupation,
      customerMonthlyIncome,
      reference1Name,
      reference1Phone,
      reference1Relation,
      reference2Name,
      reference2Phone,
      reference2Relation,
      documents
    } = body;

    const cleanPhone = customerPhone?.trim();
    const cleanEmail = customerEmail?.trim();

    if (!cleanPhone && !cleanEmail && !customerId && !customerName) {
      return NextResponse.json({ success: false, error: 'Customer identifier required' }, { status: 400 });
    }

    // 1. Update registered User profile if exists
    let updatedUser: any = null;
    const userOr: any[] = [];
    if (customerId) userOr.push({ id: customerId });
    if (cleanPhone) userOr.push({ phone: cleanPhone });
    if (cleanEmail) userOr.push({ email: cleanEmail });

    if (userOr.length > 0) {
      const existingUser = await db.user.findFirst({
        where: { OR: userOr }
      });

      if (existingUser) {
        const userUpdateData: any = {};
        if (customerName) userUpdateData.name = customerName;
        if (cleanPhone) userUpdateData.phone = cleanPhone;
        if (cleanEmail) userUpdateData.email = cleanEmail;
        if (customerPan) userUpdateData.panNumber = customerPan.toUpperCase();
        if (customerAadhaar) userUpdateData.aadhaarNumber = customerAadhaar;
        if (customerAddress) userUpdateData.address = customerAddress;
        if (customerCity) userUpdateData.city = customerCity;
        if (customerState) userUpdateData.state = customerState;
        if (customerPincode) userUpdateData.pincode = customerPincode;
        if (customerDOB) {
          try { userUpdateData.dateOfBirth = new Date(customerDOB); } catch (e) {}
        }
        if (customerOccupation) userUpdateData.employmentType = customerOccupation;
        if (customerMonthlyIncome) userUpdateData.monthlyIncome = parseFloat(customerMonthlyIncome) || 0;

        if (Object.keys(userUpdateData).length > 0) {
          updatedUser = await db.user.update({
            where: { id: existingUser.id },
            data: userUpdateData
          });
        }
      }
    }

    // 2. Update OfflineLoan records for this customer globally
    const loanOr: any[] = [];
    if (customerId) loanOr.push({ customerId });
    if (cleanPhone) loanOr.push({ customerPhone: cleanPhone });
    if (cleanEmail) loanOr.push({ customerEmail: cleanEmail });

    let updatedLoansCount = 0;
    if (loanOr.length > 0) {
      const loanUpdateData: any = {};
      if (customerName) loanUpdateData.customerName = customerName;
      if (cleanPhone) loanUpdateData.customerPhone = cleanPhone;
      if (cleanEmail) loanUpdateData.customerEmail = cleanEmail;
      if (customerPan) loanUpdateData.customerPan = customerPan.toUpperCase();
      if (customerAadhaar) loanUpdateData.customerAadhaar = customerAadhaar;
      if (customerAddress) loanUpdateData.customerAddress = customerAddress;
      if (customerCity) loanUpdateData.customerCity = customerCity;
      if (customerState) loanUpdateData.customerState = customerState;
      if (customerPincode) loanUpdateData.customerPincode = customerPincode;
      if (customerDOB) {
        try { loanUpdateData.customerDOB = new Date(customerDOB); } catch (e) {}
      }
      if (customerOccupation) loanUpdateData.customerOccupation = customerOccupation;
      if (customerMonthlyIncome) loanUpdateData.customerMonthlyIncome = customerMonthlyIncome;
      if (reference1Name) loanUpdateData.reference1Name = reference1Name;
      if (reference1Phone) loanUpdateData.reference1Phone = reference1Phone;
      if (reference1Relation) loanUpdateData.reference1Relation = reference1Relation;
      if (reference2Name) loanUpdateData.reference2Name = reference2Name;
      if (reference2Phone) loanUpdateData.reference2Phone = reference2Phone;
      if (reference2Relation) loanUpdateData.reference2Relation = reference2Relation;

      if (documents) {
        if (documents['pan_card']?.url) loanUpdateData.panCardDoc = documents['pan_card'].url;
        if (documents['aadhaar_front']?.url) loanUpdateData.aadhaarFrontDoc = documents['aadhaar_front'].url;
        if (documents['aadhaar_back']?.url) loanUpdateData.aadhaarBackDoc = documents['aadhaar_back'].url;
        if (documents['income_proof']?.url) loanUpdateData.incomeProofDoc = documents['income_proof'].url;
        if (documents['address_proof']?.url) loanUpdateData.addressProofDoc = documents['address_proof'].url;
        if (documents['photo']?.url) loanUpdateData.photoDoc = documents['photo'].url;
        if (documents['election_card']?.url) loanUpdateData.electionCardDoc = documents['election_card'].url;
        if (documents['house_photo']?.url) loanUpdateData.housePhotoDoc = documents['house_photo'].url;
        if (documents['guarantor_photo']?.url) loanUpdateData.guarantorPhotoDoc = documents['guarantor_photo'].url;
        if (documents['passbook_photo']?.url) loanUpdateData.passbookPhotoDoc = documents['passbook_photo'].url;
      }

      if (Object.keys(loanUpdateData).length > 0) {
        const res = await db.offlineLoan.updateMany({
          where: { OR: loanOr },
          data: loanUpdateData
        });
        updatedLoansCount = res.count;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Customer information updated globally across system records.',
      userUpdated: !!updatedUser,
      loansUpdatedCount: updatedLoansCount
    });
  } catch (error: any) {
    console.error('Error in global customer update API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
