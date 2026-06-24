'use client';

import { useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { RefreshProvider } from '@/contexts/RefreshContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import NotificationBell from '@/components/notification/NotificationBell';
import PushNotificationInit from '@/components/notification/PushNotificationInit';
import DashboardAlertPopup from '@/components/notification/DashboardAlertPopup';
import {
  Home, FileText, CheckCircle, Clock, Users, Wallet, Shield, Building2, BarChart3,
  Settings, LogOut, Menu, Search, Edit, Calculator, MapPin, AlertTriangle, PieChart,
  CreditCard, Banknote, User, ClipboardCheck, Calendar, Receipt, TrendingUp,
  Target, FileCheck, Activity, Briefcase, BookOpen, IndianRupee, Landmark, Percent,
  FileSpreadsheet, Globe, RefreshCw, Bell, Sparkles, MessageSquare, MessageCircle, TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';

interface MenuItem { id: string; label: string; icon: React.ElementType; count?: number; badge?: string; children?: MenuItem[]; }

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  menuItems?: MenuItem[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  stats?: { label: string; value: string | number; icon: React.ElementType; color: string; onClick?: () => void; clickable?: boolean }[];
  gradient?: string;
  logoIcon?: React.ElementType;
  headerRight?: ReactNode;
}

export default function DashboardLayout({
  children, 
  title = 'Dashboard', 
  subtitle, 
  menuItems = [], 
  activeTab = 'dashboard', 
  onTabChange, 
  stats, 
  gradient = 'bg-gradient-to-br from-emerald-500 to-teal-600', 
  logoIcon: LogoIcon = Landmark, 
  headerRight
}: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const { settings } = useSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced search fetching
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setSearchResults(data.results || []);
          }
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (result: any) => {
    // Dispatch custom event for child components
    window.dispatchEvent(new CustomEvent('global-search-select', { detail: result }));

    // Determine target tab based on user role and result type
    let targetTab = '';
    
    if (result.type === 'offline_loan') {
      targetTab = 'offline-loans';
    } else if (result.type === 'online_loan') {
      if (user?.role === 'SUPER_ADMIN') {
        targetTab = result.status === 'APPROVED' || result.status === 'DISBURSED' ? 'activeLoans' : 'pending';
      } else if (user?.role === 'COMPANY') {
        targetTab = result.status === 'APPROVED' || result.status === 'DISBURSED' ? 'active' : 'pending';
      } else if (user?.role === 'AGENT') {
        targetTab = result.status === 'APPROVED' || result.status === 'DISBURSED' ? 'active' : 'pending';
      } else if (user?.role === 'STAFF') {
        targetTab = result.status === 'APPROVED' || result.status === 'DISBURSED' ? 'activeLoans' : 'pending';
      } else if (user?.role === 'CASHIER') {
        targetTab = result.status === 'APPROVED' || result.status === 'DISBURSED' ? 'activeLoans' : 'pending';
      }
    } else if (result.type === 'user') {
      if (user?.role === 'SUPER_ADMIN' || user?.role === 'CASHIER') {
        targetTab = result.role === 'CUSTOMER' ? 'customers' : 'users';
      } else if (user?.role === 'ACCOUNTANT') {
        targetTab = 'overview'; // Accountant overview displays the ledger select
      }
    }

    if (targetTab && onTabChange) {
      onTabChange(targetTab);
    }

    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
    setActiveResultIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveResultIndex(prev => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveResultIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeResultIndex >= 0 && activeResultIndex < searchResults.length) {
        handleResultClick(searchResults[activeResultIndex]);
      }
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  // Ref to block re-open during the 250ms exit animation (fixes stuck drawer bug)
  const isClosingRef = useRef(false);

  const openSidebar = useCallback(() => {
    if (isClosingRef.current) return; // still animating out — ignore tap
    setSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    isClosingRef.current = true;
    setSidebarOpen(false);
    // Release lock after exit animation completes (tween 0.25s + 50ms buffer)
    setTimeout(() => { isClosingRef.current = false; }, 320);
  }, []);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const userName = user?.name || 'User';
  const userRole = user?.role?.replace('_', ' ') || 'User';
  const userInitial = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const displayTitle = settings.companyName || title;
  // Use circle logo for header (fits better in nav bar)
  const displayLogo = settings.companyLogo || '/logo-circle.png';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Dual Credit System State
  const [companyCredit, setCompanyCredit] = useState<number>(0);
  const [personalCredit, setPersonalCredit] = useState<number>(0);
  const [totalCompanyCredit, setTotalCompanyCredit] = useState<number>(0);
  const [totalPersonalCredit, setTotalPersonalCredit] = useState<number>(0);

  const fetchUserCredit = useCallback(async () => {
    if (!user?.id || user?.role === 'CUSTOMER') return;
    try {
      if (user.role === 'ACCOUNTANT') {
        const superAdminRes = await fetch('/api/user?role=SUPER_ADMIN');
        if (superAdminRes.ok) {
          const superAdmins = await superAdminRes.json();
          if (superAdmins.users?.length > 0) {
            let totalCompany = 0;
            let totalPersonal = 0;
            for (const admin of superAdmins.users) {
              totalCompany += admin.companyCredit || 0;
              totalPersonal += admin.personalCredit || 0;
            }
            setTotalCompanyCredit(totalCompany);
            setTotalPersonalCredit(totalPersonal);
          }
        }
      } else {
        const res = await fetch(`/api/credit?userId=${user.id}&action=summary`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.summary) {
            setCompanyCredit(data.summary.companyCredit || 0);
            setPersonalCredit(data.summary.personalCredit || 0);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch credit:', error);
    }
  }, [user?.id, user?.role]);

  // Safety-net poll every 10 min. Instant updates come via `credit-updated` window event or socket.
  useEffect(() => {
    fetchUserCredit();
    const interval = setInterval(fetchUserCredit, 600_000);
    const handler = () => fetchUserCredit();
    window.addEventListener('credit-updated', handler);
    return () => {
      clearInterval(interval);
      window.removeEventListener('credit-updated', handler);
    };
  }, [fetchUserCredit]);

  return (
    <RefreshProvider>
    <div className="h-[100dvh] bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 flex flex-col overflow-hidden">
      {/* Push notification registration + FCM token save */}
      <PushNotificationInit />
      {/* Role-based daily briefing popup */}
      <DashboardAlertPopup />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 lg:px-6 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={openSidebar}>
              <Menu className="h-6 w-6" />
            </Button>
            {displayLogo ? (
              <div className="h-10 w-auto max-w-[160px] flex items-center">
                <img src={displayLogo} alt={displayTitle} className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div className={`w-10 h-10 rounded-xl ${gradient} flex items-center justify-center shadow-lg`}>
                <LogoIcon className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900">{displayTitle}</h1>
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Credit Display for ACCOUNTANT - Show TOTAL credits from Super Admin */}
            {user?.role === 'ACCOUNTANT' && (
              <>
                {/* Total Company Credit */}
                <motion.div 
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="p-1.5 bg-emerald-100 rounded-md">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Total Company Credit</p>
                    <p className="text-sm font-bold text-emerald-700">{formatCurrency(totalCompanyCredit)}</p>
                  </div>
                </motion.div>
                
                {/* Total Personal Credit */}
                <motion.div 
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="p-1.5 bg-amber-100 rounded-md">
                    <User className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-amber-600 font-medium">Total Personal Credit</p>
                    <p className="text-sm font-bold text-amber-700">{formatCurrency(totalPersonalCredit)}</p>
                  </div>
                </motion.div>
              </>
            )}
            
            {/* Credit Display for other roles (except CUSTOMER, SUPER_ADMIN, ACCOUNTANT) */}
            {user?.role !== 'CUSTOMER' && user?.role !== 'SUPER_ADMIN' && user?.role !== 'ACCOUNTANT' && (
              <>
                {/* Company Credit */}
                <motion.div 
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="p-1.5 bg-emerald-100 rounded-md">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Company Credit</p>
                    <p className="text-sm font-bold text-emerald-700">{formatCurrency(companyCredit)}</p>
                  </div>
                </motion.div>
                
                {/* Personal Credit */}
                <motion.div 
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="p-1.5 bg-amber-100 rounded-md">
                    <User className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-amber-600 font-medium">Personal Credit</p>
                    <p className="text-sm font-bold text-amber-700">{formatCurrency(personalCredit)}</p>
                  </div>
                </motion.div>
              </>
            )}
            
            {/* Dual Credit Display for SUPER_ADMIN */}
            {user?.role === 'SUPER_ADMIN' && (
              <>
                {/* Company Credit */}
                <motion.div 
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="p-1.5 bg-emerald-100 rounded-md">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Company Credit</p>
                    <p className="text-sm font-bold text-emerald-700">{formatCurrency(companyCredit)}</p>
                  </div>
                </motion.div>
                
                {/* Personal Credit */}
                <motion.div 
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="p-1.5 bg-amber-100 rounded-md">
                    <User className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-amber-600 font-medium">Personal Credit</p>
                    <p className="text-sm font-bold text-amber-700">{formatCurrency(personalCredit)}</p>
                  </div>
                </motion.div>
              </>
            )}
            <div ref={searchRef} className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-10 w-64 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all" 
                placeholder="Search loans, customers..." 
                value={searchQuery} 
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                  setActiveResultIndex(-1);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={handleKeyDown}
              />
              
              {/* Floating search results overlay */}
              {searchOpen && (searchQuery.length >= 2) && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden max-h-96 flex flex-col">
                  {searchLoading ? (
                    <div className="p-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                      <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                      <span>Searching...</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400">
                      No results found for "{searchQuery}"
                    </div>
                  ) : (
                    <div className="overflow-y-auto py-1.5 divide-y divide-gray-50 max-h-80">
                      {searchResults.map((result, idx) => {
                        const isSelected = idx === activeResultIndex;
                        let Icon = FileText;
                        if (result.type === 'user') Icon = Users;
                        if (result.type === 'online_loan') Icon = Wallet;

                        return (
                          <button
                            key={`${result.type}-${result.id}`}
                            onClick={() => handleResultClick(result)}
                            onMouseEnter={() => setActiveResultIndex(idx)}
                            className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${
                              isSelected ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg mt-0.5 ${
                              isSelected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate text-gray-900">{result.title}</p>
                              <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                              {result.amount && (
                                <p className="text-xs font-medium text-emerald-600 mt-0.5">
                                  Amount: ₹{result.amount.toLocaleString('en-IN')}
                                </p>
                              )}
                            </div>
                            {result.status && (
                              <Badge className={`text-[10px] px-1.5 py-0.5 mt-0.5 ${
                                result.status === 'ACTIVE' || result.status === 'DISBURSED'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : result.status === 'CLOSED'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-amber-100 text-amber-800 border-amber-200'
                              }`}>
                                {result.status}
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <NotificationBell />
            
            {/* User Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 pl-3 border-l border-gray-200 cursor-pointer hover:opacity-80 transition-opacity">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900">{userName}</p>
                    <p className="text-xs text-gray-500">{userRole}</p>
                  </div>
                  <Avatar className="h-9 w-9 border-2 border-white shadow">
                    <AvatarImage src={user?.profilePicture} alt={userName} />
                    <AvatarFallback className={`${gradient} text-white font-semibold text-sm`}>{userInitial}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{userName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onTabChange?.('profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={async () => {
                    await signOut();
                  }}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {headerRight}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Mobile Sidebar — key on AnimatePresence forces a clean mount/unmount cycle */}
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <React.Fragment key="mobile-sidebar">
              {/* Backdrop */}
              <motion.div
                variants={{ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }}
                initial="initial" animate="animate" exit="exit"
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/50 z-50 lg:hidden"
                // Use closeSidebar (with lock) so rapid taps don't re-open mid-animation
                onClick={closeSidebar}
                onTouchEnd={(e) => { e.preventDefault(); closeSidebar(); }}
                style={{ touchAction: 'none' }}
              />
              {/* Sidebar panel */}
              <motion.nav
                variants={{ initial: { x: -280 }, animate: { x: 0 }, exit: { x: -280 } }}
                initial="initial" animate="animate" exit="exit"
                transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
                className="fixed top-0 left-0 h-[100dvh] w-72 bg-white z-[60] shadow-2xl lg:hidden flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <SidebarContent menuItems={menuItems} activeTab={activeTab}
                  onTabChange={(tab) => { onTabChange?.(tab); }}
                  expandedMenu={expandedMenu} setExpandedMenu={setExpandedMenu} signOut={signOut}
                  gradient={gradient} onClose={closeSidebar}
                  companyName={settings.companyName} companyLogo={settings.companyLogo} userRole={user?.role} />
              </motion.nav>
            </React.Fragment>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar */}
        <nav className="hidden lg:flex lg:flex-col lg:w-72 lg:bg-white lg:border-r lg:border-gray-200 lg:overflow-y-auto lg:flex-shrink-0">
          <SidebarContent menuItems={menuItems} activeTab={activeTab} onTabChange={onTabChange || (() => {})}
            expandedMenu={expandedMenu} setExpandedMenu={setExpandedMenu} signOut={signOut}
            gradient={gradient} onClose={() => {}} companyName={settings.companyName} companyLogo={settings.companyLogo} userRole={user?.role} />
        </nav>

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden md:overflow-x-auto p-4 lg:p-6 w-full max-w-full">
          {stats && stats.length > 0 && activeTab === 'dashboard' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                const isClickable = stat.clickable !== false && stat.onClick;
                return (
                  <motion.div 
                    key={stat.label} 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: index * 0.05 }} 
                    whileHover={isClickable ? { y: -4, scale: 1.02, transition: { duration: 0.2 } } : undefined}
                    whileTap={isClickable ? { scale: 0.98 } : undefined}
                  >
                    <div 
                      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full transition-all ${
                        isClickable ? 'cursor-pointer hover:shadow-md hover:border-emerald-200' : ''
                      }`}
                      onClick={stat.onClick}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        </div>
                        <div className={`p-2 rounded-lg ${stat.color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                          <Icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
    </RefreshProvider>
  );
}

function SidebarContent({ menuItems, activeTab, onTabChange, expandedMenu, setExpandedMenu, signOut, gradient, onClose, companyName, companyLogo, userRole }: {
  menuItems: MenuItem[]; activeTab: string; onTabChange: (tab: string) => void; expandedMenu: string | null; setExpandedMenu: (menu: string | null) => void;
  signOut: () => void; gradient: string; onClose: () => void; companyName?: string; companyLogo?: string; userRole?: string;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {companyLogo ? <img src={companyLogo} alt={companyName || 'Logo'} className="h-8 w-auto max-w-[120px] object-contain" />
            : <div className={`w-8 h-8 rounded-lg ${gradient} flex items-center justify-center`}><Shield className="w-4 h-4 text-white" /></div> }
          <span className="font-semibold text-gray-900">{companyName || 'Menu'}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </Button>
      </div>
      
      <div
        className="flex-1 overflow-y-auto overscroll-contain p-3"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedMenu === item.id;
            return (
              <div key={item.id}>
              <motion.button
                  onClick={() => {
                    // Single-shot close: close first (synchronous state set),
                    // then tab change in next microtask so state has flushed.
                    // This eliminates the double-fire / stuck drawer bug.
                    onClose();
                    if (hasChildren) {
                      setExpandedMenu(isExpanded ? null : item.id);
                    } else {
                      setTimeout(() => onTabChange(item.id), 10);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all relative group touch-manipulation ${isActive ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                  whileTap={{ scale: 0.97 }}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                  <span className="flex-1 text-sm">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <Badge className={`h-5 min-w-5 px-1.5 text-xs ${isActive ? 'bg-emerald-500' : 'bg-gray-200 text-gray-700'}`}>{item.count}</Badge>
                  )}
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="p-3 border-t border-gray-100 space-y-2">
        {/* Settings only for SUPER_ADMIN */}
        {userRole === 'SUPER_ADMIN' && (
          <button
            onClick={() => { onClose(); setTimeout(() => onTabChange('settings'), 10); }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm transition-all touch-manipulation ${activeTab === 'settings' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Settings className="h-5 w-5 text-gray-400" />Settings
          </button>
        )}
        <button
          onClick={() => { onClose(); setTimeout(() => signOut(), 10); }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm text-red-600 hover:bg-red-50 transition-all touch-manipulation">
          <LogOut className="h-5 w-5" />Sign Out
        </button>
      </div>
    </div>
  );
}

// Menu configurations for each role
// Note: Settings button is rendered separately at the bottom of the sidebar
export const ROLE_MENU_ITEMS: Record<string, MenuItem[]> = {
  SUPER_ADMIN: [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'emi-collection', label: 'EMI Collection', icon: Wallet },
    { id: 'emi-calendar', label: 'EMI Calendar', icon: Calendar },
    { id: 'offline-loans', label: 'Offline Loans', icon: FileText },
    { id: 'pending', label: 'New Applications', icon: FileText },
    { id: 'final', label: 'Final Approvals', icon: CheckCircle },
    { id: 'progress', label: 'In Progress', icon: Clock },
    { id: 'activeLoans', label: 'Active Loans', icon: Wallet },
    { id: 'closedLoans', label: 'Closed Loans', icon: CheckCircle },
    { id: 'expense', label: 'Expenses', icon: TrendingDown },
    { id: 'myCredit', label: 'My Credit', icon: IndianRupee },
    { id: 'creditManagement', label: 'Credit Management', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'enquiry', label: 'Enquiries', icon: MessageSquare },
    { id: 'tickets', label: 'Support Tickets', icon: MessageCircle },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'customers', label: 'Customers', icon: User },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'secondary-payment-pages', label: 'Payment Pages', icon: Banknote },
    { id: 'locationHistory', label: 'Location History', icon: MapPin },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'risk', label: 'Risk Management', icon: AlertTriangle },
    { id: 'products', label: 'Loan Products', icon: Briefcase },
    { id: 'website', label: 'Website Management', icon: Globe },
    { id: 'audit', label: 'Audit Logs', icon: Activity }
  ],
  COMPANY: [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'bank-head', label: 'Bank Head', icon: Landmark },
    { id: 'daybook', label: 'Daybook', icon: BookOpen },
    { id: 'emi-collection', label: 'EMI Collection', icon: Wallet },
    { id: 'emi-calendar', label: 'EMI Calendar', icon: Calendar },
    { id: 'offline-loans', label: 'Offline Loans', icon: FileText },
    { id: 'pending', label: 'Pending Approvals', icon: Clock },
    { id: 'progress', label: 'In Progress', icon: FileText },
    { id: 'active', label: 'Active Loans', icon: CheckCircle },
    { id: 'closedLoans', label: 'Closed Loans', icon: CheckCircle },
    { id: 'agents', label: 'Agent Management', icon: Users },
    { id: 'personalCredits', label: 'My Credits', icon: IndianRupee },
    { id: 'portfolio', label: 'Portfolio', icon: PieChart },
    { id: 'risk', label: 'Risk Analysis', icon: Target },
    { id: 'audit', label: 'Audit Logs', icon: Activity }
  ],
  AGENT: [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'emi-collection', label: 'EMI Collection', icon: Wallet },
    { id: 'emi-calendar', label: 'EMI Calendar', icon: Calendar },
    { id: 'offline-loans', label: 'Offline Loans', icon: FileText },
    { id: 'pending', label: 'Pending Approval', icon: Clock },
    { id: 'session', label: 'Create Sanction', icon: Edit },
    { id: 'pending-disbursement', label: 'Pending Disbursement', icon: TrendingUp },
    { id: 'active', label: 'Active Loans', icon: CheckCircle },
    { id: 'closedLoans', label: 'Closed Loans', icon: CheckCircle },
    { id: 'staff', label: 'My Staff', icon: ClipboardCheck },
    { id: 'myCredit', label: 'My Credit', icon: IndianRupee },
    { id: 'calculator', label: 'EMI Calculator', icon: Calculator },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'audit', label: 'Audit Logs', icon: Activity }
  ],
  STAFF: [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'pending', label: 'Pending Verification', icon: Clock },
    { id: 'completed', label: 'Completed', icon: CheckCircle },
    { id: 'activeLoans', label: 'Active Loans', icon: Banknote },
    { id: 'closedLoans', label: 'Closed Loans', icon: CheckCircle },
    { id: 'myCredit', label: 'My Credit', icon: IndianRupee },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'audit', label: 'Audit Logs', icon: Activity }
  ],
  CASHIER: [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'pending', label: 'Pending Disbursement', icon: Clock },
    { id: 'expense', label: 'Expense Requests', icon: TrendingDown },
    { id: 'paymentRequests', label: 'Payment Requests', icon: FileText },
    { id: 'secondary-payment-pages', label: 'Payment Pages', icon: Banknote },
    { id: 'offline-loans', label: 'Offline Loans', icon: FileText },
    { id: 'history', label: 'Recent', icon: Receipt },
    { id: 'activeLoans', label: 'Active Loans', icon: Banknote },
    { id: 'closedLoans', label: 'Closed Loans', icon: CheckCircle },
    { id: 'customers', label: 'Customers', icon: User },
    { id: 'myCredit', label: 'My Credit', icon: IndianRupee },
    { id: 'enquiry', label: 'Enquiries', icon: MessageSquare },
    { id: 'tickets', label: 'Support Tickets', icon: MessageCircle },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'audit', label: 'Audit Logs', icon: Activity }
  ],
  CUSTOMER: [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'services', label: 'Services', icon: Briefcase },
    { id: 'loans', label: 'My Loans', icon: Wallet }
  ],
  ACCOUNTANT: [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'excel-export', label: 'Excel Export', icon: FileSpreadsheet },
    { id: 'money-logs', label: 'Money Logs', icon: Activity },
    { id: 'chart-of-accounts', label: 'Chart of Accounts', icon: BookOpen },
    { id: 'journal', label: 'Journal Entries', icon: Edit },
    { id: 'fixed-assets', label: 'Fixed Assets', icon: Building2 },
    { id: 'trial-balance', label: 'Trial Balance', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: PieChart },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'bank', label: 'Bank Accounts', icon: Banknote },
    { id: 'year-end', label: 'Year End', icon: Calendar }
  ]
};
