'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  IndianRupee, Banknote, CreditCard, Receipt, AlertCircle,
  Calculator, TrendingUp, Clock, CalendarIcon, Info, AlertTriangle,
  CheckCircle2, User, Building2, Wallet, Landmark, QrCode, Copy
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';

interface EMIItem {
  id: string;
  installmentNumber: number;
  totalAmount: number;
  principalAmount: number;
  interestAmount: number;
  dueDate: string;
  paymentStatus: string;
  paidAmount: number;
  paidPrincipal: number;
  paidInterest: number;
  outstandingPrincipal: number;
  isPartialPayment?: boolean;
  isInterestOnly?: boolean;
  nextPaymentDate?: string;
  penaltyAmount?: number;
  daysOverdue?: number;
  offlineLoan?: {
    id: string;
    loanNumber: string;
    customerName: string;
    customerPhone: string;
    loanAmount: number;
    interestRate: number;
    tenure: number;
    company?: { id: string; name: string };
  };
  loanApplication?: {
    id: string;
    applicationNo: string;
    firstName: string;
    lastName: string;
    phone: string;
    loanAmount?: number;
    company?: { id: string; name: string };
  };
}

interface EMIPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emi: EMIItem | null;
  type: 'online' | 'offline';
  userId: string;
  userRole: string;
  onPaymentComplete: () => void;
  // New props for credit system
  isExtraEMI?: boolean;  // True if this is an extra EMI after mirror tenure
  isSecondaryPaymentPage?: boolean;  // True if Secondary Payment Page is assigned
  mirrorLoanInfo?: {
    isMirrorLoan: boolean;
    mirrorCompanyId?: string;
    mirrorPrincipal?: number;
    mirrorInterest?: number;
    mirrorTenure?: number;
  };
}

type CreditType = 'PERSONAL' | 'COMPANY';
type PaymentModeOption = 'ONLINE' | 'CASH' | 'SPLIT';

export default function EMIPaymentDialog({
  open,
  onOpenChange,
  emi,
  type,
  userId,
  userRole,
  onPaymentComplete,
  isExtraEMI = false,
  isSecondaryPaymentPage = false,
  mirrorLoanInfo
}: EMIPaymentDialogProps) {
  // Credit system state
  const [creditType, setCreditType] = useState<CreditType>('COMPANY');
  const [paymentMode, setPaymentMode] = useState<PaymentModeOption>('ONLINE');
  
  // Legacy state for partial/interest-only
  const [paymentType, setPaymentType] = useState<'FULL_EMI' | 'PARTIAL_PAYMENT' | 'INTEREST_ONLY' | 'PRINCIPAL_ONLY'>('FULL_EMI');
  const [partialAmount, setPartialAmount] = useState('');
  const [nextPaymentDate, setNextPaymentDate] = useState<Date | undefined>(undefined);
  const [paymentReference, setPaymentReference] = useState('');
  const [processing, setProcessing] = useState(false);
  const [interestOnlyConfirmed, setInterestOnlyConfirmed] = useState(false);
  // BUG-11 fix: removed editedInterest staff override field
  // Split payment state (BUG-9)
  const [splitCashAmount, setSplitCashAmount] = useState('');
  const [splitOnlineAmount, setSplitOnlineAmount] = useState('');
  
  // Penalty state - EDITABLE penalty amount (default calculated automatically)
  const [penaltyWaiver, setPenaltyWaiver] = useState('0');
  const [editedPenaltyAmount, setEditedPenaltyAmount] = useState<string>(''); // User can edit the penalty

  // Derive whether this is an interest-only loan product (PRINCIPAL_ONLY option hidden for these)
  const isInterestOnlyLoan = emi?.isInterestOnly === true;
  // Bank details state
  const [bankDetails, setBankDetails] = useState<{
    bankName: string;
    accountNumber: string;
    accountName: string;
    ownerName?: string;
    ifscCode?: string;
    upiId?: string;
    qrCodeUrl?: string;
  } | null>(null);
  const [loadingBankDetails, setLoadingBankDetails] = useState(false);

  // Determine if this is an Extra EMI
  const isActuallyExtraEMI = isExtraEMI || (mirrorLoanInfo && emi && emi.installmentNumber > (mirrorLoanInfo.mirrorTenure || 0));
  // True when this is an original (non-mirror) online loan — interest is editable
  const isOriginalOnlineLoan = type === 'online' && !mirrorLoanInfo?.isMirrorLoan;
  
  // Determine if Personal Credit should be available
  // Personal Credit is only for Extra EMIs when Secondary Payment Page is assigned
  const showPersonalCredit = isActuallyExtraEMI && isSecondaryPaymentPage;

  useEffect(() => {
    // Auto-select Personal Credit if it's an Extra EMI with Secondary Payment Page
    if (showPersonalCredit) {
      setCreditType('PERSONAL');
      setPaymentMode('CASH'); // Personal Credit is always CASH
    }
  }, [showPersonalCredit]);

  // Get companyId early - needed for bank details fetch
  const companyId = emi ? (type === 'offline'
    ? emi.offlineLoan?.company?.id
    : emi.loanApplication?.company?.id) : undefined;

  // Fetch bank details when payment mode is ONLINE and companyId is available
  useEffect(() => {
    const fetchBankDetails = async () => {
      if (paymentMode === 'ONLINE' && companyId) {
        setLoadingBankDetails(true);
        try {
          const res = await fetch(`/api/accountant/bank-accounts?companyId=${companyId}`);
          if (res.ok) {
            const data = await res.json();
            // Get default bank account
            const defaultBank = data.bankAccounts?.find((b: any) => b.isDefault) || data.bankAccounts?.[0];
            if (defaultBank) {
              setBankDetails({
                bankName: defaultBank.bankName,
                accountNumber: defaultBank.accountNumber,
                accountName: defaultBank.accountName,
                ownerName: defaultBank.ownerName,
                ifscCode: defaultBank.ifscCode,
                upiId: defaultBank.upiId,
                qrCodeUrl: defaultBank.qrCodeUrl
              });
            }
          }
        } catch (error) {
          console.error('Failed to fetch bank details:', error);
        } finally {
          setLoadingBankDetails(false);
        }
      }
    };
    
    fetchBankDetails();
  }, [paymentMode, companyId]);

  if (!emi) return null;

  const customerName = type === 'offline'
    ? emi.offlineLoan?.customerName
    : `${emi.loanApplication?.firstName || ''} ${emi.loanApplication?.lastName || ''}`.trim();

  const loanNumber = type === 'offline'
    ? emi.offlineLoan?.loanNumber
    : emi.loanApplication?.applicationNo;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Penalty calculation helper - N lakh = N*100 per day
  // Formula: loan_amount / 1000 = penalty per day
  const getPenaltyPerDay = (loanAmount: number): number => {
    return Math.round(loanAmount / 1000);
  };

  // Check if EMI is overdue - due date has passed
  const isEmiOverdue = (() => {
    const daysOverdue = calculateDaysOverdue();
    return emi.paymentStatus === 'OVERDUE' || daysOverdue > 0 || (emi.daysOverdue && emi.daysOverdue > 0);
  })();
  
  // Get loan amount for penalty calculation
  const getLoanAmountForPenalty = (): number => {
    if (type === 'offline') {
      return emi.offlineLoan?.loanAmount || emi.totalAmount;
    }
    return emi.loanApplication?.loanAmount || emi.totalAmount;
  };
  
  // Calculate penalty details - ALWAYS calculated when overdue, but EDITABLE
  const calculatePenaltyDetails = () => {
    const daysOverdue = calculateDaysOverdue();
    if (daysOverdue <= 0) return { penaltyAmount: 0, daysOverdue: 0, ratePerDay: 0, netPenalty: 0 };
    
    const loanAmount = getLoanAmountForPenalty();
    const ratePerDay = getPenaltyPerDay(loanAmount);
    const calculatedPenalty = daysOverdue * ratePerDay; // Default calculated amount
    
    // Allow user to edit the penalty - use edited value if set, otherwise calculated
    const penaltyAmount = editedPenaltyAmount !== '' ? parseFloat(editedPenaltyAmount) || 0 : calculatedPenalty;
    const waiver = parseFloat(penaltyWaiver) || 0;
    const netPenalty = Math.max(0, penaltyAmount - waiver);
    
    return { penaltyAmount, daysOverdue, ratePerDay, netPenalty, calculatedPenalty };
  };
  
  const penaltyDetails = calculatePenaltyDetails();

  // Check if EMI is advance payment (due date month not started)
  const isEmiAdvancePayment = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const emiDueDate = new Date(emi.dueDate);
    const emiDueMonth = emiDueDate.getMonth();
    const emiDueYear = emiDueDate.getFullYear();

    return currentYear < emiDueYear || 
      (currentYear === emiDueYear && currentMonth < emiDueMonth);
  };

  // RULE: Single EMI = always pay full amount (NO advance logic)
  // Advance logic only applies when using "Select All" (multi-EMI payment)
  // So for single EMI, we ALWAYS set isAdvance to false
  const isAdvance = false; // Always false for single EMI - pay full amount

  // Calculate amounts based on payment type and credit type
  const getPaymentDetails = () => {
    const remainingAmount = emi.totalAmount - (emi.paidAmount || 0);
    const remainingPrincipal = emi.principalAmount - (emi.paidPrincipal || 0);
    const remainingInterest = emi.interestAmount - (emi.paidInterest || 0);
    
    // For Mirror Loans - use mirror amounts if available
    const effectivePrincipal = mirrorLoanInfo?.isMirrorLoan && mirrorLoanInfo.mirrorPrincipal 
      ? mirrorLoanInfo.mirrorPrincipal 
      : remainingPrincipal;
    const effectiveInterest = mirrorLoanInfo?.isMirrorLoan && mirrorLoanInfo.mirrorInterest 
      ? mirrorLoanInfo.mirrorInterest 
      : remainingInterest;
    const effectiveTotal = effectivePrincipal + effectiveInterest;
    
    // For Extra EMIs - full amount is profit (principal only for accounting)
    if (isActuallyExtraEMI) {
      return {
        amount: remainingPrincipal,
        principal: remainingPrincipal,
        interest: 0,
        description: 'Extra EMI Payment - Full Profit',
        remainingAfter: 0,
        isAdvance: false
      };
    }
    
    switch (paymentType) {
      case 'FULL_EMI':
        // For advance payments, collect only principal (no interest)
        if (isAdvance) {
          return {
            amount: effectivePrincipal,
            principal: effectivePrincipal,
            interest: 0,
            description: 'Advance Payment - Principal Only',
            remainingAfter: 0,
            isAdvance: true
          };
        }
        // BUG-11 fix: removed editedInterest override; always use DB interest
        return {
          amount: effectivePrincipal + effectiveInterest,
          principal: effectivePrincipal,
          interest: effectiveInterest,
          description: 'Full EMI Payment',
          remainingAfter: 0,
          isAdvance: false
        };
      case 'PARTIAL_PAYMENT':
        const partialValue = parseFloat(partialAmount) || 0;
        const ratio = effectiveTotal > 0 ? partialValue / effectiveTotal : 0;
        return {
          amount: partialValue,
          principal: effectivePrincipal * ratio,
          interest: effectiveInterest * ratio,
          description: `Partial Payment (${(ratio * 100).toFixed(1)}% of remaining)`,
          remainingAfter: effectiveTotal - partialValue
        };
      case 'INTEREST_ONLY':
        return {
          amount: effectiveInterest,
          principal: 0,
          interest: effectiveInterest,
          description: 'Interest Only Payment',
          remainingAfter: effectivePrincipal // Principal will be deferred
        };
      case 'PRINCIPAL_ONLY':
        return {
          amount: remainingPrincipal,    // Only principal collected
          principal: remainingPrincipal,
          interest: 0,                   // Interest is written off (Irrecoverable Debt)
          description: `Principal Only — Interest ₹${remainingInterest.toFixed(2)} written off`,
          remainingAfter: 0,
          isAdvance: false
        };
      default:
        return {
          amount: effectiveTotal,
          principal: effectivePrincipal,
          interest: effectiveInterest,
          description: 'Full EMI Payment',
          remainingAfter: 0,
          isAdvance: false
        };
    }
  };

  const details = getPaymentDetails()!;  // always defined — all cases covered including PRINCIPAL_ONLY
  const remainingAmount = emi.totalAmount - (emi.paidAmount || 0);
  const remainingPrincipal = emi.principalAmount - (emi.paidPrincipal || 0);
  const remainingInterest = emi.interestAmount - (emi.paidInterest || 0);

  // Calculate future EMI adjustment for partial payments
  const calculateFutureAdjustment = () => {
    if (paymentType !== 'PARTIAL_PAYMENT' || type !== 'offline') return null;

    const partialValue = parseFloat(partialAmount) || 0;
    const outstandingPrincipal = emi.outstandingPrincipal;
    const interestRate = emi.offlineLoan?.interestRate || 12;
    const remainingTenure = (emi.offlineLoan?.tenure || 12) - emi.installmentNumber;

    if (remainingTenure <= 0) return null;

    const ratio = remainingAmount > 0 ? partialValue / remainingAmount : 0;
    const principalPaid = remainingPrincipal * ratio;
    const newOutstandingPrincipal = outstandingPrincipal - principalPaid;

    const monthlyRate = interestRate / 100 / 12;
    const newEmi = newOutstandingPrincipal * monthlyRate * Math.pow(1 + monthlyRate, remainingTenure) 
                   / (Math.pow(1 + monthlyRate, remainingTenure) - 1);

    return {
      principalPaid,
      newOutstandingPrincipal,
      newEmi: Math.round(newEmi),
      remainingTenure
    };
  };

  const adjustment = calculateFutureAdjustment();

  const handlePayment = async () => {
    // Validation for partial payment
    if (paymentType === 'PARTIAL_PAYMENT') {
      if (!partialAmount || parseFloat(partialAmount) <= 0) {
        toast({ title: 'Error', description: 'Please enter a valid partial amount', variant: 'destructive' });
        return;
      }
      if (parseFloat(partialAmount) > remainingAmount) {
        toast({ title: 'Error', description: 'Partial amount cannot exceed remaining amount', variant: 'destructive' });
        return;
      }
      if (!nextPaymentDate) {
        toast({ title: 'Error', description: 'Please select when you will pay the remaining amount', variant: 'destructive' });
        return;
      }
    }

    // Validation for interest only payment
    if (paymentType === 'INTEREST_ONLY' && !interestOnlyConfirmed) {
      toast({ title: 'Error', description: 'Please confirm that you understand the principal will be deferred', variant: 'destructive' });
      return;
    }

    try {
      setProcessing(true);

      // For offline loans
      if (type === 'offline') {
        const requestBody: Record<string, unknown> = {
          action: 'pay-emi',
          emiId: emi.id,
          userId,
          userRole,
          paymentMode: creditType === 'PERSONAL' ? 'CASH' : paymentMode,
          amount: details.amount + penaltyDetails.netPenalty, // Include penalty in total
          paymentType: paymentType === 'FULL_EMI' ? 'FULL'
                      : paymentType === 'PARTIAL_PAYMENT' ? 'PARTIAL'
                      : paymentType === 'INTEREST_ONLY' ? 'INTEREST_ONLY'
                      : paymentType === 'PRINCIPAL_ONLY' ? 'PRINCIPAL_ONLY'
                      : 'FULL',
          remarks: paymentType === 'PARTIAL_PAYMENT' ? `Partial payment - remaining due: ${formatCurrency(details.remainingAfter)}` : '',
          isAdvancePayment: details.isAdvance || false,
          // New credit system fields
          creditType: creditType,
          isPersonalCredit: creditType === 'PERSONAL',
          isExtraEMI: isActuallyExtraEMI,
          isMirrorLoan: mirrorLoanInfo?.isMirrorLoan || false,
          mirrorPrincipal: mirrorLoanInfo?.mirrorPrincipal,
          mirrorInterest: mirrorLoanInfo?.mirrorInterest,
          // Penalty fields
          penaltyAmount: penaltyDetails.penaltyAmount,
          penaltyWaiver: parseFloat(penaltyWaiver) || 0,
          penaltyPaymentMode: paymentMode === 'ONLINE' ? 'BANK' : 'CASH',
        };

        if (paymentType === 'PARTIAL_PAYMENT' && nextPaymentDate) {
          requestBody.remainingPaymentDate = nextPaymentDate.toISOString();
        }

        const res = await fetch('/api/offline-loan', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            const totalCollected = details.amount + penaltyDetails.netPenalty;
            toast({
              title: 'Payment Successful',
              description: creditType === 'PERSONAL' 
                ? `${formatCurrency(totalCollected)} collected (Personal Credit - Company 3 Cashbook)${penaltyDetails.netPenalty > 0 ? ` incl. penalty ${formatCurrency(penaltyDetails.netPenalty)}` : ''}`
                : `${formatCurrency(totalCollected)} collected (${paymentMode === 'ONLINE' ? 'Bank Account' : 'Cashbook'} Entry)${penaltyDetails.netPenalty > 0 ? ` incl. penalty ${formatCurrency(penaltyDetails.netPenalty)}` : ''}`
            });
            onPaymentComplete();
            onOpenChange(false);
            resetForm();
          } else {
            toast({ title: 'Error', description: data.error || 'Payment failed', variant: 'destructive' });
          }
        } else {
          const error = await res.json();
          toast({ title: 'Error', description: error.error || 'Failed to process payment', variant: 'destructive' });
        }
      } else {
        // For online loans
        const formData = new FormData();
        formData.append('emiId', emi.id);
        formData.append('loanId', emi.loanApplication?.id || '');
        formData.append('amount', (details.amount + penaltyDetails.netPenalty).toString()); // Include penalty in total
        // BUG-9 fix: pass split fields for online loans
        const isSplit = paymentMode === 'SPLIT';
        const scAmt = parseFloat(splitCashAmount) || 0;
        const soAmt = parseFloat(splitOnlineAmount) || 0;
        if (isSplit && Math.abs(scAmt + soAmt - details.amount) > 1) {
          toast({ title: 'Split Mismatch', description: `Cash ₹${scAmt} + Online ₹${soAmt} ≠ ₹${details.amount}`, variant: 'destructive' });
          return;
        }
        formData.append('paymentMode', creditType === 'PERSONAL' ? 'CASH' : (isSplit ? 'CASH' : paymentMode));
        if (isSplit && scAmt > 0 && soAmt > 0) {
          formData.append('isSplitPayment', 'true');
          formData.append('splitCashAmount', scAmt.toString());
          formData.append('splitOnlineAmount', soAmt.toString());
        }
        formData.append('paidBy', userId);
        formData.append('paymentType', paymentType);
        formData.append('remarks', paymentType === 'PARTIAL_PAYMENT' ? `Partial payment - remaining due: ${formatCurrency(details.remainingAfter)}` : '');
        formData.append('isAdvancePayment', String(details.isAdvance || false));
        // New credit system fields
        formData.append('creditType', creditType);
        formData.append('isPersonalCredit', String(creditType === 'PERSONAL'));
        formData.append('isExtraEMI', String(isActuallyExtraEMI));
        formData.append('isMirrorLoan', String(mirrorLoanInfo?.isMirrorLoan || false));
        if (mirrorLoanInfo?.mirrorPrincipal) {
          formData.append('mirrorPrincipal', mirrorLoanInfo.mirrorPrincipal.toString());
        }
        if (mirrorLoanInfo?.mirrorInterest) {
          formData.append('mirrorInterest', mirrorLoanInfo.mirrorInterest.toString());
        }
        
        // Penalty fields
        if (penaltyDetails.penaltyAmount > 0) {
          formData.append('penaltyAmount', penaltyDetails.penaltyAmount.toString());
          formData.append('penaltyWaiver', (parseFloat(penaltyWaiver) || 0).toString());
          formData.append('penaltyPaymentMode', paymentMode === 'ONLINE' ? 'BANK' : 'CASH');
        }

        if (paymentType === 'PARTIAL_PAYMENT') {
          formData.append('partialAmount', partialAmount);
          formData.append('nextPaymentDate', nextPaymentDate?.toISOString() || '');
        }

        const res = await fetch('/api/emi/pay', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            const totalCollected = details.amount + penaltyDetails.netPenalty;
            toast({
              title: 'Payment Successful',
              description: creditType === 'PERSONAL' 
                ? `${formatCurrency(totalCollected)} collected (Personal Credit - Company 3 Cashbook)${penaltyDetails.netPenalty > 0 ? ` incl. penalty ${formatCurrency(penaltyDetails.netPenalty)}` : ''}`
                : `${formatCurrency(totalCollected)} collected (${paymentMode === 'ONLINE' ? 'Bank Account' : 'Cashbook'} Entry)${penaltyDetails.netPenalty > 0 ? ` incl. penalty ${formatCurrency(penaltyDetails.netPenalty)}` : ''}`
            });
            onPaymentComplete();
            onOpenChange(false);
            resetForm();
          } else {
            toast({ title: 'Error', description: data.error || 'Payment failed', variant: 'destructive' });
          }
        } else {
          const error = await res.json();
          toast({ title: 'Error', description: error.error || 'Failed to process payment', variant: 'destructive' });
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({ title: 'Error', description: 'Failed to process payment', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setPaymentType('FULL_EMI');
    setCreditType('COMPANY');
    setPaymentMode('ONLINE');
    setPartialAmount('');
    setSplitCashAmount('');
    setSplitOnlineAmount('');
    setNextPaymentDate(undefined);
    setPaymentReference('');
    setInterestOnlyConfirmed(false);
    setPenaltyWaiver('0');
    setEditedPenaltyAmount('');
    // editedInterest removed (BUG-11)
  };

  const minNextPaymentDate = addDays(new Date(emi.dueDate), 1);
  const maxNextPaymentDate = addDays(new Date(), 60);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-emerald-500" />
            Collect EMI Payment
          </DialogTitle>
          <DialogDescription>
            {type === 'offline' ? 'Offline Loan' : 'Online Loan'} - {loanNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* EMI Details */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Customer</span>
              <span className="font-medium">{customerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">EMI Number</span>
              <span className="font-medium">#{emi.installmentNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Due Date</span>
              <span className="font-medium">{formatDate(emi.dueDate)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Total EMI</span>
              {/* BUG-10 fix: show remaining (not original total) to avoid confusion */}
              <span className="font-bold text-lg">
                {formatCurrency(emi.totalAmount - (emi.paidAmount || 0))}
                {(emi.paidAmount || 0) > 0 && (
                  <span className="text-xs text-gray-400 ml-1">(of {formatCurrency(emi.totalAmount)})</span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Principal</span>
              <span>{formatCurrency(emi.principalAmount)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Interest</span>
              <span>{formatCurrency(emi.interestAmount)}</span>
            </div>
            {emi.paidAmount > 0 && (
              <>
                <div className="flex justify-between items-center text-sm text-green-600">
                  <span>Already Paid</span>
                  <span>{formatCurrency(emi.paidAmount)}</span>
                </div>
                <div className="flex justify-between items-center font-medium pt-2 border-t">
                  <span className="text-gray-600">Remaining</span>
                  <span className="text-orange-600">{formatCurrency(remainingAmount)}</span>
                </div>
              </>
            )}
          </div>

          {/* Penalty Section - ALWAYS visible when EMI due date has passed */}
          {isEmiOverdue && (
            <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-semibold text-red-700">Penalty for Overdue EMI</span>
                <Badge variant="destructive" className="ml-auto">
                  {penaltyDetails.daysOverdue} day(s) overdue
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-red-600">Penalty Rate</span>
                  <span className="font-medium text-red-700">
                    ₹{penaltyDetails.ratePerDay}/day
                    <span className="text-xs text-gray-500 ml-1">
                      ({formatCurrency(getLoanAmountForPenalty())} loan = ₹{penaltyDetails.ratePerDay}/day)
                    </span>
                  </span>
                </div>
                
                {/* EDITABLE Penalty Amount */}
                <div className="pt-2 border-t border-red-200 mt-2">
                  <Label className="text-sm text-red-700 font-medium">Penalty Amount (Editable)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="relative flex-1">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="number"
                        value={editedPenaltyAmount !== '' ? editedPenaltyAmount : penaltyDetails.calculatedPenalty}
                        onChange={(e) => setEditedPenaltyAmount(e.target.value)}
                        placeholder={String(penaltyDetails.calculatedPenalty || 0)}
                        min="0"
                        className="pl-8"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditedPenaltyAmount('')}
                      className="text-xs"
                    >
                      Reset
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Calculated: ₹{penaltyDetails.calculatedPenalty || 0} ({penaltyDetails.daysOverdue} days × ₹{penaltyDetails.ratePerDay}/day)
                    {editedPenaltyAmount !== '' && <span className="text-amber-600"> - Custom value set</span>}
                  </p>
                </div>
                
                {/* Penalty Waiver Input */}
                <div className="pt-2 border-t border-red-200 mt-2">
                  <Label className="text-sm text-red-700">Waive Penalty (Optional)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="relative flex-1">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="number"
                        value={penaltyWaiver}
                        onChange={(e) => setPenaltyWaiver(e.target.value)}
                        placeholder="0"
                        min="0"
                        max={penaltyDetails.penaltyAmount.toString()}
                        className="pl-8"
                      />
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      Max: {formatCurrency(penaltyDetails.penaltyAmount)}
                    </span>
                  </div>
                  {parseFloat(penaltyWaiver) > penaltyDetails.penaltyAmount && (
                    <p className="text-xs text-red-500 mt-1">Waiver cannot exceed penalty amount</p>
                  )}
                </div>
                
                {/* Net Penalty After Waiver */}
                <div className="flex justify-between items-center pt-2 border-t border-red-200 mt-2">
                  <span className="font-medium text-red-700">Penalty to Collect</span>
                  <span className="font-bold text-lg text-red-700">
                    {formatCurrency(penaltyDetails.netPenalty)}
                    {parseFloat(penaltyWaiver) > 0 && (
                      <span className="text-xs text-green-600 ml-1">
                        (waived: {formatCurrency(parseFloat(penaltyWaiver))})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Extra EMI / Mirror Loan Badge */}
          {(isActuallyExtraEMI || mirrorLoanInfo?.isMirrorLoan) && (
            <div className="flex gap-2">
              {isActuallyExtraEMI && (
                <Badge className="bg-purple-500">Extra EMI (After Mirror Tenure)</Badge>
              )}
              {mirrorLoanInfo?.isMirrorLoan && !isActuallyExtraEMI && (
                <Badge className="bg-blue-500">Mirror Loan EMI</Badge>
              )}
            </div>
          )}

          {/* ============ NEW CREDIT TYPE SELECTION ============ */}
          <div className="space-y-3">
            <Label className="font-medium text-base">Credit Type</Label>
            
            {/* Personal Credit Option - Only for Extra EMIs with Secondary Payment Page */}
            {showPersonalCredit && (
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  creditType === 'PERSONAL' 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setCreditType('PERSONAL');
                  setPaymentMode('CASH'); // Personal Credit is always CASH
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    creditType === 'PERSONAL' ? 'border-emerald-500' : 'border-gray-300'
                  }`}>
                    {creditType === 'PERSONAL' && (
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-emerald-600" />
                      <span className="font-medium">Personal Credit</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Payment Mode: <Badge variant="outline" className="ml-1">CASH only</Badge>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Entry in: Company 3 Cashbook | Your personal credit increases
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Company Credit Option */}
            <div 
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                creditType === 'COMPANY' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setCreditType('COMPANY')}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  creditType === 'COMPANY' ? 'border-blue-500' : 'border-gray-300'
                }`}>
                  {creditType === 'COMPANY' && (
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Company Credit</span>
                  </div>
                  
                  {/* Payment Mode Options for Company Credit (BUG-9: includes SPLIT) */}
                  {creditType === 'COMPANY' && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <Button type="button" size="sm"
                        variant={paymentMode === 'ONLINE' ? 'default' : 'outline'}
                        className={paymentMode === 'ONLINE' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                        onClick={(e) => { e.stopPropagation(); setPaymentMode('ONLINE'); }}>
                        <CreditCard className="h-4 w-4 mr-1" />Online (Bank)
                      </Button>
                      <Button type="button" size="sm"
                        variant={paymentMode === 'CASH' ? 'default' : 'outline'}
                        className={paymentMode === 'CASH' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                        onClick={(e) => { e.stopPropagation(); setPaymentMode('CASH'); }}>
                        <Banknote className="h-4 w-4 mr-1" />Cash
                      </Button>
                      <Button type="button" size="sm"
                        variant={paymentMode === 'SPLIT' ? 'default' : 'outline'}
                        className={paymentMode === 'SPLIT' ? 'bg-purple-500 hover:bg-purple-600' : 'border-purple-300 text-purple-700 hover:bg-purple-50'}
                        onClick={(e) => { e.stopPropagation(); setPaymentMode('SPLIT'); }}>
                        <Calculator className="h-4 w-4 mr-1" />Split
                      </Button>
                    </div>
                  )}
                  {/* Split amount inputs (BUG-9) */}
                  {creditType === 'COMPANY' && paymentMode === 'SPLIT' && (
                    <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-2">
                      <p className="text-xs font-medium text-purple-700">Split: Cash + Online (must sum to EMI amount)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-600">Cash (₹)</label>
                          <input type="number" value={splitCashAmount}
                            onChange={(e) => setSplitCashAmount(e.target.value)}
                            placeholder="e.g. 500"
                            className="w-full mt-1 px-2 py-1 border border-purple-300 rounded text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Online (₹)</label>
                          <input type="number" value={splitOnlineAmount}
                            onChange={(e) => setSplitOnlineAmount(e.target.value)}
                            placeholder="e.g. 700"
                            className="w-full mt-1 px-2 py-1 border border-purple-300 rounded text-sm" />
                        </div>
                      </div>
                      {(() => {
                        const sc = parseFloat(splitCashAmount) || 0;
                        const so = parseFloat(splitOnlineAmount) || 0;
                        const st = sc + so;
                        const mismatch = st > 0 && Math.abs(st - details.amount) > 1;
                        return st > 0 ? (
                          <p className={`text-xs font-medium ${mismatch ? 'text-red-500' : 'text-green-600'}`}>
                            Total: ₹{st.toLocaleString('en-IN')}{' '}
                            {mismatch ? `⚠ Must match ₹${details.amount.toLocaleString('en-IN')}` : '✓ Matches'}
                          </p>
                        ) : null;
                      })()}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-400 mt-2">
                    Entry in: {paymentMode === 'ONLINE' ? 'Bank Account' : paymentMode === 'SPLIT' ? 'Cashbook + Bank (Split)' : 'Cashbook'} of Loan Company | Company credit increases
                  </p>
                  
                  {/* Bank Details Display for ONLINE payment */}
                  {paymentMode === 'ONLINE' && creditType === 'COMPANY' && (
                    <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Landmark className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-blue-800">Bank Payment Details</span>
                      </div>
                      
                      {loadingBankDetails ? (
                        <div className="flex items-center gap-2 text-gray-500">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                          Loading bank details...
                        </div>
                      ) : bankDetails ? (
                        <div className="space-y-3">
                          {/* Bank Name & Account */}
                          <div className="bg-white p-3 rounded-lg border border-blue-100">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-500">Bank</span>
                              <span className="font-medium text-blue-700">{bankDetails.bankName}</span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-sm text-gray-500">Account Number</span>
                              <span className="font-mono font-medium">{bankDetails.accountNumber}</span>
                            </div>
                            {bankDetails.ownerName && (
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-sm text-gray-500">Account Owner</span>
                                <span className="font-medium">{bankDetails.ownerName}</span>
                              </div>
                            )}
                            {bankDetails.ifscCode && (
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-sm text-gray-500">IFSC Code</span>
                                <span className="font-mono font-medium">{bankDetails.ifscCode}</span>
                              </div>
                            )}
                          </div>

                          {/* UPI ID */}
                          {bankDetails.upiId && (
                            <div className="bg-white p-3 rounded-lg border border-green-100">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-gray-500">UPI ID</p>
                                  <p className="font-mono font-medium text-green-600">{bankDetails.upiId}</p>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    navigator.clipboard.writeText(bankDetails.upiId!);
                                    toast({ title: 'Copied!', description: 'UPI ID copied to clipboard' });
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* QR Code */}
                          {bankDetails.qrCodeUrl && (
                            <div className="bg-white p-3 rounded-lg border border-purple-100 text-center">
                              <p className="text-xs text-gray-500 mb-2">Scan to Pay</p>
                              <img 
                                src={bankDetails.qrCodeUrl} 
                                alt="Payment QR Code" 
                                className="w-32 h-32 mx-auto rounded border"
                              />
                            </div>
                          )}

                          <p className="text-xs text-blue-600 text-center">
                            Transfer the EMI amount to the above bank account
                          </p>
                        </div>
                      ) : (
                        <div className="text-sm text-amber-600">
                          No bank account configured for this company. Please contact administrator.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Type Selection - Only for non-extra EMIs */}
          {!isActuallyExtraEMI && (
            <div className="space-y-2">
              <Label className="font-medium">Payment Type</Label>
              <div className={`grid gap-2 ${isInterestOnlyLoan ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
                <Button
                  type="button"
                  variant={paymentType === 'FULL_EMI' ? 'default' : 'outline'}
                  className={`h-auto py-3 flex-col ${paymentType === 'FULL_EMI' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                  onClick={() => setPaymentType('FULL_EMI')}
                >
                  <IndianRupee className="h-4 w-4 mb-1" />
                  <span className="text-xs">Full EMI</span>
                </Button>
                <Button
                  type="button"
                  variant={paymentType === 'PARTIAL_PAYMENT' ? 'default' : 'outline'}
                  className={`h-auto py-3 flex-col ${paymentType === 'PARTIAL_PAYMENT' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                  onClick={() => setPaymentType('PARTIAL_PAYMENT')}
                >
                  <Calculator className="h-4 w-4 mb-1" />
                  <span className="text-xs">Partial</span>
                </Button>
                <Button
                  type="button"
                  variant={paymentType === 'INTEREST_ONLY' ? 'default' : 'outline'}
                  className={`h-auto py-3 flex-col ${paymentType === 'INTEREST_ONLY' ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                  onClick={() => setPaymentType('INTEREST_ONLY')}
                >
                  <TrendingUp className="h-4 w-4 mb-1" />
                  <span className="text-xs">Interest Only</span>
                </Button>
                {/* Principal Only — hidden for interest-only loan products */}
                {!isInterestOnlyLoan && (
                  <Button
                    type="button"
                    variant={paymentType === 'PRINCIPAL_ONLY' ? 'default' : 'outline'}
                    className={`h-auto py-3 flex-col ${paymentType === 'PRINCIPAL_ONLY' ? 'bg-red-500 hover:bg-red-600 text-white' : 'border-red-300 text-red-600 hover:bg-red-50'}`}
                    onClick={() => setPaymentType('PRINCIPAL_ONLY')}
                  >
                    <AlertTriangle className="h-4 w-4 mb-1" />
                    <span className="text-xs">Principal Only</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Full EMI Info */}
          {paymentType === 'FULL_EMI' && !isActuallyExtraEMI && (
            <div className={`p-4 rounded-lg border ${isAdvance ? 'bg-blue-50 border-blue-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-start gap-2">
                {isAdvance ? (
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                )}
                <div className={`text-sm flex-1 ${isAdvance ? 'text-blue-700' : 'text-emerald-700'}`}>
                  <p className="font-medium">
                    {isAdvance ? 'Advance Payment - Principal Only' : 'Full EMI Payment'}
                  </p>
                  {isAdvance ? (
                    <>
                      <p className="mt-1">
                        This EMI's due date month has not started. Only principal will be collected.
                      </p>
                      <p className="mt-2 font-bold text-lg">
                        Amount to pay: {formatCurrency(remainingPrincipal)}
                      </p>
                      <div className="mt-2 text-xs text-blue-600">
                        <p>Principal: {formatCurrency(remainingPrincipal)}</p>
                        <p>Interest: ₹0 (waived for advance payment)</p>
                        <p className="mt-1 text-green-600 font-medium">You save: {formatCurrency(remainingInterest)}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mt-1">Pay the complete remaining amount of {formatCurrency(details?.amount || remainingAmount)}</p>
                        <div className="mt-2 text-xs text-emerald-600">
                          <p>Principal: {formatCurrency(remainingPrincipal)}</p>
                          {/* BUG-11 fix: removed staff editedInterest override — always show DB interest */}
                          <p>Interest: {formatCurrency(remainingInterest)}</p>
                        </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Extra EMI Info */}
          {isActuallyExtraEMI && (
            <div className="p-4 rounded-lg border bg-purple-50 border-purple-200">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-purple-500 mt-0.5" />
                <div className="text-sm text-purple-700">
                  <p className="font-medium">Extra EMI Payment (After Mirror Tenure)</p>
                  <p className="mt-1">
                    This EMI is beyond the mirror loan tenure. Full amount is profit for Company 3.
                  </p>
                  <p className="mt-2 font-bold text-lg">
                    Amount to pay: {formatCurrency(remainingPrincipal)}
                  </p>
                  {creditType === 'PERSONAL' && (
                    <p className="text-xs text-emerald-600 mt-1">
                      Your personal credit will increase by {formatCurrency(remainingPrincipal)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Partial Payment Section */}
          {paymentType === 'PARTIAL_PAYMENT' && !isActuallyExtraEMI && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Partial Amount (Max: {formatCurrency(remainingAmount)})</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder="Enter amount..."
                    max={remainingAmount}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  When will you pay the remaining amount?
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${!nextPaymentDate && 'text-muted-foreground'}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {nextPaymentDate ? format(nextPaymentDate, 'PPP') : 'Select a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={nextPaymentDate}
                      onSelect={setNextPaymentDate}
                      disabled={(date) => date < minNextPaymentDate || date > maxNextPaymentDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div className="text-sm text-amber-700">
                    <p className="font-medium">Important Note</p>
                    <p>The remaining amount will be rescheduled to the selected date.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interest Only Section */}
          {paymentType === 'INTEREST_ONLY' && !isActuallyExtraEMI && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Interest Only Payment</p>
                    <p className="mt-1">You will pay only the interest component:</p>
                    <p className="text-xl font-bold mt-2">{formatCurrency(remainingInterest)}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div className="text-sm text-amber-700">
                    <p className="font-medium">Warning</p>
                    <p>The principal will be deferred and carried forward to the next EMI.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-2 p-3 border rounded-lg bg-gray-50">
                <Checkbox
                  id="interest-only-confirm"
                  checked={interestOnlyConfirmed}
                  onCheckedChange={(checked) => setInterestOnlyConfirmed(checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="interest-only-confirm"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    I understand and confirm
                  </label>
                  <p className="text-xs text-gray-500">
                    The principal ({formatCurrency(remainingPrincipal)}) will be deferred and added to the next EMI
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Summary */}
          <div className={`p-4 rounded-lg border ${
            creditType === 'PERSONAL' 
              ? 'bg-emerald-50 border-emerald-200' 
              : paymentMode === 'ONLINE'
                ? 'bg-blue-50 border-blue-200'
                : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {creditType === 'PERSONAL' ? (
                <User className="h-4 w-4 text-emerald-600" />
              ) : paymentMode === 'ONLINE' ? (
                <CreditCard className="h-4 w-4 text-blue-600" />
              ) : (
                <Banknote className="h-4 w-4 text-amber-600" />
              )}
              <span className="font-medium text-sm">
                {creditType === 'PERSONAL' 
                  ? 'Personal Credit - Company 3 Cashbook'
                  : paymentMode === 'ONLINE'
                    ? 'Company Credit - Bank Account Entry'
                    : 'Company Credit - Cashbook Entry'
                }
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">{details.description}</p>
            
            {/* Amount breakdown */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">EMI Amount</span>
                <span className="font-medium">{formatCurrency(details.amount)}</span>
              </div>
              
              {/* Penalty breakdown */}
              {penaltyDetails.penaltyAmount > 0 && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-red-600">Penalty ({penaltyDetails.daysOverdue} days)</span>
                    <span className="font-medium text-red-600">{formatCurrency(penaltyDetails.penaltyAmount)}</span>
                  </div>
                  {parseFloat(penaltyWaiver) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-green-600">Waiver</span>
                      <span className="font-medium text-green-600">-{formatCurrency(parseFloat(penaltyWaiver))}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Total to Collect */}
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200">
              <span className="text-gray-700 font-medium">Total to Collect</span>
              <span className="text-xl font-bold text-gray-800">
                {formatCurrency(details.amount + penaltyDetails.netPenalty)}
              </span>
            </div>
            
            {paymentType === 'PARTIAL_PAYMENT' && details.remainingAfter > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Remaining Balance:</span>
                  <span className="font-medium text-orange-600">{formatCurrency(details.remainingAfter)}</span>
                </div>
                {nextPaymentDate && (
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-400">Due by:</span>
                    <span>{format(nextPaymentDate, 'dd MMM yyyy')}</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>
                {creditType === 'PERSONAL' 
                  ? 'Your personal credit will increase'
                  : 'Company credit will increase'
                }
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
              onClick={handlePayment}
              disabled={
                processing || 
                (paymentType === 'PARTIAL_PAYMENT' && (!partialAmount || !nextPaymentDate)) ||
                (paymentType === 'INTEREST_ONLY' && !interestOnlyConfirmed) ||
                (parseFloat(penaltyWaiver) > penaltyDetails.penaltyAmount)
              }
            >
              {processing ? 'Processing...' : `Collect ${formatCurrency(details.amount + penaltyDetails.netPenalty)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
