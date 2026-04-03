'use client';

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Building2, Users, User, Banknote, Calculator, ArrowRight, CheckCircle, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';

interface Loan {
  id: string; applicationNo: string; status: string; requestedAmount: number; loanType: string;
  createdAt: string; riskScore: number; fraudFlag: boolean; purpose: string;
  requestedTenure?: number; requestedInterestRate?: number;
  customer: { id: string; name: string; email: string; phone: string; };
  sessionForm?: any; loanForm?: any; company?: any;
}

interface UserItem {
  id: string; name: string; email: string; role: string; isActive: boolean;
  createdAt: string; phone?: string; company?: string | { id: string; name: string };
}

interface DashboardTabProps {
  loans: Loan[];
  pendingForSA: Loan[];
  inProgressLoans: Loan[];
  activeLoans: Loan[];
  rejectedLoans: Loan[];
  companyUsers: UserItem[];
  agents: UserItem[];
  staff: UserItem[];
  cashiers: UserItem[];
  accountants: UserItem[];
  totalDisbursed: number;
  onNavigateToTab: (tab: string) => void;
  onApprove: (loan: Loan) => void;
}

const DashboardTab = memo(function DashboardTab({
  loans,
  pendingForSA,
  inProgressLoans,
  activeLoans,
  rejectedLoans,
  companyUsers,
  agents,
  staff,
  cashiers,
  accountants,
  totalDisbursed,
  onNavigateToTab,
  onApprove,
}: DashboardTabProps) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: loans.length, icon: DollarSign, color: 'text-blue-600 bg-blue-50' },
          { label: 'Pending Approvals', value: pendingForSA.length, icon: DollarSign, color: 'text-orange-600 bg-orange-50' },
          { label: 'Active Loans', value: activeLoans.length, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          { label: 'Total Disbursed', value: formatCurrency(totalDisbursed), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.color.split(' ')[1]}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color.split(' ')[0]}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Application Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'New Applications', count: pendingForSA.length, color: 'bg-blue-500', width: loans.length ? (pendingForSA.length / loans.length * 100) : 0 },
                { label: 'In Progress', count: inProgressLoans.length, color: 'bg-amber-500', width: loans.length ? (inProgressLoans.length / loans.length * 100) : 0 },
                { label: 'Active Loans', count: activeLoans.length, color: 'bg-green-500', width: loans.length ? (activeLoans.length / loans.length * 100) : 0 },
                { label: 'Rejected', count: rejectedLoans.length, color: 'bg-red-500', width: loans.length ? (rejectedLoans.length / loans.length * 100) : 0 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${item.color} h-2 rounded-full transition-all`} style={{ width: `${item.width}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">User Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Companies', count: companyUsers.length, icon: Building2, color: 'text-blue-600 bg-blue-50' },
                { label: 'Agents', count: agents.length, icon: Users, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Staff', count: staff.length, icon: User, color: 'text-purple-600 bg-purple-50' },
                { label: 'Cashiers', count: cashiers.length, icon: Banknote, color: 'text-orange-600 bg-orange-50' },
                { label: 'Accountants', count: accountants.length, icon: Calculator, color: 'text-teal-600 bg-teal-50' },
              ].map((item) => (
                <div key={item.label} className={`p-4 rounded-xl ${item.color.split(' ')[1]}`}>
                  <item.icon className={`h-5 w-5 ${item.color.split(' ')[0]} mb-2`} />
                  <p className="text-2xl font-bold">{item.count}</p>
                  <p className="text-sm text-gray-600">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Pending Applications */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Pending Applications</CardTitle>
            {pendingForSA.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => onNavigateToTab('pending')}>
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingForSA.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
              <p>All caught up! No pending applications.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingForSA.slice(0, 5).map((loan) => (
                <div key={loan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-100 text-blue-700">{loan.customer?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{loan.applicationNo}</p>
                      <p className="text-sm text-gray-500">{loan.customer?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold">{formatCurrency(loan.requestedAmount)}</p>
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600" onClick={() => onApprove(loan)}>
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

export default DashboardTab;
