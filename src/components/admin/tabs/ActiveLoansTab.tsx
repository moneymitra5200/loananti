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

interface MirrorLoanData {
  id: string;
  applicationNo?: string;
  identifier?: string;
  status?: string;
  loanType?: string;
  disbursedAmount?: number;
  approvedAmount?: number;
  disbursementDate?: string;
  createdAt?: string;
  interestRate?: number;
  tenure?: number;
  emiAmount?: number;
  company?: { id?: string; name: string; code?: string };
  customer?: { id?: string; name?: string; phone?: string; email?: string };
  sessionForm?: {
    approvedAmount?: number;
    interestRate?: number;
    tenure?: number;
    emiAmount?: number;
    disbursementDate?: string;
  };
}

interface MirrorMapping {
  id: string;
  originalLoanId: string;
  mirrorLoanId: string | null;
  originalCompanyId: string;
  mirrorCompanyId: string;
  displayColor: string | null;
  extraEMICount?: number | null;
  mirrorTenure?: number | null;
  originalTenure?: number | null;
  originalInterestRate?: number | null;
  mirrorInterestRate?: number | null;
  mirrorEMIsPaid?: number | null;
  extraEMIsPaid?: number | null;
  originalEMIAmount?: number | null;
  mirrorLoan: MirrorLoanData | null;
  originalLoan: Loan | null;
  mirrorCompany: { id: string; name: string; code: string } | null;
  originalCompany: { id: string; name: string; code: string } | null;
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
  const [mirrorMappings, setMirrorMappings] = useState<Record<string, MirrorMapping>>({});

  // Fetch mirror mappings on mount
  useEffect(() => {
    const fetchMirrorMappings = async () => {
      try {
        const res = await fetch('/api/mirror-loan?action=all-mappings');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.mappings) {
            const mappingMap: Record<string, MirrorMapping> = {};
            for (const mapping of data.mappings) {
              // Map by original loan ID
              mappingMap[mapping.originalLoanId] = mapping;
              // Also map by mirror loan ID for filtering
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
    company: loan.company ? {
      id: loan.company.id || '',
      name: loan.company.name,
      code: loan.company.code || ''
    } : undefined,
    nextEmi: loan.nextEmi
  });

  // Convert MirrorLoanData to format expected by ParallelLoanView
  const convertMirrorToLoanData = (mirrorLoan: MirrorLoanData | null, mapping: MirrorMapping, originalLoan: Loan) => {
    // If there's an actual mirror loan record, use it
    if (mirrorLoan) {
      return {
        id: mirrorLoan.id,
        identifier: mirrorLoan.identifier || mirrorLoan.applicationNo,
        applicationNo: mirrorLoan.applicationNo,
        customer: mirrorLoan.customer,
        customerName: mirrorLoan.customer?.name,
        customerPhone: mirrorLoan.customer?.phone,
        approvedAmount: mirrorLoan.approvedAmount || mirrorLoan.disbursedAmount || mirrorLoan.sessionForm?.approvedAmount || 0,
        interestRate: mapping.mirrorInterestRate || mirrorLoan.interestRate || mirrorLoan.sessionForm?.interestRate || 0,
        tenure: mapping.mirrorTenure || mirrorLoan.tenure || mirrorLoan.sessionForm?.tenure || 0,
        emiAmount: mapping.originalEMIAmount || mirrorLoan.emiAmount || mirrorLoan.sessionForm?.emiAmount || 0,
        status: mirrorLoan.status || 'ACTIVE',
        loanType: mirrorLoan.loanType,
        disbursementDate: mirrorLoan.disbursementDate || mirrorLoan.sessionForm?.disbursementDate,
        createdAt: mirrorLoan.createdAt || '',
        company: mirrorLoan.company ? {
          id: mirrorLoan.company.id || '',
          name: mirrorLoan.company.name,
          code: mirrorLoan.company.code || ''
        } : mapping.mirrorCompany ? {
          id: mapping.mirrorCompany.id,
          name: mapping.mirrorCompany.name,
          code: mapping.mirrorCompany.code
        } : undefined,
        nextEmi: undefined
      };
    }
    
    // If no mirror loan record exists (offline loans), create a virtual mirror loan from mapping data
    if (mapping && mapping.mirrorCompanyId) {
      return {
        id: `virtual-mirror-${mapping.id}`,
        identifier: `MIRROR-${originalLoan.applicationNo}`,
        applicationNo: `MIRROR-${originalLoan.applicationNo}`,
        customer: originalLoan.customer,
        customerName: originalLoan.customer?.name,
        customerPhone: originalLoan.customer?.phone,
        approvedAmount: originalLoan.approvedAmount || originalLoan.disbursedAmount || originalLoan.sessionForm?.approvedAmount || 0,
        interestRate: mapping.mirrorInterestRate || 15,
        tenure: mapping.mirrorTenure || 0,
        emiAmount: mapping.originalEMIAmount || 0,
        status: 'ACTIVE',
        loanType: originalLoan.loanType,
        disbursementDate: originalLoan.disbursementDate || originalLoan.sessionForm?.disbursementDate,
        createdAt: originalLoan.createdAt,
        company: mapping.mirrorCompany ? {
          id: mapping.mirrorCompany.id,
          name: mapping.mirrorCompany.name,
          code: mapping.mirrorCompany.code
        } : undefined,
        nextEmi: undefined
      };
    }
    
    return null;
  };

  // Render each loan in parallel view format
  const renderLoanInParallelView = (loan: Loan, index: number) => {
    const mapping = mirrorMappings[loan.id];
    
    // Get the actual mirror loan data from the mapping, or create virtual one from mapping data
    const mirrorLoanData = mapping ? convertMirrorToLoanData(mapping.mirrorLoan, mapping, loan) : null;
    
    return (
      <ParallelLoanView
        key={loan.id}
        originalLoan={convertToLoanData(loan)}
        mirrorLoan={mirrorLoanData}
        mirrorMapping={mapping ? {
          displayColor: mapping.displayColor,
          extraEMICount: mapping.extraEMICount ?? undefined,
          mirrorInterestRate: mapping.mirrorInterestRate ?? undefined,
          mirrorTenure: mapping.mirrorTenure ?? undefined,
          mirrorEMIsPaid: mapping.mirrorEMIsPaid ?? undefined,
          extraEMIsPaid: mapping.extraEMIsPaid ?? undefined,
          mirrorCompanyId: mapping.mirrorCompanyId,
          originalCompanyId: mapping.originalCompanyId
        } : null}
        onViewOriginal={() => onViewLoan(loan)}
        onViewMirror={() => {
          // If there's a mirror loan record, view it; otherwise view original
          if (mapping?.mirrorLoan) {
            onViewLoan(mapping.mirrorLoan as unknown as Loan);
          } else {
            onViewLoan(loan);
          }
        }}
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
