import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || searchParams.get('q') || '';

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ success: true, customers: [] });
    }

    const searchTerm = query.trim();

    // 1. Search in User table
    const users = await db.user.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm } },
          { phone: { contains: searchTerm } },
          { email: { contains: searchTerm } },
          { panNumber: { contains: searchTerm } },
          { aadhaarNumber: { contains: searchTerm } },
        ],
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        panNumber: true,
        aadhaarNumber: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        dateOfBirth: true,
        employmentType: true,
        monthlyIncome: true,
      },
    });

    // 2. Search in OfflineLoan table for historical customer records and uploaded documents
    const offlineLoans = await db.offlineLoan.findMany({
      where: {
        OR: [
          { customerName: { contains: searchTerm } },
          { customerPhone: { contains: searchTerm } },
          { customerEmail: { contains: searchTerm } },
          { customerPan: { contains: searchTerm } },
          { customerAadhaar: { contains: searchTerm } },
        ],
      },
      take: 15,
      orderBy: { createdAt: 'desc' },
    });

    // Group & deduplicate customers by unique identifier (phone or email or name)
    const customerMap = new Map<string, any>();

    // First process offline loans because they have rich document references & reference details
    for (const loan of offlineLoans) {
      const key = (loan.customerPhone || loan.customerEmail || loan.customerName || loan.id).toLowerCase().trim();
      
      if (!customerMap.has(key)) {
        const docs: Record<string, { url: string; name: string }> = {};

        if (loan.panCardDoc) docs['pan_card'] = { url: loan.panCardDoc, name: 'PAN Card' };
        if (loan.aadhaarFrontDoc) docs['aadhaar_front'] = { url: loan.aadhaarFrontDoc, name: 'Aadhaar Front' };
        if (loan.aadhaarBackDoc) docs['aadhaar_back'] = { url: loan.aadhaarBackDoc, name: 'Aadhaar Back' };
        if (loan.incomeProofDoc) docs['income_proof'] = { url: loan.incomeProofDoc, name: 'Income Proof' };
        if (loan.addressProofDoc) docs['address_proof'] = { url: loan.addressProofDoc, name: 'Address Proof' };
        if (loan.photoDoc) docs['photo'] = { url: loan.photoDoc, name: 'Customer Photo' };
        if (loan.electionCardDoc) docs['election_card'] = { url: loan.electionCardDoc, name: 'Election Card' };
        if (loan.housePhotoDoc) docs['house_photo'] = { url: loan.housePhotoDoc, name: 'House Photo' };
        if (loan.guarantorPhotoDoc) docs['guarantor_photo'] = { url: loan.guarantorPhotoDoc, name: 'Guarantor Photo' };
        if (loan.passbookPhotoDoc) docs['passbook_photo'] = { url: loan.passbookPhotoDoc, name: 'Passbook Photo' };

        let formattedDob = '';
        if (loan.customerDOB) {
          try {
            formattedDob = new Date(loan.customerDOB).toISOString().slice(0, 10);
          } catch (e) {
            formattedDob = String(loan.customerDOB).slice(0, 10);
          }
        }

        customerMap.set(key, {
          id: loan.customerId || loan.id,
          source: 'OFFLINE_LOAN',
          name: loan.customerName || '',
          phone: loan.customerPhone || '',
          email: loan.customerEmail || '',
          pan: loan.customerPan || '',
          aadhaar: loan.customerAadhaar || '',
          address: loan.customerAddress || '',
          city: loan.customerCity || '',
          state: loan.customerState || '',
          pincode: loan.customerPincode || '',
          dob: formattedDob,
          occupation: loan.customerOccupation || '',
          monthlyIncome: loan.customerMonthlyIncome ? String(loan.customerMonthlyIncome) : '',
          reference1Name: loan.reference1Name || '',
          reference1Phone: loan.reference1Phone || '',
          reference1Relation: loan.reference1Relation || '',
          reference2Name: loan.reference2Name || '',
          reference2Phone: loan.reference2Phone || '',
          reference2Relation: loan.reference2Relation || '',
          documents: docs,
          docCount: Object.keys(docs).length,
        });
      } else {
        // Merge missing docs from older/other offline loans for the same customer
        const existing = customerMap.get(key);
        const docs = existing.documents;

        if (!docs['pan_card'] && loan.panCardDoc) docs['pan_card'] = { url: loan.panCardDoc, name: 'PAN Card' };
        if (!docs['aadhaar_front'] && loan.aadhaarFrontDoc) docs['aadhaar_front'] = { url: loan.aadhaarFrontDoc, name: 'Aadhaar Front' };
        if (!docs['aadhaar_back'] && loan.aadhaarBackDoc) docs['aadhaar_back'] = { url: loan.aadhaarBackDoc, name: 'Aadhaar Back' };
        if (!docs['income_proof'] && loan.incomeProofDoc) docs['income_proof'] = { url: loan.incomeProofDoc, name: 'Income Proof' };
        if (!docs['address_proof'] && loan.addressProofDoc) docs['address_proof'] = { url: loan.addressProofDoc, name: 'Address Proof' };
        if (!docs['photo'] && loan.photoDoc) docs['photo'] = { url: loan.photoDoc, name: 'Customer Photo' };
        if (!docs['election_card'] && loan.electionCardDoc) docs['election_card'] = { url: loan.electionCardDoc, name: 'Election Card' };
        if (!docs['house_photo'] && loan.housePhotoDoc) docs['house_photo'] = { url: loan.housePhotoDoc, name: 'House Photo' };
        if (!docs['guarantor_photo'] && loan.guarantorPhotoDoc) docs['guarantor_photo'] = { url: loan.guarantorPhotoDoc, name: 'Guarantor Photo' };
        if (!docs['passbook_photo'] && loan.passbookPhotoDoc) docs['passbook_photo'] = { url: loan.passbookPhotoDoc, name: 'Passbook Photo' };

        existing.docCount = Object.keys(docs).length;
      }
    }

    // Now merge User table records
    for (const u of users) {
      const key = (u.phone || u.email || u.name || u.id).toLowerCase().trim();

      let formattedDob = '';
      if (u.dateOfBirth) {
        try {
          formattedDob = new Date(u.dateOfBirth).toISOString().slice(0, 10);
        } catch (e) {
          formattedDob = String(u.dateOfBirth).slice(0, 10);
        }
      }

      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: u.id,
          source: 'USER_REGISTERED',
          name: u.name || '',
          phone: u.phone || '',
          email: u.email || '',
          pan: u.panNumber || '',
          aadhaar: u.aadhaarNumber || '',
          address: u.address || '',
          city: u.city || '',
          state: u.state || '',
          pincode: u.pincode || '',
          dob: formattedDob,
          occupation: u.employmentType || '',
          monthlyIncome: u.monthlyIncome ? String(u.monthlyIncome) : '',
          reference1Name: '',
          reference1Phone: '',
          reference1Relation: '',
          reference2Name: '',
          reference2Phone: '',
          reference2Relation: '',
          documents: {},
          docCount: 0,
        });
      } else {
        const existing = customerMap.get(key);
        if (!existing.pan && u.panNumber) existing.pan = u.panNumber;
        if (!existing.aadhaar && u.aadhaarNumber) existing.aadhaar = u.aadhaarNumber;
        if (!existing.address && u.address) existing.address = u.address;
        if (!existing.city && u.city) existing.city = u.city;
        if (!existing.state && u.state) existing.state = u.state;
        if (!existing.pincode && u.pincode) existing.pincode = u.pincode;
        if (!existing.dob && formattedDob) existing.dob = formattedDob;
        if (!existing.occupation && u.employmentType) existing.occupation = u.employmentType;
        if (!existing.monthlyIncome && u.monthlyIncome) existing.monthlyIncome = String(u.monthlyIncome);
      }
    }

    const resultList = Array.from(customerMap.values()).slice(0, 8);

    return NextResponse.json({
      success: true,
      customers: resultList,
    });
  } catch (error: any) {
    console.error('Error in customer suggest API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
