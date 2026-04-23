'use client';

import { memo, useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Receipt, CheckCircle, Calendar, IndianRupee, Percent, FileText, Check, Download, Loader2,
  AlertTriangle, Clock
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { motion } from 'framer-motion';
import type { EMISchedule } from './types';
import EMISettingsButton from '@/components/shared/EMISettingsButton';
import ReceiptDialog from '@/components/receipt/ReceiptDialog';
import { toast } from '@/hooks/use-toast';
import generateAllReceiptsPDF from '@/lib/generate-receipts-pdf';
import { openDoc } from '@/utils/openDoc';

interface ReceiptData {
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

interface EMISectionProps {
  emiSchedules: EMISchedule[];
  currentUserRole: string;
  currentUserId: string;
  loanApplicationId: string;
  companyId?: string;
  loanAmount?: number; // For penalty calculation
  onPayEMI: (emi: EMISchedule) => void;
  onPayMultiEMI?: (emis: EMISchedule[]) => void;
  onChangeDate: (emi: EMISchedule) => void;
  isMirrorLoan?: boolean;
  hasMirrorLoan?: boolean; // Whether this loan has a mirror loan attached
}

/**
 * Calculate penalty for overdue EMI
 * Formula: loan_amount / 1000 = penalty per day
 */
function calculatePenaltyInfo(dueDate: string, loanAmount: number): { daysOverdue: number; penaltyAmount: number; ratePerDay: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysOverdue = Math.max(0, Math.floor((today.getTime() - due.getTime()) / msPerDay));
  const ratePerDay = Math.round(loanAmount / 1000);
  const penaltyAmount = daysOverdue * ratePerDay;
  
  return { daysOverdue, penaltyAmount, ratePerDay };
}

const EMISection = memo(function EMISection({ 
  emiSchedules, 
  currentUserRole,
  currentUserId,
  loanApplicationId,
  companyId,
  loanAmount = 0,
  onPayEMI, 
  onPayMultiEMI,
  onChangeDate,
  isMirrorLoan = false,
  hasMirrorLoan = false
}: EMISectionProps) {
  // Receipt dialog state
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Multi-EMI selection state
  const [selectedEMIs, setSelectedEMIs] = useState<Set<string>>(new Set());
  const [multiPayDialogOpen, setMultiPayDialogOpen] = useState(false);

  // Receipt visibility logic:
  // - If loan has NO mirror loan → Show "Received" button (mark as received)
  // - If loan IS a mirror loan → Show "Receipt" button (view receipt)
  // - If loan HAS a mirror loan (original) → DON'T show any button
  const showReceivedButton = !hasMirrorLoan && !isMirrorLoan; // No mirror loan exists
  const showReceiptButton = isMirrorLoan; // This IS a mirror loan

  // Count paid EMIs (includes both PAID and INTEREST_ONLY_PAID)
  const paidCount = emiSchedules.filter(e => e.status === 'PAID' || e.status === 'INTEREST_ONLY_PAID').length;
  const interestOnlyCount = emiSchedules.filter(e => e.status === 'INTEREST_ONLY_PAID').length;

  // FIX-22: Single source-of-truth for which EMIs can be selected/paid.
  // This MUST match the checkbox render condition at line ~252 exactly.
  const isPayableStatus = (s: string) => s !== 'PAID' && s !== 'INTEREST_ONLY_PAID';
  const payableEMIs = emiSchedules.filter(e => isPayableStatus(e.status));

  // FIX-33: Accountant may view loans but CANNOT pay any EMI
  const canPayEMI = currentUserRole !== 'ACCOUNTANT';

  // Multi-EMI selection handlers
  const toggleEMISelection = (emiId: string) => {
    const newSelected = new Set(selectedEMIs);
    if (newSelected.has(emiId)) {
      newSelected.delete(emiId);
    } else {
      newSelected.add(emiId);
    }
    setSelectedEMIs(newSelected);
  };

  const selectAllPayable = () => {
    if (selectedEMIs.size === payableEMIs.length) {
      setSelectedEMIs(new Set());
    } else {
      setSelectedEMIs(new Set(payableEMIs.map(e => e.id)));
    }
  };

  const handleMultiPay = () => {
    const selectedEMIList = emiSchedules.filter(e => selectedEMIs.has(e.id));
    if (selectedEMIList.length === 0) {
      toast({ title: 'No EMIs Selected', description: 'Please select at least one EMI to pay', variant: 'destructive' });
      return;
    }
    if (onPayMultiEMI) {
      onPayMultiEMI(selectedEMIList);
    }
    setSelectedEMIs(new Set());
  };  const getTotalSelectedAmount = () => {
    return emiSchedules
      .filter(e => selectedEMIs.has(e.id))
      // Use pre-computed remainingAmount if available; otherwise derive from emiAmount - paidAmount.
      // This correctly handles PARTIALLY_PAID EMIs (e.g. ₹600 remaining, not full ₹1,200).
      .reduce((sum, e) => {
        const remaining = e.remainingAmount !== undefined && e.remainingAmount !== null
          ? e.remainingAmount
          : (e.emiAmount - (e.paidAmount || 0));
        return sum + Math.max(0, remaining);
      }, 0);
  };


  // Fetch receipt data
  const fetchReceipt = async (emiScheduleId: string) => {
    setLoadingReceipt(emiScheduleId);
    try {
      const response = await fetch(`/api/receipt?emiScheduleId=${emiScheduleId}`);
      const data = await response.json();
      
      if (data.success && data.receiptData) {
        setReceiptData(data.receiptData);
        setReceiptDialogOpen(true);
      } else {
        console.error('Receipt not found:', data.error);
        toast({ title: 'Receipt Not Available', description: 'Receipt not available for this EMI', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
      toast({ title: 'Error', description: 'Failed to load receipt', variant: 'destructive' });
    } finally {
      setLoadingReceipt(null);
    }
  };

  // Mark EMI as received (for non-mirror loans)
  const markAsReceived = async (emiScheduleId: string) => {
    setLoadingReceipt(emiScheduleId);
    try {
      const response = await fetch('/api/emi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emiId: emiScheduleId,
          action: 'markReceived',
          userId: currentUserId
        })
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Marked as Received', description: 'EMI has been marked as received' });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to mark as received', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error marking as received:', error);
      toast({ title: 'Error', description: 'Failed to mark as received', variant: 'destructive' });
    } finally {
      setLoadingReceipt(null);
    }
  };

  // Download all receipts as PDF
  const handleDownloadAllReceipts = async () => {
    if (paidCount === 0) {
      toast({ title: 'No Receipts', description: 'No paid EMIs found to generate receipts', variant: 'destructive' });
      return;
    }

    setDownloadingAll(true);
    try {
      const response = await fetch(`/api/receipt/download-all?loanId=${loanApplicationId}`);
      const data = await response.json();

      if (data.success && data.receipts && data.receipts.length > 0) {
        generateAllReceiptsPDF(data.receipts, `EMI Receipts - ${data.receipts[0]?.loanAccountNo || 'Loan'}`);
        toast({ title: 'Success', description: `Generated ${data.receipts.length} receipt(s) as PDF` });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to fetch receipts', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error downloading all receipts:', error);
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' });
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600" />
                EMI Schedule
                {isMirrorLoan && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full ml-2">
                    Mirror Loan (Read-Only)
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {paidCount} of {emiSchedules.length} EMIs paid
                {interestOnlyCount > 0 && ` (${interestOnlyCount} interest only)`}
                {isMirrorLoan && ' • Payments sync from original loan'}
              </CardDescription>
            </div>
            {/* Multi-EMI Pay Button */}
            {!isMirrorLoan && canPayEMI && selectedEMIs.size > 0 && onPayMultiEMI && (
              <Button 
                className="bg-emerald-500 hover:bg-emerald-600"
                onClick={handleMultiPay}
              >
                <IndianRupee className="h-4 w-4 mr-1" />
                Pay {selectedEMIs.size} EMIs (₹{formatCurrency(getTotalSelectedAmount())})
              </Button>
            )}
            {/* Download All Receipts Button */}
            {paidCount > 0 && (
              <Button 
                variant="outline"
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                onClick={handleDownloadAllReceipts}
                disabled={downloadingAll}
              >
                {downloadingAll ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                {downloadingAll ? 'Generating...' : 'Download All Receipts'}
              </Button>
            )}
          </div>
          {/* Select All Checkbox — FIX-22: uses same isPayableStatus predicate */}
          {!isMirrorLoan && canPayEMI && payableEMIs.length > 0 && onPayMultiEMI && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t">
              <Checkbox
                id="select-all-emi"
                checked={selectedEMIs.size === payableEMIs.length && payableEMIs.length > 0}
                onCheckedChange={selectAllPayable}
              />
              <label htmlFor="select-all-emi" className="text-sm text-gray-600 cursor-pointer">
                Select All Payable EMIs ({payableEMIs.length} available)
              </label>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {emiSchedules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>No EMI schedule found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {emiSchedules.map((emi) => {
                const isPaid = emi.status === 'PAID' || emi.status === 'INTEREST_ONLY_PAID';
                const isSelected = selectedEMIs.has(emi.id);
                
                // Calculate penalty for overdue EMIs
                const isOverdue = emi.status === 'OVERDUE' || (emi.status === 'PENDING' && new Date(emi.dueDate) < new Date());
                const penaltyInfo = (isOverdue && !isPaid && loanAmount > 0) 
                  ? calculatePenaltyInfo(emi.dueDate, loanAmount) 
                  : null;
                const isPrincipalOnly = emi.status === 'PAID'
                  && Math.abs(Number(emi.paidAmount || 0) - Number(emi.principalAmount || 0)) < 0.01
                  && Number(emi.paidInterest || 0) === 0
                  && Number(emi.interestAmount || 0) > 0;
                const totalWithPenalty = emi.emiAmount + (penaltyInfo?.penaltyAmount || emi.lateFee || 0);
                
                return (
                <motion.div 
                  key={emi.id}
                  className={`p-4 border rounded-xl relative ${
                    isPrincipalOnly ? 'bg-emerald-50 border-emerald-200' :
                    emi.status === 'PAID' ? 'bg-green-50 border-green-200' :
                    emi.status === 'INTEREST_ONLY_PAID' ? 'bg-blue-50 border-blue-200' :
                    isSelected ? 'bg-emerald-50 border-emerald-300' :
                    isOverdue ? 'bg-red-50 border-red-300' :
                    emi.status === 'PARTIALLY_PAID' ? 'bg-orange-50 border-orange-200' :
                    'bg-white'
                  }`}
                  whileHover={{ scale: 1.01 }}
                >
                  {/* Penalty Banner for Overdue EMIs */}
                  {penaltyInfo && penaltyInfo.penaltyAmount > 0 && (
                    <div className="mb-3 p-3 bg-gradient-to-r from-red-100 to-orange-100 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-red-500 text-white text-xs">PENALTY</Badge>
                            <span className="font-bold text-red-700">₹{penaltyInfo.penaltyAmount.toLocaleString('en-IN')}</span>
                            <span className="text-xs text-red-600">
                              ({penaltyInfo.daysOverdue} days × ₹{penaltyInfo.ratePerDay}/day)
                            </span>
                          </div>
                          <p className="text-xs text-red-500 mt-1">
                            Loan Amount: ₹{loanAmount.toLocaleString('en-IN')} → Rate: ₹{penaltyInfo.ratePerDay}/day
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Checkbox for multi-selection (only for payable EMIs, not for ACCOUNTANT) */}
                      {!isMirrorLoan && canPayEMI && isPayableStatus(emi.status) && onPayMultiEMI && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleEMISelection(emi.id)}
                          className="mr-2"
                        />
                      )}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isPrincipalOnly ? 'bg-emerald-200' :
                        emi.status === 'PAID' ? 'bg-green-200' :
                        emi.status === 'INTEREST_ONLY_PAID' ? 'bg-blue-200' :
                        isOverdue ? 'bg-red-200' :
                        emi.status === 'PARTIALLY_PAID' ? 'bg-orange-200' :
                        'bg-gray-100'
                      }`}>
                        {emi.status === 'PAID' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : emi.status === 'INTEREST_ONLY_PAID' ? (
                          <Percent className="h-5 w-5 text-blue-600" />
                        ) : isOverdue ? (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        ) : (
                          <span className="font-semibold text-sm">{emi.emiNumber}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold flex items-center gap-2 flex-wrap">
                            EMI #{emi.emiNumber}
                            {emi.status === 'INTEREST_ONLY_PAID' && (
                              <Badge className="bg-purple-100 text-purple-700 text-[10px] uppercase font-bold py-0.5 border-purple-200">
                                INTEREST ONLY PAID
                              </Badge>
                            )}
                            {emi.status === 'PARTIALLY_PAID' && (
                              <Badge className="bg-orange-100 text-orange-700 text-[10px] uppercase font-bold py-0.5 border-orange-200">
                                PARTIALLY PAID
                              </Badge>
                            )}
                            {isPrincipalOnly && (
                              <Badge className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold py-0.5 border-emerald-200">
                                PRINCIPAL ONLY
                              </Badge>
                            )}
                          </p>
                        </div>
                        <p className="text-sm text-gray-500">Due: {formatDate(emi.dueDate)}</p>
                        {emi.lateFee && emi.lateFee > 0 && !penaltyInfo && (
                          <p className="text-xs text-red-600">Late Fee: ₹{formatCurrency(emi.lateFee)}</p>
                        )}
                        {emi.status === 'PARTIALLY_PAID' && emi.paidAmount && (
                          <div className="text-xs text-orange-600 space-y-1">
                            <p>Paid: ₹{formatCurrency(emi.paidAmount)} | Remaining: ₹{formatCurrency(emi.remainingAmount || (emi.emiAmount - emi.paidAmount))}</p>
                            {emi.paidPrincipal !== undefined && emi.paidInterest !== undefined && (
                              <p className="text-orange-500">(Principal: ₹{formatCurrency(emi.paidPrincipal)} | Interest: ₹{formatCurrency(emi.paidInterest)})</p>
                            )}
                            {emi.nextPaymentDate && (
                              <p className="font-medium">Next payment due: {formatDate(emi.nextPaymentDate)}</p>
                            )}
                          </div>
                        )}
                        {emi.status === 'INTEREST_ONLY_PAID' && (
                          <p className="text-xs text-blue-600 font-medium">Interest Paid - Principal deferred to new EMI</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {emi.status === 'PARTIALLY_PAID' ? (
                        <>
                          <p className="font-bold text-lg text-amber-600">
                            {formatCurrency((emi.emiAmount - (emi.paidAmount || 0)))}
                            <span className="text-xs font-normal text-gray-400 ml-1">remaining</span>
                          </p>
                          <p className="text-xs text-green-600">✓ Paid: {formatCurrency(emi.paidAmount || 0)} of {formatCurrency(emi.emiAmount)}</p>
                        </>
                      ) : emi.status === 'INTEREST_ONLY_PAID' ? (
                        <>
                          <p className="font-bold text-lg text-blue-600">
                            {formatCurrency(Number(emi.paidInterest || 0) > 0 ? emi.paidInterest! : emi.interestAmount)}
                            <span className="text-xs font-normal text-gray-400 ml-1">interest</span>
                          </p>
                          <p className="text-xs text-gray-400 line-through">EMI: {formatCurrency(emi.emiAmount)}</p>
                        </>
                      ) : isPrincipalOnly ? (
                        <>
                          <p className="font-bold text-lg text-emerald-700">
                            {formatCurrency(emi.principalAmount)}
                            <span className="text-xs font-normal text-gray-400 ml-1">principal</span>
                          </p>
                          <p className="text-xs text-gray-400 line-through">EMI: {formatCurrency(emi.emiAmount)}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-lg">{formatCurrency(emi.emiAmount)}</p>
                          {penaltyInfo && penaltyInfo.penaltyAmount > 0 && (
                            <p className="text-sm text-red-600 font-bold animate-pulse">
                              + ₹{penaltyInfo.penaltyAmount.toLocaleString('en-IN')} Penalty
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            P: ₹{formatCurrency(emi.principalAmount)} | I: ₹{formatCurrency(emi.interestAmount)}
                          </p>
                        </>
                      )}
                      <div className="flex gap-2 mt-2 justify-end flex-wrap">
                        {/* EMI Settings Button - Available for all roles (but not for mirror loans or PAID EMIs) */}
                        {companyId && !isMirrorLoan && !isPaid && (
                          <EMISettingsButton
                            emiScheduleId={emi.id}
                            loanApplicationId={loanApplicationId}
                            companyId={companyId}
                            userId={currentUserId}
                            emiStatus={emi.status}
                            isPartialPayment={emi.isPartialPayment || false}
                          />
                        )}
                        {/* Mirror loans are read-only - no payment buttons. ACCOUNTANT is read-only too. */}
                        {/* Also hide Pay button for INTEREST_ONLY_PAID EMIs */}
                        {!isMirrorLoan && canPayEMI && !isPaid && (
                          <>
                            <Button 
                              size="sm" 
                              className="bg-emerald-500 hover:bg-emerald-600"
                              onClick={() => onPayEMI(emi)}
                            >
                              <IndianRupee className="h-4 w-4 mr-1" /> Pay
                            </Button>
                            {/* EMI Date Change - Available for all roles except ACCOUNTANT */}
                            {currentUserRole !== 'ACCOUNTANT' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => onChangeDate(emi)}
                              >
                                <Calendar className="h-4 w-4 mr-1" /> Change Date
                              </Button>
                            )}
                          </>
                        )}
                        {/* Mirror loan indicator for unpaid EMIs */}
                        {isMirrorLoan && !isPaid && (
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            Synced from original
                          </span>
                        )}
                      </div>
                      {emi.status === 'PAID' && (
                        <div className="text-xs text-green-600 space-y-1 mt-2">
                          <p>Paid: {formatDate(emi.paidDate!)}</p>
                          {/* FIX-43: Show actual paidPrincipal/paidInterest, fallback to schedule amounts */}
                          <p className="text-gray-500">
                            Principal: ₹{formatCurrency(emi.paidPrincipal && emi.paidPrincipal > 0 ? emi.paidPrincipal : emi.principalAmount)}
                            {' | '}
                            Interest: ₹{formatCurrency(emi.paidInterest && emi.paidInterest > 0 ? emi.paidInterest : emi.interestAmount)}
                          </p>
                          {/* Receipt Button - Only show in mirror loan EMI schedule */}
                          {showReceiptButton && (
                            <div className="flex gap-2 justify-end">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-7 text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
                                onClick={() => fetchReceipt(emi.id)}
                                disabled={loadingReceipt === emi.id}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                {loadingReceipt === emi.id ? 'Loading...' : 'Receipt'}
                              </Button>
                              {emi.proofUrl && (
                                <button
                                  type="button"
                                  onClick={() => openDoc(emi.proofUrl!)}
                                  className="inline-flex items-center gap-1 h-7 px-2 text-xs border border-purple-300 text-purple-600 hover:bg-purple-50 rounded-md"
                                >
                                  <FileText className="h-3 w-3" />
                                  View Proof ↗
                                </button>
                              )}
                            </div>
                          )}
                          {/* Received Button + Proof - for non-mirror loans */}
                          {showReceivedButton && (
                            <div className="flex gap-2 justify-end flex-wrap">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-7 text-xs border-green-300 text-green-600 hover:bg-green-50"
                                onClick={() => markAsReceived(emi.id)}
                                disabled={loadingReceipt === emi.id}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                {loadingReceipt === emi.id ? 'Marking...' : 'Received'}
                              </Button>
                              {emi.proofUrl && (
                                <button
                                  type="button"
                                  onClick={() => openDoc(emi.proofUrl!)}
                                  className="inline-flex items-center gap-1 h-7 px-2 text-xs border border-purple-300 text-purple-600 hover:bg-purple-50 rounded-md"
                                >
                                  <FileText className="h-3 w-3" />
                                  View Proof ↗
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {emi.status === 'INTEREST_ONLY_PAID' && (
                        <div className="text-xs text-blue-600 space-y-1 mt-2">
                          <p>Interest Paid: {formatDate(emi.paidDate!)}</p>
                          {/* Show interest amount */}
                          <p className="text-gray-500">
                            Interest Collected: ₹{formatCurrency(emi.paidInterest && emi.paidInterest > 0 ? emi.paidInterest : emi.interestAmount || 0)}
                          </p>
                          {/* Receipt Button - Only show in mirror loan EMI schedule */}
                          {showReceiptButton && (
                            <div className="flex gap-2 justify-end">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-7 text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
                                onClick={() => fetchReceipt(emi.id)}
                                disabled={loadingReceipt === emi.id}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                {loadingReceipt === emi.id ? 'Loading...' : 'Receipt'}
                              </Button>
                            </div>
                          )}
                          {/* Received Button - Only show if no mirror loan exists */}
                          {showReceivedButton && (
                            <div className="flex gap-2 justify-end">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-7 text-xs border-green-300 text-green-600 hover:bg-green-50"
                                onClick={() => markAsReceived(emi.id)}
                                disabled={loadingReceipt === emi.id}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                {loadingReceipt === emi.id ? 'Marking...' : 'Received'}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <ReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        receiptData={receiptData}
      />
    </>
  );
});

export default EMISection;
