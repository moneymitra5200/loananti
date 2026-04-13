'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, Calendar, Eye, ArrowUpRight, ArrowDownRight, RefreshCw, 
  List, FileText, Search, ChevronLeft, ChevronRight, TrendingUp, TrendingDown
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { BankAccount, BankTransaction, JournalEntry } from '../types';

interface DayBookSectionProps {
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  journalEntries: JournalEntry[];
  selectedCompanyId: string;
  formatCurrency: (amount: number) => string;
}

interface DayBookEntry {
  id: string;
  date: Date;
  time: Date;
  description: string;
  referenceType: string;
  entryNumber: string;
  receipt: number;
  payment: number;
  balance: number;
  type: 'journal' | 'bank';
  originalData: any;
}

interface TransactionDetail {
  id: string;
  entryNumber: string;
  entryDate: Date;
  referenceType: string;
  narration: string;
  totalDebit: number;
  totalCredit: number;
  paymentMode?: string;
  lines: Array<{
    accountCode: string;
    accountName: string;
    accountType: string;
    debitAmount: number;
    creditAmount: number;
    narration?: string;
  }>;
}

export default function DayBookSection({ 
  bankAccounts, 
  bankTransactions, 
  journalEntries,
  selectedCompanyId,
  formatCurrency 
}: DayBookSectionProps) {
  const [viewMode, setViewMode] = useState<'day' | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dayBookEntries, setDayBookEntries] = useState<DayBookEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<DayBookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TransactionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);
  const entriesPerPage = 50;

  // Compute effective dates based on view mode
  const getEffectiveDates = useCallback(() => {
    if (viewMode === 'day') {
      return { start: selectedDate, end: selectedDate };
    }
    return { start: startDate, end: endDate };
  }, [viewMode, selectedDate, startDate, endDate]);

  // Fetch combined day book data
  const fetchDayBookData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getEffectiveDates();
      const res = await fetch(
        `/api/accounting/enhanced-daybook?companyId=${selectedCompanyId}&viewMode=all&startDate=${start}&endDate=${end}`
      );

      if (res.ok) {
        const apiData = await res.json();
        setOpeningBalance(apiData.openingBalance ?? 0);
        setClosingBalance(apiData.closingBalance ?? 0);

        const apiEntries: DayBookEntry[] = (apiData.entries || []).map((row: any) => ({
          id:            row.id,
          date:          new Date(row.date),
          time:          new Date(row.date),
          description:   row.particular || row.narration || 'Journal Entry',
          referenceType: row.referenceType || 'MANUAL_ENTRY',
          entryNumber:   row.entryNumber || `JE-${(row.id || '').slice(0, 8).toUpperCase()}`,
          receipt:       row.credit  || 0,
          payment:       row.debit   || 0,
          balance:       row.runningBalance || 0,
          type:          'journal' as const,
          originalData:  row
        }));

        setDayBookEntries(apiEntries);
        setFilteredEntries(apiEntries);
        return;
      }

      // Fallback: build from props
      const combinedEntries: DayBookEntry[] = [];
      for (const entry of journalEntries) {
        const totalDebit  = entry.lines?.reduce((s: number, l: any) => s + (l.debitAmount  || 0), 0) || 0;
        const totalCredit = entry.lines?.reduce((s: number, l: any) => s + (l.creditAmount || 0), 0) || 0;
        combinedEntries.push({
          id: entry.id, date: new Date(entry.entryDate), time: new Date(entry.entryDate),
          description: entry.narration || 'Journal Entry',
          referenceType: entry.referenceType || 'MANUAL_ENTRY',
          entryNumber: entry.entryNumber,
          receipt: totalCredit, payment: totalDebit, balance: 0,
          type: 'journal', originalData: entry
        });
      }
      for (const txn of bankTransactions) {
        const isCredit = txn.transactionType === 'CREDIT';
        combinedEntries.push({
          id: txn.id, date: new Date(txn.transactionDate), time: new Date(txn.transactionDate),
          description: txn.description, referenceType: txn.referenceType,
          entryNumber: 'BT-' + txn.id.slice(0, 8).toUpperCase(),
          receipt: isCredit ? txn.amount : 0, payment: !isCredit ? txn.amount : 0,
          balance: txn.balanceAfter, type: 'bank', originalData: txn
        });
      }
      combinedEntries.sort((a, b) => b.date.getTime() - a.date.getTime());
      let runningBal = 0;
      const sortedAsc = [...combinedEntries].sort((a, b) => a.date.getTime() - b.date.getTime());
      for (const e of sortedAsc) { runningBal += e.receipt - e.payment; e.balance = runningBal; }
      setDayBookEntries(combinedEntries);
      setFilteredEntries(combinedEntries);
      setOpeningBalance(0);
      setClosingBalance(runningBal);
    } catch (error) {
      console.error('Error fetching day book data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, getEffectiveDates, journalEntries, bankTransactions]);

  // Re-fetch when company or date range changes
  useEffect(() => {
    fetchDayBookData();
  }, [fetchDayBookData]);

  // Apply search filter
  useEffect(() => {
    let filtered = [...dayBookEntries];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.description.toLowerCase().includes(term) ||
        entry.entryNumber.toLowerCase().includes(term) ||
        entry.referenceType.toLowerCase().includes(term)
      );
    }
    setFilteredEntries(filtered);
    setCurrentPage(1);
  }, [searchTerm, dayBookEntries]);

  const handleViewEntry = async (entry: DayBookEntry) => {
    setLoadingDetail(true);
    setShowDetailDialog(true);
    try {
      if (entry.type === 'journal') {
        const journal = entry.originalData as JournalEntry;
        setSelectedEntry({
          id: journal.id, entryNumber: journal.entryNumber,
          entryDate: journal.entryDate,
          referenceType: journal.referenceType || 'MANUAL_ENTRY',
          narration: journal.narration || '',
          totalDebit: journal.totalDebit, totalCredit: journal.totalCredit,
          paymentMode: 'JOURNAL',
          lines: journal.lines.map(l => ({
            accountCode: l.account?.accountCode || '',
            accountName: l.account?.accountName || '',
            accountType: l.account?.accountType || '',
            debitAmount: l.debitAmount, creditAmount: l.creditAmount,
            narration: l.narration || undefined
          }))
        });
      } else {
        const res = await fetch(`/api/accounting/journal-entry-by-reference?referenceType=${entry.referenceType}&referenceId=${entry.id}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedEntry(data.entry);
        } else {
          const txn = entry.originalData as BankTransaction;
          setSelectedEntry({
            id: txn.id, entryNumber: entry.entryNumber,
            entryDate: new Date(txn.transactionDate),
            referenceType: txn.referenceType, narration: txn.description,
            totalDebit: txn.transactionType === 'DEBIT' ? txn.amount : 0,
            totalCredit: txn.transactionType === 'CREDIT' ? txn.amount : 0,
            paymentMode: 'BANK_TRANSFER',
            lines: [{ accountCode: '1400', accountName: 'Bank Account', accountType: 'ASSET',
              debitAmount: txn.transactionType === 'CREDIT' ? txn.amount : 0,
              creditAmount: txn.transactionType === 'DEBIT' ? txn.amount : 0,
              narration: txn.description }]
          });
        }
      }
    } catch (error) {
      console.error('Error fetching entry details:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getReferenceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'LOAN_DISBURSEMENT': 'Loan Disbursement', 'EMI_PAYMENT': 'EMI Payment',
      'PROCESSING_FEE_COLLECTION': 'Processing Fee', 'PROCESSING_FEE': 'Processing Fee',
      'EXPENSE_ENTRY': 'Expense', 'EXPENSE': 'Expense',
      'DEPOSIT': 'Deposit', 'WITHDRAWAL': 'Withdrawal',
      'INTEREST_COLLECTION': 'Interest', 'INTEREST_INCOME': 'Interest Income',
      'PENALTY_COLLECTION': 'Penalty', 'PENALTY': 'Penalty',
      'COMMISSION_PAYMENT': 'Commission', 'COMMISSION_PAID': 'Commission Paid',
      'TRANSFER_IN': 'Transfer In', 'TRANSFER_OUT': 'Transfer Out',
      'OPENING_BALANCE': 'Opening Balance', 'MANUAL_ENTRY': 'Manual Entry',
      'MIRROR_EMI_PAYMENT': 'Mirror EMI', 'EXTRA_EMI_PAYMENT': 'Extra EMI'
    };
    return labels[type] || type;
  };

  const totalReceipts = filteredEntries.reduce((s, e) => s + e.receipt, 0);
  const totalPayments = filteredEntries.reduce((s, e) => s + e.payment, 0);

  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Day Book / Cash Book
        </h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search transactions..."
              className="w-48 pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchDayBookData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'day' | 'all')}>
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Date Range
          </TabsTrigger>
          <TabsTrigger value="day" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Single Day
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">From:</span>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">To:</span>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="day" className="mt-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-40" />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── OPENING / CLOSING BALANCE + PERIOD SUMMARY ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Opening Balance */}
        <Card className="bg-slate-50 border-slate-200 col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-slate-500" />
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Opening Balance</p>
            </div>
            <p className={`text-xl font-bold ${openingBalance >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
              {formatCurrency(openingBalance)}
            </p>
            <p className="text-xs text-slate-400 mt-1">Start of period</p>
          </CardContent>
        </Card>

        {/* Total Credit */}
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Credit (CR)</p>
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-xl font-bold text-green-600">+{formatCurrency(totalReceipts)}</p>
            <p className="text-xs text-gray-400 mt-1">Money received</p>
          </CardContent>
        </Card>

        {/* Total Debit */}
        <Card className="bg-red-50 border-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Debit (DR)</p>
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-xl font-bold text-red-600">-{formatCurrency(totalPayments)}</p>
            <p className="text-xs text-gray-400 mt-1">Money paid out</p>
          </CardContent>
        </Card>

        {/* Closing Balance */}
        <Card className={`col-span-1 ${closingBalance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-emerald-600" />
              <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Closing Balance</p>
            </div>
            <p className={`text-xl font-bold ${closingBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatCurrency(closingBalance)}
            </p>
            <p className="text-xs text-emerald-500 mt-1">End of period → next Opening</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Transactions</CardTitle>
            <Badge variant="outline">{filteredEntries.length} entries</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[520px]">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-[95px]">Date</TableHead>
                  <TableHead className="w-[60px]">Time</TableHead>
                  <TableHead className="w-[110px]">Entry No.</TableHead>
                  <TableHead>Particulars</TableHead>
                  <TableHead className="w-[110px]">Type</TableHead>
                  <TableHead className="text-right w-[120px] text-green-700 font-bold">Credit (CR)</TableHead>
                  <TableHead className="text-right w-[120px] text-red-700 font-bold">Debit (DR)</TableHead>
                  <TableHead className="text-right w-[130px] text-blue-700 font-bold">Balance</TableHead>
                  <TableHead className="w-[44px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="h-6 w-6 animate-spin text-emerald-500" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* ── OPENING BALANCE ROW ── */}
                    <TableRow className="bg-slate-50 border-b-2 border-slate-200">
                      <TableCell colSpan={5} className="font-semibold text-slate-600 text-sm py-2 pl-4">
                        🔓 Opening Balance
                        {viewMode === 'day'
                          ? ` (${format(new Date(selectedDate), 'dd MMM yyyy')})`
                          : ` (${format(new Date(startDate), 'dd MMM yyyy')})`}
                      </TableCell>
                      <TableCell colSpan={2} />
                      <TableCell className="text-right font-bold text-slate-700 text-sm">
                        {formatCurrency(openingBalance)}
                      </TableCell>
                      <TableCell />
                    </TableRow>

                    {/* ── TRANSACTION ROWS ── */}
                    {filteredEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-gray-500 py-6">
                          No transactions in this period
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedEntries.map((entry) => (
                        <TableRow key={entry.id + entry.entryNumber} className="hover:bg-gray-50">
                          <TableCell className="font-mono text-sm">
                            {format(entry.date, 'dd MMM yy')}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-gray-500">
                            {format(entry.time, 'HH:mm')}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-500">
                            {entry.entryNumber}
                          </TableCell>
                          <TableCell className="max-w-[180px]">
                            <span className="truncate block text-sm">{entry.description}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getReferenceTypeLabel(entry.referenceType)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            {entry.receipt > 0 ? `+${formatCurrency(entry.receipt)}` : '—'}
                          </TableCell>
                          <TableCell className="text-right text-red-600 font-medium">
                            {entry.payment > 0 ? `-${formatCurrency(entry.payment)}` : '—'}
                          </TableCell>
                          <TableCell className={`text-right font-semibold text-sm ${entry.balance >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                            {formatCurrency(entry.balance)}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleViewEntry(entry)}>
                              <Eye className="h-4 w-4 text-gray-400" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}

                    {/* ── CLOSING BALANCE ROW ── */}
                    <TableRow className="bg-emerald-50 border-t-2 border-emerald-200">
                      <TableCell colSpan={5} className="font-semibold text-emerald-700 text-sm py-2 pl-4">
                        🔒 Closing Balance
                        {viewMode === 'day'
                          ? ` (${format(new Date(selectedDate), 'dd MMM yyyy')})`
                          : ` (${format(new Date(endDate), 'dd MMM yyyy')})`}
                        <span className="text-xs font-normal text-emerald-500 ml-2">→ becomes next period's Opening Balance</span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600 text-sm">
                        +{formatCurrency(totalReceipts)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600 text-sm">
                        -{formatCurrency(totalPayments)}
                      </TableCell>
                      <TableCell className={`text-right font-bold text-sm ${closingBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {formatCurrency(closingBalance)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * entriesPerPage + 1}–{Math.min(currentPage * entriesPerPage, filteredEntries.length)} of {filteredEntries.length}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Entry Details
            </DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          ) : selectedEntry ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Entry No:</span>
                  <p className="font-mono font-medium">{selectedEntry.entryNumber}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Date &amp; Time:</span>
                  <p className="font-medium">{format(new Date(selectedEntry.entryDate), 'dd MMM yyyy HH:mm')}</p>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Type:</span>
                <Badge variant="outline" className="ml-2">{getReferenceTypeLabel(selectedEntry.referenceType)}</Badge>
              </div>
              {selectedEntry.narration && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm">{selectedEntry.narration}</p>
                </div>
              )}
              <Separator />
              <div>
                <h4 className="font-semibold mb-3">Journal Entry Lines</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Debit (DR)</TableHead>
                      <TableHead className="text-right">Credit (CR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEntry.lines.map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{line.accountName}</span>
                            <span className="text-xs text-gray-500">{line.accountCode}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {line.debitAmount > 0 ? formatCurrency(line.debitAmount) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.creditAmount > 0 ? formatCurrency(line.creditAmount) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedEntry.totalDebit)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedEntry.totalCredit)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
