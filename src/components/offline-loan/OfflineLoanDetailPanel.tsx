'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  X, FileText, Wallet, Building, Loader2, Receipt, PlayCircle, Calculator, AlertCircle,
  User, Phone, MapPin, IndianRupee, Percent, CheckCircle, Clock, Trash2, Eye,
  Upload, FileCheck, Lock, CalendarClock, History, Info, Banknote, Landmark,
  Printer, Trophy, Car, Weight, Scale, AlertTriangle, XCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ReceiptSection from '@/components/receipt/ReceiptSection';
import ReceiptDialog from '@/components/receipt/ReceiptDialog';
import CloseLoanDialog from '@/components/shared/CloseLoanDialog';
import { openDoc } from '@/utils/openDoc';

interface OfflineLoanDetailPanelProps {
  loanId: string | null;
  open: boolean;
  onClose: () => void;
  userId?: string;
  userRole?: string;
  onPaymentSuccess?: () => void;
  onLoanStarted?: () => void;
  onLoanDeleted?: () => void;
}

interface LoanDetail {
  id: string;
  loanNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAadhaar?: string;
  customerPan?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerPincode?: string;
  customerDOB?: string;
  customerOccupation?: string;
  customerMonthlyIncome?: number;
  reference1Name?: string;
  reference1Phone?: string;
  reference1Relation?: string;
  reference2Name?: string;
  reference2Phone?: string;
  reference2Relation?: string;
  loanType: string;
  loanAmount: number;
  interestRate: number;
  tenure: number;
  emiAmount: number;
  processingFee: number;
  disbursementDate: string;
  disbursementMode: string;
  disbursementRef?: string;
  startDate: string;
  status: string;
  notes?: string;
  internalNotes?: string;
  createdAt: string;
  createdByRole: string;
  company?: { id: string; name: string; code: string };
  customerId?: string;
  allowInterestOnly?: boolean;
  allowPartialPayment?: boolean;
  isInterestOnlyLoan?: boolean;
  interestOnlyStartDate?: string;
  interestOnlyMonthlyAmount?: number;
  loanStartedAt?: string;
  totalInterestPaid?: number;
  panCardDoc?: string;
  aadhaarFrontDoc?: string;
  aadhaarBackDoc?: string;
  incomeProofDoc?: string;
  addressProofDoc?: string;
  photoDoc?: string;
  electionCardDoc?: string;
  housePhotoDoc?: string;
  guarantorPhotoDoc?: string;
  passbookPhotoDoc?: string;
  emis: EMI[];
  isMirrored?: boolean; // Is this loan mirrored to another company? (this is original)
  isMirrorLoan?: boolean; // Is this a mirror loan? (cannot pay directly)
  displayColor?: string | null; // Display color for loan pair
  mirrorTenure?: number | null; // Mirror loan tenure
  extraEMICount?: number; // Extra EMIs count
  originalLoanId?: string | null; // If this is mirror, reference to original
  mirrorLoanId?: string | null; // If this is original, reference to mirror
  mirrorCompanyId?: string | null; // Mirror company ID (for original loans)
  mirrorCompanyName?: string | null; // Mirror company name for UI display
  mirrorCompanyCode?: string | null; // Mirror company code for UI display
  mirrorInterestRate?: number | null; // Mirror interest rate
  applicationLocation?: string | null; // Location captured during application
  goldLoanDetail?: {
    id: string; grossWeight: number; netWeight: number; goldRate: number;
    valuationAmount: number; loanAmount: number; ownerName?: string;
    goldItemPhoto?: string; karat?: number; numberOfItems?: number;
    itemDescription?: string; verificationDate?: string; verifiedBy?: string; remarks?: string;
  } | null;
  vehicleLoanDetail?: {
    id: string; vehicleType: string; vehicleNumber?: string; manufacturer?: string;
    model?: string; yearOfManufacture?: number; valuationAmount: number; loanAmount: number;
    ownerName?: string; rcBookPhoto?: string; vehiclePhoto?: string;
    chassisNumber?: string; engineNumber?: string; fuelType?: string; color?: string;
    verificationDate?: string; verifiedBy?: string; remarks?: string;
  } | null;
}

interface EMI {
  id: string;
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  outstandingPrincipal: number;
  paidAmount: number;
  paidPrincipal: number;
  paidInterest: number;
  paymentStatus: string;
  paidDate?: string;
  paymentMode?: string;
  paymentReference?: string;
  collectedById?: string;
  collectedByName?: string;
  isInterestOnly?: boolean;
  interestOnlyAmount?: number;
  notes?: string;
  proofUrl?: string; // Payment proof document URL
  isDeferred?: boolean;       // True if this EMI was created by INTEREST_ONLY deferral
  deferredFromEMI?: number;   // Original installment number this was deferred from
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

/**
 * Check if EMI is overdue (due date has passed)
 */
function isEMIOverdue(emi: EMI): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(emi.dueDate);
  due.setHours(0, 0, 0, 0);
  return today > due || emi.paymentStatus === 'OVERDUE';
}

export default function OfflineLoanDetailPanel({
  loanId,
  open,
  onClose,
  userId,
  userRole,
  onPaymentSuccess,
  onLoanStarted,
  onLoanDeleted
}: OfflineLoanDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedEmi, setSelectedEmi] = useState<EMI | null>(null);
  const [paymentType, setPaymentType] = useState<'FULL' | 'PARTIAL' | 'INTEREST_ONLY' | 'PRINCIPAL_ONLY'>('FULL');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [splitCashPayment, setSplitCashPayment] = useState('');
  const [splitOnlinePayment, setSplitOnlinePayment] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [creditType, setCreditType] = useState<'COMPANY' | 'PERSONAL'>('COMPANY');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [isInterestOnlyPayment, setIsInterestOnlyPayment] = useState(false);
  const [remainingPaymentDate, setRemainingPaymentDate] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  // Penalty state
  const [editedPenaltyAmount, setEditedPenaltyAmount] = useState<string>('');
  const [penaltyWaiver, setPenaltyWaiver] = useState(0);
  const [penaltyPaymentMode, setPenaltyPaymentMode] = useState<'CASH' | 'BANK'>('CASH');

  const [personalCredit, setPersonalCredit] = useState(0);
  const [companyCredit, setCompanyCredit] = useState(0);

  const [startLoanDialogOpen, setStartLoanDialogOpen] = useState(false);
  const [startTenure, setStartTenure] = useState(12);
  const [startInterestRate, setStartInterestRate] = useState(12);
  const [emiPreview, setEmiPreview] = useState<any>(null);
  const [startingLoan, setStartingLoan] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [closeLoanDialogOpen, setCloseLoanDialogOpen] = useState(false);

  // Multi-EMI selection state
  const [selectedEmiIds, setSelectedEmiIds] = useState<Set<string>>(new Set());
  const [isMultiEmiPayment, setIsMultiEmiPayment] = useState(false);
  const [multiEmiList, setMultiEmiList] = useState<EMI[]>([]);

  // Receipt state for mirror loans
  const [loadingReceipt, setLoadingReceipt] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);

  // Payment History Dialog state
  const [paymentHistoryDialogOpen, setPaymentHistoryDialogOpen] = useState(false);
  const [selectedEmiForHistory, setSelectedEmiForHistory] = useState<EMI | null>(null);
  
  // Mirror loan EMIs for payment history display
  const [mirrorLoanEmis, setMirrorLoanEmis] = useState<EMI[]>([]);
  const [loadingMirrorEmis, setLoadingMirrorEmis] = useState(false);

  // Fetch mirror loan EMIs for payment history display
  const fetchMirrorLoanEmis = async (mirrorLoanId: string) => {
    if (!mirrorLoanId) return;
    setLoadingMirrorEmis(true);
    try {
      const res = await fetch(`/api/offline-loan?loanId=${mirrorLoanId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.loan?.emis) {
          setMirrorLoanEmis(data.loan.emis);
        }
      }
    } catch (error) {
      console.error('Error fetching mirror loan EMIs:', error);
    } finally {
      setLoadingMirrorEmis(false);
    }
  };

  // Fetch mirror loan EMIs when loan is loaded and has mirror
  useEffect(() => {
    if (loan?.mirrorLoanId && loan?.isMirrored && !loan?.isMirrorLoan) {
      fetchMirrorLoanEmis(loan.mirrorLoanId);
    }
  }, [loan?.mirrorLoanId, loan?.isMirrored, loan?.isMirrorLoan]);

  // Fetch receipt for mirror loan EMI
  const fetchReceipt = async (emiId: string) => {
    if (!loan) return;
    setLoadingReceipt(emiId);
    try {
      const response = await fetch(`/api/receipt?emiScheduleId=${emiId}&isOffline=true&offlineLoanId=${loan.id}`);
      const data = await response.json();

      if (data.success && data.receiptData) {
        setReceiptData(data.receiptData);
        setReceiptDialogOpen(true);
      } else {
        toast({ title: 'Receipt Not Available', description: 'Receipt not available for this EMI', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
      toast({ title: 'Error', description: 'Failed to load receipt', variant: 'destructive' });
    } finally {
      setLoadingReceipt(null);
    }
  };

  useEffect(() => {
    if (loanId && open) {
      fetchLoanDetails();
      fetchUserCredits();
    }
  }, [loanId, open]);

  const fetchLoanDetails = async () => {
    if (!loanId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/offline-loan?loanId=${loanId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLoan(data.loan);
          setSummary(data.summary);
        }
      }
    } catch (error) {
      console.error('Error fetching loan details:', error);
      toast({ title: 'Error', description: 'Failed to fetch loan details', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCredits = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setPersonalCredit(data.user.personalCredit || 0);
          setCompanyCredit(data.user.companyCredit || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching user credits:', error);
    }
  };

  const openPaymentDialog = (emi: EMI) => {
    // Don't open payment dialog for PAID or INTEREST_ONLY_PAID EMIs
    if (emi.paymentStatus === 'PAID' || emi.paymentStatus === 'INTEREST_ONLY_PAID') return;

    // No sequential payment restriction - allow paying any EMI
    setSelectedEmi(emi);
    const remainingAmount = emi.totalAmount - (emi.paidAmount || 0);
    setPaymentAmount(remainingAmount);
    setPaymentType('FULL');
    setPaymentMode('CASH');
    setSplitCashPayment('');
    setSplitOnlinePayment('');

    // For extra EMIs on mirror loans, only Personal Credit is allowed
    // Extra EMI = EMI number > mirror tenure
    const isExtraEmiPayment = loan?.isMirrored && loan?.mirrorCompanyId && loan?.mirrorTenure && emi.installmentNumber > loan.mirrorTenure;
    if (isExtraEmiPayment) {
      setCreditType('PERSONAL'); // Extra EMIs only allow Personal Credit (records in Company 3)
    } else {
      setCreditType('COMPANY');
    }

    setPaymentReference('');
    setRemainingPaymentDate('');
    setPaymentRemarks('');
    setProofFile(null);
    setProofPreview(null);
    // Reset penalty state
    setEditedPenaltyAmount('');
    setPenaltyWaiver(0);
    setPenaltyPaymentMode('CASH');
    setPaymentDialogOpen(true);
    setIsInterestOnlyPayment(false);
    setIsMultiEmiPayment(false);
  };

  // Open payment history dialog
  const openPaymentHistoryDialog = (emi: EMI) => {
    setSelectedEmiForHistory(emi);
    setPaymentHistoryDialogOpen(true);
  };

  // Parse payment history from EMI
  const parsePaymentHistory = (emi: EMI) => {
    // If we have paymentHistoryJson, use it
    if ((emi as any).paymentHistoryJson) {
      try {
        return JSON.parse((emi as any).paymentHistoryJson);
      } catch {
        return null;
      }
    }
    // Otherwise, construct from available data
    if (emi.paymentStatus === 'PAID' || emi.paymentStatus === 'PARTIALLY_PAID' || emi.paymentStatus === 'INTEREST_ONLY_PAID') {
      return [{
        paymentNumber: 1,
        amount: emi.paidAmount,
        principal: emi.paidPrincipal,
        interest: emi.paidInterest,
        penalty: 0,
        mode: emi.paymentMode || 'CASH',
        reference: emi.paymentReference,
        paidAt: emi.paidDate,
        collectedBy: emi.collectedByName,
        isSplit: false,
        splitCash: 0,
        splitOnline: 0,
        creditType: 'COMPANY'
      }];
    }
    return null;
  };

  // Multi-EMI selection handlers
  const toggleEmiSelection = (emiId: string) => {
    const newSelected = new Set(selectedEmiIds);
    if (newSelected.has(emiId)) {
      newSelected.delete(emiId);
    } else {
      newSelected.add(emiId);
    }
    setSelectedEmiIds(newSelected);
  };

  // FIX-47: Single source-of-truth predicate for payable EMIs (matches checkbox checked state)
  const isOfflineEmiPayable = (e: EMI) => e.paymentStatus !== 'PAID' && e.paymentStatus !== 'INTEREST_ONLY_PAID';

  const selectAllPayableEmis = () => {
    if (!loan) return;
    const payableEmis = loan.emis.filter(isOfflineEmiPayable);
    // Count how many payable IDs are currently in the selection
    const selectedPayableCount = payableEmis.filter(e => selectedEmiIds.has(e.id)).length;
    if (selectedPayableCount === payableEmis.length) {
      setSelectedEmiIds(new Set());
    } else {
      setSelectedEmiIds(new Set(payableEmis.map(e => e.id)));
    }
  };

  // Check if an EMI is advance payment (due date month not started)
  const isEmiAdvancePayment = (emi: EMI): boolean => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const emiDueDate = new Date(emi.dueDate);
    const emiDueMonth = emiDueDate.getMonth();
    const emiDueYear = emiDueDate.getFullYear();

    // EMI is advance if: current date's month/year < EMI due date's month/year
    return currentYear < emiDueYear || 
      (currentYear === emiDueYear && currentMonth < emiDueMonth);
  };

  // Get advance payment breakdown for selected EMIs
  const getAdvancePaymentBreakdown = () => {
    if (!loan) return { advanceEmis: [], currentEmis: [], totalAdvance: 0, totalCurrent: 0, totalPrincipal: 0, totalInterest: 0, grandTotal: 0 };
    
    const selectedEmis = loan.emis.filter(e => selectedEmiIds.has(e.id));
    const advanceEmis: EMI[] = [];
    const currentEmis: EMI[] = [];
    let totalAdvance = 0; // Principal only for advance EMIs
    let totalCurrent = 0; // Full amount for current/past EMIs
    let totalPrincipal = 0;
    let totalInterest = 0;

    for (const emi of selectedEmis) {
      if (isEmiAdvancePayment(emi)) {
        advanceEmis.push(emi);
        totalAdvance += emi.principalAmount; // Principal only
        totalPrincipal += emi.principalAmount;
      } else {
        currentEmis.push(emi);
        totalCurrent += emi.totalAmount; // Full amount
        totalPrincipal += emi.principalAmount;
        totalInterest += emi.interestAmount;
      }
    }

    return {
      advanceEmis,
      currentEmis,
      totalAdvance,
      totalCurrent,
      totalPrincipal,
      totalInterest,
      grandTotal: totalAdvance + totalCurrent
    };
  };

  const openMultiEmiPaymentDialog = () => {
    if (!loan) return;
    const selectedEmis = loan.emis.filter(e => selectedEmiIds.has(e.id));
    if (selectedEmis.length === 0) {
      toast({ title: 'No EMIs Selected', description: 'Please select at least one EMI to pay', variant: 'destructive' });
      return;
    }
    setMultiEmiList(selectedEmis);
    
    // Calculate total with advance payment logic
    const breakdown = getAdvancePaymentBreakdown();
    setPaymentAmount(breakdown.grandTotal);
    setSelectedEmi(selectedEmis[0]); // Use first EMI for reference
    setPaymentType('FULL');
    setPaymentMode('CASH');
    setSplitCashPayment('');
    setSplitOnlinePayment('');
    setCreditType('COMPANY');
    setPaymentReference('');
    setRemainingPaymentDate('');
    // FIX-49: Build descriptive remarks that distinguish advance (principal-only) from full EMI payments
    const advanceEmis = selectedEmis.filter(e => isEmiAdvancePayment(e));
    const fullEmis = selectedEmis.filter(e => !isEmiAdvancePayment(e));
    let autoRemarks = '';
    if (advanceEmis.length > 0 && fullEmis.length > 0) {
      autoRemarks = `Full EMIs: #${fullEmis.map(e => e.installmentNumber).join(', #')} | Advance (Principal only): #${advanceEmis.map(e => e.installmentNumber).join(', #')}`;
    } else if (advanceEmis.length > 0) {
      autoRemarks = `ADVANCE PAYMENT (Principal only) for ${advanceEmis.length} EMI(s): #${advanceEmis.map(e => e.installmentNumber).join(', #')}`;
    } else {
      autoRemarks = `Payment for ${selectedEmis.length} EMI(s): #${selectedEmis.map(e => e.installmentNumber).join(', #')}`;
    }
    setPaymentRemarks(autoRemarks);
    setProofFile(null);
    setProofPreview(null);
    // Reset penalty state
    setEditedPenaltyAmount('');
    setPenaltyWaiver(0);
    setPenaltyPaymentMode('CASH');
    setPaymentDialogOpen(true);
    setIsInterestOnlyPayment(false);
    setIsMultiEmiPayment(true);
  };

  const getTotalSelectedAmount = () => {
    if (!loan) return 0;
    // Use advance payment breakdown
    const breakdown = getAdvancePaymentBreakdown();
    return breakdown.grandTotal;
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'File Too Large', description: 'Maximum file size is 10MB', variant: 'destructive' });
        return;
      }
      setProofFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setProofPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setProofPreview(null);
      }
    }
  };

  const handlePayment = async () => {
    if (!userId || !loan) return;

    const isInterestOnlyLoanPayment = isInterestOnlyPayment || (loan.isInterestOnlyLoan && loan.status === 'INTEREST_ONLY' && paymentType === 'INTEREST_ONLY');

    // Validation for partial payment
    if (paymentType === 'PARTIAL' && !isMultiEmiPayment) {
      if (paymentAmount <= 0) {
        toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' });
        return;
      }
      if (!remainingPaymentDate) {
        toast({ title: 'Error', description: 'Please select when the remaining amount will be paid', variant: 'destructive' });
        return;
      }
    }

    // Proof validation for non-CASH payments
    const requiresProof = creditType === 'PERSONAL' || (paymentMode !== 'CASH');
    if (requiresProof && !proofFile && !isInterestOnlyLoanPayment) {
      toast({ 
        title: 'Proof Required', 
        description: 'Personal credit or non-CASH payments require payment proof. Please upload a proof document.', 
        variant: 'destructive' 
      });
      return;
    }

    setProcessingPayment(true);
    try {
      // Upload proof if required
      let proofUrl = '';
      if (requiresProof && proofFile && !isInterestOnlyLoanPayment) {
        try {
          const proofFormData = new FormData();
          proofFormData.append('file', proofFile);
          proofFormData.append('documentType', 'emi_proof');
          proofFormData.append('loanId', loan.id);
          proofFormData.append('uploadedBy', userId);

          const uploadResponse = await fetch('/api/upload/document', {
            method: 'POST',
            body: proofFormData
          });
          const uploadData = await uploadResponse.json();
          if (uploadData.success && uploadData.url) {
            proofUrl = uploadData.url;
          }
        } catch (uploadError) {
          console.error('[Offline EMI Payment] Proof upload failed:', uploadError);
        }
      }

      // Handle multi-EMI payment
      if (isMultiEmiPayment) {
        // Pay each EMI one by one with advance payment check
        let totalCreditAdded = 0;
        let successCount = 0;
        let advanceCount = 0;
        let fullPayCount = 0;
        
        const splitCount = multiEmiList.length;
        for (const emi of multiEmiList) {
          // Check if this EMI is advance payment
          const isAdvance = isEmiAdvancePayment(emi);
          // BUG-4 fix: use remaining (totalAmount - paidAmount) not full totalAmount
          const remainingEmi = emi.totalAmount - (emi.paidAmount || 0);
          // BUG-8 fix: for advance EMIs use remaining principal, not full principalAmount
          const amountToPay = isAdvance
            ? (emi.principalAmount - (emi.paidPrincipal || 0))
            : remainingEmi;

          // BUG-1 fix: divide split amounts per EMI instead of sending full amount to each
          const perEmiSplitCash   = splitCashPayment   ? (parseFloat(splitCashPayment)   || 0) / splitCount : undefined;
          const perEmiSplitOnline = splitOnlinePayment ? (parseFloat(splitOnlinePayment) || 0) / splitCount : undefined;
          const isSplit = paymentMode === 'SPLIT' && perEmiSplitCash !== undefined && perEmiSplitOnline !== undefined;

          const requestBody: Record<string, unknown> = {
            action: 'pay-emi',
            userId,
            userRole,
            paymentMode: isSplit ? 'CASH' : paymentMode,
            paymentReference,
            creditType,
            proofUrl,
            remarks: paymentRemarks,
            emiId: emi.id,
            paymentType: 'FULL',
            amount: amountToPay,
            isAdvancePayment: isAdvance,
            ...(isSplit && { isSplitPayment: true, splitCashAmount: perEmiSplitCash, splitOnlineAmount: perEmiSplitOnline }),
          };

          const res = await fetch('/api/offline-loan', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });

          const data = await res.json();
          if (data.success) {
            totalCreditAdded += data.creditAdded || 0;
            successCount++;
            if (isAdvance) {
              advanceCount++;
            } else {
              fullPayCount++;
            }
            // Show accounting warning if any entry failed
            if (!data.accountingOk && data.accountingWarnings?.length > 0) {
              toast({
                title: '⚠️ Accounting Entry Incomplete',
                description: `EMI #${emi.installmentNumber} paid but accounting failed: ${data.accountingWarnings[0]}. Contact admin.`,
                variant: 'destructive',
              });
            }
          }
        }

        if (successCount > 0) {
          let description = `${successCount} EMIs paid. Total: ₹${totalCreditAdded}`;
          if (advanceCount > 0 && fullPayCount > 0) {
            description = `${successCount} EMIs paid (${advanceCount} advance - principal only, ${fullPayCount} full). Total: ₹${totalCreditAdded}`;
          } else if (advanceCount > 0) {
            description = `${advanceCount} advance EMIs paid (principal only). Total: ₹${totalCreditAdded}`;
          }
          toast({
            title: 'Multi-EMI Payment Successful',
            description
          });
          setPaymentDialogOpen(false);
          setIsMultiEmiPayment(false);
          setMultiEmiList([]);
          setSelectedEmiIds(new Set());
          setProofFile(null);
          setProofPreview(null);
          fetchLoanDetails();
          fetchUserCredits();
          onPaymentSuccess?.();
        } else {
          toast({ title: 'Error', description: 'Failed to process payments', variant: 'destructive' });
        }
        return;
      }

      const action = isInterestOnlyLoanPayment ? 'pay-interest-only-loan' : 'pay-emi';

      const isSplitMode = paymentMode === 'SPLIT';
      const splitCash   = parseFloat(splitCashPayment)   || 0;
      const splitOnline = parseFloat(splitOnlinePayment) || 0;

      // Calculate penalty if EMI is overdue
      // grossPenalty = full penalty before any waiver (send to backend as penaltyAmount)
      // netPenalty = grossPenalty - waiver (used for UI display only)
      let grossPenalty = 0;
      let netPenalty = 0;
      if (selectedEmi && loan && isEMIOverdue(selectedEmi)) {
        const penaltyInfo = calculatePenaltyInfo(selectedEmi.dueDate, loan.loanAmount);
        grossPenalty = editedPenaltyAmount !== '' ? parseFloat(editedPenaltyAmount) || 0 : penaltyInfo.penaltyAmount;
        netPenalty = Math.max(0, grossPenalty - penaltyWaiver);
      }

      const requestBody: Record<string, unknown> = {
        action,
        userId,
        userRole,
        // BUG-1 fix: send CASH as effective mode when SPLIT, plus isSplitPayment flag
        paymentMode: isSplitMode ? 'CASH' : paymentMode,
        paymentReference,
        creditType,
        proofUrl,
        remarks: paymentRemarks,
        // FIX: Send GROSS penalty (before waiver) — backend computes netPenalty = penaltyAmount - penaltyWaiver
        // Previously was sending netPenalty here causing double-deduction of the waiver
        penaltyAmount: grossPenalty > 0 ? grossPenalty : undefined,
        penaltyWaiver: penaltyWaiver > 0 ? penaltyWaiver : undefined,
        // Penalty uses same channel as EMI — no separate selector
        penaltyPaymentMode: grossPenalty > 0 ? (paymentMode === 'ONLINE' ? 'BANK' : 'CASH') : undefined,
        ...(isSplitMode && splitCash > 0 && splitOnline > 0 && {
          isSplitPayment: true,
          splitCashAmount: splitCash,
          splitOnlineAmount: splitOnline,
        }),
      };

      if (isInterestOnlyLoanPayment) {
        requestBody.loanId = loan.id;
      } else {
        if (!selectedEmi) return;
        requestBody.emiId = selectedEmi.id;
        requestBody.paymentType = paymentType;
        // SINGLE EMI: Always pay full amount (principal + interest) - NO advance logic
        // Advance logic only applies when using "Select All" (multi-EMI payment)
        requestBody.isAdvancePayment = false;
        if (paymentType === 'PARTIAL') {
          requestBody.remainingPaymentDate = remainingPaymentDate;
          requestBody.amount = paymentAmount;
        } else if (paymentType === 'INTEREST_ONLY') {
          // BUG-2 fix: send REMAINING interest (not original total)
          const remainingInterest = selectedEmi.interestAmount - (selectedEmi.paidInterest || 0);
          requestBody.amount = remainingInterest;
          // BUG-6 fix: removed duplicate interestAmount field — amount alone is sufficient
        } else {
          requestBody.amount = paymentAmount;
        }
      }

      const res = await fetch('/api/offline-loan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();
      if (data.success) {
        let description = isInterestOnlyLoanPayment
          ? `Interest paid. Credit added: ₹${data.creditAdded}`
          : `EMI #${selectedEmi?.installmentNumber} paid. Credit added: ₹${data.creditAdded}`;
        
        if (paymentType === 'PARTIAL') {
          description += ` Remaining amount due on ${new Date(remainingPaymentDate).toLocaleDateString()}.`;
        } else if (paymentType === 'INTEREST_ONLY') {
          description += ' Principal deferred to next EMI.';
        }
        
        // Add penalty to description if applicable
        if (netPenalty > 0) {
          description += ` + ₹${formatCurrency(netPenalty)} penalty collected.`;
        }
        
        toast({
          title: 'Payment Successful',
          description
        });

        // Show accounting warning if any accounting entry failed
        if (!data.accountingOk && data.accountingWarnings?.length > 0) {
          setTimeout(() => {
            toast({
              title: '⚠️ Accounting Entry Incomplete',
              description: `Payment recorded but accounting failed: ${data.accountingWarnings[0]}. Please contact admin to fix.`,
              variant: 'destructive',
            });
          }, 500);
        }

        setPaymentDialogOpen(false);
        setIsInterestOnlyPayment(false);
        setSelectedEmiIds(new Set());
        setProofFile(null);
        setProofPreview(null);
        fetchLoanDetails();
        fetchUserCredits();
        onPaymentSuccess?.();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to process payment', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({ title: 'Error', description: 'Failed to process payment', variant: 'destructive' });
    } finally {
      setProcessingPayment(false);
    }
  };

  const openStartLoanDialog = async () => {
    if (!loanId) return;
    setStartLoanDialogOpen(true);
    setStartInterestRate(loan?.interestRate || 12);
    setStartTenure(12);
    fetchEmiPreview(12, loan?.interestRate || 12);
  };

  const fetchEmiPreview = async (tenure: number, rate: number) => {
    if (!loanId) return;
    try {
      const res = await fetch(`/api/offline-loan/start?loanId=${loanId}&tenure=${tenure}&interestRate=${rate}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEmiPreview(data.preview);
        }
      }
    } catch (error) {
      console.error('Error fetching EMI preview:', error);
    }
  };

  const handleStartLoan = async () => {
    if (!loanId || !userId) return;

    if (startTenure < 1 || startTenure > 120) {
      toast({ title: 'Error', description: 'Tenure must be between 1 and 120 months', variant: 'destructive' });
      return;
    }

    if (startInterestRate < 1 || startInterestRate > 50) {
      toast({ title: 'Error', description: 'Interest rate must be between 1% and 50%', variant: 'destructive' });
      return;
    }

    setStartingLoan(true);
    try {
      const res = await fetch('/api/offline-loan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId,
          tenure: startTenure,
          interestRate: startInterestRate,
          startedBy: userId
        })
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Loan Started Successfully!', description: data.message });
        setStartLoanDialogOpen(false);
        fetchLoanDetails();
        onLoanStarted?.();
        onPaymentSuccess?.();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to start loan', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Start loan error:', error);
      toast({ title: 'Error', description: 'Failed to start loan', variant: 'destructive' });
    } finally {
      setStartingLoan(false);
    }
  };

  const handleDeleteLoan = async () => {
    if (!loanId || !userId || userRole !== 'SUPER_ADMIN') return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/offline-loan?loanId=${loanId}&userRole=${userRole}&userId=${userId}&force=true`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Loan Deleted', description: `Loan ${loan?.loanNumber} has been deleted` });
        setDeleteDialogOpen(false);
        onClose();
        onLoanDeleted?.();
        onPaymentSuccess?.();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete loan', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'Error', description: 'Failed to delete loan', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      PENDING: { className: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      ACTIVE: { className: 'bg-emerald-100 text-emerald-700', label: 'Active' },
      INTEREST_ONLY: { className: 'bg-purple-100 text-purple-700', label: 'Interest Only' },
      CLOSED: { className: 'bg-gray-200 text-gray-700 font-semibold', label: 'Closed ✓' }, // FIX-05
      DEFAULTED: { className: 'bg-red-100 text-red-700', label: 'Defaulted' },
    };
    const c = config[status] || { className: 'bg-gray-100 text-gray-700', label: status };
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const getEMIStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-700 border-green-200';
      case 'PENDING': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'OVERDUE': return 'bg-red-100 text-red-700 border-red-200';
      case 'PARTIALLY_PAID': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'INTEREST_ONLY_PAID': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const isInterestOnlyLoan = loan?.isInterestOnlyLoan && loan?.status === 'INTEREST_ONLY';

  // Check if loan is from Company 3 and not mirrored
  // For Company 3 non-mirrored loans, Company Credit only shows CASH option (no bank account)
  const isCompany3NonMirroredLoan = loan?.company?.code === 'C3' && !loan?.isMirrored;
  
  // Check if this is a MIRROR loan (original from C3 mirrored to C1/C2)
  // For mirror loans, only Company Credit is available
  const isMirroredLoan = loan?.isMirrored && loan?.mirrorCompanyId;
  
  // Get mirror company name from loan object (API now returns it directly)
  const mirrorCompanyName = loan?.mirrorCompanyName || '';
  
  // Check if EMI is within mirror tenure or extra EMI
  const isExtraEmi = (installmentNumber: number, isDeferred?: boolean): boolean => {
    if (!loan?.mirrorTenure) return false;
    // Deferred EMIs (created by INTEREST_ONLY) are NOT extra EMIs — they are
    // just carried-forward principal from within the original tenure.
    // Only genuine extra EMIs (paid beyond mirror tenure) should be flagged.
    if (isDeferred) return false;
    return installmentNumber > loan.mirrorTenure;
  };
  
  // Get the company name for cashbook entry based on EMI number, mirror status, and credit type
  // MIRROR LOAN RULES (matches backend in simple-accounting.ts):
  // - Mirror EMIs (within mirror tenure): BOTH Personal & Company Credit → Mirror Company
  // - Extra EMIs (beyond mirror tenure): BOTH Personal & Company Credit → Original Company (C3)
  // NON-MIRROR LOANS: Both credit types → Loan's company
  const getCashbookCompanyName = (emiNumber: number = 1, forCreditType: 'PERSONAL' | 'COMPANY' = 'COMPANY'): string => {
    // For mirrored loans, BOTH credit types follow the same logic
    if (isMirroredLoan) {
      // Check if this is an extra EMI (beyond mirror tenure)
      if (isExtraEmi(emiNumber)) {
        // Extra EMIs → Original Company (C3) - This is PROFIT for Company 3
        return loan?.company?.name || 'Original Company';
      } else {
        // Mirror EMIs (within mirror tenure) → Mirror Company
        // Backend: recordEMIPaymentAccounting uses mirrorCompanyId when isMirrorPayment=true
        return mirrorCompanyName || 'Mirror Company';
      }
    }
    
    // Non-mirror loans: Both credit types go to loan's company
    return loan?.company?.name || 'Company';
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && loanId && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && loanId && (
          <motion.div
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full md:w-[600px] lg:w-[700px] bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div 
              className={`flex items-center justify-between p-4 border-b text-white ${
                loan?.isMirrorLoan 
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600'
                  : isInterestOnlyLoan
                    ? 'bg-gradient-to-r from-purple-500 to-violet-600'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600'
              }`}
              style={loan?.displayColor ? { 
                background: `linear-gradient(to right, ${loan.displayColor}dd, ${loan.displayColor})` 
              } : {}}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    {loan?.isMirrorLoan ? 'Mirror Loan' : isInterestOnlyLoan ? 'Interest-Only Loan' : 'Offline Loan Details'}
                    {loan?.isMirrorLoan && (
                      <Badge className="bg-white/30 text-white border-white/50">Synced from Original</Badge>
                    )}
                    {loan?.isMirrored && !loan?.isMirrorLoan && (
                      <Badge className="bg-white/30 text-white border-white/50">Has Mirror</Badge>
                    )}
                    {/* Mode indicator */}
                    {!loan?.isMirrorLoan && !isInterestOnlyLoan && (
                      <span className="text-xs bg-white/20 border border-white/30 px-2 py-0.5 rounded-full font-normal">
                        💵 OFFLINE MODE
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-white/80">{loan?.loanNumber || 'Loading...'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {loan && getStatusBadge(loan.status)}
                {isInterestOnlyLoan && (
                  <Button size="sm" className="bg-white text-purple-600 hover:bg-purple-50" onClick={openStartLoanDialog}>
                    <PlayCircle className="h-4 w-4 mr-1" />
                    Start Loan
                  </Button>
                )}
                {userRole === 'SUPER_ADMIN' && (
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {/* Close Loan button — visible for ACTIVE loans */}
                {loan && loan.status === 'ACTIVE' && !loan.isMirrorLoan && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-red-500/80 gap-1 text-xs"
                    onClick={() => setCloseLoanDialogOpen(true)}
                  >
                    <XCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Close Loan</span>
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Mirror Loan Warning Banner */}
            {loan?.isMirrorLoan && (
              <div className="p-3 bg-amber-50 border-b border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">This is a Mirror Loan</p>
                    <p className="text-xs text-amber-700">
                      EMI payments are automatically synced from the original loan. 
                      Pay EMIs on the original loan ({loan?.company?.name || 'original company'}) to update this mirror loan.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Original Loan Info Banner */}
            {loan?.isMirrored && !loan?.isMirrorLoan && (
              <div className="p-3 bg-blue-50 border-b border-blue-200">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">This loan has a Mirror</p>
                    <p className="text-xs text-blue-700">
                      When you pay EMIs on this loan, the mirror loan EMI will be automatically synced.
                      {loan.extraEMICount && loan.extraEMICount > 0 && (
                        <span className="font-medium"> Extra EMIs ({loan.extraEMICount}) go to Personal Credit.</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Credit Info Bar */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Personal: {formatCurrency(personalCredit)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Company: {formatCurrency(companyCredit)}</span>
                </div>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-emerald-600" />
                  <p className="text-gray-500">Loading loan details...</p>
                </div>
              </div>
            ) : loan ? (
              <div className="flex-1 overflow-y-auto flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <div className="mx-4 mt-2 overflow-x-auto no-scrollbar">
                    <TabsList className="inline-flex min-w-full bg-gray-100 p-1 rounded-lg">
                      <TabsTrigger value="overview" className="flex-1 text-xs data-[state=active]:bg-white whitespace-nowrap">Overview</TabsTrigger>
                      <TabsTrigger value="customer" className="flex-1 text-xs data-[state=active]:bg-white whitespace-nowrap">Customer</TabsTrigger>
                      <TabsTrigger value="documents" className="flex-1 text-xs data-[state=active]:bg-white whitespace-nowrap">Documents</TabsTrigger>
                      <TabsTrigger value="emi" className="flex-1 text-xs data-[state=active]:bg-white whitespace-nowrap">EMI</TabsTrigger>
                      <TabsTrigger value="receipt" className="flex-1 text-xs data-[state=active]:bg-white whitespace-nowrap">Receipt</TabsTrigger>
                      <TabsTrigger value="history" className="flex-1 text-xs data-[state=active]:bg-white whitespace-nowrap">History</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-y-auto mt-2 p-4 space-y-4">
                    {/* Overview Tab */}
                    <TabsContent value="overview" className="m-0 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
                          <CardContent className="p-3">
                            <p className="text-xs text-emerald-600">Loan Amount</p>
                            <p className="text-lg font-bold text-emerald-700">{formatCurrency(loan.loanAmount)}</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                          <CardContent className="p-3">
                            <p className="text-xs text-blue-600">Interest Rate</p>
                            <p className="text-lg font-bold text-blue-700">{loan.interestRate}% p.a.</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                          <CardContent className="p-3">
                            <p className="text-xs text-purple-600">{isInterestOnlyLoan ? 'Monthly Interest' : 'EMI Amount'}</p>
                            <p className="text-lg font-bold text-purple-700">
                              {formatCurrency(isInterestOnlyLoan ? (loan.interestOnlyMonthlyAmount || 0) : loan.emiAmount)}
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                          <CardContent className="p-3">
                            <p className="text-xs text-amber-600">Total Receivable</p>
                            <p className="text-lg font-bold text-amber-700">{formatCurrency(summary?.totalOutstanding || 0)}</p>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <IndianRupee className="h-4 w-4" /> Loan Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">Loan Type</p>
                              <p className="font-medium">{loan.loanType}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Tenure</p>
                              <p className="font-medium">{loan.tenure} months</p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500">Disbursement Date</p>
                              <p className="font-medium">{formatDate(loan.disbursementDate)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Disbursement Mode</p>
                              <p className="font-medium">{loan.disbursementMode}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Company</p>
                              <p className="font-medium">{loan.company?.name || 'N/A'}</p>
                            </div>
                            {loan.applicationLocation && (
                              <div className="col-span-2 md:col-span-3">
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-emerald-500" /> Application Location
                                </p>
                                <p className="font-medium text-emerald-700">{loan.applicationLocation}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Wallet className="h-4 w-4" /> Payment Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">Total EMIs</p>
                              <p className="text-xl font-bold">{summary?.totalEMIs || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Paid</p>
                              <p className="text-xl font-bold text-green-600">{summary?.paidEMIs || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Pending</p>
                              <p className="text-xl font-bold text-amber-600">{summary?.pendingEMIs || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Overdue</p>
                              <p className="text-xl font-bold text-red-600">{summary?.overdueEMIs || 0}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Customer Tab */}
                    <TabsContent value="customer" className="m-0 space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <User className="h-4 w-4" /> Customer Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">Full Name</p>
                              <p className="font-medium">{loan.customerName}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Phone</p>
                              <p className="font-medium flex items-center gap-1">
                                <Phone className="h-3 w-3" />{loan.customerPhone}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Email</p>
                              <p className="font-medium">{loan.customerEmail || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">PAN Number</p>
                              <p className="font-medium font-mono">{loan.customerPan || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Aadhaar Number</p>
                              <p className="font-medium font-mono">{loan.customerAadhaar ? `XXXX-XXXX-${loan.customerAadhaar.slice(-4)}` : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Occupation</p>
                              <p className="font-medium">{loan.customerOccupation || 'N/A'}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Documents Tab */}
                    <TabsContent value="documents" className="m-0">
                      <div className="space-y-4">

                      {/* ── GOLD LOAN RECEIPT ── */}
                      {(loan.loanType === 'GOLD' || loan.loanType?.includes('GOLD')) && loan.goldLoanDetail && (() => {
                        const g = loan.goldLoanDetail!;
                        const openGoldReceipt = () => {
                          const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
                          const photoHtml = g.goldItemPhoto ? `<div style="text-align:center;margin:20px 0"><p style="font-size:13px;color:#666;margin-bottom:8px;font-weight:600">GOLD ITEM PHOTOGRAPH</p><img src="${g.goldItemPhoto}" style="max-width:300px;max-height:300px;object-fit:contain;border:2px solid #d97706;border-radius:8px;padding:4px" alt="Gold Item"/></div>` : '';
                          const w = window.open('', '_blank');
                          if (!w) return;
                          w.document.write(`<!DOCTYPE html><html><head><title>Gold Loan Receipt - ${loan.loanNumber}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#f9f9f9;color:#222}.page{max-width:800px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12)}.header{background:linear-gradient(135deg,#b45309,#d97706);color:#fff;padding:28px 32px}.header h1{font-size:24px;font-weight:700}.body{padding:28px 32px}.st{font-size:14px;font-weight:700;color:#b45309;text-transform:uppercase;border-bottom:2px solid #fde68a;padding-bottom:6px;margin:20px 0 12px}.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}.f{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px}.f.gr{background:#f0fdf4;border-color:#86efac}.f.bl{background:#eff6ff;border-color:#93c5fd}.f label{font-size:11px;color:#92400e;font-weight:600;text-transform:uppercase}.f p{font-size:16px;font-weight:700;color:#1e293b;margin-top:3px}.ir{display:flex;gap:8px;align-items:center;font-size:13px;padding:4px 0}.ir span:first-child{color:#64748b;width:140px}.footer{background:#fffbeb;border-top:2px dashed #fde68a;padding:20px 32px;display:flex;justify-content:space-between;align-items:flex-end}.sb{text-align:center}.sl{width:160px;border-bottom:1px solid #999;margin-bottom:6px;height:40px}.sl-label{font-size:11px;color:#64748b}@media print{body{background:#fff}.page{box-shadow:none;margin:0;border-radius:0}}</style></head><body><div class="page"><div class="header"><h1>🏅 GOLD LOAN RECEIPT</h1><p>Loan No: <strong>${loan.loanNumber}</strong> &nbsp;|&nbsp; Date: ${today}</p></div><div class="body"><div class="st">Customer</div><div class="g2"><div class="ir"><span>Customer Name</span><strong>${loan.customerName}</strong></div><div class="ir"><span>Phone</span><strong>${loan.customerPhone || 'N/A'}</strong></div><div class="ir"><span>Address</span><strong>${loan.customerAddress || 'N/A'}</strong></div></div><div class="st">Loan Details</div><div class="grid"><div class="f bl"><label>Loan Amount</label><p>₹${loan.loanAmount.toLocaleString('en-IN')}</p></div><div class="f bl"><label>Interest Rate</label><p>${loan.interestRate}% p.a.</p></div><div class="f bl"><label>Tenure</label><p>${loan.tenure} months</p></div><div class="f gr"><label>EMI</label><p>₹${loan.emiAmount.toLocaleString('en-IN')}</p></div></div><div class="st">Gold Collateral</div><div class="grid"><div class="f"><label>Gross Weight</label><p>${g.grossWeight}g</p></div><div class="f"><label>Net Weight</label><p>${g.netWeight}g</p></div><div class="f"><label>Purity</label><p>${g.karat || 22}K</p></div><div class="f"><label>Gold Rate/g</label><p>₹${g.goldRate.toLocaleString('en-IN')}</p></div><div class="f gr"><label>Valuation</label><p>₹${g.valuationAmount.toLocaleString('en-IN')}</p></div><div class="f bl"><label>Loan Approved</label><p>₹${g.loanAmount.toLocaleString('en-IN')}</p></div></div>${g.ownerName ? `<div class="st">Additional</div><div><div class="ir"><span>Gold Owner</span><strong>${g.ownerName}</strong></div>${g.numberOfItems ? `<div class="ir"><span>No. of Items</span><strong>${g.numberOfItems}</strong></div>` : ''}${g.itemDescription ? `<div class="ir"><span>Description</span><strong>${g.itemDescription}</strong></div>` : ''}${g.remarks ? `<div class="ir"><span>Remarks</span><strong>${g.remarks}</strong></div>` : ''}</div>` : ''}${photoHtml}</div><div class="footer"><div class="sb"><div class="sl"></div><div class="sl-label">Borrower Signature</div></div><div style="text-align:center;font-size:12px;color:#92400e"><p style="font-weight:700">GOLD HELD AS COLLATERAL</p><p>To be returned upon full repayment</p></div><div class="sb"><div class="sl"></div><div class="sl-label">Authorized Signatory</div></div></div></div><div style="text-align:center;padding:16px"><button onclick="window.print()" style="padding:10px 28px;background:#b45309;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600">🖨 Print Receipt</button></div></body></html>`);
                          w.document.close();
                        };
                        const openDocInner = openDoc;
                        return (
                          <Card key="gold" className="border-0 shadow-sm border-l-4 border-l-amber-500">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-amber-600" /> Gold Loan Receipt
                                <button type="button" onClick={openGoldReceipt} className="ml-auto flex items-center gap-1 px-2.5 py-1 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 transition-colors font-medium">
                                  <Printer className="h-3 w-3" /> View Full Receipt
                                </button>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="p-2.5 bg-amber-50 rounded-lg"><div className="text-xs text-amber-700 font-medium mb-0.5">Gross Weight</div><div className="font-bold">{g.grossWeight}g</div></div>
                                <div className="p-2.5 bg-amber-50 rounded-lg"><div className="text-xs text-amber-700 font-medium mb-0.5">Net Weight</div><div className="font-bold">{g.netWeight}g</div></div>
                                <div className="p-2.5 bg-amber-50 rounded-lg"><div className="text-xs text-amber-700 font-medium mb-0.5">Gold Rate/g</div><div className="font-bold">₹{g.goldRate}</div></div>
                                <div className="p-2.5 bg-amber-50 rounded-lg"><div className="text-xs text-amber-700 font-medium mb-0.5">Purity</div><div className="font-bold">{g.karat || 22}K</div></div>
                                <div className="p-2.5 bg-emerald-50 rounded-lg"><div className="text-xs text-emerald-700 font-medium mb-0.5">Valuation</div><div className="font-bold text-emerald-700">₹{g.valuationAmount.toLocaleString('en-IN')}</div></div>
                                <div className="p-2.5 bg-blue-50 rounded-lg"><div className="text-xs text-blue-700 font-medium mb-0.5">Approved Loan</div><div className="font-bold text-blue-700">₹{g.loanAmount.toLocaleString('en-IN')}</div></div>
                              </div>
                              {g.goldItemPhoto && (
                                <div className="mt-3 flex items-start gap-3 p-3 border border-amber-200 rounded-lg bg-amber-50/40">
                                  <button type="button" onClick={() => openDocInner(g.goldItemPhoto!)} className="shrink-0">
                                    <img src={g.goldItemPhoto} alt="Gold Item" className="w-20 h-20 object-cover rounded-lg border-2 border-amber-300 hover:opacity-90 transition-opacity" />
                                  </button>
                                  <div className="flex flex-col gap-2">
                                    <p className="text-xs font-medium text-gray-700">Gold Item Photo</p>
                                    <button type="button" onClick={() => openDocInner(g.goldItemPhoto!)} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs rounded-lg hover:bg-amber-200">
                                      <Eye className="h-3 w-3" /> View Photo
                                    </button>
                                    <button type="button" onClick={openGoldReceipt} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700">
                                      <Printer className="h-3 w-3" /> Print Receipt
                                    </button>
                                  </div>
                                </div>
                              )}
                              {g.ownerName && <p className="mt-2 text-xs text-gray-500">Owner: <strong>{g.ownerName}</strong></p>}
                              {g.remarks && <p className="mt-1 text-xs text-gray-400 italic">{g.remarks}</p>}
                            </CardContent>
                          </Card>
                        );
                      })()}

                      {/* ── VEHICLE LOAN RECEIPT ── */}
                      {(loan.loanType === 'VEHICLE' || loan.loanType?.includes('VEHICLE')) && loan.vehicleLoanDetail && (() => {
                        const v = loan.vehicleLoanDetail!;
                        const openVehicleReceipt = () => {
                          const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
                          const vPhotoHtml = v.vehiclePhoto ? `<div style="text-align:center;margin:16px 0"><p style="font-size:13px;color:#666;margin-bottom:8px;font-weight:600">VEHICLE PHOTOGRAPH</p><img src="${v.vehiclePhoto}" style="max-width:320px;max-height:240px;object-fit:contain;border:2px solid #3b82f6;border-radius:8px;padding:4px" alt="Vehicle"/></div>` : '';
                          const rcPhotoHtml = v.rcBookPhoto ? `<div style="text-align:center;margin:16px 0"><p style="font-size:13px;color:#666;margin-bottom:8px;font-weight:600">RC BOOK</p><img src="${v.rcBookPhoto}" style="max-width:320px;max-height:240px;object-fit:contain;border:2px solid #10b981;border-radius:8px;padding:4px" alt="RC Book"/></div>` : '';
                          const w = window.open('', '_blank');
                          if (!w) return;
                          w.document.write(`<!DOCTYPE html><html><head><title>Vehicle Loan Receipt - ${loan.loanNumber}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#f9f9f9;color:#222}.page{max-width:800px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12)}.header{background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;padding:28px 32px}.header h1{font-size:24px;font-weight:700}.body{padding:28px 32px}.st{font-size:14px;font-weight:700;color:#1e40af;text-transform:uppercase;border-bottom:2px solid #bfdbfe;padding-bottom:6px;margin:20px 0 12px}.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}.f{background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:10px 14px}.f.gr{background:#f0fdf4;border-color:#86efac}.f label{font-size:11px;color:#1e40af;font-weight:600;text-transform:uppercase}.f p{font-size:16px;font-weight:700;color:#1e293b;margin-top:3px}.ir{display:flex;gap:8px;align-items:center;font-size:13px;padding:4px 0}.ir span:first-child{color:#64748b;width:160px}.footer{background:#eff6ff;border-top:2px dashed #93c5fd;padding:20px 32px;display:flex;justify-content:space-between;align-items:flex-end}.sb{text-align:center}.sl{width:160px;border-bottom:1px solid #999;margin-bottom:6px;height:40px}.sl-label{font-size:11px;color:#64748b}@media print{body{background:#fff}.page{box-shadow:none;margin:0;border-radius:0}}</style></head><body><div class="page"><div class="header"><h1>🚗 VEHICLE LOAN RECEIPT</h1><p>Loan No: <strong>${loan.loanNumber}</strong> &nbsp;|&nbsp; Date: ${today}</p></div><div class="body"><div class="st">Customer</div><div class="ir"><span>Customer Name</span><strong>${loan.customerName}</strong></div><div class="ir"><span>Phone</span><strong>${loan.customerPhone || 'N/A'}</strong></div><div class="st">Loan Details</div><div class="grid"><div class="f"><label>Loan Amount</label><p>₹${loan.loanAmount.toLocaleString('en-IN')}</p></div><div class="f"><label>Interest Rate</label><p>${loan.interestRate}% p.a.</p></div><div class="f"><label>Tenure</label><p>${loan.tenure} months</p></div><div class="f gr"><label>EMI</label><p>₹${loan.emiAmount.toLocaleString('en-IN')}</p></div></div><div class="st">Vehicle Details</div><div class="grid"><div class="f"><label>Vehicle Type</label><p>${v.vehicleType}</p></div><div class="f"><label>Reg. Number</label><p>${v.vehicleNumber || 'N/A'}</p></div><div class="f"><label>Manufacturer</label><p>${v.manufacturer || 'N/A'}</p></div><div class="f"><label>Model</label><p>${v.model || 'N/A'}</p></div><div class="f"><label>Year</label><p>${v.yearOfManufacture || 'N/A'}</p></div>${v.fuelType ? `<div class="f"><label>Fuel Type</label><p>${v.fuelType}</p></div>` : ''}<div class="f gr"><label>Valuation</label><p>₹${v.valuationAmount.toLocaleString('en-IN')}</p></div><div class="f"><label>Approved Loan</label><p>₹${v.loanAmount.toLocaleString('en-IN')}</p></div></div>${v.chassisNumber || v.engineNumber || v.ownerName ? `<div class="st">ID Numbers</div><div>${v.ownerName ? `<div class="ir"><span>Registered Owner</span><strong>${v.ownerName}</strong></div>` : ''}${v.chassisNumber ? `<div class="ir"><span>Chassis No</span><strong>${v.chassisNumber}</strong></div>` : ''}${v.engineNumber ? `<div class="ir"><span>Engine No</span><strong>${v.engineNumber}</strong></div>` : ''}</div>` : ''}${vPhotoHtml || rcPhotoHtml ? `<div class="st">Photos</div><div style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap">${vPhotoHtml}${rcPhotoHtml}</div>` : ''}</div><div class="footer"><div class="sb"><div class="sl"></div><div class="sl-label">Borrower Signature</div></div><div style="text-align:center;font-size:12px;color:#1e40af"><p style="font-weight:700">VEHICLE HYPOTHECATED TO LENDER</p><p>To be released upon full repayment</p></div><div class="sb"><div class="sl"></div><div class="sl-label">Authorized Signatory</div></div></div></div><div style="text-align:center;padding:16px"><button onclick="window.print()" style="padding:10px 28px;background:#1e40af;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600">🖨 Print Receipt</button></div></body></html>`);
                          w.document.close();
                        };
                        const openDocInner = openDoc;
                        return (
                          <Card key="vehicle" className="border-0 shadow-sm border-l-4 border-l-blue-500">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Car className="h-4 w-4 text-blue-600" /> Vehicle Loan Receipt
                                <button type="button" onClick={openVehicleReceipt} className="ml-auto flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors font-medium">
                                  <Printer className="h-3 w-3" /> View Full Receipt
                                </button>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="p-2.5 bg-blue-50 rounded-lg"><div className="text-xs text-blue-700 font-medium mb-0.5">Vehicle Type</div><div className="font-bold">{v.vehicleType}</div></div>
                                <div className="p-2.5 bg-blue-50 rounded-lg"><div className="text-xs text-blue-700 font-medium mb-0.5">Reg. Number</div><div className="font-bold">{v.vehicleNumber || 'N/A'}</div></div>
                                <div className="p-2.5 bg-gray-50 rounded-lg"><div className="text-xs text-gray-600 font-medium mb-0.5">Manufacturer</div><div className="font-bold">{v.manufacturer || 'N/A'}</div></div>
                                <div className="p-2.5 bg-gray-50 rounded-lg"><div className="text-xs text-gray-600 font-medium mb-0.5">Model</div><div className="font-bold">{v.model || 'N/A'}</div></div>
                                <div className="p-2.5 bg-emerald-50 rounded-lg"><div className="text-xs text-emerald-700 font-medium mb-0.5">Valuation</div><div className="font-bold text-emerald-700">₹{v.valuationAmount.toLocaleString('en-IN')}</div></div>
                                <div className="p-2.5 bg-blue-50 rounded-lg"><div className="text-xs text-blue-700 font-medium mb-0.5">Approved Loan</div><div className="font-bold text-blue-700">₹{v.loanAmount.toLocaleString('en-IN')}</div></div>
                              </div>
                              {(v.vehiclePhoto || v.rcBookPhoto) && (
                                <div className="mt-3 flex flex-wrap gap-3">
                                  {v.vehiclePhoto && (
                                    <div className="flex items-start gap-2 p-2.5 border border-blue-200 rounded-lg bg-blue-50/40">
                                      <button type="button" onClick={() => openDocInner(v.vehiclePhoto!)} className="shrink-0">
                                        <img src={v.vehiclePhoto} alt="Vehicle" className="w-20 h-20 object-cover rounded-lg border-2 border-blue-300 hover:opacity-90 transition-opacity" />
                                      </button>
                                      <div className="flex flex-col gap-1.5">
                                        <p className="text-xs font-medium text-gray-700">Vehicle Photo</p>
                                        <button type="button" onClick={() => openDocInner(v.vehiclePhoto!)} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg hover:bg-blue-200">
                                          <Eye className="h-3 w-3" /> View
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  {v.rcBookPhoto && (
                                    <div className="flex items-start gap-2 p-2.5 border border-emerald-200 rounded-lg bg-emerald-50/40">
                                      <button type="button" onClick={() => openDocInner(v.rcBookPhoto!)} className="shrink-0">
                                        <img src={v.rcBookPhoto} alt="RC Book" className="w-20 h-20 object-cover rounded-lg border-2 border-emerald-300 hover:opacity-90 transition-opacity" />
                                      </button>
                                      <div className="flex flex-col gap-1.5">
                                        <p className="text-xs font-medium text-gray-700">RC Book</p>
                                        <button type="button" onClick={() => openDocInner(v.rcBookPhoto!)} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-lg hover:bg-emerald-200">
                                          <Eye className="h-3 w-3" /> View
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  <button type="button" onClick={openVehicleReceipt} className="self-center inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">
                                    <Printer className="h-3 w-3" /> Print Full Receipt
                                  </button>
                                </div>
                              )}
                              {v.ownerName && <p className="mt-2 text-xs text-gray-500">Owner: <strong>{v.ownerName}</strong></p>}
                              {v.remarks && <p className="mt-1 text-xs text-gray-400 italic">{v.remarks}</p>}
                            </CardContent>
                          </Card>
                        );
                      })()}

                      {/* ── KYC Documents ── */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <FileText className="h-4 w-4" /> KYC Documents
                            <span className="ml-auto text-xs font-normal text-gray-500">
                              {[loan.panCardDoc, loan.aadhaarFrontDoc, loan.aadhaarBackDoc, loan.incomeProofDoc,
                                loan.addressProofDoc, loan.photoDoc, loan.electionCardDoc, loan.housePhotoDoc,
                                loan.guarantorPhotoDoc, loan.passbookPhotoDoc
                              ].filter(Boolean).length} / 10 uploaded
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: 'PAN Card', url: loan.panCardDoc },
                              { label: 'Aadhaar Front', url: loan.aadhaarFrontDoc },
                              { label: 'Aadhaar Back', url: loan.aadhaarBackDoc },
                              { label: 'Income Proof', url: loan.incomeProofDoc },
                              { label: 'Address Proof', url: loan.addressProofDoc },
                              { label: 'Photo', url: loan.photoDoc },
                              { label: 'Election Card', url: loan.electionCardDoc },
                              { label: 'House Photo', url: loan.housePhotoDoc },
                              { label: 'Guarantor Photo', url: loan.guarantorPhotoDoc },
                              { label: 'Passbook', url: loan.passbookPhotoDoc },
                            ].map((doc, idx) => {
                              const isPdf = doc.url?.includes('application/pdf') || doc.url?.toLowerCase().endsWith('.pdf');
                                const isImage = doc.url && !isPdf;
                                return (
                                <div key={idx} className={`rounded-lg border overflow-hidden ${doc.url ? 'border-green-200' : 'border-dashed border-gray-300'}`}>
                                  {isImage ? (
                                    <button type="button" onClick={() => openDoc(doc.url!)} className="block w-full bg-gray-100 hover:opacity-90 transition-opacity cursor-pointer">
                                      <img src={doc.url!} alt={doc.label} className="w-full h-28 object-cover"
                                        onError={(e) => { const t = e.target as HTMLImageElement; t.style.display='none'; t.nextElementSibling?.classList.remove('hidden'); }} />
                                      <div className="hidden w-full h-28 flex items-center justify-center bg-gray-50"><FileText className="h-8 w-8 text-gray-400" /></div>
                                    </button>
                                  ) : isPdf ? (
                                    <div className="w-full h-28 flex flex-col items-center justify-center bg-red-50 gap-1">
                                      <FileText className="h-8 w-8 text-red-400" /><span className="text-xs text-red-500 font-medium">PDF</span>
                                    </div>
                                  ) : (
                                    <div className="w-full h-28 flex items-center justify-center bg-gray-50">
                                      <div className="text-center">
                                        <FileText className="h-8 w-8 text-gray-300 mx-auto" />
                                        <p className="text-xs text-gray-400 mt-1">Not uploaded</p>
                                      </div>
                                    </div>
                                  )}
                                  <div className={`flex items-center justify-between px-2 py-1.5 ${doc.url ? 'bg-green-50' : 'bg-gray-50'}`}>
                                    <p className="text-xs font-medium text-gray-700 truncate">{doc.label}</p>
                                    {doc.url ? (
                                      <button type="button" onClick={() => openDoc(doc.url!)} className="text-xs text-blue-600 hover:underline flex items-center gap-1 shrink-0 ml-1">
                                        <Eye className="h-3 w-3" /> View
                                      </button>
                                    ) : (
                                      <span className="text-xs text-gray-400 shrink-0">—</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                      </div>
                    </TabsContent>

                    {/* EMI Tab */}
                    <TabsContent value="emi" className="m-0 space-y-4">
                      {isInterestOnlyLoan ? (
                        <>
                          {/* Interest EMI Card - Same as online loan */}
                          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                                  <CalendarClock className="h-5 w-5" />
                                  Interest EMI
                                  <Badge className="bg-amber-200 text-amber-700">Interest Only Phase</Badge>
                                </CardTitle>
                              </div>
                              <CardDescription>
                                Pay monthly interest until you're ready to start full EMI payments
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {/* Interest Summary */}
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="p-3 bg-white rounded-lg border border-amber-200">
                                    <p className="text-xs text-gray-500">Principal Amount</p>
                                    <p className="text-lg font-bold text-gray-900">
                                      {formatCurrency(loan.loanAmount)}
                                    </p>
                                  </div>
                                  <div className="p-3 bg-white rounded-lg border border-amber-200">
                                    <p className="text-xs text-gray-500">Interest Rate</p>
                                    <p className="text-lg font-bold text-amber-700">
                                      {loan.interestRate}% p.a.
                                    </p>
                                  </div>
                                  <div className="p-3 bg-white rounded-lg border border-amber-200">
                                    <p className="text-xs text-gray-500">Monthly Interest</p>
                                    <p className="text-lg font-bold text-amber-700">
                                      {formatCurrency(loan.interestOnlyMonthlyAmount || 0)}
                                    </p>
                                  </div>
                                </div>

                                {/* Total Interest Paid */}
                                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm text-green-600">Total Interest Paid</p>
                                      <p className="text-2xl font-bold text-green-700">
                                        {formatCurrency(loan.totalInterestPaid || 0)}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm text-gray-500">Payments Made</p>
                                      <p className="text-xl font-bold text-gray-700">
                                        {loan.emis.filter(e => e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID').length}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <Separator />

                                {/* Current Pending Interest EMI */}
                                {(() => {
                                  const pendingEmi = loan.emis.find(e => e.paymentStatus === 'PENDING' && e.isInterestOnly);
                                  if (pendingEmi) {
                                    return (
                                      <div className="p-4 bg-white rounded-lg border-2 border-amber-300 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                          <div>
                                            <p className="font-semibold text-gray-900">
                                              Interest Payment #{pendingEmi.installmentNumber}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                              Due: {formatDate(pendingEmi.dueDate)}
                                            </p>
                                          </div>
                                          <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className="text-2xl font-bold text-amber-600">
                                              {formatCurrency(pendingEmi.totalAmount)}
                                            </p>
                                            <p className="text-xs text-gray-500">Interest Amount Due</p>
                                          </div>
                                          <Button
                                            className="bg-amber-500 hover:bg-amber-600"
                                            onClick={() => {
                                              setSelectedEmi(pendingEmi);
                                              setPaymentType('INTEREST_ONLY');
                                              setPaymentAmount(pendingEmi.totalAmount);
                                              setIsInterestOnlyPayment(true);
                                              setPaymentDialogOpen(true);
                                            }}
                                          >
                                            <IndianRupee className="h-4 w-4 mr-1" />
                                            Pay Interest
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                                      <p className="text-blue-700 font-medium">No pending interest EMI</p>
                                      <p className="text-sm text-blue-600">Your interest is up to date!</p>
                                    </div>
                                  );
                                })()}

                                <Separator />

                                {/* Payment History */}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                    <History className="h-4 w-4" />
                                    Payment History
                                  </h4>
                                  {loan.emis.filter(e => e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID').length > 0 ? (
                                    <ScrollArea className="h-[200px]">
                                      <div className="space-y-2">
                                        {loan.emis
                                          .filter(e => e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID')
                                          .sort((a, b) => b.installmentNumber - a.installmentNumber)
                                          .map((emi, index, arr) => (
                                            <div key={emi.id} className="p-3 bg-white rounded-lg border border-gray-200">
                                              <div className="flex items-center justify-between">
                                                <div>
                                                  <p className="font-medium text-gray-900">
                                                    Payment #{arr.length - index}
                                                  </p>
                                                  <p className="text-xs text-gray-500">
                                                    {emi.paidDate ? formatDate(emi.paidDate) : 'N/A'}
                                                  </p>
                                                </div>
                                                <div className="text-right">
                                                  <p className="font-bold text-green-600">
                                                    {formatCurrency(emi.paidAmount)}
                                                  </p>
                                                  <div className="flex items-center gap-1">
                                                    <Badge className="bg-gray-100 text-gray-600 text-xs">
                                                      {emi.paymentMode || 'CASH'}
                                                    </Badge>
                                                    {emi.paymentStatus === 'INTEREST_ONLY_PAID' && (
                                                      <Badge className="bg-purple-100 text-purple-600 text-xs">
                                                        Interest Only
                                                      </Badge>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                              {/* Payment Proof */}
                                              {emi.proofUrl && (
                                                <div className="mt-2 pt-2 border-t border-gray-100">
                                                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                                    <FileText className="h-3 w-3" /> Payment Proof
                                                  </p>
                                                  {emi.proofUrl.includes('application/pdf') || emi.proofUrl.toLowerCase().endsWith('.pdf') ? (
                                                    <button
                                                      type="button"
                                                      onClick={() => openDoc(emi.proofUrl!)}
                                                      className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 text-xs rounded hover:bg-red-100"
                                                    >
                                                      <FileText className="h-3 w-3" /> View PDF Proof
                                                    </button>
                                                  ) : (
                                                    <button type="button" onClick={() => openDoc(emi.proofUrl!)} className="shrink-0">
                                                      <img
                                                        src={emi.proofUrl}
                                                        alt="Payment Proof"
                                                        className="h-16 w-24 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                      />
                                                    </button>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                      </div>
                                    </ScrollArea>
                                  ) : (
                                    <div className="text-center py-4 text-gray-500">
                                      <p>No payments yet</p>
                                    </div>
                                  )}
                                </div>

                                {/* Info Alert */}
                                <Alert className="bg-blue-50 border-blue-200">
                                  <Info className="h-4 w-4 text-blue-600" />
                                  <AlertDescription className="text-blue-700 text-sm">
                                    You are in the Interest Only phase. Pay monthly interest until ready to start full EMI payments.
                                    Click "Start Loan" button above when you want to begin regular EMI payments.
                                  </AlertDescription>
                                </Alert>
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      ) : (
                        <Card>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Receipt className="h-4 w-4" /> EMI Schedule
                                </CardTitle>
                                <CardDescription>Click Pay button to make payment. You can pay any EMI.</CardDescription>
                              </div>
                              {/* Multi-EMI Pay Button */}
                              {selectedEmiIds.size > 0 && (
                                <Button
                                  className="bg-emerald-500 hover:bg-emerald-600"
                                  onClick={openMultiEmiPaymentDialog}
                                >
                                  <IndianRupee className="h-4 w-4 mr-1" />
                                  Pay {selectedEmiIds.size} EMIs (₹{formatCurrency(getTotalSelectedAmount())})
                                </Button>
                              )}
                            </div>
                            {/* Select All Checkbox - FIX-47: uses isOfflineEmiPayable predicate */}
                            {loan.emis.filter(isOfflineEmiPayable).length > 0 && (
                              <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                                <Checkbox
                                  id="select-all-offline-emi"
                                  checked={
                                    // FIX-47: count how many payable EMIs are selected (ignore stale non-payable IDs)
                                    loan.emis.filter(isOfflineEmiPayable).length > 0 &&
                                    loan.emis.filter(isOfflineEmiPayable).every(e => selectedEmiIds.has(e.id))
                                  }
                                  onCheckedChange={selectAllPayableEmis}
                                />
                                <label htmlFor="select-all-offline-emi" className="text-sm text-gray-600 cursor-pointer">
                                  Select All Payable EMIs ({loan.emis.filter(isOfflineEmiPayable).length} available)
                                </label>
                              </div>
                            )}
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[400px]">
                              <div className="space-y-2">
                                {loan.emis.map((emi) => {
                                  const isPaidOrHandled = emi.paymentStatus === 'PAID' || emi.paymentStatus === 'INTEREST_ONLY_PAID';
                                  // Mirror loans cannot be paid directly - they sync from original
                                  const canPay = !isPaidOrHandled && !loan?.isMirrorLoan;
                                  const isSelected = selectedEmiIds.has(emi.id);
                                  
                                  // Check if this is an extra EMI (for original loans with mirror)
                                  // Deferred EMIs from INTEREST_ONLY are NOT extra — skip them
                                  const isExtraEMI = loan?.isMirrored && loan?.mirrorTenure
                                    && emi.installmentNumber > loan.mirrorTenure
                                    && !emi.isDeferred;
                                  
                                  // Calculate penalty for overdue EMIs
                                  const isOverdue = emi.paymentStatus === 'OVERDUE' || (emi.paymentStatus === 'PENDING' && new Date(emi.dueDate) < new Date());
                                  const penaltyInfo = (isOverdue && !isPaidOrHandled && loan?.loanAmount) 
                                    ? calculatePenaltyInfo(emi.dueDate, loan.loanAmount) 
                                    : null;

                                  // PRINCIPAL ONLY: status=PAID, paid interest is 0, paid amount ≈ principal,
                                  // AND total paid is strictly less than full EMI (so full EMIs aren't mislabelled)
                                  const isPrincipalOnly = emi.paymentStatus === 'PAID' &&
                                    emi.interestAmount > 0 &&
                                    (emi.paidInterest || 0) < 1 &&
                                    Math.abs((emi.paidPrincipal || emi.paidAmount || 0) - emi.principalAmount) < 1 &&
                                    (emi.paidAmount || 0) < (emi.totalAmount - 1);

                                  return (
                                    <div
                                      key={emi.id}
                                      className={`p-3 rounded-lg border transition-colors ${
                                        isPaidOrHandled
                                          ? 'bg-green-50 border-green-200'
                                          : isSelected
                                            ? 'bg-emerald-50 border-emerald-300'
                                            : isOverdue
                                              ? 'bg-red-50 border-red-300'
                                              : 'bg-white border-gray-200'
                                      }`}
                                    >
                                      {/* Penalty Banner for Overdue EMIs */}
                                      {penaltyInfo && penaltyInfo.penaltyAmount > 0 && (
                                        <div className="mb-2 p-2 bg-gradient-to-r from-red-100 to-orange-100 rounded-lg border border-red-200">
                                          <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <Badge className="bg-red-500 text-white text-xs">PENALTY</Badge>
                                                <span className="font-bold text-red-700 text-sm">₹{penaltyInfo.penaltyAmount.toLocaleString('en-IN')}</span>
                                                <span className="text-xs text-red-600">
                                                  ({penaltyInfo.daysOverdue} days × ₹{penaltyInfo.ratePerDay}/day)
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          {/* Checkbox for multi-selection */}
                                          {canPay && (
                                            <Checkbox
                                              checked={isSelected}
                                              onCheckedChange={() => toggleEmiSelection(emi.id)}
                                            />
                                          )}
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                            isPaidOrHandled
                                              ? 'bg-green-200 text-green-700'
                                              : isSelected
                                                ? 'bg-emerald-200 text-emerald-700'
                                                : isOverdue
                                                  ? 'bg-red-200 text-red-700'
                                                  : 'bg-emerald-100 text-emerald-700'
                                          }`}>
                                            {isPaidOrHandled ? (
                                              <CheckCircle className="h-5 w-5" />
                                            ) : isOverdue ? (
                                              <AlertTriangle className="h-5 w-5" />
                                            ) : (
                                              <span className="font-bold">{emi.installmentNumber}</span>
                                            )}
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <p className="font-medium">EMI #{emi.installmentNumber}</p>
                                              {isPrincipalOnly ? (
                                                <Badge className="bg-green-100 text-green-800 border-green-300 font-bold px-2 py-0.5">
                                                  PRINCIPAL ONLY
                                                </Badge>
                                              ) : (
                                                <Badge className={getEMIStatusColor(emi.paymentStatus)}>
                                                  {emi.paymentStatus.replace(/_/g, ' ')}
                                                </Badge>
                                              )}
                                              {/* Extra EMI Badge */}
                                              {isExtraEMI && (
                                                <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                                                  Extra EMI (Personal Credit)
                                                </Badge>
                                              )}
                                              {/* Mirror synced indicator */}
                                              {loan?.isMirrorLoan && isPaidOrHandled && emi.paymentReference?.includes('Synced') && (
                                                <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                                                  Synced from Original
                                                </Badge>
                                              )}
                                            </div>
                                            <p className="text-sm text-gray-500">Due: {formatDate(emi.dueDate)}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div className="text-right">
                                            {emi.paymentStatus === 'PARTIALLY_PAID' ? (
                                              <>
                                                <p className="font-bold text-lg text-amber-600">
                                                  {formatCurrency(emi.totalAmount - (emi.paidAmount || 0))}
                                                  <span className="text-xs font-normal text-gray-400 ml-1">remaining</span>
                                                </p>
                                                <p className="text-xs text-green-600">
                                                  ✓ Paid: {formatCurrency(emi.paidAmount || 0)} of {formatCurrency(emi.totalAmount)}
                                                </p>
                                              </>
                                            ) : emi.paymentStatus === 'INTEREST_ONLY_PAID' ? (
                                              <>
                                                <p className="font-bold text-lg text-blue-600">
                                                  {formatCurrency((emi.paidInterest || 0) > 0 ? (emi.paidInterest || 0) : emi.interestAmount)}
                                                  <span className="text-xs font-normal text-gray-400 ml-1">interest</span>
                                                </p>
                                                <p className="text-xs text-gray-400 line-through">EMI: {formatCurrency(emi.totalAmount)}</p>
                                              </>
                                            ) : isPrincipalOnly ? (
                                              <>
                                                <p className="font-bold text-lg text-green-700">
                                                  {formatCurrency(emi.principalAmount)}
                                                  <span className="text-xs font-normal text-gray-400 ml-1">principal</span>
                                                </p>
                                                <p className="text-xs text-gray-400 line-through">EMI: {formatCurrency(emi.totalAmount)}</p>
                                              </>
                                            ) : (
                                              <>
                                                <p className="font-bold text-lg">{formatCurrency(emi.totalAmount)}</p>
                                                {penaltyInfo && penaltyInfo.penaltyAmount > 0 && (
                                                  <p className="text-sm text-red-600 font-bold animate-pulse">
                                                    + ₹{penaltyInfo.penaltyAmount.toLocaleString('en-IN')} Penalty
                                                  </p>
                                                )}
                                                <p className="text-xs text-gray-500">
                                                  P: {formatCurrency(emi.principalAmount)} | I: {formatCurrency(emi.interestAmount)}
                                                </p>
                                              </>
                                            )}
                                          </div>
                                          {/* Pay Button - Available for all unpaid EMIs (no sequential restriction) */}
                                          {/* Mirror loans cannot be paid directly - they sync from original */}
                                          {canPay && (
                                            <Button
                                              size="sm"
                                              className={penaltyInfo ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"}
                                              onClick={() => openPaymentDialog(emi)}
                                            >
                                              <IndianRupee className="h-4 w-4 mr-1" />
                                              {penaltyInfo ? 'Pay + Penalty' : 'Pay'}
                                            </Button>
                                          )}
                                          {/* Eye Button - Show payment details for paid/partially paid EMIs */}
                                          {isPaidOrHandled && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="border-purple-300 text-purple-600 hover:bg-purple-50"
                                              onClick={() => openPaymentHistoryDialog(emi)}
                                              title="View payment details"
                                            >
                                              <Eye className="h-4 w-4" />
                                            </Button>
                                          )}
                                          {/* Show synced indicator for mirror loan EMIs */}
                                          {loan?.isMirrorLoan && !isPaidOrHandled && (
                                            <Badge className="bg-gray-100 text-gray-600">
                                              Auto-sync
                                            </Badge>
                                          )}
                                          {/* Receipt Button for Mirror Loans - Show for paid EMIs */}
                                          {loan?.isMirrorLoan && isPaidOrHandled && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                              onClick={() => fetchReceipt(emi.id)}
                                              disabled={loadingReceipt === emi.id}
                                            >
                                              <FileText className="h-4 w-4 mr-1" />
                                              {loadingReceipt === emi.id ? 'Loading...' : 'Receipt'}
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    {/* Receipt Tab — mirror loans only (original loan receipts go to mirror's tab) */}
                    {loan.isMirrorLoan && (
                    <TabsContent value="receipt" className="m-0">
                      <ReceiptSection
                        loanDetails={{
                          ...loan,
                          loanId: loan.id,
                          isOffline: true,
                          applicationNo: loan.loanNumber,
                          requestedAmount: loan.loanAmount,
                          sessionForm: {
                            approvedAmount: loan.loanAmount,
                            interestRate: loan.interestRate,
                            tenure: loan.tenure,
                            emiAmount: loan.emiAmount
                          },
                          customer: {
                            name: loan.customerName,
                            phone: loan.customerPhone,
                            email: loan.customerEmail
                          }
                        }}
                        emiSchedules={loan.emis.map(e => ({
                          id: e.id,
                          emiNumber: e.installmentNumber,
                          dueDate: e.dueDate,
                          emiAmount: e.totalAmount,
                          principalAmount: e.principalAmount,
                          interestAmount: e.interestAmount,
                          outstandingPrincipal: e.outstandingPrincipal,
                          status: e.paymentStatus,
                          paymentStatus: e.paymentStatus,
                          paidAmount: e.paidAmount,
                          paidPrincipal: e.paidPrincipal,
                          paidInterest: e.paidInterest,
                          paidDate: e.paidDate,
                          paymentMode: e.paymentMode,
                          paymentRef: e.paymentReference
                        }))}
                      />
                     </TabsContent>
                    )} {/* end loan.isMirrorLoan receipt guard */}

                    {/* History Tab */}
                    <TabsContent value="history" className="m-0">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Clock className="h-4 w-4" /> Loan History
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <FileText className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">Loan Created</p>
                                <p className="text-sm text-gray-500">{formatDate(loan.createdAt)}</p>
                                <p className="text-xs text-gray-400">Created by {loan.createdByRole}</p>
                              </div>
                            </div>
                            {loan.loanStartedAt && (
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                  <PlayCircle className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="font-medium">Loan Started</p>
                                  <p className="text-sm text-gray-500">{formatDate(loan.loanStartedAt)}</p>
                                  <p className="text-xs text-gray-400">EMI schedule activated</p>
                                </div>
                              </div>
                            )}
                            
                            {/* EMI Payment History - Original Loan */}
                            {loan.emis && loan.emis.length > 0 && (
                              <div className="mt-4 pt-4 border-t">
                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                                  {loan.isMirrored && !loan.isMirrorLoan ? 'Original Loan' : ''} EMI Payment History
                                </h4>
                                <ScrollArea className="max-h-64">
                                  <div className="space-y-3">
                                    {loan.emis
                                      .filter(e => e.paymentStatus === 'PAID' || e.paymentStatus === 'PARTIALLY_PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID')
                                      .sort((a, b) => new Date(b.paidDate || 0).getTime() - new Date(a.paidDate || 0).getTime())
                                      .map(emi => (
                                        <div key={emi.id} className="bg-gray-50 p-3 rounded-lg border">
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                              <Badge className={getEMIStatusColor(emi.paymentStatus)}>
                                                EMI #{emi.installmentNumber}
                                              </Badge>
                                              <span className="text-sm font-medium">
                                                {formatCurrency(emi.paidAmount || 0)}
                                              </span>
                                            </div>
                                            <span className="text-xs text-gray-500">
                                              {emi.paidDate ? new Date(emi.paidDate).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                              }) : '-'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-4 text-xs text-gray-600">
                                            <span>Mode: {emi.paymentMode || 'CASH'}</span>
                                            <span>P: {formatCurrency(emi.paidPrincipal || 0)}</span>
                                            <span>I: {formatCurrency(emi.paidInterest || 0)}</span>
                                          </div>
                                          {/* Show proof thumbnail if exists */}
                                          {emi.proofUrl && (
                                            <div className="mt-2 pt-2 border-t border-gray-200">
                                              <div className="flex items-center gap-2">
                                                {emi.proofUrl.toLowerCase().endsWith('.pdf') ? (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => window.open(emi.proofUrl!, '_blank')}
                                                  >
                                                    <FileText className="h-3 w-3 mr-1" />
                                                    View Proof PDF
                                                  </Button>
                                                ) : (
                                                  <div className="flex items-center gap-2">
                                                    <img
                                                      src={emi.proofUrl}
                                                      alt="Proof"
                                                      className="h-10 w-10 object-cover rounded border cursor-pointer hover:opacity-80"
                                                      onClick={() => window.open(emi.proofUrl!, '_blank')}
                                                    />
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 text-xs"
                                                      onClick={() => window.open(emi.proofUrl!, '_blank')}
                                                    >
                                                      View Proof
                                                    </Button>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    {loan.emis.filter(e => e.paymentStatus === 'PAID' || e.paymentStatus === 'PARTIALLY_PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID').length === 0 && (
                                      <p className="text-sm text-gray-500 text-center py-4">No payments recorded yet</p>
                                    )}
                                  </div>
                                </ScrollArea>
                              </div>
                            )}
                            
                            {/* Mirror Loan EMI Payment History - Only show if this is original loan with mirror */}
                            {loan.isMirrored && !loan.isMirrorLoan && loan.mirrorLoanId && (
                              <div className="mt-4 pt-4 border-t border-orange-200">
                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-orange-600" />
                                  Mirror Loan Payment History
                                  {loan.mirrorCompanyName && (
                                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                                      {loan.mirrorCompanyName}
                                    </Badge>
                                  )}
                                </h4>
                                {loadingMirrorEmis ? (
                                  <div className="flex items-center justify-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                                  </div>
                                ) : (
                                  <ScrollArea className="max-h-64">
                                    <div className="space-y-3">
                                      {mirrorLoanEmis
                                        .filter(e => e.paymentStatus === 'PAID' || e.paymentStatus === 'PARTIALLY_PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID')
                                        .sort((a, b) => new Date(b.paidDate || 0).getTime() - new Date(a.paidDate || 0).getTime())
                                        .map(emi => (
                                          <div key={emi.id} className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-2">
                                                <Badge className={getEMIStatusColor(emi.paymentStatus)}>
                                                  EMI #{emi.installmentNumber}
                                                </Badge>
                                                <span className="text-sm font-medium">
                                                  {formatCurrency(emi.paidAmount || 0)}
                                                </span>
                                              </div>
                                              <span className="text-xs text-gray-500">
                                                {emi.paidDate ? new Date(emi.paidDate).toLocaleDateString('en-IN', {
                                                  day: 'numeric',
                                                  month: 'short',
                                                  year: 'numeric'
                                                }) : '-'}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-gray-600">
                                              <span>Mode: {emi.paymentMode || 'CASH'}</span>
                                              <span>P: {formatCurrency(emi.paidPrincipal || 0)}</span>
                                              <span>I: {formatCurrency(emi.paidInterest || 0)}</span>
                                            </div>
                                            {/* Show proof thumbnail if exists */}
                                            {emi.proofUrl && (
                                              <div className="mt-2 pt-2 border-t border-orange-200">
                                                <div className="flex items-center gap-2">
                                                  {emi.proofUrl.toLowerCase().endsWith('.pdf') ? (
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className="h-7 text-xs"
                                                      onClick={() => window.open(emi.proofUrl!, '_blank')}
                                                    >
                                                      <FileText className="h-3 w-3 mr-1" />
                                                      View Proof PDF
                                                    </Button>
                                                  ) : (
                                                    <div className="flex items-center gap-2">
                                                      <img
                                                        src={emi.proofUrl}
                                                        alt="Proof"
                                                        className="h-10 w-10 object-cover rounded border cursor-pointer hover:opacity-80"
                                                        onClick={() => window.open(emi.proofUrl!, '_blank')}
                                                      />
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                        onClick={() => window.open(emi.proofUrl!, '_blank')}
                                                      >
                                                        View Proof
                                                      </Button>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      {mirrorLoanEmis.filter(e => e.paymentStatus === 'PAID' || e.paymentStatus === 'PARTIALLY_PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID').length === 0 && (
                                        <p className="text-sm text-gray-500 text-center py-4">No mirror loan payments recorded yet</p>
                                      )}
                                    </div>
                                  </ScrollArea>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Dialog - Same as Online Loan */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-emerald-600" />
              {isMultiEmiPayment
                ? `Pay ${multiEmiList.length} EMIs`
                : isInterestOnlyPayment
                  ? 'Pay Interest Only'
                  : `Pay EMI #${selectedEmi?.installmentNumber}`}
            </DialogTitle>
            {/* Description content - outside DialogDescription to avoid HTML nesting issues */}
            {isMultiEmiPayment ? (
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                {/* Advance Payment Breakdown */}
                {(() => {
                  const breakdown = getAdvancePaymentBreakdown();
                  return (
                    <>
                      <div className="flex justify-between">
                        <span>EMIs:</span>
                        <span className="font-medium">#{multiEmiList.map(e => e.installmentNumber).join(', #')}</span>
                      </div>

                      {/* Show breakdown if there are advance EMIs */}
                      {breakdown.advanceEmis.length > 0 && (
                        <div className="p-2 bg-blue-50 rounded border border-blue-200 text-xs">
                          <div className="flex items-center gap-1 text-blue-700 font-medium mb-1">
                            <Info className="h-3 w-3" />
                            Advance EMIs (Principal Only)
                          </div>
                          <div className="text-blue-600">
                            {breakdown.advanceEmis.map(e => `#${e.installmentNumber}`).join(', ')}: ₹{formatCurrency(breakdown.totalAdvance)}
                          </div>
                        </div>
                      )}

                      {/* Show current EMIs */}
                      {breakdown.currentEmis.length > 0 && (
                        <div className="p-2 bg-green-50 rounded border border-green-200 text-xs">
                          <div className="flex items-center gap-1 text-green-700 font-medium mb-1">
                            <CheckCircle className="h-3 w-3" />
                            Current Month EMIs (Full Payment)
                          </div>
                          <div className="text-green-600">
                            {breakdown.currentEmis.map(e => `#${e.installmentNumber}`).join(', ')}: ₹{formatCurrency(breakdown.totalCurrent)}
                          </div>
                        </div>
                      )}

                      {/* Total Summary */}
                      <div className="pt-2 border-t flex justify-between font-semibold">
                        <span>Total to Pay:</span>
                        <span className="text-lg">₹{formatCurrency(breakdown.grandTotal)}</span>
                      </div>
                      {breakdown.totalInterest > 0 && (
                        <div className="text-xs text-gray-500 flex justify-between">
                          <span>Principal: ₹{formatCurrency(breakdown.totalPrincipal)}</span>
                          <span>Interest: ₹{formatCurrency(breakdown.totalInterest)}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : isInterestOnlyPayment ? (
              <p className="text-sm text-gray-600 mb-4">
                Pay monthly interest of {formatCurrency(loan?.interestOnlyMonthlyAmount || 0)}
              </p>
            ) : selectedEmi && (
              <div className="mb-4">
                {/* Single EMI - NO advance check. Pay full amount (principal + interest) */}
                {/* Advance Payment logic ONLY applies to multi-EMI payment (select all) */}
                {/* BUG-4 fix: show remaining amount not original total */}
                <p className="text-sm text-gray-600">
                  <>Due: {formatCurrency(selectedEmi.totalAmount - (selectedEmi.paidAmount || 0))}
                    {(selectedEmi.paidAmount || 0) > 0 && (
                      <span className="text-green-600 ml-1">(Paid: {formatCurrency(selectedEmi.paidAmount)})</span>
                    )}
                  </>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  P: {formatCurrency(selectedEmi.principalAmount - (selectedEmi.paidPrincipal || 0))} remaining
                  {' | '}I: {formatCurrency(selectedEmi.interestAmount - (selectedEmi.paidInterest || 0))} remaining
                </p>
              </div>
            )}
          </DialogHeader>

          <div className="space-y-4">
            {/* Payment Type Selection - Full/Partial/Interest Only - Not available for multi-EMI */}
            {!isInterestOnlyPayment && !isMultiEmiPayment && userRole !== 'ACCOUNTANT' && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <Label className="text-purple-800 font-semibold mb-3 block">Payment Type *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={paymentType === 'FULL' ? 'default' : 'outline'}
                    className={paymentType === 'FULL' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                    onClick={() => {
                      setPaymentType('FULL');
                      setPaymentAmount(selectedEmi ? selectedEmi.totalAmount - (selectedEmi.paidAmount || 0) : 0);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Full
                  </Button>
                  <Button
                    type="button"
                    variant={paymentType === 'PARTIAL' ? 'default' : 'outline'}
                    className={paymentType === 'PARTIAL' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                    onClick={() => setPaymentType('PARTIAL')}
                  >
                    <Receipt className="h-4 w-4 mr-1" />
                    Partial
                  </Button>
                  <Button
                    type="button"
                    variant={paymentType === 'INTEREST_ONLY' ? 'default' : 'outline'}
                    className={paymentType === 'INTEREST_ONLY' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                    onClick={() => {
                      setPaymentType('INTEREST_ONLY');
                      // Use REMAINING interest (not full interestAmount)
                      setPaymentAmount((selectedEmi?.interestAmount || 0) - (selectedEmi?.paidInterest || 0));
                    }}
                  >
                    <Percent className="h-4 w-4 mr-1" />
                    Interest Only
                  </Button>
                  <Button
                    type="button"
                    variant={paymentType === 'PRINCIPAL_ONLY' ? 'default' : 'outline'}
                    className={paymentType === 'PRINCIPAL_ONLY' ? 'bg-red-500 hover:bg-red-600 text-white' : 'border-red-300 text-red-700 hover:bg-red-50'}
                    onClick={() => {
                      setPaymentType('PRINCIPAL_ONLY');
                      setPaymentAmount((selectedEmi?.principalAmount || 0) - (selectedEmi?.paidPrincipal || 0));
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Principal Only
                  </Button>
                </div>
              </div>
            )}

            {/* Partial Payment - When will rest be paid */}
            {paymentType === 'PARTIAL' && !isInterestOnlyPayment && (
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <Label className="text-orange-800 font-semibold mb-2 block">When will the remaining amount be paid? *</Label>
                <Input
                  type="date"
                  value={remainingPaymentDate}
                  onChange={(e) => setRemainingPaymentDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-orange-600 mt-2">
                  Remaining {formatCurrency((selectedEmi?.totalAmount || 0) - (selectedEmi?.paidAmount || 0) - paymentAmount)} will be due on selected date.
                </p>
              </div>
            )}

            {/* Interest Only Payment Info */}
            {paymentType === 'INTEREST_ONLY' && !isInterestOnlyPayment && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-semibold">Interest Only Payment</span>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Collecting only the interest: {formatCurrency((selectedEmi?.interestAmount || 0) - (selectedEmi?.paidInterest || 0))}.
                  The principal ({formatCurrency((selectedEmi?.principalAmount || 0) - (selectedEmi?.paidPrincipal || 0))}) is deferred — it will be added to the next EMI.
                </p>
              </div>
            )}

            {/* Principal Only Payment Info */}
            {paymentType === 'PRINCIPAL_ONLY' && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-semibold">Principal Only Payment</span>
                </div>
                <p className="text-xs text-red-600 mt-2">
                  Only the principal ({formatCurrency((selectedEmi?.principalAmount || 0) - (selectedEmi?.paidPrincipal || 0))}) is collected.
                  The interest ({formatCurrency((selectedEmi?.interestAmount || 0) - (selectedEmi?.paidInterest || 0))}) will be written off as Irrecoverable Debt.
                </p>
              </div>
            )}

            {/* ========================================== */}
            {/* CREDIT TYPE SELECTION - MAIN CHOICE */}
            {/* ========================================== */}
            
            {/* For MIRROR loans - Credit type depends on EMI type */}
            {isMirroredLoan ? (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-blue-600" />
                  <Label className="text-blue-800 font-semibold">
                    Mirror Loan Payment
                  </Label>
                </div>

                {/* EMI Info for Mirror Loan */}
                {selectedEmi && (
                  <div className={`p-3 rounded-lg mb-3 ${isExtraEmi(selectedEmi.installmentNumber) ? 'bg-amber-100 border border-amber-300' : 'bg-green-100 border border-green-300'}`}>
                    {isExtraEmi(selectedEmi.installmentNumber) ? (
                      <div className="text-xs">
                        <div className="flex items-center gap-1 text-amber-700 font-semibold mb-1">
                          <AlertCircle className="h-3 w-3" />
                          EXTRA EMI #{selectedEmi.installmentNumber}
                        </div>
                        <div className="text-amber-600">
                          Entry: <strong>Company 3</strong> Cashbook (Extra EMI profit — recorded in Company 3 books)
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs">
                        <div className="flex items-center gap-1 text-green-700 font-semibold mb-1">
                          <CheckCircle className="h-3 w-3" />
                          EMI #{selectedEmi.installmentNumber} within Mirror Tenure
                        </div>
                        <div className="text-green-600">
                          Entry: <strong>{mirrorCompanyName || 'Mirror Company'}</strong> Cashbook
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Extra EMI - Only Personal Credit available (records in Company 3 cashbook) */}
                {selectedEmi && isExtraEmi(selectedEmi.installmentNumber) ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      className="w-full p-4 rounded-lg border-2 border-amber-500 bg-amber-50 text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-5 w-5 text-amber-600" />
                        <span className="font-semibold text-amber-800">
                          Personal Credit (Only Option for Extra EMI)
                        </span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Banknote className="h-3 w-3" />
                          <span>CASH only</span>
                        </div>
                        <div className="text-amber-600">
                          Entry: <strong>Company 3 Cashbook</strong> (extra profit goes to Company 3)
                        </div>
                        <div className="font-medium text-amber-700">
                          Current: ₹{formatCurrency(personalCredit)}
                        </div>
                      </div>
                    </button>
                    <p className="text-xs text-amber-600">
                      Extra EMIs beyond the mirror tenure are pure profit. They are recorded in <strong>Company 3&apos;s Cashbook</strong> under Personal Credit.
                    </p>
                  </div>
                ) : (
                  /* Mirror EMIs (within mirror tenure) - Company Credit only */
                  <>
                    <button
                      type="button"
                      className="w-full p-4 rounded-lg border-2 border-blue-500 bg-blue-50 text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Building className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-blue-800">
                          Company Credit (Only Option)
                        </span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Landmark className="h-3 w-3" />
                          <span>ONLINE or CASH</span>
                        </div>
                        <div className="text-blue-600">
                          Entry: {mirrorCompanyName || 'Mirror Company'}'s Books
                        </div>
                        <div className="font-medium text-blue-700">
                          Current: ₹{formatCurrency(companyCredit)}
                        </div>
                      </div>
                    </button>
                    <p className="text-xs text-blue-600 mt-2">
                      For mirror EMIs, only Company Credit is available. Entry will be recorded in Mirror Company's books.
                    </p>
                  </>
                )}
              </div>
            ) : (
              /* Normal Credit Type Selection for Non-Mirror Loans */
              <div className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-200">
                <Label className="text-slate-800 font-semibold mb-3 block">
                  <Wallet className="h-4 w-4 inline mr-2" />
                  Credit Type *
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Personal Credit Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setCreditType('PERSONAL');
                      setPaymentMode('CASH'); // Personal Credit is always CASH
                    }}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      creditType === 'PERSONAL' 
                        ? 'border-amber-500 bg-amber-50' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <User className={`h-5 w-5 ${creditType === 'PERSONAL' ? 'text-amber-600' : 'text-gray-400'}`} />
                      <span className={`font-semibold ${creditType === 'PERSONAL' ? 'text-amber-800' : 'text-gray-600'}`}>
                        Personal Credit
                      </span>
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Banknote className="h-3 w-3" />
                        <span>CASH only</span>
                      </div>
                      <div className="text-gray-500">
                        Entry: {getCashbookCompanyName(selectedEmi?.installmentNumber || 1, 'PERSONAL')} Cashbook
                      </div>
                      <div className="font-medium text-amber-700">
                        Current: ₹{formatCurrency(personalCredit)}
                      </div>
                    </div>
                  </button>

                  {/* Company Credit Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setCreditType('COMPANY');
                      // For interest/principal only payments, force CASH (no online allowed)
                      if (paymentType === 'INTEREST_ONLY' || paymentType === 'PRINCIPAL_ONLY') {
                        setPaymentMode('CASH');
                      } else {
                        setPaymentMode('CASH'); // Default to CASH (safer default)
                      }
                    }}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      creditType === 'COMPANY' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Building className={`h-5 w-5 ${creditType === 'COMPANY' ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className={`font-semibold ${creditType === 'COMPANY' ? 'text-blue-800' : 'text-gray-600'}`}>
                        Company Credit
                      </span>
                    </div>
                    <div className="text-xs space-y-1">
                      {isCompany3NonMirroredLoan ? (
                        <>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Banknote className="h-3 w-3" />
                            <span>CASH only</span>
                          </div>
                          <div className="text-gray-500">
                            Entry: {loan?.company?.name || 'Company'} Cashbook
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Landmark className="h-3 w-3" />
                            <span>ONLINE or CASH</span>
                          </div>
                          <div className="text-gray-500">
                            Entry: {getCashbookCompanyName(selectedEmi?.installmentNumber || 1, 'COMPANY')}'s Books
                          </div>
                        </>
                      )}
                      <div className="font-medium text-blue-700">
                        Current: ₹{formatCurrency(companyCredit)}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* PAYMENT MODE - BASED ON CREDIT TYPE */}
            {/* ========================================== */}
            
            {/* Personal Credit - CASH only (fixed) */}
            {creditType === 'PERSONAL' && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-amber-800 font-semibold">Payment Mode</Label>
                    <p className="text-xs text-amber-600 mt-1">
                      Personal Credit only supports CASH payment
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-lg border border-amber-300">
                    <Banknote className="h-5 w-5 text-amber-700" />
                    <span className="font-semibold text-amber-800">CASH</span>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-amber-100 rounded-lg">
                  <p className="text-xs text-amber-700">
                    <strong>Entry will be recorded in:</strong> {getCashbookCompanyName(selectedEmi?.installmentNumber || 1, 'PERSONAL')} Cashbook
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    +₹{formatCurrency(paymentAmount)} will be added to your Personal Credit
                  </p>
                </div>
              </div>
            )}

            {/* Company Credit - ONLINE or CASH (or CASH only for Company 3 non-mirrored) */}
            {creditType === 'COMPANY' && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="text-blue-800 font-semibold mb-3 block">Payment Mode *</Label>
                
                {/* Mirror loans or Company 3 non-mirrored - Show entry info */}
                {isMirroredLoan ? (
                  /* Mirror Loan - Show correct company based on EMI number */
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {/* ONLINE Option */}
                      <button
                        type="button"
                        onClick={() => setPaymentMode('ONLINE')}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          paymentMode === 'ONLINE' 
                            ? 'border-blue-500 bg-blue-100' 
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Landmark className={`h-4 w-4 ${paymentMode === 'ONLINE' ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className={`font-medium text-xs ${paymentMode === 'ONLINE' ? 'text-blue-800' : 'text-gray-600'}`}>
                            ONLINE
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Bank</p>
                      </button>

                      {/* CASH Option */}
                      <button
                        type="button"
                        onClick={() => setPaymentMode('CASH')}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          paymentMode === 'CASH' 
                            ? 'border-blue-500 bg-blue-100' 
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Banknote className={`h-4 w-4 ${paymentMode === 'CASH' ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className={`font-medium text-xs ${paymentMode === 'CASH' ? 'text-blue-800' : 'text-gray-600'}`}>
                            CASH
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Cashbook</p>
                      </button>

                      {/* SPLIT Option */}
                      <button
                        type="button"
                        onClick={() => setPaymentMode('SPLIT')}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          paymentMode === 'SPLIT'
                            ? 'border-purple-500 bg-purple-100'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Calculator className={`h-4 w-4 ${paymentMode === 'SPLIT' ? 'text-purple-600' : 'text-gray-400'}`} />
                          <span className={`font-medium text-xs ${paymentMode === 'SPLIT' ? 'text-purple-800' : 'text-gray-600'}`}>
                            SPLIT
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Cash + Online</p>
                      </button>
                    </div>

                    {/* Split inputs for mirror loan */}
                    {paymentMode === 'SPLIT' && (
                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-2">
                        <p className="text-xs font-medium text-purple-700">Split: Cash → {mirrorCompanyName || 'Mirror'} Cashbook, Online → {mirrorCompanyName || 'Mirror'} Bank</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-gray-600">Cash Amount (₹)</Label>
                            <Input type="number" value={splitCashPayment}
                              onChange={(e) => setSplitCashPayment(e.target.value)}
                              placeholder="e.g. 500" />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Online Amount (₹)</Label>
                            <Input type="number" value={splitOnlinePayment}
                              onChange={(e) => setSplitOnlinePayment(e.target.value)}
                              placeholder="e.g. 700" />
                          </div>
                        </div>
                        {(() => {
                          const sc = parseFloat(splitCashPayment) || 0;
                          const so = parseFloat(splitOnlinePayment) || 0;
                          const st = sc + so;
                          const mismatch = Math.abs(st - paymentAmount) > 1;
                          return (
                            <p className={`text-xs font-medium ${mismatch ? 'text-red-500' : 'text-green-600'}`}>
                              Total: ₹{st.toLocaleString('en-IN')} {mismatch ? `⚠ Doesn't match ₹${paymentAmount}` : '✓ Matches'}
                            </p>
                          );
                        })()}
                      </div>
                    )}

                    <div className="p-3 bg-green-100 rounded-lg border border-green-300">
                      <p className="text-xs text-green-700">
                        <strong>Entry will be recorded in:</strong> {mirrorCompanyName || 'Mirror Company'}
                        {paymentMode === 'ONLINE' ? "'s Bank Account" : paymentMode === 'SPLIT' ? "'s Cash + Bank" : "'s Cashbook"}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {paymentMode === 'SPLIT'
                          ? `+₹${formatCurrency(parseFloat(splitCashPayment) || 0)} credit (cash portion only)`
                          : `+₹${formatCurrency(paymentAmount)} will be added to Company Credit`}
                      </p>
                    </div>
                  </div>
                ) : isCompany3NonMirroredLoan ? (
                  /* Company 3 non-mirrored - CASH only (no bank account) */
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600 mt-1">
                        Company 3 has no bank account. Only CASH payment is available.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-lg border border-blue-300">
                      <Banknote className="h-5 w-5 text-blue-700" />
                      <span className="font-semibold text-blue-800">CASH</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {/* ONLINE Option - hidden for Interest Only / Principal Only payments */}
                    {paymentType !== 'INTEREST_ONLY' && paymentType !== 'PRINCIPAL_ONLY' && (
                    <button
                      type="button"
                      onClick={() => setPaymentMode('ONLINE')}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        paymentMode === 'ONLINE' 
                          ? 'border-blue-500 bg-blue-100' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Landmark className={`h-4 w-4 ${paymentMode === 'ONLINE' ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={`font-medium text-xs ${paymentMode === 'ONLINE' ? 'text-blue-800' : 'text-gray-600'}`}>
                          ONLINE
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Entry: Loan Company&apos;s Bank Account
                      </p>
                    </button>
                    )}

                    {/* CASH Option */}
                    <button
                      type="button"
                      onClick={() => setPaymentMode('CASH')}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        paymentMode === 'CASH' 
                          ? 'border-blue-500 bg-blue-100' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Banknote className={`h-4 w-4 ${paymentMode === 'CASH' ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={`font-medium text-xs ${paymentMode === 'CASH' ? 'text-blue-800' : 'text-gray-600'}`}>
                          CASH
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Entry: Loan Company&apos;s Cashbook
                      </p>
                    </button>

                    {/* SPLIT Option */}
                    <button
                      type="button"
                      onClick={() => setPaymentMode('SPLIT')}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        paymentMode === 'SPLIT' 
                          ? 'border-purple-500 bg-purple-100' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Calculator className={`h-4 w-4 ${paymentMode === 'SPLIT' ? 'text-purple-600' : 'text-gray-400'}`} />
                        <span className={`font-medium text-xs ${paymentMode === 'SPLIT' ? 'text-purple-800' : 'text-gray-600'}`}>
                          SPLIT
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Cash + Online</p>
                    </button>
                  </div>

                  {/* Split Amount Inputs */}
                  {paymentMode === 'SPLIT' && (
                    <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-2">
                      <p className="text-xs font-medium text-purple-700">Split the payment between Cash and Online</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-gray-600">Cash Amount (₹)</Label>
                          <Input type="number" value={splitCashPayment}
                            onChange={(e) => setSplitCashPayment(e.target.value)}
                            placeholder="e.g. 500" />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Online Amount (₹)</Label>
                          <Input type="number" value={splitOnlinePayment}
                            onChange={(e) => setSplitOnlinePayment(e.target.value)}
                            placeholder="e.g. 700" />
                        </div>
                      </div>
                      {/* BUG-5 fix: always show total, guard NaN with || 0 */}
                      {(() => {
                        const sc = parseFloat(splitCashPayment) || 0;
                        const so = parseFloat(splitOnlinePayment) || 0;
                        const st = sc + so;
                        const mismatch = Math.abs(st - paymentAmount) > 1;
                        return (
                          <p className={`text-xs font-medium ${mismatch ? 'text-red-500' : 'text-green-600'}`}>
                            Total: ₹{st.toLocaleString('en-IN')}{' '}
                            {mismatch ? `⚠ Doesn't match ₹${paymentAmount}` : '✓ Matches'}
                          </p>
                        );
                      })()}
                    </div>
                  )}
                  </div>
                )}
                {!isMirroredLoan && (
                  <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                    <p className="text-xs text-blue-700">
                      <strong>Entry will be recorded in:</strong> {' '}
                      {isCompany3NonMirroredLoan 
                        ? `${loan?.company?.name || 'Company'} Cashbook (no bank account)`
                        : paymentMode === 'ONLINE' 
                          ? `${loan?.company?.name || 'Loan Company'}'s Bank Account` 
                          : `${loan?.company?.name || 'Loan Company'}'s Cashbook`}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      +₹{formatCurrency(paymentAmount)} will be added to Company Credit
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Amount */}
            {paymentType === 'PARTIAL' && (
              <div>
                <Label>Payment Amount (₹) *</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
            )}

            {/* ── PENALTY UI - ALWAYS visible, ACTIVE only after EMI due date ── */}
            {!isInterestOnlyPayment && !isMultiEmiPayment && selectedEmi && loan && (
              (() => {
                const isPenaltyOverdue = isEMIOverdue(selectedEmi);
                const penaltyInfo = calculatePenaltyInfo(selectedEmi.dueDate, loan.loanAmount);
                const penaltyAmount = editedPenaltyAmount !== '' ? parseFloat(editedPenaltyAmount) || 0 : penaltyInfo.penaltyAmount;
                const netPenalty = Math.max(0, penaltyAmount - penaltyWaiver);

                return (
                  <div className={`p-4 rounded-lg border-2 space-y-3 ${isPenaltyOverdue ? 'bg-rose-50 border-rose-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className={`h-5 w-5 ${isPenaltyOverdue ? 'text-rose-600' : 'text-gray-400'}`} />
                      <span className={`font-semibold ${isPenaltyOverdue ? 'text-rose-700' : 'text-gray-500'}`}>
                        Penalty {isPenaltyOverdue ? 'for Overdue EMI' : '(Not Applicable)'}
                      </span>
                      <span className={`ml-auto px-2 py-1 text-xs font-medium rounded ${isPenaltyOverdue ? 'bg-rose-200 text-rose-800' : 'bg-gray-200 text-gray-600'}`}>
                        {isPenaltyOverdue ? `${penaltyInfo.daysOverdue} day(s) overdue` : 'Due date not passed'}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className={isPenaltyOverdue ? 'text-rose-600' : 'text-gray-400'}>Penalty Rate</span>
                        <span className={`font-medium ${isPenaltyOverdue ? 'text-rose-700' : 'text-gray-400'}`}>
                          ₹{penaltyInfo.ratePerDay}/day
                          <span className="text-xs text-gray-500 ml-1">
                            ({formatCurrency(loan.loanAmount)} loan = ₹{penaltyInfo.ratePerDay}/day)
                          </span>
                        </span>
                      </div>

                      {/* EDITABLE Penalty Amount - only when overdue */}
                      <div className="pt-2 border-t border-gray-200 mt-2">
                        <Label className={`text-sm font-medium ${isPenaltyOverdue ? 'text-rose-700' : 'text-gray-400'}`}>
                          Penalty Amount {isPenaltyOverdue ? '(Editable)' : '- Disabled until due date passes'}
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="relative flex-1">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              type="number"
                              value={isPenaltyOverdue ? (editedPenaltyAmount !== '' ? editedPenaltyAmount : penaltyInfo.penaltyAmount) : 0}
                              onChange={(e) => isPenaltyOverdue && setEditedPenaltyAmount(e.target.value)}
                              placeholder={String(penaltyInfo.penaltyAmount || 0)}
                              min="0"
                              className="pl-8"
                              disabled={!isPenaltyOverdue}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditedPenaltyAmount('')}
                            className="text-xs"
                            disabled={!isPenaltyOverdue}
                          >
                            Reset
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {isPenaltyOverdue ? (
                            <>
                              Calculated: ₹{penaltyInfo.penaltyAmount || 0} ({penaltyInfo.daysOverdue} days × ₹{penaltyInfo.ratePerDay}/day)
                              {editedPenaltyAmount !== '' && <span className="text-amber-600"> - Custom value set</span>}
                            </>
                          ) : (
                            'Penalty will be calculated automatically when EMI becomes overdue'
                          )}
                        </p>
                      </div>

                      {/* Penalty Waiver Input - only when overdue */}
                      <div className="pt-2 border-t border-gray-200 mt-2">
                        <Label className={`text-sm ${isPenaltyOverdue ? 'text-rose-700' : 'text-gray-400'}`}>Waive Penalty (Optional)</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="relative flex-1">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              type="number"
                              value={isPenaltyOverdue ? penaltyWaiver : 0}
                              onChange={(e) => isPenaltyOverdue && setPenaltyWaiver(parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              min="0"
                              max={penaltyAmount}
                              className="pl-8"
                              disabled={!isPenaltyOverdue}
                            />
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            Max: ₹{formatCurrency(penaltyAmount)}
                          </span>
                        </div>
                        {penaltyWaiver > penaltyAmount && (
                          <p className="text-xs text-rose-500 mt-1">Waiver cannot exceed penalty amount</p>
                        )}
                      </div>

                      {/* Net Penalty After Waiver */}
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                        <span className={`font-medium ${isPenaltyOverdue ? 'text-rose-700' : 'text-gray-400'}`}>Penalty to Collect</span>
                        <span className={`font-bold text-lg ${isPenaltyOverdue ? 'text-rose-700' : 'text-gray-400'}`}>
                          ₹{formatCurrency(isPenaltyOverdue ? netPenalty : 0)}
                          {isPenaltyOverdue && penaltyWaiver > 0 && (
                            <span className="text-xs text-green-600 ml-1">
                              (waived: ₹{formatCurrency(penaltyWaiver)})
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Penalty uses same mode as EMI — no separate selector needed */}
                      {isPenaltyOverdue && netPenalty > 0 && (
                        <p className="text-xs text-rose-500 mt-2 italic">
                          Penalty will be collected via <strong>{paymentMode === 'ONLINE' ? 'Bank' : 'Cash'}</strong> (same as EMI payment mode)
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()
            )}

            {/* Transaction Reference */}
            <div>
              <Label>Transaction Reference</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="UTR/Transaction ID / Cheque No."
              />
            </div>

            {/* Proof Upload - Required for PERSONAL credit or non-CASH payments */}
            {(creditType === 'PERSONAL' || (creditType === 'COMPANY' && paymentMode !== 'CASH')) && (
              <div>
                <Label className="flex items-center gap-1">
                  Payment Proof *
                  <span className="text-xs text-gray-500">(Required for {creditType === 'PERSONAL' ? 'Personal Credit' : 'non-CASH payments'})</span>
                </Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    id="offline-proof-upload"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={handleProofUpload}
                  />
                  <label htmlFor="offline-proof-upload" className="cursor-pointer">
                    {proofPreview ? (
                      <img src={proofPreview} alt="Proof Preview" className="max-h-32 mx-auto rounded" />
                    ) : proofFile ? (
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <FileCheck className="h-8 w-8" />
                        <p>{proofFile.name}</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">Click to upload proof</p>
                        <p className="text-xs text-gray-400">Image or PDF (max 10MB)</p>
                      </>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* No proof needed message for CASH + COMPANY */}
            {paymentMode === 'CASH' && creditType === 'COMPANY' && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">No proof required for CASH payment with Company Credit</span>
                </div>
              </div>
            )}

            {/* Remarks */}
            <div>
              <Label>Remarks</Label>
              <Textarea
                value={paymentRemarks}
                onChange={(e) => setPaymentRemarks(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>

            {/* Amount Summary */}
            {(() => {
              // Calculate penalty for summary
              let summaryNetPenalty = 0;
              if (selectedEmi && loan && !isInterestOnlyPayment && !isMultiEmiPayment && isEMIOverdue(selectedEmi)) {
                const penaltyInfo = calculatePenaltyInfo(selectedEmi.dueDate, loan.loanAmount);
                const penaltyAmount = editedPenaltyAmount !== '' ? parseFloat(editedPenaltyAmount) || 0 : penaltyInfo.penaltyAmount;
                summaryNetPenalty = Math.max(0, penaltyAmount - penaltyWaiver);
              }
              const baseAmount = isInterestOnlyPayment
                ? (loan?.interestOnlyMonthlyAmount || 0)
                : paymentAmount;
              const totalAmount = baseAmount + summaryNetPenalty;

              return (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-emerald-800">EMI Amount:</span>
                    <span className="text-base font-semibold text-emerald-700">{formatCurrency(baseAmount)}</span>
                  </div>
                  {summaryNetPenalty > 0 && (
                    <>
                      <div className="flex justify-between items-center text-rose-600">
                        <span className="text-sm font-medium">Penalty:</span>
                        <span className="text-base font-semibold">+{formatCurrency(summaryNetPenalty)}</span>
                      </div>
                      <div className="border-t border-emerald-200 pt-2 flex justify-between items-center">
                        <span className="text-sm font-bold text-emerald-800">Total to Pay:</span>
                        <span className="text-lg font-bold text-emerald-700">{formatCurrency(totalAmount)}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handlePayment} disabled={processingPayment}>
              {processingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                (() => {
                  // Calculate penalty for button
                  let buttonNetPenalty = 0;
                  if (selectedEmi && loan && !isInterestOnlyPayment && !isMultiEmiPayment && isEMIOverdue(selectedEmi)) {
                    const penaltyInfo = calculatePenaltyInfo(selectedEmi.dueDate, loan.loanAmount);
                    const penaltyAmount = editedPenaltyAmount !== '' ? parseFloat(editedPenaltyAmount) || 0 : penaltyInfo.penaltyAmount;
                    buttonNetPenalty = Math.max(0, penaltyAmount - penaltyWaiver);
                  }
                  const buttonAmount = (isInterestOnlyPayment
                    ? (loan?.interestOnlyMonthlyAmount || 0)
                    : paymentAmount) + buttonNetPenalty;
                  return (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Pay {formatCurrency(buttonAmount)}
                    </>
                  );
                })()
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Loan Dialog */}
      <Dialog open={startLoanDialogOpen} onOpenChange={setStartLoanDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-purple-600" />
              Start Loan - Convert to EMI
            </DialogTitle>
            <DialogDescription>Configure loan parameters and start EMI payments.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loan && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-800">Principal:</span>
                  <span className="text-lg font-bold text-purple-900">{formatCurrency(loan.loanAmount)}</span>
                </div>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tenure (months)</Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={startTenure}
                  onChange={(e) => {
                    setStartTenure(parseInt(e.target.value) || 12);
                    setTimeout(() => fetchEmiPreview(parseInt(e.target.value) || 12, startInterestRate), 300);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Interest Rate (% p.a.)</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  step={0.25}
                  value={startInterestRate}
                  onChange={(e) => {
                    setStartInterestRate(parseFloat(e.target.value) || 12);
                    setTimeout(() => fetchEmiPreview(startTenure, parseFloat(e.target.value) || 12), 300);
                  }}
                />
              </div>
            </div>

            {emiPreview && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-emerald-800 mb-3 flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  EMI Preview
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-emerald-700">Monthly EMI:</span>
                    <span className="text-lg font-bold text-emerald-900">{formatCurrency(emiPreview.emiAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-emerald-700">Total Interest:</span>
                    <span className="text-sm font-medium text-emerald-900">{formatCurrency(emiPreview.totalInterest)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-emerald-700">Total Amount:</span>
                    <span className="text-sm font-medium text-emerald-900">{formatCurrency(emiPreview.totalAmount)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStartLoanDialogOpen(false)}>Cancel</Button>
            <Button className="bg-purple-500 hover:bg-purple-600" onClick={handleStartLoan} disabled={startingLoan}>
              {startingLoan ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start Loan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Loan?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete loan <strong>{loan?.loanNumber}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteLoan} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Loan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog - Same as Online Loans */}
      <ReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        receiptData={receiptData}
      />

      {/* Close Loan Dialog */}
      {loan && (
        <CloseLoanDialog
          open={closeLoanDialogOpen}
          onOpenChange={setCloseLoanDialogOpen}
          loanId={loan.id}
          userId={userId || ''}
          companyId={loan.company?.id}
          isOfflineLoan={true}
          onLoanClosed={() => {
            setCloseLoanDialogOpen(false);
            onPaymentSuccess?.();
            onClose();
          }}
        />
      )}

      {/* Payment History Dialog */}
      <Dialog open={paymentHistoryDialogOpen} onOpenChange={setPaymentHistoryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-600" />
              EMI Payment Details
            </DialogTitle>
            <DialogDescription>
              {selectedEmiForHistory && (
                <span>
                  EMI #{selectedEmiForHistory.installmentNumber} • Due: {formatDate(selectedEmiForHistory.dueDate)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedEmiForHistory && (
            <div className="space-y-4">
              {/* EMI Summary */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Total EMI</span>
                    <p className="font-bold text-lg">{formatCurrency(selectedEmiForHistory.totalAmount)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Status</span>
                    <p className="font-medium">
                      <Badge className={getEMIStatusColor(selectedEmiForHistory.paymentStatus)}>
                        {selectedEmiForHistory.paymentStatus.replace(/_/g, ' ')}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Principal</span>
                    <p className="font-medium">{formatCurrency(selectedEmiForHistory.principalAmount)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Interest</span>
                    <p className="font-medium">{formatCurrency(selectedEmiForHistory.interestAmount)}</p>
                  </div>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                <h4 className="font-medium text-emerald-800 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Payment Summary
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Amount Paid</span>
                    <span className="font-bold text-emerald-900">{formatCurrency(selectedEmiForHistory.paidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600">Principal Paid</span>
                    <span>{formatCurrency(selectedEmiForHistory.paidPrincipal || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600">Interest Paid</span>
                    <span>{formatCurrency(selectedEmiForHistory.paidInterest || 0)}</span>
                  </div>
                  {selectedEmiForHistory.paymentStatus === 'PARTIALLY_PAID' && (
                    <div className="flex justify-between text-sm pt-2 border-t border-emerald-300">
                      <span className="text-amber-600 font-medium">Remaining</span>
                      <span className="text-amber-700 font-bold">
                        {formatCurrency(selectedEmiForHistory.totalAmount - (selectedEmiForHistory.paidAmount || 0))}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Transaction Details */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Transaction Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-600">Payment Mode</span>
                    <span className="font-medium flex items-center gap-1">
                      {selectedEmiForHistory.paymentMode === 'CASH' ? (
                        <><Banknote className="h-4 w-4 text-emerald-600" /> CASH</>
                      ) : selectedEmiForHistory.paymentMode === 'ONLINE' ? (
                        <><Landmark className="h-4 w-4 text-blue-600" /> ONLINE</>
                      ) : selectedEmiForHistory.paymentMode === 'SPLIT' ? (
                        <><Calculator className="h-4 w-4 text-purple-600" /> SPLIT</>
                      ) : (
                        selectedEmiForHistory.paymentMode || 'CASH'
                      )}
                    </span>
                  </div>
                  {selectedEmiForHistory.paymentReference && (
                    <div className="flex justify-between">
                      <span className="text-blue-600">Reference</span>
                      <span className="font-mono text-xs bg-blue-100 px-2 py-1 rounded">
                        {selectedEmiForHistory.paymentReference}
                      </span>
                    </div>
                  )}
                  {selectedEmiForHistory.paidDate && (
                    <div className="flex justify-between">
                      <span className="text-blue-600">Paid On</span>
                      <span className="font-medium">
                        {new Date(selectedEmiForHistory.paidDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                  {selectedEmiForHistory.collectedByName && (
                    <div className="flex justify-between">
                      <span className="text-blue-600">Collected By</span>
                      <span className="font-medium">{selectedEmiForHistory.collectedByName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes if any */}
              {selectedEmiForHistory.notes && (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Notes
                  </h4>
                  <p className="text-sm text-amber-700">{selectedEmiForHistory.notes}</p>
                </div>
              )}

              {/* Payment Proof if any */}
              {selectedEmiForHistory.proofUrl && (
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Payment Proof
                  </h4>
                  <div className="mt-2">
                    {selectedEmiForHistory.proofUrl.includes('application/pdf') || selectedEmiForHistory.proofUrl.toLowerCase().endsWith('.pdf') ? (
                      <div className="flex items-center gap-2">
                        <FileText className="h-8 w-8 text-red-500" />
                        <a
                          href={selectedEmiForHistory.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 underline hover:text-blue-800"
                        >
                          View PDF ↗
                        </a>
                      </div>
                    ) : (
                      <div className="relative group">
                        <img
                          src={selectedEmiForHistory.proofUrl}
                          alt="Payment Proof"
                          className="max-h-48 rounded-lg border shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        />
                        <div className="mt-2">
                          <a
                            href={selectedEmiForHistory.proofUrl.startsWith('data:') ? '#' : selectedEmiForHistory.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={selectedEmiForHistory.proofUrl.startsWith('data:') ? (e) => { e.preventDefault(); openDoc(selectedEmiForHistory.proofUrl!); } : undefined}
                            className="text-xs text-blue-500 underline hover:text-blue-700"
                          >
                            Open full size ↗
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
