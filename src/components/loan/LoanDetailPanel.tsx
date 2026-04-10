'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, FileText, Wallet, Building, Loader2, Lock, Receipt, PlayCircle, Calculator, AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

// Import modular components
import {
  LoanDetails,
  EMISchedule,
  EMIPaymentForm,
  OverviewSection,
  CustomerSection,
  DocumentsSection,
  EMISection,
  HistorySection,
  EMIPaymentDialog,
  EMIDateChangeDialog
} from './sections';
import ReceiptSection from '@/components/receipt/ReceiptSection';

interface LoanDetailPanelProps {
  loanId: string | null;
  open?: boolean;
  onClose?: () => void;
  onEMIPaid?: () => void;
  userRole?: string;
  userId?: string;
  onPaymentSuccess?: () => void;
  onLoanStarted?: () => void;
}

export default function LoanDetailPanel({ loanId, open, onClose, onEMIPaid, userRole, userId, onPaymentSuccess, onLoanStarted }: LoanDetailPanelProps) {
  const { user } = useAuth();
  const currentUserRole = userRole || user?.role || '';
  const currentUserId = userId || user?.id || '';
  const [loading, setLoading] = useState(false);
  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null);
  const [emiSchedules, setEmiSchedules] = useState<EMISchedule[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // EMI Payment State
  const [showEMIPaymentDialog, setShowEMIPaymentDialog] = useState(false);
  const [selectedEMI, setSelectedEMI] = useState<EMISchedule | null>(null);
  const [emiPaymentForm, setEmiPaymentForm] = useState<EMIPaymentForm>({
    amount: 0,
    paymentMode: 'CASH',
    paymentRef: '',
    creditType: 'PERSONAL',
    remarks: '',
    proofFile: null,
    paymentType: 'FULL',
    remainingAmount: 0,
    remainingPaymentDate: '',
    newDueDate: ''
  });
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [payingEMI, setPayingEMI] = useState(false);

  // EMI Date Change State
  const [showDateChangeDialog, setShowDateChangeDialog] = useState(false);
  const [dateChangeEMI, setDateChangeEMI] = useState<EMISchedule | null>(null);
  const [newEMIDate, setNewEMIDate] = useState('');
  const [dateChangeReason, setDateChangeReason] = useState('');
  const [changingDate, setChangingDate] = useState(false);

  // Credit info
  const [personalCredit, setPersonalCredit] = useState(0);
  const [companyCredit, setCompanyCredit] = useState(0);
  
  // Mirror loan check
  const [isMirrorLoan, setIsMirrorLoan] = useState(false);
  const [hasMirrorLoan, setHasMirrorLoan] = useState(false); // Whether this loan has a mirror loan attached
  const [mirrorCompanyInfo, setMirrorCompanyInfo] = useState<{id: string; name: string; code: string} | null>(null);

  // Start Loan State
  const [showStartLoanDialog, setShowStartLoanDialog] = useState(false);
  const [startLoanForm, setStartLoanForm] = useState({
    tenure: 12,
    interestRate: 15
  });
  const [emiPreview, setEmiPreview] = useState<{
    emiAmount: number;
    totalInterest: number;
    totalAmount: number;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [startingLoan, setStartingLoan] = useState(false);

  // Helper function for clipboard copy
  const handleCopy = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      toast({ title: 'Copied', description: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Error', description: 'Failed to copy', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (loanId) {
      fetchLoanDetails();
      fetchEMISchedules();
      fetchCreditInfo();
      checkMirrorLoan();
    }
  }, [loanId]);

  const checkMirrorLoan = async () => {
    if (!loanId) return;
    try {
      const response = await fetch(`/api/mirror-loan/check?loanId=${loanId}`);
      const data = await response.json();
      if (data.success) {
        setIsMirrorLoan(data.isMirrorLoan);
        setHasMirrorLoan(data.hasMirrorLoan || false); // Whether this loan has a mirror loan
        // Set mirror company info for payment routing
        if (data.mirrorCompany) {
          setMirrorCompanyInfo({
            id: data.mirrorCompany.id,
            name: data.mirrorCompany.name,
            code: data.mirrorCompany.code
          });
        }
      }
    } catch (error) {
      console.error('Error checking mirror loan:', error);
    }
  };

  const fetchLoanDetails = async () => {
    if (!loanId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/loan/details?loanId=${loanId}`);
      const data = await response.json();
      if (data.success && data.loan) {
        setLoanDetails(data.loan);
        if (data.loan.emiSchedules) {
          setEmiSchedules(data.loan.emiSchedules.map((s: any) => ({
            id: s.id,
            emiNumber: s.installmentNumber,
            dueDate: s.dueDate,
            emiAmount: s.totalAmount,
            principalAmount: s.principalAmount,
            interestAmount: s.interestAmount,
            outstandingPrincipal: s.outstandingPrincipal,
            status: s.paymentStatus,
            paidAmount: s.paidAmount || 0,
            paidPrincipal: s.paidPrincipal || 0,
            paidInterest: s.paidInterest || 0,
            paidDate: s.paidDate,
            paymentMode: s.paymentMode,
            paymentRef: s.paymentReference,
            proofUrl: s.proofUrl,
            lateFee: s.penaltyAmount,
            // Partial payment fields
            isPartialPayment: s.isPartialPayment || false,
            partialPaymentCount: s.partialPaymentCount || 0,
            remainingAmount: s.remainingAmount || 0,
            nextPaymentDate: s.nextPaymentDate,
            // Interest only fields
            isInterestOnly: s.isInterestOnly || false,
            principalDeferred: s.principalDeferred || false,
            notes: s.notes
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching loan details:', error);
      toast({ title: 'Error', description: 'Failed to fetch loan details', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEMISchedules = async (forceRefresh = false) => {
    if (!loanId) return;
    try {
      // Add timestamp to prevent caching when force refresh is requested
      const timestamp = forceRefresh ? `&t=${Date.now()}` : '';
      const response = await fetch(`/api/emi?loanId=${loanId}${timestamp}`);
      const data = await response.json();
      if (data.success) {
        // Map API response to frontend EMISchedule type
        setEmiSchedules((data.schedules || []).map((s: any) => ({
          id: s.id,
          emiNumber: s.installmentNumber,
          dueDate: s.dueDate,
          emiAmount: s.totalAmount,
          principalAmount: s.principalAmount,
          interestAmount: s.interestAmount,
          outstandingPrincipal: s.outstandingPrincipal,
          status: s.paymentStatus,
          paidAmount: s.paidAmount || 0,
          paidPrincipal: s.paidPrincipal || 0,
          paidInterest: s.paidInterest || 0,
          paidDate: s.paidDate,
          paymentMode: s.paymentMode,
          paymentRef: s.paymentReference,
          proofUrl: s.proofUrl,
          lateFee: s.penaltyAmount,
          // Partial payment fields
          isPartialPayment: s.isPartialPayment || false,
          partialPaymentCount: s.partialPaymentCount || 0,
          remainingAmount: s.remainingAmount || 0,
          nextPaymentDate: s.nextPaymentDate,
          // Interest only fields
          isInterestOnly: s.isInterestOnly || false,
          principalDeferred: s.principalDeferred || false,
          notes: s.notes
        })));
      }
    } catch (error) {
      console.error('Error fetching EMI schedules:', error);
    }
  };

  const fetchCreditInfo = async () => {
    if (!currentUserId) return;
    try {
      const response = await fetch(`/api/credit?userId=${currentUserId}`);
      const data = await response.json();
      if (data.success) {
        setPersonalCredit(data.user?.personalCredit || 0);
        setCompanyCredit(data.user?.companyCredit || 0);
      }
    } catch (error) {
      console.error('Error fetching credit info:', error);
    }
  };

  // Start Loan Functions
  const openStartLoanDialog = async () => {
    if (!loanId) return;
    
    setLoadingPreview(true);
    setShowStartLoanDialog(true);

    try {
      // Fetch loan details and EMI preview
      const response = await fetch(`/api/loan/start?loanId=${loanId}`);
      const data = await response.json();

      if (data.success) {
        setStartLoanForm({
          tenure: data.preview.tenure,
          interestRate: data.preview.interestRate
        });
        setEmiPreview({
          emiAmount: data.preview.emiAmount,
          totalInterest: data.preview.totalInterest,
          totalAmount: data.preview.totalAmount
        });
      }
    } catch (error) {
      console.error('Error fetching loan preview:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch loan details',
        variant: 'destructive'
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  // Calculate EMI preview when form changes
  const calculateEmiPreview = async () => {
    if (!loanId) return;

    setLoadingPreview(true);
    try {
      const response = await fetch(
        `/api/loan/start?loanId=${loanId}&tenure=${startLoanForm.tenure}&interestRate=${startLoanForm.interestRate}`
      );
      const data = await response.json();

      if (data.success) {
        setEmiPreview({
          emiAmount: data.preview.emiAmount,
          totalInterest: data.preview.totalInterest,
          totalAmount: data.preview.totalAmount
        });
      }
    } catch (error) {
      console.error('Error calculating EMI preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Handle Start Loan
  const handleStartLoan = async () => {
    if (!loanId) return;

    setStartingLoan(true);
    try {
      const response = await fetch('/api/loan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId,
          tenure: startLoanForm.tenure,
          interestRate: startLoanForm.interestRate,
          startedBy: currentUserId
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Loan Started Successfully',
          description: data.message
        });
        setShowStartLoanDialog(false);
        // Refresh loan details
        fetchLoanDetails();
        fetchEMISchedules();
        if (onLoanStarted) onLoanStarted();
        if (onEMIPaid) onEMIPaid();
      } else {
        throw new Error(data.error || 'Failed to start loan');
      }
    } catch (error) {
      console.error('Error starting loan:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start loan',
        variant: 'destructive'
      });
    } finally {
      setStartingLoan(false);
    }
  };

  // Handle form change with debounced EMI calculation
  const handleStartFormChange = (field: 'tenure' | 'interestRate', value: number) => {
    setStartLoanForm(prev => ({ ...prev, [field]: value }));
    // Debounce EMI calculation
    setTimeout(() => calculateEmiPreview(), 300);
  };

  const openEMIPaymentDialog = (emi: EMISchedule) => {
    setSelectedEMI(emi);
    // Calculate remaining amount (total - already paid)
    const remainingAmount = emi.emiAmount - (emi.paidAmount || 0);
    setEmiPaymentForm({
      amount: remainingAmount + (emi.lateFee || 0), // Default to remaining amount
      paymentMode: 'CASH',
      paymentRef: '',
      creditType: 'COMPANY',
      remarks: '',
      proofFile: null,
      paymentType: 'FULL',
      remainingAmount: 0,
      remainingPaymentDate: '',
      newDueDate: ''
    });
    setProofPreview(null);
    setShowEMIPaymentDialog(true);
  };

  // Multi-EMI Payment
  const openMultiEMIPaymentDialog = (emis: EMISchedule[]) => {
    if (emis.length === 0) return;
    // Calculate total amount
    const totalAmount = emis.reduce((sum, emi) => sum + (emi.emiAmount - (emi.paidAmount || 0)), 0);
    setSelectedEMI(emis[0]); // Use first EMI for reference
    setEmiPaymentForm({
      amount: totalAmount,
      paymentMode: 'CASH',
      paymentRef: '',
      creditType: 'COMPANY',
      remarks: `Payment for ${emis.length} EMIs: #${emis.map(e => e.emiNumber).join(', #')}`,
      proofFile: null,
      paymentType: 'FULL',
      remainingAmount: 0,
      remainingPaymentDate: '',
      newDueDate: ''
    });
    setProofPreview(null);
    setShowEMIPaymentDialog(true);
  };

  const openDateChangeDialog = (emi: EMISchedule) => {
    setDateChangeEMI(emi);
    setNewEMIDate(emi.dueDate ? new Date(emi.dueDate).toISOString().split('T')[0] : '');
    setDateChangeReason('');
    setShowDateChangeDialog(true);
  };

  const handleEMIDateChange = async () => {
    if (!dateChangeEMI || !newEMIDate) {
      toast({ title: 'Error', description: 'Please select a new date', variant: 'destructive' });
      return;
    }

    if (!dateChangeReason.trim()) {
      toast({ title: 'Error', description: 'Please provide a reason for the date change', variant: 'destructive' });
      return;
    }

    setChangingDate(true);
    try {
      const response = await fetch('/api/emi/change-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emiId: dateChangeEMI.id,
          newDueDate: newEMIDate,
          reason: dateChangeReason,
          userId: user?.id
        })
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 500));
        throw new Error('Server returned an invalid response. Please try again.');
      }

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({ 
          title: 'Success', 
          description: data.message || 'EMI date updated successfully'
        });
        setShowDateChangeDialog(false);
        // Refresh data
        fetchEMISchedules();
        fetchLoanDetails();
        if (onEMIPaid) onEMIPaid();
      } else {
        throw new Error(data.error || data.details || 'Failed to update date');
      }
    } catch (error) {
      console.error('Error changing EMI date:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to update EMI date', 
        variant: 'destructive' 
      });
    } finally {
      setChangingDate(false);
    }
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'File Too Large', description: 'Maximum file size is 10MB', variant: 'destructive' });
        return;
      }
      setEmiPaymentForm({ ...emiPaymentForm, proofFile: file });
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setProofPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setProofPreview(null);
      }
    }
  };

  const handleEMIPayment = async () => {
    if (!selectedEMI || !loanDetails) return;
    
    const actualCreditType = emiPaymentForm.paymentMode === 'CASH' ? 'COMPANY' : 'PERSONAL';
    const requiresProof = actualCreditType === 'PERSONAL';
    
    if (requiresProof && !emiPaymentForm.proofFile) {
      toast({ 
        title: 'Proof Required', 
        description: 'Personal credit transactions require payment proof. Please upload a proof document.', 
        variant: 'destructive' 
      });
      return;
    }

    if (emiPaymentForm.paymentType === 'PARTIAL') {
      if (!emiPaymentForm.remainingPaymentDate) {
        toast({ title: 'Date Required', description: 'Please select when the remaining amount will be paid', variant: 'destructive' });
        return;
      }
      if (emiPaymentForm.remainingAmount <= 0) {
        toast({ title: 'Invalid Amount', description: 'Remaining amount must be greater than 0', variant: 'destructive' });
        return;
      }
    }

    setPayingEMI(true);
    try {
      let proofUrl = '';
      
      // Try to upload proof but don't fail if upload fails
      if (requiresProof && emiPaymentForm.proofFile) {
        try {
          const proofFormData = new FormData();
          proofFormData.append('file', emiPaymentForm.proofFile);
          proofFormData.append('documentType', 'emi_proof');
          proofFormData.append('loanId', loanDetails.id);
          proofFormData.append('uploadedBy', user?.id || '');

          const uploadResponse = await fetch('/api/upload/document', {
            method: 'POST',
            body: proofFormData
          });
          const uploadData = await uploadResponse.json();
          
          if (uploadData.success && uploadData.url) {
            proofUrl = uploadData.url;
            console.log('[EMI Payment] Proof uploaded:', proofUrl);
          } else {
            console.log('[EMI Payment] Proof upload returned no URL, continuing without proof');
          }
        } catch (uploadError) {
          console.error('[EMI Payment] Proof upload failed, continuing without proof:', uploadError);
          // Continue without proof - don't block the payment
        }
      }

      const response = await fetch('/api/emi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emiId: selectedEMI.id,
          loanId: loanDetails.id,
          paidAmount: emiPaymentForm.amount,
          paymentMode: emiPaymentForm.paymentMode,
          paymentRef: emiPaymentForm.paymentRef,
          creditType: emiPaymentForm.creditType,
          remarks: emiPaymentForm.remarks,
          proofUrl: proofUrl,
          userId: user?.id,
          paymentType: emiPaymentForm.paymentType,
          remainingAmount: emiPaymentForm.remainingAmount,
          remainingPaymentDate: emiPaymentForm.remainingPaymentDate,
          interestAmount: emiPaymentForm.paymentType === 'INTEREST_ONLY' ? selectedEMI.interestAmount : 0
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        let description = `₹${formatCurrency(emiPaymentForm.amount)} collected for EMI #${selectedEMI.emiNumber}. Your ${actualCreditType.toLowerCase()} credit increased.`;
        
        if (emiPaymentForm.paymentType === 'PARTIAL') {
          description += ` Remaining ₹${formatCurrency(emiPaymentForm.remainingAmount)} due on ${formatCurrency(new Date(emiPaymentForm.remainingPaymentDate).getTime())}.`;
        } else if (emiPaymentForm.paymentType === 'INTEREST_ONLY') {
          description += ' EMI shifted to next month.';
        }
        
        toast({ 
          title: 'EMI Collected Successfully', 
          description 
        });
        setShowEMIPaymentDialog(false);
        // Force refresh all data to ensure instant reflection
        fetchEMISchedules(true);
        fetchLoanDetails();
        fetchCreditInfo();
        if (onEMIPaid) onEMIPaid();
        if (onPaymentSuccess) onPaymentSuccess();
      } else {
        throw new Error(data.error || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Error processing EMI payment:', error);
      toast({ 
        title: 'Payment Failed', 
        description: error instanceof Error ? error.message : 'Failed to process EMI payment', 
        variant: 'destructive' 
      });
    } finally {
      setPayingEMI(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      PENDING: { className: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      PAID: { className: 'bg-green-100 text-green-700', label: 'Paid' },
      OVERDUE: { className: 'bg-red-100 text-red-700', label: 'Overdue' },
      PARTIALLY_PAID: { className: 'bg-orange-100 text-orange-700', label: 'Partial' },
      ACTIVE: { className: 'bg-green-100 text-green-700', label: 'Active' },
      ACTIVE_INTEREST_ONLY: { className: 'bg-amber-100 text-amber-700', label: 'Interest Only' },
      DISBURSED: { className: 'bg-blue-100 text-blue-700', label: 'Disbursed' },
    };
    const c = config[status] || { className: 'bg-gray-100 text-gray-700', label: status };
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const shouldRender = open && loanId && loanId !== '';
  const isInterestOnlyLoan = loanDetails?.status === 'ACTIVE_INTEREST_ONLY';

  return (
    <>
    {/* Backdrop Overlay */}
    <AnimatePresence>
      {shouldRender && (
        <motion.div
          key="loan-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}
    </AnimatePresence>
    
    {/* Main Panel */}
    <AnimatePresence>
      {shouldRender && (
        <motion.div
          key={`loan-panel-${loanId || 'empty'}`}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-full md:w-[600px] lg:w-[700px] bg-white shadow-2xl z-50 flex flex-col"
        >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b text-white ${
          isInterestOnlyLoan
            ? 'bg-gradient-to-r from-amber-500 to-orange-600'
            : isMirrorLoan 
              ? 'bg-gradient-to-r from-amber-500 to-orange-600' 
              : 'bg-gradient-to-r from-emerald-600 to-teal-600'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">
                {isInterestOnlyLoan 
                  ? 'Interest-Only Loan' 
                  : isMirrorLoan 
                    ? 'Mirror Loan (Read-Only)' 
                    : 'Loan Details'}
              </h2>
              <p className="text-sm text-white/80">{loanDetails?.applicationNo || 'Loading...'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loanDetails && getStatusBadge(loanDetails.status)}
            {/* Start Loan Button for Interest-Only Loans */}
            {isInterestOnlyLoan && !isMirrorLoan && (
              <Button
                size="sm"
                className="bg-white text-amber-600 hover:bg-amber-50"
                onClick={openStartLoanDialog}
              >
                <PlayCircle className="h-4 w-4 mr-1" />
                Start Loan
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Interest-Only Warning Banner */}
        {isInterestOnlyLoan && !isMirrorLoan && (
          <div className="bg-amber-100 border-b border-amber-200 p-3">
            <div className="flex items-center gap-2 text-amber-800">
              <Calculator className="h-4 w-4" />
              <span className="text-sm font-medium">
                This loan is in INTEREST-ONLY phase. Click "Start Loan" to begin EMI payments.
              </span>
            </div>
          </div>
        )}

        {/* Mirror Loan Warning Banner */}
        {isMirrorLoan && (
          <div className="bg-amber-100 border-b border-amber-200 p-3">
            <div className="flex items-center gap-2 text-amber-800">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">
                This is a MIRROR LOAN. Payments are automatically synced from the original loan. 
                All EMI payments must be made on the original loan.
              </span>
            </div>
          </div>
        )}

        {/* Credit Info Bar */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Personal: ₹{formatCurrency(personalCredit)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Company: ₹{formatCurrency(companyCredit)}</span>
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
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="mx-4 mt-2 overflow-x-auto no-scrollbar">
                <TabsList className="inline-flex min-w-full bg-gray-100 p-1 rounded-lg">
                  <TabsTrigger value="overview" className="flex-1 text-xs data-[state=active]:bg-white whitespace-nowrap">Overview</TabsTrigger>
                  <TabsTrigger value="customer" className="flex-1 text-xs data-[state=active]:bg-white whitespace-nowrap">Customer</TabsTrigger>
                  <TabsTrigger value="documents" className="flex-1 text-xs data-[state=active]:bg-white whitespace-nowrap">Documents</TabsTrigger>
                  <TabsTrigger value="emi" className="flex-1 text-xs data-[state=active]:bg-white whitespace-nowrap">EMI</TabsTrigger>
                  {isMirrorLoan && (
                    <TabsTrigger value="receipt" className="flex-1 text-xs data-[state=active]:bg-white whitespace-nowrap">Receipt</TabsTrigger>
                  )}
                  <TabsTrigger value="form" className="flex-1 text-xs data-[state=active]:bg-white whitespace-nowrap">Form</TabsTrigger>
                  <TabsTrigger value="history" className="flex-1 text-xs data-[state=active]:bg-white whitespace-nowrap">History</TabsTrigger>
                </TabsList>
              </div>

              {/* Scrollable Content Container */}
              <div className="flex-1 overflow-y-auto mt-2">
                {/* Overview Tab */}
                <TabsContent value="overview" className="p-4 space-y-4 m-0" forceMount hidden={activeTab !== 'overview'}>
                  <OverviewSection loanDetails={loanDetails} />
                </TabsContent>

                {/* Customer Tab */}
                <TabsContent value="customer" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
                  <CustomerSection loanDetails={loanDetails} onCopy={handleCopy} />
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="flex-1 overflow-y-auto p-4 m-0">
                  <DocumentsSection loanDetails={loanDetails} />
                </TabsContent>

                {/* EMI Tab */}
                <TabsContent value="emi" className="p-4 m-0">
                  <EMISection 
                    emiSchedules={emiSchedules}
                    currentUserRole={currentUserRole}
                    currentUserId={currentUserId}
                    loanApplicationId={loanDetails?.id || ''}
                    companyId={loanDetails?.company?.id}
                    onPayEMI={openEMIPaymentDialog}
                    onPayMultiEMI={openMultiEMIPaymentDialog}
                    onChangeDate={openDateChangeDialog}
                    isMirrorLoan={isMirrorLoan}
                    hasMirrorLoan={hasMirrorLoan}
                  />
                </TabsContent>

                {/* Receipt Tab - Only for Mirror Loans */}
                {isMirrorLoan && (
                  <TabsContent value="receipt" className="p-4 m-0">
                    <ReceiptSection
                      loanDetails={loanDetails}
                      emiSchedules={emiSchedules}
                    />
                  </TabsContent>
                )}

                {/* Form Tab - Placeholder */}
                <TabsContent value="form" className="p-4 m-0">
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>Form details coming soon...</p>
                  </div>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="p-4 m-0">
                  <HistorySection loanDetails={loanDetails} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </motion.div>
      )}
    </AnimatePresence>

    {/* EMI Payment Dialog */}
    <EMIPaymentDialog
      open={showEMIPaymentDialog}
      onOpenChange={setShowEMIPaymentDialog}
      selectedEMI={selectedEMI}
      emiPaymentForm={emiPaymentForm}
      setEmiPaymentForm={setEmiPaymentForm}
      personalCredit={personalCredit}
      companyCredit={companyCredit}
      currentUserRole={currentUserRole}
      proofPreview={proofPreview}
      payingEMI={payingEMI}
      onProofUpload={handleProofUpload}
      onPay={handleEMIPayment}
      hasMirrorLoan={hasMirrorLoan}
      mirrorCompany={mirrorCompanyInfo}
      originalCompanyName={loanDetails?.company?.name || 'Company 3'}
    />

    {/* EMI Date Change Dialog */}
    <EMIDateChangeDialog
      open={showDateChangeDialog}
      onOpenChange={setShowDateChangeDialog}
      dateChangeEMI={dateChangeEMI}
      newEMIDate={newEMIDate}
      setNewEMIDate={setNewEMIDate}
      dateChangeReason={dateChangeReason}
      setDateChangeReason={setDateChangeReason}
      changingDate={changingDate}
      onChangeDate={handleEMIDateChange}
    />

    {/* Start Loan Dialog */}
    <Dialog open={showStartLoanDialog} onOpenChange={setShowStartLoanDialog}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-amber-600" />
            Start Loan - Convert to EMI
          </DialogTitle>
          <DialogDescription>
            Configure the loan parameters and start EMI payments.
          </DialogDescription>
        </DialogHeader>

        {loadingPreview ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Loan Info */}
            {loanDetails && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-amber-800">Loan ID:</span>
                  <span className="text-sm text-amber-900">{loanDetails.applicationNo}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-amber-800">Customer:</span>
                  <span className="text-sm text-amber-900">{loanDetails.customer?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-amber-800">Principal Amount:</span>
                  <span className="text-lg font-bold text-amber-900">
                    {formatCurrency(loanDetails.sessionForm?.approvedAmount || loanDetails.requestedAmount || 0)}
                  </span>
                </div>
              </div>
            )}

            <Separator />

            {/* Editable Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenure">Tenure (months)</Label>
                <Input
                  id="tenure"
                  type="number"
                  min={1}
                  max={120}
                  value={startLoanForm.tenure}
                  onChange={(e) => handleStartFormChange('tenure', parseInt(e.target.value) || 12)}
                />
                <p className="text-xs text-gray-500">Range: 1-120 months</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="interestRate">Interest Rate (% p.a.)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  min={1}
                  max={50}
                  step={0.25}
                  value={startLoanForm.interestRate}
                  onChange={(e) => handleStartFormChange('interestRate', parseFloat(e.target.value) || 15)}
                />
                <p className="text-xs text-gray-500">Range: 1-50%</p>
              </div>
            </div>

            <Separator />

            {/* EMI Preview */}
            {emiPreview && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-emerald-800 mb-3 flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  EMI Preview
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-emerald-700">Monthly EMI:</span>
                    <span className="text-xl font-bold text-emerald-900">
                      {formatCurrency(emiPreview.emiAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-emerald-700">Total Interest:</span>
                    <span className="text-sm font-medium text-emerald-900">
                      {formatCurrency(emiPreview.totalInterest)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-emerald-700">Total Amount:</span>
                    <span className="text-sm font-medium text-emerald-900">
                      {formatCurrency(emiPreview.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-800">
                Starting the loan will create EMI schedules based on the above parameters. 
                This action cannot be undone.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowStartLoanDialog(false)}
            disabled={startingLoan}
          >
            Cancel
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700"
            onClick={handleStartLoan}
            disabled={startingLoan || loadingPreview}
          >
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
  </>
  );
}
