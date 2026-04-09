'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Loan, UserItem, CompanyItem, MirrorLoanConfig, ActiveLoanStats } from '../types';

interface UseSuperAdminState {
  // Data states
  loans: Loan[];
  users: UserItem[];
  companies: CompanyItem[];
  products: any[];
  settings: any;
  interestOnlyLoans: any[];
  allActiveLoans: any[];
  activeLoanStats: ActiveLoanStats;
  agentsList: UserItem[];
  mirrorCompanies: any[];
  loading: boolean;
  fetchedTabs: Set<string>;
  
  // Selection states
  selectedLoan: Loan | null;
  selectedUser: UserItem | null;
  selectedLoanIds: string[];
  selectedLoanId: string | null;
  selectedProduct: any;
  selectedInterestOnlyLoan: any;
  loanToDelete: any;
  selectedUserDetails: any;
  loanDetails: any;
  detailSheetData: any;
  mirrorPreview: any;
  
  // Dialog states
  showApprovalDialog: boolean;
  showUserDialog: boolean;
  showDeleteConfirmDialog: boolean;
  showLoanDetailsDialog: boolean;
  showProductDialog: boolean;
  showInterestOnlyDialog: boolean;
  showStartEMIDialog: boolean;
  showBulkApprovalDialog: boolean;
  showComprehensiveLoanDialog: boolean;
  showDeleteLoanDialog: boolean;
  showLoanDetailPanel: boolean;
  showUserDetailsDialog: boolean;
  showRoleSelectDialog: boolean;
  showDetailSheet: boolean;
  showResetDialog: boolean;
  showMirrorLoanSheet: boolean;
  
  // Form states
  userForm: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: string;
    companyId: string;
    agentId: string;
  };
  productForm: any;
  approvalAction: 'approve' | 'reject' | 'send_back';
  remarks: string;
  selectedCompanyId: string;
  activeTab: string;
  activeLoanFilter: 'all' | 'online' | 'offline';
  bulkApprovalAction: 'approve' | 'reject';
  bulkCompanyId: string;
  bulkAgentId: string;
  detailsTab: string;
  deleteReason: string;
  detailSheetType: 'user' | 'company' | 'loan';
  resetConfirmText: string;
  mirrorLoanConfig: MirrorLoanConfig;
  userRoleFilter: string;
  
  // Loading states
  savingUser: boolean;
  bulkSaving: boolean;
  loadingDetails: boolean;
  loadingUserDetails: boolean;
  loadingDetailSheet: boolean;
  savingSettings: boolean;
  uploadingLogo: boolean;
  deleting: boolean;
  resetting: boolean;
  loadingMirrorPreview: boolean;
  
  // Setters
  setLoans: (loans: Loan[]) => void;
  setUsers: (users: UserItem[]) => void;
  setCompanies: (companies: CompanyItem[]) => void;
  setProducts: (products: any[]) => void;
  setSettings: (settings: any) => void;
  setInterestOnlyLoans: (loans: any[]) => void;
  setAllActiveLoans: (loans: any[]) => void;
  setActiveLoanStats: (stats: ActiveLoanStats) => void;
  setAgentsList: (agents: UserItem[]) => void;
  setMirrorCompanies: (companies: any[]) => void;
  setLoading: (loading: boolean) => void;
  setSelectedLoan: (loan: Loan | null) => void;
  setSelectedUser: (user: UserItem | null) => void;
  setSelectedLoanIds: (ids: string[]) => void;
  setSelectedLoanId: (id: string | null) => void;
  setSelectedProduct: (product: any) => void;
  setSelectedInterestOnlyLoan: (loan: any) => void;
  setLoanToDelete: (loan: any) => void;
  setSelectedUserDetails: (details: any) => void;
  setLoanDetails: (details: any) => void;
  setDetailSheetData: (data: any) => void;
  setMirrorPreview: (preview: any) => void;
  setShowApprovalDialog: (show: boolean) => void;
  setShowUserDialog: (show: boolean) => void;
  setShowDeleteConfirmDialog: (show: boolean) => void;
  setShowLoanDetailsDialog: (show: boolean) => void;
  setShowProductDialog: (show: boolean) => void;
  setShowInterestOnlyDialog: (show: boolean) => void;
  setShowStartEMIDialog: (show: boolean) => void;
  setShowBulkApprovalDialog: (show: boolean) => void;
  setShowComprehensiveLoanDialog: (show: boolean) => void;
  setShowDeleteLoanDialog: (show: boolean) => void;
  setShowLoanDetailPanel: (show: boolean) => void;
  setShowUserDetailsDialog: (show: boolean) => void;
  setShowRoleSelectDialog: (show: boolean) => void;
  setShowDetailSheet: (show: boolean) => void;
  setShowResetDialog: (show: boolean) => void;
  setShowMirrorLoanSheet: (show: boolean) => void;
  setUserForm: (form: any) => void;
  setProductForm: (form: any) => void;
  setApprovalAction: (action: 'approve' | 'reject' | 'send_back') => void;
  setRemarks: (remarks: string) => void;
  setSelectedCompanyId: (id: string) => void;
  setActiveTab: (tab: string) => void;
  setActiveLoanFilter: (filter: 'all' | 'online' | 'offline') => void;
  setBulkApprovalAction: (action: 'approve' | 'reject') => void;
  setBulkCompanyId: (id: string) => void;
  setBulkAgentId: (id: string) => void;
  setDetailsTab: (tab: string) => void;
  setDeleteReason: (reason: string) => void;
  setDetailSheetType: (type: 'user' | 'company' | 'loan') => void;
  setResetConfirmText: (text: string) => void;
  setMirrorLoanConfig: (config: MirrorLoanConfig) => void;
  setUserRoleFilter: (filter: string) => void;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  
  // Computed values
  pendingForSA: Loan[];
  pendingForFinal: Loan[];
  activeLoans: Loan[];
  inProgressLoans: Loan[];
  rejectedLoans: Loan[];
  highRiskLoans: Loan[];
  companyUsers: UserItem[];
  agents: UserItem[];
  staff: UserItem[];
  cashiers: UserItem[];
  accountants: UserItem[];
  customers: UserItem[];
  totalDisbursed: number;
  totalRequested: number;
  
  // Handlers
  fetchLoans: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchCompanies: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  fetchInterestOnlyLoans: () => Promise<void>;
  fetchAllActiveLoans: () => Promise<void>;
  fetchLoanDetails: (loanId: string) => Promise<void>;
  fetchMirrorPreview: (loan: Loan, mirrorCompanyId: string, mirrorType: string) => Promise<void>;
  handleCreateUser: () => Promise<void>;
  handleDeleteUser: () => Promise<void>;
  handleUnlockUser: (userId: string) => Promise<void>;
  handleSaveProduct: () => Promise<void>;
  handleDeleteProduct: (productId: string) => Promise<void>;
  handleApproval: () => Promise<void>;
  handleBulkApproval: () => Promise<void>;
  handleDeleteLoan: () => Promise<void>;
  handleSystemReset: () => Promise<void>;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  saveSettings: () => Promise<void>;
  handleSelectLoan: (loanId: string) => void;
  handleSelectAll: (loanIds: string[]) => void;
  clearSelection: () => void;
  handleBulkCompanyChange: (companyId: string) => Promise<void>;
  openEditProduct: (product: any) => void;
}

export function useSuperAdminState(): UseSuperAdminState {
  const { user } = useAuth();
  
  // Data states
  const [loans, setLoans] = useState<Loan[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    companyName: 'Money Mitra Financial Advisor',
    companyLogo: '',
    companyTagline: 'Your Dreams, Our Support',
    companyEmail: 'support@smfc.com',
    companyPhone: '+91 1800-123-4567',
    companyAddress: '123 Finance Street, Mumbai, MH 400001',
    defaultInterestRate: 12,
    minInterestRate: 8,
    maxInterestRate: 24,
  });
  const [interestOnlyLoans, setInterestOnlyLoans] = useState<any[]>([]);
  const [allActiveLoans, setAllActiveLoans] = useState<any[]>([]);
  const [activeLoanStats, setActiveLoanStats] = useState<ActiveLoanStats>({
    totalOnline: 0,
    totalOffline: 0,
    totalOnlineAmount: 0,
    totalOfflineAmount: 0
  });
  const [agentsList, setAgentsList] = useState<UserItem[]>([]);
  const [mirrorCompanies, setMirrorCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchedTabs, setFetchedTabs] = useState<Set<string>>(new Set());
  
  // Selection states
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [selectedLoanIds, setSelectedLoanIds] = useState<string[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedInterestOnlyLoan, setSelectedInterestOnlyLoan] = useState<any>(null);
  const [loanToDelete, setLoanToDelete] = useState<any>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<any>(null);
  const [loanDetails, setLoanDetails] = useState<any>(null);
  const [detailSheetData, setDetailSheetData] = useState<any>(null);
  const [mirrorPreview, setMirrorPreview] = useState<any>(null);
  
  // Dialog states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showLoanDetailsDialog, setShowLoanDetailsDialog] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showInterestOnlyDialog, setShowInterestOnlyDialog] = useState(false);
  const [showStartEMIDialog, setShowStartEMIDialog] = useState(false);
  const [showBulkApprovalDialog, setShowBulkApprovalDialog] = useState(false);
  const [showComprehensiveLoanDialog, setShowComprehensiveLoanDialog] = useState(false);
  const [showDeleteLoanDialog, setShowDeleteLoanDialog] = useState(false);
  const [showLoanDetailPanel, setShowLoanDetailPanel] = useState(false);
  const [showUserDetailsDialog, setShowUserDetailsDialog] = useState(false);
  const [showRoleSelectDialog, setShowRoleSelectDialog] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showMirrorLoanSheet, setShowMirrorLoanSheet] = useState(false);
  
  // Form states
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'COMPANY',
    companyId: '',
    agentId: ''
  });
  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    icon: '💰',
    code: '',
    loanType: 'PERSONAL',
    minInterestRate: 8,
    maxInterestRate: 24,
    defaultInterestRate: 12,
    minTenure: 6,
    maxTenure: 60,
    defaultTenure: 12,
    minAmount: 10000,
    maxAmount: 10000000,
    processingFeePercent: 1,
    processingFeeMin: 500,
    processingFeeMax: 10000,
    latePaymentPenaltyPercent: 2,
    gracePeriodDays: 5,
    bounceCharges: 500,
    allowMoratorium: true,
    maxMoratoriumMonths: 3,
    allowPrepayment: true,
    prepaymentCharges: 2,
    isActive: true
  });
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'send_back'>('approve');
  const [remarks, setRemarks] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeLoanFilter, setActiveLoanFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [bulkApprovalAction, setBulkApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [bulkCompanyId, setBulkCompanyId] = useState<string>('');
  const [bulkAgentId, setBulkAgentId] = useState<string>('');
  const [detailsTab, setDetailsTab] = useState('customer');
  const [deleteReason, setDeleteReason] = useState('');
  const [detailSheetType, setDetailSheetType] = useState<'user' | 'company' | 'loan'>('user');
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [mirrorLoanConfig, setMirrorLoanConfig] = useState<MirrorLoanConfig>({
    enabled: false,
    mirrorCompanyId: '',
    mirrorType: 'NONE'
  });
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  
  // Loading states
  const [savingUser, setSavingUser] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [loadingDetailSheet, setLoadingDetailSheet] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loadingMirrorPreview, setLoadingMirrorPreview] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Preload all data on init
  useEffect(() => {
    const preloadAllData = async () => {
      await Promise.all([
        fetchLoans(),
        fetchCompanies(),
        fetchUsers(),
        fetchProducts(),
        fetchSettings(),
        fetchAllActiveLoans(),
        fetchInterestOnlyLoans()
      ]);
      setFetchedTabs(new Set(['dashboard', 'users', 'products', 'settings', 'activeLoans', 'interestOnly']));
    };
    preloadAllData();
  }, []);
  
  // Fetch functions
  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/loan/list?role=SUPER_ADMIN');
      const data = await response.json();
      setLoans(data.loans || []);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/user');
      const data = await response.json();
      if (data.users && data.users.length > 0) {
        setUsers(data.users.map((u: any) => ({
          id: u.id,
          name: u.name || 'Unknown',
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt,
          phone: u.phone,
          company: u.company?.name,
          companyId: u.companyId,
          companyObj: u.company,
          agentId: u.agentId,
          agent: u.agent,
          agentCode: u.agentCode,
          staffCode: u.staffCode,
          cashierCode: u.cashierCode,
          accountantCode: u.accountantCode
        })));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);
  
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await fetch('/api/company?isActive=true');
      const data = await response.json();
      setCompanies(data.companies || []);
      const mirrorComps = (data.companies || []).filter((c: any) =>
        c.code?.includes('1') || c.code?.includes('2')
      ).map((c: any) => ({
        ...c,
        isCompany1: c.code?.includes('1'),
        mirrorRate: c.code?.includes('1') ? 15 : null,
        mirrorType: c.code?.includes('1') ? 'COMPANY_1_15_PERCENT' : 'COMPANY_2_SAME_RATE'
      }));
      setMirrorCompanies(mirrorComps);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  }, []);
  
  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/cms/product');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, []);
  
  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.settings) {
        setSettings((prev: any) => ({ ...prev, ...data.settings }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);
  
  const fetchInterestOnlyLoans = useCallback(async () => {
    try {
      const response = await fetch('/api/offline-loan?isInterestOnly=true');
      const data = await response.json();
      if (data.success) {
        setInterestOnlyLoans(data.loans || []);
      }
    } catch (error) {
      console.error('Error fetching interest-only loans:', error);
    }
  }, []);
  
  const fetchAllActiveLoans = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/loan/all-active');
      const data = await response.json();
      setAllActiveLoans(data.loans || []);
      setActiveLoanStats(data.stats || { totalOnline: 0, totalOffline: 0, totalOnlineAmount: 0, totalOfflineAmount: 0 });
    } catch (error) {
      console.error('Error fetching all active loans:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const fetchLoanDetails = useCallback(async (loanId: string) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`/api/loan/details?loanId=${loanId}`);
      const data = await response.json();
      if (data.success) {
        setLoanDetails(data);
        setShowComprehensiveLoanDialog(true);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to fetch loan details', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error fetching loan details:', error);
      toast({ title: 'Error', description: 'Failed to fetch loan details', variant: 'destructive' });
    } finally {
      setLoadingDetails(false);
    }
  }, []);
  
  const fetchMirrorPreview = useCallback(async (loan: Loan, mirrorCompanyId: string, mirrorType: string) => {
    if (!loan.sessionForm || !mirrorCompanyId) {
      setMirrorPreview(null);
      return;
    }
    setLoadingMirrorPreview(true);
    try {
      const response = await fetch(
        `/api/mirror-loan?action=preview&principal=${loan.sessionForm.approvedAmount}&originalRate=${loan.sessionForm.interestRate}&originalTenure=${loan.sessionForm.tenure}&originalType=${loan.sessionForm.interestType || 'FLAT'}&mirrorType=${mirrorType}`
      );
      const data = await response.json();
      if (data.success) {
        setMirrorPreview(data.calculation);
      }
    } catch (error) {
      console.error('Error fetching mirror preview:', error);
      setMirrorPreview(null);
    } finally {
      setLoadingMirrorPreview(false);
    }
  }, []);
  
  // Handlers
  const handleCreateUser = useCallback(async () => {
    if (!userForm.name || !userForm.email || !userForm.password || !userForm.role) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    setSavingUser(true);
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: 'User Created', description: `${userForm.name} has been created successfully` });
        setShowUserDialog(false);
        setUserForm({ name: '', email: '', phone: '', password: '', role: 'COMPANY', companyId: '', agentId: '' });
        fetchUsers();
        fetchCompanies();
      } else {
        throw new Error(data.error || 'Failed to create user');
      }
    } catch (error) {
      const message = (error as Error).message || 'Failed to create user';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSavingUser(false);
    }
  }, [userForm, fetchUsers, fetchCompanies]);
  
  const handleDeleteUser = useCallback(async () => {
    if (!selectedUser) return;
    try {
      const response = await fetch(`/api/user?id=${selectedUser.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ title: 'User Deleted', description: 'User has been deleted successfully' });
        setShowDeleteConfirmDialog(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete user', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' });
    }
  }, [selectedUser, fetchUsers]);
  
  const handleUnlockUser = useCallback(async (userId: string) => {
    try {
      const response = await fetch('/api/user/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ title: 'Account Unlocked', description: 'User account has been unlocked successfully' });
        fetchUsers();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to unlock user', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to unlock user', variant: 'destructive' });
    }
  }, [fetchUsers]);
  
  const handleSaveProduct = useCallback(async () => {
    try {
      const url = selectedProduct ? `/api/cms/product?id=${selectedProduct.id}` : '/api/cms/product';
      const method = selectedProduct ? 'PUT' : 'POST';
      const body = selectedProduct ? { id: selectedProduct.id, ...productForm } : productForm;
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ title: selectedProduct ? 'Product Updated' : 'Product Created', description: 'Loan product saved successfully' });
        setShowProductDialog(false);
        setSelectedProduct(null);
        setProductForm({
          title: '', description: '', icon: '💰', code: '', loanType: 'PERSONAL',
          minInterestRate: 8, maxInterestRate: 24, defaultInterestRate: 12,
          minTenure: 6, maxTenure: 60, defaultTenure: 12,
          minAmount: 10000, maxAmount: 10000000,
          processingFeePercent: 1, processingFeeMin: 500, processingFeeMax: 10000,
          latePaymentPenaltyPercent: 2, gracePeriodDays: 5, bounceCharges: 500,
          allowMoratorium: true, maxMoratoriumMonths: 3,
          allowPrepayment: true, prepaymentCharges: 2, isActive: true
        });
        fetchProducts();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save product', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save product', variant: 'destructive' });
    }
  }, [selectedProduct, productForm, fetchProducts]);
  
  const handleDeleteProduct = useCallback(async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product?.isPermanent) {
      toast({ title: 'Cannot Delete', description: 'This loan product is permanent and cannot be deleted', variant: 'destructive' });
      return;
    }
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const response = await fetch(`/api/cms/product?id=${productId}`, { method: 'DELETE' });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ title: 'Product Deleted', description: 'Loan product deleted successfully' });
        fetchProducts();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete product', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete product', variant: 'destructive' });
    }
  }, [products, fetchProducts]);
  
  const handleApproval = useCallback(async () => {
    if (!selectedLoan) return;
    if (selectedLoan.status === 'SUBMITTED' && approvalAction === 'approve' && !selectedCompanyId) {
      toast({ title: 'Company Required', description: 'Please select a company to assign this loan.', variant: 'destructive' });
      return;
    }
    try {
      const response = await fetch('/api/workflow/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: selectedLoan.id,
          action: approvalAction,
          remarks,
          role: 'SUPER_ADMIN',
          userId: user?.id || 'system',
          companyId: selectedLoan.status === 'SUBMITTED' ? selectedCompanyId : undefined,
          mirrorLoanConfig: selectedLoan.status === 'CUSTOMER_SESSION_APPROVED' && mirrorLoanConfig.enabled ? {
            enabled: true,
            mirrorCompanyId: mirrorLoanConfig.mirrorCompanyId,
            mirrorType: mirrorLoanConfig.mirrorType
          } : { enabled: false }
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const actionText = approvalAction === 'approve' ? 'Approved' : approvalAction === 'reject' ? 'Rejected' : 'Sent Back';
        toast({ title: `Loan ${actionText}`, description: `Application ${selectedLoan.applicationNo} has been ${actionText.toLowerCase()}.` });
        setShowApprovalDialog(false);
        setRemarks('');
        setSelectedCompanyId('');
        setMirrorLoanConfig({ enabled: false, mirrorCompanyId: '', mirrorType: 'NONE' });
        setMirrorPreview(null);
        fetchLoans();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to process approval', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to process approval. Please try again.', variant: 'destructive' });
    }
  }, [selectedLoan, approvalAction, remarks, selectedCompanyId, mirrorLoanConfig, user, fetchLoans]);
  
  const handleBulkApproval = useCallback(async () => {
    if (selectedLoanIds.length === 0) return;
    if (bulkApprovalAction === 'approve' && !bulkCompanyId) {
      toast({ title: 'Company Required', description: 'Please select a company to assign the loans.', variant: 'destructive' });
      return;
    }
    if (bulkApprovalAction === 'approve' && bulkCompanyId && !bulkAgentId) {
      toast({ title: 'Agent Required', description: 'Please select an agent to assign the loans.', variant: 'destructive' });
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
          role: 'SUPER_ADMIN',
          userId: user?.id || 'system',
          companyId: bulkApprovalAction === 'approve' ? bulkCompanyId : undefined,
          agentId: bulkApprovalAction === 'approve' ? bulkAgentId : undefined,
          isBulk: true
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: bulkApprovalAction === 'approve' ? 'Loans Approved' : 'Loans Rejected',
          description: `${selectedLoanIds.length} applications have been ${bulkApprovalAction}d successfully.`
        });
        setShowBulkApprovalDialog(false);
        clearSelection();
        fetchLoans();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to process bulk approval', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to process bulk approval. Please try again.', variant: 'destructive' });
    } finally {
      setBulkSaving(false);
    }
  }, [selectedLoanIds, bulkApprovalAction, bulkCompanyId, bulkAgentId, user, fetchLoans]);
  
  const handleDeleteLoan = useCallback(async () => {
    if (!loanToDelete || !deleteReason.trim()) {
      toast({ title: 'Error', description: 'Please provide a reason for deletion', variant: 'destructive' });
      return;
    }
    setDeleting(true);
    try {
      const params = new URLSearchParams({
        loanId: loanToDelete.id,
        userId: user?.id || 'system',
        reason: deleteReason,
        loanType: loanToDelete.loanType || 'ONLINE'
      });
      const response = await fetch(`/api/loan/delete?${params}`, { method: 'DELETE' });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ title: 'Loan Deleted', description: `${loanToDelete.identifier} has been deleted successfully` });
        setShowDeleteLoanDialog(false);
        setLoanToDelete(null);
        setDeleteReason('');
        fetchLoans();
        fetchAllActiveLoans();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete loan', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete loan', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }, [loanToDelete, deleteReason, user, fetchLoans, fetchAllActiveLoans]);
  
  const handleSystemReset = useCallback(async () => {
    if (resetConfirmText !== 'RESET_SYSTEM') {
      toast({ title: 'Error', description: 'Please type RESET_SYSTEM to confirm', variant: 'destructive' });
      return;
    }
    setResetting(true);
    try {
      const response = await fetch('/api/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmReset: 'RESET_SYSTEM',
          userId: user?.id
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: 'System Reset Complete',
          description: `All data cleared in ${data.stats?.duration || 'a few seconds'}. Users, Companies, Loan Products & Settings preserved.`
        });
        setShowResetDialog(false);
        setResetConfirmText('');
        fetchLoans();
        fetchUsers();
        fetchCompanies();
        fetchAllActiveLoans();
        fetchProducts();
      } else {
        toast({ title: 'Reset Failed', description: data.error || 'Failed to reset system', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reset system. Please try again.', variant: 'destructive' });
    } finally {
      setResetting(false);
    }
  }, [resetConfirmText, user, fetchLoans, fetchUsers, fetchCompanies, fetchAllActiveLoans, fetchProducts]);
  
  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image size should be less than 2MB', variant: 'destructive' });
      return;
    }
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', 'logo');
      const res = await fetch('/api/upload/logo', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...settings, companyLogo: data.url });
        toast({ title: 'Success', description: 'Logo uploaded successfully' });
      } else {
        const errorData = await res.json();
        toast({ title: 'Error', description: errorData.error || 'Failed to upload logo', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to upload logo', variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  }, [settings]);
  
  const saveSettings = useCallback(async () => {
    setSavingSettings(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Settings saved successfully' });
        window.location.reload();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  }, [settings]);
  
  const handleSelectLoan = useCallback((loanId: string) => {
    setSelectedLoanIds(prev =>
      prev.includes(loanId)
        ? prev.filter(id => id !== loanId)
        : [...prev, loanId]
    );
  }, []);
  
  const handleSelectAll = useCallback((loanIds: string[]) => {
    if (selectedLoanIds.length === loanIds.length) {
      setSelectedLoanIds([]);
    } else {
      setSelectedLoanIds(loanIds);
    }
  }, [selectedLoanIds]);
  
  const clearSelection = useCallback(() => {
    setSelectedLoanIds([]);
    setBulkCompanyId('');
    setBulkAgentId('');
    setAgentsList([]);
  }, []);
  
  const handleBulkCompanyChange = useCallback(async (companyId: string) => {
    setBulkCompanyId(companyId);
    setBulkAgentId('');
    if (companyId) {
      try {
        const response = await fetch('/api/user');
        const data = await response.json();
        const companyAgents = (data.users || [])
          .filter((u: any) => u.role === 'AGENT' && u.companyId === companyId)
          .map((u: any) => ({
            id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive, createdAt: u.createdAt
          }));
        setAgentsList(companyAgents);
      } catch (error) {
        setAgentsList([]);
      }
    } else {
      setAgentsList([]);
    }
  }, []);
  
  const openEditProduct = useCallback((product: any) => {
    setSelectedProduct(product);
    setProductForm({
      title: product.title,
      description: product.description,
      icon: product.icon || '💰',
      code: product.code || '',
      loanType: product.loanType || 'PERSONAL',
      minInterestRate: product.minInterestRate,
      maxInterestRate: product.maxInterestRate,
      defaultInterestRate: product.defaultInterestRate,
      minTenure: product.minTenure,
      maxTenure: product.maxTenure,
      defaultTenure: product.defaultTenure,
      minAmount: product.minAmount,
      maxAmount: product.maxAmount,
      processingFeePercent: product.processingFeePercent,
      processingFeeMin: product.processingFeeMin,
      processingFeeMax: product.processingFeeMax,
      latePaymentPenaltyPercent: product.latePaymentPenaltyPercent,
      gracePeriodDays: product.gracePeriodDays,
      bounceCharges: product.bounceCharges,
      allowMoratorium: product.allowMoratorium,
      maxMoratoriumMonths: product.maxMoratoriumMonths,
      allowPrepayment: product.allowPrepayment,
      prepaymentCharges: product.prepaymentCharges,
      isActive: product.isActive
    });
    setShowProductDialog(true);
  }, []);
  
  // Computed values
  const pendingForSA = loans.filter(l => l.status === 'SUBMITTED');
  const pendingForFinal = loans.filter(l => l.status === 'CUSTOMER_SESSION_APPROVED');
  const activeLoans = loans.filter(l => ['ACTIVE', 'DISBURSED'].includes(l.status));
  const inProgressLoans = loans.filter(l => !['SUBMITTED', 'ACTIVE', 'DISBURSED', 'CLOSED', 'REJECTED_BY_SA', 'REJECTED_BY_COMPANY', 'REJECTED_FINAL', 'SESSION_REJECTED'].includes(l.status));
  const rejectedLoans = loans.filter(l => ['REJECTED_BY_SA', 'REJECTED_BY_COMPANY', 'REJECTED_FINAL', 'SESSION_REJECTED'].includes(l.status));
  const highRiskLoans = loans.filter(l => (l.riskScore || 0) >= 50);
  
  const companyUsers = users.filter(u => u.role === 'COMPANY');
  const agents = users.filter(u => u.role === 'AGENT');
  const staff = users.filter(u => u.role === 'STAFF');
  const cashiers = users.filter(u => u.role === 'CASHIER');
  const accountants = users.filter(u => u.role === 'ACCOUNTANT');
  const customers = users.filter(u => u.role === 'CUSTOMER');
  
  const totalDisbursed = activeLoans.reduce((sum, l) => sum + (l.sessionForm?.approvedAmount || l.requestedAmount), 0);
  const totalRequested = loans.reduce((sum, l) => sum + l.requestedAmount, 0);
  
  return {
    // Data states
    loans, users, companies, products, settings, interestOnlyLoans, allActiveLoans, activeLoanStats,
    agentsList, mirrorCompanies, loading, fetchedTabs,
    // Selection states
    selectedLoan, selectedUser, selectedLoanIds, selectedLoanId, selectedProduct, selectedInterestOnlyLoan,
    loanToDelete, selectedUserDetails, loanDetails, detailSheetData, mirrorPreview,
    // Dialog states
    showApprovalDialog, showUserDialog, showDeleteConfirmDialog, showLoanDetailsDialog, showProductDialog,
    showInterestOnlyDialog, showStartEMIDialog, showBulkApprovalDialog, showComprehensiveLoanDialog,
    showDeleteLoanDialog, showLoanDetailPanel, showUserDetailsDialog, showRoleSelectDialog, showDetailSheet,
    showResetDialog, showMirrorLoanSheet,
    // Form states
    userForm, productForm, approvalAction, remarks, selectedCompanyId, activeTab, activeLoanFilter,
    bulkApprovalAction, bulkCompanyId, bulkAgentId, detailsTab, deleteReason, detailSheetType,
    resetConfirmText, mirrorLoanConfig, userRoleFilter,
    // Loading states
    savingUser, bulkSaving, loadingDetails, loadingUserDetails, loadingDetailSheet, savingSettings,
    uploadingLogo, deleting, resetting, loadingMirrorPreview,
    // Setters
    setLoans, setUsers, setCompanies, setProducts, setSettings, setInterestOnlyLoans, setAllActiveLoans,
    setActiveLoanStats, setAgentsList, setMirrorCompanies, setLoading, setSelectedLoan, setSelectedUser,
    setSelectedLoanIds, setSelectedLoanId, setSelectedProduct, setSelectedInterestOnlyLoan, setLoanToDelete,
    setSelectedUserDetails, setLoanDetails, setDetailSheetData, setMirrorPreview, setShowApprovalDialog,
    setShowUserDialog, setShowDeleteConfirmDialog, setShowLoanDetailsDialog, setShowProductDialog,
    setShowInterestOnlyDialog, setShowStartEMIDialog, setShowBulkApprovalDialog, setShowComprehensiveLoanDialog,
    setShowDeleteLoanDialog, setShowLoanDetailPanel, setShowUserDetailsDialog, setShowRoleSelectDialog,
    setShowDetailSheet, setShowResetDialog, setShowMirrorLoanSheet, setUserForm, setProductForm,
    setApprovalAction, setRemarks, setSelectedCompanyId, setActiveTab, setActiveLoanFilter,
    setBulkApprovalAction, setBulkCompanyId, setBulkAgentId, setDetailsTab, setDeleteReason,
    setDetailSheetType, setResetConfirmText, setMirrorLoanConfig, setUserRoleFilter,
    logoInputRef,
    // Computed values
    pendingForSA, pendingForFinal, activeLoans, inProgressLoans, rejectedLoans, highRiskLoans,
    companyUsers, agents, staff, cashiers, accountants, customers, totalDisbursed, totalRequested,
    // Handlers
    fetchLoans, fetchUsers, fetchCompanies, fetchProducts, fetchSettings, fetchInterestOnlyLoans,
    fetchAllActiveLoans, fetchLoanDetails, fetchMirrorPreview, handleCreateUser, handleDeleteUser,
    handleUnlockUser, handleSaveProduct, handleDeleteProduct, handleApproval, handleBulkApproval,
    handleDeleteLoan, handleSystemReset, handleLogoUpload, saveSettings, handleSelectLoan,
    handleSelectAll, clearSelection, handleBulkCompanyChange, openEditProduct
  };
}
