'use client';

import { memo, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle, XCircle, Clock, Users, Banknote, TrendingUp, AlertTriangle, DollarSign, FileText, Percent } from 'lucide-react';
import { motion } from 'framer-motion';
import TodayCollectionCard from './TodayCollectionCard';

interface Loan {
  id: string; applicationNo: string; status: string; requestedAmount: number; loanType: string;
  createdAt: string; riskScore: number; fraudFlag: boolean;
  customer: { id: string; name: string; email: string; phone: string; };
  sessionForm?: any; company?: any;
  disbursedAmount?: number;
}

interface OfflineLoan {
  id: string;
  status: string;
  loanAmount: number;
  isInterestOnlyLoan?: boolean;
}

interface Props {
  loans: Loan[];
  users: any[];
  companies: any[];
  offlineLoans?: OfflineLoan[];
  onViewLoan?: (loan: Loan) => void;
  onTabChange?: (tab: string) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return 'N/A';
  }
};

function DashboardOverview({ loans, users, companies, offlineLoans = [], onViewLoan, onTabChange }: Props) {
  // Memoized calculations
  const stats = useMemo(() => {
    const pending = loans.filter(l => l.status === 'SUBMITTED' || l.status === 'SA_APPROVED');
    const finalApproval = loans.filter(l => l.status === 'FINAL_APPROVED');
    const active = loans.filter(l => l.status === 'ACTIVE' || l.status === 'DISBURSED' || l.status === 'ACTIVE_INTEREST_ONLY');
    const rejected = loans.filter(l => l.status === 'REJECTED');
    
    // Include offline loans in active count
    const activeOfflineLoans = offlineLoans.filter(l => l.status === 'ACTIVE' || l.status === 'INTEREST_ONLY');
    const interestOnlyLoans = offlineLoans.filter(l => l.status === 'INTEREST_ONLY' || l.isInterestOnlyLoan);
    
    const totalDisbursed = active.reduce((sum, l) => sum + (l.disbursedAmount || l.sessionForm?.approvedAmount || l.requestedAmount), 0);
    const totalOfflineDisbursed = activeOfflineLoans.reduce((sum, l) => sum + l.loanAmount, 0);
    const totalPending = pending.reduce((sum, l) => sum + l.requestedAmount, 0);
    
    // Filter out potential system/customer users for the specific "Users" count
    const PERMANENT_ADMIN_EMAILS = ['moneymitra@gmail.com'];
    const nonCustomerUsers = users.filter(u => u.role !== 'CUSTOMER' && !PERMANENT_ADMIN_EMAILS.includes(u.email));
    
    return { 
      pending, 
      finalApproval, 
      active, 
      rejected, 
      activeOfflineLoans,
      interestOnlyLoans,
      totalDisbursed, 
      totalOfflineDisbursed,
      totalPending,
      totalActive: active.length + activeOfflineLoans.length,
      userCount: nonCustomerUsers.length
    };
  }, [loans, offlineLoans, users]);

  const recentLoans = useMemo(() => [...loans].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5), [loans]);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      SUBMITTED: { className: 'bg-blue-100 text-blue-700', label: 'New' },
      SA_APPROVED: { className: 'bg-purple-100 text-purple-700', label: 'SA Approved' },
      SESSION_CREATED: { className: 'bg-amber-100 text-amber-700', label: 'Session' },
      FINAL_APPROVED: { className: 'bg-green-100 text-green-700', label: 'Final Approved' },
      ACTIVE: { className: 'bg-emerald-100 text-emerald-700', label: 'Active' },
      ACTIVE_INTEREST_ONLY: { className: 'bg-violet-100 text-violet-700', label: 'Interest Only' },
      REJECTED: { className: 'bg-red-100 text-red-700', label: 'Rejected' },
    };
    const c = config[status] || { className: 'bg-gray-100 text-gray-700', label: status };
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onTabChange?.('pending')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Pending Approvals</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.pending.length}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onTabChange?.('final')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Final Approvals</p>
                  <p className="text-2xl font-bold text-green-700">{stats.finalApproval.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onTabChange?.('activeLoans')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600">Active Loans</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.totalActive}</p>
                  {stats.activeOfflineLoans.length > 0 && (
                    <p className="text-xs text-emerald-500">{stats.activeOfflineLoans.length} offline</p>
                  )}
                </div>
                <Banknote className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onTabChange?.('users')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Total Users</p>
                  <p className="text-2xl font-bold text-purple-700">{stats.userCount}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Interest Only Loans & Quick Stats */}
      {stats.interestOnlyLoans.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Percent className="h-8 w-8 text-violet-600" />
                  <div>
                    <p className="text-sm text-violet-600">Interest Only Loans</p>
                    <p className="text-xl font-bold text-violet-700">{stats.interestOnlyLoans.length} loans pending EMI start</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="border-violet-300 text-violet-700" onClick={() => onTabChange?.('offlineLoans')}>
                  View All
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-sm text-amber-600">Total Disbursed</p>
                <p className="text-xl font-bold text-amber-700">{formatCurrency(stats.totalDisbursed + stats.totalOfflineDisbursed)}</p>
                {stats.totalOfflineDisbursed > 0 && (
                  <p className="text-xs text-amber-500">Online: {formatCurrency(stats.totalDisbursed)} | Offline: {formatCurrency(stats.totalOfflineDisbursed)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-red-600">Pending Amount</p>
                <p className="text-xl font-bold text-red-700">{formatCurrency(stats.totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" /> Recent Activity
          </CardTitle>
          <CardDescription>Latest loan applications</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLoans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Banknote className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLoans.map((loan) => (
                <div key={loan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
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
                    {getStatusBadge(loan.status)}
                    <p className="font-semibold">{formatCurrency(loan.sessionForm?.approvedAmount || loan.requestedAmount)}</p>
                    <Button size="sm" variant="outline" onClick={() => onViewLoan?.(loan)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Today's Collection Card — company-wise + collector role */}
      <div className="grid grid-cols-1">
        <TodayCollectionCard />
      </div>
    </div>
  );
}

export default memo(DashboardOverview);
