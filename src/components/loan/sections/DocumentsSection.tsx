'use client';

import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Eye, Banknote, Trophy, Car, Scale, Weight,
  IndianRupee, Calendar, User, Hash, Settings, Droplet,
  Palette, Printer
} from 'lucide-react';
import type { LoanDetails } from './types';
import { openDoc } from '@/utils/openDoc';

interface DocumentsSectionProps {
  loanDetails: LoanDetails | null;
}


// Opens a full printable Gold Loan Receipt in a new tab
const openGoldReceipt = (loanDetails: LoanDetails) => {
  const g = loanDetails.goldLoanDetail!;
  const loan = loanDetails;
  const appNo = loan.applicationNo;
  const customerName = `${loan.firstName || ''} ${loan.lastName || ''}`.trim() || loan.customer?.name || 'N/A';
  const phone = loan.phone || loan.customer?.phone || 'N/A';
  const loanAmt = loan.sessionForm?.approvedAmount || loan.loanAmount || 0;
  const rate = loan.sessionForm?.interestRate || loan.interestRate || 0;
  const emi = loan.sessionForm?.emiAmount || loan.emiAmount || 0;
  const tenure = loan.sessionForm?.tenure || loan.tenure || 0;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const photoHtml = g.goldItemPhoto
    ? `<div style="text-align:center;margin:20px 0"><p style="font-size:13px;color:#666;margin-bottom:8px;font-weight:600">GOLD ITEM PHOTOGRAPH</p><img src="${g.goldItemPhoto}" style="max-width:300px;max-height:300px;object-fit:contain;border:2px solid #d97706;border-radius:8px;padding:4px" alt="Gold Item"/></div>`
    : '';

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Gold Loan Receipt - ${appNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f9f9f9; color: #222; }
    .page { max-width: 800px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
    .header { background: linear-gradient(135deg, #b45309, #d97706); color: white; padding: 28px 32px; }
    .header h1 { font-size: 24px; font-weight: 700; letter-spacing: 1px; }
    .header p { font-size: 13px; opacity: 0.85; margin-top: 4px; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 3px 12px; border-radius: 20px; font-size: 12px; margin-top: 8px; }
    .body { padding: 28px 32px; }
    .section-title { font-size: 14px; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #fde68a; padding-bottom: 6px; margin: 20px 0 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .field { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; }
    .field.green { background: #f0fdf4; border-color: #86efac; }
    .field.blue { background: #eff6ff; border-color: #93c5fd; }
    .field label { font-size: 11px; color: #92400e; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
    .field.green label { color: #166534; }
    .field.blue label { color: #1e40af; }
    .field p { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 3px; }
    .info-row { display: flex; gap: 8px; align-items: center; font-size: 13px; padding: 4px 0; }
    .info-row span:first-child { color: #64748b; width: 140px; }
    .info-row strong { color: #1e293b; }
    .footer { background: #fffbeb; border-top: 2px dashed #fde68a; padding: 20px 32px; display: flex; justify-content: space-between; align-items: flex-end; }
    .sig-box { text-align: center; }
    .sig-line { width: 160px; border-bottom: 1px solid #999; margin-bottom: 6px; height: 40px; }
    .sig-label { font-size: 11px; color: #64748b; }
    @media print { body { background: white; } .page { box-shadow: none; margin: 0; border-radius: 0; } }
  </style></head><body>
  <div class="page">
    <div class="header">
      <h1>🏅 GOLD LOAN RECEIPT</h1>
      <p>Loan Application No: <strong>${appNo}</strong> &nbsp;|&nbsp; Date: ${today}</p>
      <span class="badge">Collateral Pledge Certificate</span>
    </div>
    <div class="body">
      <div class="section-title">Customer Information</div>
      <div class="grid-2">
        <div class="info-row"><span>Customer Name</span><strong>${customerName}</strong></div>
        <div class="info-row"><span>Phone</span><strong>${phone}</strong></div>
        <div class="info-row"><span>Application No</span><strong>${appNo}</strong></div>
        <div class="info-row"><span>Date</span><strong>${today}</strong></div>
      </div>
      <div class="section-title">Loan Details</div>
      <div class="grid">
        <div class="field blue"><label>Loan Amount</label><p>₹${loanAmt.toLocaleString('en-IN')}</p></div>
        <div class="field blue"><label>Interest Rate</label><p>${rate}% p.a.</p></div>
        <div class="field blue"><label>Tenure</label><p>${tenure} months</p></div>
        <div class="field green"><label>Monthly EMI</label><p>₹${emi.toLocaleString('en-IN')}</p></div>
      </div>
      <div class="section-title">Gold Collateral Details</div>
      <div class="grid">
        <div class="field"><label>Gross Weight</label><p>${g.grossWeight} g</p></div>
        <div class="field"><label>Net Weight</label><p>${g.netWeight} g</p></div>
        <div class="field"><label>Gold Purity</label><p>${g.karat || 22} Karat</p></div>
        <div class="field"><label>Rate per Gram</label><p>₹${g.goldRate.toLocaleString('en-IN')}</p></div>
        <div class="field green"><label>Valuation Amount</label><p>₹${g.valuationAmount.toLocaleString('en-IN')}</p></div>
        <div class="field blue"><label>Approved Loan</label><p>₹${g.loanAmount.toLocaleString('en-IN')}</p></div>
      </div>
      ${g.ownerName || g.numberOfItems || g.itemDescription ? `
      <div class="section-title">Additional Details</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${g.ownerName ? `<div class="info-row"><span>Gold Owner Name</span><strong>${g.ownerName}</strong></div>` : ''}
        ${g.numberOfItems ? `<div class="info-row"><span>No. of Items</span><strong>${g.numberOfItems}</strong></div>` : ''}
        ${g.itemDescription ? `<div class="info-row" style="grid-column:1/-1"><span>Item Description</span><strong>${g.itemDescription}</strong></div>` : ''}
        ${g.verifiedBy ? `<div class="info-row"><span>Verified By</span><strong>${g.verifiedBy}</strong></div>` : ''}
        ${g.remarks ? `<div class="info-row" style="grid-column:1/-1"><span>Remarks</span><strong>${g.remarks}</strong></div>` : ''}
      </div>` : ''}
      ${photoHtml}
    </div>
    <div class="footer">
      <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Borrower Signature</div></div>
      <div style="text-align:center;font-size:12px;color:#92400e"><p style="font-weight:700">GOLD HELD AS COLLATERAL</p><p style="margin-top:4px">To be returned upon full loan repayment</p></div>
      <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Authorized Signatory</div></div>
    </div>
  </div>
  <div style="text-align:center;padding:16px"><button onclick="window.print()" style="padding:10px 28px;background:#b45309;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600">🖨 Print Receipt</button></div>
  </body></html>`);
  w.document.close();
};

// Opens a full printable Vehicle Loan Receipt in a new tab
const openVehicleReceipt = (loanDetails: LoanDetails) => {
  const v = loanDetails.vehicleLoanDetail!;
  const loan = loanDetails;
  const appNo = loan.applicationNo;
  const customerName = `${loan.firstName || ''} ${loan.lastName || ''}`.trim() || loan.customer?.name || 'N/A';
  const phone = loan.phone || loan.customer?.phone || 'N/A';
  const loanAmt = loan.sessionForm?.approvedAmount || loan.loanAmount || 0;
  const rate = loan.sessionForm?.interestRate || loan.interestRate || 0;
  const emi = loan.sessionForm?.emiAmount || loan.emiAmount || 0;
  const tenure = loan.sessionForm?.tenure || loan.tenure || 0;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const vehiclePhotoHtml = v.vehiclePhoto
    ? `<div style="text-align:center;margin:16px 0"><p style="font-size:13px;color:#666;margin-bottom:8px;font-weight:600">VEHICLE PHOTOGRAPH</p><img src="${v.vehiclePhoto}" style="max-width:320px;max-height:240px;object-fit:contain;border:2px solid #3b82f6;border-radius:8px;padding:4px" alt="Vehicle"/></div>`
    : '';
  const rcPhotoHtml = v.rcBookPhoto
    ? `<div style="text-align:center;margin:16px 0"><p style="font-size:13px;color:#666;margin-bottom:8px;font-weight:600">RC BOOK PHOTOGRAPH</p><img src="${v.rcBookPhoto}" style="max-width:320px;max-height:240px;object-fit:contain;border:2px solid #10b981;border-radius:8px;padding:4px" alt="RC Book"/></div>`
    : '';

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Vehicle Loan Receipt - ${appNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f9f9f9; color: #222; }
    .page { max-width: 800px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.12); }
    .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 28px 32px; }
    .header h1 { font-size: 24px; font-weight: 700; letter-spacing: 1px; }
    .header p { font-size: 13px; opacity: 0.85; margin-top: 4px; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 3px 12px; border-radius: 20px; font-size: 12px; margin-top: 8px; }
    .body { padding: 28px 32px; }
    .section-title { font-size: 14px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #bfdbfe; padding-bottom: 6px; margin: 20px 0 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .field { background: #eff6ff; border: 1px solid #93c5fd; border-radius: 8px; padding: 10px 14px; }
    .field.green { background: #f0fdf4; border-color: #86efac; }
    .field.amber { background: #fffbeb; border-color: #fde68a; }
    .field label { font-size: 11px; color: #1e40af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
    .field.green label { color: #166534; }
    .field.amber label { color: #92400e; }
    .field p { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 3px; }
    .info-row { display: flex; gap: 8px; align-items: center; font-size: 13px; padding: 4px 0; }
    .info-row span:first-child { color: #64748b; width: 160px; }
    .info-row strong { color: #1e293b; font-family: monospace; }
    .photos { display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; margin: 20px 0; }
    .footer { background: #eff6ff; border-top: 2px dashed #93c5fd; padding: 20px 32px; display: flex; justify-content: space-between; align-items: flex-end; }
    .sig-box { text-align: center; }
    .sig-line { width: 160px; border-bottom: 1px solid #999; margin-bottom: 6px; height: 40px; }
    .sig-label { font-size: 11px; color: #64748b; }
    @media print { body { background: white; } .page { box-shadow: none; margin: 0; border-radius: 0; } }
  </style></head><body>
  <div class="page">
    <div class="header">
      <h1>🚗 VEHICLE LOAN RECEIPT</h1>
      <p>Loan Application No: <strong>${appNo}</strong> &nbsp;|&nbsp; Date: ${today}</p>
      <span class="badge">Collateral Hypothecation Certificate</span>
    </div>
    <div class="body">
      <div class="section-title">Customer Information</div>
      <div class="grid-2">
        <div class="info-row"><span>Customer Name</span><strong>${customerName}</strong></div>
        <div class="info-row"><span>Phone</span><strong>${phone}</strong></div>
        <div class="info-row"><span>Application No</span><strong>${appNo}</strong></div>
        <div class="info-row"><span>Date</span><strong>${today}</strong></div>
      </div>
      <div class="section-title">Loan Details</div>
      <div class="grid">
        <div class="field"><label>Loan Amount</label><p>₹${loanAmt.toLocaleString('en-IN')}</p></div>
        <div class="field"><label>Interest Rate</label><p>${rate}% p.a.</p></div>
        <div class="field"><label>Tenure</label><p>${tenure} months</p></div>
        <div class="field green"><label>Monthly EMI</label><p>₹${emi.toLocaleString('en-IN')}</p></div>
      </div>
      <div class="section-title">Vehicle Details</div>
      <div class="grid">
        <div class="field"><label>Vehicle Type</label><p>${v.vehicleType}</p></div>
        <div class="field"><label>Manufacturer</label><p>${v.manufacturer || 'N/A'}</p></div>
        <div class="field"><label>Model</label><p>${v.model || 'N/A'}</p></div>
        <div class="field amber"><label>Reg. Number</label><p>${v.vehicleNumber || 'N/A'}</p></div>
        <div class="field"><label>Year</label><p>${v.yearOfManufacture || 'N/A'}</p></div>
        ${v.fuelType ? `<div class="field"><label>Fuel Type</label><p>${v.fuelType}</p></div>` : ''}
        ${v.color ? `<div class="field"><label>Color</label><p>${v.color}</p></div>` : ''}
        <div class="field green"><label>Valuation</label><p>₹${v.valuationAmount.toLocaleString('en-IN')}</p></div>
        <div class="field"><label>Approved Loan</label><p>₹${v.loanAmount.toLocaleString('en-IN')}</p></div>
      </div>
      ${v.chassisNumber || v.engineNumber || v.ownerName ? `
      <div class="section-title">Identification Numbers</div>
      <div>
        ${v.ownerName ? `<div class="info-row"><span>Registered Owner</span><strong>${v.ownerName}</strong></div>` : ''}
        ${v.chassisNumber ? `<div class="info-row"><span>Chassis Number</span><strong>${v.chassisNumber}</strong></div>` : ''}
        ${v.engineNumber ? `<div class="info-row"><span>Engine Number</span><strong>${v.engineNumber}</strong></div>` : ''}
        ${v.verifiedBy ? `<div class="info-row"><span>Verified By</span><strong>${v.verifiedBy}</strong></div>` : ''}
        ${v.remarks ? `<div class="info-row"><span>Remarks</span><strong>${v.remarks}</strong></div>` : ''}
      </div>` : ''}
      ${vehiclePhotoHtml || rcPhotoHtml ? `
      <div class="section-title">Photos</div>
      <div class="photos">${vehiclePhotoHtml}${rcPhotoHtml}</div>` : ''}
    </div>
    <div class="footer">
      <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Borrower Signature</div></div>
      <div style="text-align:center;font-size:12px;color:#1e40af"><p style="font-weight:700">VEHICLE HYPOTHECATED TO LENDER</p><p style="margin-top:4px">To be released upon full loan repayment</p></div>
      <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Authorized Signatory</div></div>
    </div>
  </div>
  <div style="text-align:center;padding:16px"><button onclick="window.print()" style="padding:10px 28px;background:#1e40af;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600">🖨 Print Receipt</button></div>
  </body></html>`);
  w.document.close();
};

const DocumentsSection = memo(function DocumentsSection({ loanDetails }: DocumentsSectionProps) {
  const documents = [
    { name: 'PAN Card', url: loanDetails?.panCardDoc },
    { name: 'Aadhaar Front', url: loanDetails?.aadhaarFrontDoc },
    { name: 'Aadhaar Back', url: loanDetails?.aadhaarBackDoc },
    { name: 'Income Proof', url: loanDetails?.incomeProofDoc },
    { name: 'Address Proof', url: loanDetails?.addressProofDoc },
    { name: 'Photo', url: loanDetails?.photoDoc },
    { name: 'Bank Statement', url: loanDetails?.bankStatementDoc },
    { name: 'Passbook', url: loanDetails?.passbookDoc },
    { name: 'Salary Slip', url: loanDetails?.salarySlipDoc },
    { name: 'Election Card', url: loanDetails?.electionCardDoc },
    { name: 'House Photo', url: loanDetails?.housePhotoDoc },
    { name: 'Guarantor Photo', url: (loanDetails as any)?.guarantorPhotoDoc },
    { name: 'Other Documents', url: loanDetails?.otherDocs },
  ].filter(doc => doc.url);

  const hasAnyDocument = [
    loanDetails?.panCardDoc, loanDetails?.aadhaarFrontDoc, loanDetails?.aadhaarBackDoc,
    loanDetails?.incomeProofDoc, loanDetails?.addressProofDoc, loanDetails?.photoDoc,
    loanDetails?.bankStatementDoc, loanDetails?.passbookDoc, loanDetails?.salarySlipDoc,
    loanDetails?.electionCardDoc, loanDetails?.housePhotoDoc, loanDetails?.otherDocs,
    loanDetails?.disbursementProof, (loanDetails as any)?.guarantorPhotoDoc,
  ].some(Boolean);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isGoldLoan = loanDetails?.loanType === 'GOLD' || loanDetails?.loanType?.includes('GOLD');
  const goldDetail = loanDetails?.goldLoanDetail;
  const isVehicleLoan = loanDetails?.loanType === 'VEHICLE' || loanDetails?.loanType?.includes('VEHICLE');
  const vehicleDetail = loanDetails?.vehicleLoanDetail;

  return (
    <div className="space-y-4">
      {/* ──────────── GOLD LOAN RECEIPT ──────────── */}
      {isGoldLoan && goldDetail && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              Gold Loan Receipt
              <Badge className="bg-amber-100 text-amber-700 ml-2">Collateral Details</Badge>
              {/* Full Receipt button */}
              <button
                type="button"
                onClick={() => loanDetails && openGoldReceipt(loanDetails)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                <Printer className="h-3.5 w-3.5" /> View Full Receipt
              </button>
            </CardTitle>
            <CardDescription>Gold ornament details pledged for this loan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 bg-amber-50 rounded-lg"><div className="flex items-center gap-2 text-amber-600 mb-1"><Weight className="h-4 w-4" /><span className="text-xs font-medium">Gross Weight</span></div><p className="text-lg font-bold text-gray-800">{goldDetail.grossWeight}g</p></div>
              <div className="p-3 bg-amber-50 rounded-lg"><div className="flex items-center gap-2 text-amber-600 mb-1"><Scale className="h-4 w-4" /><span className="text-xs font-medium">Net Weight</span></div><p className="text-lg font-bold text-gray-800">{goldDetail.netWeight}g</p></div>
              <div className="p-3 bg-amber-50 rounded-lg"><div className="flex items-center gap-2 text-amber-600 mb-1"><IndianRupee className="h-4 w-4" /><span className="text-xs font-medium">Gold Rate/g</span></div><p className="text-lg font-bold text-gray-800">₹{goldDetail.goldRate}</p></div>
              <div className="p-3 bg-emerald-50 rounded-lg"><div className="flex items-center gap-2 text-emerald-600 mb-1"><IndianRupee className="h-4 w-4" /><span className="text-xs font-medium">Valuation</span></div><p className="text-lg font-bold text-emerald-700">{formatCurrency(goldDetail.valuationAmount)}</p></div>
              <div className="p-3 bg-blue-50 rounded-lg"><div className="flex items-center gap-2 text-blue-600 mb-1"><IndianRupee className="h-4 w-4" /><span className="text-xs font-medium">Loan Amount</span></div><p className="text-lg font-bold text-blue-700">{formatCurrency(goldDetail.loanAmount)}</p></div>
              <div className="p-3 bg-purple-50 rounded-lg"><div className="flex items-center gap-2 text-purple-600 mb-1"><Settings className="h-4 w-4" /><span className="text-xs font-medium">Purity</span></div><p className="text-lg font-bold text-purple-700">{goldDetail.karat || 22}K</p></div>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {goldDetail.ownerName && <div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Owner:</span><span className="font-medium">{goldDetail.ownerName}</span></div>}
              {goldDetail.numberOfItems && <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Items:</span><span className="font-medium">{goldDetail.numberOfItems}</span></div>}
              {goldDetail.verificationDate && <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Verified:</span><span className="font-medium">{formatDate(goldDetail.verificationDate)}</span></div>}
            </div>
            {/* Gold item photo inline thumbnail */}
            {goldDetail.goldItemPhoto && (
              <div className="mt-4 flex items-start gap-4 p-3 border border-amber-200 rounded-lg bg-amber-50/50">
                <button type="button" onClick={() => openDoc(goldDetail.goldItemPhoto!)} className="shrink-0">
                  <img
                    src={goldDetail.goldItemPhoto}
                    alt="Gold Item"
                    className="w-24 h-24 object-cover rounded-lg border-2 border-amber-300 hover:opacity-90 transition-opacity"
                  />
                </button>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-gray-700">Gold Item Photo</p>
                  <button type="button" onClick={() => openDoc(goldDetail.goldItemPhoto!)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-xs font-medium w-fit">
                    <Eye className="h-3.5 w-3.5" /> View Full Photo
                  </button>
                  <button type="button" onClick={() => loanDetails && openGoldReceipt(loanDetails)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-xs font-medium w-fit">
                    <Printer className="h-3.5 w-3.5" /> Print Receipt
                  </button>
                </div>
              </div>
            )}
            {goldDetail.remarks && <div className="mt-4 p-3 bg-gray-50 rounded-lg"><p className="text-sm font-medium text-gray-600">Remarks</p><p className="text-sm text-gray-500 mt-1">{goldDetail.remarks}</p></div>}
          </CardContent>
        </Card>
      )}

      {/* ──────────── VEHICLE LOAN RECEIPT ──────────── */}
      {isVehicleLoan && vehicleDetail && (
        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-600" />
              Vehicle Loan Receipt
              <Badge className="bg-blue-100 text-blue-700 ml-2">Collateral Details</Badge>
              <button
                type="button"
                onClick={() => loanDetails && openVehicleReceipt(loanDetails)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Printer className="h-3.5 w-3.5" /> View Full Receipt
              </button>
            </CardTitle>
            <CardDescription>Vehicle details pledged for this loan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg"><div className="flex items-center gap-2 text-blue-600 mb-1"><Car className="h-4 w-4" /><span className="text-xs font-medium">Vehicle Type</span></div><p className="text-lg font-bold text-gray-800">{vehicleDetail.vehicleType}</p></div>
              <div className="p-3 bg-blue-50 rounded-lg"><div className="flex items-center gap-2 text-blue-600 mb-1"><Hash className="h-4 w-4" /><span className="text-xs font-medium">Reg. Number</span></div><p className="text-lg font-bold text-gray-800">{vehicleDetail.vehicleNumber || 'N/A'}</p></div>
              <div className="p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-2 text-gray-600 mb-1"><Settings className="h-4 w-4" /><span className="text-xs font-medium">Manufacturer</span></div><p className="text-lg font-bold text-gray-800">{vehicleDetail.manufacturer || 'N/A'}</p></div>
              <div className="p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-2 text-gray-600 mb-1"><Car className="h-4 w-4" /><span className="text-xs font-medium">Model</span></div><p className="text-lg font-bold text-gray-800">{vehicleDetail.model || 'N/A'}</p></div>
              <div className="p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-2 text-gray-600 mb-1"><Calendar className="h-4 w-4" /><span className="text-xs font-medium">Year</span></div><p className="text-lg font-bold text-gray-800">{vehicleDetail.yearOfManufacture || 'N/A'}</p></div>
              {vehicleDetail.fuelType && <div className="p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-2 text-gray-600 mb-1"><Droplet className="h-4 w-4" /><span className="text-xs font-medium">Fuel</span></div><p className="text-lg font-bold text-gray-800">{vehicleDetail.fuelType}</p></div>}
              {vehicleDetail.color && <div className="p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-2 text-gray-600 mb-1"><Palette className="h-4 w-4" /><span className="text-xs font-medium">Color</span></div><p className="text-lg font-bold text-gray-800">{vehicleDetail.color}</p></div>}
              <div className="p-3 bg-emerald-50 rounded-lg"><div className="flex items-center gap-2 text-emerald-600 mb-1"><IndianRupee className="h-4 w-4" /><span className="text-xs font-medium">Valuation</span></div><p className="text-lg font-bold text-emerald-700">{formatCurrency(vehicleDetail.valuationAmount)}</p></div>
              <div className="p-3 bg-blue-50 rounded-lg"><div className="flex items-center gap-2 text-blue-600 mb-1"><IndianRupee className="h-4 w-4" /><span className="text-xs font-medium">Loan Amount</span></div><p className="text-lg font-bold text-blue-700">{formatCurrency(vehicleDetail.loanAmount)}</p></div>
            </div>
            <div className="mt-4 space-y-2">
              {vehicleDetail.chassisNumber && <div className="flex items-center gap-2 text-sm"><span className="text-gray-500 w-32">Chassis No:</span><span className="font-mono font-medium text-xs">{vehicleDetail.chassisNumber}</span></div>}
              {vehicleDetail.engineNumber && <div className="flex items-center gap-2 text-sm"><span className="text-gray-500 w-32">Engine No:</span><span className="font-mono font-medium text-xs">{vehicleDetail.engineNumber}</span></div>}
              {vehicleDetail.ownerName && <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Owner:</span><span className="font-medium">{vehicleDetail.ownerName}</span></div>}
              {vehicleDetail.verificationDate && <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Verified:</span><span className="font-medium">{formatDate(vehicleDetail.verificationDate)}</span></div>}
            </div>
            {/* Vehicle & RC photos inline thumbnails */}
            {(vehicleDetail.vehiclePhoto || vehicleDetail.rcBookPhoto) && (
              <div className="mt-4 flex flex-wrap gap-4">
                {vehicleDetail.vehiclePhoto && (
                  <div className="flex items-start gap-3 p-3 border border-blue-200 rounded-lg bg-blue-50/50">
                    <button type="button" onClick={() => openDoc(vehicleDetail.vehiclePhoto!)} className="shrink-0">
                      <img src={vehicleDetail.vehiclePhoto} alt="Vehicle" className="w-24 h-24 object-cover rounded-lg border-2 border-blue-300 hover:opacity-90 transition-opacity" />
                    </button>
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium text-gray-700">Vehicle Photo</p>
                      <button type="button" onClick={() => openDoc(vehicleDetail.vehiclePhoto!)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium w-fit">
                        <Eye className="h-3.5 w-3.5" /> View Full
                      </button>
                    </div>
                  </div>
                )}
                {vehicleDetail.rcBookPhoto && (
                  <div className="flex items-start gap-3 p-3 border border-emerald-200 rounded-lg bg-emerald-50/50">
                    <button type="button" onClick={() => openDoc(vehicleDetail.rcBookPhoto!)} className="shrink-0">
                      <img src={vehicleDetail.rcBookPhoto} alt="RC Book" className="w-24 h-24 object-cover rounded-lg border-2 border-emerald-300 hover:opacity-90 transition-opacity" />
                    </button>
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium text-gray-700">RC Book</p>
                      <button type="button" onClick={() => openDoc(vehicleDetail.rcBookPhoto!)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors text-xs font-medium w-fit">
                        <Eye className="h-3.5 w-3.5" /> View Full
                      </button>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => loanDetails && openVehicleReceipt(loanDetails)}
                  className="self-center inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Printer className="h-4 w-4" /> Print Full Receipt
                </button>
              </div>
            )}
            {vehicleDetail.remarks && <div className="mt-4 p-3 bg-gray-50 rounded-lg"><p className="text-sm font-medium text-gray-600">Remarks</p><p className="text-sm text-gray-500 mt-1">{vehicleDetail.remarks}</p></div>}
          </CardContent>
        </Card>
      )}

      {/* ──────────── KYC DOCUMENTS ──────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            KYC Documents
          </CardTitle>
          <CardDescription>Click to view or download documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {documents.map((doc, i) => (
              <button
                key={i}
                type="button"
                onClick={() => openDoc(doc.url!)}
                className="p-4 border rounded-lg flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors text-left w-full"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{doc.name}</p>
                  <p className="text-xs text-gray-500">Click to view</p>
                </div>
                <Eye className="h-4 w-4 text-gray-400" />
              </button>
            ))}
            {loanDetails?.disbursementProof && (
              <button
                type="button"
                onClick={() => openDoc(loanDetails.disbursementProof!)}
                className="p-4 border rounded-lg flex items-center gap-3 hover:bg-purple-50 cursor-pointer transition-colors border-purple-200 text-left w-full"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Banknote className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">Disbursement Proof</p>
                  <p className="text-xs text-purple-500">View proof</p>
                </div>
                <Eye className="h-4 w-4 text-purple-400" />
              </button>
            )}
          </div>
          {!hasAnyDocument && !isGoldLoan && !isVehicleLoan && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No documents uploaded yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

export default DocumentsSection;
