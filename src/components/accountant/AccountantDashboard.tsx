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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Calculator, FileText, TrendingUp, Loader2, RefreshCw, 
  FileSpreadsheet, BookOpen, Landmark, ArrowUpRight, ArrowDownRight,
  LogOut, Plus, Receipt, BookCopy, BarChart3,
  AlertTriangle, CheckCircle, Building2, Wallet, PiggyBank,
  ChevronRight, CreditCard, Eye, Calendar, Search, ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// TYPES
// ============================================

interface Company {
  id: string;
  name: string;
  code: string;
  isMirrorCompany?: boolean; // true = Company 1/2 (has bank), false = Company 3 (cash only)
}

interface ChartOfAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  currentBalance: number;
  isActive: boolean;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName?: string;
  ownerName?: string;
  currentBalance: number;
  ifscCode?: string;
  upiId?: string;
  qrCodeUrl?: string;
  isDefault: boolean;
  isActive: boolean;
}

interface BankTransaction {
  id: string;
  bankAccountId: string;
  transactionType: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType: string;
  transactionDate: Date | string;
}

interface CashBookEntry {
  id: string;
  entryType: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType: string;
  createdAt: Date | string;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: Date | string;
  referenceType?: string;
  narration?: string;
  totalDebit: number;
  totalCredit: number;
  lines: Array<{
    accountId: string;
    account?: ChartOfAccount;
    debitAmount: number;
    creditAmount: number;
  }>;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

const formatDate = (date: Date | string) => {
  if (!date) return '-';
  return format(new Date(date), 'dd MMM yyyy');
};

const formatDateShort = (date: Date | string) => {
  if (!date) return '-';
  return format(new Date(date), 'dd/MM/yyyy');
};

// Company type detection - uses isMirrorCompany field from database
// Mirror companies (Company 1 & 2) have bank accounts
// Original company (Company 3) has only cash book
const getCompanyType = (company: Company | undefined): 'COMPANY_1_2' | 'COMPANY_3' => {
  if (!company) return 'COMPANY_1_2';
  // Use isMirrorCompany field if available
  if (company.isMirrorCompany !== undefined) {
    return company.isMirrorCompany ? 'COMPANY_1_2' : 'COMPANY_3';
  }
  // Fallback to code-based detection
  const upperCode = company.code?.toUpperCase() || '';
  if (upperCode.includes('3') || upperCode === 'C3' || upperCode === 'COMPANY3' || upperCode === 'COMPANY_3') {
    return 'COMPANY_3';
  }
  return 'COMPANY_1_2';
};

// ============================================
// SECTION COMPONENTS
// ============================================

// Day Book Section - Shows ALL transactions A-Z
function DayBookSection({
  selectedCompanyId,
  formatCurrency,
  formatDateShort
}: {
  selectedCompanyId: string;
  formatCurrency: (amount: number) => string;
  formatDateShort: (date: Date | string) => string;
}) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 50;

  const loadEntries = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/journal-entries?companyId=${selectedCompanyId}&limit=500`);
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.entryDate);
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));
    
    if (entryDate < start || entryDate > end) return false;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        entry.entryNumber?.toLowerCase().includes(term) ||
        entry.narration?.toLowerCase().includes(term) ||
        entry.referenceType?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );

  const totalReceipts = filteredEntries.reduce((s, e) => s + e.totalCredit, 0);
  const totalPayments = filteredEntries.reduce((s, e) => s + e.totalDebit, 0);

  const getReferenceLabel = (type: string) => {
    const labels: Record<string, string> = {
      'LOAN_DISBURSEMENT': 'Loan Disbursement',
      'EMI_PAYMENT': 'EMI Payment',
      'MIRROR_EMI_PAYMENT': 'Mirror EMI',
      'EXTRA_EMI_PAYMENT': 'Extra EMI',
      'PROCESSING_FEE_COLLECTION': 'Processing Fee',
      'EXPENSE_ENTRY': 'Expense',
      'OPENING_BALANCE': 'Opening Balance',
      'MANUAL_ENTRY': 'Manual Entry'
    };
    return labels[type] || type || 'Entry';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Day Book - All Transactions
        </h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-48 pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">From:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">To:</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36"
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadEntries}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Total Receipts</p>
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-xl font-bold text-green-600">+{formatCurrency(totalReceipts)}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Total Payments</p>
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-xl font-bold text-red-600">-{formatCurrency(totalPayments)}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Net Movement</p>
            <p className={`text-xl font-bold ${totalReceipts - totalPayments >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalReceipts - totalPayments >= 0 ? '+' : ''}{formatCurrency(totalReceipts - totalPayments)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Transactions</CardTitle>
            <Badge variant="outline">{filteredEntries.length} entries</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="w-[110px]">Entry No.</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="text-right w-[120px]">Receipt</TableHead>
                  <TableHead className="text-right w-[120px]">Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
                    </TableCell>
                  </TableRow>
                ) : paginatedEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEntries.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">
                        {formatDateShort(entry.entryDate)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">
                        {entry.entryNumber}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {entry.narration || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getReferenceLabel(entry.referenceType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {entry.totalCredit > 0 ? `+${formatCurrency(entry.totalCredit)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {entry.totalDebit > 0 ? `-${formatCurrency(entry.totalDebit)}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * entriesPerPage + 1} to {Math.min(currentPage * entriesPerPage, filteredEntries.length)} of {filteredEntries.length}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Cash Book Section - For Company 3 (Cash Only)
function CashBookSection({
  selectedCompanyId,
  formatCurrency,
  formatDateShort
}: {
  selectedCompanyId: string;
  formatCurrency: (amount: number) => string;
  formatDateShort: (date: Date | string) => string;
}) {
  const [cashBook, setCashBook] = useState<any>(null);
  const [entries, setEntries] = useState<CashBookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [adding, setAdding] = useState(false);

  const loadData = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accountant/cashbook?companyId=${selectedCompanyId}`);
      const data = await res.json();
      setCashBook(data.cashBook);
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Error loading cashbook:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddEntry = async (type: 'CREDIT' | 'DEBIT') => {
    const amount = parseFloat(addAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!addDescription.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setAdding(true);
    try {
      const res = await fetch('/api/accountant/cashbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          entryType: type,
          amount,
          description: addDescription,
          referenceType: 'MANUAL_ENTRY'
        })
      });

      if (res.ok) {
        toast.success(`Cash ${type === 'CREDIT' ? 'added' : 'deducted'} successfully`);
        setShowAddDialog(false);
        setAddAmount('');
        setAddDescription('');
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to add entry');
      }
    } catch (error) {
      toast.error('Failed to add entry');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Cash Book
        </h2>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Entry
        </Button>
      </div>

      {/* Cash Balance Card */}
      <Card className="bg-teal-50 border-teal-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Cash Balance</p>
              <p className="text-3xl font-bold text-teal-700">
                {formatCurrency(cashBook?.currentBalance || 0)}
              </p>
            </div>
            <Wallet className="h-12 w-12 text-teal-500" />
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cash Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-teal-500" />
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No cash transactions found</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDateShort(entry.createdAt)}</TableCell>
                      <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                      <TableCell>
                        <Badge variant={entry.entryType === 'CREDIT' ? 'default' : 'destructive'}>
                          {entry.entryType === 'CREDIT' ? 'IN' : 'OUT'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${entry.entryType === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.entryType === 'CREDIT' ? '+' : '-'}{formatCurrency(entry.amount)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.balanceAfter)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cash Entry</DialogTitle>
            <DialogDescription>Record a cash transaction</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                placeholder="Enter description"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => handleAddEntry('DEBIT')}
              disabled={adding}
            >
              Cash Out
            </Button>
            <Button 
              onClick={() => handleAddEntry('CREDIT')}
              disabled={adding}
              className="bg-green-600 hover:bg-green-700"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cash In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Bank Section - For Company 1 & 2 Only
function BankSection({
  selectedCompanyId,
  formatCurrency,
  formatDateShort
}: {
  selectedCompanyId: string;
  formatCurrency: (amount: number) => string;
  formatDateShort: (date: Date | string) => string;
}) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEquityDialog, setShowEquityDialog] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
    ownerName: '',
    ifscCode: '',
    upiId: '',
    openingBalance: 0,
    isDefault: false
  });
  const [equityForm, setEquityForm] = useState({
    cashAmount: '',
    bankAmount: '',
    description: 'Initial Capital Investment',
    bankAccountId: ''
  });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accountant/bank-accounts?companyId=${selectedCompanyId}`);
      const data = await res.json();
      setBankAccounts(data.bankAccounts || []);
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Error loading bank data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddBank = async () => {
    if (!bankForm.bankName || !bankForm.accountNumber) {
      toast.error('Please fill bank name and account number');
      return;
    }

    setSaving(true);
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
        toast.success('Bank account added successfully');
        setShowAddDialog(false);
        setBankForm({
          bankName: '', accountNumber: '', accountName: '', ownerName: '',
          ifscCode: '', upiId: '', openingBalance: 0, isDefault: false
        });
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to add bank account');
      }
    } catch (error) {
      toast.error('Failed to add bank account');
    } finally {
      setSaving(false);
    }
  };

  const handleAddEquity = async () => {
    const cash = parseFloat(equityForm.cashAmount) || 0;
    const bank = parseFloat(equityForm.bankAmount) || 0;
    const total = cash + bank;

    if (total <= 0) {
      toast.error('Please enter at least one amount');
      return;
    }

    setSaving(true);
    try {
      // Check if bank amount is provided but no bank account exists
      if (bank > 0 && bankAccounts.length === 0) {
        toast.error('Please add a bank account first before adding bank equity');
        setSaving(false);
        return;
      }

      // Check if bank amount is provided but no bank account selected
      if (bank > 0 && bankAccounts.length > 1 && !equityForm.bankAccountId) {
        toast.error('Please select a bank account for the bank equity');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/accounting/add-equity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          cashAmount: cash,
          bankAmount: bank,
          bankAccountId: equityForm.bankAccountId || (bankAccounts.length > 0 ? bankAccounts.find(b => b.isDefault)?.id || bankAccounts[0].id : undefined),
          description: equityForm.description,
          createdById: 'system'
        })
      });

      if (res.ok) {
        toast.success(`Equity of ${formatCurrency(total)} added successfully!`);
        setShowEquityDialog(false);
        setEquityForm({ cashAmount: '', bankAmount: '', description: 'Initial Capital Investment', bankAccountId: '' });
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to add equity');
      }
    } catch (error) {
      toast.error('Failed to add equity');
    } finally {
      setSaving(false);
    }
  };

  const totalBankBalance = bankAccounts.reduce((s, b) => s + b.currentBalance, 0);

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups, txn) => {
    const date = format(new Date(txn.transactionDate), 'yyyy-MM-dd');
    if (!groups[date]) groups[date] = [];
    groups[date].push(txn);
    return groups;
  }, {} as Record<string, BankTransaction[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Landmark className="h-5 w-5" />
          Bank Accounts
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEquityDialog(true)} className="border-purple-500 text-purple-600">
            <PiggyBank className="h-4 w-4 mr-2" />
            Add Equity
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bank
          </Button>
        </div>
      </div>

      {/* Bank Accounts */}
      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
        </div>
      ) : bankAccounts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Landmark className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No bank accounts added yet</p>
            <div className="flex gap-2 justify-center mt-4">
              <Button onClick={() => setShowEquityDialog(true)} variant="outline">
                <PiggyBank className="h-4 w-4 mr-2" />
                Add Equity First
              </Button>
              <Button onClick={() => setShowAddDialog(true)}>Add Bank Account</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Total Balance */}
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Bank Balance</p>
                  <p className="text-3xl font-bold text-emerald-700">{formatCurrency(totalBankBalance)}</p>
                </div>
                <Landmark className="h-12 w-12 text-emerald-500" />
              </div>
            </CardContent>
          </Card>

          {/* Bank Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map((bank) => (
              <Card key={bank.id} className={bank.isDefault ? 'border-2 border-emerald-500' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Landmark className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold">{bank.bankName}</p>
                        <p className="text-sm text-gray-500">****{bank.accountNumber.slice(-4)}</p>
                      </div>
                    </div>
                    {bank.isDefault && <Badge className="bg-emerald-500">Default</Badge>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Balance</span>
                      <span className="font-bold text-lg">{formatCurrency(bank.currentBalance)}</span>
                    </div>
                    {bank.upiId && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">UPI ID</span>
                        <span className="font-mono">{bank.upiId}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bank Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {Object.keys(groupedTransactions).length === 0 ? (
                  <div className="text-center text-gray-500 py-8">No transactions found</div>
                ) : (
                  Object.entries(groupedTransactions)
                    .sort((a, b) => b[0].localeCompare(a[0]))
                    .map(([date, txns]) => (
                      <div key={date} className="mb-4">
                        <div className="sticky top-0 bg-gray-50 px-2 py-1 text-sm font-medium text-gray-600 border-b">
                          {format(new Date(date), 'EEEE, dd MMMM yyyy')}
                        </div>
                        <Table>
                          <TableBody>
                            {txns.map((txn) => (
                              <TableRow key={txn.id}>
                                <TableCell>{format(new Date(txn.transactionDate), 'HH:mm')}</TableCell>
                                <TableCell className="max-w-[200px] truncate">{txn.description}</TableCell>
                                <TableCell>
                                  <Badge variant={txn.transactionType === 'CREDIT' ? 'default' : 'destructive'}>
                                    {txn.transactionType === 'CREDIT' ? 'IN' : 'OUT'}
                                  </Badge>
                                </TableCell>
                                <TableCell className={`text-right font-medium ${txn.transactionType === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                                  {txn.transactionType === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(txn.balanceAfter)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Bank Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Name *</Label>
                <Input value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Account Number *</Label>
                <Input value={bankForm.accountNumber} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input value={bankForm.accountName} onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Owner Name</Label>
                <Input value={bankForm.ownerName} onChange={(e) => setBankForm({ ...bankForm, ownerName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>IFSC Code</Label>
                <Input value={bankForm.ifscCode} onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>UPI ID</Label>
                <Input value={bankForm.upiId} onChange={(e) => setBankForm({ ...bankForm, upiId: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddBank} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Bank
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Equity Dialog */}
      <Dialog open={showEquityDialog} onOpenChange={setShowEquityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-purple-600" />
              Add Owner's Equity / Capital
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
              <p className="font-medium mb-1">Double-Entry Accounting</p>
              <p>This will record your capital investment properly:</p>
              <ul className="mt-2 list-disc list-inside text-blue-700">
                <li>Debit: Cash in Hand (increases cash)</li>
                <li>Debit: Bank Account (increases bank)</li>
                <li>Credit: Owner's Capital (records equity)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label>Cash Amount</Label>
              <Input
                type="number"
                value={equityForm.cashAmount}
                onChange={(e) => setEquityForm({ ...equityForm, cashAmount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Bank Amount</Label>
              <Input
                type="number"
                value={equityForm.bankAmount}
                onChange={(e) => setEquityForm({ ...equityForm, bankAmount: e.target.value })}
                placeholder="0"
                disabled={bankAccounts.length === 0}
              />
              {bankAccounts.length === 0 && (
                <p className="text-sm text-amber-600">No bank accounts found. Please add a bank account first.</p>
              )}
            </div>
            {bankAccounts.length > 1 && parseFloat(equityForm.bankAmount) > 0 && (
              <div className="space-y-2">
                <Label>Select Bank Account</Label>
                <Select
                  value={equityForm.bankAccountId}
                  onValueChange={(value) => setEquityForm({ ...equityForm, bankAccountId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.bankName} - ****{bank.accountNumber.slice(-4)} ({formatCurrency(bank.currentBalance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {bankAccounts.length === 1 && parseFloat(equityForm.bankAmount) > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  Bank equity will be added to: <strong>{bankAccounts[0].bankName}</strong> (****{bankAccounts[0].accountNumber.slice(-4)})
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={equityForm.description}
                onChange={(e) => setEquityForm({ ...equityForm, description: e.target.value })}
              />
            </div>
            <Card className="bg-emerald-50">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Equity:</span>
                  <span className="text-xl font-bold text-emerald-700">
                    {formatCurrency((parseFloat(equityForm.cashAmount) || 0) + (parseFloat(equityForm.bankAmount) || 0))}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEquityDialog(false)}>Cancel</Button>
            <Button onClick={handleAddEquity} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PiggyBank className="h-4 w-4 mr-2" />}
              Add Equity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function UnifiedAccountantDashboard() {
  const { user, signOut } = useAuth();
  const { settings } = useSettings();
  
  // State
  const [loading, setLoading] = useState(true);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('day-book');
  
  // Company
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const companyType = getCompanyType(selectedCompany);

  // Fetch Companies
  useEffect(() => {
    const fetchCompanies = async () => {
      setCompaniesLoading(true);
      try {
        const res = await fetch('/api/company');
        if (res.ok) {
          const data = await res.json();
          const companiesList = data.companies || [];
          setCompanies(companiesList);
          if (companiesList.length > 0) {
            setSelectedCompanyId(companiesList[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        setCompaniesLoading(false);
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  // Reset to day-book when company changes
  useEffect(() => {
    setActiveSection('day-book');
  }, [selectedCompanyId]);

  // Menu Items based on company type
  const menuItems = companyType === 'COMPANY_3' 
    ? [
        { id: 'day-book', label: 'Day Book', icon: BookOpen },
        { id: 'cash-book', label: 'Cash Book', icon: Wallet },
      ]
    : [
        { id: 'day-book', label: 'Day Book', icon: BookOpen },
        { id: 'bank', label: 'Bank', icon: Landmark },
        { id: 'cash-book', label: 'Cash Book', icon: Wallet },
        { id: 'chart-of-accounts', label: 'Chart of Accounts', icon: BookCopy },
        { id: 'trial-balance', label: 'Trial Balance', icon: BarChart3 },
        { id: 'profit-loss', label: 'Profit & Loss', icon: TrendingUp },
        { id: 'balance-sheet', label: 'Balance Sheet', icon: FileSpreadsheet },
      ];

  // Render Section
  const renderSection = () => {
    switch (activeSection) {
      case 'day-book':
        return (
          <DayBookSection
            selectedCompanyId={selectedCompanyId}
            formatCurrency={formatCurrency}
            formatDateShort={formatDateShort}
          />
        );
      case 'cash-book':
        return (
          <CashBookSection
            selectedCompanyId={selectedCompanyId}
            formatCurrency={formatCurrency}
            formatDateShort={formatDateShort}
          />
        );
      case 'bank':
        return (
          <BankSection
            selectedCompanyId={selectedCompanyId}
            formatCurrency={formatCurrency}
            formatDateShort={formatDateShort}
          />
        );
      case 'chart-of-accounts':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookCopy className="h-5 w-5" />
                Chart of Accounts
              </CardTitle>
              <CardDescription>Manage your company's chart of accounts</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <BookCopy className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">Coming Soon</p>
              <p className="text-sm text-gray-400 mt-2">Chart of Accounts management is under development</p>
            </CardContent>
          </Card>
        );
      case 'trial-balance':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Trial Balance
              </CardTitle>
              <CardDescription>View trial balance for the selected period</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">Coming Soon</p>
              <p className="text-sm text-gray-400 mt-2">Trial Balance report is under development</p>
            </CardContent>
          </Card>
        );
      case 'profit-loss':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Profit & Loss Statement
              </CardTitle>
              <CardDescription>View income and expenses for the selected period</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <TrendingUp className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">Coming Soon</p>
              <p className="text-sm text-gray-400 mt-2">Profit & Loss statement is under development</p>
            </CardContent>
          </Card>
        );
      case 'balance-sheet':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Balance Sheet
              </CardTitle>
              <CardDescription>View assets, liabilities, and equity</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">Coming Soon</p>
              <p className="text-sm text-gray-400 mt-2">Balance Sheet report is under development</p>
            </CardContent>
          </Card>
        );
      default:
        return (
          <DayBookSection
            selectedCompanyId={selectedCompanyId}
            formatCurrency={formatCurrency}
            formatDateShort={formatDateShort}
          />
        );
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (companiesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight">
                  {companyType === 'COMPANY_3' ? 'Company 3 - Cash Book' : 'Accountant Dashboard'}
                </h1>
                <p className="text-[10px] text-emerald-100">
                  {selectedCompany?.name || 'Select Company'}
                </p>
              </div>
            </div>
            
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

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 p-0">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-emerald-500 text-white">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user?.name || 'User'}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-red-600">
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
        <aside className="w-56 bg-white border-r min-h-[calc(100vh-64px)] sticky top-16">
          <nav className="p-2 space-y-1">
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
          
          {/* Logout at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-2 border-t">
            <button
              onClick={signOut}
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
                className="flex items-center justify-center h-64"
              >
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </motion.div>
            ) : (
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {renderSection()}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
