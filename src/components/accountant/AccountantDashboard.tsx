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
  ChevronRight, CreditCard, Eye, Calendar, Search, ChevronLeft, ChevronRight as ChevronRightIcon,
  Wrench, Zap, Edit, BookCheck, User
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import ManualJournalEntryDialog from '@/components/accounting/ManualJournalEntryDialog';
import ExpenseRequestPanel from '@/components/expense/ExpenseRequestPanel';
import NewDayBookSection from '@/components/accountant/modules/DayBookSection';
import LedgerSection from '@/components/accountant/modules/LedgerSection';
import PersonalLedgerTab from '@/components/accountant/tabs/PersonalLedgerTab';
import TradDayBookSection from '@/components/accountant/modules/TradDayBookSection';
import { AddExpenseDialog, RecordBorrowingDialog, RepayBorrowingDialog, AddCapitalDialog } from '@/components/accountant/modules/ManualEntryDialogs';
import JournalEntriesSection from '@/components/accountant/modules/JournalEntriesSection';

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
  branchName?: string;
  ifscCode?: string;
  accountType?: string;
  currentBalance: number;
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

// Company type rule (simple and definitive):
//   isMirrorCompany === true  → COMPANY_1_2 → full accounting suite (MoneyMitra, Keshardeep…)
//   isMirrorCompany !== true  → COMPANY_3   → Day Book + Cash Book ONLY (PD Lagani, any non-mirror company)
const getCompanyType = (company: Company | undefined): 'COMPANY_1_2' | 'COMPANY_3' => {
  if (!company) return 'COMPANY_1_2';
  return company.isMirrorCompany === true ? 'COMPANY_1_2' : 'COMPANY_3';
};

// ============================================
// SECTION COMPONENTS
// ============================================

// Day Book Section - Delegates to new journal-voucher DayBook
function DayBookSection({
  selectedCompanyId,
  formatCurrency,
  formatDateShort
}: {
  selectedCompanyId: string;
  formatCurrency: (amount: number) => string;
  formatDateShort: (date: Date | string) => string;
}) {
  return <NewDayBookSection selectedCompanyId={selectedCompanyId} formatCurrency={formatCurrency} />;
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
  const [showOpeningDialog, setShowOpeningDialog] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addEntryType, setAddEntryType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [openingAmount, setOpeningAmount] = useState('');
  const [adding, setAdding] = useState(false);
  const [addingOpening, setAddingOpening] = useState(false);

  const loadData = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accountant/cashbook?companyId=${selectedCompanyId}`);
      const data = await res.json();
      setCashBook(data);
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

  const handleAddEntry = async () => {
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
          entryType: addEntryType,
          amount,
          description: addDescription,
          referenceType: 'MANUAL_ENTRY'
        })
      });

      if (res.ok) {
        toast.success(`Cash ${addEntryType === 'CREDIT' ? 'added' : 'deducted'} successfully`);
        setShowAddDialog(false);
        setAddAmount('');
        setAddDescription('');
        setAddEntryType('CREDIT');
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

  const handleAddOpeningBalance = async () => {
    const amount = parseFloat(openingAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid opening balance amount');
      return;
    }

    setAddingOpening(true);
    try {
      // Step 1: Add to cashbook as CREDIT (Opening Balance)
      const cashRes = await fetch('/api/accountant/cashbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          entryType: 'CREDIT',
          amount,
          description: 'Opening Balance',
          referenceType: 'OPENING_BALANCE'
        })
      });

      if (!cashRes.ok) {
        const err = await cashRes.json();
        toast.error(err.error || 'Failed to record opening balance in cash book');
        return;
      }

      // Step 2: Also create a Day Book / Journal entry: Dr Cash in Hand / Cr Opening Balance
      try {
        await fetch('/api/accounting/journals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: selectedCompanyId,
            entryDate: new Date().toISOString(),
            referenceType: 'OPENING_BALANCE',
            narration: `Opening Balance — Cash in Hand`,
            paymentMode: 'CASH',
            lines: [
              { accountCode: '1001', debitAmount: amount, creditAmount: 0, narration: 'Cash in Hand — Opening Balance' },
              { accountCode: '3100', debitAmount: 0, creditAmount: amount, narration: 'Opening Balance / Capital' }
            ],
            createdById: 'system',
            isAutoEntry: false
          })
        });
      } catch (journalError) {
        console.warn('[CashBook] Day book entry failed (non-critical):', journalError);
      }

      toast.success(`Opening Balance of ${formatCurrency(amount)} recorded successfully!`);
      setShowOpeningDialog(false);
      setOpeningAmount('');
      loadData();
    } catch (error) {
      toast.error('Failed to record opening balance');
    } finally {
      setAddingOpening(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Cash Book
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowOpeningDialog(true)}>
            <PiggyBank className="h-4 w-4 mr-2" />
            Opening Balance
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>
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

      {/* Entries — Passbook Style Format */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Cash Transactions — Passbook</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {loading ? (
              <div className="py-16 text-center"><Loader2 className="h-7 w-7 animate-spin mx-auto text-teal-500" /></div>
            ) : entries.length === 0 ? (
              <div className="py-14 text-center text-gray-500">
                <Wallet className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No cash transactions found</p>
                <p className="text-xs text-gray-400 mt-1">Click "Opening Balance" to get started</p>
              </div>
            ) : (
              Object.entries(
                entries.reduce((groups, entry) => {
                  const date = format(new Date(entry.createdAt), 'yyyy-MM-dd');
                  if (!groups[date]) groups[date] = [];
                  groups[date].push(entry);
                  return groups;
                }, {} as Record<string, CashBookEntry[]>)
              )
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([date, dayEntries]) => (
                  <div key={date} className="mb-4">
                    <div className="sticky top-0 bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-800 border-b border-teal-100 flex items-center justify-between">
                      <span>{format(new Date(date), 'EEEE, dd MMMM yyyy')}</span>
                      <span className="text-xs font-normal text-teal-600">{dayEntries.length} transactions</span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 text-xs">
                          <TableHead className="text-xs uppercase tracking-wide">Time</TableHead>
                          <TableHead className="text-xs uppercase tracking-wide">Description</TableHead>
                          <TableHead className="text-right text-xs uppercase tracking-wide text-emerald-700">Credit (IN)</TableHead>
                          <TableHead className="text-right text-xs uppercase tracking-wide text-red-700">Debit (OUT)</TableHead>
                          <TableHead className="text-right text-xs uppercase tracking-wide text-teal-700">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dayEntries.map((entry, idx) => (
                          <TableRow key={entry.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-teal-50/30 transition-colors`}>
                            <TableCell className="font-mono text-sm text-gray-500">
                              {format(new Date(entry.createdAt), 'HH:mm')}
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              <p className="truncate text-sm font-medium">{entry.description}</p>
                              <p className="text-xs text-gray-400">{entry.referenceType?.replace(/_/g, ' ')}</p>
                            </TableCell>
                            <TableCell className="text-right">
                              {entry.entryType === 'CREDIT' ? (
                                <span className="font-semibold text-emerald-600">+{formatCurrency(entry.amount)}</span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {entry.entryType === 'DEBIT' ? (
                                <span className="font-semibold text-red-600">{formatCurrency(entry.amount)}</span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${(entry.balanceAfter || 0) < 0 ? 'text-red-600' : 'text-teal-700'}`}>
                              {formatCurrency(entry.balanceAfter || 0)}
                            </TableCell>
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

      {/* Opening Balance Dialog */}
      <Dialog open={showOpeningDialog} onOpenChange={setShowOpeningDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-teal-600" />
              Set Opening Balance
            </DialogTitle>
            <div className="text-sm text-gray-500">
              Records the initial cash balance for this company.
              <div className="mt-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                Dr: Cash in Hand → Cr: Opening Balance / Capital
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Opening Cash Balance (₹) *</Label>
              <Input
                type="number"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="Enter opening cash amount"
                className="text-lg font-bold"
              />
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm text-teal-800">
              This will:
              <ul className="mt-1 list-disc list-inside text-teal-700 space-y-0.5">
                <li>Add ₹{parseFloat(openingAmount) > 0 ? formatCurrency(parseFloat(openingAmount)) : '0'} to Cash Book</li>
                <li>Record a Day Book entry: Dr Cash / Cr Capital</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowOpeningDialog(false)}>Cancel</Button>
            <Button
              onClick={handleAddOpeningBalance}
              disabled={addingOpening || !openingAmount || parseFloat(openingAmount) <= 0}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {addingOpening ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Set Opening Balance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cash Entry</DialogTitle>
            <div className="text-sm text-gray-500">Record a manual cash receipt or payment in the cash book.</div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Entry Type *</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={addEntryType === 'CREDIT' ? 'default' : 'outline'}
                  className={addEntryType === 'CREDIT' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                  onClick={() => setAddEntryType('CREDIT')}
                >
                  <Plus className="h-4 w-4 mr-1" /> Cash In (Receipt)
                </Button>
                <Button
                  type="button"
                  variant={addEntryType === 'DEBIT' ? 'default' : 'outline'}
                  className={addEntryType === 'DEBIT' ? 'bg-red-600 hover:bg-red-700' : ''}
                  onClick={() => setAddEntryType('DEBIT')}
                >
                  Cash Out (Payment)
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
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
              onClick={handleAddEntry}
              disabled={adding}
              className={addEntryType === 'CREDIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {addEntryType === 'CREDIT' ? 'Add Cash In' : 'Add Cash Out'}
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
  const [showBorrowDialog, setShowBorrowDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedBankForEdit, setSelectedBankForEdit] = useState<BankAccount | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
    ownerName: '',
    branchName: '',
    ifscCode: '',
    accountType: 'CURRENT',
    openingBalance: 0,
    upiId: '',
    qrCodeUrl: '',
    isDefault: false
  });
  const [equityForm, setEquityForm] = useState({
    cashAmount: '',
    bankAmount: '',
    description: 'Initial Capital Investment',
    bankAccountId: ''
  });
  const [borrowForm, setBorrowForm] = useState({
    sourceType: 'BANK_LOAN',
    sourceName: '',
    amount: '',
    interestRate: '',
    dueDate: '',
    description: '',
    bankAccountId: ''
  });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    // Guard against empty/invalid companyId - must be a valid CUID (at least 10 chars)
    if (!selectedCompanyId || selectedCompanyId === '' || selectedCompanyId.length < 10) {
      console.log('[BankSection] Skipping API call - no valid companyId');
      setBankAccounts([]);
      setTransactions([]);
      setLoading(false);
      return;
    }
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

  // Open Bank Dialog (for Add or Edit)
  const openBankDialog = (bank?: BankAccount) => {
    if (bank) {
      setEditMode(true);
      setSelectedBankForEdit(bank);
      setBankForm({
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        accountName: bank.accountName || '',
        ownerName: bank.ownerName || '',
        branchName: bank.branchName || '',
        ifscCode: bank.ifscCode || '',
        accountType: bank.accountType || 'CURRENT',
        openingBalance: 0,
        upiId: bank.upiId || '',
        qrCodeUrl: bank.qrCodeUrl || '',
        isDefault: bank.isDefault
      });
    } else {
      setEditMode(false);
      setSelectedBankForEdit(null);
      setBankForm({
        bankName: '',
        accountNumber: '',
        accountName: '',
        ownerName: '',
        branchName: '',
        ifscCode: '',
        accountType: 'CURRENT',
        openingBalance: 0,
        upiId: '',
        qrCodeUrl: '',
        isDefault: false
      });
    }
    setShowAddDialog(true);
  };

  // Handle QR Code Upload
  const handleQrCodeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingQr(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const res = await fetch('/api/upload/qr-code', {
        method: 'POST',
        body: formDataUpload
      });

      const data = await res.json();
      if (data.success && data.url) {
        setBankForm(prev => ({ ...prev, qrCodeUrl: data.url }));
        toast.success('QR Code uploaded successfully');
      } else {
        toast.error(data.error || 'Failed to upload QR Code');
      }
    } catch (error) {
      toast.error('Failed to upload QR Code');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleAddBank = async () => {
    if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountName) {
      toast.error('Please fill all required fields (Bank Name, Account Number, Account Name)');
      return;
    }

    setSaving(true);
    try {
      const url = editMode 
        ? `/api/accountant/bank-accounts/${selectedBankForEdit?.id}`
        : '/api/accountant/bank-accounts';
      
      const method = editMode ? 'PUT' : 'POST';
      
      const body = editMode 
        ? { ...bankForm, companyId: selectedCompanyId }
        : { ...bankForm, companyId: selectedCompanyId, openingBalance: bankForm.openingBalance };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast.success(editMode ? 'Bank account updated successfully' : 'Bank account added successfully');
        setShowAddDialog(false);
        setBankForm({
          bankName: '',
          accountNumber: '',
          accountName: '',
          ownerName: '',
          branchName: '',
          ifscCode: '',
          accountType: 'CURRENT',
          openingBalance: 0,
          upiId: '',
          qrCodeUrl: '',
          isDefault: false
        });
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save bank account');
      }
    } catch (error) {
      toast.error('Failed to save bank account');
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

  const handleBorrow = async () => {
    const amount = parseFloat(borrowForm.amount);
    
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (!borrowForm.sourceName.trim()) {
      toast.error('Please enter the source name (e.g., HDFC Bank)');
      return;
    }

    // Check if bank account exists
    if (bankAccounts.length === 0) {
      toast.error('Please add a bank account first before recording borrowing');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/accounting/borrowed-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          sourceType: borrowForm.sourceType,
          sourceName: borrowForm.sourceName,
          amount: borrowForm.amount,
          interestRate: borrowForm.interestRate || null,
          dueDate: borrowForm.dueDate || null,
          description: borrowForm.description || `Loan received from ${borrowForm.sourceName}`,
          bankAccountId: borrowForm.bankAccountId || (bankAccounts.find(b => b.isDefault)?.id || bankAccounts[0].id),
          createdById: 'system'
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || `Successfully recorded borrowing of ${formatCurrency(amount)}`);
        setShowBorrowDialog(false);
        setBorrowForm({
          sourceType: 'BANK_LOAN',
          sourceName: '',
          amount: '',
          interestRate: '',
          dueDate: '',
          description: '',
          bankAccountId: ''
        });
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to record borrowing');
      }
    } catch (error) {
      toast.error('Failed to record borrowing');
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
          <Button onClick={() => openBankDialog()}>
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
              <Button onClick={() => openBankDialog()}>Add Bank Account</Button>
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
                    <div className="flex items-center gap-2">
                      {bank.isDefault && <Badge className="bg-emerald-500">Default</Badge>}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => openBankDialog(bank)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
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
                    {bank.qrCodeUrl && (
                      <div className="mt-2 flex flex-col gap-1">
                        <img 
                          src={bank.qrCodeUrl} 
                          alt="QR Code" 
                          className="w-20 h-20 rounded border object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden'); }}
                        />
                        <span className="hidden text-xs text-amber-500">âš  QR not found â€” please re-upload</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bank Transactions â€” Passbook</CardTitle>
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
                        <div className="sticky top-0 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800 border-b border-blue-100 flex items-center justify-between">
                          <span>{format(new Date(date), 'EEEE, dd MMMM yyyy')}</span>
                          <span className="text-xs font-normal text-blue-600">{txns.length} transactions</span>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50 text-xs">
                              <TableHead className="text-xs uppercase tracking-wide">Time</TableHead>
                              <TableHead className="text-xs uppercase tracking-wide">Description</TableHead>
                              <TableHead className="text-right text-xs uppercase tracking-wide text-emerald-700">Credit (IN)</TableHead>
                              <TableHead className="text-right text-xs uppercase tracking-wide text-red-700">Debit (OUT)</TableHead>
                              <TableHead className="text-right text-xs uppercase tracking-wide text-blue-700">Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {txns.map((txn, idx) => (
                              <TableRow key={txn.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/30 transition-colors`}>
                                <TableCell className="font-mono text-sm text-gray-500">{format(new Date(txn.transactionDate), 'HH:mm')}</TableCell>
                                <TableCell className="max-w-[200px]">
                                  <p className="truncate text-sm font-medium">{txn.description}</p>
                                </TableCell>
                                <TableCell className="text-right">
                                  {txn.transactionType === 'CREDIT' ? (
                                    <span className="font-semibold text-emerald-600">+{formatCurrency(txn.amount)}</span>
                                  ) : (
                                    <span className="text-gray-300">â€”</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {txn.transactionType === 'DEBIT' ? (
                                    <span className="font-semibold text-red-600">{formatCurrency(txn.amount)}</span>
                                  ) : (
                                    <span className="text-gray-300">â€”</span>
                                  )}
                                </TableCell>
                                <TableCell className={`text-right font-bold ${(txn.balanceAfter || 0) < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                                  {formatCurrency(txn.balanceAfter || 0)}
                                </TableCell>
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

      {/* Add/Edit Bank Dialog - Same as Company Dashboard */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-blue-600" />
              {editMode ? 'Edit Bank Account' : 'Add Bank Account'}
            </DialogTitle>
            <DialogDescription>
              Fill in the bank account details. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Details */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-700">Basic Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bank Name *</Label>
                  <Input 
                    value={bankForm.bankName} 
                    onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                    placeholder="e.g., HDFC Bank"
                  />
                </div>
                <div>
                  <Label>Account Number *</Label>
                  <Input 
                    value={bankForm.accountNumber} 
                    onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                    placeholder="Enter account number"
                  />
                </div>
                <div>
                  <Label>Account Name *</Label>
                  <Input 
                    value={bankForm.accountName} 
                    onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                    placeholder="Account holder name"
                  />
                </div>
                <div>
                  <Label>Owner Name</Label>
                  <Input 
                    value={bankForm.ownerName} 
                    onChange={(e) => setBankForm({ ...bankForm, ownerName: e.target.value })}
                    placeholder="Bank account owner's name"
                  />
                </div>
                <div>
                  <Label>Branch Name</Label>
                  <Input 
                    value={bankForm.branchName} 
                    onChange={(e) => setBankForm({ ...bankForm, branchName: e.target.value })}
                    placeholder="Branch name"
                  />
                </div>
                <div>
                  <Label>IFSC Code</Label>
                  <Input 
                    value={bankForm.ifscCode} 
                    onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })}
                    placeholder="IFSC Code"
                    maxLength={11}
                  />
                </div>
                <div>
                  <Label>Account Type</Label>
                  <select 
                    className="w-full border rounded-md p-2"
                    value={bankForm.accountType}
                    onChange={(e) => setBankForm({ ...bankForm, accountType: e.target.value })}
                  >
                    <option value="CURRENT">Current</option>
                    <option value="SAVINGS">Savings</option>
                    <option value="OD">Overdraft</option>
                  </select>
                </div>
                {!editMode && (
                  <div>
                    <Label>Opening Balance</Label>
                    <Input 
                      type="number"
                      value={bankForm.openingBalance} 
                      onChange={(e) => setBankForm({ ...bankForm, openingBalance: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Default Setting */}
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="isDefaultBank" 
                checked={bankForm.isDefault}
                onChange={(e) => setBankForm({ ...bankForm, isDefault: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isDefaultBank">Set as default bank account for this company</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddBank} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {editMode ? 'Update' : 'Create'}
                </>
              )}
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
            <DialogDescription>Add new capital investment into the business.</DialogDescription>
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

      {/* Borrow Money Dialog */}
      <Dialog open={showBorrowDialog} onOpenChange={setShowBorrowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-600" />
              Borrow Money from External Source
            </DialogTitle>
            <DialogDescription>
              Record a loan received from bank, financial institution, or person
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-orange-50 p-4 rounded-lg text-sm text-orange-800">
              <p className="font-medium mb-1">Double-Entry Accounting</p>
              <p>This will properly record the borrowing:</p>
              <ul className="mt-2 list-disc list-inside text-orange-700">
                <li>Debit: Bank Account (money IN)</li>
                <li>Credit: Liability Account (money OWED)</li>
              </ul>
              <p className="mt-2 text-orange-600 font-medium">âš ï¸ This is NOT income - you must repay this!</p>
            </div>
            
            <div className="space-y-2">
              <Label>Loan Type *</Label>
              <Select
                value={borrowForm.sourceType}
                onValueChange={(value) => setBorrowForm({ ...borrowForm, sourceType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_LOAN">Bank Loan</SelectItem>
                  <SelectItem value="BORROWED_FUNDS">Borrowed Funds (Personal/Other)</SelectItem>
                  <SelectItem value="INVESTOR_CAPITAL">Investor Capital</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {borrowForm.sourceType === 'BANK_LOAN' && 'Select for loans from banks (HDFC, SBI, ICICI, etc.)'}
                {borrowForm.sourceType === 'BORROWED_FUNDS' && 'Select for personal loans from individuals or other sources'}
                {borrowForm.sourceType === 'INVESTOR_CAPITAL' && 'Select for capital received from investors'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Source Name *</Label>
              <Input
                value={borrowForm.sourceName}
                onChange={(e) => setBorrowForm({ ...borrowForm, sourceName: e.target.value })}
                placeholder="e.g., HDFC Bank, Personal loan from Mr. Sharma"
              />
            </div>

            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                value={borrowForm.amount}
                onChange={(e) => setBorrowForm({ ...borrowForm, amount: e.target.value })}
                placeholder="Enter amount"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Interest Rate (% p.a.)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={borrowForm.interestRate}
                  onChange={(e) => setBorrowForm({ ...borrowForm, interestRate: e.target.value })}
                  placeholder="e.g., 12"
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={borrowForm.dueDate}
                  onChange={(e) => setBorrowForm({ ...borrowForm, dueDate: e.target.value })}
                />
              </div>
            </div>

            {bankAccounts.length > 1 && (
              <div className="space-y-2">
                <Label>Deposit to Bank Account</Label>
                <Select
                  value={borrowForm.bankAccountId}
                  onValueChange={(value) => setBorrowForm({ ...borrowForm, bankAccountId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
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

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={borrowForm.description}
                onChange={(e) => setBorrowForm({ ...borrowForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>

            <Card className="bg-orange-50">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Amount to Receive:</span>
                  <span className="text-xl font-bold text-orange-700">
                    {formatCurrency(parseFloat(borrowForm.amount) || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 text-sm">
                  <span className="text-gray-600">Liability Created:</span>
                  <span className="text-orange-600 font-medium">
                    {borrowForm.sourceType === 'BANK_LOAN' ? 'Bank Loans (2101)' : 
                     borrowForm.sourceType === 'INVESTOR_CAPITAL' ? 'Investor Capital (2110)' : 
                     'Borrowed Funds (2120)'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBorrowDialog(false)}>Cancel</Button>
            <Button onClick={handleBorrow} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Record Borrowing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// CHART OF ACCOUNTS SECTION - GnuCash Style
// ============================================
function ChartOfAccountsSection({
  selectedCompanyId,
  formatCurrency
}: {
  selectedCompanyId: string;
  formatCurrency: (amount: number) => string;
}) {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAccount, setNewAccount] = useState({
    accountCode: '',
    accountName: '',
    accountType: 'ASSET',
    description: '',
    openingBalance: 0
  });
  const [saving, setSaving] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/chart-of-accounts?companyId=${selectedCompanyId}`);
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleAddAccount = async () => {
    if (!newAccount.accountCode || !newAccount.accountName) {
      toast.error('Please fill account code and name');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/accounting/chart-of-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAccount,
          companyId: selectedCompanyId
        })
      });

      if (res.ok) {
        toast.success('Account created successfully');
        setShowAddDialog(false);
        setNewAccount({ accountCode: '', accountName: '', accountType: 'ASSET', description: '', openingBalance: 0 });
        loadAccounts();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create account');
      }
    } catch (error) {
      toast.error('Failed to create account');
    } finally {
      setSaving(false);
    }
  };

  // Group accounts by type - ensure all types are initialized
  const groupedAccounts = accounts.reduce((groups, account) => {
    const type = account.accountType;
    if (!groups[type]) groups[type] = [];
    groups[type].push(account);
    return groups;
  }, {} as Record<string, ChartOfAccount[]>);

  // Debug: Log grouped accounts to see what's happening
  useEffect(() => {
    if (accounts.length > 0) {
      console.log('[ChartOfAccounts] Total accounts:', accounts.length);
      console.log('[ChartOfAccounts] Grouped:', Object.keys(groupedAccounts).map(type => 
        `${type}: ${groupedAccounts[type]?.length || 0}`
      ).join(', '));
    }
  }, [accounts, groupedAccounts]);

  const accountTypeOrder = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
  const accountTypeLabels: Record<string, string> = {
    'ASSET': 'Assets',
    'LIABILITY': 'Liabilities',
    'EQUITY': 'Equity',
    'INCOME': 'Income',
    'EXPENSE': 'Expenses'
  };

  const getAccountTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'ASSET': 'bg-blue-50 border-blue-200',
      'LIABILITY': 'bg-red-50 border-red-200',
      'EQUITY': 'bg-purple-50 border-purple-200',
      'INCOME': 'bg-green-50 border-green-200',
      'EXPENSE': 'bg-orange-50 border-orange-200'
    };
    return colors[type] || 'bg-gray-50 border-gray-200';
  };

  const calculateTypeTotal = (type: string) => {
    return (groupedAccounts[type] || []).reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
  };

  // Recalculate all account balances
  const handleRecalculateBalances = async () => {
    if (!selectedCompanyId) return;
    try {
      const res = await fetch('/api/accounting/recalculate-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: selectedCompanyId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Balances recalculated');
        loadAccounts();
      } else {
        toast.error('Failed to recalculate balances');
      }
    } catch (error) {
      toast.error('Failed to recalculate balances');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BookCopy className="h-5 w-5" />
          Chart of Accounts
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRecalculateBalances}>
            <Zap className="h-4 w-4 mr-2" />
            Recalculate
          </Button>
          <Button variant="outline" size="sm" onClick={loadAccounts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <BookCopy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No accounts found. Click "Add Account" to create your first account.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {accountTypeOrder.map((type) => {
            const typeAccounts = groupedAccounts[type] || [];
            if (typeAccounts.length === 0) return null;

            return (
              <Card key={type} className={getAccountTypeColor(type)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{accountTypeLabels[type]}</CardTitle>
                    <Badge variant="outline">{typeAccounts.length} accounts</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Code</TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="w-20">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {typeAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-mono text-sm">{account.accountCode}</TableCell>
                          <TableCell className="font-medium">{account.accountName}</TableCell>
                          <TableCell className={`text-right font-medium ${
                            type === 'ASSET' || type === 'EXPENSE' 
                              ? 'text-blue-600' 
                              : 'text-green-600'
                          }`}>
                            {formatCurrency(account.currentBalance || 0)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={account.isActive ? 'default' : 'secondary'} className="text-xs">
                              {account.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-white/50 font-bold">
                        <TableCell colSpan={2}>Total {accountTypeLabels[type]}</TableCell>
                        <TableCell className={`text-right ${
                          type === 'ASSET' || type === 'EXPENSE' 
                            ? 'text-blue-700' 
                            : 'text-green-700'
                        }`}>
                          {formatCurrency(calculateTypeTotal(type))}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>Create a new account in the chart of accounts</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Code *</Label>
                <Input
                  value={newAccount.accountCode}
                  onChange={(e) => setNewAccount({ ...newAccount, accountCode: e.target.value })}
                  placeholder="e.g., 1101"
                />
              </div>
              <div className="space-y-2">
                <Label>Account Type *</Label>
                <Select
                  value={newAccount.accountType}
                  onValueChange={(value) => setNewAccount({ ...newAccount, accountType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSET">Asset</SelectItem>
                    <SelectItem value="LIABILITY">Liability</SelectItem>
                    <SelectItem value="EQUITY">Equity</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Account Name *</Label>
              <Input
                value={newAccount.accountName}
                onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })}
                placeholder="e.g., Cash in Hand"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={newAccount.description}
                onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-2">
              <Label>Opening Balance</Label>
              <Input
                type="number"
                value={newAccount.openingBalance}
                onChange={(e) => setNewAccount({ ...newAccount, openingBalance: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddAccount} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// TRIAL BALANCE SECTION - GnuCash Style
// ============================================
function TrialBalanceSection({
  selectedCompanyId,
  formatCurrency,
  formatDate
}: {
  selectedCompanyId: string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}) {
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const loadTrialBalance = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/trial-balance?companyId=${selectedCompanyId}&asOfDate=${asOfDate}`);
      const data = await res.json();
      setTrialBalance(data.data || data);
    } catch (error) {
      console.error('Error loading trial balance:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, asOfDate]);

  useEffect(() => {
    loadTrialBalance();
  }, [loadTrialBalance]);

  const exportToCSV = () => {
    if (!trialBalance?.trialBalance) return;
    
    let csv = 'Account Code,Account Name,Account Type,Debit Balance,Credit Balance\n';
    trialBalance.trialBalance.forEach((acc: any) => {
      csv += `${acc.accountCode},${acc.accountName},${acc.accountType},${acc.debitBalance},${acc.creditBalance}\n`;
    });
    csv += `\nTotal,,,${trialBalance.summary?.totalDebitBalance || 0},${trialBalance.summary?.totalCreditBalance || 0}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial_balance_${asOfDate}.csv`;
    a.click();
    toast.success('Trial Balance exported');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Trial Balance
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">As of:</span>
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadTrialBalance}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <FileText className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {trialBalance?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Debit</p>
              <p className="text-xl font-bold text-blue-700">
                {formatCurrency(trialBalance.summary.totalDebitBalance || 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Credit</p>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(trialBalance.summary.totalCreditBalance || 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Accounts</p>
              <p className="text-xl font-bold text-purple-700">
                {trialBalance.summary.totalAccounts || 0}
              </p>
            </CardContent>
          </Card>
          <Card className={`${trialBalance.summary.isBalanced ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {trialBalance.summary.isBalanced ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className={`text-lg font-bold ${trialBalance.summary.isBalanced ? 'text-emerald-700' : 'text-red-700'}`}>
                    {trialBalance.summary.isBalanced ? 'Balanced' : 'Not Balanced'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
        </div>
      ) : !trialBalance?.trialBalance || trialBalance.trialBalance.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No trial balance data found. Please ensure Chart of Accounts is set up.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Trial Balance as of {formatDate(asOfDate)}</CardTitle>
            <CardDescription>
              All accounts with their debit and credit balances - Total must balance
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <ScrollArea className="w-full h-[600px]">
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-24">Code</TableHead>
                      <TableHead className="min-w-[200px]">Account Name</TableHead>
                      <TableHead className="w-32">Type</TableHead>
                      <TableHead className="text-right w-40">Debit (â‚¹)</TableHead>
                      <TableHead className="text-right w-40">Credit (â‚¹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(trialBalance.trialBalance || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500 italic">
                          No accounts found for the current filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (trialBalance.trialBalance || []).map((row: any) => (
                        <TableRow key={row.accountCode} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="font-mono text-xs">{row.accountCode}</TableCell>
                          <TableCell className="font-medium text-gray-800">{row.accountName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tight">
                              {row.accountType.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-blue-600 font-medium text-sm">
                            {row.debitBalance > 0 ? formatCurrency(row.debitBalance) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-600 font-medium text-sm">
                            {row.creditBalance > 0 ? formatCurrency(row.creditBalance) : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    
                    {(trialBalance.trialBalance || []).length > 0 && (
                      <TableRow className="bg-emerald-50/50 font-bold border-t-2 border-emerald-100 sticky bottom-0 z-10">
                        <TableCell colSpan={3} className="text-base text-emerald-900 uppercase tracking-wider">GRAND TOTAL</TableCell>
                        <TableCell className="text-right text-blue-800 text-lg decoration-double underline underline-offset-4">
                          {formatCurrency(trialBalance.summary?.totalDebitBalance || 0)}
                        </TableCell>
                        <TableCell className="text-right text-green-800 text-lg decoration-double underline underline-offset-4">
                          {formatCurrency(trialBalance.summary?.totalCreditBalance || 0)}
                        </TableCell>
                      </TableRow>
                    )}

                    {!trialBalance.summary?.isBalanced && (trialBalance.trialBalance || []).length > 0 && (
                      <TableRow className="bg-red-50">
                        <TableCell colSpan={3} className="text-red-700 font-bold">Difference (Unbalanced)</TableCell>
                        <TableCell colSpan={2} className="text-right text-red-700 font-bold text-lg">
                          {formatCurrency(trialBalance.summary?.difference || 0)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// PROFIT & LOSS SECTION - GnuCash Style
// ============================================
function ProfitLossSection({
  selectedCompanyId,
  formatCurrency,
  formatDate
}: {
  selectedCompanyId: string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}) {
  const [profitLoss, setProfitLoss] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const loadProfitLoss = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/reports?type=profit-loss&companyId=${selectedCompanyId}&startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      setProfitLoss(data);
    } catch (error) {
      console.error('Error loading P&L:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, startDate, endDate]);

  useEffect(() => {
    loadProfitLoss();
  }, [loadProfitLoss]);

  const exportToCSV = () => {
    if (!profitLoss) return;
    
    let csv = 'Profit & Loss Statement\n';
    csv += `Period: ${startDate} to ${endDate}\n\n`;
    csv += 'INCOME\n';
    (profitLoss.income || []).forEach((inc: any) => {
      csv += `${inc.accountName},${inc.amount}\n`;
    });
    csv += `Total Income,${profitLoss.totalIncome || 0}\n\n`;
    csv += 'EXPENSES\n';
    (profitLoss.expenses || []).forEach((exp: any) => {
      csv += `${exp.accountName},${exp.amount}\n`;
    });
    csv += `Total Expenses,${profitLoss.totalExpenses || 0}\n\n`;
    csv += `Net Profit/Loss,${profitLoss.netProfit || 0}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit_loss_${startDate}_to_${endDate}.csv`;
    a.click();
    toast.success('P&L exported');
  };

  const netProfit = profitLoss?.netProfit || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Profit & Loss Statement
        </h2>
        <div className="flex items-center gap-4 flex-wrap">
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
          <Button variant="outline" size="sm" onClick={loadProfitLoss}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <FileText className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income */}
            <Card>
              <CardHeader className="bg-green-50">
                <CardTitle className="text-green-700 flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5" />
                  INCOME
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {(profitLoss?.income || []).length > 0 ? (
                      profitLoss.income.map((inc: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{inc.accountName}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(inc.amount)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell className="text-gray-500">No income recorded</TableCell>
                        <TableCell className="text-right">â‚¹0.00</TableCell>
                      </TableRow>
                    )}
                    <TableRow className="bg-green-50 font-bold">
                      <TableCell>Total Income</TableCell>
                      <TableCell className="text-right text-green-700 text-lg">
                        {formatCurrency(profitLoss?.totalIncome || 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Expenses */}
            <Card>
              <CardHeader className="bg-red-50">
                <CardTitle className="text-red-700 flex items-center gap-2">
                  <ArrowDownRight className="h-5 w-5" />
                  EXPENSES
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {(profitLoss?.expenses || []).length > 0 ? (
                      profitLoss.expenses.map((exp: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{exp.accountName}</TableCell>
                          <TableCell className="text-right text-red-600">{formatCurrency(exp.amount)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell className="text-gray-500">No expenses recorded</TableCell>
                        <TableCell className="text-right">â‚¹0.00</TableCell>
                      </TableRow>
                    )}
                    <TableRow className="bg-red-50 font-bold">
                      <TableCell>Total Expenses</TableCell>
                      <TableCell className="text-right text-red-700 text-lg">
                        {formatCurrency(profitLoss?.totalExpenses || 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Net Profit/Loss */}
          <Card className={`border-2 ${netProfit >= 0 ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {netProfit >= 0 ? (
                    <TrendingUp className="h-10 w-10 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-10 w-10 text-red-600" />
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Net {netProfit >= 0 ? 'Profit' : 'Loss'}</p>
                    <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(Math.abs(netProfit))}
                    </p>
                  </div>
                </div>
                <Badge variant={netProfit >= 0 ? 'default' : 'destructive'} className="text-lg px-4 py-2">
                  {netProfit >= 0 ? 'PROFIT' : 'LOSS'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ============================================
// BALANCE SHEET SECTION - GnuCash Style
// ============================================
function BalanceSheetSection({
  selectedCompanyId,
  formatCurrency,
  formatDate
}: {
  selectedCompanyId: string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}) {
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const loadBalanceSheet = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/reports?type=balance-sheet&companyId=${selectedCompanyId}`);
      const data = await res.json();
      setBalanceSheet(data);
    } catch (error) {
      console.error('Error loading balance sheet:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadBalanceSheet();
  }, [loadBalanceSheet]);

  const exportToCSV = () => {
    if (!balanceSheet) return;
    
    let csv = 'Balance Sheet\n';
    csv += `As of: ${asOfDate}\n\n`;
    csv += 'ASSETS\n';
    csv += 'Account Name,Amount\n';
    (balanceSheet.assets || []).forEach((asset: any) => {
      csv += `${asset.accountName},${asset.amount}\n`;
    });
    csv += `Total Assets,${balanceSheet.totalAssets || 0}\n\n`;
    csv += 'LIABILITIES\n';
    (balanceSheet.liabilities || []).forEach((liab: any) => {
      csv += `${liab.accountName},${liab.amount}\n`;
    });
    csv += `Total Liabilities,${balanceSheet.totalLiabilities || 0}\n\n`;
    csv += 'EQUITY\n';
    (balanceSheet.equity || []).forEach((eq: any) => {
      csv += `${eq.accountName},${eq.amount}\n`;
    });
    csv += `Total Equity,${balanceSheet.totalEquity || 0}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance_sheet_${asOfDate}.csv`;
    a.click();
    toast.success('Balance Sheet exported');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Balance Sheet
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">As of:</span>
            <Input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-36"
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadBalanceSheet}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <FileText className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Balance Check */}
      {balanceSheet?.balanceCheck && (
        <Card className={`${balanceSheet.balanceCheck.isBalanced ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {balanceSheet.balanceCheck.isBalanced ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <span className={balanceSheet.balanceCheck.isBalanced ? 'text-emerald-700' : 'text-red-700'}>
                  {balanceSheet.balanceCheck.isBalanced 
                    ? 'Balance Sheet is Balanced' 
                    : `Difference: ${formatCurrency(Math.abs(balanceSheet.balanceCheck.assets - balanceSheet.balanceCheck.liabilitiesAndEquity))}`}
                </span>
              </div>
              <Badge variant={balanceSheet.balanceCheck.isBalanced ? 'default' : 'destructive'}>
                Assets = {formatCurrency(balanceSheet.balanceCheck.assets)} | L+E = {formatCurrency(balanceSheet.balanceCheck.liabilitiesAndEquity)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets */}
          <Card>
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-blue-700 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                ASSETS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  {(balanceSheet?.assets || []).length > 0 ? (
                    (balanceSheet.assets as any[]).flatMap((asset: any, idx: number) => {
                      const rows: React.ReactElement[] = [];
                      // HEAD row
                      rows.push(
                        <TableRow key={`head-${idx}`} className={asset.isHead ? 'bg-blue-50/60 font-semibold' : ''}>
                          <TableCell className={`font-medium ${asset.isHead ? 'text-blue-800' : ''}`}>
                            {asset.accountName}
                          </TableCell>
                          <TableCell className={`text-right ${asset.amount < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                            {formatCurrency(asset.amount)}
                          </TableCell>
                        </TableRow>
                      );
                      // SUB-HEAD rows (individual banks)
                      if (asset.isHead && Array.isArray(asset.subAccounts)) {
                        asset.subAccounts.forEach((sub: any, si: number) => {
                          rows.push(
                            <TableRow key={`sub-${idx}-${si}`} className="bg-slate-50/50">
                              <TableCell className="pl-8 text-sm text-gray-600">
                                â†³ {sub.accountName}
                              </TableCell>
                              <TableCell className={`text-right text-sm ${sub.amount < 0 ? 'text-red-500' : 'text-slate-600'}`}>
                                {formatCurrency(sub.amount)}
                              </TableCell>
                            </TableRow>
                          );
                        });
                      }
                      return rows;
                    })
                  ) : (
                    <TableRow>
                      <TableCell className="text-gray-500">No assets recorded</TableCell>
                      <TableCell className="text-right">â‚¹0.00</TableCell>
                    </TableRow>
                  )}
                  <TableRow className="bg-blue-50 font-bold">
                    <TableCell>Total Assets</TableCell>
                    <TableCell className="text-right text-blue-700 text-lg">
                      {formatCurrency(balanceSheet?.totalAssets || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>


          {/* Liabilities & Equity */}
          <Card>
            <CardHeader className="bg-red-50">
              <CardTitle className="text-red-700">LIABILITIES & EQUITY</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={2} className="font-bold text-gray-600 bg-gray-50">LIABILITIES</TableCell>
                  </TableRow>
                  {(balanceSheet?.liabilities || []).length > 0 ? (
                    balanceSheet.liabilities.map((liab: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{liab.accountName}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(liab.amount)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="text-gray-500">No liabilities</TableCell>
                      <TableCell className="text-right">â‚¹0.00</TableCell>
                    </TableRow>
                  )}
                  <TableRow className="bg-red-50">
                    <TableCell className="font-medium">Total Liabilities</TableCell>
                    <TableCell className="text-right text-red-700">{formatCurrency(balanceSheet?.totalLiabilities || 0)}</TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell colSpan={2} className="font-bold text-gray-600 bg-gray-50">EQUITY</TableCell>
                  </TableRow>
                  {(balanceSheet?.equity || []).map((eq: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{eq.accountName}</TableCell>
                      <TableCell className="text-right text-purple-600">{formatCurrency(eq.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-purple-50">
                    <TableCell className="font-medium">Total Equity</TableCell>
                    <TableCell className="text-right text-purple-700">{formatCurrency(balanceSheet?.totalEquity || 0)}</TableCell>
                  </TableRow>
                  
                  <TableRow className="bg-gray-100 font-bold">
                    <TableCell>Total Liabilities & Equity</TableCell>
                    <TableCell className="text-right text-lg">
                      {formatCurrency((balanceSheet?.totalLiabilities || 0) + (balanceSheet?.totalEquity || 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
// ACCOUNTANT EXPENSE SECTION
// ============================================
function AccountantExpenseSection({ userId, companyId }: { userId: string; companyId?: string }) {
  const [history, setHistory] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const url = `/api/expense-request?status=APPROVED${companyId ? `&companyId=${companyId}` : ''}&limit=100`;
        const res = await fetch(url);
        const data = await res.json();
        setHistory(data.requests || []);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [refreshKey, companyId]);

  const total = history.reduce((s: number, r: any) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">Expense Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">Record direct expenses — posted immediately to accounting</p>
        </div>
        <ExpenseRequestPanel
          role="ACCOUNTANT"
          userId={userId}
          companyId={companyId}
          triggerLabel="Add Expense"
          onSuccess={() => setRefreshKey(k => k + 1)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-xs text-red-600 font-medium">Total Expenses Posted</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{history.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <p className="text-xs text-orange-600 font-medium">Total Amount</p>
            <p className="text-2xl font-bold text-orange-700 mt-1">₹{total.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Expense History (Approved)</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No expenses recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs uppercase">No.</TableHead>
                    <TableHead className="text-xs uppercase">Type</TableHead>
                    <TableHead className="text-xs uppercase">Description</TableHead>
                    <TableHead className="text-xs uppercase">Source</TableHead>
                    <TableHead className="text-right text-xs uppercase">Amount</TableHead>
                    <TableHead className="text-xs uppercase">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((r: any, i: number) => (
                    <TableRow key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <TableCell className="font-mono text-xs text-gray-500">{r.expenseNumber}</TableCell>
                      <TableCell><span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded">{r.expenseType}</span></TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">{r.description}</TableCell>
                      <TableCell className="text-xs text-gray-500">{r.payeeName === 'BANK' ? '🏦 Bank' : '💵 Cash'}</TableCell>
                      <TableCell className="text-right font-semibold text-red-700">₹{r.amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function UnifiedAccountantDashboard() {
  const { user, signOut } = useAuth();
  const { settings } = useSettings();
  
  // State
  const [loading, setLoading] = useState(true);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('day-book');
  const [showManualEntryDialog, setShowManualEntryDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showBorrowDialog, setShowBorrowDialog] = useState(false);
  const [showRepayDialog, setShowRepayDialog] = useState(false);
  const [showCapitalDialog, setShowCapitalDialog] = useState(false);
  const [bankAccountsList, setBankAccountsList] = useState<BankAccount[]>([]);

  // Company
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const companyType = getCompanyType(selectedCompany);

  // Load bank accounts for dialogs (placed after selectedCompanyId is declared)
  useEffect(() => {
    if (!selectedCompanyId) return;
    fetch(`/api/accounting/bank-accounts?companyId=${selectedCompanyId}`)
      .then(r => r.json())
      .then(d => setBankAccountsList(d.bankAccounts || d || []))
      .catch(() => {});
  }, [selectedCompanyId]);

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
  // COMPANY_3 (simple / PD Lagani type) = only Day Book + Cash Book
  // COMPANY_1_2 (MoneyMitra / Keshardeep) = full accounting suite
  const menuItems = companyType === 'COMPANY_3'
    ? [
        { id: 'day-book',  label: 'Day Book',  icon: BookOpen },
        { id: 'cash-book', label: 'Cash Book', icon: Wallet },
      ]
    : [
        { id: 'journal-entry',    label: 'Journal Entry',    icon: BookCheck },
        { id: 'payment-audit',    label: '💳 Payment Audit',  icon: Receipt },
        { id: 'day-book',         label: 'Day Book',         icon: BookOpen },
        { id: 'ledger',           label: 'Ledger',           icon: BookCopy },
        { id: 'personal-ledger',  label: 'Personal Ledger',  icon: User },
        { id: 'bank',             label: 'Bank',             icon: Landmark },
        { id: 'cash-book',        label: 'Cash Book',        icon: Wallet },
        { id: 'chart-of-accounts',label: 'Chart of Accounts',icon: BookCopy },
        { id: 'trial-balance',    label: 'Trial Balance',    icon: BarChart3 },
        { id: 'profit-loss',      label: 'Profit & Loss',    icon: TrendingUp },
        { id: 'balance-sheet',    label: 'Balance Sheet',    icon: FileSpreadsheet },
      ];

  // Debug log for company type detection
  useEffect(() => {
    if (selectedCompany) {
      console.log('Company selected:', {
        name: selectedCompany.name,
        code: selectedCompany.code,
        isMirrorCompany: selectedCompany.isMirrorCompany,
        detectedType: companyType,
        menuItemsCount: menuItems.length
      });
    }
  }, [selectedCompany, companyType, menuItems.length]);

  // When switching to a simple company (COMPANY_3), reset to day-book
  // if the currently active section is not available in that company's menu
  useEffect(() => {
    if (companyType === 'COMPANY_3') {
      const allowedIds = ['day-book', 'cash-book'];
      if (!allowedIds.includes(activeSection)) {
        setActiveSection('day-book');
      }
    }
  }, [companyType, activeSection]);

  // Auto-Fix removed â€” idempotency guards now prevent all duplicate entries at the source



  // Render Section
  const renderSection = () => {
    switch (activeSection) {
      case 'journal-entry':
        return (
          <DayBookSection
            selectedCompanyId={selectedCompanyId}
            formatCurrency={formatCurrency}
            formatDateShort={formatDateShort}
          />
        );
      case 'payment-audit':
        return <JournalEntriesSection selectedCompanyId={selectedCompanyId} />;
      case 'day-book':
        return <TradDayBookSection selectedCompanyId={selectedCompanyId} />;
      case 'ledger':
        return <LedgerSection selectedCompanyId={selectedCompanyId} />;
      case 'personal-ledger':
        return (
          <PersonalLedgerTab
            selectedCompanyIds={selectedCompanyId ? [selectedCompanyId] : []}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
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
          <ChartOfAccountsSection
            selectedCompanyId={selectedCompanyId}
            formatCurrency={formatCurrency}
          />
        );
      case 'trial-balance':
        return (
          <TrialBalanceSection
            selectedCompanyId={selectedCompanyId}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        );
      case 'profit-loss':
        return (
          <ProfitLossSection
            selectedCompanyId={selectedCompanyId}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        );
      case 'balance-sheet':
        return (
          <BalanceSheetSection
            selectedCompanyId={selectedCompanyId}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        );
      case 'expenses':
        return (
          <AccountantExpenseSection
            userId={user?.id || ''}
            companyId={selectedCompanyId || undefined}
          />
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
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold leading-tight">
                    {companyType === 'COMPANY_3' ? 'Company 3 - Cash Book' : 'Accountant Dashboard'}
                  </h1>
                  {companyType === 'COMPANY_3' ? (
                    <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">CASH ONLY</Badge>
                  ) : (
                    <Badge className="bg-emerald-400 text-white text-[10px] px-1.5 py-0">FULL ACCOUNTING</Badge>
                  )}
                </div>
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

              {/* Manual Entry Button */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowManualEntryDialog(true)}
                className="h-8 bg-white/10 border-white/20 text-white hover:bg-white/20 hidden md:flex"
                title="Post Manual Journal Entry"
              >
                <BookCheck className="h-4 w-4 mr-1" />
                Journal Entry
              </Button>

              {/* Quick Action Buttons */}
              <div className="flex items-center gap-1">
                <Button size="sm" onClick={() => setShowExpenseDialog(true)} className="h-8 bg-red-500/80 hover:bg-red-400 text-white text-xs px-2" title="Add Expense">
                  <Receipt className="h-3.5 w-3.5 mr-1" /> Expense
                </Button>
                <Button size="sm" onClick={() => setShowBorrowDialog(true)} className="h-8 bg-amber-500/80 hover:bg-amber-400 text-white text-xs px-2" title="Record Borrowing">
                  <ArrowDownRight className="h-3.5 w-3.5 mr-1" /> Borrow
                </Button>
                <Button size="sm" onClick={() => setShowRepayDialog(true)} className="h-8 bg-blue-500/80 hover:bg-blue-400 text-white text-xs px-2" title="Repay Borrowing">
                  <ArrowUpRight className="h-3.5 w-3.5 mr-1" /> Repay
                </Button>
                <Button size="sm" onClick={() => setShowCapitalDialog(true)} className="h-8 bg-purple-500/80 hover:bg-purple-400 text-white text-xs px-2" title="Add Capital">
                  <PiggyBank className="h-3.5 w-3.5 mr-1" /> Capital
                </Button>
              </div>

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

      {/* Manual Entry Dialog */}
      <ManualJournalEntryDialog
        open={showManualEntryDialog}
        onOpenChange={setShowManualEntryDialog}
        companyId={selectedCompanyId}
        onSuccess={() => {
          const current = activeSection;
          setActiveSection('none');
          setTimeout(() => setActiveSection(current), 10);
        }}
      />

      {/* Quick Entry Dialogs */}
      <AddExpenseDialog
        open={showExpenseDialog}
        onOpenChange={setShowExpenseDialog}
        companyId={selectedCompanyId}
        userId={user?.id || 'system'}
        bankAccounts={bankAccountsList}
        onSuccess={() => { const c = activeSection; setActiveSection('none'); setTimeout(() => setActiveSection(c), 10); }}
      />
      <RecordBorrowingDialog
        open={showBorrowDialog}
        onOpenChange={setShowBorrowDialog}
        companyId={selectedCompanyId}
        userId={user?.id || 'system'}
        bankAccounts={bankAccountsList}
        onSuccess={() => { const c = activeSection; setActiveSection('none'); setTimeout(() => setActiveSection(c), 10); }}
      />
      <RepayBorrowingDialog
        open={showRepayDialog}
        onOpenChange={setShowRepayDialog}
        companyId={selectedCompanyId}
        userId={user?.id || 'system'}
        bankAccounts={bankAccountsList}
        onSuccess={() => { const c = activeSection; setActiveSection('none'); setTimeout(() => setActiveSection(c), 10); }}
      />
      <AddCapitalDialog
        open={showCapitalDialog}
        onOpenChange={setShowCapitalDialog}
        companyId={selectedCompanyId}
        userId={user?.id || 'system'}
        bankAccounts={bankAccountsList}
        onSuccess={() => { const c = activeSection; setActiveSection('none'); setTimeout(() => setActiveSection(c), 10); }}
      />
    </div>
  );
}
