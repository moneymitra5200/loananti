'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, FileText, Wallet, Building, Loader2, Lock, Receipt, PlayCircle, Calculator, AlertCircle, Trash2, Calendar, IndianRupee,
  Pencil, Save
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
import { Textarea } from '@/components/ui/textarea';

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
  InterestOnlyEMISection,
  EMIPaymentDialog,
  EMIDateChangeDialog,
  FormSection
} from './sections';
import ReceiptSection from '@/components/receipt/ReceiptSection';
import CloseLoanDialog from '@/components/shared/CloseLoanDialog'; // FIX-03

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
    newDueDate: '',
    penaltyWaiver: 0
  });
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [payingEMI, setPayingEMI] = useState(false);
  // Holds all EMIs for a multi-EMI bulk-payment flow
  const [pendingMultiEMIs, setPendingMultiEMIs] = useState<EMISchedule[]>([]);
  const [isInterestOnlyPayment, setIsInterestOnlyPayment] = useState(false);

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

  // Delete Loan State (SUPER_ADMIN only)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingLoan, setDeletingLoan] = useState(false);

  // FIX-03: Close Loan (Foreclosure) state
  const [showCloseLoanDialog, setShowCloseLoanDialog] = useState(false);

  // Start Loan State
  const [showStartLoanDialog, setShowStartLoanDialog] = useState(false);
  const [startBankAccounts, setStartBankAccounts] = useState<any[]>([]);
  const [startSecondaryPages, setStartSecondaryPages] = useState<any[]>([]);
  const [startIsMirrorLoan, setStartIsMirrorLoan] = useState(false);
  const [startExtraEMICount, setStartExtraEMICount] = useState(0);
  const [startLoanForm, setStartLoanForm] = useState({
    tenure: 12,
    interestRate: 15,
    processingFee: 0,
    bankAccountId: '',
    secondaryPaymentPageId: ''
  });
  const [emiPreview, setEmiPreview] = useState<{
    emiAmount: number;
    totalInterest: number;
    totalAmount: number;
    processingFee: number;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [startingLoan, setStartingLoan] = useState(false);

  // ── Edit Loan Details (customer info) ─────────────────────────────
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', phone: '', address: '', remarks: ''
  });

  const openEditDialog = () => {
    if (!loanDetails) return;
    setEditForm({
      firstName: loanDetails.firstName || '',
      lastName:  loanDetails.lastName  || '',
      phone:     loanDetails.phone     || loanDetails.customer?.phone || '',
      address:   loanDetails.address   || '',
      remarks:   (loanDetails as any).remarks || '',
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!loanDetails?.id) return;
    setEditSaving(true);
    try {
      const res = await fetch('/api/loan/details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-basic-details',
          loanId: loanDetails.id,
          userId: currentUserId,
          userRole: currentUserRole,
          ...editForm
        })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Loan Updated', description: 'Customer details saved.' });
        setShowEditDialog(false);
        fetchLoanDetails();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setEditSaving(false);
    }
  };

  // Handle Delete Loan
  const handleDeleteLoan = async () => {
    if (!loanDetails?.id || !deleteReason.trim()) return;
    setDeletingLoan(true);
    try {
      const res = await fetch(
        `/api/loan/delete?loanId=${loanDetails.id}&userId=${currentUserId}&reason=${encodeURIComponent(deleteReason)}&loanType=ONLINE`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success) {
        toast({ title: '🗑️ Loan Deleted', description: data.message });
        setShowDeleteDialog(false);
        if (onClose) onClose();
        if (onPaymentSuccess) onPaymentSuccess();
      } else {
        throw new Error(data.error || 'Failed to delete loan');
      }
    } catch (err) {
      toast({ title: 'Delete Failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setDeletingLoan(false);
    }
  };

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
      const companyId = loanDetails?.company?.id;
      if (companyId) {
        try {
          const [baRes, spRes] = await Promise.all([
            fetch(`/api/accounting/bank-accounts?companyId=${companyId}`),
            fetch('/api/secondary-payment-pages?activeOnly=true'),
          ]);
          if (baRes.ok) {
            const baData = await baRes.json();
            const accounts = baData.bankAccounts || baData || [];
            setStartBankAccounts(accounts);
            if (accounts.length > 0) {
              setStartLoanForm(prev => ({ ...prev, bankAccountId: accounts[0].id }));
            }
          }
          if (spRes.ok) {
            const spData = await spRes.json();
            setStartSecondaryPages(spData.pages || spData || []);
          }
        } catch { /* non-fatal */ }
      }

      // Fetch loan details and EMI preview
      const response = await fetch(`/api/loan/start?loanId=${loanId}`);
      const data = await response.json();

      if (data.success) {
        setStartLoanForm(prev => ({
          ...prev,
          tenure: data.preview.tenure,
          interestRate: data.preview.interestRate,
          processingFee: data.preview.processingFee || 0,
          secondaryPaymentPageId: ''
        }));
        setEmiPreview({
          emiAmount: data.preview.emiAmount,
          totalInterest: data.preview.totalInterest,
          totalAmount: data.preview.totalAmount,
          processingFee: data.preview.processingFee || 0
        });
        setStartIsMirrorLoan(data.preview.isMirrorLoan || false);
        setStartExtraEMICount(data.preview.extraEMICount || 0);
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
  const calculateEmiPreview = async (
    tenure = startLoanForm.tenure,
    interestRate = startLoanForm.interestRate
  ) => {
    if (!loanId) return;

    setLoadingPreview(true);
    try {
      const response = await fetch(
        `/api/loan/start?loanId=${loanId}&tenure=${tenure}&interestRate=${interestRate}`
      );
      const data = await response.json();

      if (data.success) {
        setEmiPreview(prev => ({
          emiAmount: data.preview.emiAmount,
          totalInterest: data.preview.totalInterest,
          totalAmount: data.preview.totalAmount,
          processingFee: data.preview.processingFee || prev?.processingFee || 0
        }));
        setStartLoanForm(prev => ({
          ...prev,
          processingFee: data.preview.processingFee || prev.processingFee
        }));
        setStartIsMirrorLoan(data.preview.isMirrorLoan || false);
        setStartExtraEMICount(data.preview.extraEMICount || 0);
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

    const startSecondaryPageRequired = !startIsMirrorLoan || (startIsMirrorLoan && startExtraEMICount > 0);
    if (startSecondaryPageRequired && !startLoanForm.secondaryPaymentPageId) {
      toast({
        title: 'Secondary Payment Page Required',
        description: 'Please select a secondary payment page to proceed.',
        variant: 'destructive'
      });
      return;
    }

    setStartingLoan(true);
    try {
      const response = await fetch('/api/loan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId,
          tenure: startLoanForm.tenure,
          interestRate: startLoanForm.interestRate,
          processingFee: startLoanForm.processingFee,
          bankAccountId: startIsMirrorLoan ? (startLoanForm.bankAccountId || null) : null,
          secondaryPaymentPageId: startLoanForm.secondaryPaymentPageId,
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
  const handleStartFormChange = (field: keyof typeof startLoanForm, value: string | number) => {
    setStartLoanForm(prev => {
      const newState = { ...prev, [field]: value };
      
      // Debounce EMI calculation
      if (field === 'tenure' || field === 'interestRate') {
        setTimeout(() => calculateEmiPreview(newState.tenure, newState.interestRate), 300);
      }
      
      return newState;
    });
  };

  const openEMIPaymentDialog = (emi: EMISchedule, isInterestOnlyPay: boolean = false) => {
    setSelectedEMI(emi);
    setPendingMultiEMIs([]); // MUST CLEAR this, otherwise previous multi-select forces FULL_EMI payment!
    setIsInterestOnlyPayment(isInterestOnlyPay);
    // Calculate remaining amount (total - already paid)
    const remainingAmount = emi.emiAmount - (emi.paidAmount || 0);
    const remainingInterest = emi.interestAmount - (emi.paidInterest || 0);
    setEmiPaymentForm({
      amount: isInterestOnlyPay ? remainingInterest : remainingAmount, // EMI amount only — penalty handled separately
      paymentMode: 'CASH',
      paymentRef: '',
      creditType: 'COMPANY',
      remarks: isInterestOnlyPay ? `Interest Only payment for EMI #${emi.emiNumber}` : '',
      proofFile: null,
      paymentType: isInterestOnlyPay ? 'INTEREST_ONLY' : 'FULL',
      remainingAmount: 0,
      remainingPaymentDate: '',
      newDueDate: '',
      penaltyWaiver: 0,
      // Reset per-EMI overrides so they don't bleed between selections
      editedPrincipal: undefined,
      editedInterest: undefined,
    });
    setProofPreview(null);
    setShowEMIPaymentDialog(true);
  };

  // Multi-EMI Payment
  const openMultiEMIPaymentDialog = (emis: EMISchedule[]) => {
    if (emis.length === 0) return;
    const totalAmount = emis.reduce((sum, emi) => sum + (emi.emiAmount - (emi.paidAmount || 0)), 0);
    setPendingMultiEMIs(emis);          // ← save all EMIs for sequential processing
    setSelectedEMI(emis[0]);             // first EMI for reference display
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
      newDueDate: '',
      penaltyWaiver: 0
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
          userId: currentUserId
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

    const actualCreditType = emiPaymentForm.creditType;

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
      // ── Determine which EMIs to pay ────────────────────────────────────
      // Multi-EMI: pay each EMI individually at its own full remaining amount.
      // Single-EMI: pay selectedEMI with whatever the form says.
      const emisToPay = pendingMultiEMIs.length > 1
        ? [...pendingMultiEMIs].sort((a, b) => a.emiNumber - b.emiNumber)  // Always pay in sequence (lowest first)
        : [selectedEMI];

      let lastError: string | null = null;
      let paidCount = 0;

      for (let i = 0; i < emisToPay.length; i++) {
        const emi = emisToPay[i];
        // FIX-24: Show progress for multi-EMI bulk payment
        if (emisToPay.length > 1) {
          toast({ title: `Paying EMI ${i + 1} of ${emisToPay.length}...`, description: `EMI #${emi.emiNumber}` });
        }

        const emiRemaining = emi.emiAmount - (emi.paidAmount || 0);
        // For multi-EMI always pay full remaining; for single EMI use form amount
        const paidAmount = emisToPay.length > 1 ? emiRemaining : emiPaymentForm.amount;

        // ── isAdvancePayment: ONLY for multi-select, ONLY for future-month EMIs ──
        // An EMI is "advance" when today's month/year < EMI due date's month/year.
        // Backend collects principal-only for such EMIs (interest not yet due).
        // Single EMI payments NEVER set this flag.
        let isAdvanceEMI = false;
        if (emisToPay.length > 1 && emi.dueDate) {
          const now = new Date();
          const due = new Date(emi.dueDate);
          isAdvanceEMI =
            now.getFullYear() < due.getFullYear() ||
            (now.getFullYear() === due.getFullYear() && now.getMonth() < due.getMonth());
        }

        // ── Build FormData for POST /api/emi/pay ──────────────────────────
        // (POST /api/emi/pay uses FormData and handles: auto-closure, mirror sync,
        //  push notifications, paidPrincipal/paidInterest tracking, processing fee)
        const formData = new FormData();
        formData.append('emiId', emi.id);
        formData.append('loanId', loanDetails.id);
        formData.append('amount', String(paidAmount));
        formData.append('paymentMode', emiPaymentForm.paymentMode || 'CASH');
        formData.append('remarks', emiPaymentForm.remarks || `EMI #${emi.emiNumber} payment`);
        formData.append('paidBy', currentUserId);
        formData.append('creditType', actualCreditType);
        formData.append('companyId', loanDetails.company?.id || '');

        // Map payment type: LoanDetailPanel uses 'FULL'/'PARTIAL'/'INTEREST_ONLY'/'PRINCIPAL_ONLY'
        // POST /api/emi/pay expects 'FULL_EMI'/'PARTIAL_PAYMENT'/'INTEREST_ONLY'/'PRINCIPAL_ONLY'
        const payTypeMap: Record<string, string> = {
          'FULL': 'FULL_EMI',
          'FULL_EMI': 'FULL_EMI',
          'PARTIAL': 'PARTIAL_PAYMENT',
          'PARTIAL_PAYMENT': 'PARTIAL_PAYMENT',
          'INTEREST_ONLY': 'INTEREST_ONLY',
          'PRINCIPAL_ONLY': 'PRINCIPAL_ONLY',
        };
        const mappedPayType = payTypeMap[emiPaymentForm.paymentType] || 'FULL_EMI';
        formData.append('paymentType', emisToPay.length > 1 ? 'FULL_EMI' : mappedPayType);

        // Send advance flag — backend uses it to collect principal-only for future-month EMIs
        if (isAdvanceEMI) {
          formData.append('isAdvancePayment', 'true');
        }

        // Partial payment fields
        if (emisToPay.length === 1 && emiPaymentForm.paymentType === 'PARTIAL') {
          formData.append('partialAmount', String(paidAmount));
          formData.append('nextPaymentDate', emiPaymentForm.remainingPaymentDate || '');
        }

        // Penalty — use auto-calculated formula if loanAmount is available, else fall back to lateFee
        const loanAmt = loanDetails?.sessionForm?.approvedAmount || loanDetails?.requestedAmount || 0;
        const overdueMs = emi.dueDate ? Date.now() - new Date(emi.dueDate).setHours(0,0,0,0) : 0;
        const daysOverdue = Math.max(0, Math.floor(overdueMs / 86400000));
        const autoPenaltyRate = Math.round(loanAmt / 1000);
        const autoPenaltyAmount = daysOverdue * autoPenaltyRate;
        const penaltyToSend = emisToPay.length === 1 ? autoPenaltyAmount : 0;
        formData.append('penaltyAmount', String(penaltyToSend));
        formData.append('penaltyWaiver', String(emisToPay.length > 1 ? 0 : (emiPaymentForm.penaltyWaiver || 0)));
        formData.append('penaltyPaymentMode', emiPaymentForm.paymentMode === 'SPLIT' ? 'CASH' : (emiPaymentForm.penaltyPaymentMode || 'CASH'));

        // Split payment
        if (emiPaymentForm.paymentMode === 'SPLIT') {
          formData.append('isSplitPayment', 'true'); // Flag for accounting route
          formData.append('splitCashAmount', String(emiPaymentForm.splitCashAmount || 0));
          formData.append('splitOnlineAmount', String(emiPaymentForm.splitOnlineAmount || 0));
        }

        // Custom interest override (single EMI only)
        if (emisToPay.length === 1 && emiPaymentForm.editedInterest !== undefined) {
          formData.append('editedInterest', String(emiPaymentForm.editedInterest));
        }

        // Proof file
        if (emiPaymentForm.proofFile) {
          formData.append('proof', emiPaymentForm.proofFile);
        }

        if (emiPaymentForm.secondaryPaymentPageId) {
          formData.append('secondaryPaymentPageId', emiPaymentForm.secondaryPaymentPageId);
        }

        const response = await fetch('/api/emi/pay', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (response.ok && data.success) {
          paidCount++;
          // Warn if accounting entry failed (payment recorded but no journal/cashbook entry)
          if (!data.accountingOk && data.accountingWarnings?.length > 0) {
            setTimeout(() => {
              toast({
                title: '⚠️ Accounting Entry Incomplete',
                description: `EMI #${emi.emiNumber} paid but accounting failed: ${data.accountingWarnings[0]}. Contact admin.`,
                variant: 'destructive',
              });
            }, 600);
          }
        } else {
          lastError = data.message || data.error || `Failed to process EMI #${emi.emiNumber}`;
          console.error(`[Multi-EMI] Failed for EMI #${emi.emiNumber}:`, lastError);
          // Stop on first failure to preserve sequential payment integrity
          break;
        }
      }

      if (paidCount > 0) {
        const desc = emisToPay.length > 1
          ? `${paidCount}/${emisToPay.length} EMIs paid successfully.${lastError ? ` (${lastError})` : ''}`
          : `₹${formatCurrency(emiPaymentForm.amount)} collected for EMI #${selectedEMI.emiNumber}.`;
        toast({ title: 'EMI Collected Successfully', description: desc });
        setPendingMultiEMIs([]);  // reset multi-EMI list
        setShowEMIPaymentDialog(false);
        fetchEMISchedules(true);
        fetchLoanDetails();
        fetchCreditInfo();
        window.dispatchEvent(new CustomEvent('credit-updated'));
        if (onEMIPaid) onEMIPaid();
        if (onPaymentSuccess) onPaymentSuccess();
      } else {
        throw new Error(lastError || 'All payments failed');
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
      CLOSED: { className: 'bg-gray-200 text-gray-700 font-semibold', label: 'Closed ✓' },
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
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b text-white gap-4 ${
          isInterestOnlyLoan
            ? 'bg-gradient-to-r from-amber-500 to-orange-600'
            : isMirrorLoan 
              ? 'bg-gradient-to-r from-amber-500 to-orange-600' 
              : 'bg-gradient-to-r from-emerald-600 to-teal-600'
        }`}>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg flex items-center gap-2 flex-wrap">
                  {isInterestOnlyLoan 
                    ? 'Interest-Only Loan' 
                    : isMirrorLoan 
                      ? 'Mirror Loan (Read-Only)' 
                      : 'Online Loan Details'}
                  {/* Mode indicator */}
                  {!isMirrorLoan && !isInterestOnlyLoan && (
                    <span className="text-xs bg-white/20 border border-white/30 px-2 py-0.5 rounded-full font-normal shrink-0">
                      🌐 ONLINE MODE
                    </span>
                  )}
                </h2>
                <p className="text-sm text-white/80">{loanDetails?.applicationNo || 'Loading...'}</p>
              </div>
            </div>
            {/* Close button for mobile when header wraps */}
            <Button variant="ghost" size="icon" onClick={onClose} className="sm:hidden text-white hover:bg-white/20 shrink-0">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            {loanDetails && getStatusBadge(loanDetails.status)}
            {/* Start Loan & Pay Interest Buttons for Interest-Only Loans */}
            {isInterestOnlyLoan && !isMirrorLoan && (
              <>
                {currentUserRole !== 'ACCOUNTANT' && (
                  <Button
                    size="sm"
                    className="bg-amber-500 text-white hover:bg-amber-600 border border-amber-400"
                    onClick={() => {
                      const pendingInterestEMI = emiSchedules
                        .sort((a, b) => a.emiNumber - b.emiNumber)
                        .find(e => e.status === 'PENDING' && e.isInterestOnly);
                      if (pendingInterestEMI) {
                        openEMIPaymentDialog(pendingInterestEMI, true);
                      } else {
                        toast({ title: 'No Pending Interest EMI', description: 'There is no pending monthly interest to pay.', variant: 'default' });
                      }
                    }}
                  >
                    <IndianRupee className="h-4 w-4 mr-1" />
                    Pay Monthly Interest
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-white text-amber-600 hover:bg-amber-50"
                  onClick={openStartLoanDialog}
                >
                  <PlayCircle className="h-4 w-4 mr-1" />
                  Start Loan
                </Button>
              </>
            )}
            {/* Close Loan button — SA and Cashier on active loans */}
            {(currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'CASHIER') &&
             !isMirrorLoan && loanDetails &&
             ['ACTIVE','DISBURSED','ACTIVE_INTEREST_ONLY'].includes(loanDetails.status) && (
              <Button
                size="sm"
                className="bg-red-500/80 text-white hover:bg-red-600/90 border border-red-300/30"
                onClick={() => setShowCloseLoanDialog(true)}
              >
                <Calculator className="h-4 w-4 mr-1" /> Close Loan
              </Button>
            )}
            {/* Global Change Date Button — Available for ACTIVE, DISBURSED, and ACTIVE_INTEREST_ONLY loans */}
            {!isMirrorLoan && loanDetails && ['ACTIVE','DISBURSED','ACTIVE_INTEREST_ONLY'].includes(loanDetails.status) && currentUserRole !== 'ACCOUNTANT' &&
             emiSchedules.some(e => e.status !== 'PAID' && e.status !== 'INTEREST_ONLY_PAID') && (
              <Button
                size="sm"
                className="bg-white/20 text-white hover:bg-white/30 border border-white/30"
                onClick={() => {
                  const firstPending = [...emiSchedules].sort((a,b) => a.emiNumber - b.emiNumber).find(e => e.status !== 'PAID' && e.status !== 'INTEREST_ONLY_PAID');
                  if (firstPending) {
                    openDateChangeDialog(firstPending);
                  }
                }}
              >
                <Calendar className="h-4 w-4 mr-1" /> Change Date
              </Button>
            )}
            {/* Edit button — hidden for mirror loans */}
            {!isMirrorLoan && loanDetails && (currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'CASHIER' || currentUserRole === 'STAFF' || currentUserRole === 'ADMIN' || currentUserRole === 'COMPANY') && (
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 shrink-0" onClick={openEditDialog} title="Edit loan details">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {/* Delete Loan - SUPER_ADMIN, ADMIN, COMPANY, CASHIER, STAFF */}
            {currentUserRole !== 'ACCOUNTANT' && !isMirrorLoan && loanDetails && (
              <Button
                size="sm"
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white gap-1 font-medium shadow-sm shrink-0"
                onClick={() => setShowDeleteDialog(true)}
                title="Delete this loan and all associated entries"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Loan</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="hidden sm:flex text-white hover:bg-white/20 shrink-0">
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
                  <DocumentsSection loanDetails={loanDetails} onRefresh={fetchLoanDetails} />
                </TabsContent>

                {/* EMI Tab */}
                <TabsContent value="emi" className="p-4 m-0">
                  {isInterestOnlyLoan && loanDetails ? (
                    <InterestOnlyEMISection
                      loanDetails={loanDetails}
                      emiSchedules={emiSchedules}
                      currentUserRole={currentUserRole}
                      onPayEMI={openEMIPaymentDialog}
                      isMirrorLoan={isMirrorLoan}
                    />
                  ) : (
                    <EMISection 
                      emiSchedules={emiSchedules}
                      currentUserRole={currentUserRole}
                      currentUserId={currentUserId}
                      loanApplicationId={loanDetails?.id || ''}
                      companyId={loanDetails?.company?.id}
                      loanAmount={loanDetails?.sessionForm?.approvedAmount || loanDetails?.requestedAmount || 0}
                      onPayEMI={openEMIPaymentDialog}
                      onPayMultiEMI={openMultiEMIPaymentDialog}
                      onChangeDate={openDateChangeDialog}
                      isMirrorLoan={isMirrorLoan}
                      hasMirrorLoan={hasMirrorLoan}
                    />
                  )}
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

                {/* Form Tab - Displays Raw Application Data & Signatures */}
                <TabsContent value="form" className="p-4 m-0">
                  <FormSection loanDetails={loanDetails} />
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
      onOpenChange={(isOpen) => {
        setShowEMIPaymentDialog(isOpen);
        if (!isOpen) {
          setIsInterestOnlyPayment(false);
        }
      }}
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
      originalCompanyName={loanDetails?.company?.name || 'Your Company'}
      loanAmount={loanDetails?.sessionForm?.approvedAmount || loanDetails?.requestedAmount || 0}
      isInterestOnlyPayment={isInterestOnlyPayment}
      emiSchedules={loanDetails?.emiSchedules || []}
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

            {/* Accounting Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Processing Fee
                  {startIsMirrorLoan && emiPreview?.processingFee ? (
                    <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      Auto-calculated: {formatCurrency(emiPreview.processingFee)} (original − mirror EMI diff)
                    </span>
                  ) : null}
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">₹</span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    className={`pl-8 ${startIsMirrorLoan ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                    value={startLoanForm.processingFee}
                    onChange={(e) => handleStartFormChange('processingFee', parseFloat(e.target.value) || 0)}
                    readOnly={startIsMirrorLoan}
                  />
                </div>
              </div>

              {startBankAccounts.length > 0 && startIsMirrorLoan && (
                <div className="space-y-2">
                  <Label>Processing Fee Payment To</Label>
                  <select
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={startLoanForm.bankAccountId}
                    onChange={(e) => handleStartFormChange('bankAccountId', e.target.value)}
                  >
                    <option value="">Cash In Hand</option>
                    {startBankAccounts.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountNumber}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <Separator />

            {startExtraEMICount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="text-sm font-semibold text-blue-800">Extra EMIs Applicable</h5>
                  <p className="text-xs text-blue-700 mt-0.5">
                    This loan has <strong>{startExtraEMICount}</strong> extra EMI(s) at the end of the tenure to cover differences.
                  </p>
                </div>
              </div>
            )}

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

            {/* Secondary Payment Page Selection */}
            {(() => {
              const startSecondaryPageRequired = !startIsMirrorLoan || (startIsMirrorLoan && startExtraEMICount > 0);
              return (startSecondaryPageRequired || startSecondaryPages.length > 0) && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-sm font-medium">
                    {startSecondaryPageRequired
                      ? (!startIsMirrorLoan
                          ? "Secondary Payment Page for EMI Payments"
                          : "Secondary Payment Page for Extra EMI Payments")
                      : "Secondary Payment Page (Optional)"}
                    {startSecondaryPageRequired && <span className="text-red-500">*</span>}
                  </Label>
                  {startSecondaryPages.length > 0 ? (
                    <select
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={startLoanForm.secondaryPaymentPageId}
                      onChange={(e) => handleStartFormChange('secondaryPaymentPageId', e.target.value)}
                    >
                      <option value="">Select Payment Page</option>
                      {startSecondaryPages.map((page: any) => (
                        <option key={page.id} value={page.id}>
                          {page.name} ({page.upiId || 'No UPI'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs">
                      ⚠️ No secondary payment pages available. Please create a secondary payment page in the admin settings first.
                    </div>
                  )}
                  {startSecondaryPageRequired && !startLoanForm.secondaryPaymentPageId && (
                    <p className="text-xs text-red-500">Please select a secondary payment page to proceed.</p>
                  )}
                </div>
              );
            })()}

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
            disabled={
              startingLoan ||
              loadingPreview ||
              ((!startIsMirrorLoan || (startIsMirrorLoan && startExtraEMICount > 0)) && !startLoanForm.secondaryPaymentPageId)
            }
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

    {/* ── Delete Loan Confirmation Dialog (SUPER_ADMIN only) ──────────────── */}
    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <Trash2 className="h-5 w-5" /> Permanently Delete Loan
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            This will permanently delete <strong>{loanDetails?.applicationNo}</strong> for{' '}
            <strong>{loanDetails?.customer?.name || 'this customer'}</strong>, along with ALL EMIs,
            payments, accounting entries, and mirror loans. This <strong>cannot be undone</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-800 font-medium">⚠️ What will be deleted:</p>
            <ul className="text-xs text-red-700 mt-1 space-y-0.5 list-disc list-inside">
              <li>All EMI schedules &amp; payment records</li>
              <li>All accounting entries (cashbook, bank)</li>
              <li>Mirror loan (if any)</li>
              <li>Documents, workflow logs, audit trail</li>
            </ul>
          </div>
          <div>
            <Label htmlFor="deleteReason" className="text-sm font-medium">Reason for Deletion *</Label>
            <Input
              id="deleteReason"
              className="mt-1"
              placeholder="Enter reason (required)..."
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeleteReason(''); }}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteLoan}
            disabled={!deleteReason.trim() || deletingLoan}
          >
            {deletingLoan ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : <><Trash2 className="h-4 w-4 mr-2" />Confirm Delete</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* FIX-03: Close Loan (Foreclosure) Dialog */}
    {loanDetails && showCloseLoanDialog && (
      <CloseLoanDialog
        open={showCloseLoanDialog}
        onOpenChange={setShowCloseLoanDialog}
        loanId={loanDetails.id}
        userId={currentUserId}
        companyId={loanDetails.company?.id}
        onLoanClosed={() => {
          setShowCloseLoanDialog(false);
          fetchLoanDetails();
          fetchEMISchedules(true);
          if (onEMIPaid) onEMIPaid();
          if (onPaymentSuccess) onPaymentSuccess();
        }}
      />
    )}

    {/* ── Edit Loan Details Dialog (Online Loans) ───────────────── */}
    <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-indigo-600" /> Edit Customer Details
          </DialogTitle>
          <DialogDescription>Update contact information for this loan application. Changes are audit-logged.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">First Name *</Label>
              <Input value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Last Name *</Label>
              <Input value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone *</Label>
              <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Address</Label>
              <Textarea rows={2} value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Remarks / Notes</Label>
              <Textarea rows={2} value={editForm.remarks} onChange={e => setEditForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Internal notes" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
          <Button
            disabled={editSaving || !editForm.firstName || !editForm.phone}
            onClick={handleSaveEdit}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {editSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}
