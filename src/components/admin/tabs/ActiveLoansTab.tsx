'use client';

import { memo, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Wallet, FileText, Receipt, DollarSign, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';

interface Loan {
  id: string; applicationNo: string; status: string; requestedAmount: number; loanType: string;
  createdAt: string; disbursedAmount?: number; sessionForm?: any;
  customer: { id: string; name: string; email: string; phone: string; };
}

interface Props {
  loans: Loan[];
  stats: { totalOnline: number; totalOffline: number; totalOnlineAmount: number; totalOfflineAmount: number };
  onRefresh: () => void;
  onViewLoan: (loan: Loan) => void;
}

function ActiveLoansTab({ loans, stats, onRefresh, onViewLoan }: Props) {
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');

  const filteredLoans = useMemo(() => {
    if (filter === 'all') return loans;
    return loans.filter(loan => loan.loanType === filter.toUpperCase());
  }, [loans, filter]);

  return (
    <div className="space-y-6">
      {/* Filter Toggle Bar */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Filter by Type:</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filter === 'all' ? 'default' : 'outline'}
                  className={filter === 'all' ? 'bg-gray-700 hover:bg-gray-800' : ''}
                  onClick={() => setFilter('all')}
                >
                  All ({stats.totalOnline + stats.totalOffline})
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'online' ? 'default' : 'outline'}
                  className={filter === 'online' ? 'bg-blue-600 hover:bg-blue-700' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}
                  onClick={() => setFilter('online')}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Online ({stats.totalOnline})
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'offline' ? 'default' : 'outline'}
                  className={filter === 'offline' ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-200 text-purple-700 hover:bg-purple-50'}
                  onClick={() => setFilter('offline')}
                >
                  <Receipt className="h-4 w-4 mr-1" />
                  Offline ({stats.totalOffline})
                </Button>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Active Loans</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.totalOnline + stats.totalOffline}</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Online Loans</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalOnline}</p>
                <p className="text-xs text-gray-400">{formatCurrency(stats.totalOnlineAmount)}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Offline Loans</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalOffline}</p>
                <p className="text-xs text-gray-400">{formatCurrency(stats.totalOfflineAmount)}</p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Receipt className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Disbursed</p>
                <p className="text-2xl font-bold text-teal-600">{formatCurrency(stats.totalOnlineAmount + stats.totalOfflineAmount)}</p>
              </div>
              <div className="p-2 bg-teal-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loans List */}
      <Card className="bg-white shadow-sm border-0">
        <CardContent className="p-4">
          {filteredLoans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No active loans found</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredLoans.map((loan, index) => (
                <motion.div
                  key={loan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all bg-white"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{loan.applicationNo}</p>
                      <p className="text-sm text-gray-500">{loan.customer?.name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={loan.loanType === 'ONLINE' ? 'default' : 'secondary'}>
                        {loan.loanType}
                      </Badge>
                      <p className="font-bold">{formatCurrency(loan.disbursedAmount || loan.sessionForm?.approvedAmount || loan.requestedAmount)}</p>
                      <Button size="sm" variant="outline" onClick={() => onViewLoan(loan)}>View</Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(ActiveLoansTab);
