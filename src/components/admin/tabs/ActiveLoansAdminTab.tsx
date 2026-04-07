'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Wallet, RefreshCw, Eye, Trash2, FileText, Receipt, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import { motion } from 'framer-motion';

interface ActiveLoan {
  id: string;
  identifier: string;
  customer?: { name: string; phone: string };
  disbursedAmount?: number;
  approvedAmount?: number;
  emiAmount?: number;
  loanType: string;
  status: string;
}

interface ActiveLoanStats {
  totalOnline: number;
  totalOffline: number;
  totalOnlineAmount: number;
  totalOfflineAmount: number;
}

interface ActiveLoansTabProps {
  allActiveLoans: ActiveLoan[];
  activeLoanFilter: 'all' | 'online' | 'offline';
  setActiveLoanFilter: (filter: 'all' | 'online' | 'offline') => void;
  activeLoanStats: ActiveLoanStats;
  loading: boolean;
  fetchAllActiveLoans: () => void;
  setLoanToDelete: (loan: ActiveLoan | null) => void;
  setShowDeleteLoanDialog: (show: boolean) => void;
  setSelectedLoanId: (id: string | null) => void;
  setShowLoanDetailPanel: (show: boolean) => void;
}

export default function ActiveLoansTab({
  allActiveLoans,
  activeLoanFilter,
  setActiveLoanFilter,
  activeLoanStats,
  loading,
  fetchAllActiveLoans,
  setLoanToDelete,
  setShowDeleteLoanDialog,
  setSelectedLoanId,
  setShowLoanDetailPanel
}: ActiveLoansTabProps) {
  const filteredActiveLoans = allActiveLoans.filter(loan => {
    if (activeLoanFilter === 'all') return true;
    return loan.loanType === activeLoanFilter.toUpperCase();
  });

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
                  variant={activeLoanFilter === 'all' ? 'default' : 'outline'}
                  className={activeLoanFilter === 'all' ? 'bg-gray-700 hover:bg-gray-800' : ''}
                  onClick={() => setActiveLoanFilter('all')}
                >
                  All ({activeLoanStats.totalOnline + activeLoanStats.totalOffline})
                </Button>
                <Button
                  size="sm"
                  variant={activeLoanFilter === 'online' ? 'default' : 'outline'}
                  className={activeLoanFilter === 'online' ? 'bg-blue-600 hover:bg-blue-700' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}
                  onClick={() => setActiveLoanFilter('online')}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Online ({activeLoanStats.totalOnline})
                </Button>
                <Button
                  size="sm"
                  variant={activeLoanFilter === 'offline' ? 'default' : 'outline'}
                  className={activeLoanFilter === 'offline' ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-200 text-purple-700 hover:bg-purple-50'}
                  onClick={() => setActiveLoanFilter('offline')}
                >
                  <Receipt className="h-4 w-4 mr-1" />
                  Offline ({activeLoanStats.totalOffline})
                </Button>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAllActiveLoans}>
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
                <p className="text-2xl font-bold text-emerald-600">{activeLoanStats.totalOnline + activeLoanStats.totalOffline}</p>
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
                <p className="text-2xl font-bold text-blue-600">{activeLoanStats.totalOnline}</p>
                <p className="text-xs text-gray-400">{formatCurrency(activeLoanStats.totalOnlineAmount)}</p>
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
                <p className="text-2xl font-bold text-purple-600">{activeLoanStats.totalOffline}</p>
                <p className="text-xs text-gray-400">{formatCurrency(activeLoanStats.totalOfflineAmount)}</p>
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
                <p className="text-2xl font-bold text-teal-600">{formatCurrency(activeLoanStats.totalOnlineAmount + activeLoanStats.totalOfflineAmount)}</p>
              </div>
              <div className="p-2 bg-teal-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Loans List */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600" />
            Active Loans
            {activeLoanFilter !== 'all' && (
              <Badge className={activeLoanFilter === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                {activeLoanFilter.toUpperCase()} ONLY
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {activeLoanFilter === 'all' ? 'All disbursed loans (online + offline)' :
             activeLoanFilter === 'online' ? 'Online loans from digital applications' :
             'Offline loans created manually'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredActiveLoans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No {activeLoanFilter !== 'all' ? activeLoanFilter : ''} loans found</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={fetchAllActiveLoans}>
                Load Loans
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredActiveLoans.map((loan, index) => {
                const isOnline = loan.loanType === 'ONLINE';
                const bgColor = isOnline ? 'bg-blue-50 border-blue-100' : 'bg-purple-50 border-purple-100';
                const gradientColors = isOnline ? 'from-blue-400 to-cyan-500' : 'from-purple-400 to-pink-500';

                return (
                  <motion.div
                    key={`${loan.loanType}-${loan.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`p-4 border rounded-xl hover:shadow-md transition-all ${bgColor}`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar className={`h-12 w-12 bg-gradient-to-br ${gradientColors}`}>
                          <AvatarFallback className="bg-transparent text-white font-semibold">
                            {loan.customer?.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-gray-900">{loan.identifier}</h4>
                            <Badge className={isOnline ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                              {loan.loanType}
                            </Badge>
                            {loan.status && (
                              <Badge className="bg-green-100 text-green-700">{loan.status}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{loan.customer?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrency(loan.disbursedAmount || loan.approvedAmount || 0)}</p>
                          {loan.emiAmount && <p className="text-xs text-gray-500">EMI: {formatCurrency(loan.emiAmount)}/mo</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setSelectedLoanId(loan.id); setShowLoanDetailPanel(true); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => { setLoanToDelete(loan); setShowDeleteLoanDialog(true); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
