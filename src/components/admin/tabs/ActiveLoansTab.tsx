'use client';

import { memo, useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, FileText, Receipt, DollarSign, RefreshCw, Search, Eye } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import ParallelLoanView from '@/components/loan/ParallelLoanView';

interface Loan {
  id: string; applicationNo: string; status: string; requestedAmount: number; loanType: string;
  createdAt: string; disbursedAmount?: number; sessionForm?: any;
  customer: { id: string; name: string; email: string; phone: string; };
  approvedAmount?: number;
  interestRate?: number;
  tenure?: number;
  emiAmount?: number;
  disbursementDate?: string;
  company?: { id?: string; name: string; code?: string };
  identifier?: string;
  nextEmi?: { dueDate: string; amount: number; status: string };
}

interface Props {
  loans: Loan[];
  stats: { totalOnline: number; totalOffline: number; totalOnlineAmount: number; totalOfflineAmount: number };
  onRefresh: () => void;
  onViewLoan: (loan: Loan) => void;
}

function ActiveLoansTab({ loans, stats, onRefresh, onViewLoan }: Props) {
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
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

  const filteredLoans = useMemo(() => {
    let result = loans;
    
    // Filter by type
    if (filter !== 'all') {
      result = result.filter(loan => loan.loanType === filter.toUpperCase());
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(loan => 
        loan.applicationNo?.toLowerCase().includes(query) ||
        loan.identifier?.toLowerCase().includes(query) ||
        loan.customer?.name?.toLowerCase().includes(query) ||
        loan.customer?.phone?.includes(query) ||
        loan.company?.name?.toLowerCase().includes(query)
      );
    }
    
    // Exclude mirror loans from being shown separately
    result = result.filter(loan => {
      const mapping = mirrorMappings[loan.id];
      const isMirror = mapping?.mirrorLoanId === loan.id;
      return !isMirror;
    });
    
    return result;
  }, [loans, filter, searchQuery, mirrorMappings]);

  // Convert Loan to format expected by ParallelLoanView
  const convertToLoanData = (loan: Loan) => ({
    id: loan.id,
    identifier: loan.identifier || loan.applicationNo,
    applicationNo: loan.applicationNo,
    customer: loan.customer,
    customerName: loan.customer?.name,
    customerPhone: loan.customer?.phone,
    approvedAmount: loan.approvedAmount || loan.disbursedAmount || loan.sessionForm?.approvedAmount || loan.requestedAmount,
    interestRate: loan.interestRate || loan.sessionForm?.interestRate || 0,
    tenure: loan.tenure || loan.sessionForm?.tenure || 0,
    emiAmount: loan.emiAmount || loan.sessionForm?.emiAmount || 0,
    status: loan.status,
    loanType: loan.loanType,
    disbursementDate: loan.disbursementDate || loan.sessionForm?.disbursementDate,
    createdAt: loan.createdAt,
    company: loan.company,
    nextEmi: loan.nextEmi
  });

  // Render each loan in parallel view format
  const renderLoanInParallelView = (loan: Loan, index: number) => {
    const mapping = mirrorMappings[loan.id];
    
    return (
      <ParallelLoanView
        key={loan.id}
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
        onViewOriginal={() => onViewLoan(loan)}
        onViewMirror={() => onViewLoan(loan)}
        onPayEmi={() => onViewLoan(loan)}
        showPayButton={true}
        showEmiProgress={true}
      />
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
              <div className="relative min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  className="pl-10" 
                  placeholder="Search by name, loan#, phone..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Type:</span>
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

      {/* Loans List in Parallel View */}
      <Card className="bg-white shadow-sm border-0">
        <CardContent className="p-4">
          {filteredLoans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No active loans found</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              <AnimatePresence>
                {filteredLoans.map((loan, index) => renderLoanInParallelView(loan, index))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(ActiveLoansTab);
