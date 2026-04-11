'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { 
  BookOpen, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
  Scale, RefreshCw, Download, Plus, Search, Filter, ChevronDown, ChevronRight,
  Landmark, Wallet, PiggyBank, Banknote, CreditCard, DollarSign, IndianRupee
} from 'lucide-react';

interface EnhancedAccountingSectionProps {
  selectedCompanyId: string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

// ============================================
// ENHANCED DAYBOOK SECTION
// ============================================

export function EnhancedDaybookSection({ selectedCompanyId, formatCurrency, formatDate }: EnhancedAccountingSectionProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({
    startDate: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (selectedCompanyId) {
      fetchDaybookData();
    }
  }, [selectedCompanyId, dateFilter]);

  const fetchDaybookData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/accounting/enhanced-daybook?companyId=${selectedCompanyId}&startDate=${dateFilter.startDate}&endDate=${dateFilter.endDate}`
      );
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching daybook:', error);
      toast.error('Failed to load daybook');
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(entry => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      entry.particular?.toLowerCase().includes(search) ||
      entry.accountHeadName?.toLowerCase().includes(search) ||
      entry.referenceType?.toLowerCase().includes(search)
    );
  });

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      'LOAN_DISBURSEMENT': 'bg-purple-100 text-purple-700',
      'EMI_PAYMENT': 'bg-green-100 text-green-700',
      'PROCESSING_FEE': 'bg-blue-100 text-blue-700',
      'PENALTY': 'bg-red-100 text-red-700',
      'EXPENSE': 'bg-orange-100 text-orange-700',
      'EQUITY_ENTRY': 'bg-cyan-100 text-cyan-700',
      'BORROWED_MONEY': 'bg-pink-100 text-pink-700',
      'INVEST_MONEY': 'bg-indigo-100 text-indigo-700',
      'BANK_TRANSACTION': 'bg-teal-100 text-teal-700',
      'JOURNAL_ENTRY': 'bg-gray-100 text-gray-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Entry No.', 'Head', 'Particular', 'Type', 'Debit', 'Credit', 'Balance'];
    const rows = filteredEntries.map(e => [
      formatDate(e.entryDate),
      e.entryNumber,
      e.accountHeadName,
      e.particular,
      e.referenceType,
      e.debit,
      e.credit,
      e.runningBalance
    ]);
    
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daybook_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Daybook exported');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-600" />
            Daybook
          </h2>
          <p className="text-sm text-gray-500">Complete transaction register with all entries (Date | Head | Debit | Credit)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDaybookData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <BookOpen className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Entries</p>
                  <p className="text-xl font-bold text-gray-700">{summary.totalEntries}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Debit</p>
                  <p className="text-xl font-bold text-red-700">{formatCurrency(summary.totalDebit)}</p>
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
                  <p className="text-xl font-bold text-green-700">{formatCurrency(summary.totalCredit)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Scale className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Net Balance</p>
                  <p className={`text-xl font-bold ${summary.netBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(summary.netBalance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-gray-600">Search</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-600">From Date</Label>
              <Input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">To Date</Label>
              <Input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="LOAN_DISBURSEMENT">Loan Disbursement</SelectItem>
                  <SelectItem value="EMI_PAYMENT">EMI Payment</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="EQUITY_ENTRY">Equity</SelectItem>
                  <SelectItem value="BORROWED_MONEY">Borrowed Money</SelectItem>
                  <SelectItem value="INVEST_MONEY">Invest Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daybook Table */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
          <CardTitle className="text-lg">All Transactions</CardTitle>
          <CardDescription>
            Complete list of all transactions with debit and credit entries
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-white">
                <TableRow>
                  <TableHead className="w-24">Date</TableHead>
                  <TableHead className="w-28">Entry No.</TableHead>
                  <TableHead className="w-32">Head</TableHead>
                  <TableHead>Particular</TableHead>
                  <TableHead className="w-32">Type</TableHead>
                  <TableHead className="text-right w-28">Debit</TableHead>
                  <TableHead className="text-right w-28">Credit</TableHead>
                  <TableHead className="text-right w-28">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500 mt-2">Loading daybook...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No transactions found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry, idx) => (
                    <TableRow key={entry.id || idx} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">
                        {formatDate(entry.entryDate)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">
                        {entry.entryNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{entry.accountHeadName}</p>
                          <p className="text-xs text-gray-500">{entry.accountType}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {entry.particular}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${getTypeBadgeColor(entry.referenceType)}`}>
                          {entry.referenceType?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${entry.runningBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(Math.abs(entry.runningBalance || 0))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// ENHANCED PROFIT & LOSS SECTION
// ============================================

export function EnhancedProfitLossSection({ selectedCompanyId, formatCurrency, formatDate }: EnhancedAccountingSectionProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    type: '',
    amount: '',
    description: ''
  });
  const [addingExpense, setAddingExpense] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [missingEntries, setMissingEntries] = useState(0);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchPnLData();
      checkMissingEntries();
    }
  }, [selectedCompanyId]);

  const checkMissingEntries = async () => {
    try {
      const res = await fetch(`/api/accounting/sync-journal-entries?companyId=${selectedCompanyId}`);
      if (res.ok) {
        const result = await res.json();
        setMissingEntries(
          (result.payments?.missingJournalEntry || 0) + (result.disbursements?.missingJournalEntry || 0)
        );
      }
    } catch { /* non-critical */ }
  };

  const handleSyncJournals = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/accounting/sync-journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: selectedCompanyId, dryRun: false }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(`Sync complete! Created ${result.summary?.totalCreated || 0} journal entries.`);
        setMissingEntries(0);
        fetchPnLData();
      } else {
        toast.error(result.error || 'Sync failed');
      }
    } catch {
      toast.error('Network error during sync');
    } finally {
      setSyncing(false);
    }
  };

  const fetchPnLData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/enhanced-pnl?companyId=${selectedCompanyId}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching P&L:', error);
      toast.error('Failed to load P&L data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.type || !expenseForm.amount) {
      toast.error('Please fill all required fields');
      return;
    }

    setAddingExpense(true);
    try {
      const res = await fetch('/api/accounting/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          expenseType: expenseForm.type,
          amount: parseFloat(expenseForm.amount),
          description: expenseForm.description,
          expenseDate: new Date().toISOString()
        })
      });

      if (res.ok) {
        toast.success('Expense added successfully');
        setShowAddExpenseDialog(false);
        setExpenseForm({ type: '', amount: '', description: '' });
        fetchPnLData();
      } else {
        toast.error('Failed to add expense');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    } finally {
      setAddingExpense(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          No P&L data available. Please add some transactions.
        </CardContent>
      </Card>
    );
  }

  // Calculate Receivable Charges (Processing Fee + Penalty)
  const receivableCharges = (data.income?.processingFee || 0) + (data.income?.penalty || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
            Profit &amp; Loss Statement
          </h2>
          <p className="text-sm text-gray-500">Income vs Expenses analysis</p>
        </div>
        <div className="flex items-center gap-2">
          {missingEntries > 0 && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-300 px-2 py-1 rounded-lg font-medium">
              ⚠ {missingEntries} entries missing
            </span>
          )}
          <Button
            size="sm"
            onClick={handleSyncJournals}
            disabled={syncing}
            className="bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs px-3"
          >
            {syncing ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Syncing...</>
            ) : (
              <><RefreshCw className="h-3.5 w-3.5 mr-1" />Sync Journals</>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchPnLData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Missing entries warning */}
      {missingEntries > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-lg">
          <span className="text-amber-500 text-xl">⚠</span>
          <div>
            <p className="font-semibold text-amber-800 text-sm">P&amp;L Shows Zero — Journal Entries Missing</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {missingEntries} transactions have no journal entry. Interest Income and Processing Fee Income will be ₹0
              until you click <strong>Sync Journals</strong> above.
            </p>
          </div>
        </div>
      )}


      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Side - PROFIT */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="text-green-700 flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5" />
              PROFIT (Income)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">1. Interest Income</TableCell>
                  <TableCell className="text-right text-green-600 font-bold">
                    {formatCurrency(data.income?.interest || 0)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">2. Receivable Charges</TableCell>
                  <TableCell className="text-right text-green-600 font-bold">
                    {formatCurrency(receivableCharges)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8 text-sm text-gray-500">- Processing Fee</TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(data.income?.processingFee || 0)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8 text-sm text-gray-500">- Penalty/Late Fee</TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(data.income?.penalty || 0)}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-green-100 font-bold">
                  <TableCell>TOTAL INCOME</TableCell>
                  <TableCell className="text-right text-green-700 text-lg">
                    {formatCurrency(data.income?.total || 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Expense Side - LOSS */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-red-700 flex items-center gap-2">
                <ArrowDownRight className="h-5 w-5" />
                LOSS (Expenses)
              </CardTitle>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowAddExpenseDialog(true)}
                className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Expense
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {data.expenses?.breakdown?.length > 0 ? (
                  data.expenses.breakdown.map((exp: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{exp.type}</TableCell>
                      <TableCell className="text-right text-red-600 font-bold">
                        {formatCurrency(exp.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="text-gray-500">No expenses recorded</TableCell>
                    <TableCell className="text-right">₹0.00</TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-red-100 font-bold">
                  <TableCell>TOTAL EXPENSES</TableCell>
                  <TableCell className="text-right text-red-700 text-lg">
                    {formatCurrency(data.expenses?.total || 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Net Result */}
      <Card className={`border-2 ${data.netResult?.isProfit ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {data.netResult?.isProfit ? (
                <TrendingUp className="h-10 w-10 text-green-600" />
              ) : (
                <TrendingDown className="h-10 w-10 text-red-600" />
              )}
              <div>
                <p className="text-sm text-gray-600">Net {data.netResult?.type}</p>
                <p className={`text-3xl font-bold ${data.netResult?.isProfit ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(data.netResult?.amount || 0)}
                </p>
              </div>
            </div>
            <Badge 
              variant={data.netResult?.isProfit ? 'default' : 'destructive'} 
              className="text-lg px-6 py-2"
            >
              {data.netResult?.type}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Equity Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Equity Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Initial Equity</p>
              <p className="text-xl font-bold">{formatCurrency(data.equity?.total || 0)}</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Net {data.netResult?.type}</p>
              <p className={`text-xl font-bold ${data.netResult?.isProfit ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data.netResult?.amount || 0)}
              </p>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <p className="text-sm text-gray-600">Final Equity</p>
              <p className="text-xl font-bold text-emerald-700">
                {formatCurrency(data.equity?.finalEquity || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={showAddExpenseDialog} onOpenChange={setShowAddExpenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Add a new expense to the Loss side
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Expense Type *</Label>
              <Select value={expenseForm.type} onValueChange={(v) => setExpenseForm(prev => ({ ...prev, type: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select expense type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Staff Salary">Staff Salary</SelectItem>
                  <SelectItem value="Office Rent">Office Rent</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Commission Paid">Commission Paid</SelectItem>
                  <SelectItem value="Software & Hosting">Software & Hosting</SelectItem>
                  <SelectItem value="Bank Charges">Bank Charges</SelectItem>
                  <SelectItem value="Electricity & Utilities">Electricity & Utilities</SelectItem>
                  <SelectItem value="Travel Expense">Travel Expense</SelectItem>
                  <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={expenseForm.description}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddExpenseDialog(false)}>Cancel</Button>
            <Button onClick={handleAddExpense} disabled={addingExpense}>
              {addingExpense ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// ENHANCED TRIAL BALANCE SECTION
// ============================================

export function EnhancedTrialBalanceSection({ selectedCompanyId, formatCurrency, formatDate }: EnhancedAccountingSectionProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showAddEquityDialog, setShowAddEquityDialog] = useState(false);
  const [showAddBorrowedDialog, setShowAddBorrowedDialog] = useState(false);
  const [showAddInvestDialog, setShowAddInvestDialog] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ missingPayments: number; missingDisbursements: number } | null>(null);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchTrialBalance();
      checkSyncStatus();
    }
  }, [selectedCompanyId]);

  const checkSyncStatus = async () => {
    try {
      const res = await fetch(`/api/accounting/sync-journal-entries?companyId=${selectedCompanyId}`);
      if (res.ok) {
        const result = await res.json();
        setSyncStatus({
          missingPayments: result.payments?.missingJournalEntry || 0,
          missingDisbursements: result.disbursements?.missingJournalEntry || 0,
        });
      }
    } catch { /* non-critical */ }
  };

  const handleSyncJournals = async () => {
    if (!selectedCompanyId) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/accounting/sync-journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: selectedCompanyId, dryRun: false }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(
          `Sync complete! Created ${result.summary?.totalCreated || 0} journal entries ` +
          `(${result.results?.emiPayments?.created || 0} EMIs, ${result.results?.disbursements?.created || 0} disbursements).`
        );
        setSyncStatus({ missingPayments: 0, missingDisbursements: 0 });
        fetchTrialBalance();
      } else {
        toast.error(result.error || 'Sync failed');
      }
    } catch (err) {
      toast.error('Network error during sync');
    } finally {
      setSyncing(false);
    }
  };

  const fetchTrialBalance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/enhanced-trial-balance?companyId=${selectedCompanyId}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching trial balance:', error);
      toast.error('Failed to load trial balance');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          No trial balance data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Scale className="h-6 w-6 text-emerald-600" />
            Trial Balance Sheet
          </h2>
          <p className="text-sm text-gray-500">Liabilities vs Assets</p>
        </div>
        <div className="flex items-center gap-2">
          {/* ── Sync Journal Entries ── */}
          {syncStatus && (syncStatus.missingPayments > 0 || syncStatus.missingDisbursements > 0) && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-700">
              <span className="font-semibold">⚠ {syncStatus.missingPayments + syncStatus.missingDisbursements} missing entries</span>
            </div>
          )}
          <Button
            size="sm"
            onClick={handleSyncJournals}
            disabled={syncing}
            className="bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs px-3"
          >
            {syncing ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Syncing...</>
            ) : (
              <><RefreshCw className="h-3.5 w-3.5 mr-1" />Sync Journals</>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchTrialBalance}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Missing Journal Entry Warning */}
      {syncStatus && (syncStatus.missingPayments > 0 || syncStatus.missingDisbursements > 0) && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-lg">
          <span className="text-amber-500 text-xl mt-0.5">⚠</span>
          <div>
            <p className="font-semibold text-amber-800 text-sm">Journal Entries Missing — Trial Balance May Show Zero</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {syncStatus.missingPayments > 0 && `${syncStatus.missingPayments} EMI payment(s) have no journal entry. `}
              {syncStatus.missingDisbursements > 0 && `${syncStatus.missingDisbursements} loan disbursement(s) have no journal entry. `}
              Click <strong>Sync Journals</strong> above to backfill them instantly. This is a one-time fix.
            </p>
          </div>
        </div>
      )}


      {/* Balance Status */}
      <Card className={`${data.summary?.isBalanced ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {data.summary?.isBalanced ? (
                <div className="p-2 bg-green-100 rounded-full">
                  <Scale className="h-6 w-6 text-green-600" />
                </div>
              ) : (
                <div className="p-2 bg-orange-100 rounded-full">
                  <Scale className="h-6 w-6 text-orange-600" />
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Balance Status</p>
                <p className={`font-bold ${data.summary?.isBalanced ? 'text-green-600' : 'text-orange-600'}`}>
                  {data.summary?.isBalanced ? 'Balanced' : `Difference: ${formatCurrency(Math.abs(data.summary?.difference || 0))}`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Net Worth</p>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(data.summary?.netWorth || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Liabilities */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50">
            <CardTitle className="text-red-700 flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              LEFT SIDE (Liabilities)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {/* Equity */}
                <TableRow className="bg-gray-50">
                  <TableCell colSpan={2} className="font-semibold text-gray-700">
                    <div className="flex items-center justify-between">
                      <span>1. EQUITY (Owner's Capital)</span>
                      <Button 
                        size="sm" 
                        onClick={() => setShowAddEquityDialog(true)}
                        className="h-7 bg-red-100 text-red-700 hover:bg-red-200 border-red-200"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Equity
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {data.leftSide?.equity?.entries?.length > 0 ? (
                  data.leftSide.equity.entries.map((entry: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="pl-8 text-sm">{entry.description || entry.entryType}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Math.abs(entry.amount))}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="pl-8 text-sm text-gray-400 italic">No equity entries</TableCell>
                    <TableCell className="text-right text-gray-400">₹0.00</TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-red-50">
                  <TableCell className="font-medium">Total Equity</TableCell>
                  <TableCell className="text-right font-bold text-red-700">
                    {formatCurrency(data.leftSide?.equity?.total || 0)}
                  </TableCell>
                </TableRow>

                {/* Borrowed Money */}
                <TableRow className="bg-gray-50">
                  <TableCell colSpan={2} className="font-semibold text-gray-700">
                    <div className="flex items-center justify-between">
                      <span>2. BORROWED MONEY</span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowAddBorrowedDialog(true)}
                        className="h-7 bg-pink-100 text-pink-700 hover:bg-pink-200 border-pink-200"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Borrowed
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {data.leftSide?.borrowedMoney?.entries?.length > 0 ? (
                  data.leftSide.borrowedMoney.entries.map((entry: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="pl-8 text-sm">{entry.sourceName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.amount - (entry.amountRepaid || 0))}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="pl-8 text-sm text-gray-400 italic">No borrowed money entries</TableCell>
                    <TableCell className="text-right text-gray-400">₹0.00</TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-red-50">
                  <TableCell className="font-medium">Total Borrowed</TableCell>
                  <TableCell className="text-right font-bold text-red-700">
                    {formatCurrency(data.leftSide?.borrowedMoney?.total || 0)}
                  </TableCell>
                </TableRow>

                {/* Final Equity */}
                <TableRow className="bg-gray-50">
                  <TableCell colSpan={2} className="font-semibold text-gray-700">
                    3. FINAL EQUITY
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8 text-sm">Initial Equity</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.leftSide?.finalEquity?.initialEquity || 0)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8 text-sm">
                    {data.leftSide?.finalEquity?.isProfit ? '(+) Net Profit' : '(-) Net Loss'}
                  </TableCell>
                  <TableCell className={`text-right ${data.leftSide?.finalEquity?.isProfit ? 'text-green-600' : 'text-red-600'}`}>
                    {data.leftSide?.finalEquity?.isProfit ? '+' : '-'}{formatCurrency(Math.abs(data.leftSide?.finalEquity?.netProfitLoss || 0))}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-emerald-50">
                  <TableCell className="font-medium">Final Equity</TableCell>
                  <TableCell className="text-right font-bold text-emerald-700">
                    {formatCurrency(data.leftSide?.finalEquity?.finalEquity || 0)}
                  </TableCell>
                </TableRow>

                {/* Total Liabilities */}
                <TableRow className="bg-red-100 font-bold text-lg">
                  <TableCell>TOTAL LIABILITIES</TableCell>
                  <TableCell className="text-right text-red-800">
                    {formatCurrency(data.leftSide?.totalLiabilities || 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Right Side - Assets */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="text-green-700 flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              RIGHT SIDE (Assets)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {/* 1. Bank Balance */}
                <TableRow className="bg-gray-50">
                  <TableCell colSpan={2} className="font-semibold text-gray-700">
                    1. BANK BALANCE
                  </TableCell>
                </TableRow>
                {/* Show aggregate "Bank Account" total — NOT individual bank names */}
                <TableRow>
                  <TableCell className="pl-8 text-sm">
                    Bank Account
                    {(data.rightSide?.bankBalance?.accounts?.length || 0) > 0 && (
                      <span className="text-xs text-gray-400 ml-1">
                        ({data.rightSide.bankBalance.accounts.length} account{data.rightSide.bankBalance.accounts.length > 1 ? 's' : ''} combined)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(data.rightSide?.bankBalance?.total || 0)}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-green-50">
                  <TableCell className="font-medium">Total Bank Balance</TableCell>
                  <TableCell className="text-right font-bold text-green-700">
                    {formatCurrency(data.rightSide?.bankBalance?.total || 0)}
                  </TableCell>
                </TableRow>

                {/* 2. Cashbook Balance */}
                <TableRow className="bg-gray-50">
                  <TableCell colSpan={2} className="font-semibold text-gray-700">
                    2. CASHBOOK BALANCE
                  </TableCell>
                </TableRow>
                <TableRow className="bg-green-50">
                  <TableCell className="font-medium">Cash in Hand</TableCell>
                  <TableCell className="text-right font-bold text-green-700">
                    {formatCurrency(data.rightSide?.cashbookBalance?.total || 0)}
                  </TableCell>
                </TableRow>

                {/* 3. Invest Money */}
                <TableRow className="bg-gray-50">
                  <TableCell colSpan={2} className="font-semibold text-gray-700">
                    <div className="flex items-center justify-between">
                      <span>3. INVEST MONEY</span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowAddInvestDialog(true)}
                        className="h-7 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Invest
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {data.rightSide?.investMoney?.entries?.length > 0 ? (
                  data.rightSide.investMoney.entries.map((entry: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="pl-8 text-sm">{entry.investorName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.amount)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="pl-8 text-sm text-gray-400 italic">No invest money entries</TableCell>
                    <TableCell className="text-right text-gray-400">₹0.00</TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-green-50">
                  <TableCell className="font-medium">Total Invest Money</TableCell>
                  <TableCell className="text-right font-bold text-green-700">
                    {formatCurrency(data.rightSide?.investMoney?.total || 0)}
                  </TableCell>
                </TableRow>

                {/* 4. Loan Principal */}
                <TableRow className="bg-gray-50">
                  <TableCell colSpan={2} className="font-semibold text-gray-700">
                    4. LOAN PRINCIPAL
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8 text-sm">Active Loans ({data.rightSide?.loanPrincipal?.activeLoanCount || 0})</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.rightSide?.loanPrincipal?.total || 0)}</TableCell>
                </TableRow>
                <TableRow className="bg-green-50">
                  <TableCell className="font-medium">Total Principal Outstanding</TableCell>
                  <TableCell className="text-right font-bold text-green-700">
                    {formatCurrency(data.rightSide?.loanPrincipal?.total || 0)}
                  </TableCell>
                </TableRow>

                {/* 5. Interest Receivable */}
                <TableRow className="bg-gray-50">
                  <TableCell colSpan={2} className="font-semibold text-gray-700">
                    5. INTEREST RECEIVABLE
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8 text-sm">Pending Interest from Customers</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.rightSide?.interestReceivable?.total || 0)}</TableCell>
                </TableRow>
                <TableRow className="bg-green-50">
                  <TableCell className="font-medium">Total Interest Receivable</TableCell>
                  <TableCell className="text-right font-bold text-green-700">
                    {formatCurrency(data.rightSide?.interestReceivable?.total || 0)}
                  </TableCell>
                </TableRow>

                {/* Total Assets */}
                <TableRow className="bg-green-100 font-bold text-lg">
                  <TableCell>TOTAL ASSETS</TableCell>
                  <TableCell className="text-right text-green-800">
                    {formatCurrency(data.rightSide?.totalAssets || 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Equity Dialog */}
      <AddEquityDialog 
        open={showAddEquityDialog}
        onOpenChange={setShowAddEquityDialog}
        companyId={selectedCompanyId}
        onSuccess={fetchTrialBalance}
        formatCurrency={formatCurrency}
      />

      {/* Add Borrowed Money Dialog */}
      <AddBorrowedMoneyDialog 
        open={showAddBorrowedDialog}
        onOpenChange={setShowAddBorrowedDialog}
        companyId={selectedCompanyId}
        onSuccess={fetchTrialBalance}
        formatCurrency={formatCurrency}
      />

      {/* Add Invest Money Dialog */}
      <AddInvestMoneyDialog 
        open={showAddInvestDialog}
        onOpenChange={setShowAddInvestDialog}
        companyId={selectedCompanyId}
        onSuccess={fetchTrialBalance}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

// ============================================
// GENERAL LEDGER SECTION
// ============================================

export function GeneralLedgerSection({ selectedCompanyId, formatCurrency, formatDate }: EnhancedAccountingSectionProps) {
  const [accountHeads, setAccountHeads] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({
    'ASSET': true,
    'LIABILITY': true,
    'INCOME': true,
    'EXPENSE': true,
    'EQUITY': true
  });

  useEffect(() => {
    if (selectedCompanyId) {
      fetchAccountHeads();
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (selectedAccount) {
      fetchLedgerEntries(selectedAccount.id);
    }
  }, [selectedAccount]);

  const fetchAccountHeads = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/general-ledger?companyId=${selectedCompanyId}`);
      if (res.ok) {
        const data = await res.json();
        setAccountHeads(data.accountHeads || []);
      }
    } catch (error) {
      console.error('Error fetching account heads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLedgerEntries = async (accountHeadId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/general-ledger?companyId=${selectedCompanyId}&accountHeadId=${accountHeadId}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleType = (type: string) => {
    setExpandedTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'ASSET': 'bg-green-50 border-green-200',
      'LIABILITY': 'bg-red-50 border-red-200',
      'INCOME': 'bg-blue-50 border-blue-200',
      'EXPENSE': 'bg-orange-50 border-orange-200',
      'EQUITY': 'bg-purple-50 border-purple-200'
    };
    return colors[type] || 'bg-gray-50 border-gray-200';
  };

  // Group by type
  const groupedHeads = accountHeads.reduce((acc, head) => {
    if (!acc[head.type]) acc[head.type] = [];
    acc[head.type].push(head);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-600" />
            General Ledger
          </h2>
          <p className="text-sm text-gray-500">Account-wise transaction details</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAccountHeads}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Account Heads List and Ledger View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Heads List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Account Heads</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {(Object.entries(groupedHeads) as [string, any[]][]).map(([type, heads]) => (
                <div key={type} className="border-b">
                  <button
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
                    onClick={() => toggleType(type)}
                  >
                    <span className="font-semibold text-gray-700">{type}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {formatCurrency(heads.reduce((sum: number, h: any) => sum + h.currentBalance, 0))}
                      </span>
                      {expandedTypes[type] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </button>
                  {expandedTypes[type] && (
                    <div className="bg-gray-50">
                      {heads.map((head: any) => (
                        <button
                          key={head.id}
                          className={`w-full flex items-center justify-between p-2 pl-6 text-sm hover:bg-gray-100 ${
                            selectedAccount?.id === head.id ? 'bg-emerald-50 border-l-2 border-emerald-500' : ''
                          }`}
                          onClick={() => setSelectedAccount(head)}
                        >
                          <div className="text-left">
                            <p className="font-medium">{head.name}</p>
                            <p className="text-xs text-gray-500">{head.code}</p>
                          </div>
                          <span className={`font-bold ${head.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(Math.abs(head.currentBalance))}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Ledger View */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedAccount ? `${selectedAccount.name} Ledger` : 'Select an Account'}
            </CardTitle>
            {summary && (
              <CardDescription>
                Opening: {formatCurrency(summary.openingBalance)} | 
                Closing: {formatCurrency(summary.closingBalance)} |
                Entries: {summary.entryCount}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : !selectedAccount ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <BookOpen className="h-12 w-12 mb-4 text-gray-300" />
                <p>Select an account head to view its ledger</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-white">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Particular</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Opening Balance Row */}
                    <TableRow className="bg-gray-50">
                      <TableCell>-</TableCell>
                      <TableCell className="font-medium">Opening Balance</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(summary?.openingBalance || 0)}
                      </TableCell>
                    </TableRow>
                    {entries.map((entry, idx) => (
                      <TableRow key={entry.id || idx}>
                        <TableCell className="font-mono text-sm">
                          {formatDate(entry.entryDate)}
                        </TableCell>
                        <TableCell>{entry.particular}</TableCell>
                        <TableCell className="text-right text-red-600">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${entry.runningBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(entry.runningBalance))}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    {summary && (
                      <TableRow className="bg-gray-100 font-bold">
                        <TableCell colSpan={2}>TOTAL</TableCell>
                        <TableCell className="text-right text-red-700">{formatCurrency(summary.totalDebit)}</TableCell>
                        <TableCell className="text-right text-green-700">{formatCurrency(summary.totalCredit)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(summary.closingBalance)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// DIALOG COMPONENTS
// ============================================

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess: () => void;
  formatCurrency: (amount: number) => string;
}

function AddEquityDialog({ open, onOpenChange, companyId, onSuccess, formatCurrency }: DialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    entryType: 'ADDITIONAL',
    amount: '',
    description: '',
    entryDate: format(new Date(), 'yyyy-MM-dd')
  });

  const handleSubmit = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/accounting/equity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          companyId,
          amount: parseFloat(form.amount),
          createdById: 'system'
        })
      });

      if (res.ok) {
        toast.success('Equity entry added successfully');
        setForm({ entryType: 'ADDITIONAL', amount: '', description: '', entryDate: format(new Date(), 'yyyy-MM-dd') });
        onOpenChange(false);
        onSuccess();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to add equity');
      }
    } catch (error) {
      toast.error('Failed to add equity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Equity Entry</DialogTitle>
          <DialogDescription>Add owner's capital to the company</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Entry Type</Label>
            <Select value={form.entryType} onValueChange={(v) => setForm(prev => ({ ...prev, entryType: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADDITIONAL">Additional Capital</SelectItem>
                <SelectItem value="OPENING">Opening Balance</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="Enter amount"
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.entryDate}
              onChange={(e) => setForm(prev => ({ ...prev, entryDate: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add Equity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddBorrowedMoneyDialog({ open, onOpenChange, companyId, onSuccess, formatCurrency }: DialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    sourceType: 'BANK',
    sourceName: '',
    amount: '',
    interestRate: '',
    description: '',
    borrowedDate: format(new Date(), 'yyyy-MM-dd')
  });

  const handleSubmit = async () => {
    if (!form.sourceName || !form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/accounting/borrowed-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          companyId,
          amount: parseFloat(form.amount),
          interestRate: form.interestRate ? parseFloat(form.interestRate) : null,
          createdById: 'system'
        })
      });

      if (res.ok) {
        toast.success('Borrowed money entry added successfully');
        setForm({ sourceType: 'BANK', sourceName: '', amount: '', interestRate: '', description: '', borrowedDate: format(new Date(), 'yyyy-MM-dd') });
        onOpenChange(false);
        onSuccess();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to add borrowed money');
      }
    } catch (error) {
      toast.error('Failed to add borrowed money');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Borrowed Money</DialogTitle>
          <DialogDescription>Record money borrowed from external sources</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Source Type</Label>
            <Select value={form.sourceType} onValueChange={(v) => setForm(prev => ({ ...prev, sourceType: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK">Bank</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="FINANCIAL_INSTITUTION">Financial Institution</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Source Name *</Label>
            <Input
              value={form.sourceName}
              onChange={(e) => setForm(prev => ({ ...prev, sourceName: e.target.value }))}
              placeholder="e.g., HDFC Bank, Mr. Sharma"
            />
          </div>
          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="Enter amount"
            />
          </div>
          <div className="space-y-2">
            <Label>Interest Rate (% p.a.)</Label>
            <Input
              type="number"
              value={form.interestRate}
              onChange={(e) => setForm(prev => ({ ...prev, interestRate: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.borrowedDate}
              onChange={(e) => setForm(prev => ({ ...prev, borrowedDate: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add Borrowed Money
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddInvestMoneyDialog({ open, onOpenChange, companyId, onSuccess, formatCurrency }: DialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    investorType: 'INDIVIDUAL',
    investorName: '',
    investorContact: '',
    amount: '',
    expectedReturn: '',
    description: '',
    investmentDate: format(new Date(), 'yyyy-MM-dd')
  });

  const handleSubmit = async () => {
    if (!form.investorName || !form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/accounting/invest-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          companyId,
          amount: parseFloat(form.amount),
          expectedReturn: form.expectedReturn ? parseFloat(form.expectedReturn) : null,
          createdById: 'system'
        })
      });

      if (res.ok) {
        toast.success('Invest money entry added successfully');
        setForm({ investorType: 'INDIVIDUAL', investorName: '', investorContact: '', amount: '', expectedReturn: '', description: '', investmentDate: format(new Date(), 'yyyy-MM-dd') });
        onOpenChange(false);
        onSuccess();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to add invest money');
      }
    } catch (error) {
      toast.error('Failed to add invest money');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Invest Money</DialogTitle>
          <DialogDescription>Record investment received from investors</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Investor Type</Label>
            <Select value={form.investorType} onValueChange={(v) => setForm(prev => ({ ...prev, investorType: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="COMPANY">Company</SelectItem>
                <SelectItem value="PARTNER">Partner</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Investor Name *</Label>
            <Input
              value={form.investorName}
              onChange={(e) => setForm(prev => ({ ...prev, investorName: e.target.value }))}
              placeholder="e.g., Mr. Patel"
            />
          </div>
          <div className="space-y-2">
            <Label>Contact Info</Label>
            <Input
              value={form.investorContact}
              onChange={(e) => setForm(prev => ({ ...prev, investorContact: e.target.value }))}
              placeholder="Phone or email"
            />
          </div>
          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="Enter amount"
            />
          </div>
          <div className="space-y-2">
            <Label>Expected Return Amount</Label>
            <Input
              type="number"
              value={form.expectedReturn}
              onChange={(e) => setForm(prev => ({ ...prev, expectedReturn: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.investmentDate}
              onChange={(e) => setForm(prev => ({ ...prev, investmentDate: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add Invest Money
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
