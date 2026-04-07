'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { toast } from 'sonner';
import { 
  Calculator, FileText, TrendingUp, Loader2, RefreshCw, 
  FileSpreadsheet, BookOpen, Landmark, ArrowUpRight, ArrowDownRight,
  LogOut, Plus, Receipt, BookCopy, BarChart3,
  AlertTriangle, CheckCircle, Building2,
  ChevronRight, CreditCard, PiggyBank
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// TYPES
// ============================================

interface Company {
  id: string;
  name: string;
  code: string;
}

interface ChartOfAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  parentAccountId?: string;
  parentAccount?: ChartOfAccount;
  subAccounts?: ChartOfAccount[];
  description?: string;
  isSystemAccount: boolean;
  isActive: boolean;
  openingBalance: number;
  currentBalance: number;
}

interface JournalEntryLine {
  id: string;
  accountId: string;
  account?: ChartOfAccount;
  debitAmount: number;
  creditAmount: number;
  narration?: string;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: Date | string;
  referenceType?: string;
  referenceId?: string;
  narration?: string;
  totalDebit: number;
  totalCredit: number;
  isAutoEntry: boolean;
  isReversed: boolean;
  isApproved: boolean;
  paymentMode?: string;
  chequeNumber?: string;
  chequeDate?: Date | string;
  bankRefNumber?: string;
  lines: JournalEntryLine[];
  createdAt: Date | string;
}

interface FinancialYear {
  id: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  isClosed: boolean;
}

// Account Type Configuration
const ACCOUNT_TYPES = {
  ASSET: { name: 'Assets', color: 'blue', icon: Landmark },
  LIABILITY: { name: 'Liabilities', color: 'red', icon: CreditCard },
  EQUITY: { name: 'Equity', color: 'purple', icon: PiggyBank },
  INCOME: { name: 'Income', color: 'green', icon: ArrowUpRight },
  EXPENSE: { name: 'Expenses', color: 'orange', icon: ArrowDownRight },
} as const;

// Default Chart of Accounts Template (Indian Accounting Standards)
const DEFAULT_CHART_OF_ACCOUNTS = [
  // ASSETS
  { accountCode: '1000', accountName: 'Assets', accountType: 'ASSET', isHeader: true },
  { accountCode: '1100', accountName: 'Current Assets', accountType: 'ASSET', parentCode: '1000', isHeader: true },
  { accountCode: '1101', accountName: 'Cash in Hand', accountType: 'ASSET', parentCode: '1100' },
  { accountCode: '1102', accountName: 'Cash at Bank', accountType: 'ASSET', parentCode: '1100' },
  { accountCode: '1103', accountName: 'Bank Accounts', accountType: 'ASSET', parentCode: '1102', isHeader: true },
  { accountCode: '1104', accountName: 'Loans Receivable', accountType: 'ASSET', parentCode: '1100' },
  { accountCode: '1105', accountName: 'Interest Receivable', accountType: 'ASSET', parentCode: '1100' },
  { accountCode: '1106', accountName: 'Prepaid Expenses', accountType: 'ASSET', parentCode: '1100' },
  { accountCode: '1200', accountName: 'Fixed Assets', accountType: 'ASSET', parentCode: '1000', isHeader: true },
  { accountCode: '1201', accountName: 'Furniture & Fixtures', accountType: 'ASSET', parentCode: '1200' },
  { accountCode: '1202', accountName: 'Office Equipment', accountType: 'ASSET', parentCode: '1200' },
  { accountCode: '1203', accountName: 'Computers', accountType: 'ASSET', parentCode: '1200' },
  { accountCode: '1204', accountName: 'Vehicles', accountType: 'ASSET', parentCode: '1200' },
  
  // LIABILITIES
  { accountCode: '2000', accountName: 'Liabilities', accountType: 'LIABILITY', isHeader: true },
  { accountCode: '2100', accountName: 'Current Liabilities', accountType: 'LIABILITY', parentCode: '2000', isHeader: true },
  { accountCode: '2101', accountName: 'Accounts Payable', accountType: 'LIABILITY', parentCode: '2100' },
  { accountCode: '2102', accountName: 'Interest Payable', accountType: 'LIABILITY', parentCode: '2100' },
  { accountCode: '2103', accountName: 'Borrowed Money', accountType: 'LIABILITY', parentCode: '2100' },
  { accountCode: '2104', accountName: 'Customer Deposits', accountType: 'LIABILITY', parentCode: '2100' },
  { accountCode: '2200', accountName: 'Long Term Liabilities', accountType: 'LIABILITY', parentCode: '2000', isHeader: true },
  { accountCode: '2201', accountName: 'Term Loans', accountType: 'LIABILITY', parentCode: '2200' },
  
  // EQUITY
  { accountCode: '3000', accountName: 'Equity', accountType: 'EQUITY', isHeader: true },
  { accountCode: '3001', accountName: 'Owner Capital', accountType: 'EQUITY', parentCode: '3000' },
  { accountCode: '3002', accountName: 'Retained Earnings', accountType: 'EQUITY', parentCode: '3000' },
  { accountCode: '3003', accountName: 'Current Year Profit/Loss', accountType: 'EQUITY', parentCode: '3000' },
  
  // INCOME
  { accountCode: '4000', accountName: 'Income', accountType: 'INCOME', isHeader: true },
  { accountCode: '4100', accountName: 'Interest Income', accountType: 'INCOME', parentCode: '4000', isHeader: true },
  { accountCode: '4101', accountName: 'Interest on Loans', accountType: 'INCOME', parentCode: '4100' },
  { accountCode: '4102', accountName: 'Penalty Income', accountType: 'INCOME', parentCode: '4100' },
  { accountCode: '4200', accountName: 'Fee Income', accountType: 'INCOME', parentCode: '4000', isHeader: true },
  { accountCode: '4201', accountName: 'Processing Fees', accountType: 'INCOME', parentCode: '4200' },
  { accountCode: '4202', accountName: 'Documentation Charges', accountType: 'INCOME', parentCode: '4200' },
  { accountCode: '4300', accountName: 'Other Income', accountType: 'INCOME', parentCode: '4000', isHeader: true },
  { accountCode: '4301', accountName: 'Commission Income', accountType: 'INCOME', parentCode: '4300' },
  
  // EXPENSES
  { accountCode: '5000', accountName: 'Expenses', accountType: 'EXPENSE', isHeader: true },
  { accountCode: '5100', accountName: 'Operating Expenses', accountType: 'EXPENSE', parentCode: '5000', isHeader: true },
  { accountCode: '5101', accountName: 'Salaries & Wages', accountType: 'EXPENSE', parentCode: '5100' },
  { accountCode: '5102', accountName: 'Rent Expense', accountType: 'EXPENSE', parentCode: '5100' },
  { accountCode: '5103', accountName: 'Electricity & Utilities', accountType: 'EXPENSE', parentCode: '5100' },
  { accountCode: '5104', accountName: 'Office Supplies', accountType: 'EXPENSE', parentCode: '5100' },
  { accountCode: '5105', accountName: 'Communication Expenses', accountType: 'EXPENSE', parentCode: '5100' },
  { accountCode: '5106', accountName: 'Travel & Conveyance', accountType: 'EXPENSE', parentCode: '5100' },
  { accountCode: '5200', accountName: 'Financial Expenses', accountType: 'EXPENSE', parentCode: '5000', isHeader: true },
  { accountCode: '5201', accountName: 'Interest Expense', accountType: 'EXPENSE', parentCode: '5200' },
  { accountCode: '5202', accountName: 'Bank Charges', accountType: 'EXPENSE', parentCode: '5200' },
  { accountCode: '5300', accountName: 'Depreciation', accountType: 'EXPENSE', parentCode: '5000', isHeader: true },
  { accountCode: '5301', accountName: 'Depreciation - Furniture', accountType: 'EXPENSE', parentCode: '5300' },
  { accountCode: '5302', accountName: 'Depreciation - Equipment', accountType: 'EXPENSE', parentCode: '5300' },
];

// ============================================
// SECTION COMPONENTS
// ============================================

// Chart of Accounts Section
function ChartOfAccountsSection({
  accounts,
  selectedCompanyId,
  formatCurrency,
  onRefresh,
  onAddAccount
}: {
  accounts: ChartOfAccount[];
  selectedCompanyId: string;
  formatCurrency: (amount: number) => string;
  onRefresh: () => void;
  onAddAccount: () => void;
}) {
  // Build tree structure
  const buildAccountTree = (accounts: ChartOfAccount[], parentCode?: string): any[] => {
    return accounts
      .filter(acc => (parentCode ? acc.parentAccountId === parentCode : !acc.parentAccountId))
      .map(acc => ({
        ...acc,
        children: buildAccountTree(accounts, acc.id)
      }));
  };

  const accountTree = useMemo(() => buildAccountTree(accounts), [accounts]);

  // Group by account type
  const groupedAccounts = useMemo(() => {
    const groups: Record<string, ChartOfAccount[]> = {};
    accounts.forEach(acc => {
      if (!groups[acc.accountType]) {
        groups[acc.accountType] = [];
      }
      groups[acc.accountType].push(acc);
    });
    return groups;
  }, [accounts]);

  const renderAccountRow = (account: any, level: number = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    
    return (
      <div key={account.id}>
        <div 
          className={`flex items-center py-2 px-3 hover:bg-gray-50 border-b ${level > 0 ? 'ml-' + (level * 4) : ''}`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          {hasChildren ? (
            <ChevronRight className="h-4 w-4 mr-2 text-gray-400" />
          ) : (
            <span className="w-6" />
          )}
          <div className="flex-1 flex items-center gap-3">
            <span className="font-mono text-sm text-gray-500 w-20">{account.accountCode}</span>
            <span className="font-medium">{account.accountName}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`font-medium ${account.currentBalance >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
              {formatCurrency(account.currentBalance)}
            </span>
            <Badge variant="outline" className="text-xs">
              {account.accountType}
            </Badge>
          </div>
        </div>
        {hasChildren && account.children.map((child: any) => renderAccountRow(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookCopy className="h-5 w-5 text-indigo-600" />
              Chart of Accounts
            </CardTitle>
            <CardDescription>Head-wise account structure (GnuCash Style)</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={onAddAccount} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Account
            </Button>
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <BookCopy className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No accounts configured</p>
              <Button onClick={onAddAccount} variant="outline" className="mt-4">
                Initialize Chart of Accounts
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 py-2 px-3 border-b font-medium flex items-center">
                <span className="flex-1">Account</span>
                <span className="w-32 text-right">Balance</span>
                <span className="w-24 text-right ml-4">Type</span>
              </div>
              <ScrollArea className="h-[500px]">
                {Object.entries(ACCOUNT_TYPES).map(([type, config]) => {
                  const typeAccounts = groupedAccounts[type] || [];
                  if (typeAccounts.length === 0) return null;
                  
                  const TypeIcon = config.icon;
                  return (
                    <div key={type}>
                      <div className={`bg-${config.color}-50 py-2 px-3 border-b font-semibold flex items-center gap-2`}>
                        <TypeIcon className={`h-4 w-4 text-${config.color}-600`} />
                        {config.name}
                        <span className="text-sm text-muted-foreground">({typeAccounts.length})</span>
                      </div>
                      {typeAccounts
                        .filter(acc => !acc.parentAccountId)
                        .map(account => renderAccountRow(account))}
                    </div>
                  );
                })}
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Journal Entry Section - READ ONLY (No manual entries allowed)
function JournalEntrySection({
  accounts,
  selectedCompanyId,
  financialYears,
  formatCurrency,
  onRefresh
}: {
  accounts: ChartOfAccount[];
  selectedCompanyId: string;
  financialYears: FinancialYear[];
  formatCurrency: (amount: number) => string;
  onRefresh: () => void;
}) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (selectedCompanyId) {
      loadEntries();
    }
  }, [selectedCompanyId]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/journal-entries?companyId=${selectedCompanyId}&limit=50`);
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Journal Entries (Auto-Generated)
            </CardTitle>
            <CardDescription>All entries are auto-generated from loan transactions, EMI payments, expenses, etc.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadEntries} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No journal entries found</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Entry No.</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.entryDate), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="font-mono">{entry.entryNumber}</TableCell>
                      <TableCell className="max-w-xs truncate">{entry.narration || '-'}</TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {formatCurrency(entry.totalDebit)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatCurrency(entry.totalCredit)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {entry.isAutoEntry && <Badge variant="secondary">Auto</Badge>}
                          {entry.isReversed && <Badge variant="destructive">Reversed</Badge>}
                          {entry.isApproved && <Badge variant="default" className="bg-green-600">Approved</Badge>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Ledger Section
function LedgerSection({
  accounts,
  selectedCompanyId,
  formatCurrency,
  formatDate
}: {
  accounts: ChartOfAccount[];
  selectedCompanyId: string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedAccountId) {
      loadLedger();
    }
  }, [selectedAccountId]);

  const loadLedger = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/ledger?companyId=${selectedCompanyId}&accountId=${selectedAccountId}`);
      const data = await res.json();
      // API returns data.lines for account-ledger, convert to entries format
      const entries = data.data?.lines || data.lines || data.entries || [];
      setLedgerEntries(entries);
    } catch (error) {
      console.error('Error loading ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-600" />
          Ledger
        </CardTitle>
        <CardDescription>Account-wise transaction history</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Account Selector */}
        <div className="mb-4">
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Account to View Ledger" />
            </SelectTrigger>
            <SelectContent>
              {accounts.filter(a => a.isActive).map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.accountCode} - {acc.accountName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" />
          </div>
        ) : !selectedAccountId ? (
          <div className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Select an account to view its ledger</p>
          </div>
        ) : ledgerEntries.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No transactions found for this account</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Particulars</TableHead>
                  <TableHead>Voucher No.</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerEntries.map((entry, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell>{entry.particulars || entry.narration || '-'}</TableCell>
                    <TableCell className="font-mono">{entry.voucherNo || entry.entryNumber}</TableCell>
                    <TableCell className="text-right text-red-600">
                      {entry.debit ? formatCurrency(entry.debit) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {entry.credit ? formatCurrency(entry.credit) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(entry.balance || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// Trial Balance Section
function TrialBalanceSection({
  selectedCompanyId,
  formatCurrency
}: {
  selectedCompanyId: string;
  formatCurrency: (amount: number) => string;
}) {
  const [trialBalance, setTrialBalance] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalDebit: 0, totalCredit: 0, isBalanced: true });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCompanyId) {
      loadTrialBalance();
    }
  }, [selectedCompanyId]);

  const loadTrialBalance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accountant/trial-balance?companyId=${selectedCompanyId}`);
      const data = await res.json();
      setTrialBalance(data.trialBalance || []);
      setSummary({
        totalDebit: data.totalDebits || 0,
        totalCredit: data.totalCredits || 0,
        isBalanced: data.isBalanced || false
      });
    } catch (error) {
      console.error('Error loading trial balance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-teal-600" />
          Trial Balance
        </CardTitle>
        <CardDescription>Verify debits equal credits</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-teal-500" />
          </div>
        ) : trialBalance.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No trial balance data available</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trialBalance.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono">{item.accountCode}</TableCell>
                      <TableCell>{item.accountName}</TableCell>
                      <TableCell className="text-right text-red-600">
                        {item.debit ? formatCurrency(item.debit) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {item.credit ? formatCurrency(item.credit) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Summary */}
            <div className={`mt-4 p-4 rounded-lg ${summary.isBalanced ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total Debit</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(summary.totalDebit)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Credit</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalCredit)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="flex items-center justify-center gap-2">
                    {summary.isBalanced ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-green-700 font-medium">Balanced</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="text-red-700 font-medium">Not Balanced</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Profit & Loss Section
function ProfitLossSection({
  selectedCompanyId,
  formatCurrency
}: {
  selectedCompanyId: string;
  formatCurrency: (amount: number) => string;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCompanyId) {
      loadPL();
    }
  }, [selectedCompanyId]);

  const loadPL = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accountant/profit-loss?companyId=${selectedCompanyId}`);
      const plData = await res.json();
      setData(plData);
    } catch (error) {
      console.error('Error loading P&L:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Profit & Loss Statement
          </CardTitle>
          <CardDescription>Income and Expenses summary</CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <div className="py-12 text-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No data available</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Income */}
              <div>
                <h3 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  Income
                </h3>
                <div className="space-y-2">
                  {data.income?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between p-2 bg-green-50 rounded">
                      <span>{item.accountName}</span>
                      <span className="font-medium text-green-600">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between p-2 bg-green-100 rounded font-semibold">
                    <span>Total Income</span>
                    <span className="text-green-700">{formatCurrency(data.totalIncome || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Expenses */}
              <div>
                <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4" />
                  Expenses
                </h3>
                <div className="space-y-2">
                  {data.expenses?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between p-2 bg-red-50 rounded">
                      <span>{item.accountName}</span>
                      <span className="font-medium text-red-600">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between p-2 bg-red-100 rounded font-semibold">
                    <span>Total Expenses</span>
                    <span className="text-red-700">{formatCurrency(data.totalExpenses || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Net Profit/Loss */}
      {data && (
        <Card className={`${data.netProfit >= 0 ? 'border-green-500' : 'border-red-500'}`}>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">
                {data.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
              </span>
              <span className={`text-3xl font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(data.netProfit || 0))}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Balance Sheet Section
function BalanceSheetSection({
  selectedCompanyId,
  formatCurrency
}: {
  selectedCompanyId: string;
  formatCurrency: (amount: number) => string;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCompanyId) {
      loadBS();
    }
  }, [selectedCompanyId]);

  const loadBS = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accountant/balance-sheet?companyId=${selectedCompanyId}`);
      const bsData = await res.json();
      setData(bsData);
    } catch (error) {
      console.error('Error loading Balance Sheet:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          Balance Sheet
        </CardTitle>
        <CardDescription>Financial position statement</CardDescription>
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="py-12 text-center text-muted-foreground">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No data available</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Assets */}
            <div>
              <h3 className="font-semibold text-blue-600 mb-3">Assets</h3>
              <div className="space-y-2">
                {data.leftSide?.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between p-2 bg-blue-50 rounded">
                    <span>{item.name}</span>
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between p-2 bg-blue-100 rounded font-semibold">
                  <span>Total Assets</span>
                  <span className="text-blue-700">{formatCurrency(data.leftSide?.total || 0)}</span>
                </div>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div>
              <h3 className="font-semibold text-purple-600 mb-3">Liabilities & Equity</h3>
              <div className="space-y-2">
                {data.rightSide?.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between p-2 bg-purple-50 rounded">
                    <span>{item.name}</span>
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between p-2 bg-purple-100 rounded font-semibold">
                  <span>Total Liabilities & Equity</span>
                  <span className="text-purple-700">{formatCurrency(data.rightSide?.total || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function GnuCashDashboard() {
  const { user, signOut } = useAuth();
  const { settings } = useSettings();
  
  // State
  const [loading, setLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('chart-of-accounts');
  
  // Company Filter
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  
  // Data States
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  
  // Equity Dialog State
  const [showEquityDialog, setShowEquityDialog] = useState(false);
  const [equityCashAmount, setEquityCashAmount] = useState('');
  const [equityBankAmount, setEquityBankAmount] = useState('');
  const [equityDescription, setEquityDescription] = useState('');
  const [addingEquity, setAddingEquity] = useState(false);

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
      const [accountsRes, yearsRes] = await Promise.all([
        fetch(`/api/accounting/chart-of-accounts?companyId=${selectedCompanyId}`),
        fetch(`/api/accounting/financial-year?companyId=${selectedCompanyId}`)
      ]);

      const accountsData = accountsRes.ok ? await accountsRes.json() : { accounts: [] };
      const yearsData = yearsRes.ok ? await yearsRes.json() : { years: [] };

      setAccounts(accountsData.accounts || []);
      setFinancialYears(yearsData.years || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  const initializeChartOfAccounts = async () => {
    if (!selectedCompanyId) return;
    
    try {
      const res = await fetch('/api/accounting/chart-of-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          accounts: DEFAULT_CHART_OF_ACCOUNTS
        })
      });
      
      if (res.ok) {
        toast.success('Chart of Accounts initialized successfully');
        fetchAllData();
      }
    } catch (error) {
      toast.error('Failed to initialize Chart of Accounts');
    }
  };

  // Handle Add Equity
  const handleAddEquity = async () => {
    const cash = parseFloat(equityCashAmount) || 0;
    const bank = parseFloat(equityBankAmount) || 0;
    const total = cash + bank;
    
    if (!selectedCompanyId) {
      toast.error('Please select a company first');
      return;
    }
    
    if (total <= 0) {
      toast.error('Please enter at least one amount (cash or bank)');
      return;
    }
    
    setAddingEquity(true);
    try {
      const res = await fetch('/api/accountant/equity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          cashAmount: cash,
          bankAmount: bank,
          description: equityDescription || "Owner's capital investment",
          createdById: user?.id
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Equity of ${formatCurrency(total)} added successfully!`);
        setShowEquityDialog(false);
        setEquityCashAmount('');
        setEquityBankAmount('');
        setEquityDescription('');
        fetchAllData();
      } else {
        toast.error(data.error || 'Failed to add equity');
      }
    } catch (error) {
      toast.error('Failed to add equity');
    } finally {
      setAddingEquity(false);
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
  }, [selectedCompanyId, fetchAllData]);

  // ============================================
  // MENU ITEMS
  // ============================================

  const menuItems = [
    { id: 'chart-of-accounts', label: 'Chart of Accounts', icon: BookCopy },
    { id: 'journal-entry', label: 'Journal Entry', icon: FileText },
    { id: 'ledger', label: 'Ledger', icon: BookOpen },
    { id: 'trial-balance', label: 'Trial Balance', icon: BarChart3 },
    { id: 'profit-loss', label: 'Profit & Loss', icon: TrendingUp },
    { id: 'balance-sheet', label: 'Balance Sheet', icon: FileSpreadsheet },
  ];

  // ============================================
  // RENDER SECTION CONTENT
  // ============================================

  const renderSection = () => {
    switch (activeSection) {
      case 'chart-of-accounts':
        return (
          <ChartOfAccountsSection
            accounts={accounts}
            selectedCompanyId={selectedCompanyId}
            formatCurrency={formatCurrency}
            onRefresh={fetchAllData}
            onAddAccount={() => {
              if (accounts.length === 0) {
                initializeChartOfAccounts();
              } else {
                setShowAddAccountDialog(true);
              }
            }}
          />
        );
      case 'journal-entry':
        return (
          <JournalEntrySection
            accounts={accounts}
            selectedCompanyId={selectedCompanyId}
            financialYears={financialYears}
            formatCurrency={formatCurrency}
            onRefresh={fetchAllData}
          />
        );
      case 'ledger':
        return (
          <LedgerSection
            accounts={accounts}
            selectedCompanyId={selectedCompanyId}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        );
      case 'trial-balance':
        return (
          <TrialBalanceSection
            selectedCompanyId={selectedCompanyId}
            formatCurrency={formatCurrency}
          />
        );
      case 'profit-loss':
        return (
          <ProfitLossSection
            selectedCompanyId={selectedCompanyId}
            formatCurrency={formatCurrency}
          />
        );
      case 'balance-sheet':
        return (
          <BalanceSheetSection
            selectedCompanyId={selectedCompanyId}
            formatCurrency={formatCurrency}
          />
        );
      default:
        return null;
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
            <div className="flex items-center gap-3">
              {settings.companyLogo ? (
                <img src={settings.companyLogo} alt={settings.companyName || 'Company'} className="h-9 w-auto object-contain" />
              ) : (
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <Calculator className="h-5 w-5" />
                </div>
              )}
              <div>
                <h1 className="text-base font-bold leading-tight">GnuCash Accounting</h1>
                <p className="text-[10px] text-emerald-100">Double-Entry Bookkeeping</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
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
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      <span className="truncate text-sm">{company.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                size="sm"
                className="h-8 px-3 bg-amber-500/80 border-amber-400/50 text-white hover:bg-amber-600"
                onClick={() => setShowEquityDialog(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">Add Equity</span>
              </Button>

              <Button 
                variant="outline" 
                size="sm"
                className="h-8 w-8 p-0 bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => fetchAllData()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>

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
                  <DropdownMenuItem onClick={async () => { await signOut(); }} className="text-red-600">
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
        <aside className="w-56 bg-white border-r min-h-[calc(100vh-56px)] sticky top-14 flex flex-col">
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
          
          <div className="p-2 border-t">
            <button
              onClick={async () => { await signOut(); }}
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
                <p className="text-gray-500">Loading...</p>
              </motion.div>
            ) : !selectedCompanyId ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-64 gap-4"
              >
                <Building2 className="h-12 w-12 text-gray-300" />
                <p className="text-gray-500">Please select a company</p>
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

      {/* Add Equity Dialog */}
      <Dialog open={showEquityDialog} onOpenChange={setShowEquityDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-amber-600" />
              Add Owner's Equity
            </DialogTitle>
            <DialogDescription>
              Add your starting capital. This creates a journal entry: Debit Cash/Bank, Credit Owner's Capital.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-amber-800 mb-1">💡 GnuCash-Style Double Entry:</p>
              <p className="text-amber-700">
                Cash/Bank (Asset) → Debit (↑)<br/>
                Owner's Capital (Equity) → Credit (↑)
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cashAmount">Cash Amount (₹)</Label>
                <Input
                  id="cashAmount"
                  type="number"
                  placeholder="0"
                  value={equityCashAmount}
                  onChange={(e) => setEquityCashAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAmount">Bank Amount (₹)</Label>
                <Input
                  id="bankAmount"
                  type="number"
                  placeholder="0"
                  value={equityBankAmount}
                  onChange={(e) => setEquityBankAmount(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Owner's capital investment"
                value={equityDescription}
                onChange={(e) => setEquityDescription(e.target.value)}
              />
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Equity:</span>
                <span className="text-lg font-bold text-emerald-600">
                  {formatCurrency((parseFloat(equityCashAmount) || 0) + (parseFloat(equityBankAmount) || 0))}
                </span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEquityDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddEquity} 
              disabled={addingEquity || ((parseFloat(equityCashAmount) || 0) + (parseFloat(equityBankAmount) || 0)) <= 0}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {addingEquity ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Equity
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
