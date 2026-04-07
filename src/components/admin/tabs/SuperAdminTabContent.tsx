'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  FileText, CheckCircle, XCircle, Clock, Users, Wallet, Eye, Building2, UserPlus, Edit, Trash2, Settings, Save, User, Briefcase, Plus, TrendingUp, Activity, DollarSign, BarChart3, RefreshCw, Shield, AlertTriangle, X, MapPin, Phone, Mail, Calendar, FileCheck, CreditCard, Receipt, ExternalLink, Globe, Camera, Landmark, UserCog, Percent
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { motion } from 'framer-motion';
import type { Loan, UserItem, CompanyItem, ActiveLoanStats } from '../types';

// Helper function for status badges
export const getStatusBadge = (status: string) => {
  const config: Record<string, { className: string; label: string }> = {
    SUBMITTED: { className: 'bg-blue-100 text-blue-700', label: 'New' },
    SA_APPROVED: { className: 'bg-emerald-100 text-emerald-700', label: 'SA Approved' },
    COMPANY_APPROVED: { className: 'bg-teal-100 text-teal-700', label: 'Company Approved' },
    AGENT_APPROVED_STAGE1: { className: 'bg-cyan-100 text-cyan-700', label: 'Agent Approved' },
    LOAN_FORM_COMPLETED: { className: 'bg-violet-100 text-violet-700', label: 'Form Complete' },
    SESSION_CREATED: { className: 'bg-amber-100 text-amber-700', label: 'Sanction Created' },
    CUSTOMER_SESSION_APPROVED: { className: 'bg-green-100 text-green-700', label: 'Awaiting Final' },
    FINAL_APPROVED: { className: 'bg-green-100 text-green-700', label: 'Final Approved' },
    DISBURSED: { className: 'bg-green-100 text-green-700', label: 'Disbursed' },
    ACTIVE: { className: 'bg-green-100 text-green-700', label: 'Active' },
    REJECTED_BY_SA: { className: 'bg-red-100 text-red-700', label: 'Rejected' },
    REJECTED_BY_COMPANY: { className: 'bg-red-100 text-red-700', label: 'Rejected' },
    REJECTED_FINAL: { className: 'bg-red-100 text-red-700', label: 'Rejected' },
    SESSION_REJECTED: { className: 'bg-red-100 text-red-700', label: 'Rejected' },
  };
  const c = config[status] || { className: 'bg-gray-100 text-gray-700', label: status };
  return <Badge className={c.className}>{c.label}</Badge>;
};

// Render loan card
interface LoanCardProps {
  loan: Loan;
  index: number;
  showActions?: boolean;
  actions?: React.ReactNode;
  selected?: boolean;
  onSelect?: () => void;
}

export const renderLoanCard = ({ loan, index, showActions = true, actions, selected, onSelect }: LoanCardProps) => {
  const showSanctionDetails = loan.status === 'CUSTOMER_SESSION_APPROVED' && loan.sessionForm;
  const displayAmount = showSanctionDetails ? loan.sessionForm.approvedAmount : loan.requestedAmount;
  const displayTenure = showSanctionDetails ? loan.sessionForm.tenure : loan.requestedTenure;
  const displayInterest = showSanctionDetails ? loan.sessionForm.interestRate : loan.requestedInterestRate;
  const displayEMI = showSanctionDetails ? loan.sessionForm.emiAmount : null;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: index * 0.03 }}
      className={`p-4 border rounded-xl hover:bg-gray-50 transition-all bg-white ${
        selected ? 'border-emerald-300 bg-emerald-50' : 
        showSanctionDetails ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onSelect && (
            <Checkbox
              checked={selected}
              onCheckedChange={onSelect}
            />
          )}
          <Avatar className="h-12 w-12 bg-gradient-to-br from-emerald-400 to-teal-500">
            <AvatarFallback className="bg-transparent text-white font-semibold">
              {loan.customer?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">{loan.applicationNo}</h4>
              {getStatusBadge(loan.status)}
              {loan.fraudFlag && <Badge className="bg-red-100 text-red-700">High Risk</Badge>}
            </div>
            <p className="text-sm text-gray-500">{loan.customer?.name} • {loan.customer?.email}</p>
            <p className="text-xs text-gray-400 mt-1">{formatDate(loan.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-bold text-lg text-gray-900">{formatCurrency(displayAmount)}</p>
            {displayEMI && <p className="text-xs text-emerald-600">EMI: {formatCurrency(displayEMI)}/mo</p>}
            <p className="text-xs text-gray-500">{loan.loanType}</p>
          </div>
          {showActions && actions}
        </div>
      </div>
    </motion.div>
  );
};

// Pending Tab Component
interface PendingTabProps {
  pendingForSA: Loan[];
  selectedLoanIds: string[];
  handleSelectLoan: (id: string) => void;
  handleSelectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setSelectedLoan: (loan: Loan | null) => void;
  setShowLoanDetailsDialog: (show: boolean) => void;
  setApprovalAction: (action: 'approve' | 'reject' | 'send_back') => void;
  setShowApprovalDialog: (show: boolean) => void;
  setBulkApprovalAction: (action: 'approve' | 'reject') => void;
  setShowBulkApprovalDialog: (show: boolean) => void;
}

export function PendingTab({
  pendingForSA,
  selectedLoanIds,
  handleSelectLoan,
  handleSelectAll,
  clearSelection,
  setSelectedLoan,
  setShowLoanDetailsDialog,
  setApprovalAction,
  setShowApprovalDialog,
  setBulkApprovalAction,
  setShowBulkApprovalDialog
}: PendingTabProps) {
  const pendingLoanIds = pendingForSA.map(l => l.id);
  
  return (
    <div className="space-y-4">
      {/* Bulk Action Bar */}
      {selectedLoanIds.length > 0 && (
        <Card className="bg-emerald-50 border-emerald-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-600 text-white text-sm px-3 py-1">
                  {selectedLoanIds.length} selected
                </Badge>
                <span className="text-sm text-emerald-700">
                  {formatCurrency(selectedLoanIds.reduce((sum, id) => {
                    const loan = pendingForSA.find(l => l.id === id);
                    return sum + (loan?.requestedAmount || 0);
                  }, 0))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => { setBulkApprovalAction('reject'); setShowBulkApprovalDialog(true); }}
                >
                  <XCircle className="h-4 w-4 mr-1" />Reject All
                </Button>
                <Button 
                  size="sm" 
                  className="bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => { setBulkApprovalAction('approve'); setShowBulkApprovalDialog(true); }}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />Approve All
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection}>
                  <X className="h-4 w-4 mr-1" />Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />New Loan Applications
              </CardTitle>
              <CardDescription>Applications awaiting initial approval. Assign a company to approve.</CardDescription>
            </div>
            {pendingForSA.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-pending"
                  checked={selectedLoanIds.length === pendingLoanIds.length && pendingLoanIds.length > 0}
                  onCheckedChange={() => handleSelectAll(pendingLoanIds)}
                />
                <Label htmlFor="select-all-pending" className="text-sm font-medium cursor-pointer">
                  Select All ({pendingForSA.length})
                </Label>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingForSA.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p>No pending applications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingForSA.map((loan, index) => (
                <renderLoanCard
                  key={loan.id}
                  loan={loan}
                  index={index}
                  selected={selectedLoanIds.includes(loan.id)}
                  onSelect={() => handleSelectLoan(loan.id)}
                  actions={
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedLoan(loan); setShowLoanDetailsDialog(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" 
                        onClick={() => { setSelectedLoan(loan); setApprovalAction('reject'); setShowApprovalDialog(true); }}>
                        <XCircle className="h-4 w-4 mr-1" />Reject
                      </Button>
                      <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600" 
                        onClick={() => { setSelectedLoan(loan); setApprovalAction('approve'); setShowApprovalDialog(true); }}>
                        <CheckCircle className="h-4 w-4 mr-1" />Approve
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Final Approval Tab Component
interface FinalApprovalTabProps {
  pendingForFinal: Loan[];
  setSelectedLoan: (loan: Loan | null) => void;
  fetchLoanDetails: (id: string) => void;
  setApprovalAction: (action: 'approve' | 'reject' | 'send_back') => void;
  setShowApprovalDialog: (show: boolean) => void;
}

export function FinalApprovalTab({
  pendingForFinal,
  setSelectedLoan,
  fetchLoanDetails,
  setApprovalAction,
  setShowApprovalDialog
}: FinalApprovalTabProps) {
  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />Final Approval Queue
        </CardTitle>
        <CardDescription>Customer-approved sanctions awaiting final authorization for disbursement</CardDescription>
      </CardHeader>
      <CardContent>
        {pendingForFinal.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p>No applications awaiting final approval</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingForFinal.map((loan, index) => (
              <renderLoanCard
                key={loan.id}
                loan={loan}
                index={index}
                showActions={false}
                actions={
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50" 
                      onClick={() => { setSelectedLoan(loan); fetchLoanDetails(loan.id); }}>
                      <Eye className="h-4 w-4 mr-1" />View All
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" 
                      onClick={() => { setSelectedLoan(loan); setApprovalAction('reject'); setShowApprovalDialog(true); }}>
                      <XCircle className="h-4 w-4 mr-1" />Reject
                    </Button>
                    <Button size="sm" className="bg-green-500 hover:bg-green-600" 
                      onClick={() => { setSelectedLoan(loan); setApprovalAction('approve'); setShowApprovalDialog(true); }}>
                      <CheckCircle className="h-4 w-4 mr-1" />Final Approve
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Active Loans Tab Component
interface ActiveLoansTabProps {
  allActiveLoans: any[];
  activeLoanFilter: 'all' | 'online' | 'offline';
  setActiveLoanFilter: (filter: 'all' | 'online' | 'offline') => void;
  activeLoanStats: ActiveLoanStats;
  loading: boolean;
  fetchAllActiveLoans: () => void;
  setLoanToDelete: (loan: any) => void;
  setShowDeleteLoanDialog: (show: boolean) => void;
  setSelectedLoanId: (id: string | null) => void;
  setShowLoanDetailPanel: (show: boolean) => void;
}

export function ActiveLoansTab({
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
                          <p className="font-bold text-lg">{formatCurrency(loan.disbursedAmount || loan.approvedAmount)}</p>
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

// Users Tab Component
interface UsersTabProps {
  users: UserItem[];
  companies: CompanyItem[];
  agents: UserItem[];
  staff: UserItem[];
  cashiers: UserItem[];
  accountants: UserItem[];
  customers: UserItem[];
  userRoleFilter: string;
  setUserRoleFilter: (filter: string) => void;
  setUserForm: (form: any) => void;
  setShowUserDialog: (show: boolean) => void;
  setSelectedUser: (user: UserItem | null) => void;
  setShowDeleteConfirmDialog: (show: boolean) => void;
  handleUnlockUser: (id: string) => void;
  setShowRoleSelectDialog: (show: boolean) => void;
}

export function UsersTab({
  users,
  companies,
  agents,
  staff,
  cashiers,
  accountants,
  customers,
  userRoleFilter,
  setUserRoleFilter,
  setUserForm,
  setShowUserDialog,
  setSelectedUser,
  setShowDeleteConfirmDialog,
  handleUnlockUser,
  setShowRoleSelectDialog
}: UsersTabProps) {
  const filteredUsers = userRoleFilter === 'all' ? users : users.filter(u => u.role === userRoleFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Filter:</span>
          <Button size="sm" variant={userRoleFilter === 'all' ? 'default' : 'outline'} onClick={() => setUserRoleFilter('all')}>
            All ({users.length})
          </Button>
          <Button size="sm" variant={userRoleFilter === 'COMPANY' ? 'default' : 'outline'} onClick={() => setUserRoleFilter('COMPANY')}>
            Companies ({companies.length})
          </Button>
          <Button size="sm" variant={userRoleFilter === 'AGENT' ? 'default' : 'outline'} onClick={() => setUserRoleFilter('AGENT')}>
            Agents ({agents.length})
          </Button>
          <Button size="sm" variant={userRoleFilter === 'STAFF' ? 'default' : 'outline'} onClick={() => setUserRoleFilter('STAFF')}>
            Staff ({staff.length})
          </Button>
          <Button size="sm" variant={userRoleFilter === 'CASHIER' ? 'default' : 'outline'} onClick={() => setUserRoleFilter('CASHIER')}>
            Cashiers ({cashiers.length})
          </Button>
          <Button size="sm" variant={userRoleFilter === 'ACCOUNTANT' ? 'default' : 'outline'} onClick={() => setUserRoleFilter('ACCOUNTANT')}>
            Accountants ({accountants.length})
          </Button>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowRoleSelectDialog(true)}>
          <UserPlus className="h-4 w-4 mr-1" />Create User
        </Button>
      </div>

      <Card className="bg-white shadow-sm border-0">
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="divide-y">
              {filteredUsers.map((u) => (
                <div key={u.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className={u.role === 'COMPANY' ? 'bg-blue-100 text-blue-700' : 
                          u.role === 'AGENT' ? 'bg-cyan-100 text-cyan-700' : 
                          u.role === 'STAFF' ? 'bg-purple-100 text-purple-700' :
                          u.role === 'CASHIER' ? 'bg-orange-100 text-orange-700' :
                          u.role === 'ACCOUNTANT' ? 'bg-teal-100 text-teal-700' :
                          'bg-gray-100 text-gray-700'}>
                          {u.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{u.name}</p>
                          <Badge variant="outline">{u.role}</Badge>
                          {!u.isActive && <Badge className="bg-red-100 text-red-700">Inactive</Badge>}
                          {u.isLocked && <Badge className="bg-amber-100 text-amber-700">Locked</Badge>}
                        </div>
                        <p className="text-sm text-gray-500">{u.email}</p>
                        {u.company && <p className="text-xs text-gray-400">{typeof u.company === 'string' ? u.company : u.company.name}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {u.isLocked && (
                        <Button size="sm" variant="outline" className="text-amber-600" onClick={() => handleUnlockUser(u.id)}>
                          Unlock
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => { setSelectedUser(u); setShowDeleteConfirmDialog(true); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Products Tab Component
interface ProductsTabProps {
  products: any[];
  openEditProduct: (product: any) => void;
  handleDeleteProduct: (id: string) => void;
  setShowProductDialog: (show: boolean) => void;
}

export function ProductsTab({
  products,
  openEditProduct,
  handleDeleteProduct,
  setShowProductDialog
}: ProductsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowProductDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />Add Product
        </Button>
      </div>

      <Card className="bg-white shadow-sm border-0">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {products.map((product) => (
              <Card key={product.id} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{product.icon || '💰'}</span>
                      <CardTitle className="text-lg">{product.title}</CardTitle>
                    </div>
                    <Badge className={product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Interest</p>
                      <p className="font-medium">{product.minInterestRate}% - {product.maxInterestRate}%</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Tenure</p>
                      <p className="font-medium">{product.minTenure} - {product.maxTenure} mo</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Min Amount</p>
                      <p className="font-medium">{formatCurrency(product.minAmount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Max Amount</p>
                      <p className="font-medium">{formatCurrency(product.maxAmount)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditProduct(product)}>
                      <Edit className="h-4 w-4 mr-1" />Edit
                    </Button>
                    {!product.isPermanent && (
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteProduct(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Settings Tab Component
interface SettingsTabProps {
  settings: any;
  setSettings: (settings: any) => void;
  savingSettings: boolean;
  uploadingLogo: boolean;
  saveSettings: () => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  logoInputRef: React.RefObject<HTMLInputElement>;
  setShowResetDialog: (show: boolean) => void;
}

export function SettingsTab({
  settings,
  setSettings,
  savingSettings,
  uploadingLogo,
  saveSettings,
  handleLogoUpload,
  logoInputRef,
  setShowResetDialog
}: SettingsTabProps) {
  return (
    <div className="space-y-6">
      {/* Company Information */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input value={settings.companyTagline} onChange={(e) => setSettings({ ...settings, companyTagline: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={settings.companyEmail} onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={settings.companyPhone} onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Address</Label>
              <Input value={settings.companyAddress} onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })} />
            </div>
          </div>
          
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
              {settings.companyLogo && (
                <img src={settings.companyLogo} alt="Logo" className="h-16 w-16 object-contain border rounded" />
              )}
              <input
                type="file"
                ref={logoInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleLogoUpload}
              />
              <Button variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                <Camera className="h-4 w-4 mr-2" />
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interest Rate Settings */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-purple-600" />
            Default Interest Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Default Rate (%)</Label>
              <Input type="number" value={settings.defaultInterestRate} onChange={(e) => setSettings({ ...settings, defaultInterestRate: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Min Rate (%)</Label>
              <Input type="number" value={settings.minInterestRate} onChange={(e) => setSettings({ ...settings, minInterestRate: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Max Rate (%)</Label>
              <Input type="number" value={settings.maxInterestRate} onChange={(e) => setSettings({ ...settings, maxInterestRate: Number(e.target.value) })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-red-50 border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions that affect the entire system</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setShowResetDialog(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />Reset System Data
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={saveSettings} disabled={savingSettings}>
          <Save className="h-4 w-4 mr-2" />
          {savingSettings ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}

// Role Select Dialog Component
interface RoleSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setUserForm: (form: any) => void;
  setShowUserDialog: (show: boolean) => void;
}

export function RoleSelectDialog({
  open,
  onOpenChange,
  setUserForm,
  setShowUserDialog
}: RoleSelectDialogProps) {
  const roles = [
    { id: 'COMPANY', label: 'Company', icon: Building2, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { id: 'AGENT', label: 'Agent', icon: User, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
    { id: 'STAFF', label: 'Staff', icon: Briefcase, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { id: 'CASHIER', label: 'Cashier', icon: CreditCard, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { id: 'ACCOUNTANT', label: 'Accountant', icon: Landmark, color: 'text-teal-600', bgColor: 'bg-teal-50' },
  ];

  const handleSelectRole = (role: string) => {
    setUserForm({ name: '', email: '', phone: '', password: '', role, companyId: '', agentId: '' });
    onOpenChange(false);
    setShowUserDialog(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select User Role</DialogTitle>
          <DialogDescription>Choose the type of user you want to create</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          {roles.map((role) => (
            <Button
              key={role.id}
              variant="outline"
              className={`h-20 flex-col gap-2 ${role.bgColor} border-2 hover:border-gray-400`}
              onClick={() => handleSelectRole(role.id)}
            >
              <role.icon className={`h-6 w-6 ${role.color}`} />
              <span className="font-medium">{role.label}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
