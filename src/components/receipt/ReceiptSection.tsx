'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Loader2, FileDown } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import LoanReceiptDialog from './LoanReceiptDialog';
import ReceiptDialog from './ReceiptDialog';
import { generateAllReceiptsPDF } from '@/lib/generate-receipts-pdf';

interface ReceiptSectionProps {
  loanDetails: any;
  emiSchedules: any[];
}

interface LoanReceiptData {
  receiptNo: string;
  date: string;
  companyName: string;
  companyCode: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  customerName: string;
  fatherName: string;
  customerPhone: string;
  customerAddress: string;
  customerAadhaar: string;
  customerPan: string;
  loanAccountNo: string;
  loanAmount: number;
  interestRate: number;
  interestType: string;
  tenure: number;
  emiAmount: number;
  totalInterest: number;
  totalAmount: number;
  disbursementDate: string;
  firstEmiDate: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  purpose: string;
  witnessName: string;
  witnessPhone: string;
}

interface EMIReceiptData {
  receiptNo: string;
  date: string;
  customerName: string;
  fatherName: string;
  phone: string;
  address: string;
  loanAccountNo: string;
  loanAmount: number;
  interestRate: number;
  mirrorInterestRate: number;
  tenure: number;
  emiNumber: number;
  totalEmis: number;
  dueDate: string;
  paymentDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  paymentMode: string;
  referenceNo: string;
  balanceDue: number;
  companyName: string;
  companyCode: string;
  isInterestOnly?: boolean;
}

export default function ReceiptSection({ loanDetails, emiSchedules }: ReceiptSectionProps) {
  const [showLoanReceipt, setShowLoanReceipt] = useState(false);
  const [showEmiReceipt, setShowEmiReceipt] = useState(false);
  const [loanReceiptData, setLoanReceiptData] = useState<LoanReceiptData | null>(null);
  const [emiReceiptData, setEmiReceiptData] = useState<EMIReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEmiId, setLoadingEmiId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Generate loan receipt data
  const generateLoanReceipt = async () => {
    if (!loanDetails) return;
    
    setLoading(true);
    try {
      // Generate receipt number
      const companyCode = loanDetails.company?.code || 'MM';
      const receiptNo = `LR-${companyCode}-${loanDetails.applicationNo || Date.now()}`;
      
      const sessionForm = loanDetails.sessionForm || {};
      const company = loanDetails.company || {};
      const customer = loanDetails.customer || {};
      
      // FIX: correct field name is approvedAmount (not loanAmount)
      const loanAmount = sessionForm.approvedAmount || loanDetails.disbursedAmount || loanDetails.requestedAmount || 0;
      const interestRate = sessionForm.interestRate || loanDetails.interestRate || 0;
      const tenure = sessionForm.tenure || loanDetails.tenure || 0;
      const interestType = sessionForm.interestType || 'FLAT';
      
      // EMI + totals — prefer schedule data for accuracy
      let emiAmount: number = sessionForm.emiAmount || 0;
      let totalInterest: number = sessionForm.totalInterest || 0;
      let totalAmount: number = sessionForm.totalAmount || 0;
      
      if (emiSchedules.length > 0 && emiAmount === 0) {
        // Derive from schedule (totalAmount field on each EMI row)
        emiAmount = emiSchedules[0].emiAmount || emiSchedules[0].totalAmount || 0;
        totalAmount = emiSchedules.reduce((sum: number, e: any) => sum + (e.emiAmount || e.totalAmount || 0), 0);
        totalInterest = Math.max(0, totalAmount - loanAmount);
      }
      
      // Customer details — prefer application-level fields, fallback to customer profile
      const custName = [
        loanDetails.title,
        loanDetails.firstName,
        loanDetails.middleName,
        loanDetails.lastName
      ].filter(Boolean).join(' ') || customer.name || '';
      
      const custAddress = [
        loanDetails.address || customer.address,
        loanDetails.city || customer.city,
        loanDetails.state || customer.state,
        loanDetails.pincode || customer.pincode
      ].filter(Boolean).join(', ');
      
      // Bank details — from customer profile
      const custBank = customer.bankName || loanDetails.bankName || '';
      const custBankAcc = customer.bankAccountNumber || loanDetails.bankAccountNumber || '';
      const custBankIfsc = customer.bankIfsc || loanDetails.bankIfsc || '';
      
      const receiptData: LoanReceiptData = {
        receiptNo,
        date: new Date().toISOString(),
        companyName: company.name || 'Money Mitra Financial Services',
        companyCode: company.code || 'MM',
        companyAddress: [company.address, company.city, company.state].filter(Boolean).join(', ') || 'India',
        companyPhone: company.contactPhone || '',
        companyEmail: company.contactEmail || '',
        customerName: custName,
        fatherName: loanDetails.fatherName || '',
        customerPhone: loanDetails.phone || customer.phone || '',
        customerAddress: custAddress,
        customerAadhaar: loanDetails.aadhaarNumber || customer.aadhaarNumber || '',
        customerPan: loanDetails.panNumber || customer.panNumber || '',
        loanAccountNo: loanDetails.applicationNo || '',
        loanAmount,
        interestRate,
        interestType,
        tenure,
        emiAmount,
        totalInterest,
        totalAmount,
        disbursementDate: loanDetails.disbursedAt || new Date().toISOString(),
        firstEmiDate: emiSchedules[0]?.dueDate || new Date().toISOString(),
        bankName: custBank,
        bankAccountNo: custBankAcc,
        bankIfsc: custBankIfsc,
        purpose: loanDetails.purpose || sessionForm.purpose || 'Personal Loan',
        witnessName: loanDetails.reference1Name || '',
        witnessPhone: loanDetails.reference1Phone || ''
      };
      
      setLoanReceiptData(receiptData);
      setShowLoanReceipt(true);
    } catch (error) {
      console.error('Error generating loan receipt:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch EMI receipt
  const fetchEmiReceipt = async (emiScheduleId: string) => {
    setLoadingEmiId(emiScheduleId);
    try {
      const response = await fetch(`/api/receipt?emiScheduleId=${emiScheduleId}`);
      const data = await response.json();
      
      if (data.success && data.receiptData) {
        setEmiReceiptData(data.receiptData);
        setShowEmiReceipt(true);
      }
    } catch (error) {
      console.error('Error fetching EMI receipt:', error);
    } finally {
      setLoadingEmiId(null);
    }
  };

  // Download all receipts as PDF
  const downloadAllReceipts = async () => {
    if (!loanDetails || paidEmis.length === 0) return;
    
    setDownloadingAll(true);
    try {
      const loanId = loanDetails.id || loanDetails.loanId;
      const isOffline = loanDetails.isOffline || false;
      
      const response = await fetch(`/api/receipt/download-all?loanId=${loanId}&isOffline=${isOffline}`);
      const data = await response.json();
      
      if (data.success && data.receipts && data.receipts.length > 0) {
        generateAllReceiptsPDF(data.receipts, `EMI Receipts - ${loanDetails.applicationNo || loanDetails.loanNumber}`);
      } else {
        alert('No paid EMI receipts found to download');
      }
    } catch (error) {
      console.error('Error downloading all receipts:', error);
      alert('Failed to download receipts');
    } finally {
      setDownloadingAll(false);
    }
  };

  // Filter paid EMIs — support both field naming conventions (online vs offline)
  const paidEmis = emiSchedules.filter((emi: any) => 
    emi.paymentStatus === 'PAID' || emi.paymentStatus === 'INTEREST_ONLY_PAID' ||
    emi.status === 'PAID' || emi.status === 'INTEREST_ONLY_PAID'
  );

  if (!loanDetails) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
        <p>No loan details available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Full Loan Receipt Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            Loan Disbursement Receipt
          </CardTitle>
          <CardDescription>
            Generate receipt for the full loan disbursement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <p className="font-semibold text-blue-800">Loan Account: {loanDetails.applicationNo}</p>
              <p className="text-sm text-blue-600">
                Amount: ₹{formatCurrency(loanDetails.sessionForm?.approvedAmount || loanDetails.disbursedAmount || loanDetails.requestedAmount || 0)}
              </p>
            </div>
            <Button
              onClick={generateLoanReceipt}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Generating...' : 'View Receipt'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Monthly EMI Receipts Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="h-4 w-4 text-green-600" />
                Monthly EMI Receipts
              </CardTitle>
              <CardDescription>
                {paidEmis.length} paid EMI(s) with receipts available
              </CardDescription>
            </div>
            {paidEmis.length > 0 && (
              <Button
                onClick={downloadAllReceipts}
                disabled={downloadingAll}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {downloadingAll ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                {downloadingAll ? 'Downloading...' : 'Download All Receipts'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {paidEmis.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No paid EMIs yet. Receipts will appear here after EMI payments.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {paidEmis.map((emi) => {
                const isPaid = emi.paymentStatus === 'PAID' || emi.status === 'PAID';
                const isInterestOnly = emi.paymentStatus === 'INTEREST_ONLY_PAID' || emi.status === 'INTEREST_ONLY_PAID';
                return (
                <div
                  key={emi.id}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isPaid ? 'bg-green-200' : 'bg-blue-200'
                    }`}>
                      <FileText className={`h-4 w-4 ${
                        isPaid ? 'text-green-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">
                        EMI #{emi.emiNumber || emi.installmentNumber}
                        {isInterestOnly && (
                          <span className="text-xs text-blue-600 ml-2">(Interest Only)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        Paid: {formatDate(emi.paidDate)} | ₹{formatCurrency(emi.paidAmount || emi.emiAmount || emi.totalAmount || 0)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchEmiReceipt(emi.id)}
                    disabled={loadingEmiId === emi.id}
                    className="border-green-300 text-green-600 hover:bg-green-100"
                  >
                    {loadingEmiId === emi.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        Receipt
                      </>
                    )}
                  </Button>
                </div>
              )})}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loan Receipt Dialog */}
      <LoanReceiptDialog
        open={showLoanReceipt}
        onOpenChange={setShowLoanReceipt}
        receiptData={loanReceiptData}
      />

      {/* EMI Receipt Dialog */}
      <ReceiptDialog
        open={showEmiReceipt}
        onOpenChange={setShowEmiReceipt}
        receiptData={emiReceiptData}
      />
    </div>
  );
}
