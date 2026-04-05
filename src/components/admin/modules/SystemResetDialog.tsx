'use client';

import { memo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, XCircle, CheckCircle, RefreshCw, Loader2, Shield, FileText, Wallet, Landmark, Users, Activity, CreditCard, Calculator, BookOpen } from 'lucide-react';

interface ResetOptions {
  loanApplications: boolean;
  emiSchedules: boolean;
  offlineLoans: boolean;
  bankAccounts: boolean;
  transactions: boolean;
  credits: boolean;
  customers: boolean;
  auditLogs: boolean;
  notifications: boolean;
  documents: boolean;
  // Accounting Portal Options
  chartOfAccounts: boolean;
  financialYears: boolean;
  journalEntries: boolean;
  expenses: boolean;
  gstConfig: boolean;
  cashBook: boolean;
  accountingSettings: boolean;
  fixedAssets: boolean;
  allAccounting: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset: (options: ResetOptions) => void;
  resetting: boolean;
}

const defaultOptions: ResetOptions = {
  loanApplications: true,
  emiSchedules: true,
  offlineLoans: true,
  bankAccounts: true,
  transactions: true,
  credits: true,
  customers: true,
  auditLogs: true,
  notifications: true,
  documents: true,
  // Accounting Portal - ALL TRUE by default
  chartOfAccounts: true,
  financialYears: true,
  journalEntries: true,
  expenses: true,
  gstConfig: true,
  cashBook: true,
  accountingSettings: true,
  fixedAssets: true,
  allAccounting: true,
};

function SystemResetDialog({
  open,
  onOpenChange,
  onReset,
  resetting
}: Props) {
  const [resetOptions, setResetOptions] = useState<ResetOptions>(defaultOptions);
  const [resetConfirmText, setResetConfirmText] = useState('');

  const handleSelectAll = (checked: boolean) => {
    setResetOptions({
      loanApplications: checked,
      emiSchedules: checked,
      offlineLoans: checked,
      bankAccounts: checked,
      transactions: checked,
      credits: checked,
      customers: checked,
      auditLogs: checked,
      notifications: checked,
      documents: checked,
      // Accounting
      chartOfAccounts: checked,
      financialYears: checked,
      journalEntries: checked,
      expenses: checked,
      gstConfig: checked,
      cashBook: checked,
      accountingSettings: checked,
      fixedAssets: checked,
      allAccounting: checked,
    });
  };

  const handleOptionChange = (key: keyof ResetOptions, checked: boolean) => {
    setResetOptions(prev => ({ ...prev, [key]: checked }));
  };

  // Handle "All Accounting" master toggle
  const handleAllAccountingChange = (checked: boolean) => {
    setResetOptions(prev => ({
      ...prev,
      allAccounting: checked,
      chartOfAccounts: checked,
      financialYears: checked,
      journalEntries: checked,
      expenses: checked,
      gstConfig: checked,
      cashBook: checked,
      accountingSettings: checked,
      fixedAssets: checked,
    }));
  };

  const handleReset = () => {
    if (resetConfirmText !== 'RESET_SYSTEM') return;
    onReset(resetOptions);
    setResetConfirmText('');
  };

  const handleClose = () => {
    onOpenChange(false);
    setResetConfirmText('');
    setResetOptions(defaultOptions);
  };

  const selectedCount = Object.values(resetOptions).filter(Boolean).length;

  // Check if all accounting options are selected
  const allAccountingOptions = ['chartOfAccounts', 'financialYears', 'journalEntries', 'expenses', 'gstConfig', 'cashBook', 'accountingSettings', 'fixedAssets'] as const;
  const allAccountingSelected = allAccountingOptions.every(key => resetOptions[key]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            System Reset - Select What to Reset
          </DialogTitle>
          <DialogDescription>
            Select the data you want to reset. User accounts will NEVER be deleted.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            {/* User Management - ALWAYS PRESERVED */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h5 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                ALWAYS PRESERVED (Cannot be reset):
              </h5>
              <div className="grid md:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                <li className="ml-4">• All User Accounts (Super Admin, Company, Agent, Staff, Cashier)</li>
                <li className="ml-4">• All Company Profiles</li>
                <li className="ml-4">• All Loan Products</li>
                <li className="ml-4">• System Settings & Configuration</li>
              </div>
            </div>

            {/* Select All / None */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectedCount === Object.keys(resetOptions).length}
                  onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                />
                <Label htmlFor="select-all" className="font-medium cursor-pointer">
                  Select All / None
                </Label>
              </div>
              <span className="text-sm text-gray-500">{selectedCount} items selected</span>
            </div>

            {/* Accounting Portal - FULL RESET */}
            <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
              <h5 className="font-semibold text-teal-700 mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Accounting Portal (Full Reset)
              </h5>
              
              {/* Master Toggle */}
              <div className="flex items-center space-x-2 mb-3 p-2 bg-teal-100 rounded">
                <Checkbox
                  id="allAccounting"
                  checked={resetOptions.allAccounting && allAccountingSelected}
                  onCheckedChange={(checked) => handleAllAccountingChange(checked as boolean)}
                />
                <Label htmlFor="allAccounting" className="font-semibold cursor-pointer text-teal-800">
                  ALL ACCOUNTING DATA (Master Toggle)
                </Label>
              </div>
              
              <div className="grid md:grid-cols-2 gap-3 ml-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="chartOfAccounts"
                    checked={resetOptions.chartOfAccounts}
                    onCheckedChange={(checked) => handleOptionChange('chartOfAccounts', checked as boolean)}
                  />
                  <Label htmlFor="chartOfAccounts" className="cursor-pointer">
                    Chart of Accounts
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="financialYears"
                    checked={resetOptions.financialYears}
                    onCheckedChange={(checked) => handleOptionChange('financialYears', checked as boolean)}
                  />
                  <Label htmlFor="financialYears" className="cursor-pointer">
                    Financial Years
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="journalEntries"
                    checked={resetOptions.journalEntries}
                    onCheckedChange={(checked) => handleOptionChange('journalEntries', checked as boolean)}
                  />
                  <Label htmlFor="journalEntries" className="cursor-pointer">
                    Journal Entries & Lines
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="expenses"
                    checked={resetOptions.expenses}
                    onCheckedChange={(checked) => handleOptionChange('expenses', checked as boolean)}
                  />
                  <Label htmlFor="expenses" className="cursor-pointer">
                    Expenses
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="gstConfig"
                    checked={resetOptions.gstConfig}
                    onCheckedChange={(checked) => handleOptionChange('gstConfig', checked as boolean)}
                  />
                  <Label htmlFor="gstConfig" className="cursor-pointer">
                    GST Configuration
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cashBook"
                    checked={resetOptions.cashBook}
                    onCheckedChange={(checked) => handleOptionChange('cashBook', checked as boolean)}
                  />
                  <Label htmlFor="cashBook" className="cursor-pointer">
                    Cash Book Entries
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="accountingSettings"
                    checked={resetOptions.accountingSettings}
                    onCheckedChange={(checked) => handleOptionChange('accountingSettings', checked as boolean)}
                  />
                  <Label htmlFor="accountingSettings" className="cursor-pointer">
                    Accounting Settings
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="fixedAssets"
                    checked={resetOptions.fixedAssets}
                    onCheckedChange={(checked) => handleOptionChange('fixedAssets', checked as boolean)}
                  />
                  <Label htmlFor="fixedAssets" className="cursor-pointer">
                    Fixed Assets & Depreciation
                  </Label>
                </div>
              </div>
              
              <p className="text-xs text-teal-600 mt-3 ml-4">
                <BookOpen className="h-3 w-3 inline mr-1" />
                Includes: Ledger Balances, Reports Cache, Loan Sequences, Mirror Loan Mappings
              </p>
              <p className="text-xs text-green-600 mt-2 ml-4 font-medium">
                ✓ After reset: Chart of Accounts will be re-initialized for all companies (fresh start)
              </p>
            </div>

            {/* Loan Related */}
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h5 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Loan Related Data
              </h5>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="loanApplications"
                    checked={resetOptions.loanApplications}
                    onCheckedChange={(checked) => handleOptionChange('loanApplications', checked as boolean)}
                  />
                  <Label htmlFor="loanApplications" className="cursor-pointer">
                    Loan Applications & Session Forms
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emiSchedules"
                    checked={resetOptions.emiSchedules}
                    onCheckedChange={(checked) => handleOptionChange('emiSchedules', checked as boolean)}
                  />
                  <Label htmlFor="emiSchedules" className="cursor-pointer">
                    EMI Schedules & Payments
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="offlineLoans"
                    checked={resetOptions.offlineLoans}
                    onCheckedChange={(checked) => handleOptionChange('offlineLoans', checked as boolean)}
                  />
                  <Label htmlFor="offlineLoans" className="cursor-pointer">
                    Offline Loans & Interest Only Loans
                  </Label>
                </div>
              </div>
            </div>

            {/* Financial Data */}
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h5 className="font-semibold text-amber-700 mb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Financial Data
              </h5>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bankAccounts"
                    checked={resetOptions.bankAccounts}
                    onCheckedChange={(checked) => handleOptionChange('bankAccounts', checked as boolean)}
                  />
                  <Label htmlFor="bankAccounts" className="cursor-pointer">
                    Bank Accounts
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="transactions"
                    checked={resetOptions.transactions}
                    onCheckedChange={(checked) => handleOptionChange('transactions', checked as boolean)}
                  />
                  <Label htmlFor="transactions" className="cursor-pointer">
                    All Transactions & Journal Entries
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="credits"
                    checked={resetOptions.credits}
                    onCheckedChange={(checked) => handleOptionChange('credits', checked as boolean)}
                  />
                  <Label htmlFor="credits" className="cursor-pointer">
                    Credits (Reset to Zero)
                  </Label>
                </div>
              </div>
            </div>

            {/* Customer Data */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h5 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Customer Data
              </h5>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="customers"
                    checked={resetOptions.customers}
                    onCheckedChange={(checked) => handleOptionChange('customers', checked as boolean)}
                  />
                  <Label htmlFor="customers" className="cursor-pointer">
                    Customer Accounts
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="documents"
                    checked={resetOptions.documents}
                    onCheckedChange={(checked) => handleOptionChange('documents', checked as boolean)}
                  />
                  <Label htmlFor="documents" className="cursor-pointer">
                    Uploaded Documents
                  </Label>
                </div>
              </div>
            </div>

            {/* System Data */}
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h5 className="font-semibold text-purple-700 mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                System Data
              </h5>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auditLogs"
                    checked={resetOptions.auditLogs}
                    onCheckedChange={(checked) => handleOptionChange('auditLogs', checked as boolean)}
                  />
                  <Label htmlFor="auditLogs" className="cursor-pointer">
                    Audit Logs & Workflow Logs
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notifications"
                    checked={resetOptions.notifications}
                    onCheckedChange={(checked) => handleOptionChange('notifications', checked as boolean)}
                  />
                  <Label htmlFor="notifications" className="cursor-pointer">
                    Notifications & Reminders
                  </Label>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="p-3 bg-red-100 rounded-lg border border-red-300">
              <p className="text-sm text-red-700 font-medium">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                This action cannot be undone. All selected data will be permanently deleted.
              </p>
            </div>

            {/* Confirmation Input */}
            <div>
              <Label>Type <span className="font-mono font-bold text-red-600">RESET_SYSTEM</span> to confirm:</Label>
              <Input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET_SYSTEM"
                className="mt-2 font-mono"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={resetting || resetConfirmText !== 'RESET_SYSTEM' || selectedCount === 0}
          >
            {resetting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset Selected ({selectedCount})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default memo(SystemResetDialog);
export type { ResetOptions };
