'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Calendar, Eye, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
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
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dayBookEntries, setDayBookEntries] = useState<DayBookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TransactionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Running balance
  const [runningBalance, setRunningBalance] = useState(0);

  // Fetch combined day book data
  useEffect(() => {
    fetchDayBookData();
  }, [selectedDate, selectedCompanyId, bankTransactions, journalEntries]);

  const fetchDayBookData = async () => {
    setLoading(true);
    try {
      const dateStart = startOfDay(new Date(selectedDate));
      const dateEnd = endOfDay(new Date(selectedDate));

      // Combine bank transactions and journal entries
      const combinedEntries: DayBookEntry[] = [];
      let currentBalance = bankAccounts.reduce((s, b) => s + b.currentBalance, 0);

      // Add bank transactions for the day
      const dayBankTxns = bankTransactions.filter(t => {
        const txnDate = new Date(t.transactionDate);
        return txnDate >= dateStart && txnDate <= dateEnd;
      });

      // Add journal entries for the day
      const dayJournalEntries = journalEntries.filter(e => {
        const entryDate = new Date(e.entryDate);
        return entryDate >= dateStart && entryDate <= dateEnd;
      });

      // Process journal entries
      for (const entry of dayJournalEntries) {
        const isReceipt = entry.totalDebit > 0 && entry.lines.some(l => l.account?.accountCode === '1400' && l.debitAmount > 0);
        const bankLine = entry.lines.find(l => l.account?.accountCode === '1400');
        const amount = bankLine?.debitAmount || bankLine?.creditAmount || 0;
        
        if (isReceipt) {
          currentBalance += amount;
        } else {
          currentBalance -= amount;
        }

        combinedEntries.push({
          id: entry.id,
          time: new Date(entry.entryDate),
          description: entry.narration || 'Journal Entry',
          referenceType: entry.referenceType || 'MANUAL_ENTRY',
          entryNumber: entry.entryNumber,
          receipt: isReceipt ? amount : 0,
          payment: !isReceipt ? amount : 0,
          balance: currentBalance,
          type: 'journal',
          originalData: entry
        });
      }

      // Process bank transactions
      for (const txn of dayBankTxns) {
        const isCredit = txn.transactionType === 'CREDIT';
        if (isCredit) {
          currentBalance += txn.amount;
        } else {
          currentBalance -= txn.amount;
        }

        combinedEntries.push({
          id: txn.id,
          time: new Date(txn.transactionDate),
          description: txn.description,
          referenceType: txn.referenceType,
          entryNumber: 'BT-' + txn.id.slice(0, 8).toUpperCase(),
          receipt: isCredit ? txn.amount : 0,
          payment: !isCredit ? txn.amount : 0,
          balance: txn.balanceAfter,
          type: 'bank',
          originalData: txn
        });
      }

      // Sort by time
      combinedEntries.sort((a, b) => a.time.getTime() - b.time.getTime());

      // Recalculate running balance
      let runningBal = 0;
      for (const entry of combinedEntries) {
        runningBal += entry.receipt - entry.payment;
        entry.balance = runningBal;
      }

      setDayBookEntries(combinedEntries);
      setRunningBalance(runningBal);
    } catch (error) {
      console.error('Error fetching day book data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewEntry = async (entry: DayBookEntry) => {
    setLoadingDetail(true);
    setShowDetailDialog(true);

    try {
      if (entry.type === 'journal') {
        // Already have the journal entry data
        const journal = entry.originalData as JournalEntry;
        setSelectedEntry({
          id: journal.id,
          entryNumber: journal.entryNumber,
          entryDate: journal.entryDate,
          referenceType: journal.referenceType || 'MANUAL_ENTRY',
          narration: journal.narration || '',
          totalDebit: journal.totalDebit,
          totalCredit: journal.totalCredit,
          paymentMode: 'JOURNAL',
          lines: journal.lines.map(l => ({
            accountCode: l.account?.accountCode || '',
            accountName: l.account?.accountName || '',
            accountType: l.account?.accountType || '',
            debitAmount: l.debitAmount,
            creditAmount: l.creditAmount,
            narration: l.narration || undefined
          }))
        });
      } else {
        // Fetch journal entry for bank transaction
        const res = await fetch(`/api/accounting/journal-entry-by-reference?referenceType=${entry.referenceType}&referenceId=${entry.id}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedEntry(data.entry);
        } else {
          // Show basic bank transaction info
          const txn = entry.originalData as BankTransaction;
          setSelectedEntry({
            id: txn.id,
            entryNumber: entry.entryNumber,
            entryDate: new Date(txn.transactionDate),
            referenceType: txn.referenceType,
            narration: txn.description,
            totalDebit: txn.transactionType === 'DEBIT' ? txn.amount : 0,
            totalCredit: txn.transactionType === 'CREDIT' ? txn.amount : 0,
            paymentMode: 'BANK_TRANSFER',
            lines: [{
              accountCode: '1400',
              accountName: 'Bank Account',
              accountType: 'ASSET',
              debitAmount: txn.transactionType === 'CREDIT' ? txn.amount : 0,
              creditAmount: txn.transactionType === 'DEBIT' ? txn.amount : 0,
              narration: txn.description
            }]
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
      'LOAN_DISBURSEMENT': 'Loan Disbursement',
      'EMI_PAYMENT': 'EMI Payment',
      'PROCESSING_FEE_COLLECTION': 'Processing Fee',
      'PROCESSING_FEE': 'Processing Fee',
      'EXPENSE_ENTRY': 'Expense',
      'EXPENSE': 'Expense',
      'DEPOSIT': 'Deposit',
      'WITHDRAWAL': 'Withdrawal',
      'INTEREST_COLLECTION': 'Interest',
      'INTEREST_INCOME': 'Interest Income',
      'PENALTY_COLLECTION': 'Penalty',
      'PENALTY': 'Penalty',
      'COMMISSION_PAYMENT': 'Commission',
      'COMMISSION_PAID': 'Commission Paid',
      'TRANSFER_IN': 'Transfer In',
      'TRANSFER_OUT': 'Transfer Out',
      'OPENING_BALANCE': 'Opening Balance',
      'MANUAL_ENTRY': 'Manual Entry',
      'MIRROR_EMI_PAYMENT': 'Mirror EMI',
      'EXTRA_EMI_PAYMENT': 'Extra EMI'
    };
    return labels[type] || type;
  };

  // Calculate totals
  const totalReceipts = dayBookEntries.reduce((s, e) => s + e.receipt, 0);
  const totalPayments = dayBookEntries.reduce((s, e) => s + e.payment, 0);
  const openingBalance = bankAccounts.reduce((s, b) => s + b.currentBalance, 0) - totalReceipts + totalPayments;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Day Book / Cash Book
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchDayBookData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Opening Balance</p>
            <p className="text-xl font-bold">{formatCurrency(openingBalance)}</p>
          </CardContent>
        </Card>
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
            <p className="text-sm text-gray-500">Closing Balance</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(openingBalance + totalReceipts - totalPayments)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {format(new Date(selectedDate), 'EEEE, dd MMMM yyyy')}
          </CardTitle>
          <p className="text-sm text-gray-500">{dayBookEntries.length} entries</p>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-96">
            <Table>
              <TableHeader className="sticky top-0 bg-white">
                <TableRow>
                  <TableHead className="w-[80px]">Time</TableHead>
                  <TableHead className="w-[100px]">Entry No.</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="text-right w-[120px]">Receipt</TableHead>
                  <TableHead className="text-right w-[120px]">Payment</TableHead>
                  <TableHead className="text-right w-[120px]">Balance</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dayBookEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      No entries for this date
                    </TableCell>
                  </TableRow>
                ) : (
                  dayBookEntries.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">
                        {format(entry.time, 'HH:mm')}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">
                        {entry.entryNumber}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <span className="truncate block">{entry.description}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getReferenceTypeLabel(entry.referenceType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {entry.receipt > 0 ? `+${formatCurrency(entry.receipt)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {entry.payment > 0 ? `-${formatCurrency(entry.payment)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(entry.balance)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleViewEntry(entry)}
                        >
                          <Eye className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Transaction Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Entry Details</DialogTitle>
          </DialogHeader>
          
          {loadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : selectedEntry ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Entry No:</span>
                  <p className="font-mono font-medium">{selectedEntry.entryNumber}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Date & Time:</span>
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

              {/* EMI Breakdown */}
              {(selectedEntry.referenceType === 'EMI_PAYMENT' || 
                selectedEntry.referenceType === 'MIRROR_EMI_PAYMENT' ||
                selectedEntry.referenceType === 'EXTRA_EMI_PAYMENT') && (
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                  <h4 className="font-semibold text-emerald-800 mb-3">EMI Breakdown</h4>
                  <div className="space-y-2">
                    {selectedEntry.lines.map((line, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{line.accountName}</span>
                        <span className={`font-medium ${line.creditAmount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(line.creditAmount || line.debitAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total</span>
                    <span className="text-emerald-700">{formatCurrency(selectedEntry.totalDebit || selectedEntry.totalCredit)}</span>
                  </div>
                </div>
              )}

              {/* Journal Entry Lines */}
              <div>
                <h4 className="font-semibold mb-3">Journal Entry Lines</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
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
                          {line.debitAmount > 0 ? formatCurrency(line.debitAmount) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.creditAmount > 0 ? formatCurrency(line.creditAmount) : '-'}
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
