'use client';

import { memo, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Activity, CheckCircle, PieChart, BarChart3, Eye } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import { motion } from 'framer-motion';

interface Loan {
  id: string;
  applicationNo: string;
  status: string;
  requestedAmount: number;
  loanType: string;
  createdAt: string;
  riskScore: number;
  fraudFlag: boolean;
  purpose: string;
  customer: { id: string; name: string; email: string; phone: string };
}

interface Props {
  loans: Loan[];
  highRiskLoans: Loan[];
  onViewLoan: (loan: Loan) => void;
}

function RiskSection({ loans, highRiskLoans, onViewLoan }: Props) {
  const lowRiskLoans = loans.filter(l => (l.riskScore || 0) < 30);
  const mediumRiskLoans = loans.filter(l => (l.riskScore || 0) >= 30 && (l.riskScore || 0) < 50);
  const flaggedLoans = loans.filter(l => l.fraudFlag);
  const avgRiskScore = loans.length > 0 
    ? (loans.reduce((sum, l) => sum + (l.riskScore || 0), 0) / loans.length).toFixed(1) 
    : '0';

  // Risk by loan type
  const riskByType = useMemo(() => {
    const result: Record<string, { count: number; totalRisk: number }> = {};
    highRiskLoans.forEach(loan => {
      const type = loan.loanType || 'Other';
      if (!result[type]) result[type] = { count: 0, totalRisk: 0 };
      result[type].count++;
      result[type].totalRisk += loan.riskScore || 0;
    });
    return result;
  }, [highRiskLoans]);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      SUBMITTED: { className: 'bg-blue-100 text-blue-700', label: 'New' },
      SA_APPROVED: { className: 'bg-emerald-100 text-emerald-700', label: 'SA Approved' },
      COMPANY_APPROVED: { className: 'bg-teal-100 text-teal-700', label: 'Company Approved' },
      AGENT_APPROVED_STAGE1: { className: 'bg-cyan-100 text-cyan-700', label: 'Agent Approved' },
    };
    const c = config[status] || { className: 'bg-gray-100 text-gray-700', label: status };
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Risk Overview Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">High Risk Loans</p>
                <p className="text-2xl font-bold text-red-600">{highRiskLoans.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Fraud Flags</p>
                <p className="text-2xl font-bold text-orange-600">{flaggedLoans.length}</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg. Risk Score</p>
                <p className="text-2xl font-bold text-amber-600">{avgRiskScore}</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                <Activity className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Low Risk Loans</p>
                <p className="text-2xl font-bold text-green-600">{lowRiskLoans.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution and High Risk by Type */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-600" />
              Risk Score Distribution
            </CardTitle>
            <CardDescription>Breakdown of loans by risk category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Low Risk (0-29)', count: lowRiskLoans.length, color: 'bg-green-500' },
                { label: 'Medium Risk (30-49)', count: mediumRiskLoans.length, color: 'bg-amber-500' },
                { label: 'High Risk (50+)', count: highRiskLoans.length, color: 'bg-red-500' },
              ].map((item) => {
                const total = lowRiskLoans.length + mediumRiskLoans.length + highRiskLoans.length;
                const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0';
                return (
                  <div key={item.label} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">{item.label}</span>
                      <span className="text-gray-500">{item.count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className={`${item.color} h-3 rounded-full transition-all`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-red-600" />
              High Risk by Loan Type
            </CardTitle>
            <CardDescription>Which loan types have the most risk</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(riskByType).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
                <p>No high-risk loans detected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(riskByType)
                  .sort(([,a], [,b]) => b.count - a.count)
                  .map(([type, data]) => {
                    const avgRisk = (data.totalRisk / data.count).toFixed(0);
                    return (
                      <div key={type} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{type}</p>
                          <p className="text-sm text-gray-500">{data.count} high-risk loans</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">Avg: {avgRisk}</p>
                          <p className="text-xs text-gray-500">Risk Score</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* High Risk Loans List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            High Risk Loans
          </CardTitle>
          <CardDescription>Loans with risk score of 50 or higher requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          {highRiskLoans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p>No high-risk loans detected</p>
              <p className="text-sm mt-1">All loans are within acceptable risk parameters</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {highRiskLoans
                .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
                .map((loan, index) => (
                  <motion.div key={loan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                    className="p-4 border border-red-100 rounded-xl hover:bg-red-50 transition-all bg-white">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">{loan.applicationNo}</h4>
                            {getStatusBadge(loan.status)}
                            {loan.fraudFlag && <Badge className="bg-orange-100 text-orange-700">Fraud Flag</Badge>}
                          </div>
                          <p className="text-sm text-gray-500">{loan.customer?.name} • {loan.customer?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-lg text-gray-900">{formatCurrency(loan.requestedAmount)}</p>
                          <p className="text-xs text-gray-500">{loan.loanType}</p>
                        </div>
                        <Badge className="bg-red-100 text-red-700 text-sm px-3 py-1">
                          Risk: {loan.riskScore || 0}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => onViewLoan(loan)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fraud Flagged Loans */}
      {flaggedLoans.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-600" />
              Fraud Flagged Applications
            </CardTitle>
            <CardDescription>Applications flagged for potential fraud - requires immediate review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {flaggedLoans.map((loan, index) => (
                <motion.div key={loan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                  className="p-4 border border-orange-100 rounded-xl hover:bg-orange-50 transition-all bg-white">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Shield className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{loan.applicationNo}</h4>
                          {getStatusBadge(loan.status)}
                        </div>
                        <p className="text-sm text-gray-500">{loan.customer?.name} • {loan.customer?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900">{formatCurrency(loan.requestedAmount)}</p>
                        <p className="text-xs text-gray-500">{loan.loanType}</p>
                      </div>
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => onViewLoan(loan)}>
                        Review
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default memo(RiskSection);
