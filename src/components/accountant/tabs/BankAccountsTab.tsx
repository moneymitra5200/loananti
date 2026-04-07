'use client';

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Eye, BookOpen, Trash2, Landmark, Sparkles, Loader2, CreditCard, RefreshCw, Receipt, Wallet } from 'lucide-react';
import type { BankAccountsTabProps } from './types';

function BankAccountsTabComponent({
  bankAccounts,
  bankTransactions,
  activeLoans,
  secondaryPaymentPages,
  dashboardStats,
  scanningLoans,
  scanResults,
  scanPastLoanTransactions,
  setSelectedBankAccount,
  setShowBankDialog,
  setShowBankDetailDialog,
  setShowLedgerDetailDialog,
  setShowSecondaryPageDialog,
  setSelectedLedgerAccount,
  fetchLedgerTransactions,
  confirmDelete,
  handleDeleteSecondaryPage,
  formatCurrency,
  formatDate,
}: BankAccountsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bank Accounts & Transactions</h1>
          <p className="text-muted-foreground">Real-time bank balance with all loan and EMI transactions</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={scanPastLoanTransactions}
            disabled={scanningLoans}
          >
            {scanningLoans ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Scan Past Transactions
          </Button>
          <Button onClick={() => setShowBankDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Bank Account
          </Button>
        </div>
      </div>

      {/* Scan Results */}
      {scanResults && (
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold text-emerald-800">Scan Results</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-emerald-600">{scanResults.totalLoans}</p>
                <p className="text-xs text-gray-500">Loans Scanned</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{scanResults.totalTransactions}</p>
                <p className="text-xs text-gray-500">Transactions Found</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-green-600">{formatCurrency(scanResults.totalCredits || 0)}</p>
                <p className="text-xs text-gray-500">Total Credits</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-red-600">{formatCurrency(scanResults.totalDebits || 0)}</p>
                <p className="text-xs text-gray-500">Total Debits</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bank Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
          <CardContent className="p-4">
            <p className="text-sm opacity-90">Total Bank Balance</p>
            <p className="text-2xl font-bold">{formatCurrency(dashboardStats.bankBalance)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
          <CardContent className="p-4">
            <p className="text-sm opacity-90">Total Credits</p>
            <p className="text-2xl font-bold">{formatCurrency(bankAccounts.reduce((sum, a) => sum + (a.totalCredits || 0), 0))}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
          <CardContent className="p-4">
            <p className="text-sm opacity-90">Total Debits</p>
            <p className="text-2xl font-bold">{formatCurrency(bankAccounts.reduce((sum, a) => sum + (a.totalDebits || 0), 0))}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
          <CardContent className="p-4">
            <p className="text-sm opacity-90">Active Loans</p>
            <p className="text-2xl font-bold">{activeLoans.length}</p>
            <p className="text-xs opacity-75">{formatCurrency(dashboardStats.totalLoanAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankAccounts.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Landmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bank accounts configured</p>
              <p className="text-sm mt-2">Bank accounts are required to track loan disbursements and EMI collections</p>
              <Button className="mt-4" onClick={() => setShowBankDialog(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Bank Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          bankAccounts.map((account) => (
            <Card key={account.id} className={`cursor-pointer hover:shadow-md transition-all ${account.isDefault ? 'ring-2 ring-primary' : ''}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold">{account.bankName}</h4>
                    <p className="text-sm text-muted-foreground">{account.accountName}</p>
                    {account.company && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {account.company.name}
                      </Badge>
                    )}
                  </div>
                  {account.isDefault && <Badge>Default</Badge>}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Account No:</span>
                    <span className="font-mono text-sm">{account.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Balance:</span>
                    <span className={`font-bold ${account.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(account.currentBalance)}
                    </span>
                  </div>
                  {(account.totalCredits || account.totalDebits) && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600">+ {formatCurrency(account.totalCredits || 0)}</span>
                        <span className="text-red-600">- {formatCurrency(account.totalDebits || 0)}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedBankAccount(account); setShowBankDetailDialog(true); }}>
                    <Eye className="h-3 w-3 mr-1" /> View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedLedgerAccount(account.id); fetchLedgerTransactions(account.id); setShowLedgerDetailDialog(true); }}>
                    <BookOpen className="h-3 w-3 mr-1" /> Ledger
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => confirmDelete('bank', account.id, account.bankName)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Secondary Payment Pages Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Secondary Payment Pages
              </CardTitle>
              <CardDescription>
                Additional payment pages for display. Money is tracked in the default company bank account.
              </CardDescription>
            </div>
            <Button onClick={() => setShowSecondaryPageDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Payment Page
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {secondaryPaymentPages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No secondary payment pages yet</p>
              <p className="text-sm mt-2">Create additional payment pages to show different UPI/QR/Bank details to customers</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {secondaryPaymentPages.map((page) => (
                <Card key={page.id} className="hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{page.name}</h4>
                        <p className="text-sm text-muted-foreground">{page.description || 'No description'}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700" onClick={() => handleDeleteSecondaryPage(page.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2 text-sm">
                      {page.upiId && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">UPI ID:</span>
                          <span className="font-mono">{page.upiId}</span>
                        </div>
                      )}
                      {page.bankName && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bank:</span>
                          <span>{page.bankName}</span>
                        </div>
                      )}
                      {page.accountNumber && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Account:</span>
                          <span className="font-mono">{page.accountNumber}</span>
                        </div>
                      )}
                      {page.qrCodeUrl && (
                        <div className="mt-3">
                          <img src={page.qrCodeUrl} alt="QR Code" className="w-24 h-24 rounded-lg border" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Bank Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" /> Recent Bank Transactions
          </CardTitle>
          <CardDescription>All loan disbursements (debit) and EMI collections (credit)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            {bankTransactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No bank transactions yet</p>
                <p className="text-sm mt-2">Transactions will appear here when loans are disbursed or EMIs are collected</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                      <TableCell>
                        <Badge className={tx.transactionType === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {tx.transactionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tx.referenceType}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {tx.transactionType === 'DEBIT' ? formatCurrency(tx.amount) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {tx.transactionType === 'CREDIT' ? formatCurrency(tx.amount) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {formatCurrency(tx.balanceAfter)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(BankAccountsTabComponent);
