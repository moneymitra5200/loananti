'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout, { ROLE_MENU_ITEMS } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Banknote, FileText, CheckCircle, CreditCard, DollarSign, 
  TrendingUp, Eye, Receipt, Send, Activity, Landmark, Percent, PartyPopper
} from 'lucide-react';
import SuccessDialog from '@/components/shared/SuccessDialog';
import { formatCurrency, formatDate, generateTransactionId } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import ParallelLoanView from '@/components/loan/ParallelLoanView';
import PaymentRequestsSection from '@/components/payment/PaymentRequestsSection';
import SecondaryPaymentPageSection from '@/components/shared/SecondaryPaymentPageSection';
import ProfileSection from '@/components/shared/ProfileSection';
import OfflineLoanForm from '@/components/offline-loan/OfflineLoanForm';
import OfflineLoansList from '@/components/offline-loan/OfflineLoansList';
import EnquirySection from '@/components/shared/EnquirySection';
import TicketManagement from '@/components/support/TicketManagement';
import { DisbursementDialog, LoanDetailPanel, InterestPaymentDialog } from './modules';
import type { Loan, BankAccount, MirrorLoanInfo, DisbursementForm, ExpandedSections } from './tabs/types';
import { useRealtime } from '@/hooks/useRealtime';
import EMIDueAlertBanner from '@/components/notification/EMIDueAlertBanner';
import { useSettings } from '@/contexts/SettingsContext';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useLoansStore } from '@/stores/loansStore';
import DirectMessaging from '@/components/messaging/DirectMessaging';
import ClosedLoansTab from '@/components/admin/modules/ClosedLoansTab';
import MyCreditPassbook from '@/components/credit/MyCreditPassbook';
import CashierExpenseSection from '@/components/expense/CashierExpenseSection';

export default function CashierDashboard() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showDisbursementDialog, setShowDisbursementDialog] = useState(false);
  const [showLoanDetailPanel, setShowLoanDetailPanel] = useState(false);
  const [showInterestPaymentDialog, setShowInterestPaymentDialog] = useState(false);
  const [interestOnlyLoan, setInterestOnlyLoan] = useState<Loan | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [saving, setSaving] = useState(false);
  const [offlineLoansRefreshKey, setOfflineLoansRefreshKey] = useState(0);
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [mirrorMappings, setMirrorMappings] = useState<Record<string, any>>({});
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const { settings } = useSettings();
  const { settings: systemSettings } = useSystemSettings();
  const [pendingPaymentRequestCount, setPendingPaymentRequestCount] = useState(0);
  
  // CashBook state for Company 3
  const [cashBook, setCashBook] = useState<{ currentBalance: number; company?: { id: string; name: string; code: string } } | null>(null);
  const [isCompany3, setIsCompany3] = useState(false);
  
  // Mirror loan state - tracks if this is a mirror loan disbursement
  const [mirrorLoanInfo, setMirrorLoanInfo] = useState<MirrorLoanInfo | null>(null);
  
  // Disbursement form state
  const [disbursementForm, setDisbursementForm] = useState<DisbursementForm>({
    disbursedAmount: 0,
    disbursementMode: 'BANK_TRANSFER',
    disbursementRef: '',
    remarks: '',
    selectedBankAccountId: '',
    agreementSigned: false
  });
  
  // Expanded loan details in disbursement dialog
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    customer: true,
    loan: true,
    bank: true,
    employment: false,
    references: false
  });
  
  // Success Dialog state
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDialogData, setSuccessDialogData] = useState({ title: '', description: '' });

  // Daily limits — computed from REAL disbursements today (FIX-07)
  const dailyLimit = (user as any)?.dailyLimit || 500000;
  // `disbursedToday` is computed below (line ~656) from the loans array.
  // We forward-ref it via a derived variable after the loans state is defined.
  // The actual remaining limit is calculated after `totalDisbursedToday` is known.
  const remainingLimit = dailyLimit; // will be recalculated in stats

  // Real-time updates hook
  useRealtime({
    userId: user?.id,
    role: user?.role,
    onLoanStatusChanged: (data) => {
      const { loan, oldStatus, newStatus } = data;
      setLoans(prev => prev.map(l => l.id === loan.id ? { ...l, status: newStatus } : l));
      setActiveLoans(prev => prev.map(l => l.id === loan.id ? { ...l, status: newStatus } : l));
      toast({ title: 'Loan Updated', description: `Loan ${loan.applicationNo} status changed to ${newStatus}` });
    },
    onDashboardRefresh: () => {
      fetchAllData(true);
    }
  });

  useEffect(() => {
    fetchAllData();
    // Fetch mirror mappings for parallel view
    const fetchMirrorMappings = async () => {
      try {
        const res = await fetch('/api/mirror-loan?action=all-mappings');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.mappings) {
            const map: Record<string, any> = {};
            for (const m of data.mappings) {
              map[m.originalLoanId] = m;
              if (m.mirrorLoanId) map[m.mirrorLoanId] = m;
            }
            setMirrorMappings(map);
          }
        }
      } catch {}
    };
    fetchMirrorMappings();
  }, [user]);

  // Poll pending payment requests count every 30 seconds
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await fetch('/api/payment-request?role=CASHIER&status=PENDING');
        const data = await res.json();
        if (data.success) {
          setPendingPaymentRequestCount((data.paymentRequests || []).length);
        }
      } catch {}
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Optimized parallel fetch with caching
  const fetchAllData = useCallback(async (forceRefresh = false) => {
    const loansStore = useLoansStore.getState();
    
    // Check cache first
    if (!forceRefresh && !loansStore.needsRefresh() && loansStore.loans.length > 0) {
      const cashierLoans = loansStore.loans.filter(l => 
        ['FINAL_APPROVED', 'ACTIVE', 'DISBURSED', 'ACTIVE_INTEREST_ONLY'].includes(l.status || '')
      );
      setLoans(cashierLoans as Loan[]);
      if (!loansStore.activeNeedsRefresh() && loansStore.activeLoans.length > 0) {
        setActiveLoans(loansStore.activeLoans as Loan[]);
      }
      setLoading(false);
      // Still fetch bank accounts
      fetchBankAccounts();
      return;
    }

    setLoading(true);
    try {
      // PARALLEL FETCH
      const [loansRes, allActiveRes, bankAccountsRes] = await Promise.all([
        fetch('/api/loan/list?role=CASHIER'),
        fetch('/api/loan/all-active'),
        fetch('/api/accounting/bank-accounts')
      ]);

      // Process responses in parallel
      const [loansData, allActiveData, bankAccountsData] = await Promise.all([
        loansRes.json(),
        allActiveRes.json(),
        bankAccountsRes.json()
      ]);

      const loansList = loansData.loans || [];
      const activeLoansList = allActiveData.loans || [];
      
      // Update stores
      loansStore.setLoans(loansList);
      loansStore.setActiveLoans(activeLoansList);
      
      setLoans(loansList);
      setActiveLoans(activeLoansList);
      setBankAccounts(bankAccountsData.bankAccounts || []);
      
      // Set default bank account
      const defaultAccount = bankAccountsData.bankAccounts?.find((a: BankAccount) => a.isDefault);
      if (defaultAccount) {
        // CRITICAL: Only set default when no source is chosen yet — never override an active split or selection
        setDisbursementForm(prev => prev.selectedBankAccountId ? prev : ({ ...prev, selectedBankAccountId: defaultAccount.id }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLoans = async () => {
    fetchAllData();
  };

  const fetchActiveLoans = async () => {
    const store = useLoansStore.getState();
    if (!store.activeNeedsRefresh() && store.activeLoans.length > 0) {
      setActiveLoans(store.activeLoans as Loan[]);
      return;
    }
    try {
      const response = await fetch('/api/loan/all-active');
      const data = await response.json();
      store.setActiveLoans(data.loans || []);
      setActiveLoans(data.loans || []);
    } catch (error) {
      console.error('Error fetching active loans:', error);
    }
  };

  const fetchBankAccounts = async (companyId?: string) => {
    try {
      // Fetch bank accounts for specific company or all if no company specified
      const url = companyId 
        ? `/api/accounting/bank-accounts?companyId=${companyId}`
        : '/api/accounting/bank-accounts';
      const response = await fetch(url);
      const data = await response.json();
      if (data.bankAccounts) {
        setBankAccounts(data.bankAccounts || []);
        // Set default bank account for the company
        const defaultAccount = data.bankAccounts?.find((a: BankAccount) => a.isDefault);
        if (defaultAccount) {
          // CRITICAL: Only set default when no source is chosen yet — never override an active split or selection
          setDisbursementForm(prev => prev.selectedBankAccountId ? prev : ({ ...prev, selectedBankAccountId: defaultAccount.id }));
        }
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  // Fetch CashBook for Company 3
  const fetchCashBook = async (companyId: string) => {
    try {
      const response = await fetch(`/api/cashbook?companyId=${companyId}`);
      const data = await response.json();
      if (data.success && data.cashBook) {
        setCashBook(data.cashBook);
        console.log('[CashBook] Fetched for Company 3:', data.cashBook.currentBalance);
      }
    } catch (error) {
      console.error('Error fetching cash book:', error);
    }
  };

  // Helper to identify Company 3
  const identifyCompany3 = (company: { code?: string | null; name: string } | null | undefined): boolean => {
    if (!company) return false;
    const code = (company.code || '').toUpperCase().trim();
    const name = (company.name || '').toLowerCase().trim();
    
    // Exact code matches
    if (code === 'COMPANY3' || code === 'COMPANY_3' || code === 'C3' || code === '3') return true;
    if (/^C[-_]?3$/i.test(code)) return true;
    if (/\b3\b/.test(code) || code.endsWith('3')) return true;
    
    // Name matches
    if (name.includes('company 3') || name.includes('company3')) return true;
    if (name.includes('original') || name.includes('customer') || name.includes('main')) return true;
    
    return false;
  };

  const openDisbursementDialog = async (loan: Loan) => {
    // Reset states
    setMirrorLoanInfo(null);
    setIsCompany3(false);
    setCashBook(null);
    
    // Fetch full loan details
    try {
      const response = await fetch(`/api/loan/details?loanId=${loan.id}`);
      const data = await response.json();
      if (data.success && data.loan) {
        setSelectedLoan({ ...loan, ...data.loan });
        
        let disbursementCompanyId = data.loan.companyId || data.loan.company?.id;
        let disbursementCompanyName = data.loan.company?.name;
        let disbursementCompany = data.loan.company;
        
        // Check for APPROVED pending mirror loan for this original loan
        const pendingMirrorResponse = await fetch(`/api/pending-mirror-loan?status=APPROVED`);
        const pendingMirrorData = await pendingMirrorResponse.json();
        
        if (pendingMirrorData.success && pendingMirrorData.pendingLoans) {
          // Find pending mirror loan for this original loan
          const pendingMirror = pendingMirrorData.pendingLoans.find(
            (p: any) => p.originalLoanId === loan.id && p.status === 'APPROVED'
          );
          
          if (pendingMirror) {
            // Disbursement should happen from MIRROR COMPANY
            disbursementCompanyId = pendingMirror.mirrorCompanyId;
            disbursementCompanyName = pendingMirror.mirrorCompany?.name;
            // Update disbursementCompany to MIRROR company for Company 3 check
            disbursementCompany = pendingMirror.mirrorCompany;
            
            // Set mirror loan info for UI display
            setMirrorLoanInfo({
              isMirrorLoan: true,
              mirrorCompanyId: pendingMirror.mirrorCompanyId,
              mirrorCompanyName: pendingMirror.mirrorCompany?.name,
              originalCompanyName: data.loan.company?.name,
              originalCompanyId: data.loan.companyId,
              pendingMirrorLoanId: pendingMirror.id,
              // Extra EMI information
              extraEMICount: pendingMirror.extraEMICount,
              mirrorTenure: pendingMirror.mirrorTenure,
              originalTenure: pendingMirror.originalTenure
            });
            
            console.log('[Pending Mirror Loan] Disbursement will happen from Mirror Company:', pendingMirror.mirrorCompany?.name);
            console.log('[Pending Mirror Loan] Original Company:', data.loan.company?.name);
            console.log('[Pending Mirror Loan] Extra EMIs:', pendingMirror.extraEMICount);
          }
        }
        
        // Check if the DISBURSEMENT company is Company 3 (uses CashBook instead of BankAccount)
        // For mirror loans, this checks the MIRROR company, not the original company
        const companyIsCompany3 = identifyCompany3(disbursementCompany);
        setIsCompany3(companyIsCompany3);
        
        if (companyIsCompany3 && disbursementCompanyId) {
          // Company 3: Fetch CashBook instead of BankAccounts
          console.log('[Disbursement] Company 3 detected - using CashBook instead of BankAccounts');
          await fetchCashBook(disbursementCompanyId);
          setBankAccounts([]); // Clear bank accounts
        } else {
          // Other companies: Fetch bank accounts
          if (disbursementCompanyId) {
            await fetchBankAccounts(disbursementCompanyId);
          } else {
            await fetchBankAccounts();
          }
        }
      } else {
        setSelectedLoan(loan);
        await fetchBankAccounts();
      }
    } catch {
      setSelectedLoan(loan);
      await fetchBankAccounts();
    }
    
    setDisbursementForm({
      disbursedAmount: loan.sessionForm?.approvedAmount || loan.requestedAmount,
      disbursementMode: 'CASH',
      disbursementRef: generateTransactionId(),
      remarks: '',
      selectedBankAccountId: '',
      agreementSigned: false,
      chargesAmount: 0,
      extraEMIPaymentPageId: ''
    });
    setExpandedSections({
      customer: true,
      loan: true,
      bank: true,
      employment: false,
      references: false
    });
    setShowDisbursementDialog(true);
  };

  const handleDisburse = async () => {
    console.log('[handleDisburse] Starting disbursement...');
    console.log('[handleDisburse] selectedLoan:', selectedLoan?.id);
    console.log('[handleDisburse] disbursementForm:', disbursementForm);
    
    if (!selectedLoan) {
      console.error('[handleDisburse] No selected loan');
      toast({ title: 'Error', description: 'No loan selected', variant: 'destructive' });
      return;
    }
    if (!disbursementForm.disbursedAmount) {
      console.error('[handleDisburse] No disbursed amount');
      toast({ title: 'Error', description: 'Disbursement amount is required', variant: 'destructive' });
      return;
    }
    if (!disbursementForm.agreementSigned) {
      console.error('[handleDisburse] Agreement not signed');
      toast({ title: 'Error', description: 'Please confirm that the loan agreement has been signed', variant: 'destructive' });
      return;
    }
    
    // Check payment source selection
    if (!isCompany3 && !disbursementForm.selectedBankAccountId) {
      console.error('[handleDisburse] No payment source selected');
      toast({ title: 'Error', description: 'Please select a payment source for disbursement', variant: 'destructive' });
      return;
    }
    
    if (disbursementForm.disbursedAmount > remainingLimit) {
      console.error('[handleDisburse] Amount exceeds limit');
      toast({ title: 'Error', description: 'Amount exceeds daily limit', variant: 'destructive' });
      return;
    }
    
    // Check for Extra EMI Payment Page selection (required for mirror loans)
    if (mirrorLoanInfo?.isMirrorLoan && !disbursementForm.extraEMIPaymentPageId) {
      console.error('[handleDisburse] No extra EMI payment page');
      toast({ title: 'Error', description: 'Please select a Secondary Payment Page for Extra EMIs', variant: 'destructive' });
      return;
    }
    
    // Determine if payment is from bank or cash
    const isCashPayment = disbursementForm.selectedBankAccountId?.startsWith('cash_');
    const isSplitPayment = disbursementForm.useSplitPayment;
    
    console.log('[handleDisburse] isCashPayment:', isCashPayment);
    console.log('[handleDisburse] isSplitPayment:', isSplitPayment);
    
    // Check bank balance for bank payments
    if (!isCompany3 && !isCashPayment && !isSplitPayment) {
      const selectedBank = bankAccounts.find(a => a.id === disbursementForm.selectedBankAccountId);
      if (selectedBank && selectedBank.currentBalance < disbursementForm.disbursedAmount) {
        toast({ 
          title: 'Insufficient Bank Balance', 
          description: `Bank account has only ${formatCurrency(selectedBank.currentBalance)}. Please add funds or select another account.`, 
          variant: 'destructive' 
        });
        return;
      }
    }
    
    // Check split payment validation
    if (isSplitPayment) {
      const total = (disbursementForm.bankAmount || 0) + (disbursementForm.cashAmount || 0);
      if (total !== disbursementForm.disbursedAmount) {
        toast({ 
          title: 'Split Amount Error', 
          description: `Bank + Cash amount (₹${total.toLocaleString()}) must equal disbursement amount (₹${disbursementForm.disbursedAmount.toLocaleString()})`, 
          variant: 'destructive' 
        });
        return;
      }
      
      // Validate bank account selection for bank portion
      if ((disbursementForm.bankAmount || 0) > 0 && !disbursementForm.splitBankAccountId) {
        toast({ 
          title: 'Bank Account Required', 
          description: 'Please select a bank account for the bank portion of the split payment.', 
          variant: 'destructive' 
        });
        return;
      }
    }
    
    // Check CashBook balance for Company 3
    if (isCompany3 && cashBook) {
      console.log(`[Disbursement] Company 3 CashBook balance: ${cashBook.currentBalance}`);
      if (cashBook.currentBalance < disbursementForm.disbursedAmount) {
        toast({ 
          title: 'Low Cash Book Balance', 
          description: `Cash book has ${formatCurrency(cashBook.currentBalance)}. Disbursement will result in negative balance. Accountant can add funds later.`, 
        });
      }
    }
    
    setSaving(true);
    console.log('[handleDisburse] Sending API request...');
    
    try {
      // Determine the actual bank account ID (null for cash payments)
      const actualBankAccountId = isCashPayment ? null : disbursementForm.selectedBankAccountId;
      const isCashDisbursement = isCashPayment || isCompany3;
      
      const requestBody = {
        loanId: selectedLoan.id,
        action: 'disburse',
        role: 'CASHIER',
        userId: user?.id,
        disbursementData: {
          amount: disbursementForm.disbursedAmount,
          mode: isCashDisbursement ? 'CASH' : 'BANK_TRANSFER',
          reference: disbursementForm.disbursementRef || `TXN${Date.now()}`,
          bankAccountId: actualBankAccountId,
          isCashPayment: isCashPayment,
          // Split payment fields
          useSplitPayment: isSplitPayment || false,
          bankAmount: disbursementForm.bankAmount || 0,
          cashAmount: disbursementForm.cashAmount || 0
        },
        remarks: disbursementForm.remarks,
        agreementSigned: disbursementForm.agreementSigned,
        chargesAmount: disbursementForm.chargesAmount || 0
      };
      
      console.log('[handleDisburse] Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('/api/workflow/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const responseData = await response.json();
      console.log('[handleDisburse] Response:', response.status, responseData);
      
      if (response.ok) {
        // Only generate EMI schedule for NON interest-only loans
        // Interest-only loans will have EMI generated when "Start Loan" is clicked
        if (!selectedLoan.isInterestOnlyLoan) {
          await fetch('/api/emi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loanId: selectedLoan.id })
          });
        }

        // If this is a mirror loan, also disburse the pending mirror loan
        if (mirrorLoanInfo?.isMirrorLoan && mirrorLoanInfo.pendingMirrorLoanId) {
          console.log('[handleDisburse] Processing mirror loan disbursement...');
          
          // For split payment, use the splitBankAccountId; for regular bank payment, use selectedBankAccountId
          const bankAccountIdForMirror = isSplitPayment 
            ? disbursementForm.splitBankAccountId 
            : (isCashPayment ? null : actualBankAccountId);
          
          const mirrorRequestBody: any = {
            id: mirrorLoanInfo.pendingMirrorLoanId,
            action: 'disburse',
            userId: user?.id,
            disbursementBankAccountId: bankAccountIdForMirror,
            disbursementReference: disbursementForm.disbursementRef || `TXN${Date.now()}`,
            extraEMIPaymentPageId: disbursementForm.extraEMIPaymentPageId,
            // Pass split payment parameters
            useSplitPayment: isSplitPayment,
            bankAmount: disbursementForm.bankAmount || 0,
            cashAmount: disbursementForm.cashAmount || 0
          };
          
          console.log('[handleDisburse] Mirror request body:', JSON.stringify(mirrorRequestBody, null, 2));
          
          const mirrorResponse = await fetch('/api/pending-mirror-loan', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mirrorRequestBody)
          });
          
          const mirrorResponseData = await mirrorResponse.json();
          console.log('[handleDisburse] Mirror response:', mirrorResponse.status, mirrorResponseData);
          
          if (mirrorResponse.ok) {
            toast({ 
              title: 'Mirror Loan Activated', 
              description: 'Both original and mirror loans are now active. Extra EMIs will be collected via selected payment page.' 
            });
          } else {
            console.error('Mirror loan disbursement error:', mirrorResponseData.error);
            toast({ 
              title: 'Mirror Loan Error', 
              description: mirrorResponseData.error || 'Failed to activate mirror loan',
              variant: 'destructive'
            });
          }
        }

        // Show success dialog
        const successTitle = selectedLoan.isInterestOnlyLoan 
          ? 'Interest Only Loan Activated!'
          : 'Loan Activated Successfully!';
        const successDescription = selectedLoan.isInterestOnlyLoan
          ? `${formatCurrency(disbursementForm.disbursedAmount)} disbursed to ${selectedLoan.customer?.name}. The loan is now in Interest-Only phase. Customer will pay monthly interest until "Start Loan" is clicked.`
          : `${formatCurrency(disbursementForm.disbursedAmount)} disbursed to ${selectedLoan.customer?.name}. EMI schedule has been generated and the loan is now active.`;
        
        setSuccessDialogData({ title: successTitle, description: successDescription });
        setShowSuccessDialog(true);
        setShowDisbursementDialog(false);
        fetchLoans();
        fetchBankAccounts();

        // Fire-and-forget: add charges to cashier's personal credit
        if ((disbursementForm.chargesAmount || 0) > 0 && user?.id) {
          fetch('/api/user/personal-credit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, amount: disbursementForm.chargesAmount, loanId: selectedLoan.id })
          }).catch(err => console.error('[Charges] Failed to credit personal amount:', err));
        }
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.error || 'Failed to disburse', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to process disbursement', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Send Back handler for Cashier
  const handleSendBack = async () => {
    if (!selectedLoan) return;
    setSaving(true);
    try {
      const response = await fetch('/api/workflow/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: selectedLoan.id,
          action: 'send_back',
          role: 'CASHIER',
          userId: user?.id,
          remarks: disbursementForm.remarks || 'Sending back to previous stage'
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ 
          title: 'Loan Sent Back', 
          description: `Loan ${selectedLoan.applicationNo} has been sent back to previous stage.` 
        });
        setShowDisbursementDialog(false);
        fetchLoans();
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.error || 'Failed to send back', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to send back', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      FINAL_APPROVED: { className: 'bg-green-100 text-green-700', label: 'Ready for Disbursement' },
      DISBURSED: { className: 'bg-blue-100 text-blue-700', label: 'Disbursed' },
      ACTIVE: { className: 'bg-emerald-100 text-emerald-700', label: 'Active' },
      ACTIVE_INTEREST_ONLY: { className: 'bg-cyan-100 text-cyan-700', label: 'Interest Only' },
      CLOSED: { className: 'bg-gray-200 text-gray-700', label: 'Closed ✓' },
      SESSION_CREATED: { className: 'bg-amber-100 text-amber-700', label: 'Sanction Created' },
      CUSTOMER_SESSION_APPROVED: { className: 'bg-teal-100 text-teal-700', label: 'Customer Approved' },
      REJECTED_FINAL: { className: 'bg-red-100 text-red-700', label: 'Rejected' },
    };
    const c = config[status] || { className: 'bg-gray-100 text-gray-700', label: status };
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  // Filter loans
  const readyForDisbursement = loans.filter(l => l.status === 'FINAL_APPROVED');
  const disbursedToday = loans.filter(l => l.status === 'ACTIVE' && l.disbursedAt && new Date(l.disbursedAt).toDateString() === new Date().toDateString());
  const allDisbursed = loans.filter(l => ['ACTIVE', 'DISBURSED'].includes(l.status));

  const totalDisbursedToday = disbursedToday.reduce((sum, l) => sum + (l.disbursedAmount || l.sessionForm?.approvedAmount || 0), 0);
  const totalDisbursedAll = allDisbursed.reduce((sum, l) => sum + (l.disbursedAmount || l.sessionForm?.approvedAmount || 0), 0);

  // For active loans: exclude mirror loans from COUNT (they are internal accounting entries)
  // Mirror loans are visible in the list but labeled "Mirror - internal"
  const originalActiveLoans = (activeLoans as any[]).filter(l => !l.isMirrorLoan);
  const mirrorActiveLoans = (activeLoans as any[]).filter(l => l.isMirrorLoan);

  // FIX-07: real remaining limit uses totalDisbursedToday computed from actual loans
  const actualRemainingLimit = dailyLimit - totalDisbursedToday;

  const stats = [
    { label: 'Ready for Disbursement', value: readyForDisbursement.length, icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50', onClick: () => setActiveTab('pending') },
    { label: 'Today\'s Disbursement', value: formatCurrency(totalDisbursedToday), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Remaining Daily Limit', value: formatCurrency(actualRemainingLimit), icon: Banknote, color: actualRemainingLimit < dailyLimit * 0.2 ? 'text-red-600' : 'text-purple-600', bg: actualRemainingLimit < dailyLimit * 0.2 ? 'bg-red-50' : 'bg-purple-50' },
    { label: 'Total Disbursed', value: formatCurrency(totalDisbursedAll), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', onClick: () => setActiveTab('history') }
  ];

  const menuItems = ROLE_MENU_ITEMS.CASHIER.map(item => ({
    ...item,
    count: item.id === 'pending'          ? readyForDisbursement.length :
           item.id === 'history'          ? allDisbursed.length :
           item.id === 'audit'            ? allDisbursed.length :
           item.id === 'activeLoans'      ? originalActiveLoans.length :
           item.id === 'paymentRequests'  ? (pendingPaymentRequestCount || undefined) :
           undefined
  }));

  const renderLoanCard = (loan: Loan, index: number, actions?: React.ReactNode) => (
    <motion.div key={loan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
      className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all bg-white">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 bg-gradient-to-br from-orange-400 to-red-500">
            <AvatarImage src={loan.photoDoc || ''} alt={loan.customer?.name || ''} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white font-semibold">
              {loan.customer?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">{loan.applicationNo}</h4>
              {getStatusBadge(loan.status)}
            </div>
            <p className="text-sm text-gray-500">{loan.customer?.name} • {loan.customer?.email}</p>
            <p className="text-xs text-gray-400">{formatDate(loan.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-bold text-lg text-gray-900">{formatCurrency(loan.sessionForm?.approvedAmount || loan.requestedAmount)}</p>
            {loan.sessionForm && (
              <p className="text-xs text-gray-500">EMI: {formatCurrency(loan.sessionForm.emiAmount || 0)}/mo</p>
            )}
          </div>
          {actions || (
            <Button size="sm" variant="outline" onClick={() => { setSelectedLoan(loan); setShowLoanDetailPanel(true); }}>
              <Eye className="h-4 w-4 mr-1" /> View
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'pending':
        return (
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-600" />Ready for Disbursement
              </CardTitle>
              <CardDescription>Final approved loans awaiting disbursement</CardDescription>
            </CardHeader>
            <CardContent>
              {readyForDisbursement.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p>No loans pending disbursement</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {readyForDisbursement.map((loan, index) => renderLoanCard(loan, index,
                    <Button className="bg-green-500 hover:bg-green-600" onClick={() => openDisbursementDialog(loan)}>
                      <Send className="h-4 w-4 mr-2" />Disburse
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'history':
        return (
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" />Recent Disbursements
              </CardTitle>
              <CardDescription>History of disbursed loans</CardDescription>
            </CardHeader>
            <CardContent>
              {allDisbursed.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Banknote className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No disbursed loans yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allDisbursed.map((loan, index) => renderLoanCard(loan, index))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'offline-loans':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Offline Loans</h2>
                <p className="text-gray-500">Create and manage offline loans</p>
              </div>
              <OfflineLoanForm 
                createdById={user?.id || ''} 
                createdByRole={user?.role || 'CASHIER'}
                companyId={user?.companyId || ''}
                onLoanCreated={() => setOfflineLoansRefreshKey(k => k + 1)}
              />
            </div>
            <OfflineLoansList 
              userId={user?.id}
              userRole={user?.role || 'CASHIER'}
              refreshKey={offlineLoansRefreshKey}
            />
          </div>
        );

      case 'audit':
        return (
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />Audit Logs
              </CardTitle>
              <CardDescription>Record of all disbursement activities</CardDescription>
            </CardHeader>
            <CardContent>
              {allDisbursed.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No audit logs available</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allDisbursed.map((loan, index) => (
                    <motion.div key={loan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                      className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all bg-white">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900">{loan.applicationNo}</h4>
                              <Badge className="bg-green-100 text-green-700">Disbursed</Badge>
                            </div>
                            <p className="text-sm text-gray-500">{loan.customer?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="font-bold text-lg text-gray-900">{formatCurrency(loan.disbursedAmount || loan.sessionForm?.approvedAmount || loan.requestedAmount)}</p>
                            <p className="text-xs text-gray-500">Mode: {loan.disbursementMode || 'N/A'}</p>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <p className="font-medium">{loan.disbursedAt ? formatDate(loan.disbursedAt) : 'N/A'}</p>
                            <p className="text-xs">Ref: {loan.disbursementRef || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'activeLoans':
        // Filter out mirror loans from the parallel view (they appear on the right side)
        const parallelLoans = (activeLoans as any[]).filter(loan => {
          const mapping = mirrorMappings[loan.id];
          return !(mapping?.mirrorLoanId === loan.id); // exclude loans that ARE the mirror side
        });
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Active Loans — Parallel View</h2>
                <p className="text-sm text-gray-500">Original on left · Mirror on right</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-400" /><span>Original</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-400" /><span>Mirror</span></div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-xs text-emerald-600">Original Loans</p>
                <p className="text-xl font-bold text-emerald-700">{originalActiveLoans.length}</p>
                <p className="text-xs text-emerald-500">{formatCurrency(originalActiveLoans.reduce((s: number, l: any) => s + (l.approvedAmount || 0), 0))}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-600">Mirror Loans</p>
                <p className="text-xl font-bold text-blue-700">{mirrorActiveLoans.length}</p>
                <p className="text-xs text-blue-500">Internal accounting</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-xl font-bold text-gray-700">{originalActiveLoans.length + mirrorActiveLoans.length}</p>
              </div>
            </div>

            {/* Parallel View List */}
            {parallelLoans.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Banknote className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No active loans found</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {parallelLoans.map((loan: any) => {
                    const mapping = mirrorMappings[loan.id];
                    const mirrorLoanData = mapping?.mirrorLoan ? {
                      id: mapping.mirrorLoan.id,
                      identifier: mapping.mirrorLoan.identifier || mapping.mirrorLoan.applicationNo,
                      applicationNo: mapping.mirrorLoan.applicationNo,
                      customer: mapping.mirrorLoan.customer,
                      customerName: mapping.mirrorLoan.customer?.name,
                      customerPhone: mapping.mirrorLoan.customer?.phone,
                      approvedAmount: mapping.mirrorLoan.approvedAmount || mapping.mirrorLoan.sessionForm?.approvedAmount || 0,
                      interestRate: mapping.mirrorInterestRate || mapping.mirrorLoan.interestRate || 0,
                      tenure: mapping.mirrorTenure || mapping.mirrorLoan.tenure || 0,
                      emiAmount: mapping.originalEMIAmount || mapping.mirrorLoan.emiAmount || 0,
                      status: mapping.mirrorLoan.status || 'ACTIVE',
                      loanType: mapping.mirrorLoan.loanType,
                      company: mapping.mirrorCompany,
                      createdAt: mapping.mirrorLoan.createdAt || new Date().toISOString(),
                      disbursementDate: mapping.mirrorLoan.disbursementDate,
                    } : null;

                    return (
                      <ParallelLoanView
                        key={loan.id}
                        originalLoan={{
                          id: loan.id,
                          identifier: loan.identifier,
                          customer: loan.customer,
                          approvedAmount: loan.approvedAmount,
                          interestRate: loan.interestRate,
                          tenure: loan.tenure,
                          emiAmount: loan.emiAmount,
                          status: loan.status,
                          loanType: loan.loanType,
                          company: loan.company,
                          createdAt: loan.createdAt ? new Date(loan.createdAt).toISOString() : new Date().toISOString(),
                          disbursementDate: loan.disbursementDate ? new Date(loan.disbursementDate).toISOString() : undefined,
                        }}
                        mirrorLoan={mirrorLoanData}
                        mirrorMapping={mapping ? {
                          displayColor: mapping.displayColor,
                          extraEMICount: mapping.extraEMICount ?? undefined,
                          mirrorInterestRate: mapping.mirrorInterestRate ?? undefined,
                          mirrorTenure: mapping.mirrorTenure ?? undefined,
                          mirrorEMIsPaid: mapping.mirrorEMIsPaid ?? undefined,
                          extraEMIsPaid: mapping.extraEMIsPaid ?? undefined,
                          mirrorCompanyId: mapping.mirrorCompanyId,
                          originalCompanyId: mapping.originalCompanyId,
                        } : null}
                        onViewOriginal={() => { setSelectedLoan(loan); setShowLoanDetailPanel(true); }}
                        onViewMirror={() => {
                          // For mirror loan: open detail panel with mirror loan id if available
                          const mirrorId = mapping?.mirrorLoanId;
                          if (mirrorId) {
                            setSelectedLoan({ id: mirrorId } as any);
                          } else {
                            setSelectedLoan(loan);
                          }
                          setShowLoanDetailPanel(true);
                        }}
                        onPayEmi={(l) => { setSelectedLoan(loan); setShowLoanDetailPanel(true); }}
                        showPayButton={true}
                        showEmiProgress={true}
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        );


      case 'paymentRequests':
        return <PaymentRequestsSection cashierId={user?.id || ''} />;

      case 'secondary-payment-pages':
        return (
          <SecondaryPaymentPageSection
            userId={user?.id || 'system'}
            companyId={user?.companyId || ''}
          />
        );

      case 'enquiry':
        return <EnquirySection role="CASHIER" userId={user?.id || ''} />;

      case 'tickets':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span>🎫</span> Support Tickets
            </h2>
            <TicketManagement userId={user?.id || ''} userRole={user?.role || 'CASHIER'} />
          </div>
        );

      // Messages removed – messages come via notifications panel

      case 'profile':
        return <ProfileSection />;

      case 'closedLoans':
        return (
          <ClosedLoansTab
            setSelectedLoanId={(id) => setSelectedLoan({ id } as any)}
            setShowLoanDetailPanel={setShowLoanDetailPanel}
            mirrorEnabled={(systemSettings as any)?.mirrorLoanEnabled !== false}
          />
        );

      case 'myCredit':
        return <MyCreditPassbook />;

      case 'expense':
        return (
          <CashierExpenseSection
            cashierId={user?.id || ''}
            companyId={user?.companyId || undefined}
          />
        );

      default:
        return (
          <div className="space-y-6">
            {/* EMI Due Alert Banner */}
            {user?.id && (
              <EMIDueAlertBanner 
                userId={user.id} 
                userRole={user.role || 'CASHIER'} 
              />
            )}

            {/* Bank Balance Summary */}
            {bankAccounts.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-blue-600" />
                    Bank Accounts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {bankAccounts.slice(0, 3).map(account => (
                      <div key={account.id} className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{account.bankName}</span>
                          {account.isDefault && <Badge className="bg-blue-500 text-xs">Default</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 mb-1">{account.accountNumber}</p>
                        <p className="text-xl font-bold text-blue-600">{formatCurrency(account.currentBalance)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Daily Limit Progress */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Daily Limit Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Used: {formatCurrency(totalDisbursedToday)}</span>
                    <span>Limit: {formatCurrency(dailyLimit)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all" 
                      style={{ width: `${Math.min((totalDisbursedToday / dailyLimit) * 100, 100)}%` }} 
                    />
                  </div>
                  <p className="text-sm text-gray-500">Remaining: {formatCurrency(dailyLimit - totalDisbursedToday)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Pending Disbursements */}
            {readyForDisbursement.length > 0 && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-800">{readyForDisbursement.length} Loans Ready for Disbursement</h4>
                      <p className="text-sm text-green-600">Process disbursements to activate loans</p>
                    </div>
                    <Button className="bg-green-500 hover:bg-green-600" onClick={() => setActiveTab('pending')}>
                      Process
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Activity</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loans.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>No activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loans.slice(0, 5).map((loan) => (
                      <div key={loan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-orange-100 text-orange-700">{loan.customer?.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{loan.applicationNo}</p>
                            <p className="text-sm text-gray-500">{loan.customer?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(loan.status)}
                          <p className="font-semibold">{formatCurrency(loan.sessionForm?.approvedAmount || loan.requestedAmount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <DashboardLayout
      title="Cashier Dashboard"
      subtitle="Process loan disbursements"
      menuItems={menuItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      stats={stats}
      gradient="bg-gradient-to-br from-orange-500 to-red-600"
      logoIcon={Banknote}
    >
      {renderContent()}

      {/* Disbursement Dialog */}
      <DisbursementDialog
        open={showDisbursementDialog}
        onOpenChange={setShowDisbursementDialog}
        selectedLoan={selectedLoan}
        bankAccounts={bankAccounts}
        mirrorLoanInfo={mirrorLoanInfo}
        disbursementForm={disbursementForm}
        setDisbursementForm={setDisbursementForm}
        expandedSections={expandedSections}
        setExpandedSections={setExpandedSections}
        saving={saving}
        remainingLimit={remainingLimit}
        dailyLimit={dailyLimit}
        onDisburse={handleDisburse}
        onSendBack={handleSendBack}
        isCompany3={isCompany3}
        cashBook={cashBook}
      />

      {/* Loan Detail Panel */}
      {selectedLoan && showLoanDetailPanel && (
        <LoanDetailPanel
          loanId={selectedLoan.id}
          open={showLoanDetailPanel}
          onClose={() => { setShowLoanDetailPanel(false); setSelectedLoan(null); }}
          onEMIPaid={() => fetchAllData(true)} // FIX-08: refresh all data after EMI payment
          userId={user?.id}
          userRole={user?.role || 'CASHIER'}
        />
      )}

      {/* Interest Payment Dialog */}
      {interestOnlyLoan && (
        <InterestPaymentDialog
          open={showInterestPaymentDialog}
          onOpenChange={setShowInterestPaymentDialog}
          loan={interestOnlyLoan}
          userId={user?.id || ''}
          personalCredit={(user as any)?.personalCredit || 0}
          companyCredit={(user as any)?.companyCredit || 0}
          onSuccess={() => { fetchActiveLoans(); }}
        />
      )}
      
      {/* Success Dialog */}
      <SuccessDialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        title={successDialogData.title}
        description={successDialogData.description}
        icon="party"
      />
    </DashboardLayout>
  );
}
