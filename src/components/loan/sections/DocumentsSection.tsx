'use client';

import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye, Banknote, Trophy, Car, Scale, Weight, IndianRupee, Calendar, User, Hash, Settings, Droplet, Palette } from 'lucide-react';
import type { LoanDetails } from './types';

interface DocumentsSectionProps {
  loanDetails: LoanDetails | null;
}

// Opens a document URL safely — handles base64 data: URLs via Blob
// (direct navigation to data: URLs is blocked by browsers)
const openDoc = (url: string) => {
  if (!url) return;
  if (url.startsWith('data:')) {
    const isPdf = url.startsWith('data:application/pdf');
    const w = window.open('', '_blank');
    if (w) {
      if (isPdf) {
        w.document.write(`<html><body style="margin:0;padding:0"><embed src="${url}" type="application/pdf" width="100%" height="100%" style="position:fixed;top:0;left:0;width:100%;height:100%"/></body></html>`);
      } else {
        w.document.write(`<html><head><title>Document</title></head><body style="margin:0;background:#1a1a1a;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${url}" style="max-width:100%;max-height:100vh;object-fit:contain;border-radius:4px"/></body></html>`);
      }
      w.document.close();
    }
  } else {
    window.open(url, '_blank');
  }
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
      {/* Gold Loan Receipt Section */}
      {isGoldLoan && goldDetail && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              Gold Loan Receipt
              <Badge className="bg-amber-100 text-amber-700 ml-2">Collateral Details</Badge>
            </CardTitle>
            <CardDescription>Gold ornament details pledged for this loan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 bg-amber-50 rounded-lg"><div className="flex items-center gap-2 text-amber-600 mb-1"><Weight className="h-4 w-4" /><span className="text-xs font-medium">Gross Weight</span></div><p className="text-lg font-bold text-gray-800">{goldDetail.grossWeight}g</p></div>
              <div className="p-3 bg-amber-50 rounded-lg"><div className="flex items-center gap-2 text-amber-600 mb-1"><Scale className="h-4 w-4" /><span className="text-xs font-medium">Net Weight</span></div><p className="text-lg font-bold text-gray-800">{goldDetail.netWeight}g</p></div>
              <div className="p-3 bg-amber-50 rounded-lg"><div className="flex items-center gap-2 text-amber-600 mb-1"><IndianRupee className="h-4 w-4" /><span className="text-xs font-medium">Gold Rate</span></div><p className="text-lg font-bold text-gray-800">₹{goldDetail.goldRate}/g</p></div>
              <div className="p-3 bg-emerald-50 rounded-lg"><div className="flex items-center gap-2 text-emerald-600 mb-1"><IndianRupee className="h-4 w-4" /><span className="text-xs font-medium">Valuation Amount</span></div><p className="text-lg font-bold text-emerald-700">{formatCurrency(goldDetail.valuationAmount)}</p></div>
              <div className="p-3 bg-blue-50 rounded-lg"><div className="flex items-center gap-2 text-blue-600 mb-1"><IndianRupee className="h-4 w-4" /><span className="text-xs font-medium">Loan Amount</span></div><p className="text-lg font-bold text-blue-700">{formatCurrency(goldDetail.loanAmount)}</p></div>
              <div className="p-3 bg-purple-50 rounded-lg"><div className="flex items-center gap-2 text-purple-600 mb-1"><Settings className="h-4 w-4" /><span className="text-xs font-medium">Purity (Karat)</span></div><p className="text-lg font-bold text-purple-700">{goldDetail.karat || 22}K</p></div>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {goldDetail.ownerName && <div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Owner:</span><span className="font-medium">{goldDetail.ownerName}</span></div>}
              {goldDetail.numberOfItems && <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Items:</span><span className="font-medium">{goldDetail.numberOfItems}</span></div>}
              {goldDetail.verificationDate && <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Verified:</span><span className="font-medium">{formatDate(goldDetail.verificationDate)}</span></div>}
            </div>
            {goldDetail.goldItemPhoto && (
              <div className="mt-4 p-3 border rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-2">Gold Item Photo</p>
                <button type="button" onClick={() => openDoc(goldDetail.goldItemPhoto!)} className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors">
                  <Eye className="h-4 w-4" /> View Gold Photo
                </button>
              </div>
            )}
            {goldDetail.remarks && <div className="mt-4 p-3 bg-gray-50 rounded-lg"><p className="text-sm font-medium text-gray-600">Remarks</p><p className="text-sm text-gray-500 mt-1">{goldDetail.remarks}</p></div>}
          </CardContent>
        </Card>
      )}

      {/* Vehicle Loan Receipt Section */}
      {isVehicleLoan && vehicleDetail && (
        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-600" />
              Vehicle Loan Receipt
              <Badge className="bg-blue-100 text-blue-700 ml-2">Collateral Details</Badge>
            </CardTitle>
            <CardDescription>Vehicle details pledged for this loan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg"><div className="flex items-center gap-2 text-blue-600 mb-1"><Car className="h-4 w-4" /><span className="text-xs font-medium">Vehicle Type</span></div><p className="text-lg font-bold text-gray-800">{vehicleDetail.vehicleType}</p></div>
              <div className="p-3 bg-blue-50 rounded-lg"><div className="flex items-center gap-2 text-blue-600 mb-1"><Hash className="h-4 w-4" /><span className="text-xs font-medium">Vehicle Number</span></div><p className="text-lg font-bold text-gray-800">{vehicleDetail.vehicleNumber || 'N/A'}</p></div>
              <div className="p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-2 text-gray-600 mb-1"><Settings className="h-4 w-4" /><span className="text-xs font-medium">Manufacturer</span></div><p className="text-lg font-bold text-gray-800">{vehicleDetail.manufacturer || 'N/A'}</p></div>
              <div className="p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-2 text-gray-600 mb-1"><Car className="h-4 w-4" /><span className="text-xs font-medium">Model</span></div><p className="text-lg font-bold text-gray-800">{vehicleDetail.model || 'N/A'}</p></div>
              <div className="p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-2 text-gray-600 mb-1"><Calendar className="h-4 w-4" /><span className="text-xs font-medium">Year</span></div><p className="text-lg font-bold text-gray-800">{vehicleDetail.yearOfManufacture || 'N/A'}</p></div>
              {vehicleDetail.fuelType && <div className="p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-2 text-gray-600 mb-1"><Droplet className="h-4 w-4" /><span className="text-xs font-medium">Fuel Type</span></div><p className="text-lg font-bold text-gray-800">{vehicleDetail.fuelType}</p></div>}
              {vehicleDetail.color && <div className="p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-2 text-gray-600 mb-1"><Palette className="h-4 w-4" /><span className="text-xs font-medium">Color</span></div><p className="text-lg font-bold text-gray-800">{vehicleDetail.color}</p></div>}
              <div className="p-3 bg-emerald-50 rounded-lg"><div className="flex items-center gap-2 text-emerald-600 mb-1"><IndianRupee className="h-4 w-4" /><span className="text-xs font-medium">Valuation Amount</span></div><p className="text-lg font-bold text-emerald-700">{formatCurrency(vehicleDetail.valuationAmount)}</p></div>
              <div className="p-3 bg-blue-50 rounded-lg"><div className="flex items-center gap-2 text-blue-600 mb-1"><IndianRupee className="h-4 w-4" /><span className="text-xs font-medium">Loan Amount</span></div><p className="text-lg font-bold text-blue-700">{formatCurrency(vehicleDetail.loanAmount)}</p></div>
            </div>
            <div className="mt-4 space-y-2">
              {vehicleDetail.chassisNumber && <div className="flex items-center gap-2 text-sm"><span className="text-gray-500 w-32">Chassis No:</span><span className="font-mono font-medium text-xs">{vehicleDetail.chassisNumber}</span></div>}
              {vehicleDetail.engineNumber && <div className="flex items-center gap-2 text-sm"><span className="text-gray-500 w-32">Engine No:</span><span className="font-mono font-medium text-xs">{vehicleDetail.engineNumber}</span></div>}
              {vehicleDetail.ownerName && <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Owner:</span><span className="font-medium">{vehicleDetail.ownerName}</span></div>}
              {vehicleDetail.verificationDate && <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-gray-400" /><span className="text-gray-500">Verified:</span><span className="font-medium">{formatDate(vehicleDetail.verificationDate)}</span></div>}
            </div>
            {(vehicleDetail.rcBookPhoto || vehicleDetail.vehiclePhoto) && (
              <div className="mt-4 flex flex-wrap gap-3">
                {vehicleDetail.rcBookPhoto && (
                  <button type="button" onClick={() => openDoc(vehicleDetail.rcBookPhoto!)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                    <Eye className="h-4 w-4" /> View RC Book
                  </button>
                )}
                {vehicleDetail.vehiclePhoto && (
                  <button type="button" onClick={() => openDoc(vehicleDetail.vehiclePhoto!)} className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                    <Eye className="h-4 w-4" /> View Vehicle Photo
                  </button>
                )}
              </div>
            )}
            {vehicleDetail.remarks && <div className="mt-4 p-3 bg-gray-50 rounded-lg"><p className="text-sm font-medium text-gray-600">Remarks</p><p className="text-sm text-gray-500 mt-1">{vehicleDetail.remarks}</p></div>}
          </CardContent>
        </Card>
      )}

      {/* KYC Documents Section */}
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
