'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, Landmark, Trash2, Eye, ArrowUpRight, ArrowDownRight, Calendar, Hash, FileText, User } from 'lucide-react';
import { BankAccount, BankTransaction } from '../types';
import { format } from 'date-fns';

interface BankSectionProps {
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  onAddBank: () => void;
  onDeleteBank: (bank: BankAccount) => void;
  formatCurrency: (amount: number) => string;
  formatDateShort: (date: Date | string) => string;
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

export default function BankSection({ 
  bankAccounts, 
  bankTransactions, 
  onAddBank, 
  onDeleteBank,
  formatCurrency, 
  formatDateShort 
}: BankSectionProps) {
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleViewTransaction = async (txn: BankTransaction) => {
    setLoadingDetail(true);
    setShowDetailDialog(true);
    
    try {
      // Fetch journal entry details for this transaction
      const res = await fetch(`/api/accounting/journal-entry-by-reference?referenceType=${txn.referenceType}&referenceId=${txn.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTransaction(data.entry);
      } else {
        // If no journal entry found, show basic transaction info
        setSelectedTransaction({
          id: txn.id,
          entryNumber: 'N/A',
          entryDate: new Date(txn.transactionDate),
          referenceType: txn.referenceType,
          narration: txn.description,
          totalDebit: txn.transactionType === 'DEBIT' ? txn.amount : 0,
          totalCredit: txn.transactionType === 'CREDIT' ? txn.amount : 0,
          lines: [
            {
              accountCode: '1400',
              accountName: 'Bank Account',
              accountType: 'ASSET',
              debitAmount: txn.transactionType === 'CREDIT' ? txn.amount : 0,
              creditAmount: txn.transactionType === 'DEBIT' ? txn.amount : 0,
              narration: txn.description
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching transaction details:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getReferenceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'LOAN_DISBURSEMENT': 'Loan Disbursement',
      'EMI_PAYMENT': 'EMI Payment',
      'PROCESSING_FEE': 'Processing Fee',
      'EXPENSE': 'Expense',
      'DEPOSIT': 'Deposit',
      'WITHDRAWAL': 'Withdrawal',
      'INTEREST_INCOME': 'Interest Income',
      'PENALTY': 'Penalty',
      'COMMISSION_PAID': 'Commission Paid',
      'TRANSFER_IN': 'Transfer In',
      'TRANSFER_OUT': 'Transfer Out',
      'OPENING_BALANCE': 'Opening Balance',
      'MIRROR_EMI_PAYMENT': 'Mirror EMI Payment',
      'EXTRA_EMI_PAYMENT': 'Extra EMI Payment'
    };
    return labels[type] || type;
  };

  // Group transactions by date
  const groupedTransactions = bankTransactions.reduce((groups, txn) => {
    const date = format(new Date(txn.transactionDate), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(txn);
    return groups;
  }, {} as Record<string, BankTransaction[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Bank Accounts</h2>
        <Button onClick={onAddBank}>
          <Plus className="h-4 w-4 mr-2" />
          Add Bank Account
        </Button>
      </div>

      {/* Bank Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankAccounts.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-gray-500">
              <Landmark className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No bank accounts added yet</p>
              <Button className="mt-4" onClick={onAddBank}>
                Add Bank Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          bankAccounts.map((bank) => (
            <Card key={bank.id} className={`relative ${bank.isDefault ? 'border-2 border-emerald-500' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Landmark className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{bank.bankName}</p>
                      <p className="text-sm text-gray-500">****{bank.accountNumber.slice(-4)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {bank.isDefault && (
                      <Badge className="bg-emerald-500">Default</Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onDeleteBank(bank)}
                      title="Delete bank account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current Balance</span>
                    <span className="font-bold text-lg">{formatCurrency(bank.currentBalance)}</span>
                  </div>
                  {bank.upiId && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">UPI ID</span>
                      <span>{bank.upiId}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Transactions</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600 border-green-200">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              {formatCurrency(bankTransactions.filter(t => t.transactionType === 'CREDIT').reduce((s, t) => s + t.amount, 0))}
            </Badge>
            <Badge variant="outline" className="text-red-600 border-red-200">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              {formatCurrency(bankTransactions.filter(t => t.transactionType === 'DEBIT').reduce((s, t) => s + t.amount, 0))}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {Object.keys(groupedTransactions).length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No transactions found
              </div>
            ) : (
              Object.entries(groupedTransactions)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([date, txns]) => (
                  <div key={date} className="mb-4">
                    <div className="sticky top-0 bg-gray-50 px-2 py-1 text-sm font-medium text-gray-600 border-b">
                      {format(new Date(date), 'EEEE, dd MMMM yyyy')}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="w-[100px]">Time</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[120px]">Type</TableHead>
                          <TableHead className="text-right w-[120px]">Amount</TableHead>
                          <TableHead className="text-right w-[120px]">Balance</TableHead>
                          <TableHead className="w-[80px]">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {txns.map((txn) => (
                          <TableRow key={txn.id} className="hover:bg-gray-50">
                            <TableCell className="font-mono text-sm">
                              {format(new Date(txn.transactionDate), 'HH:mm')}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm truncate max-w-[200px]">
                                  {txn.description}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {getReferenceTypeLabel(txn.referenceType)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={txn.transactionType === 'CREDIT' ? 'default' : 'destructive'} 
                                className="text-xs"
                              >
                                {txn.transactionType === 'CREDIT' ? 'IN' : 'OUT'}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right font-medium ${txn.transactionType === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                              {txn.transactionType === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(txn.balanceAfter)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleViewTransaction(txn)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                              </Button>
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

      {/* Transaction Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transaction Details
            </DialogTitle>
          </DialogHeader>
          
          {loadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : selectedTransaction ? (
            <div className="space-y-4">
              {/* Transaction Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Entry No:</span>
                  <span className="font-mono font-medium">{selectedTransaction.entryNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Date:</span>
                  <span className="font-medium">{format(new Date(selectedTransaction.entryDate), 'dd MMM yyyy HH:mm')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">Type:</span>
                <Badge variant="outline">{getReferenceTypeLabel(selectedTransaction.referenceType)}</Badge>
              </div>

              {selectedTransaction.narration && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">{selectedTransaction.narration}</p>
                </div>
              )}

              <Separator />

              {/* Principal + Interest Breakdown for EMI */}
              {(selectedTransaction.referenceType === 'EMI_PAYMENT' || 
                selectedTransaction.referenceType === 'MIRROR_EMI_PAYMENT' ||
                selectedTransaction.referenceType === 'EXTRA_EMI_PAYMENT') && (
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                  <h4 className="font-semibold text-emerald-800 mb-3">EMI Breakdown</h4>
                  <div className="space-y-2">
                    {selectedTransaction.lines.map((line, idx) => (
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
                    <span>Total EMI Amount</span>
                    <span className="text-emerald-700">{formatCurrency(selectedTransaction.totalDebit || selectedTransaction.totalCredit)}</span>
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
                    {selectedTransaction.lines.map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{line.accountName}</span>
                            <span className="text-xs text-gray-500">{line.accountCode} - {line.accountType}</span>
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
                      <TableCell className="text-right">{formatCurrency(selectedTransaction.totalDebit)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedTransaction.totalCredit)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Double Entry Validation */}
              <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                <span className="text-sm text-blue-700">Double-Entry Balanced</span>
                <Badge className="bg-green-500">
                  {Math.abs(selectedTransaction.totalDebit - selectedTransaction.totalCredit) < 0.01 ? '✓ Valid' : '⚠ Unbalanced'}
                </Badge>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
