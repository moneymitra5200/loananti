'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, FileSpreadsheet, CreditCard, ArrowUpRight, ArrowDownRight, 
  RefreshCw, Download, Search, Calendar, IndianRupee, Landmark, 
  Banknote, Clock, User, Building2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ActiveLoan } from '../types';
import { toast } from 'sonner';

// Types for ledger entries
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

interface LedgerSectionProps {
  selectedCompanyId: string;
  activeLoans: ActiveLoan[];
  bankAccounts: any[];
  bankTransactions: any[];
  journalEntries: any[];
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

export default function LedgerSection({
  selectedCompanyId,
  activeLoans,
  bankAccounts,
  bankTransactions,
  journalEntries,
  formatCurrency,
  formatDate
}: LedgerSectionProps) {
  
  // State
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [selectedLoan, setSelectedLoan] = useState<ActiveLoan | null>(null);
  const [loanLedger, setLoanLedger] = useState<LoanLedgerEntry[]>([]);
  const [commonLedger, setCommonLedger] = useState<LedgerEntryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  // Build Common Ledger from all transactions
  useEffect(() => {
    buildCommonLedger();
  }, [bankTransactions, journalEntries, activeLoans, dateFilter]);

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
        if (txn.type === 'CREDIT') {
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
        toast.error('Loan not found');
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
      toast.error('Failed to load loan ledger');
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
    toast.success('Ledger exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-600" />
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
      <Tabs defaultValue="common" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="common" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Common Ledger
          </TabsTrigger>
          <TabsTrigger value="loan" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Loan Ledger
          </TabsTrigger>
        </TabsList>

        {/* Common Ledger Tab */}
        <TabsContent value="common" className="space-y-4 mt-4">
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
                    <IndianRupee className="h-5 w-5 text-blue-600" />
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

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-gray-600">Search</Label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      placeholder="Search..."
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
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => exportToCSV('common')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Common Ledger Table */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                All Transactions
              </CardTitle>
              <CardDescription>
                Complete ledger with all bank transactions, EMI collections, and payments
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-white">
                    <TableRow>
                      <TableHead className="w-24">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Particular</TableHead>
                      <TableHead className="w-20">Type</TableHead>
                      <TableHead className="text-right w-28">Debit</TableHead>
                      <TableHead className="text-right w-28">Credit</TableHead>
                      <TableHead className="text-right w-28">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                          <p className="text-sm text-gray-500 mt-2">Loading ledger...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredCommonLedger.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCommonLedger.map((entry, idx) => (
                        <TableRow key={entry.id} className="hover:bg-gray-50">
                          <TableCell className="font-mono text-sm">
                            {formatDate(entry.date)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{entry.description}</p>
                              {entry.loanNo && (
                                <p className="text-xs text-gray-500">
                                  Loan: {entry.loanNo} {entry.customerName && `• ${entry.customerName}`}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {entry.particular || entry.reference}
                          </TableCell>
                          <TableCell>
                            <Badge className={getTypeBadge(entry.type)}>
                              {entry.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-red-600 font-medium">
                            {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                          </TableCell>
                          <TableCell className={`text-right font-bold ${entry.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {formatCurrency(Math.abs(entry.balance))}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loan Ledger Tab */}
        <TabsContent value="loan" className="space-y-4 mt-4">
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
                              {formatCurrency(loan.disbursedAmount || 0)}
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
                      <Download className="h-4 w-4 mr-2" />
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
                    {formatCurrency(selectedLoan.disbursedAmount || 0)}
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
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white">
                      <TableRow>
                        <TableHead>EMI #</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Principal</TableHead>
                        <TableHead className="text-right">Interest</TableHead>
                        <TableHead className="text-right">Penalty</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment Mode</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                            <p className="text-sm text-gray-500 mt-2">Loading loan ledger...</p>
                          </TableCell>
                        </TableRow>
                      ) : loanLedger.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                            No EMI schedule found for this loan
                          </TableCell>
                        </TableRow>
                      ) : (
                        loanLedger.map((entry) => (
                          <TableRow key={entry.id} className="hover:bg-gray-50">
                            <TableCell className="font-bold">
                              #{entry.emiNo}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {formatDate(entry.dueDate)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(entry.principal)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(entry.interest)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {entry.penalty > 0 ? formatCurrency(entry.penalty) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(entry.totalAmount + entry.penalty)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatCurrency(entry.paidAmount)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-red-600">
                              {formatCurrency(entry.totalAmount + entry.penalty - entry.paidAmount)}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusBadge(entry.status)}>
                                {entry.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {entry.paymentMode || '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      {/* Totals Row */}
                      {loanLedger.length > 0 && (
                        <TableRow className="bg-gray-100 font-bold">
                          <TableCell colSpan={2}>TOTAL</TableCell>
                          <TableCell className="text-right">{formatCurrency(totalPrincipal)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totalInterest)}</TableCell>
                          <TableCell className="text-right text-red-600">{formatCurrency(totalPenalty)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(totalPrincipal + totalInterest + totalPenalty)}
                          </TableCell>
                          <TableCell className="text-right text-green-700">{formatCurrency(totalPaid)}</TableCell>
                          <TableCell className="text-right text-red-700">{formatCurrency(totalOutstanding)}</TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
