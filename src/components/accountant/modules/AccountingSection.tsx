'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RefreshCw, BookMarked, Scale, CheckCircle2, XCircle, FileSpreadsheet, BookOpen, CreditCard, Edit2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ChartOfAccountItem, JournalEntry, TrialBalanceItem, LedgerEntry, ActiveLoan, TrialBalanceSummary } from '../types';

// ============================================
// CHART OF ACCOUNTS SECTION
// ============================================

interface ChartOfAccountsSectionProps {
  chartOfAccounts: ChartOfAccountItem[];
  onRefresh: () => void;
  onSelectAccount: (accountId: string) => void;
  formatCurrency: (amount: number) => string;
}

export function ChartOfAccountsSection({ 
  chartOfAccounts, 
  onRefresh, 
  onSelectAccount, 
  formatCurrency 
}: ChartOfAccountsSectionProps) {
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccountItem | null>(null);
  const [openingBalance, setOpeningBalance] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSetOpeningBalance = (account: ChartOfAccountItem) => {
    setSelectedAccount(account);
    setOpeningBalance(String(account.openingBalance || 0));
    setShowBalanceDialog(true);
  };

  const handleSaveOpeningBalance = async () => {
    if (!selectedAccount) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/accounting/chart-of-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAccount.id,
          openingBalance: parseFloat(openingBalance) || 0
        })
      });

      if (res.ok) {
        toast.success('Opening balance set successfully');
        setShowBalanceDialog(false);
        onRefresh();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to set opening balance');
      }
    } catch (error) {
      toast.error('Failed to set opening balance');
    } finally {
      setSaving(false);
    }
  };

  const groupedAccounts = chartOfAccounts.reduce((acc, account) => {
    const type = account.accountType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(account);
    return acc;
  }, {} as Record<string, typeof chartOfAccounts>);

  const accountTypeColors: Record<string, string> = {
    ASSET: 'bg-green-50 border-green-200',
    LIABILITY: 'bg-red-50 border-red-200',
    INCOME: 'bg-blue-50 border-blue-200',
    EXPENSE: 'bg-orange-50 border-orange-200',
    EQUITY: 'bg-purple-50 border-purple-200',
  };

  const accountTypeLabels: Record<string, string> = {
    ASSET: 'Assets',
    LIABILITY: 'Liabilities',
    INCOME: 'Income',
    EXPENSE: 'Expenses',
    EQUITY: 'Equity (Capital)',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Chart of Accounts</h2>
          <p className="text-sm text-gray-500">Double-Entry Accounting - Set opening balances for your capital</p>
        </div>
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Account Type Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(accountTypeLabels).map(([type, label]) => {
          const accounts = groupedAccounts[type] || [];
          const totalBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
          return (
            <Card key={type} className={accountTypeColors[type]}>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-gray-600">{label}</p>
                <p className="text-lg font-bold">{accounts.length} Accounts</p>
                <p className="text-sm text-gray-600">{formatCurrency(totalBalance)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Accounts by Type */}
      {Object.entries(groupedAccounts).map(([type, accounts]) => (
        <Card key={type} className={accountTypeColors[type]}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookMarked className="h-5 w-5" />
              {accountTypeLabels[type] || type}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Opening Balance</TableHead>
                  <TableHead className="text-right">Current Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell className="font-mono font-medium">{account.accountCode}</TableCell>
                    <TableCell className="font-medium">{account.accountName}</TableCell>
                    <TableCell className="text-gray-500">{account.description || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(account.openingBalance || 0)}
                    </TableCell>
                    <TableCell 
                      className="text-right font-bold cursor-pointer hover:text-blue-600"
                      onClick={() => onSelectAccount(account.id)}
                    >
                      {formatCurrency(Math.abs(account.currentBalance))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.isActive ? 'default' : 'secondary'}>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {account.isSystemAccount && (
                        <Badge variant="outline" className="ml-1">System</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetOpeningBalance(account);
                        }}
                        title="Set Opening Balance"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Balance
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {/* Opening Balance Dialog */}
      <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-500" />
              Set Opening Balance
            </DialogTitle>
            <DialogDescription>
              Set the opening balance for this account. This represents your initial capital investment.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAccount && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Account</p>
                <p className="font-medium">{selectedAccount.accountCode} - {selectedAccount.accountName}</p>
                <p className="text-xs text-gray-400 mt-1">Type: {selectedAccount.accountType}</p>
              </div>
              
              <div>
                <Label>Opening Balance Amount</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <Input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    placeholder="0"
                    className="pl-8"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {selectedAccount.accountType === 'ASSET' 
                    ? '💰 For assets like Cash, Bank - enter the amount you have'
                    : selectedAccount.accountType === 'LIABILITY'
                    ? '📊 For liabilities - enter the amount you owe'
                    : '📈 This will be recorded as your capital/equity'}
                </p>
              </div>

              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <p className="text-sm text-emerald-700">
                  <strong>Example:</strong> If you have ₹5,000 in cash, set "1101 - Cash in Hand" opening balance to 5000.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBalanceDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveOpeningBalance} disabled={saving}>
              {saving ? 'Saving...' : 'Save Opening Balance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// LEDGER VIEW SECTION
// ============================================

interface LedgerViewSectionProps {
  chartOfAccounts: ChartOfAccountItem[];
  activeLoans: ActiveLoan[];
  selectedAccountId: string;
  selectedLoanId: string;
  accountLedger: LedgerEntry[];
  loanLedger: LedgerEntry[];
  onSelectAccount: (accountId: string) => void;
  onSelectLoan: (loanId: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

export function LedgerViewSection({ 
  chartOfAccounts, 
  activeLoans, 
  selectedAccountId, 
  selectedLoanId,
  accountLedger,
  loanLedger,
  onSelectAccount, 
  onSelectLoan,
  formatCurrency, 
  formatDate 
}: LedgerViewSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Ledger View</h2>
          <p className="text-sm text-gray-500">View account transactions and loan-wise entries</p>
        </div>
      </div>

      {/* Account Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Account</Label>
              <Select value={selectedAccountId} onValueChange={onSelectAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {chartOfAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.accountCode} - {account.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Loan (Optional - Filter by Loan)</Label>
              <Select value={selectedLoanId} onValueChange={onSelectLoan}>
                <SelectTrigger>
                  <SelectValue placeholder="All Loans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Loans</SelectItem>
                  {activeLoans.map((loan) => (
                    <SelectItem key={loan.id} value={loan.id}>
                      {loan.applicationNo} - {loan.customer?.name || 'N/A'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Ledger */}
      {selectedAccountId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Account Ledger
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Entry #</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountLedger.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No entries found for this account
                      </TableCell>
                    </TableRow>
                  ) : (
                    accountLedger.map((entry, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">{formatDate(entry.date)}</TableCell>
                        <TableCell className="font-mono">{entry.entryNumber}</TableCell>
                        <TableCell className="max-w-xs truncate">{entry.narration}</TableCell>
                        <TableCell className="text-right text-red-600">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${entry.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(entry.balance))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loan-Specific Ledger */}
      {selectedLoanId && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
              <CreditCard className="h-5 w-5" />
              Loan-Specific Ledger
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Entry #</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loanLedger.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No journal entries found for this loan
                      </TableCell>
                    </TableRow>
                  ) : (
                    loanLedger.map((entry, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">{formatDate(entry.date)}</TableCell>
                        <TableCell className="font-mono">{entry.entryNumber}</TableCell>
                        <TableCell>{entry.referenceType || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">{entry.narration}</TableCell>
                        <TableCell className="text-right text-red-600">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// TRIAL BALANCE SECTION
// ============================================

interface TrialBalanceSectionProps {
  trialBalance: TrialBalanceItem[];
  trialBalanceSummary: TrialBalanceSummary;
  formatCurrency: (amount: number) => string;
}

export function TrialBalanceSection({ 
  trialBalance, 
  trialBalanceSummary, 
  formatCurrency 
}: TrialBalanceSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Trial Balance</h2>
          <p className="text-sm text-gray-500">Verify all debits equal credits</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={trialBalanceSummary.isBalanced ? 'default' : 'destructive'} className="text-sm px-4 py-1">
            {trialBalanceSummary.isBalanced ? (
              <><CheckCircle2 className="h-4 w-4 mr-1 inline" /> Balanced</>
            ) : (
              <><XCircle className="h-4 w-4 mr-1 inline" /> Not Balanced</>
            )}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-red-50">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Debits</p>
            <p className="text-2xl font-bold text-red-700">{formatCurrency(trialBalanceSummary.totalDebits)}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Credits</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(trialBalanceSummary.totalCredits)}</p>
          </CardContent>
        </Card>
        <Card className={trialBalanceSummary.isBalanced ? 'bg-blue-50' : 'bg-orange-50'}>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Difference</p>
            <p className={`text-2xl font-bold ${trialBalanceSummary.isBalanced ? 'text-blue-700' : 'text-orange-700'}`}>
              {formatCurrency(Math.abs(trialBalanceSummary.totalDebits - trialBalanceSummary.totalCredits))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trial Balance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Trial Balance Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Debit Balance</TableHead>
                <TableHead className="text-right">Credit Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trialBalance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    No accounts found. Please initialize chart of accounts.
                  </TableCell>
                </TableRow>
              ) : (
                trialBalance.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono">{item.accountCode}</TableCell>
                    <TableCell className="font-medium">{item.accountName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.accountType}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      {item.debitBalance > 0 ? formatCurrency(item.debitBalance) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {item.creditBalance > 0 ? formatCurrency(item.creditBalance) : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {/* Totals Row */}
              {trialBalance.length > 0 && (
                <TableRow className="bg-gray-100 font-bold">
                  <TableCell colSpan={3}>TOTAL</TableCell>
                  <TableCell className="text-right text-red-700">
                    {formatCurrency(trialBalanceSummary.totalDebits)}
                  </TableCell>
                  <TableCell className="text-right text-green-700">
                    {formatCurrency(trialBalanceSummary.totalCredits)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// JOURNAL ENTRIES SECTION
// ============================================

interface JournalEntriesSectionProps {
  journalEntries: JournalEntry[];
  onRefresh: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

export function JournalEntriesSection({ 
  journalEntries, 
  onRefresh, 
  formatCurrency, 
  formatDate 
}: JournalEntriesSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Journal Entries</h2>
          <p className="text-sm text-gray-500">All double-entry journal entries (automatic + manual)</p>
        </div>
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Entry Type Legend */}
      <div className="flex items-center gap-4 text-sm">
        <Badge variant="default" className="bg-blue-500">Auto Entry</Badge>
        <Badge variant="secondary">Manual Entry</Badge>
        <Badge variant="outline">Reversed</Badge>
      </div>

      {/* Journal Entries List */}
      <div className="space-y-4">
        {journalEntries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No journal entries found</p>
              <p className="text-sm mt-2">Entries are created automatically when EMI payments are made</p>
            </CardContent>
          </Card>
        ) : (
          journalEntries.map((entry) => (
            <Card key={entry.id} className={`${entry.isReversed ? 'opacity-50' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-base font-mono">{entry.entryNumber}</CardTitle>
                      <p className="text-sm text-gray-500">{formatDate(entry.entryDate)}</p>
                    </div>
                    {entry.isAutoEntry && <Badge className="bg-blue-500">Auto</Badge>}
                    {entry.isReversed && <Badge variant="destructive">Reversed</Badge>}
                    {entry.isApproved && <Badge variant="default">Approved</Badge>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{entry.referenceType || 'Manual'}</p>
                  </div>
                </div>
                {entry.narration && (
                  <p className="text-sm text-gray-600 mt-2">{entry.narration}</p>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entry.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div>
                            <span className="font-mono text-xs text-gray-500">{line.account.accountCode}</span>
                            <span className="ml-2 font-medium">{line.account.accountName}</span>
                          </div>
                          {line.narration && (
                            <p className="text-xs text-gray-500 mt-1">{line.narration}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          {line.debitAmount > 0 ? formatCurrency(line.debitAmount) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {line.creditAmount > 0 ? formatCurrency(line.creditAmount) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals */}
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right text-red-700">{formatCurrency(entry.totalDebit)}</TableCell>
                      <TableCell className="text-right text-green-700">{formatCurrency(entry.totalCredit)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default function AccountingSection() {
  return null; // This component is just for re-exporting the sub-components
}
