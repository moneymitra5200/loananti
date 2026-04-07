'use client';

import { useState, useEffect, lazy, Suspense, memo, useMemo, useCallback, useRef } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import ProfileSection from '@/components/shared/ProfileSection';
import { Shield, FileText, CheckCircle, Users, AlertTriangle, Eye, Building2, UserPlus, Edit, Trash2, Settings, Save, User, ClipboardCheck, Banknote, Briefcase, Plus, TrendingUp, Activity, DollarSign, BarChart3, ArrowRight, ArrowLeft, Calculator, PieChart, X, Loader2, MapPin, Phone, Mail, Calendar, FileCheck, CreditCard, Receipt, ExternalLink, RefreshCw, Info, Hash, CreditCard as CardIcon, Landmark, UserCog, Percent, Camera, Globe, Clock, Key, Unlock } from 'lucide-react';
import { formatCurrency, formatDate, generateApplicationNo } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';
import { getMirrorCompanies, getOriginalCompany } from '@/lib/mirror-company-utils';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { useRealtime } from '@/hooks/useRealtime';
import { useLoansStore } from '@/stores/loansStore';
import { useUsersStore } from '@/stores/usersStore';
import { useCompaniesStore } from '@/stores/companiesStore';

// Lazy load heavy components
const AuditLogViewer = lazy(() => import('@/components/audit/AuditLogViewer'));
const LocationHistoryViewer = lazy(() => import('@/components/admin/LocationHistoryViewer'));
const EMICollectionSection = lazy(() => import('@/components/emi/EMICollectionSection'));
const EMICalendar = lazy(() => import('@/components/emi/EMICalendar'));
const OfflineLoanForm = lazy(() => import('@/components/offline-loan/OfflineLoanForm'));
const OfflineLoansList = lazy(() => import('@/components/offline-loan/OfflineLoansList'));
const PersonalCreditManager = lazy(() => import('@/components/credit/PersonalCreditManager'));
const CreditManagementPage = lazy(() => import('@/components/credit/CreditManagementPage'));
const NotificationManagementSection = lazy(() => import('@/components/notification/NotificationManagementSection'));
const SuperAdminMyCredit = lazy(() => import('@/components/credit/SuperAdminMyCredit'));
const LoanDetailPanel = lazy(() => import('@/components/loan/LoanDetailPanel'));
const OfflineLoanDetailPanel = lazy(() => import('@/components/offline-loan/OfflineLoanDetailPanel'));
const SecondaryPaymentPageSection = lazy(() => import('@/components/shared/SecondaryPaymentPageSection'));

// Lazy load optimized sections
const DashboardOverview = lazy(() => import('./modules/DashboardOverview'));
const FinalApprovalSection = lazy(() => import('./modules/FinalApprovalSection'));
const PendingLoansSectionOptimized = lazy(() => import('./modules/PendingLoansSectionOptimized'));
const SettingsSection = lazy(() => import('./modules/SettingsSection'));
const AnalyticsSection = lazy(() => import('./modules/AnalyticsSection'));
const UsersSection = lazy(() => import('./modules/UsersSection'));
const CustomersSection = lazy(() => import('./modules/CustomersSection'));
const CompaniesSection = lazy(() => import('./modules/CompaniesSection'));
const WebsiteSection = lazy(() => import('./modules/WebsiteSection'));
const RiskSection = lazy(() => import('./modules/RiskSection'));
const ActiveLoansTab = lazy(() => import('./modules/ActiveLoansTab'));
const ClosedLoansTab = lazy(() => import('./modules/ClosedLoansTab'));
const ProductsTab = lazy(() => import('./modules/ProductsTab'));
const PendingTab = lazy(() => import('./modules/PendingTab'));
const FinalTab = lazy(() => import('./modules/FinalTab'));
const SimpleTabs = lazy(() => import('./modules/SimpleTabs'));

// Eager load components used in dialogs
import SystemResetDialog, { ResetOptions } from './modules/SystemResetDialog';

// Import extracted dialog components
import {
  ApprovalDialog,
  LoanDetailsDialog,
  UserDialogs,
  ComprehensiveLoanDialog,
  ProductDialog,
  BulkApprovalDialog,
  DeleteLoanDialog,
  RoleSelectDialog,
  DeleteConfirmDialog,
  UserDetailsDialog,
} from './dialogs';

interface Loan {
  id: string; applicationNo: string; status: string; requestedAmount: number; loanType: string;
  createdAt: string; riskScore: number; fraudFlag: boolean; purpose: string;
  requestedTenure?: number; requestedInterestRate?: number;
  customer: { id: string; name: string; email: string; phone: string; };
  sessionForm?: any; loanForm?: any; company?: any;
}

interface UserItem {
  id: string; name: string; email: string; role: string; isActive: boolean; isLocked?: boolean; createdAt: string;
  phone?: string; company?: string | { id: string; name: string }; companyId?: string; companyObj?: { id: string; name: string };
  agentId?: string; agent?: { id: string; name: string; agentCode?: string }; agentCode?: string; staffCode?: string; cashierCode?: string; accountantCode?: string;
  companyCredit?: number; personalCredit?: number;
}

interface CompanyItem {
  id: string; name: string; code: string; isActive: boolean;
  defaultInterestRate?: number; defaultInterestType?: string;
  enableMirrorLoan?: boolean; mirrorInterestRate?: number | null; mirrorInterestType?: string;
  maxLoanAmount?: number; minLoanAmount?: number; maxTenureMonths?: number;
}

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showLoanDetailsDialog, setShowLoanDetailsDialog] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  
  // User form state with proper typing for optional fields
  interface UserFormState {
    name: string; email: string; phone: string; password: string; role: string; companyId: string; agentId: string;
    code?: string; address?: string; city?: string; state?: string; pincode?: string; gstNumber?: string; panNumber?: string; website?: string;
    ownerName?: string; ownerPhone?: string; ownerEmail?: string; ownerPan?: string; ownerAadhaar?: string; logoUrl?: string;
    isMirrorCompany?: boolean; mirrorInterestRate?: number; mirrorInterestType?: string;
    accountingType?: string; defaultInterestRate?: number; defaultInterestType?: string;
  }
  const [userForm, setUserForm] = useState<UserFormState>({
    name: '', email: '', phone: '', password: '', role: 'COMPANY', companyId: '', agentId: '',
    code: '', address: '', city: '', state: '', pincode: '', gstNumber: '', panNumber: '', website: '',
    ownerName: '', ownerPhone: '', ownerEmail: '', ownerPan: '', ownerAadhaar: '', logoUrl: '',
    isMirrorCompany: true, mirrorInterestRate: undefined, mirrorInterestType: 'REDUCING',
    accountingType: 'FULL', defaultInterestRate: 12, defaultInterestType: 'FLAT'
  });
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'send_back'>('approve');
  const [remarks, setRemarks] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [offlineLoansRefreshKey, setOfflineLoansRefreshKey] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({
    title: '', description: '', icon: '💰', code: '', loanType: 'PERSONAL',
    minInterestRate: 8, maxInterestRate: 24, defaultInterestRate: 12,
    minTenure: 6, maxTenure: 60, defaultTenure: 12,
    minAmount: 10000, maxAmount: 10000000,
    processingFeePercent: 1, processingFeeMin: 500, processingFeeMax: 10000,
    latePaymentPenaltyPercent: 2, gracePeriodDays: 5, bounceCharges: 500,
    allowMoratorium: true, maxMoratoriumMonths: 3,
    allowPrepayment: true, prepaymentCharges: 2, isActive: true
  });
  const [settings, setSettings] = useState<any>({
    companyName: 'Money Mitra Financial Advisor', companyLogo: '', companyTagline: 'Your Dreams, Our Support',
    companyEmail: 'support@smfc.com', companyPhone: '+91 1800-123-4567', companyAddress: '123 Finance Street, Mumbai, MH 400001',
    defaultInterestRate: 12, minInterestRate: 8, maxInterestRate: 24,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Bulk selection state
  const [selectedLoanIds, setSelectedLoanIds] = useState<string[]>([]);
  const [showBulkApprovalDialog, setShowBulkApprovalDialog] = useState(false);
  const [bulkApprovalAction, setBulkApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [bulkCompanyId, setBulkCompanyId] = useState<string>('');
  const [bulkAgentId, setBulkAgentId] = useState<string>('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [agentsList, setAgentsList] = useState<UserItem[]>([]);
  
  // Comprehensive loan details state
  const [loanDetails, setLoanDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showComprehensiveLoanDialog, setShowComprehensiveLoanDialog] = useState(false);
  const [detailsTab, setDetailsTab] = useState('customer');
  
  // Active loans filter state
  const [activeLoanFilter, setActiveLoanFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [allActiveLoans, setAllActiveLoans] = useState<any[]>([]);
  const [activeLoanStats, setActiveLoanStats] = useState<any>({ totalOnline: 0, totalOffline: 0, totalOnlineAmount: 0, totalOfflineAmount: 0 });
  
  // Delete loan state
  const [showDeleteLoanDialog, setShowDeleteLoanDialog] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  // Loan Detail Panel state
  const [showLoanDetailPanel, setShowLoanDetailPanel] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [selectedLoanType, setSelectedLoanType] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  
  // User Details View state
  const [showUserDetailsDialog, setShowUserDetailsDialog] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState<any>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  
  // Role Selection Dialog
  const [showRoleSelectDialog, setShowRoleSelectDialog] = useState(false);
  const [selectedRoleForCreate, setSelectedRoleForCreate] = useState<string>('COMPANY');
  
  // Detail Sheet - Right side panel for A-Z details
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [detailSheetData, setDetailSheetData] = useState<any>(null);
  const [detailSheetType, setDetailSheetType] = useState<'user' | 'company' | 'loan'>('user');
  const [loadingDetailSheet, setLoadingDetailSheet] = useState(false);
  
  // System Reset state
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Mirror Loan Configuration state
  const [mirrorLoanConfig, setMirrorLoanConfig] = useState<{
    enabled: boolean;
    mirrorCompanyId: string;
    mirrorType: 'COMPANY_1_15_PERCENT' | 'COMPANY_2_SAME_RATE' | 'NONE' | 'CUSTOM_RATE';
    mirrorInterestRate?: number;  // User-defined rate per loan
    mirrorInterestType?: string;  // FLAT or REDUCING
  }>({
    enabled: false,
    mirrorCompanyId: '',
    mirrorType: 'NONE',
    mirrorInterestRate: 15,  // Default rate
    mirrorInterestType: 'REDUCING'  // Default type
  });
  const [mirrorPreview, setMirrorPreview] = useState<any>(null);
  const [loadingMirrorPreview, setLoadingMirrorPreview] = useState(false);
  const [mirrorCompanies, setMirrorCompanies] = useState<any[]>([]);

  // Real-time updates hook
  const { requestRefresh } = useRealtime({
    userId: user?.id,
    role: user?.role,
    onLoanStatusChanged: (data) => {
      // Update the loan in local state instantly
      const { loan, oldStatus, newStatus } = data;
      setLoans(prev => prev.map(l => l.id === loan.id ? { ...l, status: newStatus } : l));
      toast({ title: 'Loan Updated', description: `Loan ${loan.applicationNo} status changed to ${newStatus}` });
    },
    onDashboardRefresh: () => {
      // Refresh all data when requested
      fetchAllData();
    }
  });

  // Parallel data fetch - ALL data at once for instant loading
  const fetchAllData = useCallback(async (forceRefresh = false) => {
    // Check if we need to refresh
    const loansStore = useLoansStore.getState();
    const usersStore = useUsersStore.getState();
    const companiesStore = useCompaniesStore.getState();
    
    if (!forceRefresh && !loansStore.needsRefresh() && loansStore.loans.length > 0) {
      // Use cached data - cast to proper type
      setLoans(loansStore.loans as Loan[]);
      setUsers(usersStore.users as UserItem[]);
      setCompanies(companiesStore.companies as CompanyItem[]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // PARALLEL FETCH - All requests at once
      const [
        loansRes,
        usersRes,
        companiesRes,
        productsRes,
        settingsRes,
        allActiveRes
      ] = await Promise.all([
        fetch('/api/loan/list?role=SUPER_ADMIN'),
        fetch('/api/user'),
        fetch('/api/company?isActive=true'),
        fetch('/api/cms/product'),
        fetch('/api/settings'),
        fetch('/api/loan/all-active')
      ]);

      // Process all responses in parallel
      const [loansData, usersData, companiesData, productsData, settingsData, allActiveData] = await Promise.all([
        loansRes.json(),
        usersRes.json(),
        companiesRes.json(),
        productsRes.json(),
        settingsRes.json(),
        allActiveRes.json()
      ]);

      // Update stores
      const loansList = loansData.loans || [];
      const usersList = usersData.users || [];
      const companiesList = companiesData.companies || [];
      
      loansStore.setLoans(loansList);
      usersStore.setUsers(usersList);
      companiesStore.setCompanies(companiesList);

      // Update local state
      setLoans(loansList);
      setUsers(usersList);
      setCompanies(companiesList);
      setProducts(productsData.products || []);
      if (settingsData.settings) {
        setSettings(prev => ({ ...prev, ...settingsData.settings }));
      }
      setAllActiveLoans(allActiveData.loans || []);
      setActiveLoanStats(allActiveData.stats || { totalOnline: 0, totalOffline: 0, totalOnlineAmount: 0, totalOfflineAmount: 0 });

      // Process mirror companies
      const mirrorComps = getMirrorCompanies(companiesList);
      const company3 = getOriginalCompany(companiesList);
      if (company3) {
        setSelectedCompanyId(company3.id);
      }
      setMirrorCompanies(mirrorComps);

      // Set agents list for bulk approval
      const allAgents = usersList.filter((u: UserItem) => u.role === 'AGENT');
      setAgentsList(allAgents);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to fetch data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch ALL data immediately on initial load - PARALLEL
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/company?isActive=true');
      const data = await response.json();
      const companiesList = data.companies || [];
      setCompanies(companiesList);
      
      console.log('[fetchCompanies] Fetched companies:', companiesList.map((c: any) => ({ id: c.id, name: c.name, code: c.code })));
      
      // Use shared utility to get mirror companies
      const mirrorComps = getMirrorCompanies(companiesList);
      
      // Get Company 3 (original company) for default selection
      const company3 = getOriginalCompany(companiesList);
      if (company3) {
        setSelectedCompanyId(company3.id);
      }
      
      console.log('[fetchCompanies] Mirror companies:', mirrorComps.map(c => ({ 
        name: c.name, 
        code: c.code, 
        displayName: c.displayName, 
        mirrorRate: c.mirrorInterestRate 
      })));
      
      setMirrorCompanies(mirrorComps);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  // Fetch mirror loan preview when configuration changes
  const fetchMirrorPreview = async (loan: Loan, mirrorCompanyId: string, mirrorType: string, mirrorRateOverride?: number | null) => {
    if (!loan.sessionForm || !mirrorCompanyId) {
      setMirrorPreview(null);
      return;
    }
    setLoadingMirrorPreview(true);
    try {
      // Get the actual mirror rate to use
      const mirrorCompany = mirrorCompanies.find(c => c.id === mirrorCompanyId);
      const effectiveMirrorRate = mirrorRateOverride ?? mirrorCompany?.mirrorRate ?? loan.sessionForm.interestRate;
      
      const response = await fetch(
        `/api/mirror-loan?action=preview&principal=${loan.sessionForm.approvedAmount}&originalRate=${loan.sessionForm.interestRate}&originalTenure=${loan.sessionForm.tenure}&originalType=${loan.sessionForm.interestType || 'FLAT'}&mirrorType=${mirrorType}&mirrorRate=${effectiveMirrorRate}`
      );
      const data = await response.json();
      if (data.success) {
        setMirrorPreview({
          ...data.calculation,
          appliedMirrorRate: effectiveMirrorRate
        });
      }
    } catch (error) {
      console.error('Error fetching mirror preview:', error);
      setMirrorPreview(null);
    } finally {
      setLoadingMirrorPreview(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.settings) {
        setSettings((prev: any) => ({ ...prev, ...data.settings }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  // Auto-select Company 3 as default when opening approval dialog
  useEffect(() => {
    if (showApprovalDialog && approvalAction === 'approve' && companies.length > 0) {
      // Find Company 3 (the default company for new applications)
      const company3 = companies.find(c => c.code?.includes('3') || c.name?.toLowerCase().includes('company 3'));
      if (company3) {
        setSelectedCompanyId(company3.id);
      } else {
        // Fallback to first company if Company 3 not found
        setSelectedCompanyId(companies[0].id);
      }
    }
  }, [showApprovalDialog, approvalAction, companies]);

  const fetchLoanDetails = async (loanId: string) => {
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
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Settings saved successfully' });
        // Refresh settings context
        window.location.reload();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle logo file upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image size should be less than 2MB', variant: 'destructive' });
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', 'logo');

      const res = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData
      });

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
  };

  // Optimized fetch functions using store cache
  const fetchLoans = async (forceRefresh = false) => {
    const store = useLoansStore.getState();
    if (!forceRefresh && !store.needsRefresh() && store.loans.length > 0) {
      setLoans(store.loans as Loan[]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/loan/list?role=SUPER_ADMIN');
      const data = await response.json();
      const loansList = data.loans || [];
      store.setLoans(loansList);
      setLoans(loansList);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (forceRefresh = false) => {
    const store = useUsersStore.getState();
    if (!forceRefresh && !store.needsRefresh() && store.users.length > 0) {
      setUsers(store.users);
      return;
    }
    try {
      const response = await fetch('/api/user');
      const data = await response.json();
      if (data.users && data.users.length > 0) {
        store.setUsers(data.users);
        setUsers(data.users.map((u: any) => ({
          id: u.id, name: u.name || 'Unknown', email: u.email, role: u.role, isActive: u.isActive,
          createdAt: u.createdAt, phone: u.phone, company: u.company?.name, companyId: u.companyId,
          companyObj: u.company, agentId: u.agentId, agent: u.agent, agentCode: u.agentCode,
          staffCode: u.staffCode, cashierCode: u.cashierCode, accountantCode: u.accountantCode
        })));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/cms/product');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Fetch all active loans (both online and offline)
  const fetchAllActiveLoans = async (forceRefresh = false) => {
    const store = useLoansStore.getState();
    if (!forceRefresh && !store.activeNeedsRefresh() && store.activeLoans.length > 0) {
      setAllActiveLoans(store.activeLoans);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/loan/all-active');
      const data = await response.json();
      const activeLoansList = data.loans || [];
      store.setActiveLoans(activeLoansList);
      setAllActiveLoans(activeLoansList);
      setActiveLoanStats(data.stats || { totalOnline: 0, totalOffline: 0, totalOnlineAmount: 0, totalOfflineAmount: 0 });
    } catch (error) {
      console.error('Error fetching all active loans:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delete loan handler
  const handleDeleteLoan = async () => {
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
        // Refresh both loan lists
        fetchLoans();
        fetchAllActiveLoans();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete loan', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error deleting loan:', error);
      toast({ title: 'Error', description: 'Failed to delete loan', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.password || !userForm.role) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    setSavingUser(true);
    console.log('[handleCreateUser] Creating user:', userForm);
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });
      
      console.log('[handleCreateUser] Response status:', response.status);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[handleCreateUser] Non-JSON response:', text);
        throw new Error('Server returned an invalid response. Please try again.');
      }
      
      const data = await response.json();
      console.log('[handleCreateUser] Response data:', data);
      
      if (response.ok) {
        toast({ title: 'User Created', description: `${userForm.name} has been created successfully` });
        setShowUserDialog(false);
        setUserForm({
          name: '', email: '', phone: '', password: '', role: 'COMPANY', companyId: '', agentId: '',
          code: '', address: '', city: '', state: '', pincode: '', gstNumber: '', panNumber: '', website: '',
          ownerName: '', ownerPhone: '', ownerEmail: '', ownerPan: '', ownerAadhaar: '', logoUrl: '',
          isMirrorCompany: true, mirrorInterestRate: undefined, mirrorInterestType: 'REDUCING',
          accountingType: 'FULL', defaultInterestRate: 12, defaultInterestType: 'FLAT'
        });
        fetchUsers();
        fetchCompanies(); // Refresh companies list if a company user was created
      } else {
        const errorMsg = data.error || data.details || 'Failed to create user';
        console.error('[handleCreateUser] Error:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('[handleCreateUser] Exception:', error);
      const message = (error as Error).message || 'Failed to create user';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async () => {
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
        toast({ 
          title: 'Error', 
          description: data.error || 'Failed to delete user', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' });
    }
  };

  const handleUnlockUser = async (userId: string) => {
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
  };

  const handleSaveProduct = async () => {
    try {
      const url = selectedProduct ? `/api/cms/product?id=${selectedProduct.id}` : '/api/cms/product';
      const method = selectedProduct ? 'PUT' : 'POST';
      
      const body = selectedProduct 
        ? { id: selectedProduct.id, ...productForm }
        : productForm;
      
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
  };

  const handleDeleteProduct = async (productId: string) => {
    // Check if product is permanent
    const product = products.find(p => p.id === productId);
    if (product?.isPermanent) {
      toast({
        title: 'Cannot Delete',
        description: 'This loan product is permanent and cannot be deleted',
        variant: 'destructive'
      });
      return;
    }

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
  };

  const openEditProduct = (product: any) => {
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
  };

  // System Reset Handler
  const handleSystemReset = async (options: any) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User not found. Please login again.',
        variant: 'destructive'
      });
      return;
    }

    setResetting(true);
    try {
      const response = await fetch('/api/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmReset: 'RESET_SYSTEM',
          userId: user.id,
          options: options
        })
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 500));
        throw new Error('Server returned an invalid response. Please try again.');
      }

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'System Reset Complete',
          description: `Selected data cleared in ${data.stats?.duration || 'a few seconds'}. Users, Companies, Loan Products & Settings preserved.`
        });
        setShowResetDialog(false);
        // Refresh all data
        fetchLoans();
        fetchUsers();
        fetchCompanies();
        fetchAllActiveLoans();
        fetchProducts();
      } else {
        toast({
          title: 'Reset Failed',
          description: data.error || 'Failed to reset system',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('System reset error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reset system. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setResetting(false);
    }
  };

  const handleApproval = async () => {
    if (!selectedLoan) return;
    if (selectedLoan.status === 'SUBMITTED' && approvalAction === 'approve' && !selectedCompanyId) {
      toast({ title: 'Company Required', description: 'Please select a company to assign this loan.', variant: 'destructive' });
      return;
    }
    
    // Validate mirror loan configuration for CUSTOMER_SESSION_APPROVED
    if (selectedLoan.status === 'CUSTOMER_SESSION_APPROVED' && approvalAction === 'approve' && mirrorLoanConfig.enabled) {
      if (!mirrorLoanConfig.mirrorCompanyId) {
        toast({ title: 'Mirror Company Required', description: 'Please select a mirror company to enable mirror loan.', variant: 'destructive' });
        return;
      }
    }
    
    try {
      // If approving with mirror loan - create APPROVED pending mirror loan
      // This happens BEFORE the workflow approval
      // Mirror loan will be activated when cashier disburses the original loan
      if (selectedLoan.status === 'CUSTOMER_SESSION_APPROVED' && approvalAction === 'approve' && mirrorLoanConfig.enabled && mirrorLoanConfig.mirrorCompanyId) {
        const mirrorResponse = await fetch('/api/pending-mirror-loan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalLoanId: selectedLoan.id,
            mirrorCompanyId: mirrorLoanConfig.mirrorCompanyId,
            mirrorType: mirrorLoanConfig.mirrorType,
            mirrorInterestRate: mirrorLoanConfig.mirrorInterestRate,  // Custom rate per loan
            mirrorInterestType: mirrorLoanConfig.mirrorInterestType,  // FLAT or REDUCING
            createdBy: user?.id || 'system',
            initialStatus: 'APPROVED' // Ready for cashier disbursement
          })
        });
        
        const mirrorData = await mirrorResponse.json();
        
        if (!mirrorResponse.ok && !mirrorData.alreadyExists) {
          toast({ title: 'Error', description: mirrorData.error || 'Failed to create mirror loan request', variant: 'destructive' });
          return;
        }
      }
      
      const response = await fetch('/api/workflow/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: selectedLoan.id, action: approvalAction, remarks, role: 'SUPER_ADMIN',
          userId: user?.id || 'system', companyId: selectedLoan.status === 'SUBMITTED' ? selectedCompanyId : undefined
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const actionText = approvalAction === 'approve' ? 'Approved' : approvalAction === 'reject' ? 'Rejected' : 'Sent Back';
        const mirrorMessage = mirrorLoanConfig.enabled ? ' Mirror loan scheduled. Cashier will disburse from mirror company bank account.' : '';
        toast({ 
          title: `✅ Application ${actionText} Successfully!`, 
          description: `Application ${selectedLoan.applicationNo} has been ${actionText.toLowerCase()}.${approvalAction === 'approve' ? ' It has been sent to the next stage for processing.' : ''}${mirrorMessage}`,
          duration: 5000
        });
        setShowApprovalDialog(false);
        setRemarks('');
        setSelectedCompanyId('');
        // Reset mirror loan config
        setMirrorLoanConfig({ enabled: false, mirrorCompanyId: '', mirrorType: 'NONE' });
        setMirrorPreview(null);
        fetchLoans();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to process approval', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast({ title: 'Error', description: 'Failed to process approval. Please try again.', variant: 'destructive' });
    }
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
    setBulkCompanyId('');
    setBulkAgentId('');
    setAgentsList([]);
  };

  // Fetch agents when company is selected for bulk approval
  // All agents are common for all companies - show all agents
  const handleBulkCompanyChange = async (companyId: string) => {
    setBulkCompanyId(companyId);
    setBulkAgentId('');
    if (companyId) {
      try {
        const response = await fetch('/api/user');
        const data = await response.json();
        // Show ALL agents - agents are common for all companies
        const allAgents = (data.users || [])
          .filter((u: any) => u.role === 'AGENT')
          .map((u: any) => ({
            id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive, createdAt: u.createdAt,
            agentCode: u.agentCode
          }));
        setAgentsList(allAgents);
      } catch (error) {
        console.error('Error fetching agents:', error);
        setAgentsList([]);
      }
    } else {
      setAgentsList([]);
    }
  };

  // Bulk approval handler
  const handleBulkApproval = async () => {
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

  const pendingForSA = loans.filter(l => l.status === 'SUBMITTED');
  const pendingForFinal = loans.filter(l => l.status === 'CUSTOMER_SESSION_APPROVED');
  const activeLoans = loans.filter(l => ['ACTIVE', 'DISBURSED'].includes(l.status));
  const inProgressLoans = loans.filter(l => !['SUBMITTED', 'ACTIVE', 'DISBURSED', 'CLOSED', 'REJECTED_BY_SA', 'REJECTED_BY_COMPANY', 'REJECTED_FINAL', 'SESSION_REJECTED'].includes(l.status));
  const rejectedLoans = loans.filter(l => ['REJECTED_BY_SA', 'REJECTED_BY_COMPANY', 'REJECTED_FINAL', 'SESSION_REJECTED'].includes(l.status));
  const highRiskLoans = loans.filter(l => (l.riskScore || 0) >= 50);

  // Users by role
  const companyUsers = users.filter(u => u.role === 'COMPANY');
  const agents = users.filter(u => u.role === 'AGENT');
  const staff = users.filter(u => u.role === 'STAFF');
  const cashiers = users.filter(u => u.role === 'CASHIER');
  const accountants = users.filter(u => u.role === 'ACCOUNTANT');
  const customers = users.filter(u => u.role === 'CUSTOMER');

  const totalDisbursed = activeLoans.reduce((sum, l) => sum + (l.sessionForm?.approvedAmount || l.requestedAmount), 0);
  const totalRequested = loans.reduce((sum, l) => sum + l.requestedAmount, 0);

  const stats = [
    { label: 'Total Applications', value: loans.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', onClick: () => setActiveTab('pending') },
    { label: 'Pending Approvals', value: pendingForSA.length + pendingForFinal.length, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', onClick: () => setActiveTab('pending') },
    { label: 'Active Loans', value: activeLoans.length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', onClick: () => setActiveTab('activeLoans') },
    { label: 'Total Disbursed', value: formatCurrency(totalDisbursed), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', onClick: () => setActiveTab('activeLoans') }
  ];

  // Calculate offline loans count from activeLoanStats
  const offlineLoansCount = activeLoanStats.totalOffline || 0;
  const onlineActiveLoansCount = activeLoanStats.totalOnline || 0;
  const totalActiveLoansCount = onlineActiveLoansCount + offlineLoansCount;

  const menuItems = ROLE_MENU_ITEMS.SUPER_ADMIN.map(item => ({
    ...item,
    count: item.id === 'pending' ? pendingForSA.length :
           item.id === 'final' ? pendingForFinal.length :
           item.id === 'activeLoans' ? totalActiveLoansCount :
           item.id === 'offline-loans' ? offlineLoansCount :
           item.id === 'users' ? users.length :
           item.id === 'customers' ? customers.length :
           item.id === 'companies' ? companyUsers.length :
           item.id === 'agents' ? agents.length :
           item.id === 'staff' ? staff.length :
           item.id === 'cashiers' ? cashiers.length :
           item.id === 'accountants' ? accountants.length :
           item.id === 'risk' ? highRiskLoans.length : undefined
  }));

  const renderLoanCard = (loan: Loan, index: number, showActions: boolean = true, actions?: React.ReactNode) => {
    const showSanction = loan.status === 'CUSTOMER_SESSION_APPROVED' && loan.sessionForm;
    const displayAmount = showSanction ? loan.sessionForm.approvedAmount : loan.requestedAmount;
    const displayTenure = showSanction ? loan.sessionForm.tenure : loan.requestedTenure;
    const displayInterest = showSanction ? loan.sessionForm.interestRate : loan.requestedInterestRate;
    const displayEMI = showSanction ? loan.sessionForm.emiAmount : null;
    
    return (
      <motion.div key={loan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
        className={`p-4 border rounded-xl hover:bg-gray-50 transition-all bg-white ${showSanction ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 bg-gradient-to-br from-emerald-400 to-teal-500">
              <AvatarFallback className="bg-transparent text-white font-semibold">{loan.customer?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-gray-900">{loan.applicationNo}</h4>
                {getStatusBadge(loan.status)}
                {loan.fraudFlag && <Badge className="bg-red-100 text-red-700">High Risk</Badge>}
                {showSanction && <Badge className="bg-emerald-100 text-emerald-700">Sanction: {formatCurrency(displayAmount)}</Badge>}
              </div>
              <p className="text-sm text-gray-500">{loan.customer?.name} • {loan.customer?.email}</p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(loan.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              {showSanction ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs text-gray-400 line-through">{formatCurrency(loan.requestedAmount)}</span>
                    <ArrowRight className="h-3 w-3 text-emerald-500" />
                    <p className="font-bold text-lg text-emerald-700">{formatCurrency(displayAmount)}</p>
                  </div>
                  <div className="flex items-center gap-2 justify-end text-xs text-gray-500">
                    <span>{displayTenure} mo</span><span>•</span><span>{displayInterest}%</span><span>•</span>
                    <span className="text-emerald-600 font-medium">EMI: {formatCurrency(displayEMI)}</span>
                  </div>
                </div>
              ) : (<><p className="font-bold text-lg text-gray-900">{formatCurrency(loan.requestedAmount)}</p><p className="text-xs text-gray-500">{loan.loanType}</p></>)}
            </div>
            {actions || (showActions && (<div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setSelectedLoan(loan); setShowLoanDetailsDialog(true); }}><Eye className="h-4 w-4" /></Button>
            </div>))}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'pending':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
            <PendingTab
              pendingForSA={pendingForSA}
              selectedLoanIds={selectedLoanIds}
              handleSelectLoan={handleSelectLoan}
              handleSelectAll={handleSelectAll}
              clearSelection={clearSelection}
              setSelectedLoan={setSelectedLoan}
              setShowLoanDetailsDialog={setShowLoanDetailsDialog}
              setApprovalAction={setApprovalAction}
              setShowApprovalDialog={setShowApprovalDialog}
              setBulkApprovalAction={setBulkApprovalAction}
              setShowBulkApprovalDialog={setShowBulkApprovalDialog}
              getStatusBadge={getStatusBadge}
            />
          </Suspense>
        );

      case 'final':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
            <FinalTab
              pendingForFinal={pendingForFinal}
              setSelectedLoan={setSelectedLoan}
              fetchLoanDetails={fetchLoanDetails}
              setApprovalAction={setApprovalAction}
              setShowApprovalDialog={setShowApprovalDialog}
              renderLoanCard={renderLoanCard}
            />
          </Suspense>
        );

      case 'progress':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
            <SimpleTabs inProgressLoans={inProgressLoans} activeLoans={activeLoans} rejectedLoans={rejectedLoans} renderLoanCard={renderLoanCard} type="progress" />
          </Suspense>
        );

      case 'active':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
            <SimpleTabs inProgressLoans={inProgressLoans} activeLoans={activeLoans} rejectedLoans={rejectedLoans} renderLoanCard={renderLoanCard} type="active" />
          </Suspense>
        );

      case 'activeLoans':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
            <ActiveLoansTab
              allActiveLoans={allActiveLoans}
              activeLoanFilter={activeLoanFilter}
              setActiveLoanFilter={setActiveLoanFilter}
              activeLoanStats={activeLoanStats}
              loading={loading}
              fetchAllActiveLoans={fetchAllActiveLoans}
              setLoanToDelete={setLoanToDelete}
              setShowDeleteLoanDialog={setShowDeleteLoanDialog}
              setSelectedLoanId={(id: string | null) => {
                // Find the loan type from allActiveLoans
                const loan = allActiveLoans.find(l => l.id === id);
                setSelectedLoanId(id);
                setSelectedLoanType(loan?.loanType || 'ONLINE');
              }}
              setShowLoanDetailPanel={setShowLoanDetailPanel}
            />
          </Suspense>
        );

      case 'rejected':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
            <SimpleTabs inProgressLoans={inProgressLoans} activeLoans={activeLoans} rejectedLoans={rejectedLoans} renderLoanCard={renderLoanCard} type="rejected" />
          </Suspense>
        );

      case 'closedLoans':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
            <ClosedLoansTab
              setSelectedLoanId={(id: string | null) => {
                setSelectedLoanId(id);
                setSelectedLoanType('ONLINE');
              }}
              setShowLoanDetailPanel={setShowLoanDetailPanel}
            />
          </Suspense>
        );

      case 'users':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
            <UsersSection
              users={users}
              companyUsers={companyUsers}
              agents={agents}
              staff={staff}
              cashiers={cashiers}
              accountants={accountants}
              userRoleFilter={userRoleFilter}
              setUserRoleFilter={setUserRoleFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onAddUser={() => setShowRoleSelectDialog(true)}
              onViewUserDetails={(userId) => {
                setLoadingUserDetails(true);
                fetch(`/api/user/details?userId=${userId}`)
                  .then(res => res.json())
                  .then(data => {
                    if (data.success) {
                      setSelectedUserDetails(data.user);
                      setShowUserDetailsDialog(true);
                    } else {
                      toast({ title: 'Error', description: 'Failed to fetch user details', variant: 'destructive' });
                    }
                  })
                  .catch(() => toast({ title: 'Error', description: 'Failed to fetch user details', variant: 'destructive' }))
                  .finally(() => setLoadingUserDetails(false));
              }}
              onUnlockUser={handleUnlockUser}
              onDeleteUser={(user) => { setSelectedUser(user); setShowDeleteConfirmDialog(true); }}
            />
          </Suspense>
        );

      case 'customers':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
            <CustomersSection
              customers={users.filter(u => u.role === 'CUSTOMER')}
              loans={loans}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onViewCustomer={(customer) => {
                setSelectedUser(customer);
                setLoadingUserDetails(true);
                fetch(`/api/user/details?userId=${customer.id}`)
                  .then(res => res.json())
                  .then(data => {
                    if (data.success) {
                      setSelectedUserDetails(data.user);
                      setShowUserDetailsDialog(true);
                    } else {
                      toast({ title: 'Error', description: 'Failed to fetch customer details', variant: 'destructive' });
                    }
                  })
                  .catch(() => toast({ title: 'Error', description: 'Failed to fetch customer details', variant: 'destructive' }))
                  .finally(() => setLoadingUserDetails(false));
              }}
            />
          </Suspense>
        );

      case 'companies':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
            <CompaniesSection
              companyUsers={companyUsers}
              agents={agents}
              loans={loans}
              onAddCompany={() => { setUserForm({...userForm, role: 'COMPANY'}); setShowUserDialog(true); }}
              onViewCompany={(companyId) => {
                setLoadingDetailSheet(true);
                setDetailSheetType('company');
                setShowDetailSheet(true);
                fetch(`/api/company/details?companyId=${companyId}`)
                  .then(res => res.json())
                  .then(data => {
                    if (data.success) {
                      setDetailSheetData(data.company);
                    } else {
                      toast({ title: 'Error', description: 'Failed to fetch company details', variant: 'destructive' });
                    }
                  })
                  .catch(() => toast({ title: 'Error', description: 'Failed to fetch company details', variant: 'destructive' }))
                  .finally(() => setLoadingDetailSheet(false));
              }}
            />
          </Suspense>
        );

      case 'products':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
            <ProductsTab
              products={products}
              setShowProductDialog={setShowProductDialog}
              setSelectedProduct={setSelectedProduct}
              setProductForm={setProductForm}
              openEditProduct={openEditProduct}
              handleDeleteProduct={handleDeleteProduct}
            />
          </Suspense>
        );

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
              userRole={user?.role || 'SUPER_ADMIN'}
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
              userRole={user?.role || 'SUPER_ADMIN'}
            />
          </div>
        );

      case 'offline-loans':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Offline Loans</h2>
                <p className="text-gray-500">Manage offline loans created directly</p>
              </div>
              <OfflineLoanForm 
                createdById={user?.id || ''} 
                createdByRole={user?.role || 'SUPER_ADMIN'}
                onLoanCreated={() => {
                  setOfflineLoansRefreshKey(k => k + 1);
                }}
              />
            </div>
            <OfflineLoansList 
              userId={user?.id}
              userRole={user?.role || 'SUPER_ADMIN'}
              refreshKey={offlineLoansRefreshKey}
            />
          </div>
        );

      case 'myCredit':
        return <SuperAdminMyCredit />;

      case 'audit':
        return <AuditLogViewer />;

      case 'locationHistory':
        return <LocationHistoryViewer />;

      case 'personalCredits':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Personal Credit Management</h2>
                <p className="text-gray-500">Manage and clear personal credits - only CASH increases company credit</p>
              </div>
            </div>
            <PersonalCreditManager currentUser={{ id: user?.id || '', role: user?.role || 'SUPER_ADMIN' }} />
          </div>
        );

      case 'creditManagement':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Credit Management</h2>
                <p className="text-gray-500">Manage other users' credits - Company, Agent, Staff, Cashier</p>
              </div>
            </div>
            <CreditManagementPage />
          </div>
        );

      case 'notifications':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
            <NotificationManagementSection />
          </Suspense>
        );

      case 'secondary-payment-pages':
        return (
          <SecondaryPaymentPageSection
            userId={user?.id || 'system'}
            companies={companies}
            isSuperAdmin={true}
          />
        );

      case 'settings':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
            <SettingsSection
              settings={settings}
              setSettings={setSettings}
              savingSettings={savingSettings}
              onSave={saveSettings}
              onLogoUpload={handleLogoUpload}
              uploadingLogo={uploadingLogo}
              stats={{
                totalUsers: users.length,
                companies: companyUsers.length,
                activeLoans: activeLoans.length,
                totalDisbursed
              }}
              onShowResetDialog={() => setShowResetDialog(true)}
            />
          </Suspense>
        );

      case 'analytics':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
            <AnalyticsSection
              loans={loans}
              activeLoans={activeLoans}
              inProgressLoans={inProgressLoans}
              pendingForSA={pendingForSA}
              pendingForFinal={pendingForFinal}
              rejectedLoans={rejectedLoans}
              highRiskLoans={highRiskLoans}
              totalRequested={totalRequested}
              totalDisbursed={totalDisbursed}
            />
          </Suspense>
        );

      case 'risk':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
            <RiskSection
              loans={loans}
              highRiskLoans={highRiskLoans}
              onViewLoan={(loan) => { setSelectedLoan(loan); setShowLoanDetailsDialog(true); }}
            />
          </Suspense>
        );

      case 'website':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
            <WebsiteSection
              settings={settings}
              setSettings={setSettings}
              savingSettings={savingSettings}
              onSave={saveSettings}
              onLogoUpload={handleLogoUpload}
              uploadingLogo={uploadingLogo}
            />
          </Suspense>
        );

      case 'profile':
        return <ProfileSection />;

      case 'dashboard':
      default:
        return (
          <div className="space-y-6">
            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Application Pipeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: 'New Applications', count: pendingForSA.length, color: 'bg-blue-500', width: loans.length ? (pendingForSA.length / loans.length * 100) : 0 },
                      { label: 'In Progress', count: inProgressLoans.length, color: 'bg-amber-500', width: loans.length ? (inProgressLoans.length / loans.length * 100) : 0 },
                      { label: 'Active Loans', count: activeLoans.length, color: 'bg-green-500', width: loans.length ? (activeLoans.length / loans.length * 100) : 0 },
                      { label: 'Rejected', count: rejectedLoans.length, color: 'bg-red-500', width: loans.length ? (rejectedLoans.length / loans.length * 100) : 0 },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{item.label}</span>
                          <span className="font-medium">{item.count}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className={`${item.color} h-2 rounded-full transition-all`} style={{ width: `${item.width}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">User Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Companies', count: companyUsers.length, icon: Building2, color: 'text-blue-600 bg-blue-50' },
                      { label: 'Agents', count: agents.length, icon: Users, color: 'text-emerald-600 bg-emerald-50' },
                      { label: 'Staff', count: staff.length, icon: User, color: 'text-purple-600 bg-purple-50' },
                      { label: 'Cashiers', count: cashiers.length, icon: Banknote, color: 'text-orange-600 bg-orange-50' },
                      { label: 'Accountants', count: accountants.length, icon: Calculator, color: 'text-teal-600 bg-teal-50' },
                    ].map((item) => (
                      <div key={item.label} className={`p-4 rounded-xl ${item.color.split(' ')[1]}`}>
                        <item.icon className={`h-5 w-5 ${item.color.split(' ')[0]} mb-2`} />
                        <p className="text-2xl font-bold">{item.count}</p>
                        <p className="text-sm text-gray-600">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Pending Applications */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Pending Applications</CardTitle>
                  {pendingForSA.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('pending')}>
                      View All <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {pendingForSA.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
                    <p>All caught up! No pending applications.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingForSA.slice(0, 5).map((loan, index) => (
                      <div key={loan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-100 text-blue-700">{loan.customer?.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{loan.applicationNo}</p>
                            <p className="text-sm text-gray-500">{loan.customer?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-semibold">{formatCurrency(loan.requestedAmount)}</p>
                          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600" 
                            onClick={() => { setSelectedLoan(loan); setApprovalAction('approve'); setShowApprovalDialog(true); }}>
                            Review
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <DashboardLayout
      title="Super Admin Dashboard"
      subtitle="Manage the entire loan management system"
      menuItems={menuItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      stats={stats}
      gradient="bg-gradient-to-br from-purple-600 to-indigo-700"
      logoIcon={Shield}
    >
      {renderContent()}

      {/* Approval Dialog */}
      <ApprovalDialog
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
        selectedLoan={selectedLoan}
        approvalAction={approvalAction}
        setApprovalAction={setApprovalAction}
        remarks={remarks}
        setRemarks={setRemarks}
        selectedCompanyId={selectedCompanyId}
        setSelectedCompanyId={setSelectedCompanyId}
        companies={companies}
        mirrorLoanConfig={mirrorLoanConfig}
        setMirrorLoanConfig={setMirrorLoanConfig}
        mirrorCompanies={mirrorCompanies}
        mirrorPreview={mirrorPreview}
        loadingMirrorPreview={loadingMirrorPreview}
        fetchMirrorPreview={fetchMirrorPreview}
        setMirrorPreview={setMirrorPreview}
        handleApproval={handleApproval}
        getStatusBadge={getStatusBadge}
      />

      {/* Loan Details Dialog */}
      <LoanDetailsDialog
        open={showLoanDetailsDialog}
        onOpenChange={setShowLoanDetailsDialog}
        selectedLoan={selectedLoan}
        getStatusBadge={getStatusBadge}
      />

      {/* User Dialogs */}
      <UserDialogs
        showUserDialog={showUserDialog}
        setShowUserDialog={setShowUserDialog}
        userForm={userForm}
        setUserForm={setUserForm}
        savingUser={savingUser}
        handleCreateUser={handleCreateUser}
        agents={agents}
      />

      {/* Comprehensive Loan Details Dialog */}
      <ComprehensiveLoanDialog
        open={showComprehensiveLoanDialog}
        onOpenChange={setShowComprehensiveLoanDialog}
        loadingDetails={loadingDetails}
        loanDetails={loanDetails}
        detailsTab={detailsTab}
        setDetailsTab={setDetailsTab}
        getStatusBadge={getStatusBadge}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={showDeleteConfirmDialog}
        onOpenChange={setShowDeleteConfirmDialog}
        selectedUser={selectedUser}
        handleDeleteUser={handleDeleteUser}
      />

      {/* Product Dialog */}
      <ProductDialog
        open={showProductDialog}
        onOpenChange={setShowProductDialog}
        selectedProduct={selectedProduct}
        productForm={productForm}
        setProductForm={setProductForm}
        handleSaveProduct={handleSaveProduct}
      />

      {/* Bulk Approval Dialog */}
      <BulkApprovalDialog
        open={showBulkApprovalDialog}
        onOpenChange={setShowBulkApprovalDialog}
        selectedLoanIds={selectedLoanIds}
        bulkApprovalAction={bulkApprovalAction}
        bulkCompanyId={bulkCompanyId}
        setBulkCompanyId={setBulkCompanyId}
        bulkAgentId={bulkAgentId}
        setBulkAgentId={setBulkAgentId}
        bulkSaving={bulkSaving}
        companies={companies}
        agentsList={agentsList}
        handleBulkCompanyChange={handleBulkCompanyChange}
        handleBulkApproval={handleBulkApproval}
        pendingForSA={pendingForSA}
      />

      {/* Delete Loan Dialog */}
      <DeleteLoanDialog
        open={showDeleteLoanDialog}
        onOpenChange={(open) => { setShowDeleteLoanDialog(open); if (!open) { setLoanToDelete(null); setDeleteReason(''); } }}
        loanToDelete={loanToDelete}
        deleteReason={deleteReason}
        setDeleteReason={setDeleteReason}
        deleting={deleting}
        handleDeleteLoan={handleDeleteLoan}
        setLoanToDelete={setLoanToDelete}
      />

      {/* Role Selection Dialog */}
      <RoleSelectDialog
        open={showRoleSelectDialog}
        onOpenChange={setShowRoleSelectDialog}
        onSelectRole={(role) => {
          setSelectedRoleForCreate(role);
          setShowRoleSelectDialog(false);
          setUserForm({...userForm, role: role});
          setShowUserDialog(true);
        }}
      />

      {/* Detail Sheet - Right side panel for A-Z details */}
      <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {detailSheetType === 'company' && <Building2 className="h-5 w-5 text-blue-600" />}
              {detailSheetType === 'user' && <Users className="h-5 w-5 text-emerald-600" />}
              {detailSheetType === 'loan' && <FileText className="h-5 w-5 text-violet-600" />}
              {detailSheetType === 'company' ? 'Company Details' : detailSheetType === 'user' ? 'User Details' : 'Loan Details'}
            </SheetTitle>
            <SheetDescription>
              Complete A-Z information and activity
            </SheetDescription>
          </SheetHeader>
          
          {loadingDetailSheet ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : detailSheetData ? (
            <div className="mt-6 space-y-6">
              {/* Header Card */}
              <Card className="border-0 shadow-sm bg-gradient-to-r from-gray-50 to-white">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className={
                        detailSheetType === 'company' ? 'bg-blue-100 text-blue-700 text-xl' :
                        detailSheetType === 'user' ? 'bg-emerald-100 text-emerald-700 text-xl' :
                        'bg-violet-100 text-violet-700 text-xl'
                      }>
                        {detailSheetData.name?.charAt(0) || detailSheetData.title?.charAt(0) || 'N'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{detailSheetData.name || detailSheetData.title}</h3>
                      <p className="text-gray-500">{detailSheetData.email || detailSheetData.code}</p>
                      <div className="flex gap-2 mt-2">
                        {detailSheetData.code && <Badge variant="outline">{detailSheetData.code}</Badge>}
                        <Badge className={detailSheetData.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {detailSheetData.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Basic Information */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="h-4 w-4 text-gray-400" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {detailSheetData.contactEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="text-sm font-medium">{detailSheetData.contactEmail}</p>
                        </div>
                      </div>
                    )}
                    {detailSheetData.contactPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="text-sm font-medium">{detailSheetData.contactPhone}</p>
                        </div>
                      </div>
                    )}
                    {detailSheetData.address && (
                      <div className="flex items-center gap-2 col-span-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Address</p>
                          <p className="text-sm font-medium">{detailSheetData.address}</p>
                          {(detailSheetData.city || detailSheetData.state) && (
                            <p className="text-xs text-gray-500">{detailSheetData.city}, {detailSheetData.state} {detailSheetData.pincode}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {detailSheetData.createdAt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Created</p>
                          <p className="text-sm font-medium">{formatDate(detailSheetData.createdAt)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Financial Details */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    Financial Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {detailSheetData.companyCredit !== undefined && (
                      <div className="p-3 bg-emerald-50 rounded-lg">
                        <p className="text-xs text-emerald-600">Company Credit</p>
                        <p className="text-lg font-bold text-emerald-700">{formatCurrency(detailSheetData.companyCredit || 0)}</p>
                      </div>
                    )}
                    {detailSheetData.maxLoanAmount && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-600">Max Loan</p>
                        <p className="text-lg font-bold text-blue-700">{formatCurrency(detailSheetData.maxLoanAmount)}</p>
                      </div>
                    )}
                    {detailSheetData.minLoanAmount && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">Min Loan</p>
                        <p className="text-lg font-bold text-gray-700">{formatCurrency(detailSheetData.minLoanAmount)}</p>
                      </div>
                    )}
                    {detailSheetData.defaultInterestRate && (
                      <div className="p-3 bg-violet-50 rounded-lg">
                        <p className="text-xs text-violet-600">Interest Rate</p>
                        <p className="text-lg font-bold text-violet-700">{detailSheetData.defaultInterestRate}%</p>
                      </div>
                    )}
                    {detailSheetData.maxTenureMonths && (
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <p className="text-xs text-orange-600">Max Tenure</p>
                        <p className="text-lg font-bold text-orange-700">{detailSheetData.maxTenureMonths} months</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Users Under This Company */}
              {detailSheetType === 'company' && detailSheetData._count && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      Users & Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-cyan-50 rounded-lg">
                        <p className="text-2xl font-bold text-cyan-700">{detailSheetData._count.users || 0}</p>
                        <p className="text-xs text-cyan-600">Total Users</p>
                      </div>
                      <div className="text-center p-3 bg-violet-50 rounded-lg">
                        <p className="text-2xl font-bold text-violet-700">{detailSheetData._count.loanApplications || 0}</p>
                        <p className="text-xs text-violet-600">Loan Applications</p>
                      </div>
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-700">{detailSheetData._count.agents || 0}</p>
                        <p className="text-xs text-emerald-600">Agents</p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-700">{detailSheetData._count.staff || 0}</p>
                        <p className="text-xs text-orange-600">Staff</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Recent Activity */}
              {detailSheetData.recentActivity && detailSheetData.recentActivity.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4 text-gray-400" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {detailSheetData.recentActivity.map((activity: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded text-sm">
                            <Badge variant="outline" className="text-xs">{activity.module || activity.action}</Badge>
                            <span className="flex-1 truncate">{activity.description || activity.action}</span>
                            <span className="text-xs text-gray-400">{formatDate(activity.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
              
              {/* Quick Actions */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />View Full
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4 mr-1" />Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Users className="h-12 w-12 mb-3 text-gray-300" />
              <p>No data available</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
      
      {/* User Details Dialog */}
      <UserDetailsDialog
        open={showUserDetailsDialog}
        onOpenChange={setShowUserDetailsDialog}
        selectedUserDetails={selectedUserDetails}
        loadingUserDetails={loadingUserDetails}
      />

      {/* Loan Detail Panel - Conditional based on loan type */}
      {selectedLoanType === 'OFFLINE' ? (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>}>
          <OfflineLoanDetailPanel
            loanId={selectedLoanId}
            open={showLoanDetailPanel}
            onClose={() => { setShowLoanDetailPanel(false); setSelectedLoanId(null); }}
            userId={user?.id || ''}
            userRole={user?.role || 'SUPER_ADMIN'}
            onPaymentSuccess={() => { fetchLoans(); fetchAllActiveLoans(); setOfflineLoansRefreshKey(prev => prev + 1); }}
          />
        </Suspense>
      ) : (
        <LoanDetailPanel
          loanId={selectedLoanId}
          open={showLoanDetailPanel}
          onClose={() => { setShowLoanDetailPanel(false); setSelectedLoanId(null); }}
          userRole={user?.role || 'SUPER_ADMIN'}
          userId={user?.id || ''}
          onPaymentSuccess={() => { fetchLoans(); fetchAllActiveLoans(); }}
        />
      )}

      {/* System Reset Dialog */}
      <SystemResetDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onReset={handleSystemReset}
        resetting={resetting}
      />
    </DashboardLayout>
  );
}
