'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { 
  Calculator, FileText, TrendingUp, DollarSign, Loader2, RefreshCw, 
  FileSpreadsheet, BookOpen, Landmark, ArrowUpRight, ArrowDownRight,
  CreditCard, BookMarked, Clock, LogOut, User, Wallet, ArrowUp, ArrowDown,
  Building2, Plus, Receipt, Upload, QrCode, Scan, CheckCircle, XCircle, AlertCircle,
  BookCopy
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// TYPES
// ============================================

interface Company {
  id: string;
  name: string;
  code: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  ifscCode?: string;
  branchName?: string;
  accountType?: string;
  currentBalance: number;
  isActive: boolean;
  isDefault: boolean;
  upiId?: string;
  qrCodeUrl?: string;
}

interface BankTransaction {
  id: string;
  transactionType: string;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType: string;
  transactionDate: Date | string;
}

interface CashBookEntry {
  id: string;
  entryType: string;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType: string;
  entryDate: Date;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: Date;
  narration: string;
  referenceType: string;
  totalDebit: number;
  totalCredit: number;
  paymentMode: string;
  lines: Array<{
    account: { accountCode: string; accountName: string };
    debitAmount: number;
    creditAmount: number;
  }>;
}

interface ProfitLossData {
  income: Array<{ accountCode: string; accountName: string; amount: number }>;
  expenses: Array<{ accountCode: string; accountName: string; amount: number }>;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

interface BalanceSheetData {
  company: { id: string; name: string; code: string };
  financialYear: string;
  yearOptions: Array<{ name: string; startDate: Date; endDate: Date }>;
  leftSide: {
    items: Array<{
      name: string;
      amount: number;
      type: string;
      canAdd?: boolean;
      isCalculated?: boolean;
      formula?: string;
    }>;
    total: number;
  };
  rightSide: {
    items: Array<{
      name: string;
      amount: number;
      type: string;
      count?: number;
      canAdd?: boolean;
      details?: Array<{ bankName: string; accountNumber: string; balance: number }>;
    }>;
    total: number;
  };
  summary: {
    cashBookBalance: number;
    bankBalance: number;
    investMoney: number;
    equity: number;
    borrowedMoney: number;
    profitLoss: number;
    finalEquity: number;
    loanPrincipal: number;
    interestReceivable: number;
    onlineLoansCount: number;
    offlineLoansCount: number;
    totalIncome: number;
    totalExpenses: number;
    isBalanced: boolean;
  };
}

interface CashFlowData {
  inflows: Array<{ source: string; amount: number }>;
  outflows: Array<{ source: string; amount: number }>;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SimplifiedAccountantDashboard() {
  const { user, signOut } = useAuth();
  const { settings } = useSettings();
  
  // State
  const [loading, setLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('profit-loss');
  
  // Company Filter
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  
  // Date Filter
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  
  // Year Filter for Balance Sheet
  const [selectedYear, setSelectedYear] = useState<string>('current');
  
  // Data States
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [cashBookEntries, setCashBookEntries] = useState<CashBookEntry[]>([]);
  const [cashBookBalance, setCashBookBalance] = useState(0);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [profitLoss, setProfitLoss] = useState<ProfitLossData | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowData | null>(null);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);

  // Expense/Income Entry Dialog State
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [entryType, setEntryType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryReason, setEntryReason] = useState('');
  const [entryPaymentMode, setEntryPaymentMode] = useState<'BANK' | 'CASH'>('BANK');
  const [entryBankAccountId, setEntryBankAccountId] = useState('');
  const [entryCategory, setEntryCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add Bank Account Dialog State
  const [showBankAccountDialog, setShowBankAccountDialog] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [accountType, setAccountType] = useState('CURRENT');
  const [openingBalance, setOpeningBalance] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);
  const [addingBankAccount, setAddingBankAccount] = useState(false);

  // Add Cash Entry Dialog State
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [cashEntryType, setCashEntryType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [cashAmount, setCashAmount] = useState('');
  const [cashDescription, setCashDescription] = useState('');
  const [addingCashEntry, setAddingCashEntry] = useState(false);

  // Scan/Reconcile Dialog State
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  // Expense Categories
  const expenseCategories = [
    'Office Rent',
    'Electricity Bill',
    'Water Bill',
    'Internet/Phone Bill',
    'Salary',
    'Travel Expense',
    'Office Supplies',
    'Marketing/Advertising',
    'Maintenance',
    'Insurance',
    'Legal/Professional Fees',
    'Bank Charges',
    'Miscellaneous'
  ];

  // Income Categories
  const incomeCategories = [
    'Interest Income',
    'Loan Repayment Received',
    'Commission Income',
    'Processing Fees',
    'Late Fee/Penalty',
    'Other Income'
  ];

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

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchCompanies = useCallback(async () => {
    setCompaniesLoading(true);
    try {
      const res = await fetch('/api/company');
      if (res.ok) {
        const data = await res.json();
        const companiesList = data.companies || [];
        setCompanies(companiesList);
        return companiesList;
      }
      return [];
    } catch (error) {
      console.error('Error fetching companies:', error);
      return [];
    } finally {
      setCompaniesLoading(false);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!selectedCompanyId) return;
    
    setLoading(true);
    try {
      // Handle "current" as no year filter (current financial year)
      const yearParam = selectedYear !== 'current' ? selectedYear : '';
      const balanceSheetUrl = yearParam 
        ? `/api/accountant/balance-sheet?companyId=${selectedCompanyId}&year=${yearParam}`
        : `/api/accountant/balance-sheet?companyId=${selectedCompanyId}`;
      
      const [
        bankRes,
        profitLossRes,
        balanceSheetRes,
        cashFlowRes,
        journalRes,
        cashBookRes,
        loansRes
      ] = await Promise.all([
        fetch(`/api/accountant/bank-accounts?companyId=${selectedCompanyId}`),
        fetch(`/api/accountant/profit-loss?companyId=${selectedCompanyId}`),
        fetch(balanceSheetUrl),
        fetch(`/api/accountant/cash-flow?companyId=${selectedCompanyId}`),
        fetch(`/api/accounting/journal-entries?companyId=${selectedCompanyId}&limit=100`),
        fetch(`/api/accountant/cashbook?companyId=${selectedCompanyId}`),
        fetch(`/api/loan/all-active`)
      ]);

      // Parse JSON responses safely
      const bankData = bankRes.ok ? await bankRes.json() : { bankAccounts: [], transactions: [] };
      const profitLossData = profitLossRes.ok ? await profitLossRes.json() : null;
      const balanceSheetData = balanceSheetRes.ok ? await balanceSheetRes.json() : null;
      const cashFlowData = cashFlowRes.ok ? await cashFlowRes.json() : null;
      const journalData = journalRes.ok ? await journalRes.json() : { entries: [] };
      const cashBookData = cashBookRes.ok ? await cashBookRes.json() : { entries: [], currentBalance: 0 };

      const loansData = loansRes.ok ? await loansRes.json() : { loans: [] };

      // Filter loans by selected company
      const companyLoans = (loansData.loans || []).filter((loan: any) => loan.company?.id === selectedCompanyId);

      setBankAccounts(bankData.bankAccounts || []);
      setBankTransactions(bankData.transactions || []);
      setProfitLoss(profitLossData);
      setBalanceSheet(balanceSheetData);
      setCashFlow(cashFlowData);
      setJournalEntries(journalData.entries || []);
      setCashBookEntries(cashBookData.entries || []);
      setCashBookBalance(cashBookData.currentBalance || 0);
      setActiveLoans(companyLoans);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, selectedYear]);

  // Handle Expense/Income Entry Submission
  const handleEntrySubmit = async () => {
    if (!selectedCompanyId) {
      toast.error('Please select a company first');
      return;
    }
    if (!entryAmount || parseFloat(entryAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!entryReason.trim()) {
      toast.error('Please enter a reason/description');
      return;
    }
    if (!entryCategory) {
      toast.error('Please select a category');
      return;
    }
    if (entryPaymentMode === 'BANK' && !entryBankAccountId && bankAccounts.length > 0) {
      toast.error('Please select a bank account');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/accountant/manual-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          entryType,
          amount: parseFloat(entryAmount),
          reason: entryReason,
          category: entryCategory,
          paymentMode: entryPaymentMode,
          bankAccountId: entryPaymentMode === 'BANK' ? entryBankAccountId : null,
          createdById: user?.id
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`${entryType === 'EXPENSE' ? 'Expense' : 'Income'} entry recorded successfully`);
        setShowEntryDialog(false);
        // Reset form
        setEntryAmount('');
        setEntryReason('');
        setEntryCategory('');
        setEntryBankAccountId('');
        setEntryType('EXPENSE');
        // Refresh data
        fetchAllData();
      } else {
        toast.error(data.error || 'Failed to record entry');
      }
    } catch (error) {
      console.error('Error submitting entry:', error);
      toast.error('Failed to record entry');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset dialog when opening
  const openEntryDialog = () => {
    setEntryAmount('');
    setEntryReason('');
    setEntryCategory('');
    setEntryBankAccountId(bankAccounts.find(b => b.isDefault)?.id || '');
    setEntryType('EXPENSE');
    setShowEntryDialog(true);
  };

  // Handle Add Bank Account
  const handleAddBankAccount = async () => {
    if (!selectedCompanyId) {
      toast.error('Please select a company first');
      return;
    }
    if (!bankName.trim()) {
      toast.error('Please enter bank name');
      return;
    }
    if (!accountNumber.trim()) {
      toast.error('Please enter account number');
      return;
    }
    if (!accountName.trim()) {
      toast.error('Please enter account holder name');
      return;
    }

    setAddingBankAccount(true);
    try {
      // Upload QR code if provided
      let qrCodeUrl = '';
      if (qrCodeFile) {
        const formData = new FormData();
        formData.append('file', qrCodeFile);
        formData.append('documentType', 'qr_code');
        formData.append('companyId', selectedCompanyId);
        formData.append('uploadedBy', user?.id || '');

        const uploadRes = await fetch('/api/upload/document', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.url) {
          qrCodeUrl = uploadData.url;
        }
      }

      const response = await fetch('/api/bank-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          bankName,
          accountNumber,
          accountName,
          ifscCode,
          branchName,
          accountType,
          openingBalance: parseFloat(openingBalance) || 0,
          isDefault,
          upiId,
          qrCodeUrl
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Bank account added successfully');
        setShowBankAccountDialog(false);
        // Reset form
        setBankName('');
        setAccountNumber('');
        setAccountName('');
        setIfscCode('');
        setBranchName('');
        setAccountType('CURRENT');
        setOpeningBalance('');
        setIsDefault(false);
        setUpiId('');
        setQrCodeFile(null);
        setQrCodePreview(null);
        // Refresh data
        fetchAllData();
      } else {
        toast.error(data.error || 'Failed to add bank account');
      }
    } catch (error) {
      console.error('Error adding bank account:', error);
      toast.error('Failed to add bank account');
    } finally {
      setAddingBankAccount(false);
    }
  };

  // Handle Add Cash Entry
  const handleAddCashEntry = async () => {
    if (!selectedCompanyId) {
      toast.error('Please select a company first');
      return;
    }
    if (!cashAmount || parseFloat(cashAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!cashDescription.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setAddingCashEntry(true);
    try {
      const response = await fetch('/api/accountant/cashbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          entryType: cashEntryType,
          amount: parseFloat(cashAmount),
          description: cashDescription,
          createdById: user?.id
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Cash ${cashEntryType === 'CREDIT' ? 'added' : 'withdrawn'} successfully`);
        setShowCashDialog(false);
        // Reset form
        setCashAmount('');
        setCashDescription('');
        setCashEntryType('CREDIT');
        // Refresh data
        fetchAllData();
      } else {
        toast.error(data.error || 'Failed to add cash entry');
      }
    } catch (error) {
      console.error('Error adding cash entry:', error);
      toast.error('Failed to add cash entry');
    } finally {
      setAddingCashEntry(false);
    }
  };

  // Handle Scan/Reconcile
  const handleScanReconcile = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const response = await fetch('/api/accountant/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId || undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setScanResult(data);
        toast.success(`Reconciliation completed! Created: ${data.summary?.transactionsCreated || 0}, Deleted: ${data.summary?.transactionsDeleted || 0}`);
        // Refresh data
        fetchAllData();
      } else {
        toast.error(data.error || 'Failed to reconcile');
        setScanResult({ error: data.error || 'Failed to reconcile' });
      }
    } catch (error) {
      console.error('Error during reconcile:', error);
      toast.error('Failed to reconcile');
      setScanResult({ error: 'Failed to reconcile' });
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    const loadCompanies = async () => {
      const companiesList = await fetchCompanies();
      if (companiesList.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(companiesList[0].id);
      }
    };
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchAllData();
    }
  }, [selectedCompanyId, dateRange, fetchAllData]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  
  // Check if this is Company 3 (limited sections) - only by company code, NOT by array index
  const isCompany3 = selectedCompany?.code === 'C3';
  
  // Total bank balance
  const totalBankBalance = bankAccounts.reduce((sum, b) => sum + b.currentBalance, 0);

  // ============================================
  // MENU ITEMS - Based on Company
  // ============================================

  const company12MenuItems = [
    { id: 'profit-loss', label: 'Profit & Loss', icon: TrendingUp },
    { id: 'balance-sheet', label: 'Balance Sheet', icon: FileSpreadsheet },
    { id: 'bank-accounts', label: 'Bank Accounts', icon: Landmark },
    { id: 'cash-flow', label: 'Cash Flow', icon: DollarSign },
    { id: 'daybook', label: 'Daybook', icon: BookOpen },
    { id: 'cashbook', label: 'Cashbook', icon: Wallet },
    { id: 'ledger', label: 'Ledger', icon: BookCopy },
  ];

  const company3MenuItems = [
    { id: 'cash-flow', label: 'Cash Flow', icon: DollarSign },
    { id: 'daybook', label: 'Daybook', icon: BookOpen },
    { id: 'cashbook', label: 'Cashbook', icon: Wallet },
    { id: 'ledger', label: 'Ledger', icon: BookCopy },
  ];

  const menuItems = isCompany3 ? company3MenuItems : company12MenuItems;

  // Set default section when company changes
  useEffect(() => {
    // When switching companies, reset to the default section for that company type
    if (isCompany3) {
      setActiveSection('cash-flow');
    } else {
      setActiveSection('profit-loss');
    }
  }, [selectedCompanyId]); // Only run when company selection changes

  // ============================================
  // RENDER SECTION CONTENT
  // ============================================

  const renderSection = () => {
    switch (activeSection) {
      case 'profit-loss':
        return <ProfitLossSection data={profitLoss} formatCurrency={formatCurrency} />;
      case 'balance-sheet':
        return <BalanceSheetSection 
          data={balanceSheet} 
          formatCurrency={formatCurrency} 
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />;
      case 'bank-accounts':
        return <BankAccountsSection 
          accounts={bankAccounts} 
          transactions={bankTransactions} 
          totalBalance={totalBankBalance}
          formatCurrency={formatCurrency} 
          formatDate={formatDate}
          onAddBankAccount={() => setShowBankAccountDialog(true)}
        />;
      case 'cash-flow':
        return <CashFlowSection 
          data={cashFlow} 
          cashBookBalance={cashBookBalance}
          bankBalance={totalBankBalance}
          formatCurrency={formatCurrency} 
        />;
      case 'daybook':
        return <DaybookSection 
          entries={journalEntries} 
          formatCurrency={formatCurrency} 
          formatDate={formatDate}
        />;
      case 'cashbook':
        return <CashbookSection 
          entries={cashBookEntries} 
          currentBalance={cashBookBalance}
          formatCurrency={formatCurrency} 
          formatDate={formatDate}
          onAddCash={() => setShowCashDialog(true)}
        />;
      case 'ledger':
        return <LedgerSectionInline 
          selectedCompanyId={selectedCompanyId}
          activeLoans={activeLoans}
          bankAccounts={bankAccounts}
          bankTransactions={bankTransactions}
          journalEntries={journalEntries}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />;
      default:
        return <ProfitLossSection data={profitLoss} formatCurrency={formatCurrency} />;
    }
  };

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
                <h1 className="text-base font-bold leading-tight">Accountant Portal</h1>
                <p className="text-[10px] text-emerald-100">{selectedCompany?.name || 'Select Company'}</p>
              </div>
            </div>
            
            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Company Selector */}
              <Select 
                value={selectedCompanyId || undefined} 
                onValueChange={setSelectedCompanyId}
                disabled={companiesLoading}
              >
                <SelectTrigger className="w-36 h-8 bg-white/10 border-white/20 text-white text-sm">
                  {companiesLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    <SelectValue placeholder="Select Company" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {companies.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-gray-500">
                      No companies found
                    </div>
                  ) : (
                    companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        <span className="truncate text-sm">{company.name}</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {/* Add Entry Button */}
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 px-3 bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={openEntryDialog}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">Entry</span>
              </Button>

              {/* Scan Button */}
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 px-3 bg-purple-500/80 border-purple-400/50 text-white hover:bg-purple-600"
                onClick={() => {
                  setScanResult(null);
                  setShowScanDialog(true);
                }}
              >
                <Scan className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">Scan</span>
              </Button>

              {/* Refresh Button */}
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 w-8 p-0 bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => fetchAllData()}
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
          
          {/* Company Type Indicator */}
          <div className="p-3 border-t">
            <Badge variant={isCompany3 ? 'secondary' : 'default'} className="w-full justify-center">
              {selectedCompany?.name || 'Select Company'} - {isCompany3 ? 'Cash Only' : 'Full Accounting'}
            </Badge>
          </div>
          
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
            {companiesLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-64 gap-4"
              >
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                <p className="text-gray-500">Loading companies...</p>
              </motion.div>
            ) : !selectedCompanyId ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-64 gap-4"
              >
                <Building2 className="h-12 w-12 text-gray-300" />
                <p className="text-gray-500">Please select a company to view data</p>
              </motion.div>
            ) : loading ? (
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

      {/* Expense/Income Entry Dialog */}
      <Dialog open={showEntryDialog} onOpenChange={setShowEntryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              Record Entry
            </DialogTitle>
            <DialogDescription>
              Record an expense or income entry for {selectedCompany?.name || 'the selected company'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Entry Type */}
            <div className="space-y-2">
              <Label>Entry Type</Label>
              <RadioGroup 
                value={entryType} 
                onValueChange={(v) => setEntryType(v as 'EXPENSE' | 'INCOME')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="EXPENSE" id="expense" />
                  <Label htmlFor="expense" className="text-red-600 font-medium cursor-pointer">Expense</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="INCOME" id="income" />
                  <Label htmlFor="income" className="text-green-600 font-medium cursor-pointer">Income</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={entryAmount}
                onChange={(e) => setEntryAmount(e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={entryCategory} onValueChange={setEntryCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(entryType === 'EXPENSE' ? expenseCategories : incomeCategories).map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Mode */}
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <RadioGroup 
                value={entryPaymentMode} 
                onValueChange={(v) => setEntryPaymentMode(v as 'BANK' | 'CASH')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="BANK" id="bank" />
                  <Label htmlFor="bank" className="cursor-pointer">Bank</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CASH" id="cash" />
                  <Label htmlFor="cash" className="cursor-pointer">Cash</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Bank Account (if Bank mode) */}
            {entryPaymentMode === 'BANK' && bankAccounts.length > 0 && (
              <div className="space-y-2">
                <Label>Bank Account</Label>
                <Select value={entryBankAccountId} onValueChange={setEntryBankAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.bankName} - ****{acc.accountNumber.slice(-4)} ({formatCurrency(acc.currentBalance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reason/Description */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason / Description</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for this entry..."
                value={entryReason}
                onChange={(e) => setEntryReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEntryDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEntrySubmit}
              disabled={submitting}
              className={entryType === 'EXPENSE' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                `Record ${entryType === 'EXPENSE' ? 'Expense' : 'Income'}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Bank Account Dialog */}
      <Dialog open={showBankAccountDialog} onOpenChange={setShowBankAccountDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-blue-600" />
              Add Bank Account
            </DialogTitle>
            <DialogDescription>
              Add a new bank account for {selectedCompany?.name || 'the selected company'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Bank Details Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Bank Details</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input
                    id="bankName"
                    placeholder="e.g., State Bank of India"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branchName">Branch Name</Label>
                  <Input
                    id="branchName"
                    placeholder="e.g., Main Branch"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number *</Label>
                  <Input
                    id="accountNumber"
                    placeholder="Enter account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    placeholder="e.g., SBIN0001234"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Holder Name *</Label>
                  <Input
                    id="accountName"
                    placeholder="Enter account holder name"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountType">Account Type</Label>
                  <Select value={accountType} onValueChange={setAccountType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CURRENT">Current</SelectItem>
                      <SelectItem value="SAVINGS">Savings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="openingBalance">Opening Balance (₹)</Label>
                  <Input
                    id="openingBalance"
                    type="number"
                    placeholder="0"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                  />
                </div>

                <div className="flex items-end pb-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="isDefault" className="cursor-pointer text-sm">Set as default account</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Display Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Payment Display (for Customer Payment Page)</h4>
              
              <div className="space-y-2">
                <Label htmlFor="upiId" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-purple-600" />
                  UPI ID
                </Label>
                <Input
                  id="upiId"
                  placeholder="e.g., companyname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
                <p className="text-xs text-gray-500">This UPI ID will be shown on customer payment page</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-blue-600" />
                  QR Code Image
                </Label>
                <div className="border-2 border-dashed rounded-lg p-4">
                  <input
                    type="file"
                    id="qr-code-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error('File size must be less than 5MB');
                          return;
                        }
                        setQrCodeFile(file);
                        const reader = new FileReader();
                        reader.onload = (ev) => setQrCodePreview(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {qrCodePreview ? (
                    <div className="relative">
                      <img src={qrCodePreview} alt="QR Code Preview" className="max-h-32 mx-auto rounded" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-0 right-0 bg-red-100 hover:bg-red-200 text-red-600"
                        onClick={() => {
                          setQrCodeFile(null);
                          setQrCodePreview(null);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label htmlFor="qr-code-upload" className="cursor-pointer flex flex-col items-center text-gray-500">
                      <Upload className="h-8 w-8 mb-2" />
                      <span className="text-sm">Click to upload QR Code</span>
                      <span className="text-xs text-gray-400">PNG, JPG up to 5MB</span>
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-500">This QR code will be shown on customer payment page for scanning</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBankAccountDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddBankAccount}
              disabled={addingBankAccount}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {addingBankAccount ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Bank Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Cash Entry Dialog */}
      <Dialog open={showCashDialog} onOpenChange={setShowCashDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-amber-600" />
              Add Cash Entry
            </DialogTitle>
            <DialogDescription>
              Record a cash transaction for {selectedCompany?.name || 'the selected company'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Entry Type *</Label>
              <RadioGroup 
                value={cashEntryType} 
                onValueChange={(v) => setCashEntryType(v as 'CREDIT' | 'DEBIT')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CREDIT" id="credit" />
                  <Label htmlFor="credit" className="text-green-600 font-medium cursor-pointer">Cash In (+)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="DEBIT" id="debit" />
                  <Label htmlFor="debit" className="text-red-600 font-medium cursor-pointer">Cash Out (-)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cashAmount">Amount (₹) *</Label>
              <Input
                id="cashAmount"
                type="number"
                placeholder="Enter amount"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cashDescription">Description *</Label>
              <Textarea
                id="cashDescription"
                placeholder="Enter description for this cash entry..."
                value={cashDescription}
                onChange={(e) => setCashDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCashDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddCashEntry}
              disabled={addingCashEntry}
              className={cashEntryType === 'CREDIT' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {addingCashEntry ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `${cashEntryType === 'CREDIT' ? 'Add Cash' : 'Withdraw Cash'}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scan/Reconcile Dialog */}
      <Dialog open={showScanDialog} onOpenChange={setShowScanDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-purple-600" />
              Scan & Reconcile Transactions
            </DialogTitle>
            <DialogDescription>
              Scan all loans and transactions to create missing entries and delete orphaned records
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Info Box */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                <div className="text-sm text-purple-800">
                  <p className="font-medium mb-1">What this scan does:</p>
                  <ul className="list-disc list-inside space-y-1 text-purple-700">
                    <li>Creates missing bank/cashbook transactions for loan disbursements</li>
                    <li>Creates missing transactions for EMI payments received</li>
                    <li>Deletes orphaned transactions where the loan no longer exists</li>
                    <li>Recalculates all account balances</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Scan Result */}
            {scanResult && (
              <div className={`border rounded-lg p-4 ${scanResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-start gap-3">
                  {scanResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${scanResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {scanResult.success ? 'Reconciliation Completed!' : 'Error'}
                    </p>
                    
                    {scanResult.success && scanResult.summary && (
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white rounded p-2 border">
                          <p className="text-gray-500">Loans Processed</p>
                          <p className="text-xl font-bold">{scanResult.summary.loansProcessed}</p>
                        </div>
                        <div className="bg-white rounded p-2 border">
                          <p className="text-gray-500">Transactions Created</p>
                          <p className="text-xl font-bold text-green-600">{scanResult.summary.transactionsCreated}</p>
                        </div>
                        <div className="bg-white rounded p-2 border">
                          <p className="text-gray-500">Orphaned Deleted</p>
                          <p className="text-xl font-bold text-red-600">{scanResult.summary.transactionsDeleted}</p>
                        </div>
                        <div className="bg-white rounded p-2 border">
                          <p className="text-gray-500">Balance Adjustment</p>
                          <p className="text-xl font-bold text-blue-600">
                            {formatCurrency(Math.abs(scanResult.summary.bankBalanceAdjustment + scanResult.summary.cashbookBalanceAdjustment))}
                          </p>
                        </div>
                      </div>
                    )}

                    {scanResult.error && (
                      <p className="text-red-600 mt-2">{scanResult.error}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Created Transactions List */}
            {scanResult?.created && scanResult.created.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-green-50 px-4 py-2 border-b">
                  <p className="font-medium text-green-800">Created Transactions ({scanResult.created.length})</p>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Loan</th>
                        <th className="text-right p-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanResult.created.slice(0, 10).map((item: any, idx: number) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">
                            <Badge variant={item.type.includes('DISBURSEMENT') ? 'destructive' : 'default'} className="text-xs">
                              {item.type}
                            </Badge>
                          </td>
                          <td className="p-2">{item.loanNo}</td>
                          <td className="p-2 text-right font-medium">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {scanResult.created.length > 10 && (
                    <p className="text-center text-gray-500 text-xs py-2">
                      And {scanResult.created.length - 10} more...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Deleted Transactions List */}
            {scanResult?.deleted && scanResult.deleted.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-red-50 px-4 py-2 border-b">
                  <p className="font-medium text-red-800">Deleted Orphaned Transactions ({scanResult.deleted.length})</p>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Reference</th>
                        <th className="text-right p-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanResult.deleted.slice(0, 10).map((item: any, idx: number) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">
                            <Badge variant="outline" className="text-xs">{item.referenceType}</Badge>
                          </td>
                          <td className="p-2 text-xs text-gray-500">{item.description}</td>
                          <td className="p-2 text-right font-medium text-red-600">-{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {scanResult.deleted.length > 10 && (
                    <p className="text-center text-gray-500 text-xs py-2">
                      And {scanResult.deleted.length - 10} more...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScanDialog(false)}>
              Close
            </Button>
            <Button 
              onClick={handleScanReconcile}
              disabled={scanning}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {scanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Scan className="h-4 w-4 mr-2" />
                  Start Scan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// SECTION COMPONENTS
// ============================================

function ProfitLossSection({ data, formatCurrency }: { data: ProfitLossData | null; formatCurrency: (a: number) => string }) {
  if (!data) {
    return <Card><CardContent className="p-6 text-center text-gray-500">No data available</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            Profit & Loss Statement
          </CardTitle>
          <CardDescription>Income and Expenses for the period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Income */}
            <div>
              <h3 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4" />
                INCOME
              </h3>
              <div className="space-y-2">
                {data.income.map((item) => (
                  <div key={item.accountCode} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">{item.accountName}</span>
                    <span className="font-medium text-green-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 bg-green-50 px-3 rounded font-semibold">
                  <span>Total Income</span>
                  <span className="text-green-600">{formatCurrency(data.totalIncome)}</span>
                </div>
              </div>
            </div>

            {/* Expenses */}
            <div>
              <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4" />
                EXPENSES
              </h3>
              <div className="space-y-2">
                {data.expenses.map((item) => (
                  <div key={item.accountCode} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">{item.accountName}</span>
                    <span className="font-medium text-red-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 bg-red-50 px-3 rounded font-semibold">
                  <span>Total Expenses</span>
                  <span className="text-red-600">{formatCurrency(data.totalExpenses)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Profit */}
          <div className={`mt-6 p-4 rounded-lg ${data.netProfit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">NET PROFIT / (LOSS)</span>
              <span className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data.netProfit)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BalanceSheetSection({ 
  data, 
  formatCurrency,
  selectedYear,
  onYearChange,
  onAddEquity,
  onAddBorrowedMoney,
  onAddInvestMoney
}: { 
  data: BalanceSheetData | null; 
  formatCurrency: (a: number) => string;
  selectedYear: string;
  onYearChange: (year: string) => void;
  onAddEquity: () => void;
  onAddBorrowedMoney: () => void;
  onAddInvestMoney: () => void;
}) {
  if (!data) {
    return <Card><CardContent className="p-6 text-center text-gray-500">No data available</CardContent></Card>;
  }

  // Extract year from yearOptions for dropdown
  const yearOptions = data.yearOptions || [];

  return (
    <div className="space-y-6">
      {/* Year Selector */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-500" />
              Balance Sheet (Trial Balance)
            </CardTitle>
            <Select value={selectedYear} onValueChange={onYearChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Year</SelectItem>
                {yearOptions.map((opt, idx) => (
                  <SelectItem key={idx} value={opt.name.replace('FY ', '').split('-')[0]}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CardDescription>
            {data.company?.name} - {data.financialYear}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Balance Sheet Table */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x">
            {/* LEFT SIDE - Liabilities (Source of Funds) */}
            <div className="p-4">
              <h3 className="text-lg font-bold text-center bg-red-100 text-red-800 py-2 rounded-t-lg mb-4">
                LEFT SIDE (Liabilities)
              </h3>
              <div className="space-y-2">
                {data.leftSide?.items?.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {item.type === 'EQUITY' && <TrendingUp className="h-4 w-4 text-green-600" />}
                        {item.type === 'BORROWED_MONEY' && <DollarSign className="h-4 w-4 text-orange-600" />}
                        {item.type === 'FINAL_EQUITY' && <Calculator className="h-4 w-4 text-purple-600" />}
                        <span className="font-medium">{item.name}</span>
                        {item.isCalculated && (
                          <span className="text-xs text-gray-500 ml-1">(Auto)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{formatCurrency(item.amount)}</span>
                        {item.canAdd && item.type === 'EQUITY' && (
                          <Button size="sm" variant="outline" onClick={onAddEquity} className="h-7 text-xs">
                            <Plus className="h-3 w-3 mr-1" />Add
                          </Button>
                        )}
                        {item.canAdd && item.type === 'BORROWED_MONEY' && (
                          <Button size="sm" variant="outline" onClick={onAddBorrowedMoney} className="h-7 text-xs">
                            <Plus className="h-3 w-3 mr-1" />Add
                          </Button>
                        )}
                      </div>
                    </div>
                    {item.formula && (
                      <p className="text-xs text-gray-500 mt-1">{item.formula}</p>
                    )}
                  </div>
                ))}
              </div>
              {/* Left Total */}
              <div className="mt-4 bg-red-600 text-white rounded-lg p-3 flex justify-between items-center">
                <span className="text-lg font-bold">TOTAL</span>
                <span className="text-xl font-bold">{formatCurrency(data.leftSide?.total || 0)}</span>
              </div>
            </div>

            {/* RIGHT SIDE - Assets (How Funds Are Used) */}
            <div className="p-4 bg-gray-50">
              <h3 className="text-lg font-bold text-center bg-green-100 text-green-800 py-2 rounded-t-lg mb-4">
                RIGHT SIDE (Assets)
              </h3>
              <div className="space-y-2">
                {data.rightSide?.items?.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {item.type === 'BANK' && <Landmark className="h-4 w-4 text-blue-600" />}
                        {item.type === 'CASH' && <Wallet className="h-4 w-4 text-amber-600" />}
                        {item.type === 'INVEST_MONEY' && <ArrowUpRight className="h-4 w-4 text-indigo-600" />}
                        {item.type === 'LOAN_PRINCIPAL' && <CreditCard className="h-4 w-4 text-purple-600" />}
                        {item.type === 'INTEREST_RECEIVABLE' && <TrendingUp className="h-4 w-4 text-green-600" />}
                        <span className="font-medium">
                          {item.name}
                          {item.count !== undefined && <span className="text-gray-500 text-sm ml-1">({item.count} loans)</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{formatCurrency(item.amount)}</span>
                        {item.canAdd && item.type === 'INVEST_MONEY' && (
                          <Button size="sm" variant="outline" onClick={onAddInvestMoney} className="h-7 text-xs">
                            <Plus className="h-3 w-3 mr-1" />Add
                          </Button>
                        )}
                      </div>
                    </div>
                    {/* Show bank account details */}
                    {item.details && item.details.length > 0 && (
                      <div className="mt-2 pl-6 space-y-1 text-sm text-gray-600">
                        {item.details.map((detail, dIdx) => (
                          <div key={dIdx} className="flex justify-between">
                            <span>{detail.bankName} - {detail.accountNumber}</span>
                            <span>{formatCurrency(detail.balance)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Right Total */}
              <div className="mt-4 bg-green-600 text-white rounded-lg p-3 flex justify-between items-center">
                <span className="text-lg font-bold">TOTAL</span>
                <span className="text-xl font-bold">{formatCurrency(data.rightSide?.total || 0)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Verification */}
      <Card className={`${data.summary?.isBalanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {data.summary?.isBalanced ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-600" />
              )}
              <span className={`font-medium ${data.summary?.isBalanced ? 'text-green-800' : 'text-red-800'}`}>
                {data.summary?.isBalanced ? 'Balance Sheet is Balanced!' : 'Balance Sheet is NOT Balanced'}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Left: {formatCurrency(data.leftSide?.total || 0)} | Right: {formatCurrency(data.rightSide?.total || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-green-100 text-sm">Equity</p>
            <p className="text-xl font-bold">{formatCurrency(data.summary?.equity || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-orange-100 text-sm">Borrowed</p>
            <p className="text-xl font-bold">{formatCurrency(data.summary?.borrowedMoney || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4 text-center">
            <Landmark className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-blue-100 text-sm">Bank Balance</p>
            <p className="text-xl font-bold">{formatCurrency(data.summary?.bankBalance || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
          <CardContent className="p-4 text-center">
            <Wallet className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-amber-100 text-sm">Cashbook</p>
            <p className="text-xl font-bold">{formatCurrency(data.summary?.cashBookBalance || 0)}</p>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-r ${data.summary?.profitLoss >= 0 ? 'from-purple-500 to-purple-600' : 'from-red-500 to-red-600'} text-white`}>
          <CardContent className="p-4 text-center">
            <Calculator className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-purple-100 text-sm">{data.summary?.profitLoss >= 0 ? 'Profit' : 'Loss'}</p>
            <p className="text-xl font-bold">{formatCurrency(Math.abs(data.summary?.profitLoss || 0))}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BankAccountsSection({ 
  accounts, 
  transactions, 
  totalBalance,
  formatCurrency, 
  formatDate,
  onAddBankAccount
}: { 
  accounts: BankAccount[]; 
  transactions: BankTransaction[];
  totalBalance: number;
  formatCurrency: (a: number) => string; 
  formatDate: (d: Date | string) => string;
  onAddBankAccount?: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Bank Balance</p>
              <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
            </div>
            <div className="flex items-center gap-3">
              {onAddBankAccount && (
                <Button 
                  onClick={onAddBankAccount}
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bank Account
                </Button>
              )}
              <Landmark className="h-12 w-12 text-blue-200" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {accounts.map((account) => (
              <div key={account.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{account.bankName}</p>
                      <p className="text-sm text-gray-500">{account.accountNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatCurrency(account.currentBalance)}</p>
                    {account.isDefault && <Badge variant="secondary">Default</Badge>}
                  </div>
                </div>
                
                {/* Payment Display Info */}
                {(account.upiId || account.qrCodeUrl) && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Payment Display Info (for Customer Payment Page):</p>
                    <div className="flex items-center gap-4">
                      {account.upiId && (
                        <div className="flex items-center gap-2">
                          <QrCode className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium">{account.upiId}</span>
                        </div>
                      )}
                      {account.qrCodeUrl && (
                        <div className="relative group">
                          <img 
                            src={account.qrCodeUrl} 
                            alt="QR Code" 
                            className="h-10 w-10 rounded cursor-pointer hover:opacity-80"
                            onClick={() => window.open(account.qrCodeUrl, '_blank')}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {accounts.length === 0 && (
              <p className="text-center text-gray-500 py-8">No bank accounts found</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="py-2">Date</th>
                  <th>Description</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 20).map((txn) => (
                  <tr key={txn.id} className="border-b border-gray-100">
                    <td className="py-2 text-sm">{formatDate(txn.transactionDate)}</td>
                    <td className="py-2 text-sm">{txn.description}</td>
                    <td className={`py-2 text-sm text-right font-medium ${
                      txn.transactionType === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {txn.transactionType === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                    </td>
                    <td className="py-2 text-sm text-right">{formatCurrency(txn.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <p className="text-center text-gray-500 py-8">No transactions found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CashFlowSection({ 
  data, 
  cashBookBalance,
  bankBalance,
  formatCurrency 
}: { 
  data: CashFlowData | null;
  cashBookBalance: number;
  bankBalance: number;
  formatCurrency: (a: number) => string;
}) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <p className="text-green-100 text-sm">Cash Inflows</p>
            <p className="text-2xl font-bold">{formatCurrency(data?.totalInflows || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardContent className="p-4">
            <p className="text-red-100 text-sm">Cash Outflows</p>
            <p className="text-2xl font-bold">{formatCurrency(data?.totalOutflows || 0)}</p>
          </CardContent>
        </Card>
        <Card className={`text-white ${((data?.netCashFlow || 0) >= 0) ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'}`}>
          <CardContent className="p-4">
            <p className="text-blue-100 text-sm">Net Cash Flow</p>
            <p className="text-2xl font-bold">{formatCurrency(data?.netCashFlow || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Bank Balance</p>
                <p className="text-xl font-bold">{formatCurrency(bankBalance)}</p>
              </div>
              <Landmark className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Cash Book Balance</p>
                <p className="text-xl font-bold">{formatCurrency(cashBookBalance)}</p>
              </div>
              <Wallet className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Details */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Inflows */}
            <div>
              <h3 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                <ArrowUp className="h-4 w-4" />
                CASH INFLOWS
              </h3>
              <div className="space-y-2">
                {data?.inflows.map((item, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">{item.source}</span>
                    <span className="font-medium text-green-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 bg-green-50 px-3 rounded font-semibold">
                  <span>Total Inflows</span>
                  <span className="text-green-600">{formatCurrency(data?.totalInflows || 0)}</span>
                </div>
              </div>
            </div>

            {/* Outflows */}
            <div>
              <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                <ArrowDown className="h-4 w-4" />
                CASH OUTFLOWS
              </h3>
              <div className="space-y-2">
                {data?.outflows.map((item, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">{item.source}</span>
                    <span className="font-medium text-red-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 bg-red-50 px-3 rounded font-semibold">
                  <span>Total Outflows</span>
                  <span className="text-red-600">{formatCurrency(data?.totalOutflows || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DaybookSection({ 
  entries, 
  formatCurrency, 
  formatDate 
}: { 
  entries: JournalEntry[]; 
  formatCurrency: (a: number) => string; 
  formatDate: (d: Date | string) => string;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-500" />
            Daybook - Journal Entries
          </CardTitle>
          <CardDescription>All double-entry transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="py-2">Date</th>
                  <th>Entry #</th>
                  <th>Narration</th>
                  <th>Account</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  entry.lines.map((line, idx) => (
                    <tr key={`${entry.id}-${idx}`} className="border-b border-gray-100">
                      {idx === 0 ? (
                        <>
                          <td className="py-2 text-sm" rowSpan={entry.lines.length}>{formatDate(entry.entryDate)}</td>
                          <td className="py-2 text-sm font-mono" rowSpan={entry.lines.length}>{entry.entryNumber}</td>
                          <td className="py-2 text-sm" rowSpan={entry.lines.length}>{entry.narration}</td>
                        </>
                      ) : null}
                      <td className="py-2 text-sm text-gray-600">{line.account?.accountName || '-'}</td>
                      <td className="py-2 text-sm text-right font-medium text-red-600">
                        {line.debitAmount > 0 ? formatCurrency(line.debitAmount) : '-'}
                      </td>
                      <td className="py-2 text-sm text-right font-medium text-green-600">
                        {line.creditAmount > 0 ? formatCurrency(line.creditAmount) : '-'}
                      </td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
            {entries.length === 0 && (
              <p className="text-center text-gray-500 py-8">No journal entries found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CashbookSection({ 
  entries, 
  currentBalance,
  formatCurrency, 
  formatDate,
  onAddCash
}: { 
  entries: CashBookEntry[]; 
  currentBalance: number;
  formatCurrency: (a: number) => string; 
  formatDate: (d: Date | string) => string;
  onAddCash?: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <Card className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100">Current Cash Balance</p>
              <p className="text-3xl font-bold">{formatCurrency(currentBalance)}</p>
            </div>
            <div className="flex items-center gap-3">
              {onAddCash && (
                <Button 
                  onClick={onAddCash}
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cash Entry
                </Button>
              )}
              <Wallet className="h-12 w-12 text-amber-200" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cashbook Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-amber-500" />
            Cashbook Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="py-2">Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100">
                    <td className="py-2 text-sm">{formatDate(entry.entryDate)}</td>
                    <td className="py-2">
                      <Badge variant={entry.entryType === 'CREDIT' ? 'default' : 'destructive'} className="text-xs">
                        {entry.entryType}
                      </Badge>
                    </td>
                    <td className="py-2 text-sm">{entry.description}</td>
                    <td className={`py-2 text-sm text-right font-medium ${
                      entry.entryType === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {entry.entryType === 'CREDIT' ? '+' : '-'}{formatCurrency(entry.amount)}
                    </td>
                    <td className="py-2 text-sm text-right">{formatCurrency(entry.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {entries.length === 0 && (
              <p className="text-center text-gray-500 py-8">No cashbook entries found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// LEDGER SECTION
// ============================================

interface LedgerEntryItem {
  id: string;
  date: Date | string;
  description: string;
  reference: string;
  type: 'BANK' | 'CASH' | 'EMI' | 'DISBURSEMENT' | 'INTEREST' | 'PENALTY' | 'EXPENSE' | 'INCOME';
  debit: number;
  credit: number;
  balance: number;
  loanNo?: string;
  customerName?: string;
  particular?: string;
}

interface LoanLedgerEntry {
  id: string;
  date: Date | string;
  emiNo: number;
  dueDate: Date | string;
  description: string;
  principal: number;
  interest: number;
  penalty: number;
  totalAmount: number;
  paidAmount: number;
  paidDate: Date | string | null;
  status: string;
  paymentMode: string | null;
}

function LedgerSectionInline({ 
  selectedCompanyId,
  activeLoans,
  bankAccounts,
  bankTransactions,
  journalEntries,
  formatCurrency,
  formatDate
}: { 
  selectedCompanyId: string;
  activeLoans: any[];
  bankAccounts: any[];
  bankTransactions: any[];
  journalEntries: any[];
  formatCurrency: (a: number) => string; 
  formatDate: (d: Date | string) => string;
}) {
  const [activeTab, setActiveTab] = useState<'common' | 'loan'>('common');
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [loanLedger, setLoanLedger] = useState<LoanLedgerEntry[]>([]);
  const [commonLedger, setCommonLedger] = useState<LedgerEntryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Build Common Ledger from all transactions
  useEffect(() => {
    buildCommonLedger();
  }, [bankTransactions, journalEntries, activeLoans]);

  // Fetch loan ledger when loan is selected
  useEffect(() => {
    if (selectedLoanId) {
      fetchLoanLedger(selectedLoanId);
    } else {
      setLoanLedger([]);
      setSelectedLoan(null);
    }
  }, [selectedLoanId]);

  const buildCommonLedger = async () => {
    setLoading(true);
    try {
      const entries: LedgerEntryItem[] = [];
      let runningBalance = 0;

      // Add bank transactions
      bankTransactions.forEach((txn: any) => {
        if (txn.type === 'CREDIT' || txn.transactionType === 'CREDIT') {
          runningBalance += txn.amount;
          entries.push({
            id: txn.id,
            date: txn.transactionDate || txn.createdAt,
            description: txn.description || 'Bank Transaction',
            reference: txn.referenceNumber || txn.id.slice(-8),
            type: 'BANK',
            debit: 0,
            credit: txn.amount,
            balance: runningBalance,
            particular: txn.bankAccount?.bankName || 'Bank'
          });
        } else {
          runningBalance -= txn.amount;
          entries.push({
            id: txn.id,
            date: txn.transactionDate || txn.createdAt,
            description: txn.description || 'Bank Transaction',
            reference: txn.referenceNumber || txn.id.slice(-8),
            type: 'BANK',
            debit: txn.amount,
            credit: 0,
            balance: runningBalance,
            particular: txn.bankAccount?.bankName || 'Bank'
          });
        }
      });

      // Add journal entries
      journalEntries.forEach((je: any) => {
        je.lines?.forEach((line: any) => {
          if (line.debitAmount > 0) {
            runningBalance -= line.debitAmount;
            entries.push({
              id: `${je.id}-d-${line.id || Math.random()}`,
              date: je.entryDate,
              description: je.narration || line.account?.accountName || 'Journal Entry',
              reference: je.entryNumber || je.id.slice(-8),
              type: 'EXPENSE',
              debit: line.debitAmount,
              credit: 0,
              balance: runningBalance,
              particular: line.account?.accountName || ''
            });
          }
          if (line.creditAmount > 0) {
            runningBalance += line.creditAmount;
            entries.push({
              id: `${je.id}-c-${line.id || Math.random()}`,
              date: je.entryDate,
              description: je.narration || line.account?.accountName || 'Journal Entry',
              reference: je.entryNumber || je.id.slice(-8),
              type: 'INCOME',
              debit: 0,
              credit: line.creditAmount,
              balance: runningBalance,
              particular: line.account?.accountName || ''
            });
          }
        });
      });

      // Add EMI payments from active loans
      activeLoans.forEach((loan) => {
        loan.emiSchedules?.forEach((emi: any) => {
          if (emi.paidAmount > 0 && emi.paidDate) {
            runningBalance += emi.paidAmount;
            entries.push({
              id: `emi-${emi.id}`,
              date: emi.paidDate,
              description: `EMI #${emi.installmentNumber} Collection`,
              reference: loan.applicationNo,
              type: 'EMI',
              debit: 0,
              credit: emi.paidAmount,
              balance: runningBalance,
              loanNo: loan.applicationNo,
              customerName: loan.customer?.name,
              particular: `EMI Payment - ${emi.paymentMode || 'CASH'}`
            });
          }
        });
      });

      // Sort by date descending
      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setCommonLedger(entries);
    } catch (error) {
      console.error('Error building common ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoanLedger = async (loanId: string) => {
    setLoading(true);
    try {
      // Find the selected loan
      const loan = activeLoans.find(l => l.id === loanId);
      if (!loan) {
        return;
      }
      setSelectedLoan(loan);

      // Build loan ledger from EMI schedules
      const entries: LoanLedgerEntry[] = loan.emiSchedules?.map((emi: any) => ({
        id: emi.id,
        date: emi.dueDate,
        emiNo: emi.installmentNumber,
        dueDate: emi.dueDate,
        description: `EMI #${emi.installmentNumber}`,
        principal: emi.principalAmount,
        interest: emi.interestAmount,
        penalty: emi.penaltyAmount || 0,
        totalAmount: emi.totalAmount,
        paidAmount: emi.paidAmount || 0,
        paidDate: emi.paidDate,
        status: emi.paymentStatus,
        paymentMode: emi.paymentMode
      })) || [];

      // Sort by EMI number
      entries.sort((a, b) => a.emiNo - b.emiNo);
      setLoanLedger(entries);
    } catch (error) {
      console.error('Error fetching loan ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter common ledger by search term
  const filteredCommonLedger = commonLedger.filter(entry => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      entry.description.toLowerCase().includes(search) ||
      entry.reference.toLowerCase().includes(search) ||
      entry.loanNo?.toLowerCase().includes(search) ||
      entry.customerName?.toLowerCase().includes(search)
    );
  });

  // Calculate totals
  const totalDebit = commonLedger.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = commonLedger.reduce((sum, e) => sum + e.credit, 0);
  const closingBalance = commonLedger.length > 0 ? commonLedger[commonLedger.length - 1].balance : 0;

  // Loan ledger totals
  const totalPrincipal = loanLedger.reduce((sum, e) => sum + e.principal, 0);
  const totalInterest = loanLedger.reduce((sum, e) => sum + e.interest, 0);
  const totalPenalty = loanLedger.reduce((sum, e) => sum + e.penalty, 0);
  const totalPaid = loanLedger.reduce((sum, e) => sum + e.paidAmount, 0);
  const totalOutstanding = loanLedger.reduce((sum, e) => sum + (e.totalAmount - e.paidAmount), 0);

  // Get type badge color
  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'BANK': 'bg-blue-100 text-blue-700',
      'CASH': 'bg-amber-100 text-amber-700',
      'EMI': 'bg-green-100 text-green-700',
      'DISBURSEMENT': 'bg-purple-100 text-purple-700',
      'INTEREST': 'bg-cyan-100 text-cyan-700',
      'PENALTY': 'bg-red-100 text-red-700',
      'EXPENSE': 'bg-orange-100 text-orange-700',
      'INCOME': 'bg-emerald-100 text-emerald-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'PAID': 'bg-green-100 text-green-700',
      'PENDING': 'bg-yellow-100 text-yellow-700',
      'OVERDUE': 'bg-red-100 text-red-700',
      'PARTIALLY_PAID': 'bg-orange-100 text-orange-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  // Export to CSV
  const exportToCSV = (type: 'common' | 'loan') => {
    let csv = '';
    let filename = '';

    if (type === 'common') {
      csv = 'Date,Description,Reference,Type,Debit,Credit,Balance\n';
      commonLedger.forEach(e => {
        csv += `${formatDate(e.date)},${e.description},${e.reference},${e.type},${e.debit},${e.credit},${e.balance}\n`;
      });
      filename = `common_ledger_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    } else {
      csv = 'EMI No,Due Date,Principal,Interest,Penalty,Total,Paid,Status\n';
      loanLedger.forEach(e => {
        csv += `${e.emiNo},${formatDate(e.dueDate)},${e.principal},${e.interest},${e.penalty},${e.totalAmount},${e.paidAmount},${e.status}\n`;
      });
      filename = `loan_ledger_${selectedLoan?.applicationNo}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookCopy className="h-6 w-6 text-emerald-600" />
            Ledger
          </h2>
          <p className="text-sm text-gray-500">View all transactions and loan-wise ledger entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => buildCommonLedger()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('common')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'common' 
              ? 'border-emerald-500 text-emerald-700' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4 inline-block mr-2" />
          Common Ledger
        </button>
        <button
          onClick={() => setActiveTab('loan')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'loan' 
              ? 'border-emerald-500 text-emerald-700' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CreditCard className="h-4 w-4 inline-block mr-2" />
          Loan Ledger
        </button>
      </div>

      {/* Common Ledger Tab */}
      {activeTab === 'common' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <ArrowDownRight className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Debit</p>
                    <p className="text-lg font-bold text-red-700">{formatCurrency(totalDebit)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Credit</p>
                    <p className="text-lg font-bold text-green-700">{formatCurrency(totalCredit)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Closing Balance</p>
                    <p className="text-lg font-bold text-blue-700">{formatCurrency(Math.abs(closingBalance))}</p>
                    <p className="text-xs text-gray-500">{closingBalance >= 0 ? 'Credit' : 'Debit'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileSpreadsheet className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Entries</p>
                    <p className="text-lg font-bold text-purple-700">{commonLedger.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search & Export */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <FileText className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" onClick={() => exportToCSV('common')}>
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Common Ledger Table */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookCopy className="h-5 w-5" />
                All Transactions
              </CardTitle>
              <CardDescription>
                Complete ledger with all bank transactions, EMI collections, and payments
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Particular</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Debit</th>
                      <th className="py-3 px-4 text-right">Credit</th>
                      <th className="py-3 px-4 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                          <p className="text-sm text-gray-500 mt-2">Loading ledger...</p>
                        </td>
                      </tr>
                    ) : filteredCommonLedger.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-500">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      filteredCommonLedger.map((entry) => (
                        <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-4 font-mono text-sm">
                            {formatDate(entry.date)}
                          </td>
                          <td className="py-2 px-4">
                            <div>
                              <p className="font-medium">{entry.description}</p>
                              {entry.loanNo && (
                                <p className="text-xs text-gray-500">
                                  Loan: {entry.loanNo} {entry.customerName && `• ${entry.customerName}`}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-4 text-gray-600">
                            {entry.particular || entry.reference}
                          </td>
                          <td className="py-2 px-4">
                            <Badge className={getTypeBadge(entry.type)}>
                              {entry.type}
                            </Badge>
                          </td>
                          <td className="py-2 px-4 text-right text-red-600 font-medium">
                            {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                          </td>
                          <td className="py-2 px-4 text-right text-green-600 font-medium">
                            {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                          </td>
                          <td className={`py-2 px-4 text-right font-bold ${entry.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {formatCurrency(Math.abs(entry.balance))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loan Ledger Tab */}
      {activeTab === 'loan' && (
        <div className="space-y-4">
          {/* Loan Selector */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <Label className="text-sm font-medium text-blue-800">Select Loan</Label>
                  <Select value={selectedLoanId} onValueChange={setSelectedLoanId}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Choose a loan to view ledger" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeLoans.map((loan) => (
                        <SelectItem key={loan.id} value={loan.id}>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-blue-600" />
                            <span>{loan.applicationNo}</span>
                            <span className="text-gray-500">- {loan.customer?.name || 'N/A'}</span>
                            <Badge variant="outline" className="ml-2">
                              {formatCurrency(loan.approvedAmount || 0)}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedLoan && (
                  <>
                    <div className="text-sm">
                      <p className="text-gray-600">Customer</p>
                      <p className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {selectedLoan.customer?.name || 'N/A'}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="bg-white"
                      onClick={() => exportToCSV('loan')}
                      disabled={loanLedger.length === 0}
                    >
                      Export Loan Ledger
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Loan Summary */}
          {selectedLoan && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="bg-white border-blue-200">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-600">Loan Amount</p>
                  <p className="text-lg font-bold text-blue-700">
                    {formatCurrency(selectedLoan.approvedAmount || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white border-green-200">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-600">Total Principal</p>
                  <p className="text-lg font-bold text-green-700">{formatCurrency(totalPrincipal)}</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-purple-200">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-600">Total Interest</p>
                  <p className="text-lg font-bold text-purple-700">{formatCurrency(totalInterest)}</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-emerald-200">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-600">Total Paid</p>
                  <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalPaid)}</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-red-200">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-600">Outstanding</p>
                  <p className="text-lg font-bold text-red-700">{formatCurrency(totalOutstanding)}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Loan Ledger Table */}
          {selectedLoanId ? (
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  Loan Ledger - {selectedLoan?.applicationNo}
                </CardTitle>
                <CardDescription>
                  EMI schedule with payment status for this loan
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white">
                      <tr className="text-left text-sm text-gray-500 border-b">
                        <th className="py-3 px-4">EMI #</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4 text-right">Principal</th>
                        <th className="py-3 px-4 text-right">Interest</th>
                        <th className="py-3 px-4 text-right">Penalty</th>
                        <th className="py-3 px-4 text-right">Total</th>
                        <th className="py-3 px-4 text-right">Paid</th>
                        <th className="py-3 px-4 text-right">Balance</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={10} className="text-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                            <p className="text-sm text-gray-500 mt-2">Loading loan ledger...</p>
                          </td>
                        </tr>
                      ) : loanLedger.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-8 text-gray-500">
                            No EMI schedule found for this loan
                          </td>
                        </tr>
                      ) : (
                        loanLedger.map((entry) => (
                          <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-4 font-bold">
                              #{entry.emiNo}
                            </td>
                            <td className="py-2 px-4 font-mono text-sm">
                              {formatDate(entry.dueDate)}
                            </td>
                            <td className="py-2 px-4 text-right">
                              {formatCurrency(entry.principal)}
                            </td>
                            <td className="py-2 px-4 text-right">
                              {formatCurrency(entry.interest)}
                            </td>
                            <td className="py-2 px-4 text-right text-red-600">
                              {entry.penalty > 0 ? formatCurrency(entry.penalty) : '-'}
                            </td>
                            <td className="py-2 px-4 text-right font-bold">
                              {formatCurrency(entry.totalAmount + entry.penalty)}
                            </td>
                            <td className="py-2 px-4 text-right font-bold text-green-600">
                              {formatCurrency(entry.paidAmount)}
                            </td>
                            <td className="py-2 px-4 text-right font-bold text-red-600">
                              {formatCurrency(entry.totalAmount + entry.penalty - entry.paidAmount)}
                            </td>
                            <td className="py-2 px-4">
                              <Badge className={getStatusBadge(entry.status)}>
                                {entry.status}
                              </Badge>
                            </td>
                            <td className="py-2 px-4 text-gray-600">
                              {entry.paymentMode || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                      {/* Totals Row */}
                      {loanLedger.length > 0 && (
                        <tr className="bg-gray-100 font-bold">
                          <td colSpan={2} className="py-3 px-4">TOTAL</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(totalPrincipal)}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(totalInterest)}</td>
                          <td className="py-3 px-4 text-right text-red-600">{formatCurrency(totalPenalty)}</td>
                          <td className="py-3 px-4 text-right">
                            {formatCurrency(totalPrincipal + totalInterest + totalPenalty)}
                          </td>
                          <td className="py-3 px-4 text-right text-green-700">{formatCurrency(totalPaid)}</td>
                          <td className="py-3 px-4 text-right text-red-700">{formatCurrency(totalOutstanding)}</td>
                          <td colSpan={2}></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <CreditCard className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-600">Select a Loan to View Ledger</p>
                <p className="text-sm text-gray-500 mt-2">
                  Choose a loan from the dropdown above to see its detailed EMI ledger
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
