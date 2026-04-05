'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useRealtime } from '@/hooks/useRealtime';
import { useLoansStore } from '@/stores/loansStore';
import { useCompaniesStore } from '@/stores/companiesStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import ProfileSection from '@/components/shared/ProfileSection';
import { 
  Calculator, FileText, TrendingUp, DollarSign, Loader2, RefreshCw, 
  FileSpreadsheet, BookOpen, Landmark, QrCode, ArrowUpRight, ArrowDownRight,
  CreditCard, BookMarked, Clock, LogOut, User
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// Types
import {
  Company,
  BankAccount,
  BankTransaction,
  Expense,
  Income,
  ActiveLoan,
  AuditLog,
  ChartOfAccountItem,
  JournalEntry,
  TrialBalanceItem,
  LedgerEntry,
  TrialBalanceSummary,
  BankForm,
  ExpenseForm,
  IncomeForm,
  MenuItem
} from './types';

// Section Components
import {
  OverviewSection,
  BankSection,
  PaymentPagesSection,
  LoanPortfolioSection,
  AuditTrailSection,
  DayBookSection,
  BalanceSheetSection,
  ProfitLossSection,
  CashFlowSection,
  IncomeSection,
  ExpenseSection,
  ChartOfAccountsSection,
  LedgerViewSection,
  TrialBalanceSection,
  JournalEntriesSection,
  LedgerSection,
  BankDialog,
  ExpenseDialog,
  ScanDialog,
  DeleteBankDialog
} from './modules';

// ============================================
// MAIN COMPONENT
// ============================================

export default function AccountantDashboard() {
  const { user, signOut, refreshUser } = useAuth();
  const { settings } = useSettings();
  
  // Real-time updates hook
  const { requestRefresh } = useRealtime({
    userId: user?.id,
    role: user?.role,
    onLoanStatusChanged: (data) => {
      const { loan, newStatus } = data;
      // Update loans store directly for instant UI update
      useLoansStore.getState().updateLoan(loan.id, { status: newStatus });
      toast.success(`Loan ${loan.applicationNo || loan.id} status changed to ${newStatus}`);
    },
    onPaymentReceived: (data) => {
      // Refresh data when payment is received
      fetchAllData(true);
      toast.success(`Payment of ${formatCurrency(data.amount)} received`);
    },
    onDashboardRefresh: () => {
      fetchAllData(true);
    }
  });
  
  // State
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  
  // Company Filter - SINGLE SELECT
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  
  // Date Filter
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  
  // Data States
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Double-Entry Accounting States
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccountItem[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceItem[]>([]);
  const [trialBalanceSummary, setTrialBalanceSummary] = useState<TrialBalanceSummary>({ totalDebits: 0, totalCredits: 0, isBalanced: true });
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [accountLedger, setAccountLedger] = useState<LedgerEntry[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [loanLedger, setLoanLedger] = useState<LedgerEntry[]>([]);
  
  // Extra EMI Profit (Company 3 only)
  const [extraEMIProfit, setExtraEMIProfit] = useState<any>(null);
  
  // Payment Pages
  const [paymentPages, setPaymentPages] = useState<any[]>([]);
  const [loadingPaymentPages, setLoadingPaymentPages] = useState(false);
  
  // Report States
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [profitLoss, setProfitLoss] = useState<any>(null);
  const [cashFlow, setCashFlow] = useState<any>(null);
  
  // Dialog States
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showIncomeDialog, setShowIncomeDialog] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [scanning, setScanning] = useState(false);
  
  // Delete Confirmation Dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<BankAccount | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Form States
  const [bankForm, setBankForm] = useState<BankForm>({
    bankName: '',
    accountNumber: '',
    accountName: '',
    ownerName: '',
    ifscCode: '',
    branchName: '',
    accountType: 'CURRENT',
    openingBalance: 0,
    upiId: '',
    qrCodeUrl: '',
    isDefault: false
  });
  
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>({
    expenseType: 'MISCELLANEOUS',
    description: '',
    amount: 0,
    paymentMode: 'BANK_TRANSFER',
    paymentDate: format(new Date(), 'yyyy-MM-dd')
  });
  
  const [incomeForm, setIncomeForm] = useState<IncomeForm>({
    type: 'EMI_COLLECTION',
    description: '',
    amount: 0,
    source: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  // ============================================
  // HELPERS
  // ============================================

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  }, []);

  const formatDate = useCallback((date: Date | string) => {
    if (!date) return '-';
    return format(new Date(date), 'dd MMM yyyy');
  }, []);

  const formatDateShort = useCallback((date: Date | string) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy');
  }, []);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchCompanies = useCallback(async (forceRefresh = false) => {
    const store = useCompaniesStore.getState();
    
    // Use cached data if available and not expired
    if (!forceRefresh && !store.needsRefresh() && store.companies.length > 0) {
      setCompanies(store.companies);
      if (store.companies.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(store.companies[0].id);
      }
      return;
    }
    
    try {
      const res = await fetch('/api/company');
      if (res.ok) {
        const data = await res.json();
        const companiesList = data.companies || [];
        store.setCompanies(companiesList);
        setCompanies(companiesList);
        if (companiesList.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(companiesList[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  }, [selectedCompanyId]);

  const fetchAllData = useCallback(async (forceRefresh = false) => {
    if (!selectedCompanyId) return;
    
    // Check if we can use cached data
    const loansStore = useLoansStore.getState();
    if (!forceRefresh && !loansStore.needsRefresh() && loansStore.activeLoans.length > 0) {
      // Use cached loan data - but still fetch accountant-specific data
      setActiveLoans(loansStore.activeLoans.map((l: any) => ({
        ...l,
        emiSchedules: l.emiSchedules || []
      })) as ActiveLoan[]);
    }
    
    setLoading(true);
    try {
      // PARALLEL FETCH - All requests at once
      const [
        bankRes, 
        expenseRes, 
        loansRes, 
        auditRes,
        balanceSheetRes,
        profitLossRes,
        cashFlowRes,
        chartOfAccountsRes,
        journalEntriesRes,
        trialBalanceRes,
        mirrorProfitRes
      ] = await Promise.all([
        fetch(`/api/accountant/bank-accounts?companyId=${selectedCompanyId}`),
        fetch(`/api/accountant/expenses?companyId=${selectedCompanyId}`),
        fetch(`/api/accountant/portfolio?companyId=${selectedCompanyId}`),
        fetch(`/api/accountant/audit-log?companyId=${selectedCompanyId}`),
        fetch(`/api/accountant/balance-sheet?companyId=${selectedCompanyId}`),
        fetch(`/api/accountant/profit-loss?companyId=${selectedCompanyId}`),
        fetch(`/api/accountant/cash-flow?companyId=${selectedCompanyId}`),
        fetch(`/api/accounting/chart-of-accounts?companyId=${selectedCompanyId}`),
        fetch(`/api/accounting/journal-entries?companyId=${selectedCompanyId}&limit=50`),
        fetch(`/api/accountant/trial-balance?companyId=${selectedCompanyId}`),
        fetch(`/api/accountant/mirror-profit?companyId=${selectedCompanyId}`)
      ]);

      // Process all responses in parallel for faster loading
      const [
        bankData, 
        expenseData, 
        loansData, 
        auditData,
        balanceSheetData,
        profitLossData,
        cashFlowData,
        chartOfAccountsData,
        journalEntriesData,
        trialBalanceData,
        mirrorProfitData
      ] = await Promise.all([
        bankRes.json(),
        expenseRes.json(),
        loansRes.json(),
        auditRes.json(),
        balanceSheetRes.json(),
        profitLossRes.json(),
        cashFlowRes.json(),
        chartOfAccountsRes.json(),
        journalEntriesRes.json(),
        trialBalanceRes.json(),
        mirrorProfitRes.json()
      ]);

      // Update all state at once
      setBankAccounts(bankData.bankAccounts || []);
      setBankTransactions(bankData.transactions || []);
      setExpenses(expenseData.expenses || []);
      
      const loansList = loansData.loans || [];
      setActiveLoans(loansList);
      // Update store for caching
      useLoansStore.getState().setActiveLoans(loansList);
      
      setAuditLogs(auditData.logs || []);
      setBalanceSheet(balanceSheetData);
      setProfitLoss(profitLossData);
      setCashFlow(cashFlowData);
      setChartOfAccounts(chartOfAccountsData.accounts || []);
      setJournalEntries(journalEntriesData.entries || []);
      setTrialBalance(trialBalanceData.trialBalance || []);
      setTrialBalanceSummary({
        totalDebits: trialBalanceData.totalDebits || 0,
        totalCredits: trialBalanceData.totalCredits || 0,
        isBalanced: trialBalanceData.isBalanced || false
      });
      setExtraEMIProfit(mirrorProfitData);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  const fetchPaymentPages = async () => {
    if (!selectedCompanyId) return;
    setLoadingPaymentPages(true);
    try {
      const res = await fetch(`/api/company-payment-pages?companyId=${selectedCompanyId}`);
      if (res.ok) {
        const data = await res.json();
        setPaymentPages(data.paymentPages || []);
      }
    } catch (error) {
      console.error('Error fetching payment pages:', error);
    } finally {
      setLoadingPaymentPages(false);
    }
  };

  // Initial load - fetch companies first
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Fetch all data when company changes
  useEffect(() => {
    if (selectedCompanyId) {
      fetchAllData();
    }
  }, [selectedCompanyId, dateRange, fetchAllData]);

  useEffect(() => {
    if (activeSection === 'payment-pages' && selectedCompanyId) {
      fetchPaymentPages();
    }
  }, [activeSection, selectedCompanyId]);

  // ============================================
  // ACTION HANDLERS
  // ============================================

  const handleAddBankAccount = async () => {
    if (!bankForm.bankName || !bankForm.accountNumber) {
      toast.error('Please fill bank name and account number');
      return;
    }
    
    // Optimistic update - add to UI immediately
    const tempId = 'temp-' + Date.now();
    const optimisticBank: BankAccount = {
      id: tempId,
      bankName: bankForm.bankName,
      accountNumber: bankForm.accountNumber,
      accountName: bankForm.accountName,
      currentBalance: bankForm.openingBalance,
      isDefault: bankForm.isDefault,
      ifscCode: bankForm.ifscCode,
      upiId: bankForm.upiId || null,
      isActive: true,
      companyId: selectedCompanyId
    } as BankAccount;
    
    setBankAccounts(prev => [...prev, optimisticBank]);
    setShowBankDialog(false);
    
    try {
      const res = await fetch('/api/accounting/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bankForm,
          companyId: selectedCompanyId
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success('Bank account added successfully');
        setBankForm({
          bankName: '', accountNumber: '', accountName: '', ownerName: '', ifscCode: '',
          branchName: '', accountType: 'CURRENT', openingBalance: 0, upiId: '', qrCodeUrl: '', isDefault: false
        });
        // Replace temp with real data
        fetchAllData(true);
      } else {
        // Revert optimistic update
        setBankAccounts(prev => prev.filter(b => b.id !== tempId));
        const error = await res.json();
        toast.error(error.error || 'Failed to add bank account');
      }
    } catch (error) {
      // Revert optimistic update
      setBankAccounts(prev => prev.filter(b => b.id !== tempId));
      toast.error('Failed to add bank account');
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.description || expenseForm.amount <= 0) {
      toast.error('Please fill description and amount');
      return;
    }
    
    // Optimistic update
    const tempId = 'temp-' + Date.now();
    const optimisticExpense: Expense = {
      id: tempId,
      expenseNumber: 'EXP-' + Date.now(),
      expenseType: expenseForm.expenseType,
      description: expenseForm.description,
      amount: Number(expenseForm.amount),
      paymentMode: expenseForm.paymentMode,
      paymentDate: new Date(expenseForm.paymentDate)
    } as Expense;
    
    setExpenses(prev => [optimisticExpense, ...prev]);
    setShowExpenseDialog(false);
    
    try {
      const res = await fetch('/api/accounting/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseForm,
          amount: Number(expenseForm.amount),
          paymentDate: new Date(expenseForm.paymentDate),
          companyId: selectedCompanyId,
          createdById: user?.id || 'system'
        })
      });
      
      if (res.ok) {
        toast.success('Expense recorded successfully');
        setExpenseForm({
          expenseType: 'MISCELLANEOUS', description: '', amount: 0,
          paymentMode: 'BANK_TRANSFER', paymentDate: format(new Date(), 'yyyy-MM-dd')
        });
        fetchAllData(true);
      } else {
        // Revert optimistic update
        setExpenses(prev => prev.filter(e => e.id !== tempId));
        const error = await res.json();
        toast.error(error.error || 'Failed to record expense');
      }
    } catch (error) {
      // Revert optimistic update
      setExpenses(prev => prev.filter(e => e.id !== tempId));
      toast.error('Failed to record expense');
    }
  };

  const handleScanTransactions = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/accounting/scan-loan-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: selectedCompanyId })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`Scanned ${data.transactionsFound || 0} transactions`);
        fetchAllData();
      } else {
        toast.error(data.error || 'Scan failed');
      }
    } catch (error) {
      toast.error('Failed to scan transactions');
    } finally {
      setScanning(false);
      setShowScanDialog(false);
    }
  };

  const handleExportCSV = (type: string, data: any[], headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${type}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Report downloaded');
  };

  const handleDeleteBankAccount = async () => {
    if (!bankToDelete) return;
    
    // Optimistic update - remove from UI immediately
    const bankIdToDelete = bankToDelete.id;
    const previousBankAccounts = [...bankAccounts];
    setBankAccounts(prev => prev.filter(b => b.id !== bankIdToDelete));
    setShowDeleteDialog(false);
    setBankToDelete(null);
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/accounting/bank-accounts?id=${bankIdToDelete}&permanent=true`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(`Bank account permanently deleted. ${data.deletedTransactions || 0} transactions removed.`);
      } else {
        // Revert optimistic update
        setBankAccounts(previousBankAccounts);
        toast.error(data.error || 'Failed to delete bank account');
      }
    } catch (error) {
      // Revert optimistic update
      setBankAccounts(previousBankAccounts);
      toast.error('Failed to delete bank account');
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteBank = (bank: BankAccount) => {
    setBankToDelete(bank);
    setShowDeleteDialog(true);
  };

  const handleSelectAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
    setActiveSection('ledger-view');
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const stats = {
    totalBankBalance: bankAccounts.reduce((sum, b) => sum + b.currentBalance, 0),
    totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
    totalLoans: activeLoans.length,
    totalOutstanding: activeLoans.reduce((sum, loan) => {
      return sum + loan.emiSchedules.reduce((s, e) => s + (e.totalAmount - e.paidAmount), 0);
    }, 0)
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  // ============================================
  // RENDER SECTION CONTENT
  // ============================================

  const renderSection = () => {
    switch (activeSection) {
      case 'ledger':
        return (
          <LedgerSection 
            selectedCompanyId={selectedCompanyId}
            activeLoans={activeLoans}
            bankAccounts={bankAccounts}
            bankTransactions={bankTransactions}
            journalEntries={journalEntries}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        );
      case 'balance-sheet':
        return (
          <BalanceSheetSection 
            balanceSheet={balanceSheet}
            onExportCSV={handleExportCSV}
            formatCurrency={formatCurrency}
          />
        );
      case 'profit-loss':
        return (
          <ProfitLossSection 
            profitLoss={profitLoss}
            expenses={expenses}
            activeLoans={activeLoans}
            totalExpenses={stats.totalExpenses}
            onExportCSV={handleExportCSV}
            formatCurrency={formatCurrency}
          />
        );
      case 'cash-flow':
        return (
          <CashFlowSection 
            cashFlow={cashFlow}
            extraEMIProfit={extraEMIProfit}
            bankTransactions={bankTransactions}
            totalExpenses={stats.totalExpenses}
            totalBankBalance={stats.totalBankBalance}
            onExportCSV={handleExportCSV}
            formatCurrency={formatCurrency}
          />
        );
      case 'bank':
        return (
          <BankSection 
            bankAccounts={bankAccounts}
            bankTransactions={bankTransactions}
            onAddBank={() => setShowBankDialog(true)}
            onDeleteBank={confirmDeleteBank}
            formatCurrency={formatCurrency}
            formatDateShort={formatDateShort}
          />
        );
      case 'payment-pages':
        return (
          <PaymentPagesSection 
            paymentPages={paymentPages}
            loading={loadingPaymentPages}
            onAddBank={() => setShowBankDialog(true)}
          />
        );
      case 'income':
        return (
          <IncomeSection 
            incomes={incomes}
            onAddIncome={() => setShowIncomeDialog(true)}
            formatCurrency={formatCurrency}
            formatDateShort={formatDateShort}
          />
        );
      case 'expense':
        return (
          <ExpenseSection 
            expenses={expenses}
            onAddExpense={() => setShowExpenseDialog(true)}
            formatCurrency={formatCurrency}
            formatDateShort={formatDateShort}
          />
        );
      case 'loan-portfolio':
        return (
          <LoanPortfolioSection 
            activeLoans={activeLoans}
            totalOutstanding={stats.totalOutstanding}
            formatCurrency={formatCurrency}
          />
        );
      case 'audit-trail':
        return <AuditTrailSection auditLogs={auditLogs} />;
      case 'day-book':
        return (
          <DayBookSection 
            bankAccounts={bankAccounts}
            bankTransactions={bankTransactions}
            journalEntries={journalEntries}
            selectedCompanyId={selectedCompanyId}
            formatCurrency={formatCurrency}
          />
        );
      case 'chart-of-accounts':
        return (
          <ChartOfAccountsSection 
            chartOfAccounts={chartOfAccounts}
            onRefresh={fetchAllData}
            onSelectAccount={handleSelectAccount}
            formatCurrency={formatCurrency}
          />
        );
      case 'ledger-view':
        return (
          <LedgerViewSection 
            chartOfAccounts={chartOfAccounts}
            activeLoans={activeLoans}
            selectedAccountId={selectedAccountId}
            selectedLoanId={selectedLoanId}
            accountLedger={accountLedger}
            loanLedger={loanLedger}
            onSelectAccount={setSelectedAccountId}
            onSelectLoan={setSelectedLoanId}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        );
      case 'trial-balance':
        return (
          <TrialBalanceSection 
            trialBalance={trialBalance}
            trialBalanceSummary={trialBalanceSummary}
            formatCurrency={formatCurrency}
          />
        );
      case 'journal-entries':
        return (
          <JournalEntriesSection 
            journalEntries={journalEntries}
            onRefresh={fetchAllData}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        );
      case 'profile':
        return <ProfileSection />;
      default:
        return (
          <OverviewSection 
            stats={stats}
            bankTransactions={bankTransactions}
            onOpenScanDialog={() => setShowScanDialog(true)}
            onOpenBankDialog={() => setShowBankDialog(true)}
            onOpenExpenseDialog={() => setShowExpenseDialog(true)}
            onOpenIncomeDialog={() => setShowIncomeDialog(true)}
            formatCurrency={formatCurrency}
            formatDateShort={formatDateShort}
          />
        );
    }
  };

  // ============================================
  // MENU ITEMS
  // ============================================

  const menuItems: MenuItem[] = [
    { id: 'overview', label: 'Overview', icon: Calculator },
    { id: 'ledger', label: 'Ledger', icon: BookOpen },
    { id: 'chart-of-accounts', label: 'Chart of Accounts', icon: BookOpen },
    { id: 'journal-entries', label: 'Journal Entries', icon: FileText },
    { id: 'ledger-view', label: 'Ledger View', icon: FileSpreadsheet },
    { id: 'trial-balance', label: 'Trial Balance', icon: DollarSign },
    { id: 'balance-sheet', label: 'Balance Sheet', icon: FileSpreadsheet },
    { id: 'profit-loss', label: 'Profit & Loss', icon: TrendingUp },
    { id: 'cash-flow', label: 'Cash Flow', icon: DollarSign },
    { id: 'bank', label: 'Bank', icon: Landmark },
    { id: 'payment-pages', label: 'Payment Pages', icon: QrCode },
    { id: 'income', label: 'Income', icon: ArrowUpRight },
    { id: 'expense', label: 'Expense', icon: ArrowDownRight },
    { id: 'loan-portfolio', label: 'Loan Portfolio', icon: CreditCard },
    { id: 'day-book', label: 'Day Book', icon: BookOpen },
    { id: 'audit-trail', label: 'Audit Trail', icon: Clock },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            {/* Left Section - Logo & Title */}
            <div className="flex items-center gap-3">
              {settings.companyLogo ? (
                <img src={settings.companyLogo} alt={settings.companyName || 'Company'} className="h-9 w-auto object-contain" />
              ) : (
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <Calculator className="h-5 w-5" />
                </div>
              )}
              <div>
                <h1 className="text-base font-bold leading-tight">{settings.companyName || 'Accountant Portal'}</h1>
                <p className="text-[10px] text-emerald-100">Gov of India Compliance</p>
              </div>
            </div>
            
            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Company Selector */}
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="w-36 h-8 bg-white/10 border-white/20 text-white text-sm">
                  <SelectValue placeholder="Select Company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      <span className="truncate text-sm">{company.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Scan Button */}
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => setShowScanDialog(true)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Scan
              </Button>

              {/* Refresh Button */}
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 w-8 p-0 bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => fetchAllData(true)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>

              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 p-0">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user?.profilePicture} alt={user?.name || 'User'} />
                      <AvatarFallback className="text-xs bg-emerald-500 text-white">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveSection('profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={async () => {
                      await signOut();
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r min-h-[calc(100vh-64px)] sticky top-16 flex flex-col">
          <nav className="p-2 space-y-1 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    isActive 
                      ? 'bg-emerald-50 text-emerald-700 font-medium' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>
          {/* Logout Button */}
          <div className="p-2 border-t">
            <button
              onClick={async () => {
                await signOut();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">Log Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center h-64"
              >
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </motion.div>
            ) : (
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderSection()}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Dialogs */}
      <BankDialog 
        open={showBankDialog}
        onOpenChange={setShowBankDialog}
        bankForm={bankForm}
        setBankForm={setBankForm}
        selectedCompany={selectedCompany}
        onSubmit={handleAddBankAccount}
      />

      <ExpenseDialog 
        open={showExpenseDialog}
        onOpenChange={setShowExpenseDialog}
        expenseForm={expenseForm}
        setExpenseForm={setExpenseForm}
        selectedCompany={selectedCompany}
        onSubmit={handleAddExpense}
      />

      <ScanDialog 
        open={showScanDialog}
        onOpenChange={setShowScanDialog}
        selectedCompany={selectedCompany}
        scanning={scanning}
        onSubmit={handleScanTransactions}
      />

      <DeleteBankDialog 
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        bankToDelete={bankToDelete}
        deleting={deleting}
        onSubmit={handleDeleteBankAccount}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
