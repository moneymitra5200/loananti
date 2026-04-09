'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import LoanReceiptDialog from './LoanReceiptDialog';
import ReceiptDialog from './ReceiptDialog';

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

  // Generate loan receipt data
  const generateLoanReceipt = async () => {
    if (!loanDetails) return;
    
    setLoading(true);
    try {
      // Generate receipt number
      const companyCode = loanDetails.company?.code || 'MM';
      const receiptNo = `LR-${companyCode}-${Date.now()}`;
      
      const sessionForm = loanDetails.sessionForm || {};
      const company = loanDetails.company || {};
      const customer = loanDetails.customer || {};
      
      // Calculate totals
      const loanAmount = sessionForm.loanAmount || loanDetails.loanAmount || 0;
      const interestRate = sessionForm.interestRate || 0;
      const tenure = sessionForm.tenure || 0;
      const interestType = sessionForm.interestType || 'FLAT';
      
      // Calculate EMI and interest
      let emiAmount = 0;
      let totalInterest = 0;
      let totalAmount = 0;
      
      if (emiSchedules.length > 0) {
        emiAmount = emiSchedules[0].emiAmount || 0;
        totalAmount = emiSchedules.reduce((sum, e) => sum + (e.emiAmount || 0), 0);
        totalInterest = totalAmount - loanAmount;
      } else {
        // Calculate if no EMI schedules
        if (interestType === 'FLAT') {
          totalInterest = loanAmount * (interestRate / 100) * (tenure / 12);
          totalAmount = loanAmount + totalInterest;
          emiAmount = totalAmount / tenure;
        }
      }
      
      const receiptData: LoanReceiptData = {
        receiptNo,
        date: new Date().toISOString(),
        companyName: company.name || 'Money Mitra Financial Services',
        companyCode: company.code || 'MM',
        companyAddress: [company.address, company.city, company.state, company.pincode].filter(Boolean).join(', ') || 'India',
        companyPhone: company.contactPhone || '+91-XXXXXXXXXX',
        companyEmail: company.contactEmail || 'info@moneymitra.com',
        customerName: `${loanDetails.firstName || ''} ${loanDetails.lastName || ''}`.trim() || customer.name || '',
        fatherName: sessionForm.fatherName || '',
        customerPhone: customer.phone || loanDetails.phone || '',
        customerAddress: [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ') || loanDetails.address || '',
        customerAadhaar: customer.aadhaarNumber || '',
        customerPan: customer.panNumber || '',
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
        bankName: company.bankName || '',
        bankAccountNo: company.bankAccountNumber || '',
        bankIfsc: company.bankIfsc || '',
        purpose: sessionForm.purpose || 'Personal Loan',
        witnessName: sessionForm.witnessName || '',
        witnessPhone: sessionForm.witnessPhone || ''
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

  // Filter paid EMIs
  const paidEmis = emiSchedules.filter(emi => 
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
                Amount: ₹{formatCurrency(loanDetails.sessionForm?.loanAmount || loanDetails.loanAmount || 0)}
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
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4 text-green-600" />
            Monthly EMI Receipts
          </CardTitle>
          <CardDescription>
            {paidEmis.length} paid EMI(s) with receipts available
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paidEmis.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No paid EMIs yet. Receipts will appear here after EMI payments.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {paidEmis.map((emi) => (
                <div
                  key={emi.id}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      emi.status === 'PAID' ? 'bg-green-200' : 'bg-blue-200'
                    }`}>
                      <FileText className={`h-4 w-4 ${
                        emi.status === 'PAID' ? 'text-green-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">
                        EMI #{emi.emiNumber}
                        {emi.status === 'INTEREST_ONLY_PAID' && (
                          <span className="text-xs text-blue-600 ml-2">(Interest Only)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        Paid: {formatDate(emi.paidDate)} | ₹{formatCurrency(emi.paidAmount || emi.emiAmount)}
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
              ))}
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
