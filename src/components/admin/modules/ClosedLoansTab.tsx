'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Wallet, RefreshCw, Eye, FileText, Receipt, DollarSign, CheckCircle, Calendar, User, Building2
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { motion } from 'framer-motion';

interface ClosedLoan {
  id: string;
  identifier: string;
  applicationNo: string;
  loanType: string;
  status: string;
  closedAt: string;
  customer?: { name: string; phone: string; email?: string };
  company?: { id: string; name: string; code: string };
  approvedAmount: number;
  interestRate: number;
  tenure: number;
  emiAmount: number;
  totalInterest: number;
  disbursementDate?: string;
  createdAt: string;
  summary: {
    totalEMIs: number;
    paidEMIs: number;
    totalPaid: number;
    totalAmount: number;
  };
  emiSchedules?: Array<{
    installmentNumber: number;
    dueDate: string;
    totalAmount: number;
    paidAmount: number;
    paymentStatus: string;
    paidDate?: string;
  }>;
}

interface ClosedLoansStats {
  totalOnline: number;
  totalOffline: number;
  totalLoans: number;
  totalOnlineAmount: number;
  totalOfflineAmount: number;
  totalAmount: number;
  totalInterestCollected: number;
}

interface ClosedLoansTabProps {
  setSelectedLoanId: (id: string | null) => void;
  setShowLoanDetailPanel: (show: boolean) => void;
}

export default function ClosedLoansTab({
  setSelectedLoanId,
  setShowLoanDetailPanel
}: ClosedLoansTabProps) {
  const [loading, setLoading] = useState(true);
  const [closedLoans, setClosedLoans] = useState<ClosedLoan[]>([]);
  const [stats, setStats] = useState<ClosedLoansStats>({
    totalOnline: 0,
    totalOffline: 0,
    totalLoans: 0,
    totalOnlineAmount: 0,
    totalOfflineAmount: 0,
    totalAmount: 0,
    totalInterestCollected: 0
  });
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);

  const fetchClosedLoans = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/loan/closed?filter=${filter}`);
      const data = await response.json();
      if (data.loans) {
        setClosedLoans(data.loans);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching closed loans:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosedLoans();
  }, [filter]);

  const filteredLoans = closedLoans.filter(loan => {
    if (filter === 'all') return true;
    return loan.loanType === filter.toUpperCase();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-gray-700 to-gray-800 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Closed Loans</h2>
                <p className="text-sm text-gray-300">Completed and fully paid loans</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={fetchClosedLoans}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

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
                  All ({stats.totalLoans})
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
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Closed</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalLoans}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Principal</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Interest Collected</p>
                <p className="text-lg font-bold text-amber-600">{formatCurrency(stats.totalInterestCollected)}</p>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Online / Offline</p>
                <p className="text-lg font-bold text-purple-600">{stats.totalOnline} / {stats.totalOffline}</p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Receipt className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Closed Loans List */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Closed Loans List
          </CardTitle>
          <CardDescription>
            Loans that have been fully repaid and closed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No closed loans found</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredLoans.map((loan, index) => {
                const isOnline = loan.loanType === 'ONLINE';
                const isExpanded = expandedLoan === loan.id;

                return (
                  <motion.div
                    key={`${loan.loanType}-${loan.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-4 border rounded-xl bg-green-50 border-green-200 border-l-4 border-l-green-500"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 bg-gradient-to-br from-green-400 to-emerald-500">
                          <AvatarFallback className="bg-transparent text-white font-semibold">
                            <CheckCircle className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-gray-900">{loan.identifier}</h4>
                            <Badge className="bg-green-100 text-green-700 border-green-300">CLOSED</Badge>
                            <Badge className={isOnline ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                              {loan.loanType}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">{loan.customer?.name}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" /> {loan.customer?.phone}
                            </span>
                            {loan.company && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" /> {loan.company.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrency(loan.approvedAmount)}</p>
                          <p className="text-xs text-gray-500">
                            Closed: {formatDate(loan.closedAt)}
                          </p>
                          <p className="text-xs text-green-600">
                            {loan.summary.paidEMIs}/{loan.summary.totalEMIs} EMIs Paid
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExpandedLoan(isExpanded ? null : loan.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {isExpanded ? 'Hide' : 'Details'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 pt-4 border-t border-green-200"
                      >
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="p-3 bg-white rounded-lg border">
                            <p className="text-xs text-gray-500">Interest Rate</p>
                            <p className="font-semibold">{loan.interestRate}% p.a.</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border">
                            <p className="text-xs text-gray-500">Tenure</p>
                            <p className="font-semibold">{loan.tenure} months</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border">
                            <p className="text-xs text-gray-500">EMI Amount</p>
                            <p className="font-semibold">{formatCurrency(loan.emiAmount)}</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border">
                            <p className="text-xs text-gray-500">Interest Collected</p>
                            <p className="font-semibold text-green-600">{formatCurrency(loan.totalInterest)}</p>
                          </div>
                        </div>

                        {/* EMI Schedule Summary */}
                        {loan.emiSchedules && loan.emiSchedules.length > 0 && (
                          <div className="bg-white rounded-lg border p-3">
                            <h5 className="text-sm font-medium mb-2">EMI Payment Summary</h5>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500">Total Amount</p>
                                <p className="font-semibold">{formatCurrency(loan.summary.totalAmount)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Total Paid</p>
                                <p className="font-semibold text-green-600">{formatCurrency(loan.summary.totalPaid)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Disbursement</p>
                                <p className="font-semibold">{loan.disbursementDate ? formatDate(loan.disbursementDate) : 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
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
