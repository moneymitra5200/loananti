'use client';

import { memo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Banknote, Eye, Search, RefreshCw, FileText, Receipt } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import type { Loan } from './types';
import ParallelLoanView from '@/components/loan/ParallelLoanView';

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

interface ActiveLoansTabProps {
  activeLoans: Loan[];
  setSelectedLoanId: (id: string | null) => void;
  setShowLoanDetailPanel: (show: boolean) => void;
  onRefresh?: () => void;
}

function ActiveLoansTabComponent({ 
  activeLoans, 
  setSelectedLoanId, 
  setShowLoanDetailPanel,
  onRefresh 
}: ActiveLoansTabProps) {
  const [mirrorMappings, setMirrorMappings] = useState<Record<string, MirrorMapping>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loanTypeFilter, setLoanTypeFilter] = useState('all');

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

  // Convert Loan to format expected by ParallelLoanView
  const convertToLoanData = (loan: Loan) => ({
    id: loan.id,
    identifier: loan.identifier || loan.applicationNo,
    applicationNo: loan.applicationNo,
    customer: loan.customer,
    customerName: loan.customer?.name,
    customerPhone: loan.customer?.phone,
    approvedAmount: loan.approvedAmount || loan.sessionForm?.approvedAmount || 0,
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
    nextEmi: loan.nextEmi,
    emiSchedules: loan.emiSchedules
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
        approvedAmount: originalLoan.approvedAmount || originalLoan.sessionForm?.approvedAmount || 0,
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

  // Filter out mirror loans (they will be shown with original)
  const filteredLoans = activeLoans.filter(loan => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      loan.applicationNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.identifier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.customer?.phone?.includes(searchQuery) ||
      loan.customer?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    
    // Loan type filter
    const matchesType = loanTypeFilter === 'all' || loan.loanType === loanTypeFilter.toUpperCase();
    
    // Exclude mirror loans from being shown separately
    const mapping = mirrorMappings[loan.id];
    const isMirror = mapping?.mirrorLoanId === loan.id;
    
    return matchesSearch && matchesStatus && matchesType && !isMirror;
  });

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
        onViewOriginal={() => { setSelectedLoanId(loan.id); setShowLoanDetailPanel(true); }}
        onViewMirror={() => { setSelectedLoanId(loan.id); setShowLoanDetailPanel(true); }}
        onPayEmi={() => { setSelectedLoanId(loan.id); setShowLoanDetailPanel(true); }}
        showPayButton={true}
        showEmiProgress={true}
      />
    );
  };

  // Calculate stats
  const stats = {
    total: filteredLoans.length,
    online: filteredLoans.filter(l => l.loanType === 'ONLINE').length,
    offline: filteredLoans.filter(l => l.loanType === 'OFFLINE').length,
    totalAmount: filteredLoans.reduce((sum, l) => sum + (l.approvedAmount || l.sessionForm?.approvedAmount || 0), 0)
  };

  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-600" />
              Active Loans (Parallel View)
            </CardTitle>
            <CardDescription>All active loans - Original on left, Mirror on right</CardDescription>
          </div>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-gray-50 border">
            <p className="text-xs text-gray-500">Total Active</p>
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
            <p className="text-xs text-blue-600">Online</p>
            <p className="text-xl font-bold text-blue-700">{stats.online}</p>
          </div>
          <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
            <p className="text-xs text-purple-600">Offline</p>
            <p className="text-xl font-bold text-purple-700">{stats.offline}</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <p className="text-xs text-emerald-600">Total Amount</p>
            <p className="text-lg font-bold text-emerald-700">{formatCurrency(stats.totalAmount)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              className="pl-10" 
              placeholder="Search by name, loan#, phone..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          <Select value={loanTypeFilter} onValueChange={setLoanTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="online">
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Online
                </div>
              </SelectItem>
              <SelectItem value="offline">
                <div className="flex items-center gap-1">
                  <Receipt className="h-3 w-3" /> Offline
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-emerald-400"></div>
            <span>Original (Left)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-400"></div>
            <span>Mirror (Right)</span>
          </div>
        </div>

        {/* Loans List */}
        {filteredLoans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Banknote className="h-12 w-12 mx-auto mb-3 text-gray-300" />
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
  );
}

export default memo(ActiveLoansTabComponent);
