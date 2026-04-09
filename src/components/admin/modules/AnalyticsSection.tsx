'use client';

import { memo, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, CheckCircle, Wallet, BarChart3, PieChart, Activity, FileText } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';

interface Loan {
  id: string;
  status: string;
  createdAt: string;
  loanType?: string;
  requestedAmount: number;
  sessionForm?: any;
}

interface Props {
  loans: Loan[];
  activeLoans: Loan[];
  inProgressLoans: Loan[];
  pendingForSA: Loan[];
  pendingForFinal: Loan[];
  rejectedLoans: Loan[];
  highRiskLoans: Loan[];
  totalRequested: number;
  totalDisbursed: number;
}

function AnalyticsSection({
  loans,
  activeLoans,
  inProgressLoans,
  pendingForSA,
  pendingForFinal,
  rejectedLoans,
  highRiskLoans,
  totalRequested,
  totalDisbursed
}: Props) {
  // Calculate analytics data
  const conversionRate = loans.length > 0 ? ((activeLoans.length / loans.length) * 100).toFixed(1) : '0';
  const avgLoanAmount = loans.length > 0 ? Math.round(totalRequested / loans.length) : 0;
  const approvalRate = loans.length > 0 ? (((activeLoans.length + inProgressLoans.length) / loans.length) * 100).toFixed(1) : '0';

  // Group loans by month for trends
  const { loansByMonth, sortedMonths, loansByType } = useMemo(() => {
    const byMonth: Record<string, { total: number; disbursed: number; rejected: number }> = {};
    loans.forEach(loan => {
      const month = new Date(loan.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!byMonth[month]) byMonth[month] = { total: 0, disbursed: 0, rejected: 0 };
      byMonth[month].total++;
      if (['ACTIVE', 'DISBURSED'].includes(loan.status)) byMonth[month].disbursed++;
      if (['REJECTED_BY_SA', 'REJECTED_BY_COMPANY', 'REJECTED_FINAL', 'SESSION_REJECTED'].includes(loan.status)) byMonth[month].rejected++;
    });
    const months = Object.keys(byMonth).slice(-6);

    const byType: Record<string, number> = {};
    loans.forEach(loan => {
      const type = loan.loanType || 'Other';
      byType[type] = (byType[type] || 0) + 1;
    });

    return { loansByMonth: byMonth, sortedMonths: months, loansByType: byType };
  }, [loans]);

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-bold text-emerald-600">{conversionRate}%</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg. Loan Amount</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(avgLoanAmount)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approval Rate</p>
                <p className="text-2xl font-bold text-green-600">{approvalRate}%</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Disbursed</p>
                <p className="text-2xl font-bold text-violet-600">{formatCurrency(totalDisbursed)}</p>
              </div>
              <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center">
                <Wallet className="h-6 w-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Application Trends */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Monthly Application Trends
            </CardTitle>
            <CardDescription>Applications, disbursements, and rejections by month</CardDescription>
          </CardHeader>
          <CardContent>
            {sortedMonths.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p>No data available yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedMonths.map(month => {
                  const data = loansByMonth[month];
                  const maxVal = Math.max(data.total, 1);
                  return (
                    <div key={month} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">{month}</span>
                        <span className="text-gray-500">{data.total} applications</span>
                      </div>
                      <div className="flex gap-1 h-6">
                        <div className="bg-blue-500 rounded-l" style={{ width: `${(data.total / maxVal) * 100}%` }} title={`${data.total} Total`} />
                        <div className="bg-green-500" style={{ width: `${(data.disbursed / maxVal) * 100}%` }} title={`${data.disbursed} Disbursed`} />
                        <div className="bg-red-500 rounded-r" style={{ width: `${(data.rejected / maxVal) * 100}%` }} title={`${data.rejected} Rejected`} />
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded" /> Total: {data.total}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded" /> Disbursed: {data.disbursed}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded" /> Rejected: {data.rejected}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loan Type Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-600" />
              Loan Type Distribution
            </CardTitle>
            <CardDescription>Breakdown of applications by loan type</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(loansByType).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p>No loan data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(loansByType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count], index) => {
                    const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
                    const color = colors[index % colors.length];
                    const percentage = loans.length > 0 ? ((count / loans.length) * 100).toFixed(1) : '0';
                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700">{type}</span>
                          <span className="text-gray-500">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Pipeline */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Application Status Pipeline</CardTitle>
          <CardDescription>Detailed breakdown of all application statuses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: 'New', count: pendingForSA.length, color: 'bg-blue-100 text-blue-700' },
              { label: 'In Progress', count: inProgressLoans.length, color: 'bg-amber-100 text-amber-700' },
              { label: 'Awaiting Final', count: pendingForFinal.length, color: 'bg-cyan-100 text-cyan-700' },
              { label: 'Active', count: activeLoans.length, color: 'bg-green-100 text-green-700' },
              { label: 'Rejected', count: rejectedLoans.length, color: 'bg-red-100 text-red-700' },
              { label: 'High Risk', count: highRiskLoans.length, color: 'bg-orange-100 text-orange-700' },
            ].map((item) => (
              <div key={item.label} className={`p-4 rounded-xl ${item.color}`}>
                <p className="text-2xl font-bold">{item.count}</p>
                <p className="text-sm">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(AnalyticsSection);
