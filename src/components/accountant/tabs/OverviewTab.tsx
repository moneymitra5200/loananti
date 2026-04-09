'use client';

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Building2, TrendingUp, TrendingDown, CreditCard, Landmark,
  Wallet, Calculator, PieChart, Plus, Receipt, FileSpreadsheet,
  FileText, ChevronRight
} from 'lucide-react';
import type { OverviewTabProps } from './types';

function OverviewTabComponent({
  dashboardStats,
  activeLoans,
  journalEntries,
  profitAndLoss,
  companies,
  selectedCompanyIds,
  setActiveSection,
  setSelectedEntry,
  setShowJournalDialog,
  setShowExpenseDialog,
  setShowBankDialog,
  setShowEntryDetailDialog,
  formatCurrency,
  formatDate,
}: OverviewTabProps) {
  // Get selected company names for display
  const selectedCompanyNames = selectedCompanyIds.length > 0
    ? companies.filter(c => selectedCompanyIds.includes(c.id)).map(c => c.name).join(', ')
    : 'All Companies';

  return (
    <div className="space-y-6">
      {/* Company Selection Banner */}
      {selectedCompanyIds.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-800">Viewing:</span>
                <Badge className="bg-blue-100 text-blue-800">{selectedCompanyNames}</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSection('overview')}
                className="ml-auto text-gray-500 hover:text-gray-700"
              >
                Clear Filter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Assets</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardStats.totalAssets)}</p>
              </div>
              <Building2 className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Net Profit</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardStats.netProfit)}</p>
              </div>
              <TrendingUp className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveSection('loans')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Active Loans</p>
                <p className="text-2xl font-bold">{dashboardStats.activeLoanCount}</p>
              </div>
              <CreditCard className="h-8 w-8 opacity-80" />
            </div>
            <p className="text-xs mt-2 opacity-75">{formatCurrency(dashboardStats.totalLoanAmount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Bank Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardStats.bankBalance)}</p>
              </div>
              <Landmark className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveSection('loans')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Loan Outstanding</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardStats.loanOutstanding)}</p>
              </div>
              <Wallet className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Monthly EMI Collection</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardStats.monthlyEmiCollection)}</p>
              </div>
              <Calculator className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Net Income</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardStats.totalIncome - dashboardStats.totalExpenses)}</p>
              </div>
              <PieChart className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => setActiveSection('loans')}>
              <CreditCard className="h-5 w-5" />
              <span className="text-xs">View Loans</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => { setActiveSection('journal'); setShowJournalDialog(true); }}>
              <Plus className="h-5 w-5" />
              <span className="text-xs">New Journal Entry</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => { setActiveSection('expenses'); setShowExpenseDialog(true); }}>
              <Receipt className="h-5 w-5" />
              <span className="text-xs">Record Expense</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => { setActiveSection('bank'); setShowBankDialog(true); }}>
              <Landmark className="h-5 w-5" />
              <span className="text-xs">Add Bank Account</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => setActiveSection('trial-balance')}>
              <FileSpreadsheet className="h-5 w-5" />
              <span className="text-xs">View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Active Loans Preview */}
      {activeLoans.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-purple-500" /> Recent Active Loans
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveSection('loans')}>
                View All <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {activeLoans.slice(0, 5).map((loan) => (
                  <div
                    key={loan.id}
                    className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => setActiveSection('loans')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${loan.loanType === 'ONLINE' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                        <CreditCard className={`h-5 w-5 ${loan.loanType === 'ONLINE' ? 'text-blue-600' : 'text-purple-600'}`} />
                      </div>
                      <div>
                        <p className="font-medium">{loan.identifier}</p>
                        <p className="text-sm text-muted-foreground">{loan.customer?.name || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(loan.approvedAmount)}</p>
                      <Badge className={loan.loanType === 'ONLINE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                        {loan.loanType}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" /> Income Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {profitAndLoss?.income?.map((item: any) => (
                  <div key={item.accountCode} className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <div>
                      <p className="font-medium text-sm">{item.accountName}</p>
                      <p className="text-xs text-muted-foreground">{item.accountCode}</p>
                    </div>
                    <span className="font-bold text-green-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between items-center p-2 bg-green-100 dark:bg-green-900/30 rounded font-bold">
                  <span>Total Income</span>
                  <span className="text-green-600">{formatCurrency(dashboardStats.totalIncome)}</span>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" /> Expense Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {profitAndLoss?.expenses?.map((item: any) => (
                  <div key={item.accountCode} className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <div>
                      <p className="font-medium text-sm">{item.accountName}</p>
                      <p className="text-xs text-muted-foreground">{item.accountCode}</p>
                    </div>
                    <span className="font-bold text-red-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between items-center p-2 bg-red-100 dark:bg-red-900/30 rounded font-bold">
                  <span>Total Expenses</span>
                  <span className="text-red-600">{formatCurrency(dashboardStats.totalExpenses)}</span>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setActiveSection('journal')}>
              View All <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {journalEntries.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => { setSelectedEntry(entry); setShowEntryDetailDialog(true); }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{entry.entryNumber}</p>
                      <p className="text-sm text-muted-foreground">{entry.narration}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(entry.totalDebit)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(entry.entryDate)}</p>
                  </div>
                </div>
              ))}
              {journalEntries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No journal entries yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(OverviewTabComponent);
