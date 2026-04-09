'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Wallet, RefreshCw, Eye, Trash2, FileText, Receipt, DollarSign, Search } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import ParallelLoanView from '@/components/loan/ParallelLoanView';

interface ActiveLoan {
  id: string;
  identifier: string;
  customer?: { name: string; phone: string };
  disbursedAmount?: number;
  approvedAmount?: number;
  emiAmount?: number;
  loanType: string;
  status: string;
  interestRate?: number;
  tenure?: number;
  company?: { id?: string; name: string; code?: string };
  isMirrorLoan?: boolean;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [mirrorMappings, setMirrorMappings] = useState<Record<string, any>>({});

  // Fetch mirror mappings on mount
  useEffect(() => {
    const fetchMirrorMappings = async () => {
      try {
        const res = await fetch('/api/mirror-loan?action=all-mappings');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.mappings) {
            const mappingMap: Record<string, any> = {};
            for (const mapping of data.mappings) {
              mappingMap[mapping.originalLoanId] = mapping;
              if (mapping.mirrorLoanId) {
                mappingMap[mapping.mirrorLoanId] = mapping;
              }
            }
            setMirrorMappings(mappingMap);
          }
        }
      } catch (error) {
        console.error('Failed to fetch mirror mappings:', error);
      }
    };

    fetchMirrorMappings();
  }, []);

  // Filter loans - exclude mirror loans
  const filteredActiveLoans = allActiveLoans.filter(loan => {
    // Type filter
    if (activeLoanFilter !== 'all' && loan.loanType !== activeLoanFilter.toUpperCase()) {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        loan.identifier?.toLowerCase().includes(query) ||
        loan.customer?.name?.toLowerCase().includes(query) ||
        loan.customer?.phone?.includes(query);
      if (!matchesSearch) return false;
    }
    
    // Exclude mirror loans
    return !loan.isMirrorLoan;
  });

  // Convert ActiveLoan to format expected by ParallelLoanView
  const convertToLoanData = (loan: ActiveLoan) => ({
    id: loan.id,
    identifier: loan.identifier,
    customer: loan.customer,
    customerName: loan.customer?.name,
    customerPhone: loan.customer?.phone,
    approvedAmount: loan.approvedAmount || loan.disbursedAmount || 0,
    interestRate: loan.interestRate || 0,
    tenure: loan.tenure || 0,
    emiAmount: loan.emiAmount || 0,
    status: loan.status,
    loanType: loan.loanType,
    company: loan.company ? {
      id: loan.company.id || '',
      name: loan.company.name,
      code: loan.company.code || ''
    } : undefined,
    createdAt: new Date().toISOString()
  });

  // Render each loan in parallel view format
  const renderLoanInParallelView = (loan: ActiveLoan, index: number) => {
    const mapping = mirrorMappings[loan.id];
    
    return (
      <div key={loan.id} className="relative">
        <ParallelLoanView
          originalLoan={convertToLoanData(loan)}
          mirrorLoan={null}
          mirrorMapping={mapping ? {
            displayColor: mapping.displayColor,
            extraEMICount: mapping.extraEMICount,
            mirrorInterestRate: mapping.mirrorInterestRate,
            mirrorTenure: mapping.mirrorTenure,
            mirrorEMIsPaid: mapping.mirrorEMIsPaid,
            extraEMIsPaid: mapping.extraEMIsPaid
          } : null}
          onViewOriginal={() => { setSelectedLoanId(loan.id); setShowLoanDetailPanel(true); }}
          onViewMirror={() => { setSelectedLoanId(loan.id); setShowLoanDetailPanel(true); }}
          showPayButton={false}
          showEmiProgress={false}
        />
        
        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-white shadow"
            onClick={() => { setSelectedLoanId(loan.id); setShowLoanDetailPanel(true); }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:bg-red-50 bg-white shadow"
            onClick={() => { setLoanToDelete(loan); setShowDeleteLoanDialog(true); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filter Toggle Bar */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  className="pl-10" 
                  placeholder="Search by name, loan#..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Type:</span>
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

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-400"></div>
          <span>Original (Left)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-400"></div>
          <span>Mirror (Right)</span>
        </div>
      </div>

      {/* Active Loans List - Parallel View */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600" />
            Active Loans (Parallel View)
            {activeLoanFilter !== 'all' && (
              <Badge className={activeLoanFilter === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                {activeLoanFilter.toUpperCase()} ONLY
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Original loans on left, mirror loans on right
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
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              <AnimatePresence>
                {filteredActiveLoans.map((loan, index) => renderLoanInParallelView(loan, index))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
