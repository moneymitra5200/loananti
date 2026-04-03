'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Landmark, Wallet, Clock, CheckCircle } from 'lucide-react';
import type { Loan, BankAccount, Stats } from './types';

interface DashboardTabProps {
  stats: Stats;
  bankAccounts: BankAccount[];
  pendingDisbursements: Loan[];
  onNavigate: (tab: string) => void;
}

export default function DashboardTab({ stats, bankAccounts, pendingDisbursements, onNavigate }: DashboardTabProps) {
  return (
    <div className="space-y-6">
      {/* Bank Balance Summary */}
      {bankAccounts.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Landmark className="h-5 w-5 text-blue-600" />
              Bank Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {bankAccounts.slice(0, 3).map((account) => (
                <div
                  key={account.id}
                  className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{account.bankName}</span>
                    {account.isDefault && <Badge className="bg-blue-500 text-xs">Default</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{account.accountNumber}</p>
                  <p className="text-xl font-bold text-blue-600">
                    ₹{account.currentBalance?.toLocaleString('en-IN') || 0}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingDisbursements}</p>
                <p className="text-xs text-gray-500">Pending Disbursements</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">₹{stats.totalDisbursed?.toLocaleString('en-IN') || 0}</p>
                <p className="text-xs text-gray-500">Total Disbursed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {pendingDisbursements.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Wallet className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-amber-800">{pendingDisbursements.length} Loans Ready for Disbursement</h4>
                <p className="text-sm text-amber-600">Click to process disbursements</p>
              </div>
              <Button onClick={() => onNavigate('pending')}>Process</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
