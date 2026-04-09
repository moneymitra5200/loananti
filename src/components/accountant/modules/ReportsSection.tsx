'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Download, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format } from 'date-fns';
import { BankTransaction, Expense, ActiveLoan } from '../types';

interface ReportsSectionProps {
  balanceSheet: any;
  profitLoss: any;
  cashFlow: any;
  extraEMIProfit: any;
  bankTransactions: BankTransaction[];
  expenses: Expense[];
  activeLoans: ActiveLoan[];
  totalExpenses: number;
  totalBankBalance: number;
  onExportCSV: (type: string, data: any[], headers: string[]) => void;
  formatCurrency: (amount: number) => string;
}

export function BalanceSheetSection({ 
  balanceSheet, 
  onExportCSV, 
  formatCurrency 
}: { 
  balanceSheet: any; 
  onExportCSV: (type: string, data: any[], headers: string[]) => void;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Balance Sheet</h2>
        <Button onClick={() => {
          if (balanceSheet?.assets) {
            const data = [
              ['ASSETS', '', ''],
              ...balanceSheet.assets.map((a: any) => [a.accountName, '', a.amount]),
              ['', 'Total Assets', balanceSheet.totalAssets],
              ['', '', ''],
              ['LIABILITIES', '', ''],
              ...balanceSheet.liabilities.map((l: any) => [l.accountName, '', l.amount]),
              ['', 'Total Liabilities', balanceSheet.totalLiabilities],
              ['', '', ''],
              ['EQUITY', '', ''],
              ...balanceSheet.equity.map((e: any) => [e.accountName, '', e.amount]),
              ['', 'Total Equity', balanceSheet.totalEquity]
            ];
            onExportCSV('Balance_Sheet', data, ['Particulars', 'Note', 'Amount (₹)']);
          }
        }}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <Card>
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-700">ASSETS</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {balanceSheet?.assets?.map((asset: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{asset.accountName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(asset.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-green-50 font-bold">
                  <TableCell>Total Assets</TableCell>
                  <TableCell className="text-right text-green-700">
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
                {balanceSheet?.liabilities?.length > 0 ? (
                  balanceSheet.liabilities.map((liab: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{liab.accountName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(liab.amount)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="text-gray-500">No liabilities</TableCell>
                    <TableCell className="text-right">₹0.00</TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-gray-50">
                  <TableCell className="font-medium">Total Liabilities</TableCell>
                  <TableCell className="text-right">{formatCurrency(balanceSheet?.totalLiabilities || 0)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={2} className="bg-gray-100 font-semibold text-center">
                    EQUITY
                  </TableCell>
                </TableRow>
                {balanceSheet?.equity?.map((eq: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{eq.accountName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(eq.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50">
                  <TableCell className="font-medium">Total Equity</TableCell>
                  <TableCell className="text-right">{formatCurrency(balanceSheet?.totalEquity || 0)}</TableCell>
                </TableRow>
                <TableRow className="bg-red-50 font-bold">
                  <TableCell>Total Liabilities & Equity</TableCell>
                  <TableCell className="text-right text-red-700">
                    {formatCurrency((balanceSheet?.totalLiabilities || 0) + (balanceSheet?.totalEquity || 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ProfitLossSection({ 
  profitLoss, 
  expenses, 
  activeLoans,
  totalExpenses,
  onExportCSV, 
  formatCurrency 
}: { 
  profitLoss: any;
  expenses: Expense[];
  activeLoans: ActiveLoan[];
  totalExpenses: number;
  onExportCSV: (type: string, data: any[], headers: string[]) => void;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Profit & Loss Statement</h2>
        <Button onClick={() => {
          if (profitLoss) {
            const data = [
              ['INCOME', ''],
              ...(profitLoss.income || []).map((i: any) => [i.name, i.amount]),
              ['Total Income', profitLoss.totalIncome || 0],
              ['', ''],
              ['EXPENSES', ''],
              ...(profitLoss.expenses || []).map((e: any) => [e.name, e.amount]),
              ['Total Expenses', profitLoss.totalExpenses || 0],
              ['', ''],
              ['NET PROFIT/LOSS', profitLoss.netProfit || 0]
            ];
            onExportCSV('Profit_Loss', data, ['Particulars', 'Amount (₹)']);
          }
        }}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

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
                {profitLoss?.income?.length > 0 ? (
                  profitLoss.income.map((inc: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{inc.name}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(inc.amount)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="text-gray-500">EMI Interest Income</TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(activeLoans.reduce((sum, l) => 
                        sum + l.emiSchedules.reduce((s, e) => s + (e.totalAmount - e.paidAmount) * (l.interestRate / 100 / 12), 0), 0
                      ))}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-green-50 font-bold">
                  <TableCell>Total Income</TableCell>
                  <TableCell className="text-right text-green-700">
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
                {expenses.length > 0 ? (
                  expenses.slice(0, 10).map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium">{exp.description}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(exp.amount)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="text-gray-500">No expenses recorded</TableCell>
                    <TableCell className="text-right">₹0.00</TableCell>
                  </TableRow>
                )}
                <TableRow className="bg-red-50 font-bold">
                  <TableCell>Total Expenses</TableCell>
                  <TableCell className="text-right text-red-700">
                    {formatCurrency(profitLoss?.totalExpenses || totalExpenses)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Net Profit/Loss */}
      <Card className={`border-2 ${((profitLoss?.netProfit || 0) >= 0) ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(profitLoss?.netProfit || 0) >= 0 ? (
                <TrendingUp className="h-8 w-8 text-green-600" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-600" />
              )}
              <div>
                <p className="text-sm text-gray-600">Net {(profitLoss?.netProfit || 0) >= 0 ? 'Profit' : 'Loss'}</p>
                <p className={`text-3xl font-bold ${(profitLoss?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(profitLoss?.netProfit || 0))}
                </p>
              </div>
            </div>
            <Badge variant={(profitLoss?.netProfit || 0) >= 0 ? 'default' : 'destructive'} className="text-lg px-4 py-2">
              {(profitLoss?.netProfit || 0) >= 0 ? 'PROFIT' : 'LOSS'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CashFlowSection({ 
  cashFlow, 
  extraEMIProfit,
  bankTransactions,
  totalExpenses,
  totalBankBalance,
  onExportCSV, 
  formatCurrency 
}: { 
  cashFlow: any;
  extraEMIProfit: any;
  bankTransactions: BankTransaction[];
  totalExpenses: number;
  totalBankBalance: number;
  onExportCSV: (type: string, data: any[], headers: string[]) => void;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Cash Flow Statement</h2>
        <Button onClick={() => {
          if (cashFlow) {
            const data = [
              ['CASH FLOW FROM OPERATING ACTIVITIES', ''],
              ...(cashFlow.operating || []).map((o: any) => [o.description, o.amount]),
              ['Net Cash from Operating', cashFlow.netOperating || 0],
              ['', ''],
              ['CASH FLOW FROM INVESTING ACTIVITIES', ''],
              ...(cashFlow.investing || []).map((i: any) => [i.description, i.amount]),
              ['Net Cash from Investing', cashFlow.netInvesting || 0],
              ['', ''],
              ['CASH FLOW FROM FINANCING ACTIVITIES', ''],
              ...(cashFlow.financing || []).map((f: any) => [f.description, f.amount]),
              ['Net Cash from Financing', cashFlow.netFinancing || 0],
              ['', ''],
              ['Net Change in Cash', cashFlow.netChange || 0],
              ['Opening Cash Balance', cashFlow.openingBalance || 0],
              ['Closing Cash Balance', cashFlow.closingBalance || totalBankBalance]
            ];
            onExportCSV('Cash_Flow', data, ['Particulars', 'Amount (₹)']);
          }
        }}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Operating Activities */}
        <Card>
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-blue-700">Cash Flow from Operating Activities</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">EMI Collections</TableCell>
                  <TableCell className="text-right text-green-600">
                    +{formatCurrency(bankTransactions.filter(t => t.referenceType === 'EMI_PAYMENT').reduce((s, t) => s + t.amount, 0))}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Interest Received</TableCell>
                  <TableCell className="text-right text-green-600">
                    +{formatCurrency(bankTransactions.filter(t => t.referenceType === 'INTEREST').reduce((s, t) => s + t.amount, 0))}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Expenses Paid</TableCell>
                  <TableCell className="text-right text-red-600">
                    -{formatCurrency(totalExpenses)}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-blue-50 font-bold">
                  <TableCell>Net Cash from Operating Activities</TableCell>
                  <TableCell className="text-right text-blue-700">
                    {formatCurrency(cashFlow?.netOperating || 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Mirror Loan Profit Section - Company Specific */}
        {extraEMIProfit && extraEMIProfit.companyType === 'PROFIT_CENTER' && extraEMIProfit.totalProfitReceived > 0 && (
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="bg-purple-50">
              <CardTitle className="text-purple-700 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Extra EMI Profit (Company 3 - Cash Book)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Mirror Loans with Extra EMIs</TableCell>
                    <TableCell className="text-right">{extraEMIProfit.mirrorLoansWithExtraEMIs || 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Total Extra EMIs (Potential)</TableCell>
                    <TableCell className="text-right">{extraEMIProfit.totalExtraEMIs || 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Extra EMIs Paid</TableCell>
                    <TableCell className="text-right">{extraEMIProfit.totalExtraEMIsPaid || 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Potential Profit</TableCell>
                    <TableCell className="text-right text-blue-600">{formatCurrency(extraEMIProfit.totalPotentialProfit || 0)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-purple-50 font-bold">
                    <TableCell>Profit Received (Actual)</TableCell>
                    <TableCell className="text-right text-purple-700 text-lg">
                      {formatCurrency(extraEMIProfit.totalProfitReceived || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              {extraEMIProfit.profitDetails && extraEMIProfit.profitDetails.length > 0 && (
                <div className="p-4 border-t">
                  <p className="text-sm text-gray-500 mb-2">Profit Breakdown:</p>
                  <div className="max-h-40 overflow-y-auto">
                    {extraEMIProfit.profitDetails.map((detail: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm py-1 border-b">
                        <span className="text-gray-600">{detail.loanNo}</span>
                        <span className="font-medium text-green-600">{formatCurrency(detail.profitAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Mirror Interest Income - For Company 1/2 */}
        {extraEMIProfit && extraEMIProfit.companyType === 'MIRROR_COMPANY' && extraEMIProfit.totalMirrorInterestReceived > 0 && (
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="bg-emerald-50">
              <CardTitle className="text-emerald-700 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Mirror Interest Income (Operational Company)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Active Mirror Loans</TableCell>
                    <TableCell className="text-right">{extraEMIProfit.activeMirrorLoans || 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Completed Mirror Loans</TableCell>
                    <TableCell className="text-right">{extraEMIProfit.completedMirrorLoans || 0}</TableCell>
                  </TableRow>
                  <TableRow className="bg-emerald-50 font-bold">
                    <TableCell>Total Mirror Interest Received</TableCell>
                    <TableCell className="text-right text-emerald-700 text-lg">
                      {formatCurrency(extraEMIProfit.totalMirrorInterestReceived || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              {extraEMIProfit.transactions && extraEMIProfit.transactions.length > 0 && (
                <div className="p-4 border-t">
                  <p className="text-sm text-gray-500 mb-2">Recent Interest Transactions:</p>
                  <div className="max-h-40 overflow-y-auto">
                    {extraEMIProfit.transactions.slice(0, 10).map((txn: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm py-1 border-b">
                        <span className="text-gray-600">{txn.description}</span>
                        <span className="font-medium text-green-600">{formatCurrency(txn.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cash Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Opening Balance</p>
                <p className="text-xl font-bold">{formatCurrency(cashFlow?.openingBalance || 0)}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-500">Net Change</p>
                <p className={`text-xl font-bold ${(cashFlow?.netChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(cashFlow?.netChange || 0) >= 0 ? '+' : ''}{formatCurrency(cashFlow?.netChange || 0)}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-500">Closing Balance</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalBankBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ReportsSection(props: ReportsSectionProps) {
  return null; // This component is just for re-exporting the sub-components
}
