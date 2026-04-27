'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  IndianRupee, User, Users, ArrowUpRight, ArrowDownRight, FileText, Clock, 
  CheckCircle, AlertTriangle, Eye, Download, Filter, Search, RefreshCw,
  CreditCard, Wallet, TrendingUp, Calendar, Phone, Mail, Building2,
  Upload, X, ImageIcon, FileCheck, MinusCircle, PlusCircle, History,
  AlertCircle, Loader2, ArrowDown, Receipt, BookOpen, Repeat, Pause, Play, XCircle, Sun
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface UserWithCredit {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  personalCredit: number;
  companyCredit: number;
  credit: number;
  company?: { name: string };
  _count?: { creditTransactions: number };
  createdAt: string;
}

interface CreditTransaction {
  id: string;
  userId: string;
  transactionType: string;
  amount: number;
  paymentMode: string;
  creditType: string;
  companyBalanceAfter?: number;
  personalBalanceAfter?: number;
  balanceAfter: number;
  sourceType: string;
  loanApplicationId?: string;
  emiScheduleId?: string;
  customerId?: string;
  installmentNumber?: number;
  customerName?: string;
  customerPhone?: string;
  loanApplicationNo?: string;
  emiDueDate?: string;
  emiAmount?: number;
  principalComponent?: number;
  interestComponent?: number;
  chequeNumber?: string;
  chequeDate?: string;
  bankRefNumber?: string;
  utrNumber?: string;
  proofDocument?: string;
  proofType?: string;
  proofVerified: boolean;
  description?: string;
  remarks?: string;
  transactionDate: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface LoanWithEMI {
  id: string;
  applicationNo: string;
  status: string;
  loanType: string;
  requestedAmount: number;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  emiSchedules: Array<{
    id: string;
    installmentNumber: number;
    dueDate: string;
    totalAmount: number;
    paidAmount: number;
    paymentStatus: string;
    paidDate?: string;
    paymentMode?: string;
  }>;
  sessionForm?: {
    approvedAmount: number;
    interestRate: number;
    tenure: number;
    emiAmount: number;
  };
  payments: Array<{
    id: string;
    amount: number;
    paymentMode: string;
    createdAt: string;
    status: string;
  }>;
}

export default function CreditManagementPage() {
  const [usersWithCredit, setUsersWithCredit] = useState<UserWithCredit[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loansWithEMI, setLoansWithEMI] = useState<LoanWithEMI[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithCredit | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<LoanWithEMI | null>(null);
  const [showDeductDialog, setShowDeductDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showLoanPassbookDialog, setShowLoanPassbookDialog] = useState(false);
  const [showUserPassbookDialog, setShowUserPassbookDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CreditTransaction | null>(null);
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterCreditType, setFilterCreditType] = useState('all');

  // Credit Requests (settlement requests from roles â†’ SA)
  const [creditRequests, setCreditRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  const fetchCreditRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch('/api/credit/settlement?all=true');
      const data = await res.json();
      if (data.success) setCreditRequests(data.settlements || []);
    } catch { /* ignore */ } finally { setLoadingRequests(false); }
  };

  const handleApproveRequest = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      const res = await fetch('/api/credit/settlement', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlementId: requestId, action: 'COMPLETE' })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'âœ… Settlement Approved', description: 'Credit deducted from role and added to your account.' });
        fetchCreditRequests();
        fetchData(true);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to approve', variant: 'destructive' });
      }
    } catch { toast({ title: 'Error', description: 'Network error', variant: 'destructive' }); }
    finally { setProcessingRequest(null); }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequest(requestId + '_reject');
    try {
      const res = await fetch('/api/credit/settlement', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlementId: requestId, action: 'REJECT' })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Request Rejected', description: 'Settlement request has been rejected.' });
        fetchCreditRequests();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to reject', variant: 'destructive' });
      }
    } catch { toast({ title: 'Error', description: 'Network error', variant: 'destructive' }); }
    finally { setProcessingRequest(null); }
  };
  
  // Today Credit
  const [todayCreditDate, setTodayCreditDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [todayCreditData, setTodayCreditData] = useState<any>(null);
  const [todayCreditLoading, setTodayCreditLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [dateRangeMode, setDateRangeMode] = useState(false);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchTodayCredit = async (date?: string, start?: string, end?: string) => {
    setTodayCreditLoading(true);
    try {
      const url = (start && end)
        ? `/api/credit/today-credit?startDate=${start}&endDate=${end}`
        : `/api/credit/today-credit?date=${date || todayCreditDate}`;
      const res = await fetch(url);
      const d = await res.json();
      if (d.success) setTodayCreditData(d);
    } catch { } finally { setTodayCreditLoading(false); }
  };

  // Auto-refresh state - disabled by default to prevent DB connection limit issues
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasFetchedRef = useRef(false);
  
  // Deduct form state
  const [deductAmount, setDeductAmount] = useState('');
  const [deductCreditType, setDeductCreditType] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL');
  const [deductRemarks, setDeductRemarks] = useState('');
  const [deducting, setDeducting] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalPersonalCredit: 0,
    totalCompanyCredit: 0,
    totalUsers: 0,
    totalTransactions: 0,
    totalEMICollected: 0
  });

  // Wrap fetchData in useCallback
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      // Fetch all users with credits (users with role other than CUSTOMER)
      const usersResponse = await fetch('/api/user');
      const usersData = await usersResponse.json();
      
      if (usersData.users) {
        // Filter users with non-customer roles (include all, even with 0 credit)
        // Exclude SUPER_ADMIN - they manage others' credits, not their own
        const usersWithCredits = usersData.users
          .filter((u: UserWithCredit) => 
            u.role !== 'CUSTOMER' && 
            u.role !== 'ACCOUNTANT' &&
            u.role !== 'SUPER_ADMIN'
          )
          .map((u: UserWithCredit) => ({
            ...u,
            personalCredit: u.personalCredit || 0,
            companyCredit: u.companyCredit || 0,
            credit: (u.personalCredit || 0) + (u.companyCredit || 0)
          }))
          // Sort by total credit descending
          .sort((a: UserWithCredit, b: UserWithCredit) => (b.credit || 0) - (a.credit || 0));
        
        setUsersWithCredit(usersWithCredits);
        
        // Calculate stats
        const totalPersonal = usersWithCredits.reduce((sum: number, u: UserWithCredit) => sum + (u.personalCredit || 0), 0);
        const totalCompany = usersWithCredits.reduce((sum: number, u: UserWithCredit) => sum + (u.companyCredit || 0), 0);

        setStats(prev => ({
          ...prev,
          totalPersonalCredit: totalPersonal,
          totalCompanyCredit: totalCompany,
          totalUsers: usersWithCredits.filter((u: UserWithCredit) => u.credit > 0).length
        }));
      }
      
      // Fetch all credit transactions
      const txResponse = await fetch('/api/credit?action=all-transactions');
      const txData = await txResponse.json();
      if (txData.success) {
        setTransactions(txData.transactions || []);
        setStats(prev => ({ ...prev, totalTransactions: (txData.transactions || []).length }));
        
        // Calculate total EMI collected
        const emiTotal = (txData.transactions || [])
          .filter((tx: CreditTransaction) => tx.sourceType === 'EMI_PAYMENT')
          .reduce((sum: number, tx: CreditTransaction) => sum + tx.amount, 0);
        setStats(prev => ({ ...prev, totalEMICollected: emiTotal }));
      }

      // Fetch loans with EMI details for passbook
      const loansResponse = await fetch('/api/loan/all-active');
      const loansData = await loansResponse.json();
      if (loansData.loans) {
        setLoansWithEMI(loansData.loans);
      }
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching credit data:', error);
      if (!isRefresh) {
        toast({
          title: 'Error',
          description: 'Failed to fetch credit data',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchData();
    }
  }, [fetchData]);

  // Auto-refresh polling every 30 seconds (reduced to prevent DB connection limit issues)
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchData(true);
      }, 300000); // Refresh every 5 minutes
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, fetchData]);

  const handleDeductCredit = async () => {
    if (!selectedUser) return;
    
    const amount = parseFloat(deductAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive'
      });
      return;
    }
    
    const availableCredit = deductCreditType === 'PERSONAL' 
      ? selectedUser.personalCredit 
      : selectedUser.companyCredit;
    
    if (amount > availableCredit) {
      toast({
        title: 'Insufficient Credit',
        description: `Available ${deductCreditType.toLowerCase()} credit: â‚¹${availableCredit}`,
        variant: 'destructive'
      });
      return;
    }
    
    if (!deductRemarks.trim()) {
      toast({
        title: 'Remarks Required',
        description: 'Please provide a reason for deducting credit',
        variant: 'destructive'
      });
      return;
    }
    
    setDeducting(true);
    try {
      const response = await fetch('/api/credit/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: amount,
          creditType: deductCreditType,
          remarks: deductRemarks
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Credit Deducted',
          description: `â‚¹${amount} deducted from ${selectedUser.name}'s ${deductCreditType.toLowerCase()} credit. The amount has been added to your credit.`
        });
        setShowDeductDialog(false);
        setSelectedUser(null);
        setDeductAmount('');
        setDeductRemarks('');
        fetchData(true); // Refresh data after deduction
      } else {
        toast({
          title: 'Error',
          description: data.details || data.error || 'Failed to deduct credit',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error deducting credit:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to deduct credit',
        variant: 'destructive'
      });
    } finally {
      setDeducting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getRoleBadge = (role: string) => {
    const config: Record<string, { className: string; label: string }> = {
      SUPER_ADMIN: { className: 'bg-purple-100 text-purple-700', label: 'Super Admin' },
      COMPANY: { className: 'bg-blue-100 text-blue-700', label: 'Company' },
      AGENT: { className: 'bg-emerald-100 text-emerald-700', label: 'Agent' },
      STAFF: { className: 'bg-amber-100 text-amber-700', label: 'Staff' },
      CASHIER: { className: 'bg-cyan-100 text-cyan-700', label: 'Cashier' },
      ACCOUNTANT: { className: 'bg-violet-100 text-violet-700', label: 'Accountant' },
      CUSTOMER: { className: 'bg-gray-100 text-gray-700', label: 'Customer' }
    };
    const { className, label } = config[role] || { className: 'bg-gray-100 text-gray-700', label: role };
    return <Badge className={className}>{label}</Badge>;
  };

  const getTransactionTypeBadge = (type: string) => {
    const config: Record<string, { className: string; label: string; icon: React.ElementType }> = {
      CREDIT_INCREASE: { className: 'bg-emerald-100 text-emerald-800', label: 'Credit +', icon: PlusCircle },
      CREDIT_DECREASE: { className: 'bg-red-100 text-red-800', label: 'Credit -', icon: MinusCircle },
      PERSONAL_COLLECTION: { className: 'bg-amber-100 text-amber-800', label: 'Personal +', icon: PlusCircle },
      PERSONAL_CLEARANCE: { className: 'bg-blue-100 text-blue-800', label: 'Cleared', icon: CheckCircle },
      SETTLEMENT: { className: 'bg-purple-100 text-purple-800', label: 'Settlement', icon: ArrowDown },
      ADJUSTMENT: { className: 'bg-gray-100 text-gray-800', label: 'Adjustment', icon: ArrowDownRight }
    };
    const { className, label, icon: Icon } = config[type] || { className: 'bg-gray-100 text-gray-800', label: type, icon: IndianRupee };
    return <Badge className={className}><Icon className="h-3 w-3 mr-1" />{label}</Badge>;
  };

  const getPaymentModeIcon = (mode: string) => {
    switch (mode) {
      case 'CASH': return <Wallet className="h-4 w-4 text-emerald-600" />;
      case 'CHEQUE': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'ONLINE':
      case 'UPI':
      case 'BANK_TRANSFER': return <CreditCard className="h-4 w-4 text-purple-600" />;
      case 'SYSTEM': return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default: return <IndianRupee className="h-4 w-4" />;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      PENDING: { className: 'bg-amber-100 text-amber-700', label: 'Pending' },
      PAID: { className: 'bg-emerald-100 text-emerald-700', label: 'Paid' },
      PARTIALLY_PAID: { className: 'bg-blue-100 text-blue-700', label: 'Partial' },
      OVERDUE: { className: 'bg-red-100 text-red-700', label: 'Overdue' },
      WAIVED: { className: 'bg-gray-100 text-gray-700', label: 'Waived' }
    };
    const { className, label } = config[status] || { className: 'bg-gray-100 text-gray-700', label: status };
    return <Badge className={className}>{label}</Badge>;
  };

  const filteredUsers = usersWithCredit.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesCredit = filterCreditType === 'all' || 
      (filterCreditType === 'personal' && u.personalCredit > 0) ||
      (filterCreditType === 'company' && u.companyCredit > 0);
    return matchesSearch && matchesRole && matchesCredit;
  });

  // Get user's transactions
  const getUserTransactions = (userId: string) => {
    return transactions.filter(tx => tx.userId === userId);
  };

  // Get EMI transactions for a loan
  const getLoanEMITransactions = (loanId: string) => {
    return transactions.filter(tx => tx.loanApplicationId === loanId && tx.sourceType === 'EMI_PAYMENT');
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm">Total Personal Credits</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalPersonalCredit)}</p>
                  <p className="text-xs text-amber-200 mt-1">From all roles</p>
                </div>
                <div className="p-3 bg-white/20 rounded-full">
                  <User className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Total Company Credits</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalCompanyCredit)}</p>
                  <p className="text-xs text-emerald-200 mt-1">CASH payments only</p>
                </div>
                <div className="p-3 bg-white/20 rounded-full">
                  <Building2 className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Users with Credit</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-blue-200 mt-1">Active collectors</p>
                </div>
                <div className="p-3 bg-white/20 rounded-full">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Total Transactions</p>
                  <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                  <p className="text-xs text-purple-200 mt-1">All time</p>
                </div>
                <div className="p-3 bg-white/20 rounded-full">
                  <History className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-100 text-sm">Total EMI Collected</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalEMICollected)}</p>
                  <p className="text-xs text-cyan-200 mt-1">Via credit system</p>
                </div>
                <div className="p-3 bg-white/20 rounded-full">
                  <Receipt className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Auto-refresh Controls */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
        <div className="flex items-center gap-2">
          {autoRefresh ? (
            <Repeat className="h-4 w-4 text-emerald-600" />
          ) : (
            <Pause className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-sm font-medium">
            {autoRefresh ? 'Auto-refresh ON (every 30s)' : 'Auto-refresh OFF'}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="h-7"
          >
            {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
          <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Credit Management Rules:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li><strong>Company Credit:</strong> Only increases when money is collected via CASH payment mode</li>
                <li><strong>Personal Credit:</strong> Increases when money is collected via any other mode (requires proof)</li>
                <li><strong>Minus Credit:</strong> When you minus/deduct credit from any role, it automatically transfers to YOUR credit (Super Admin)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === 'today') fetchTodayCredit(todayCreditDate); }}>
        <TabsList className="bg-white border flex flex-wrap gap-0.5">
          <TabsTrigger value="today" className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-500" />
            Today Credit
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Users with Credit
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            All Transactions
          </TabsTrigger>
          <TabsTrigger value="passbook" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Loan Passbook
          </TabsTrigger>
        </TabsList>

        {/* Today Credit Tab */}
        <TabsContent value="today" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sun className="h-5 w-5 text-amber-500" />
                    {dateRangeMode ? 'Credit by Date Range' : 'Today Credit'} — Who Collected What
                  </CardTitle>
                  <CardDescription>
                    Credit increases per user with per-company breakdown (Super Admin excluded)
                  </CardDescription>
                </div>
                {/* Date controls */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDateRangeMode(!dateRangeMode)}
                      className={`text-xs px-2 py-1 rounded-full border transition-all ${dateRangeMode ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 text-gray-600'}`}
                    >
                      {dateRangeMode ? '📅 Range Mode' : '📅 Single Date'}
                    </button>
                    <Button variant="outline" size="icon" className="h-8 w-8"
                      onClick={() => dateRangeMode ? fetchTodayCredit(undefined, startDate, endDate) : fetchTodayCredit(todayCreditDate)}
                      disabled={todayCreditLoading}>
                      <RefreshCw className={`h-4 w-4 ${todayCreditLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  {dateRangeMode ? (
                    <div className="flex items-center gap-2">
                      <Input type="date" value={startDate}
                        onChange={e => { setStartDate(e.target.value); fetchTodayCredit(undefined, e.target.value, endDate); }}
                        className="w-36 h-8 text-sm" />
                      <span className="text-gray-400 text-sm">to</span>
                      <Input type="date" value={endDate}
                        onChange={e => { setEndDate(e.target.value); fetchTodayCredit(undefined, startDate, e.target.value); }}
                        className="w-36 h-8 text-sm" />
                    </div>
                  ) : (
                    <Input type="date" value={todayCreditDate}
                      onChange={e => { setTodayCreditDate(e.target.value); fetchTodayCredit(e.target.value); }}
                      className="w-40 h-8 text-sm" />
                  )}
                </div>
              </div>

              {/* Summary chips */}
              {todayCreditData && (
                <div className="flex flex-col gap-3 mt-3">
                  {/* Grand summary row */}
                  <div className="flex flex-wrap gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <p className="text-xs text-emerald-600">Total Credit Increase</p>
                      <p className="font-bold text-emerald-700">{formatCurrency(todayCreditData.summary.total)}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <p className="text-xs text-amber-600">Personal Credit</p>
                      <p className="font-bold text-amber-700">{formatCurrency(todayCreditData.summary.personal)}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <p className="text-xs text-blue-600">Company Credit</p>
                      <p className="font-bold text-blue-700">{formatCurrency(todayCreditData.summary.company)}</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                      <p className="text-xs text-purple-600">Users Active</p>
                      <p className="font-bold text-purple-700">{todayCreditData.summary.userCount}</p>
                    </div>
                    {/* Cash vs Online */}
                    {(todayCreditData.summary.cash > 0 || todayCreditData.summary.online > 0) && (
                      <>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                          <p className="text-xs text-gray-500">💵 Cash</p>
                          <p className="font-bold text-gray-700">{formatCurrency(todayCreditData.summary.cash || 0)}</p>
                        </div>
                        <div className="bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-2">
                          <p className="text-xs text-cyan-600">🌐 Online / UPI</p>
                          <p className="font-bold text-cyan-700">{formatCurrency(todayCreditData.summary.online || 0)}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Per-company grand breakdown */}
                  {(() => {
                    // Aggregate all company breakdowns across all users
                    const companyTotals = new Map<string, { name: string; amount: number }>();
                    for (const u of todayCreditData.users) {
                      for (const cb of (u.companyBreakdown || [])) {
                        if (!companyTotals.has(cb.companyId)) {
                          companyTotals.set(cb.companyId, { name: cb.companyName, amount: 0 });
                        }
                        companyTotals.get(cb.companyId)!.amount += cb.amount;
                      }
                    }
                    const entries = [...companyTotals.entries()].sort((a, b) => b[1].amount - a[1].amount);
                    if (entries.length === 0) return null;
                    return (
                      <div className="border border-blue-100 bg-blue-50/60 rounded-xl p-3">
                        <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" /> Collection by Company
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {entries.map(([id, co]) => (
                            <div key={id} className="flex items-center gap-1.5 bg-white border border-blue-200 rounded-lg px-2.5 py-1.5">
                              <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                              <span className="text-xs font-medium text-blue-800">{co.name}</span>
                              <span className="text-xs font-bold text-emerald-700 ml-1">{formatCurrency(co.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {todayCreditLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>
              ) : !todayCreditData ? (
                <div className="text-center py-10 text-gray-400">
                  <Sun className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Click the refresh button to load credit data</p>
                  <Button className="mt-3" onClick={() => fetchTodayCredit(todayCreditDate)}>Load Data</Button>
                </div>
              ) : todayCreditData.users.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <IndianRupee className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No credit increases recorded for the selected period</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayCreditData.users.map((u: any) => (
                    <div key={u.userId} className="border rounded-xl overflow-hidden">
                      {/* User header row */}
                      <button
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                        onClick={() => setExpandedUser(expandedUser === u.userId ? null : u.userId)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {u.userName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900">{u.userName}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              {getRoleBadge(u.userRole)}
                              {u.userCompanyName && <span className="text-xs text-gray-500">{u.userCompanyName}</span>}
                              {/* Inline per-company chips */}
                              {u.companyBreakdown && u.companyBreakdown.length > 0 && (
                                u.companyBreakdown.map((cb: any) => (
                                  <span key={cb.companyId} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                    <Building2 className="h-2.5 w-2.5" />
                                    {cb.companyName}: <span className="text-emerald-700 font-bold ml-0.5">{formatCurrency(cb.amount)}</span>
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right flex-shrink-0 ml-3">
                          <div>
                            <p className="font-bold text-emerald-700 text-lg">{formatCurrency(u.totalIncrease)}</p>
                            <p className="text-xs text-gray-500">{u.transactionCount} transaction{u.transactionCount !== 1 ? 's' : ''}</p>
                          </div>
                          <ArrowDownRight className={`h-4 w-4 text-gray-400 transition-transform ${expandedUser === u.userId ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {/* Expanded: sub-breakdown */}
                      {expandedUser === u.userId && (
                        <div className="p-4 bg-white border-t space-y-4">
                          {/* Personal vs Company */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-amber-50 rounded-lg p-3">
                              <p className="text-xs text-amber-600 font-medium">Personal Credit</p>
                              <p className="text-lg font-bold text-amber-700">{formatCurrency(u.personalIncrease)}</p>
                              <p className="text-xs text-amber-500">Non-cash payments</p>
                            </div>
                            <div className="bg-emerald-50 rounded-lg p-3">
                              <p className="text-xs text-emerald-600 font-medium">Company Credit</p>
                              <p className="text-lg font-bold text-emerald-700">{formatCurrency(u.companyIncrease)}</p>
                              <p className="text-xs text-emerald-500">Cash payments</p>
                            </div>
                          </div>

                          {/* Company breakdown */}
                          {u.companyBreakdown.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                                <Building2 className="h-3 w-3" /> By Company
                              </p>
                              <div className="space-y-1">
                                {u.companyBreakdown.map((cb: any) => (
                                  <div key={cb.companyId} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                                    <span className="text-sm text-gray-700">{cb.companyName}</span>
                                    <span className="font-semibold text-gray-800">{formatCurrency(cb.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Recent transactions */}
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                              <History className="h-3 w-3" /> Transactions
                            </p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {u.transactions.map((tx: any) => (
                                <div key={tx.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                                  <div className="text-gray-600 flex-1 min-w-0 truncate">
                                    {tx.customerName && <span className="font-medium">{tx.customerName}</span>}
                                    {tx.loanApplicationNo && <span className="text-gray-400 ml-1">({tx.loanApplicationNo})</span>}
                                    {tx.installmentNumber && <span className="text-gray-400 ml-1">EMI #{tx.installmentNumber}</span>}
                                    {tx.description && <span className="text-gray-400 ml-1">{tx.description.substring(0, 40)}</span>}
                                  </div>
                                  <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                                    <Badge className={(
                                      tx.paymentMode === 'CASH' ? 'bg-gray-100 text-gray-700' :
                                      tx.paymentMode === 'ONLINE' || tx.paymentMode === 'UPI' ? 'bg-cyan-100 text-cyan-700' :
                                      tx.paymentMode === 'BANK_TRANSFER' || tx.paymentMode === 'NEFT' || tx.paymentMode === 'RTGS' ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-600'
                                    ) + ' text-[10px] px-1.5 py-0'}>
                                      {tx.paymentMode === 'BANK_TRANSFER' ? 'BANK' : tx.paymentMode || 'CASH'}
                                    </Badge>
                                    <Badge className={tx.creditType === 'PERSONAL' ? 'bg-amber-100 text-amber-700 text-xs' : 'bg-emerald-100 text-emerald-700 text-xs'}>
                                      {tx.creditType}
                                    </Badge>
                                    <span className="font-semibold text-emerald-600">+{formatCurrency(tx.amount)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-emerald-600" />
                    Users with Credit Balance
                  </CardTitle>
                  <CardDescription>
                    Manage credit balances for all roles. Minus credit when they submit money to you - it auto-transfers to YOUR credit.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-48"
                    />
                  </div>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="COMPANY">Company</SelectItem>
                      <SelectItem value="AGENT">Agent</SelectItem>
                      <SelectItem value="STAFF">Staff</SelectItem>
                      <SelectItem value="CASHIER">Cashier</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterCreditType} onValueChange={setFilterCreditType}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Credit Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Credits</SelectItem>
                      <SelectItem value="personal">Has Personal</SelectItem>
                      <SelectItem value="company">Has Company</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => fetchData(true)} disabled={refreshing}>
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <IndianRupee className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No users with credit balance found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead className="text-right">Personal Credit</TableHead>
                        <TableHead className="text-right">Company Credit</TableHead>
                        <TableHead className="text-right">Total Credit</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
                                  {user.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-gray-900">{user.name}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell className="text-gray-600">{user.company?.name || '-'}</TableCell>
                          <TableCell className="text-right">
                            <span className={`font-semibold ${user.personalCredit > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                              {formatCurrency(user.personalCredit)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-semibold ${user.companyCredit > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                              {formatCurrency(user.companyCredit)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-gray-900">
                              {formatCurrency(user.personalCredit + user.companyCredit)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowUserPassbookDialog(true);
                                }}
                                title="View Passbook"
                              >
                                <BookOpen className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-amber-200 text-amber-700 hover:bg-amber-50"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setDeductCreditType('PERSONAL');
                                  setDeductAmount(user.personalCredit > 0 ? user.personalCredit.toString() : '');
                                  setShowDeductDialog(true);
                                }}
                                disabled={user.personalCredit <= 0}
                              >
                                <MinusCircle className="h-4 w-4 mr-1" />
                                Personal
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setDeductCreditType('COMPANY');
                                  setDeductAmount(user.companyCredit > 0 ? user.companyCredit.toString() : '');
                                  setShowDeductDialog(true);
                                }}
                                disabled={user.companyCredit <= 0}
                              >
                                <MinusCircle className="h-4 w-4 mr-1" />
                                Company
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                All Credit Transactions
              </CardTitle>
              <CardDescription>
                Complete history of all credit transactions in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No transactions found</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Customer/Loan</TableHead>
                        <TableHead>Proof</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.slice(0, 100).map((tx) => (
                        <TableRow key={tx.id} className="hover:bg-gray-50">
                          <TableCell>
                            <p className="text-sm font-medium">{formatDateShort(tx.transactionDate)}</p>
                            <p className="text-xs text-gray-500">{new Date(tx.transactionDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-xs bg-gray-100">
                                  {tx.user?.name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{tx.user?.name}</p>
                                <p className="text-xs text-gray-500">{tx.user?.role}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getTransactionTypeBadge(tx.transactionType)}
                              <Badge variant="outline" className="w-fit text-xs">
                                {tx.creditType}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getPaymentModeIcon(tx.paymentMode)}
                              <span className="text-sm">{tx.paymentMode}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-semibold ${
                              tx.transactionType === 'CREDIT_INCREASE' || tx.transactionType === 'PERSONAL_COLLECTION'
                                ? 'text-emerald-600'
                                : 'text-red-600'
                            }`}>
                              {tx.transactionType === 'CREDIT_INCREASE' || tx.transactionType === 'PERSONAL_COLLECTION' ? '+' : '-'}
                              {formatCurrency(tx.amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {tx.customerName ? (
                              <div className="text-sm">
                                <p className="font-medium">{tx.customerName}</p>
                                <p className="text-xs text-gray-500">{tx.loanApplicationNo}</p>
                                {tx.installmentNumber && (
                                  <p className="text-xs text-blue-600">EMI #{tx.installmentNumber}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {tx.proofDocument ? (
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                                <span className="text-xs text-emerald-600">
                                  {tx.proofVerified ? 'Verified' : 'Pending'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedTransaction(tx);
                                setShowTransactionDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Passbook Tab */}
        <TabsContent value="passbook" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                Loan Passbook - Complete EMI & Payment Details
              </CardTitle>
              <CardDescription>
                View complete EMI payment history for all active loans
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : loansWithEMI.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No active loans found</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {loansWithEMI.map((loan) => {
                      const emiTransactions = getLoanEMITransactions(loan.id);
                      const totalPaid = emiTransactions.reduce((sum, tx) => sum + tx.amount, 0);
                      const pendingEMIs = loan.emiSchedules?.filter(e => e.paymentStatus === 'PENDING' || e.paymentStatus === 'OVERDUE').length || 0;
                      
                      return (
                        <motion.div
                          key={loan.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border rounded-xl p-4 bg-white hover:shadow-md transition-shadow"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12 bg-gradient-to-br from-blue-400 to-indigo-500">
                                <AvatarFallback className="bg-transparent text-white font-bold">
                                  {loan.customer?.name?.charAt(0) || 'L'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-gray-900">{loan.applicationNo}</p>
                                  <Badge className="bg-blue-100 text-blue-700">{loan.loanType}</Badge>
                                  {pendingEMIs > 0 && (
                                    <Badge className="bg-red-100 text-red-700">{pendingEMIs} Pending</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{loan.customer?.name} â€¢ {loan.customer?.phone}</p>
                                <p className="text-xs text-gray-500">{loan.customer?.email}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-6">
                              <div className="text-center">
                                <p className="text-xs text-gray-500">Loan Amount</p>
                                <p className="font-bold text-lg">{formatCurrency(loan.sessionForm?.approvedAmount || loan.requestedAmount)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-500">EMI Amount</p>
                                <p className="font-bold text-lg text-blue-600">{formatCurrency(loan.sessionForm?.emiAmount || 0)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-500">Total Collected</p>
                                <p className="font-bold text-lg text-emerald-600">{formatCurrency(totalPaid)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-500">Transactions</p>
                                <p className="font-bold text-lg text-purple-600">{emiTransactions.length}</p>
                              </div>
                              <Button
                                size="sm"
                                className="bg-purple-500 hover:bg-purple-600"
                                onClick={() => {
                                  setSelectedLoan(loan);
                                  setShowLoanPassbookDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Passbook
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* â”€â”€ Credit Requests Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpRight className="h-5 w-5 text-indigo-600" />
                    Credit Settlement Requests
                  </CardTitle>
                  <CardDescription>
                    Roles request settlement when they need to hand over collected money.
                    Approve after receiving the cash â€” credit transfers to your account.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchCreditRequests} disabled={loadingRequests}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${loadingRequests ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
              ) : creditRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-300" />
                  <p className="font-medium">No settlement requests</p>
                  <p className="text-sm">All credits are settled.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(['PENDING', 'COMPLETED', 'REJECTED'] as const).map(statusGroup => (
                    <div key={statusGroup}>
                      {creditRequests.filter((r: any) => r.status === statusGroup).length > 0 && (
                        <>
                          <p className={`text-xs font-semibold uppercase tracking-wider mb-2 mt-4 first:mt-0 ${
                            statusGroup === 'PENDING' ? 'text-amber-600' :
                            statusGroup === 'COMPLETED' ? 'text-green-600' : 'text-red-500'
                          }`}>
                            {statusGroup === 'PENDING' ? 'â³ Pending Approval' :
                             statusGroup === 'COMPLETED' ? 'âœ… Completed' : 'âŒ Rejected'}
                          </p>
                          {creditRequests.filter((r: any) => r.status === statusGroup).map((req: any) => (
                            <motion.div
                              key={req.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex items-center justify-between p-4 rounded-xl border mb-2 transition-all ${
                                statusGroup === 'PENDING'
                                  ? 'bg-amber-50/50 border-amber-200 hover:shadow-md'
                                  : statusGroup === 'COMPLETED'
                                  ? 'bg-green-50/30 border-green-100'
                                  : 'bg-red-50/30 border-red-100 opacity-75'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  statusGroup === 'PENDING' ? 'bg-amber-100' :
                                  statusGroup === 'COMPLETED' ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                  {statusGroup === 'PENDING' ? <Clock className="h-5 w-5 text-amber-600" /> :
                                   statusGroup === 'COMPLETED' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                                   <XCircle className="h-5 w-5 text-red-500" />}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800">{req.user?.name || req.cashier?.name || 'Unknown'}</p>
                                  <p className="text-xs text-gray-500">{req.user?.role || req.cashier?.role} â€¢ {req.settlementNumber}</p>
                                  <p className="text-xs text-gray-400">{formatDate(req.createdAt)}</p>
                                  {req.remarks && <p className="text-xs text-gray-500 italic mt-0.5">&quot;{req.remarks}&quot;</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-lg font-bold text-gray-900">{formatCurrency(req.amount)}</p>
                                  <Badge className={`text-xs ${
                                    req.creditType === 'COMPANY' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                  }`}>{req.creditType}</Badge>
                                  <p className="text-xs text-gray-400 mt-0.5">{req.paymentMode}</p>
                                </div>
                                {statusGroup === 'PENDING' && (
                                  <div className="flex flex-col gap-2">
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => handleApproveRequest(req.id)}
                                      disabled={processingRequest === req.id}
                                    >
                                      {processingRequest === req.id
                                        ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        : <CheckCircle className="h-3 w-3 mr-1" />}
                                      Approve
                                    </Button>
                                    <Button size="sm" variant="outline"
                                      className="border-red-200 text-red-600 hover:bg-red-50"
                                      onClick={() => handleRejectRequest(req.id)}
                                      disabled={processingRequest === req.id + '_reject'}
                                    >
                                      {processingRequest === req.id + '_reject'
                                        ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        : <XCircle className="h-3 w-3 mr-1" />}
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Deduct Credit Dialog */}
      <Dialog open={showDeductDialog} onOpenChange={setShowDeductDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MinusCircle className="h-5 w-5 text-red-600" />
              Minus Credit
            </DialogTitle>
            <DialogDescription>
              Deduct credit from user when they submit collected money to you. The deducted amount will be added to YOUR credit.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
                        {selectedUser.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{selectedUser.name}</p>
                      <p className="text-xs text-gray-500">{selectedUser.email}</p>
                    </div>
                  </div>
                  {getRoleBadge(selectedUser.role)}
                </div>
              </div>

              {/* Credit Balances */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg border-2 ${deductCreditType === 'PERSONAL' ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                  <p className="text-xs text-gray-500">Personal Credit</p>
                  <p className="text-lg font-bold text-amber-700">{formatCurrency(selectedUser.personalCredit)}</p>
                </div>
                <div className={`p-3 rounded-lg border-2 ${deductCreditType === 'COMPANY' ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                  <p className="text-xs text-gray-500">Company Credit</p>
                  <p className="text-lg font-bold text-emerald-700">{formatCurrency(selectedUser.companyCredit)}</p>
                </div>
              </div>

              {/* Credit Type Selection */}
              <div>
                <Label>Credit Type to Minus</Label>
                <Select value={deductCreditType} onValueChange={(v) => setDeductCreditType(v as 'PERSONAL' | 'COMPANY')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERSONAL" disabled={selectedUser.personalCredit <= 0}>
                      Personal Credit ({formatCurrency(selectedUser.personalCredit)})
                    </SelectItem>
                    <SelectItem value="COMPANY" disabled={selectedUser.companyCredit <= 0}>
                      Company Credit ({formatCurrency(selectedUser.companyCredit)})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div>
                <Label>Amount to Minus</Label>
                <div className="relative">
                  <IndianRupee className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="number"
                    value={deductAmount}
                    onChange={(e) => setDeductAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Max: {formatCurrency(deductCreditType === 'PERSONAL' ? selectedUser.personalCredit : selectedUser.companyCredit)}
                </p>
              </div>

              {/* Remarks */}
              <div>
                <Label>Reason for Minus *</Label>
                <Textarea
                  value={deductRemarks}
                  onChange={(e) => setDeductRemarks(e.target.value)}
                  placeholder="Enter reason (e.g., Money submitted to Super Admin)"
                  rows={2}
                />
              </div>

              {/* Info */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-xs text-emerald-700">
                  <strong>Note:</strong> When you minus credit, the amount will be automatically transferred to YOUR credit (Super Admin).
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeductDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeductCredit}
              disabled={deducting}
            >
              {deducting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <MinusCircle className="h-4 w-4 mr-2" />
              )}
              Minus Credit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Details Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Transaction ID</p>
                  <p className="font-mono text-sm">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date & Time</p>
                  <p className="font-medium">{formatDate(selectedTransaction.transactionDate)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  {getTransactionTypeBadge(selectedTransaction.transactionType)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Credit Type</p>
                  <Badge variant="outline">{selectedTransaction.creditType}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Mode</p>
                  <div className="flex items-center gap-1">
                    {getPaymentModeIcon(selectedTransaction.paymentMode)}
                    {selectedTransaction.paymentMode}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className={`text-xl font-bold ${
                      selectedTransaction.transactionType === 'CREDIT_INCREASE' || 
                      selectedTransaction.transactionType === 'PERSONAL_COLLECTION'
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(selectedTransaction.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Company Balance After</p>
                    <p className="text-lg font-semibold">{formatCurrency(selectedTransaction.companyBalanceAfter || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Personal Balance After</p>
                    <p className="text-lg font-semibold">{formatCurrency(selectedTransaction.personalBalanceAfter || 0)}</p>
                  </div>
                </div>
              </div>

              {selectedTransaction.customerName && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Customer Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Customer Name</p>
                      <p className="font-medium">{selectedTransaction.customerName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Phone</p>
                      <p>{selectedTransaction.customerPhone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Loan Application</p>
                      <p>{selectedTransaction.loanApplicationNo || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">EMI Number</p>
                      <p>{selectedTransaction.installmentNumber ? `#${selectedTransaction.installmentNumber}` : '-'}</p>
                    </div>
                    {selectedTransaction.emiAmount && (
                      <>
                        <div>
                          <p className="text-gray-500">EMI Amount</p>
                          <p className="font-medium">{formatCurrency(selectedTransaction.emiAmount)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Principal / Interest</p>
                          <p>{formatCurrency(selectedTransaction.principalComponent || 0)} / {formatCurrency(selectedTransaction.interestComponent || 0)}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {(selectedTransaction.chequeNumber || selectedTransaction.utrNumber || selectedTransaction.bankRefNumber) && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Payment Reference</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedTransaction.chequeNumber && (
                      <div>
                        <p className="text-gray-500">Cheque Number</p>
                        <p className="font-mono">{selectedTransaction.chequeNumber}</p>
                      </div>
                    )}
                    {selectedTransaction.utrNumber && (
                      <div>
                        <p className="text-gray-500">UTR Number</p>
                        <p className="font-mono">{selectedTransaction.utrNumber}</p>
                      </div>
                    )}
                    {selectedTransaction.bankRefNumber && (
                      <div>
                        <p className="text-gray-500">Bank Reference</p>
                        <p className="font-mono">{selectedTransaction.bankRefNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedTransaction.remarks && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Remarks</h4>
                  <p className="text-sm text-gray-600">{selectedTransaction.remarks}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Passbook Dialog */}
      <Dialog open={showUserPassbookDialog} onOpenChange={setShowUserPassbookDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              User Passbook - {selectedUser?.name}
            </DialogTitle>
            <DialogDescription>
              Complete credit transaction history
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {/* Credit Summary */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Personal Credit</p>
                    <p className="text-xl font-bold text-amber-600">{formatCurrency(selectedUser.personalCredit)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Company Credit</p>
                    <p className="text-xl font-bold text-emerald-600">{formatCurrency(selectedUser.companyCredit)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Total Credit</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(selectedUser.credit)}</p>
                  </div>
                </div>

                {/* Transactions */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Customer/Loan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getUserTransactions(selectedUser.id).map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">{formatDateShort(tx.transactionDate)}</TableCell>
                        <TableCell>{getTransactionTypeBadge(tx.transactionType)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getPaymentModeIcon(tx.paymentMode)}
                            <span className="text-sm">{tx.paymentMode}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${
                            tx.transactionType === 'CREDIT_INCREASE' || tx.transactionType === 'PERSONAL_COLLECTION'
                              ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {tx.transactionType === 'CREDIT_INCREASE' || tx.transactionType === 'PERSONAL_COLLECTION' ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(tx.balanceAfter)}
                        </TableCell>
                        <TableCell>
                          {tx.customerName ? (
                            <div className="text-sm">
                              <p>{tx.customerName}</p>
                              <p className="text-xs text-gray-500">{tx.loanApplicationNo}</p>
                            </div>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Loan Passbook Dialog */}
      <Dialog open={showLoanPassbookDialog} onOpenChange={setShowLoanPassbookDialog}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              Loan Passbook - {selectedLoan?.applicationNo}
            </DialogTitle>
            <DialogDescription>
              Complete EMI payment details for this loan
            </DialogDescription>
          </DialogHeader>
          
          {selectedLoan && (
            <ScrollArea className="h-[600px]">
              <div className="space-y-6">
                {/* Loan Summary */}
                <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Customer</p>
                    <p className="font-semibold">{selectedLoan.customer?.name}</p>
                    <p className="text-xs text-gray-500">{selectedLoan.customer?.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Loan Amount</p>
                    <p className="font-bold text-lg">{formatCurrency(selectedLoan.sessionForm?.approvedAmount || selectedLoan.requestedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">EMI Amount</p>
                    <p className="font-bold text-lg text-blue-600">{formatCurrency(selectedLoan.sessionForm?.emiAmount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Interest Rate</p>
                    <p className="font-bold text-lg">{selectedLoan.sessionForm?.interestRate || 0}%</p>
                  </div>
                </div>

                {/* EMI Schedule */}
                <div>
                  <h3 className="font-semibold mb-2">EMI Schedule</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">EMI Amount</TableHead>
                        <TableHead className="text-right">Paid Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Paid Date</TableHead>
                        <TableHead>Mode</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedLoan.emiSchedules?.map((emi) => (
                        <TableRow key={emi.id}>
                          <TableCell className="font-medium">{emi.installmentNumber}</TableCell>
                          <TableCell>{formatDateShort(emi.dueDate)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(emi.totalAmount)}</TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600">
                            {formatCurrency(emi.paidAmount)}
                          </TableCell>
                          <TableCell>{getPaymentStatusBadge(emi.paymentStatus)}</TableCell>
                          <TableCell>{emi.paidDate ? formatDateShort(emi.paidDate) : '-'}</TableCell>
                          <TableCell>{emi.paymentMode || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Payment Transactions */}
                <div>
                  <h3 className="font-semibold mb-2">Payment Transactions (via Credit System)</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Collected By</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Credit Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getLoanEMITransactions(selectedLoan.id).map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-sm">{formatDateShort(tx.transactionDate)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">{tx.user?.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{tx.user?.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getTransactionTypeBadge(tx.transactionType)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getPaymentModeIcon(tx.paymentMode)}
                              <span className="text-sm">{tx.paymentMode}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">
                            +{formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={tx.creditType === 'COMPANY' ? 'border-emerald-300 text-emerald-700' : 'border-amber-300 text-amber-700'}>
                              {tx.creditType}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {getLoanEMITransactions(selectedLoan.id).length === 0 && (
                    <p className="text-center text-gray-500 py-4">No credit transactions for this loan</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

