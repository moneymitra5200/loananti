'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout, { ROLE_MENU_ITEMS } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { User, FileText, CheckCircle, XCircle, Clock, Users, Wallet, Eye, TrendingUp, DollarSign, UserPlus, Calculator, Settings, Percent, Calendar, IndianRupee, ClipboardCheck, X, Loader2, Info, AlertTriangle, ArrowLeft, PartyPopper, Sparkles } from 'lucide-react';
import SuccessDialog from '@/components/shared/SuccessDialog';
import { formatCurrency, formatDate, calculateEMI } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import EMICollectionSection from '@/components/emi/EMICollectionSection';
import EMICalendar from '@/components/emi/EMICalendar';
import OfflineLoanForm from '@/components/offline-loan/OfflineLoanForm';
import OfflineLoansList from '@/components/offline-loan/OfflineLoansList';
import LoanDetailPanel from '@/components/loan/LoanDetailPanel';
import MyCreditPassbook from '@/components/credit/MyCreditPassbook';
import ProfileSection from '@/components/shared/ProfileSection';
import DirectMessaging from '@/components/messaging/DirectMessaging';
import SecondaryPaymentPageSection from '@/components/shared/SecondaryPaymentPageSection';
import { useRealtime } from '@/hooks/useRealtime';
import { useLoansStore } from '@/stores/loansStore';
import { useUsersStore } from '@/stores/usersStore';

// Imported types
import type { Loan, Staff, SessionForm } from './types';

// Imported modules
import { EMICalculatorSection, PerformanceSection, DashboardSection } from './modules';

// Imported dialogs
import { ApprovalDialog, SanctionDialog, StaffDialog, LoanDetailsDialog, BulkApprovalDialog } from './dialogs';
import ClosedLoansTab from '@/components/admin/modules/ClosedLoansTab';

export default function AgentDashboard() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showSanctionDialog, setShowSanctionDialog] = useState(false);
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [showLoanDetailsDialog, setShowLoanDetailsDialog] = useState(false);
  const [showLoanDetailPanel, setShowLoanDetailPanel] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'send_back'>('approve');
  const [remarks, setRemarks] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [offlineLoansRefreshKey, setOfflineLoansRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '' });
  
  // Bulk selection state
  const [selectedLoanIds, setSelectedLoanIds] = useState<string[]>([]);
  const [showBulkApprovalDialog, setShowBulkApprovalDialog] = useState(false);
  const [bulkApprovalAction, setBulkApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [bulkStaffId, setBulkStaffId] = useState<string>('');
  const [bulkSaving, setBulkSaving] = useState(false);
  
  // Sanction form state
  const [sessionForm, setSessionForm] = useState<SessionForm>({
    approvedAmount: 0,
    interestRate: 12,
    tenure: 12,
    interestType: 'FLAT',
    specialConditions: ''
  });
  const [calculatedEMI, setCalculatedEMI] = useState<any>(null);
  
  // Success Dialog state
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDialogData, setSuccessDialogData] = useState({ title: '', description: '' });

  // Real-time updates hook
  useRealtime({
    userId: user?.id,
    role: user?.role,
    onLoanStatusChanged: (data) => {
      const { loan, oldStatus, newStatus } = data;
      setLoans(prev => prev.map(l => l.id === loan.id ? { ...l, status: newStatus } : l));
      toast({ title: 'Loan Updated', description: `Loan ${loan.applicationNo} status changed to ${newStatus}` });
    },
    onDashboardRefresh: () => {
      fetchData(true);
    }
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    if (sessionForm.approvedAmount && sessionForm.interestRate && sessionForm.tenure) {
      const calc = calculateEMI(
        sessionForm.approvedAmount, 
        sessionForm.interestRate, 
        sessionForm.tenure,
        sessionForm.interestType
      );
      setCalculatedEMI(calc);
    }
  }, [sessionForm.approvedAmount, sessionForm.interestRate, sessionForm.tenure, sessionForm.interestType]);

  // Optimized parallel fetch with caching
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;
    
    const loansStore = useLoansStore.getState();
    const usersStore = useUsersStore.getState();
    
    // Check cache first
    if (!forceRefresh && !loansStore.needsRefresh() && loansStore.loans.length > 0) {
      const agentLoans = loansStore.loans.filter(l => l.currentHandlerId === user.id);
      setLoans(agentLoans as Loan[]);
      setLoading(false);
      // Still need to fetch staff separately since types may differ
      const usersRes = await fetch('/api/user');
      const usersData = await usersRes.json();
      const myStaff = (usersData.users || [])
        .filter((u: any) => u.role === 'STAFF' && u.agentId === user.id)
        .map((u: any) => ({
          id: u.id, name: u.name, email: u.email, 
          staffCode: u.staffCode || 'N/A', isActive: u.isActive
        }));
      setStaffList(myStaff);
      return;
    }

    setLoading(true);
    try {
      // PARALLEL FETCH
      const [loansRes, usersRes] = await Promise.all([
        fetch(`/api/loan/list?role=AGENT&agentId=${user.id}`),
        fetch('/api/user')
      ]);

      // Process responses in parallel
      const [loansData, usersData] = await Promise.all([
        loansRes.json(),
        usersRes.json()
      ]);

      const loansList = loansData.loans || [];
      const myStaff = (usersData.users || [])
        .filter((u: any) => u.role === 'STAFF' && u.agentId === user.id)
        .map((u: any) => ({
          id: u.id, name: u.name, email: u.email, 
          staffCode: u.staffCode || 'N/A', isActive: u.isActive
        }));
      
      // Update stores
      loansStore.setLoans(loansList);
      
      setLoans(loansList);
      setStaffList(myStaff);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const handleApproval = async () => {
    if (!selectedLoan) return;
    if (approvalAction === 'approve' && !selectedStaffId) {
      toast({ title: 'Staff Required', description: 'Please select a staff member to assign this loan.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/workflow/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: selectedLoan.id, 
          action: approvalAction, 
          remarks, 
          role: 'AGENT',
          userId: user?.id || 'system', 
          staffId: approvalAction === 'approve' ? selectedStaffId : undefined
        })
      });
      if (response.ok) {
        const actionText = approvalAction === 'approve' ? 'Approved' : approvalAction === 'reject' ? 'Rejected' : 'Sent Back';
        // Show success dialog for approval
        if (approvalAction === 'approve') {
          setSuccessDialogData({
            title: 'Loan Approved Successfully!',
            description: `Application ${selectedLoan.applicationNo} has been approved and sent to the Staff for verification.`
          });
          setShowSuccessDialog(true);
        } else {
          toast({ 
            title: `Loan ${actionText}`, 
            description: `Application ${selectedLoan.applicationNo} has been ${actionText.toLowerCase()}.`
          });
        }
        setShowApprovalDialog(false);
        setRemarks('');
        setSelectedStaffId('');
        fetchData(true); // Force refresh
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.error || 'Failed to process', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to process approval', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSanction = async () => {
    if (!selectedLoan) return;
    if (!sessionForm.approvedAmount || !sessionForm.interestRate || !sessionForm.tenure) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanApplicationId: selectedLoan.id,
          agentId: user?.id,
          approvedAmount: sessionForm.approvedAmount,
          interestRate: sessionForm.interestRate,
          tenure: sessionForm.tenure,
          interestType: sessionForm.interestType,
          specialConditions: sessionForm.specialConditions
        })
      });
      if (response.ok) {
        // Show success dialog for sanction creation
        setSuccessDialogData({
          title: 'Sanction Created Successfully!',
          description: `Loan sanction for ${selectedLoan.applicationNo} has been created with ${sessionForm.interestType} interest at ${sessionForm.interestRate}%. It has been sent to the customer for approval.`
        });
        setShowSuccessDialog(true);
        setShowSanctionDialog(false);
        setSessionForm({ approvedAmount: 0, interestRate: 12, tenure: 12, interestType: 'FLAT', specialConditions: '' });
        fetchData(true); // Force refresh
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.error || 'Failed to create sanction', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create sanction', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateStaff = async () => {
    if (!staffForm.name || !staffForm.email || !staffForm.password) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...staffForm,
          role: 'STAFF',
          agentId: user?.id
        })
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Staff member created successfully' });
        setShowStaffDialog(false);
        setStaffForm({ name: '', email: '', password: '' });
        fetchData();
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.error || 'Failed to create staff', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create staff', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openSanctionDialog = (loan: Loan) => {
    setSelectedLoan(loan);
    setSessionForm({
      approvedAmount: loan.requestedAmount,
      interestRate: 12,
      tenure: loan.requestedTenure || 12,
      interestType: 'FLAT',
      specialConditions: ''
    });
    setShowSanctionDialog(true);
  };

  // Bulk selection handlers
  const handleSelectLoan = (loanId: string) => {
    setSelectedLoanIds(prev => 
      prev.includes(loanId) 
        ? prev.filter(id => id !== loanId)
        : [...prev, loanId]
    );
  };

  const handleSelectAll = (loanIds: string[]) => {
    if (selectedLoanIds.length === loanIds.length) {
      setSelectedLoanIds([]);
    } else {
      setSelectedLoanIds(loanIds);
    }
  };

  const clearSelection = () => {
    setSelectedLoanIds([]);
    setBulkStaffId('');
  };

  // Bulk approval handler
  const handleBulkApproval = async () => {
    if (selectedLoanIds.length === 0) return;
    
    if (bulkApprovalAction === 'approve' && !bulkStaffId) {
      toast({ title: 'Staff Required', description: 'Please select a staff member to assign the loans.', variant: 'destructive' });
      return;
    }
    
    setBulkSaving(true);
    try {
      const response = await fetch('/api/workflow/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanIds: selectedLoanIds,
          action: bulkApprovalAction,
          role: 'AGENT',
          userId: user?.id || 'system',
          staffId: bulkApprovalAction === 'approve' ? bulkStaffId : undefined,
          isBulk: true
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({ 
          title: bulkApprovalAction === 'approve' ? 'Loans Approved' : 'Loans Rejected', 
          description: `${data.successCount} applications have been ${bulkApprovalAction}d successfully.` 
        });
        setShowBulkApprovalDialog(false);
        clearSelection();
        fetchData();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to process bulk approval', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Bulk approval error:', error);
      toast({ title: 'Error', description: 'Failed to process bulk approval. Please try again.', variant: 'destructive' });
    } finally {
      setBulkSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      SUBMITTED: { className: 'bg-blue-100 text-blue-700', label: 'New' },
      SA_APPROVED: { className: 'bg-emerald-100 text-emerald-700', label: 'SA Approved' },
      COMPANY_APPROVED: { className: 'bg-teal-100 text-teal-700', label: 'Company Approved' },
      AGENT_APPROVED_STAGE1: { className: 'bg-cyan-100 text-cyan-700', label: 'Agent Approved' },
      LOAN_FORM_COMPLETED: { className: 'bg-violet-100 text-violet-700', label: 'Form Complete' },
      SESSION_CREATED: { className: 'bg-amber-100 text-amber-700', label: 'Sanction Created' },
      CUSTOMER_SESSION_APPROVED: { className: 'bg-green-100 text-green-700', label: 'Customer Approved' },
      FINAL_APPROVED: { className: 'bg-green-100 text-green-700', label: 'Final Approved' },
      DISBURSED: { className: 'bg-green-100 text-green-700', label: 'Disbursed' },
      ACTIVE: { className: 'bg-green-100 text-green-700', label: 'Active' },
      REJECTED_BY_SA: { className: 'bg-red-100 text-red-700', label: 'Rejected' },
      REJECTED_BY_COMPANY: { className: 'bg-red-100 text-red-700', label: 'Rejected' },
      REJECTED_FINAL: { className: 'bg-red-100 text-red-700', label: 'Rejected' },
    };
    const c = config[status] || { className: 'bg-gray-100 text-gray-700', label: status };
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  // Filter loans
  // Include both COMPANY_APPROVED and SA_APPROVED loans assigned to this agent
  const pendingForAgent = loans.filter(l => 
    l.status === 'COMPANY_APPROVED' || 
    (l.status === 'SA_APPROVED' && l.currentHandlerId === user?.id)
  );
  const formCompleted = loans.filter(l => l.status === 'LOAN_FORM_COMPLETED');
  const sanctionCreated = loans.filter(l => l.status === 'SESSION_CREATED');
  const inProgress = loans.filter(l => ['AGENT_APPROVED_STAGE1'].includes(l.status));
  const activeLoans = loans.filter(l => ['ACTIVE', 'DISBURSED', 'CUSTOMER_SESSION_APPROVED', 'FINAL_APPROVED'].includes(l.status));

  const stats = [
    { label: 'Pending Approvals', value: pendingForAgent.length, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', onClick: () => setActiveTab('pending') },
    { label: 'Awaiting Sanction', value: formCompleted.length, icon: ClipboardCheck, color: 'text-violet-600', bg: 'bg-violet-50', onClick: () => setActiveTab('session') },
    { label: 'In Progress', value: inProgress.length, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', onClick: () => setActiveTab('active') },
    { label: 'Active Loans', value: activeLoans.length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', onClick: () => setActiveTab('active') }
  ];

  const menuItems = ROLE_MENU_ITEMS.AGENT.map(item => ({
    ...item,
    count: item.id === 'pending' ? pendingForAgent.length : 
           item.id === 'session' ? formCompleted.length :
           item.id === 'staff' ? staffList.length :
           item.id === 'active' ? activeLoans.length : undefined
  }));

  const renderLoanCard = (loan: Loan, index: number, actions?: React.ReactNode) => (
    <motion.div key={loan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
      className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all bg-white">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 bg-gradient-to-br from-cyan-400 to-blue-500">
            <AvatarFallback className="bg-transparent text-white font-semibold">
              {loan.customer?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">{loan.applicationNo}</h4>
              {getStatusBadge(loan.status)}
            </div>
            <p className="text-sm text-gray-500">{loan.customer?.name} • {loan.customer?.email}</p>
            <p className="text-xs text-gray-400 mt-1">{formatDate(loan.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-bold text-lg text-gray-900">{formatCurrency(loan.requestedAmount)}</p>
            <p className="text-xs text-gray-500">{loan.loanType}</p>
          </div>
          {actions || (
            <Button size="sm" variant="outline" onClick={() => { setSelectedLoanId(loan.id); setShowLoanDetailPanel(true); }}>
              <Eye className="h-4 w-4 mr-1" /> View
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );

  const renderPendingApprovals = () => {
    const pendingLoanIds = pendingForAgent.map(l => l.id);
    return (
      <div className="space-y-4">
        {/* Bulk Action Bar */}
        {selectedLoanIds.length > 0 && (
          <Card className="bg-cyan-50 border-cyan-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Badge className="bg-cyan-600 text-white text-sm px-3 py-1">
                    {selectedLoanIds.length} selected
                  </Badge>
                  <span className="text-sm text-cyan-700">
                    {formatCurrency(selectedLoanIds.reduce((sum, id) => {
                      const loan = pendingForAgent.find(l => l.id === id);
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
                    className="bg-cyan-500 hover:bg-cyan-600"
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
                  <Clock className="h-5 w-5 text-orange-600" />Pending Approvals
                </CardTitle>
                <CardDescription>Applications approved by Company. Assign a staff member to verify.</CardDescription>
              </div>
              {pendingForAgent.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all-agent"
                    checked={selectedLoanIds.length === pendingLoanIds.length && pendingLoanIds.length > 0}
                    onCheckedChange={() => handleSelectAll(pendingLoanIds)}
                  />
                  <Label htmlFor="select-all-agent" className="text-sm font-medium cursor-pointer">
                    Select All ({pendingForAgent.length})
                  </Label>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {pendingForAgent.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p>No pending applications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingForAgent.map((loan, index) => (
                  <motion.div 
                    key={loan.id} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: index * 0.03 }}
                    className={`p-4 border rounded-xl hover:bg-gray-50 transition-all bg-white ${
                      selectedLoanIds.includes(loan.id) ? 'border-cyan-300 bg-cyan-50' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedLoanIds.includes(loan.id)}
                          onCheckedChange={() => handleSelectLoan(loan.id)}
                        />
                        <Avatar className="h-12 w-12 bg-gradient-to-br from-cyan-400 to-blue-500">
                          <AvatarFallback className="bg-transparent text-white font-semibold">
                            {loan.customer?.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">{loan.applicationNo}</h4>
                            {getStatusBadge(loan.status)}
                          </div>
                          <p className="text-sm text-gray-500">{loan.customer?.name} • {loan.customer?.email}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatDate(loan.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-lg text-gray-900">{formatCurrency(loan.requestedAmount)}</p>
                          <p className="text-xs text-gray-500">{loan.loanType}</p>
                        </div>
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
  };

  const renderSessionSection = () => (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-violet-600" />Create Sanction
        </CardTitle>
        <CardDescription>Applications with completed verification. Create loan sanction for customer approval.</CardDescription>
      </CardHeader>
      <CardContent>
        {formCompleted.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No applications awaiting sanction creation</p>
          </div>
        ) : (
          <div className="space-y-3">
            {formCompleted.map((loan, index) => renderLoanCard(loan, index,
              <Button size="sm" className="bg-violet-500 hover:bg-violet-600" onClick={() => openSanctionDialog(loan)}>
                <Calculator className="h-4 w-4 mr-1" />Create Sanction
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderStaffSection = () => (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Staff Management</CardTitle>
          <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowStaffDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />Add Staff
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {staffList.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No staff members created yet</p>
            <Button className="mt-4 bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowStaffDialog(true)}>
              Create First Staff
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {staffList.map((staff, index) => (
              <motion.div key={staff.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                className="p-4 border border-gray-100 rounded-xl bg-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-cyan-100 text-cyan-700">{staff.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold">{staff.name}</h4>
                    <p className="text-sm text-gray-500">{staff.email}</p>
                    <p className="text-xs text-gray-400">Code: {staff.staffCode}</p>
                  </div>
                </div>
                <Badge className={staff.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                  {staff.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderActiveLoans = () => (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <CardTitle>Active & Completed Loans</CardTitle>
      </CardHeader>
      <CardContent>
        {activeLoans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No active loans</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeLoans.map((loan, index) => renderLoanCard(loan, index))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'pending':
        return renderPendingApprovals();

      case 'session':
        return renderSessionSection();

      case 'staff':
        return renderStaffSection();

      case 'active':
        return renderActiveLoans();

      case 'emi-collection':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">EMI Collection</h2>
                <p className="text-gray-500">Today's EMI collection and tracking</p>
              </div>
            </div>
            <EMICollectionSection 
              userId={user?.id || ''} 
              userRole={user?.role || 'AGENT'}
              onPaymentComplete={() => {
                toast({ title: 'Payment Collected', description: 'EMI payment collected and credit updated' });
              }}
            />
          </div>
        );

      case 'emi-calendar':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">EMI Calendar</h2>
                <p className="text-gray-500">View and manage EMIs by date</p>
              </div>
            </div>
            <EMICalendar 
              userId={user?.id || ''} 
              userRole={user?.role || 'AGENT'}
            />
          </div>
        );

      case 'offline-loans':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Offline Loans</h2>
                <p className="text-gray-500">Create and manage offline loans</p>
              </div>
              <OfflineLoanForm 
                createdById={user?.id || ''} 
                createdByRole={user?.role || 'AGENT'}
                companyId={user?.companyId || ''}
                onLoanCreated={() => setOfflineLoansRefreshKey(k => k + 1)}
              />
            </div>
            <OfflineLoansList 
              userId={user?.id}
              userRole={user?.role || 'AGENT'}
              refreshKey={offlineLoansRefreshKey}
            />
          </div>
        );

      case 'calculator':
        return <EMICalculatorSection />;

      case 'myCredit':
        return <MyCreditPassbook />;

      case 'performance':
        return (
          <PerformanceSection
            loans={loans}
            staffList={staffList}
            pendingForAgent={pendingForAgent}
            formCompleted={formCompleted}
            inProgress={inProgress}
            sanctionCreated={sanctionCreated}
            activeLoans={activeLoans}
          />
        );

      case 'messages':
        return (
          <DirectMessaging
            userId={user?.id || ''}
            userRole={user?.role || 'AGENT'}
            userName={user?.name || 'Agent'}
          />
        );

      case 'profile':
        return <ProfileSection />;

      case 'secondary-payment-pages':
        return (
          <SecondaryPaymentPageSection
            userId={user?.id || 'system'}
          />
        );

      case 'closedLoans':
        return (
          <ClosedLoansTab
            setSelectedLoanId={setSelectedLoanId}
            setShowLoanDetailPanel={setShowLoanDetailPanel}
            agentId={user?.id}
          />
        );

      case 'dashboard':
      default:
        return (
          <DashboardSection
            loans={loans}
            pendingForAgent={pendingForAgent}
            formCompleted={formCompleted}
            setActiveTab={setActiveTab}
            getStatusBadge={getStatusBadge}
          />
        );
    }
  };

  return (
    <DashboardLayout
      title="Agent Dashboard"
      subtitle="Manage loan approvals and create sanctions"
      menuItems={menuItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      stats={stats}
      gradient="bg-gradient-to-br from-cyan-600 to-blue-700"
      logoIcon={User}
    >
      {renderContent()}

      {/* Approval Dialog */}
      <ApprovalDialog
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
        selectedLoan={selectedLoan}
        approvalAction={approvalAction}
        staffList={staffList}
        selectedStaffId={selectedStaffId}
        setSelectedStaffId={setSelectedStaffId}
        remarks={remarks}
        setRemarks={setRemarks}
        setApprovalAction={setApprovalAction}
        setShowStaffDialog={setShowStaffDialog}
        saving={saving}
        onApprove={handleApproval}
      />

      {/* Sanction Creation Dialog */}
      <SanctionDialog
        open={showSanctionDialog}
        onOpenChange={setShowSanctionDialog}
        selectedLoan={selectedLoan}
        sessionForm={sessionForm}
        setSessionForm={setSessionForm}
        calculatedEMI={calculatedEMI}
        saving={saving}
        onCreateSanction={handleCreateSanction}
      />

      {/* Create Staff Dialog */}
      <StaffDialog
        open={showStaffDialog}
        onOpenChange={setShowStaffDialog}
        staffForm={staffForm}
        setStaffForm={setStaffForm}
        saving={saving}
        onCreateStaff={handleCreateStaff}
      />

      {/* Loan Details Dialog */}
      <LoanDetailsDialog
        open={showLoanDetailsDialog}
        onOpenChange={setShowLoanDetailsDialog}
        selectedLoan={selectedLoan}
        getStatusBadge={getStatusBadge}
      />

      {/* Bulk Approval Dialog */}
      <BulkApprovalDialog
        open={showBulkApprovalDialog}
        onOpenChange={setShowBulkApprovalDialog}
        bulkApprovalAction={bulkApprovalAction}
        selectedLoanIds={selectedLoanIds}
        pendingForAgent={pendingForAgent}
        staffList={staffList}
        bulkStaffId={bulkStaffId}
        setBulkStaffId={setBulkStaffId}
        bulkSaving={bulkSaving}
        onBulkApproval={handleBulkApproval}
      />

      {/* Loan Detail Panel */}
      <LoanDetailPanel
        open={showLoanDetailPanel}
        loanId={selectedLoanId}
        onClose={() => { setShowLoanDetailPanel(false); setSelectedLoanId(null); }}
        onEMIPaid={() => fetchData()}
      />
      
      {/* Success Dialog */}
      <SuccessDialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        title={successDialogData.title}
        description={successDialogData.description}
        icon="sparkles"
      />
    </DashboardLayout>
  );
}
