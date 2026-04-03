'use client';

import { memo, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Wallet, Landmark, DollarSign, Activity } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  currentBalance: number;
  isDefault: boolean;
  companyId?: string;
  company?: { id: string; name: string; code: string; };
}

interface DashboardStatsSectionProps {
  bankAccounts: BankAccount[];
  totalDisbursed: number;
  totalCollected: number;
  activeLoansCount: number;
}

function DashboardStatsSectionComponent({ 
  bankAccounts, 
  totalDisbursed, 
  totalCollected, 
  activeLoansCount 
}: DashboardStatsSectionProps) {
  const totalBalance = useMemo(() => 
    bankAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0), 
    [bankAccounts]
  );

  const stats = [
    { 
      label: 'Total Bank Balance', 
      value: formatCurrency(totalBalance), 
      icon: Landmark, 
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    { 
      label: 'Total Disbursed', 
      value: formatCurrency(totalDisbursed), 
      icon: TrendingDown, 
      color: 'text-red-600',
      bg: 'bg-red-50'
    },
    { 
      label: 'Total Collected', 
      value: formatCurrency(totalCollected), 
      icon: TrendingUp, 
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    { 
      label: 'Active Loans', 
      value: activeLoansCount.toString(), 
      icon: Activity, 
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <Card key={i} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default memo(DashboardStatsSectionComponent);
