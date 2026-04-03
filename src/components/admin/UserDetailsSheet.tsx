'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  User, Mail, Phone, MapPin, Calendar, Shield, Building2, Users, FileText,
  DollarSign, TrendingUp, Activity, CreditCard, Wallet, BarChart3, PieChart,
  Clock, CheckCircle, XCircle, AlertTriangle, Loader2, Hash, Briefcase,
  Receipt, Calculator, ArrowUpRight, ArrowDownRight, RefreshCw, Percent
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';

interface UserDetailsSheetProps {
  userId: string | null;
  open: boolean;
  onClose: () => void;
}

interface UserDetails {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  isLocked: boolean;
  createdAt: string;
  lastLoginAt?: string;
  lastActivityAt?: string;
  
  // Codes
  agentCode?: string;
  staffCode?: string;
  cashierCode?: string;
  accountantCode?: string;
  
  // Credits
  companyCredit: number;
  personalCredit: number;
  credit: number;
  
  // Personal Info
  panNumber?: string;
  aadhaarNumber?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  
  // Employment
  employmentType?: string;
  monthlyIncome?: number;
  bankName?: string;
  bankAccountNumber?: string;
  
  // Relations
  companyId?: string;
  agentId?: string;
  company?: { id: string; name: string; code: string };
  agent?: { id: string; name: string; agentCode: string };
  
  // Counts
  _count?: {
    loanApplications: number;
    disbursedLoans: number;
    payments: number;
    auditLogs: number;
    notifications: number;
  };
  
  // Role-specific data
  roleSpecificData?: any;
  
  // Loan analytics
  loanAnalytics?: {
    totalLoanAmount?: number;
    disbursedLoanAmount?: number;
    avgLoanAmount?: number;
    approvalRate?: string;
    totalProcessedAmount?: number;
    totalDisbursed?: number;
    totalSessionAmount?: number;
    avgInterestRate?: string;
    avgTenure?: number;
    totalPaymentsProcessed?: number;
    totalVerifiedAmount?: number;
    totalJournalAmount?: number;
    totalExpenseAmount?: number;
    totalRequestedAmount?: number;
    totalPaidAmount?: number;
    outstandingAmount?: number;
    overdueEMIs?: number;
    monthlyDistribution?: { month: string; count: number; amount?: number }[];
    loanTypeDistribution?: Record<string, number>;
    statusDistribution?: Record<string, number>;
    recentPayments?: any[];
    recentLocations?: any[];
    recentJournalEntries?: any[];
    loanStatusDistribution?: Record<string, number>;
    emiStatusDistribution?: Record<string, number>;
  };
  
  // Activity
  recentActivity?: any[];
  creditTransactions?: any[];
}

export default function UserDetailsSheet({ userId, open, onClose }: UserDetailsSheetProps) {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setUser(null);
      setError(null);
      setActiveTab('overview');
    }
  }, [open]);

  useEffect(() => {
    if (userId && open) {
      fetchUserDetails();
    }
  }, [userId, open]);

  const fetchUserDetails = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/user/details?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
      } else {
        setError(data.error || 'Failed to fetch user details');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      setError('Failed to fetch user details');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    const classes: Record<string, string> = {
      'SUPER_ADMIN': 'bg-purple-100 text-purple-700',
      'COMPANY': 'bg-blue-100 text-blue-700',
      'AGENT': 'bg-cyan-100 text-cyan-700',
      'STAFF': 'bg-orange-100 text-orange-700',
      'CASHIER': 'bg-green-100 text-green-700',
      'ACCOUNTANT': 'bg-teal-100 text-teal-700',
      'CUSTOMER': 'bg-gray-100 text-gray-700'
    };
    return classes[role] || 'bg-gray-100 text-gray-700';
  };

  const getRoleIcon = (role: string) => {
    const icons: Record<string, any> = {
      'SUPER_ADMIN': Shield,
      'COMPANY': Building2,
      'AGENT': User,
      'STAFF': Users,
      'CASHIER': Wallet,
      'ACCOUNTANT': Calculator,
      'CUSTOMER': User
    };
    return icons[role] || User;
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-3xl p-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className={`text-xl font-bold ${
                    user?.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                    user?.role === 'COMPANY' ? 'bg-blue-100 text-blue-700' :
                    user?.role === 'AGENT' ? 'bg-cyan-100 text-cyan-700' :
                    user?.role === 'STAFF' ? 'bg-orange-100 text-orange-700' :
                    user?.role === 'CASHIER' ? 'bg-green-100 text-green-700' :
                    user?.role === 'ACCOUNTANT' ? 'bg-teal-100 text-teal-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle className="text-xl">{user?.name || 'User Details'}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2 mt-1">
                    <Badge className={getRoleBadgeClass(user?.role || '')}>
                      {user?.role || 'Unknown'}
                    </Badge>
                    <Badge className={user?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {user?.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {user?.isLocked && (
                      <Badge className="bg-orange-100 text-orange-700">Locked</Badge>
                    )}
                  </SheetDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={fetchUserDetails}>
                <RefreshCw className="h-4 w-4 mr-1" />Refresh
              </Button>
            </div>
          </SheetHeader>

          {/* Content */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : user ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="border-b px-6">
                <TabsList className="h-12 bg-transparent">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">Overview</TabsTrigger>
                  <TabsTrigger value="analytics" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">Analytics</TabsTrigger>
                  <TabsTrigger value="activity" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">Activity</TabsTrigger>
                  <TabsTrigger value="credits" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">Credits</TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="mt-0 space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 text-emerald-600 mb-1">
                            <DollarSign className="h-4 w-4" />
                            <span className="text-xs font-medium">Company Credit</span>
                          </div>
                          <p className="text-xl font-bold text-emerald-700">{formatCurrency(user.companyCredit || 0)}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 text-amber-600 mb-1">
                            <Wallet className="h-4 w-4" />
                            <span className="text-xs font-medium">Personal Credit</span>
                          </div>
                          <p className="text-xl font-bold text-amber-700">{formatCurrency(user.personalCredit || 0)}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <FileText className="h-4 w-4" />
                            <span className="text-xs font-medium">Total Loans</span>
                          </div>
                          <p className="text-xl font-bold text-blue-700">{user._count?.loanApplications || 0}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 text-purple-600 mb-1">
                            <Activity className="h-4 w-4" />
                            <span className="text-xs font-medium">Audit Logs</span>
                          </div>
                          <p className="text-xl font-bold text-purple-700">{user._count?.auditLogs || 0}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Contact Information */}
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          Contact Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Email</p>
                              <p className="text-sm font-medium">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Phone</p>
                              <p className="text-sm font-medium">{user.phone || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 col-span-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Address</p>
                              <p className="text-sm font-medium">
                                {[user.address, user.city, user.state, user.pincode].filter(Boolean).join(', ') || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Personal Details */}
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Hash className="h-4 w-4 text-gray-400" />
                          Personal Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">PAN Number</p>
                            <p className="text-sm font-medium font-mono">{user.panNumber || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Aadhaar Number</p>
                            <p className="text-sm font-medium font-mono">
                              {user.aadhaarNumber ? `XXXX-XXXX-${user.aadhaarNumber.slice(-4)}` : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Date of Birth</p>
                            <p className="text-sm font-medium">{user.dateOfBirth ? formatDate(user.dateOfBirth) : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Employment Type</p>
                            <p className="text-sm font-medium">{user.employmentType || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Monthly Income</p>
                            <p className="text-sm font-medium">{user.monthlyIncome ? formatCurrency(user.monthlyIncome) : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Bank Name</p>
                            <p className="text-sm font-medium">{user.bankName || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Account Number</p>
                            <p className="text-sm font-medium font-mono">
                              {user.bankAccountNumber ? `XXXX-XXXX-${user.bankAccountNumber.slice(-4)}` : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Created At</p>
                            <p className="text-sm font-medium">{formatDate(user.createdAt)}</p>
                          </div>
                        </div>
                        
                        {/* Codes */}
                        {(user.agentCode || user.staffCode || user.cashierCode || user.accountantCode) && (
                          <div className="mt-4 flex gap-2 flex-wrap">
                            {user.agentCode && <Badge variant="outline" className="font-mono">Agent: {user.agentCode}</Badge>}
                            {user.staffCode && <Badge variant="outline" className="font-mono">Staff: {user.staffCode}</Badge>}
                            {user.cashierCode && <Badge variant="outline" className="font-mono">Cashier: {user.cashierCode}</Badge>}
                            {user.accountantCode && <Badge variant="outline" className="font-mono">Accountant: {user.accountantCode}</Badge>}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Role-Specific Stats */}
                    {user.roleSpecificData && Object.keys(user.roleSpecificData).length > 0 && (
                      <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            {user.role === 'COMPANY' && <Building2 className="h-4 w-4 text-blue-500" />}
                            {user.role === 'AGENT' && <User className="h-4 w-4 text-cyan-500" />}
                            {user.role === 'STAFF' && <Users className="h-4 w-4 text-orange-500" />}
                            {user.role === 'CASHIER' && <Wallet className="h-4 w-4 text-green-500" />}
                            {user.role === 'ACCOUNTANT' && <Calculator className="h-4 w-4 text-teal-500" />}
                            {user.role === 'CUSTOMER' && <User className="h-4 w-4 text-gray-500" />}
                            Role-Specific Statistics
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(user.roleSpecificData)
                              .filter(([key]) => !['loanApplications', 'agents', 'staffMembers', 'locationLogs', 'recentPayments', 'recentLocations', 'recentJournalEntries'].includes(key))
                              .map(([key, value]) => (
                                <div key={key} className="p-3 bg-gray-50 rounded-lg">
                                  <p className="text-xs text-gray-500 capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                  </p>
                                  <p className="text-lg font-bold text-gray-900">
                                    {typeof value === 'number' ? value.toLocaleString() : 
                                     typeof value === 'string' ? value : 
                                     Array.isArray(value) ? value.length : '-'}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Analytics Tab */}
                  <TabsContent value="analytics" className="mt-0 space-y-6">
                    {user.loanAnalytics ? (
                      <>
                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {user.loanAnalytics.totalLoanAmount !== undefined && (
                            <Card className="border-0 shadow-sm">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs text-gray-500">Total Loan Amount</p>
                                  <DollarSign className="h-4 w-4 text-blue-400" />
                                </div>
                                <p className="text-xl font-bold text-blue-600">
                                  {formatCurrency(user.loanAnalytics.totalLoanAmount || 0)}
                                </p>
                              </CardContent>
                            </Card>
                          )}
                          {user.loanAnalytics.disbursedLoanAmount !== undefined && (
                            <Card className="border-0 shadow-sm">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs text-gray-500">Disbursed Amount</p>
                                  <CheckCircle className="h-4 w-4 text-green-400" />
                                </div>
                                <p className="text-xl font-bold text-green-600">
                                  {formatCurrency(user.loanAnalytics.disbursedLoanAmount || 0)}
                                </p>
                              </CardContent>
                            </Card>
                          )}
                          {user.loanAnalytics.avgLoanAmount !== undefined && (
                            <Card className="border-0 shadow-sm">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs text-gray-500">Avg. Loan Amount</p>
                                  <BarChart3 className="h-4 w-4 text-purple-400" />
                                </div>
                                <p className="text-xl font-bold text-purple-600">
                                  {formatCurrency(user.loanAnalytics.avgLoanAmount || 0)}
                                </p>
                              </CardContent>
                            </Card>
                          )}
                          {user.loanAnalytics.approvalRate !== undefined && (
                            <Card className="border-0 shadow-sm">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs text-gray-500">Approval Rate</p>
                                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                                </div>
                                <p className="text-xl font-bold text-emerald-600">
                                  {user.loanAnalytics.approvalRate}%
                                </p>
                              </CardContent>
                            </Card>
                          )}
                          {user.loanAnalytics.totalProcessedAmount !== undefined && (
                            <Card className="border-0 shadow-sm">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs text-gray-500">Processed Amount</p>
                                  <FileText className="h-4 w-4 text-cyan-400" />
                                </div>
                                <p className="text-xl font-bold text-cyan-600">
                                  {formatCurrency(user.loanAnalytics.totalProcessedAmount || 0)}
                                </p>
                              </CardContent>
                            </Card>
                          )}
                          {user.loanAnalytics.avgInterestRate !== undefined && (
                            <Card className="border-0 shadow-sm">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs text-gray-500">Avg. Interest Rate</p>
                                  <Percent className="h-4 w-4 text-amber-400" />
                                </div>
                                <p className="text-xl font-bold text-amber-600">
                                  {user.loanAnalytics.avgInterestRate}%
                                </p>
                              </CardContent>
                            </Card>
                          )}
                          {user.loanAnalytics.avgTenure !== undefined && user.loanAnalytics.avgTenure > 0 && (
                            <Card className="border-0 shadow-sm">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs text-gray-500">Avg. Tenure</p>
                                  <Calendar className="h-4 w-4 text-orange-400" />
                                </div>
                                <p className="text-xl font-bold text-orange-600">
                                  {user.loanAnalytics.avgTenure} months
                                </p>
                              </CardContent>
                            </Card>
                          )}
                          {user.loanAnalytics.overdueEMIs !== undefined && (
                            <Card className="border-0 shadow-sm">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs text-gray-500">Overdue EMIs</p>
                                  <AlertTriangle className="h-4 w-4 text-red-400" />
                                </div>
                                <p className="text-xl font-bold text-red-600">
                                  {user.loanAnalytics.overdueEMIs}
                                </p>
                              </CardContent>
                            </Card>
                          )}
                          {user.loanAnalytics.outstandingAmount !== undefined && (
                            <Card className="border-0 shadow-sm">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs text-gray-500">Outstanding Amount</p>
                                  <Wallet className="h-4 w-4 text-indigo-400" />
                                </div>
                                <p className="text-xl font-bold text-indigo-600">
                                  {formatCurrency(user.loanAnalytics.outstandingAmount || 0)}
                                </p>
                              </CardContent>
                            </Card>
                          )}
                          {user.loanAnalytics.totalPaidAmount !== undefined && (
                            <Card className="border-0 shadow-sm">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs text-gray-500">Total Paid</p>
                                  <CheckCircle className="h-4 w-4 text-teal-400" />
                                </div>
                                <p className="text-xl font-bold text-teal-600">
                                  {formatCurrency(user.loanAnalytics.totalPaidAmount || 0)}
                                </p>
                              </CardContent>
                            </Card>
                          )}
                        </div>

                        {/* Monthly Distribution Chart */}
                        {user.loanAnalytics.monthlyDistribution && user.loanAnalytics.monthlyDistribution.length > 0 && (
                          <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-gray-400" />
                                Monthly Distribution
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {user.loanAnalytics.monthlyDistribution.map((item, idx) => {
                                  const maxCount = Math.max(...user.loanAnalytics!.monthlyDistribution!.map(i => i.count));
                                  const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                                  return (
                                    <div key={idx} className="flex items-center gap-4">
                                      <div className="w-16 text-sm font-medium text-gray-600">{item.month}</div>
                                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all"
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                      <div className="w-20 text-right">
                                        <span className="text-sm font-bold text-gray-700">{item.count}</span>
                                        {item.amount !== undefined && (
                                          <span className="text-xs text-gray-500 ml-1">({formatCurrency(item.amount)})</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Loan Type Distribution */}
                        {user.loanAnalytics.loanTypeDistribution && Object.keys(user.loanAnalytics.loanTypeDistribution).length > 0 && (
                          <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <PieChart className="h-4 w-4 text-gray-400" />
                                Loan Type Distribution
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {Object.entries(user.loanAnalytics.loanTypeDistribution).map(([type, count]) => {
                                  const total = Object.values(user.loanAnalytics!.loanTypeDistribution!).reduce((a, b) => a + b, 0) as number;
                                  const percentage = total > 0 ? ((count as number) / total) * 100 : 0;
                                  return (
                                    <div key={type} className="p-3 bg-gray-50 rounded-lg">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium">{type}</span>
                                        <span className="text-xs text-gray-500">{percentage.toFixed(0)}%</span>
                                      </div>
                                      <p className="text-lg font-bold">{count as number}</p>
                                      <Progress value={percentage} className="h-1 mt-2" />
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Status Distribution */}
                        {user.loanAnalytics.statusDistribution && Object.keys(user.loanAnalytics.statusDistribution).length > 0 && (
                          <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Status Distribution</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(user.loanAnalytics.statusDistribution).map(([status, count]) => (
                                  <Badge key={status} variant="outline" className="py-1.5 px-3">
                                    {status.replace(/_/g, ' ')}: <span className="font-bold ml-1">{count as number}</span>
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Recent Payments */}
                        {user.loanAnalytics.recentPayments && user.loanAnalytics.recentPayments.length > 0 && (
                          <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-gray-400" />
                                Recent Payments
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {user.loanAnalytics.recentPayments.slice(0, 5).map((payment: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                    <div>
                                      <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
                                      <p className="text-xs text-gray-500">{payment.paymentMode || 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                      <Badge className={payment.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                                        {payment.status}
                                      </Badge>
                                      <p className="text-xs text-gray-400 mt-1">{formatDate(payment.createdAt)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No analytics data available</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Activity Tab */}
                  <TabsContent value="activity" className="mt-0 space-y-6">
                    {user.recentActivity && user.recentActivity.length > 0 ? (
                      <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-4 w-4 text-gray-400" />
                            Recent Activity
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {user.recentActivity.map((activity: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                  <Activity className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">{activity.module}</Badge>
                                    <Badge variant="outline" className="text-xs">{activity.action}</Badge>
                                  </div>
                                  <p className="text-sm mt-1 truncate">{activity.description}</p>
                                  <p className="text-xs text-gray-400 mt-1">{formatDate(activity.createdAt)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No recent activity</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Credits Tab */}
                  <TabsContent value="credits" className="mt-0 space-y-6">
                    {/* Credit Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Company Credit</p>
                              <p className="text-2xl font-bold text-emerald-700">{formatCurrency(user.companyCredit || 0)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                              <User className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Personal Credit</p>
                              <p className="text-2xl font-bold text-amber-700">{formatCurrency(user.personalCredit || 0)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Credit Transactions */}
                    {user.creditTransactions && user.creditTransactions.length > 0 ? (
                      <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-gray-400" />
                            Credit Transactions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {user.creditTransactions.map((tx: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    tx.type === 'CREDIT' ? 'bg-green-100' : 'bg-red-100'
                                  }`}>
                                    {tx.type === 'CREDIT' ? (
                                      <ArrowDownRight className="h-5 w-5 text-green-600" />
                                    ) : (
                                      <ArrowUpRight className="h-5 w-5 text-red-600" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{tx.description || tx.type}</p>
                                    <p className="text-xs text-gray-500">{formatDate(tx.createdAt)}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`font-bold ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                                    {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}
                                  </p>
                                  <p className="text-xs text-gray-500">Balance: {formatCurrency(tx.balanceAfter)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No credit transactions</p>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>User not found</p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
