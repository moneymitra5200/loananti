'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Wallet, Shield, Clock, Users, TrendingUp, Phone, Mail, MapPin, ArrowRight, 
  FileText, User, Lock, Calculator, Award, CheckCircle2, Zap, 
  Target, Handshake, Globe, MessageCircle, Send, Building2, Star,
  IndianRupee, Calendar, Percent, Menu, X, ChevronRight, Play,
  FileCheck, CreditCard, BadgeCheck, Headphones, Facebook, Twitter, Linkedin, Instagram
} from 'lucide-react';
import StaffLoginPage from '@/components/auth/StaffLoginPage';
import CustomerLoginPage from '@/components/auth/CustomerLoginPage';
import { useSettings } from '@/contexts/SettingsContext';

type AuthView = 'landing' | 'staff-login' | 'customer-login';

// EMI Calculator Component
function EMICalculator() {
  const [principal, setPrincipal] = useState(500000);
  const [rate, setRate] = useState(12);
  const [tenure, setTenure] = useState(24);

  const calculations = useMemo(() => {
    const r = rate / 12 / 100;
    const n = tenure;
    const calculatedEmi = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const total = calculatedEmi * n;
    const interest = total - principal;
    
    return {
      emi: Math.round(calculatedEmi),
      totalInterest: Math.round(interest),
      totalAmount: Math.round(total)
    };
  }, [principal, rate, tenure]);

  return (
    <Card className="shadow-xl border-0 bg-white">
      <CardContent className="p-4 sm:p-6 md:p-8">
        <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Loan Amount</label>
                <span className="text-sm font-bold text-emerald-600">₹{principal.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="10000"
                max="10000000"
                step="10000"
                value={principal}
                onChange={(e) => setPrincipal(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>₹10,000</span>
                <span>₹1,00,00,000</span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Interest Rate (% p.a.)</label>
                <span className="text-sm font-bold text-emerald-600">{rate}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="0.25"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5%</span>
                <span>30%</span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Tenure (Months)</label>
                <span className="text-sm font-bold text-emerald-600">{tenure} Months</span>
              </div>
              <input
                type="range"
                min="6"
                max="84"
                value={tenure}
                onChange={(e) => setTenure(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>6 Months</span>
                <span>84 Months</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 sm:p-6 flex flex-col justify-center">
            <div className="text-center mb-6 md:mb-8">
              <p className="text-gray-600 mb-2 text-sm">Your Monthly EMI</p>
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-emerald-600">₹{calculations.emi.toLocaleString()}</p>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center p-3 sm:p-4 bg-white rounded-xl shadow-sm">
                <span className="text-gray-600 text-sm sm:text-base">Principal Amount</span>
                <span className="font-bold text-gray-800 text-sm sm:text-base">₹{principal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 sm:p-4 bg-white rounded-xl shadow-sm">
                <span className="text-gray-600 text-sm sm:text-base">Total Interest</span>
                <span className="font-bold text-orange-500 text-sm sm:text-base">₹{calculations.totalInterest.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 sm:p-4 bg-emerald-600 text-white rounded-xl">
                <span className="font-medium text-sm sm:text-base">Total Amount Payable</span>
                <span className="font-bold text-sm sm:text-base">₹{calculations.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Moving Staff Carousel
function StaffCarousel({ staffList }: { staffList: any[] }) {
  const [duplicatedStaff] = useState(() => [...staffList, ...staffList, ...staffList]);
  
  if (staffList.length === 0) return null;
  
  return (
    <div className="overflow-hidden py-8">
      <div 
        className="flex gap-6 animate-scroll"
        style={{
          animation: 'scroll 30s linear infinite',
        }}
      >
        {duplicatedStaff.map((staff: any, index: number) => (
          <Card key={`${staff.id}-${index}`} className="flex-shrink-0 w-64 border-0 shadow-lg hover:shadow-xl transition-shadow bg-white">
            <CardContent className="p-6 text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-100 border-4 border-emerald-200">
                {staff.profilePicture ? (
                  <img src={staff.profilePicture} alt={staff.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-emerald-600">
                    {staff.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <h4 className="font-semibold text-gray-800 text-lg">{staff.name || 'Team Member'}</h4>
              <p className="text-sm text-emerald-600 font-medium">{staff.role?.replace(/_/g, ' ') || 'Staff'}</p>
              {staff.email && <p className="text-xs text-gray-500 mt-2">{staff.email}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      <style jsx global>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
      `}</style>
    </div>
  );
}

export default function LandingPage() {
  const { settings } = useSettings();
  const [stats, setStats] = useState({ totalLoans: 0, totalDisbursed: 0, activeCustomers: 0, companies: 0 });
  const [services, setServices] = useState<any[]>([]);
  const [authView, setAuthView] = useState<AuthView>('landing');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Fetch CMS data
  useEffect(() => {
    if (authView !== 'landing') return;
    
    const controller = new AbortController();
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        const [productsRes, statsRes] = await Promise.all([
          fetch('/api/cms/product?isActive=true', { signal: controller.signal }),
          fetch('/api/cms/service?type=all', { signal: controller.signal })
        ]);
        
        if (!isMounted) return;
        
        const productsData = await productsRes.json();
        const statsData = await statsRes.json();
        
        setServices(productsData.products || []);
        setStats(statsData.stats || { totalLoans: 0, totalDisbursed: 0, activeCustomers: 0, companies: 0 });
        
        // Fetch staff
        try {
          const staffRes = await fetch('/api/user?role=STAFF', { signal: controller.signal });
          const agentRes = await fetch('/api/user?role=AGENT', { signal: controller.signal });
          const cashierRes = await fetch('/api/user?role=CASHIER', { signal: controller.signal });
          
          if (!isMounted) return;
          
          const staffData = await staffRes.json();
          const agentData = await agentRes.json();
          const cashierData = await cashierRes.json();
          
          const allStaff = [
            ...(staffData.users || []),
            ...(agentData.users || []),
            ...(cashierData.users || [])
          ].filter((u: any) => u.name && u.isActive);
          
          setStaffList(allStaff);
        } catch (staffError) {
          // Ignore abort errors
          const err = staffError as Error;
          if (isMounted && err.name !== 'AbortError' && !err.message.includes('unmounted')) {
            console.error('Error fetching staff:', staffError);
          }
        }
      } catch (error) {
        // Ignore abort errors (component unmounted or request cancelled)
        const err = error as Error;
        if (isMounted && err.name !== 'AbortError' && !err.message.includes('unmounted')) {
          console.error('Error fetching CMS data:', error);
        }
      }
    };
    
    fetchData();

    return () => {
      isMounted = false;
      controller.abort('Component unmounted');
    };
  }, [authView]);

  // Show login pages
  if (authView === 'staff-login') {
    return <StaffLoginPage onBack={() => setAuthView('landing')} />;
  }

  if (authView === 'customer-login') {
    return <CustomerLoginPage onBack={() => setAuthView('landing')} />;
  }

  // Only use products from database - no demo/fallback products
  const displayServices = services;

  const processSteps = [
    { icon: FileCheck, title: 'Apply Online', desc: 'Fill the simple application form in 2 minutes' },
    { icon: FileText, title: 'Document Upload', desc: 'Upload basic KYC documents online' },
    { icon: CheckCircle2, title: 'Quick Verification', desc: 'Our team verifies your application' },
    { icon: CreditCard, title: 'Loan Sanction', desc: 'Get instant approval & disbursement' },
  ];

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // In real app, send to API
    setFormSubmitted(true);
    setTimeout(() => setFormSubmitted(false), 3000);
    setContactForm({ name: '', email: '', phone: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24">
          <div className="flex items-center justify-between h-24 md:h-28 py-4">
            {/* Logo & Brand */}
            <div className="flex items-center gap-4 md:gap-6">
              {settings.companyLogo ? (
                <img 
                  src={settings.companyLogo} 
                  alt={settings.companyName || 'Company'} 
                  className="h-18 md:h-22 w-auto object-contain max-w-[220px] md:max-w-[280px]" 
                />
              ) : (
                <div className="w-18 h-18 md:w-22 md:h-22 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Wallet className="h-9 w-9 md:h-11 md:w-11 text-white" />
                </div>
              )}
              {!settings.companyLogo && (
                <div className="flex flex-col">
                  <span className="text-xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent leading-tight">
                    {settings.companyName || 'Money Mitra'}
                  </span>
                  <span className="text-xs md:text-sm text-gray-500 font-semibold tracking-wider uppercase">Financial Services</span>
                </div>
              )}
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-10 xl:gap-14">
              <a href="#home" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">Home</a>
              <a href="#process" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">How It Works</a>
              <a href="#products" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">Products</a>
              <a href="#calculator" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">Calculator</a>
              <a href="#about" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">About</a>
              <a href="#staff" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">Our Team</a>
              <a href="#contact" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">Contact</a>
            </nav>
            
            <div className="hidden lg:flex items-center gap-4">
              <Button variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-medium px-6" onClick={() => setAuthView('staff-login')}>
                <User className="h-4 w-4 mr-2" />Staff Login
              </Button>
              <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg px-6" onClick={() => setAuthView('customer-login')}>
                <Lock className="h-4 w-4 mr-2" />Customer Login
              </Button>
            </div>
            
            <Button variant="ghost" className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-6 py-6 space-y-4">
              <a href="#home" className="block py-2 text-gray-700 font-medium" onClick={() => setMobileMenuOpen(false)}>Home</a>
              <a href="#process" className="block py-2 text-gray-700 font-medium" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
              <a href="#products" className="block py-2 text-gray-700 font-medium" onClick={() => setMobileMenuOpen(false)}>Products</a>
              <a href="#calculator" className="block py-2 text-gray-700 font-medium" onClick={() => setMobileMenuOpen(false)}>Calculator</a>
              <a href="#about" className="block py-2 text-gray-700 font-medium" onClick={() => setMobileMenuOpen(false)}>About</a>
              <a href="#staff" className="block py-2 text-gray-700 font-medium" onClick={() => setMobileMenuOpen(false)}>Our Team</a>
              <a href="#contact" className="block py-2 text-gray-700 font-medium" onClick={() => setMobileMenuOpen(false)}>Contact</a>
              <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                <Button variant="outline" className="w-full border-emerald-500 text-emerald-600" onClick={() => setAuthView('staff-login')}>
                  Staff Login
                </Button>
                <Button className="w-full bg-emerald-500 text-white" onClick={() => setAuthView('customer-login')}>
                  Customer Login
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 pt-24 md:pt-28">
        {/* Hero Section */}
        <section id="home" className="relative min-h-[90vh] flex items-center overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50"></div>
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-400 rounded-full filter blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-400 rounded-full filter blur-3xl"></div>
          </div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
          
          <div className="relative w-full px-6 sm:px-10 lg:px-16 xl:px-24 py-20">
            <div className="text-center max-w-4xl mx-auto">
              <Badge className="bg-emerald-100 text-emerald-700 px-4 py-1.5 text-sm font-medium mb-6">
                🏆 Trusted by 5+ Lakh Customers Across India
              </Badge>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                Get Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Dream Loan</span>
                <br className="hidden sm:block" />in 59 Minutes
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                {settings.companyTagline || 'Quick approvals. Low interest rates. Minimal documentation. Experience hassle-free lending with Money Mitra Financial Services.'}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12">
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 sm:px-10 py-5 sm:py-6 text-base sm:text-lg shadow-xl" onClick={() => setAuthView('customer-login')}>
                  Apply Now <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="px-6 sm:px-10 py-5 sm:py-6 text-base sm:text-lg border-2" onClick={() => document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' })}>
                  <Calculator className="mr-2 h-5 w-5" />Calculate EMI
                </Button>
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-3xl mx-auto">
                <div className="text-center p-3 sm:p-4 bg-white/50 rounded-xl">
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-600">8%</p>
                  <p className="text-xs sm:text-sm text-gray-500">Interest Rate</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-white/50 rounded-xl">
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-600">59</p>
                  <p className="text-xs sm:text-sm text-gray-500">Min Approval</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-white/50 rounded-xl">
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-600">5Cr+</p>
                  <p className="text-xs sm:text-sm text-gray-500">Loan Amount</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-white/50 rounded-xl">
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-emerald-600">24/7</p>
                  <p className="text-xs sm:text-sm text-gray-500">Support</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Banner */}
        <section className="py-12 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
          <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <FileText className="h-10 w-10 mx-auto mb-3 text-emerald-400" />
                <p className="text-3xl md:text-4xl font-bold">{(stats.totalLoans || 50000).toLocaleString()}+</p>
                <p className="text-gray-400 text-sm mt-1">Loans Disbursed</p>
              </div>
              <div className="text-center">
                <Wallet className="h-10 w-10 mx-auto mb-3 text-emerald-400" />
                <p className="text-3xl md:text-4xl font-bold">₹{Math.round((stats.totalDisbursed || 5000000000) / 10000000)}Cr+</p>
                <p className="text-gray-400 text-sm mt-1">Total Disbursed</p>
              </div>
              <div className="text-center">
                <Users className="h-10 w-10 mx-auto mb-3 text-emerald-400" />
                <p className="text-3xl md:text-4xl font-bold">{(stats.activeCustomers || 500000).toLocaleString()}+</p>
                <p className="text-gray-400 text-sm mt-1">Happy Customers</p>
              </div>
              <div className="text-center">
                <Building2 className="h-10 w-10 mx-auto mb-3 text-emerald-400" />
                <p className="text-3xl md:text-4xl font-bold">{stats.companies || 100}+</p>
                <p className="text-gray-400 text-sm mt-1">Partner Banks</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="process" className="py-12 sm:py-16 md:py-20 bg-white">
          <div className="w-full px-4 sm:px-6 md:px-10 lg:px-16 xl:px-24">
            <div className="text-center mb-10 sm:mb-16">
              <Badge className="bg-emerald-100 text-emerald-700 mb-4">Simple Process</Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
              <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">Get your loan approved in just 4 simple steps</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 relative">
              {/* Connection Line */}
              <div className="hidden md:block absolute top-16 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-200"></div>
              
              {processSteps.map((step, index) => (
                <div key={step.title} className="relative text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg relative z-10">
                    <step.icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div className="absolute -top-2 sm:-top-3 left-1/2 -translate-x-1/2 w-6 h-6 sm:w-8 sm:h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow">
                    {index + 1}
                  </div>
                  <h3 className="text-base sm:text-xl font-semibold text-gray-800 mb-1 sm:mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-gray-50">
          <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24">
            <div className="text-center mb-16">
              <Badge className="bg-emerald-100 text-emerald-700 mb-4">Why Choose Us</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">The Money Mitra Advantage</h2>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Clock, title: 'Quick Approval', desc: 'Get loan approval in just 59 minutes with our streamlined process', color: 'emerald' },
                { icon: Shield, title: '100% Secure', desc: 'Bank-grade security with end-to-end encryption for your data', color: 'blue' },
                { icon: TrendingUp, title: 'Lowest Rates', desc: 'Interest rates starting from just 8% p.a. with flexible tenure', color: 'purple' },
                { icon: Headphones, title: '24/7 Support', desc: 'Dedicated customer support team available round the clock', color: 'orange' },
                { icon: BadgeCheck, title: 'No Hidden Charges', desc: 'Transparent pricing with zero processing fees on select loans', color: 'pink' },
                { icon: Zap, title: 'Instant Disbursement', desc: 'Funds transferred directly to your account within 24 hours', color: 'yellow' },
                { icon: FileCheck, title: 'Minimal Documents', desc: 'Simple documentation with digital KYC verification', color: 'cyan' },
                { icon: Target, title: 'Flexible EMI', desc: 'Choose your EMI amount and tenure as per your convenience', color: 'indigo' },
              ].map((item) => (
                <Card key={item.title} className="border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white group">
                  <CardContent className="p-6">
                    <div className={`w-14 h-14 bg-${item.color}-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <item.icon className={`h-7 w-7 text-${item.color}-600`} />
                    </div>
                    <h3 className="font-semibold text-lg text-gray-800 mb-2">{item.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Loan Products */}
        <section id="products" className="py-20 bg-white">
          <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24">
            <div className="text-center mb-16">
              <Badge className="bg-emerald-100 text-emerald-700 mb-4">Our Products</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Loan Products for Every Need</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">Choose from our wide range of customized loan products designed to meet your financial requirements</p>
            </div>
            
            {displayServices.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayServices.map((product: any) => (
                  <Card key={product.id} className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white overflow-hidden group">
                    <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                    <CardContent className="p-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                        {product.icon || '💰'}
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-3">{product.title}</h3>
                      <p className="text-gray-600 text-sm mb-6 leading-relaxed">{product.description}</p>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-500 text-sm">Interest Rate</span>
                          <span className="font-semibold text-emerald-600">{product.minInterestRate || 8}% - {product.maxInterestRate || 24}% p.a.</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-500 text-sm">Loan Amount</span>
                          <span className="font-semibold text-gray-800">₹{(product.minAmount || 10000).toLocaleString()} - ₹{(product.maxAmount >= 10000000 ? `${Math.round(product.maxAmount / 10000000)}Cr` : `${Math.round(product.maxAmount / 100000)}L`)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-500 text-sm">Tenure</span>
                          <span className="font-semibold text-gray-800">{product.minTenure || 6} - {product.maxTenure || 84} Months</span>
                        </div>
                      </div>
                      
                      <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg" onClick={() => setAuthView('customer-login')}>
                        Apply Now <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-2xl">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 text-lg">Our loan products will be available soon. Please check back later.</p>
              </div>
            )}
          </div>
        </section>

        {/* EMI Calculator */}
        <section id="calculator" className="py-20 bg-gradient-to-br from-gray-50 to-emerald-50">
          <div className="w-full max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 xl:px-24">
            <div className="text-center mb-16">
              <Badge className="bg-emerald-100 text-emerald-700 mb-4">Financial Tools</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">EMI Calculator</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">Plan your loan with our easy-to-use EMI calculator. Know your monthly payments before you apply.</p>
            </div>
            <EMICalculator />
          </div>
        </section>

        {/* About Us */}
        <section id="about" className="py-20 bg-white">
          <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <Badge className="bg-emerald-100 text-emerald-700 mb-4">About Us</Badge>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Your Trusted Financial Partner Since 2015
                </h2>
                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  {settings.companyName || 'Money Mitra Financial Services'} is a leading digital lending platform committed to providing quick, transparent, and affordable loans. We understand your dreams and offer tailored financial solutions to help you achieve them.
                </p>
                <p className="text-gray-600 leading-relaxed mb-8">
                  With over a decade of experience in the financial sector, we have helped thousands of customers realize their dreams - be it buying a new home, starting a business, or funding education. Our mission is to make credit accessible to everyone with minimal documentation and maximum convenience.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: '10+', label: 'Years Experience' },
                    { value: '100+', label: 'Cities Covered' },
                    { value: '500+', label: 'Partner Banks' },
                    { value: '99%', label: 'Satisfaction Rate' },
                  ].map((item) => (
                    <div key={item.label} className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{item.value}</p>
                      <p className="text-sm text-gray-600">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="relative">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white">
                  <h3 className="text-2xl font-bold mb-6">Our Mission</h3>
                  <ul className="space-y-4">
                    {[
                      'Make credit accessible to everyone',
                      'Provide transparent and fair lending',
                      'Ensure quick and hassle-free processing',
                      'Build long-term customer relationships',
                      'Support financial inclusion across India',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CheckCircle2 className="h-6 w-6 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Staff */}
        <section id="staff" className="py-20 bg-gradient-to-br from-gray-50 to-emerald-50">
          <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24">
            <div className="text-center mb-12">
              <Badge className="bg-emerald-100 text-emerald-700 mb-4">Our Team</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Meet Our Expert Team</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">Our dedicated professionals are here to help you at every step of your financial journey</p>
            </div>
            
            {staffList.length > 0 ? (
              <StaffCarousel staffList={staffList} />
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 text-lg">Our team information coming soon...</p>
              </div>
            )}
          </div>
        </section>

        {/* Location */}
        <section id="location" className="py-20 bg-white">
          <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24">
            <div className="text-center mb-16">
              <Badge className="bg-emerald-100 text-emerald-700 mb-4">Visit Us</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Location</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">Visit our office for personalized assistance</p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="border-0 shadow-lg overflow-hidden">
                <div className="h-80 bg-gray-200">
                  <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241317.11609823277!2d72.74109995709657!3d19.08219873558502!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c6306644edc1%3A0x5da4ed8f8d648c69!2sMumbai%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1638000000000!5m2!1sen!2sin"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
              </Card>
              
              <div className="space-y-6">
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-7 w-7 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-lg mb-1">Office Address</h4>
                        <p className="text-gray-600">{settings.companyAddress || '123 Finance Street, Andheri East, Mumbai, Maharashtra 400069'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Phone className="h-7 w-7 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-lg mb-1">Phone Number</h4>
                        <p className="text-gray-600">{settings.companyPhone || '+91 1800-123-4567 (Toll Free)'}</p>
                        <p className="text-gray-600">+91 9876543210</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Mail className="h-7 w-7 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-lg mb-1">Email Address</h4>
                        <p className="text-gray-600">{settings.companyEmail || 'support@moneymitra.com'}</p>
                        <p className="text-gray-600">info@moneymitra.com</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Clock className="h-7 w-7 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-lg mb-1">Working Hours</h4>
                        <p className="text-gray-600">Monday - Saturday: 9:00 AM - 6:00 PM</p>
                        <p className="text-gray-600">Sunday: Closed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Us */}
        <section id="contact" className="py-20 bg-gradient-to-br from-gray-50 to-emerald-50">
          <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24">
            <div className="text-center mb-16">
              <Badge className="bg-emerald-100 text-emerald-700 mb-4">Get In Touch</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">Have questions? We're here to help. Reach out to us and we'll respond as soon as possible.</p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <Card className="border-0 shadow-xl bg-white">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-gray-800 mb-6">Send us a Message</h3>
                  
                  {formSubmitted ? (
                    <div className="text-center py-12">
                      <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-500" />
                      <h4 className="text-xl font-semibold text-gray-800 mb-2">Message Sent!</h4>
                      <p className="text-gray-600">We'll get back to you within 24 hours.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-5">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Your Name</label>
                        <Input
                          placeholder="Enter your full name"
                          value={contactForm.name}
                          onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                          className="h-12"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Email</label>
                          <Input
                            placeholder="your@email.com"
                            type="email"
                            value={contactForm.email}
                            onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                            className="h-12"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Phone</label>
                          <Input
                            placeholder="+91 9876543210"
                            value={contactForm.phone}
                            onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                            className="h-12"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Your Message</label>
                        <Textarea
                          placeholder="How can we help you?"
                          rows={5}
                          value={contactForm.message}
                          onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white h-12 text-lg shadow-lg">
                        <Send className="h-5 w-5 mr-2" />Send Message
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
              
              {/* Quick Help */}
              <div className="space-y-6">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <CardContent className="p-8">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="h-8 w-8" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold mb-2">Need Quick Help?</h4>
                        <p className="text-white/90 mb-4">Chat with our Cashier Support for instant assistance with your queries</p>
                        <Button className="bg-white text-emerald-600 hover:bg-gray-100" onClick={() => setAuthView('customer-login')}>
                          Chat with Cashier
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-lg bg-white">
                  <CardContent className="p-8">
                    <h4 className="text-xl font-bold text-gray-800 mb-4">Frequently Asked Questions</h4>
                    <div className="space-y-4">
                      {[
                        { q: 'What documents are required?', a: 'Basic KYC documents like Aadhaar, PAN, and income proof.' },
                        { q: 'How long for loan approval?', a: 'Most loans are approved within 59 minutes.' },
                        { q: 'Is there any processing fee?', a: 'Processing fees vary by product, some have zero fees.' },
                      ].map((item) => (
                        <div key={item.q} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                          <p className="font-medium text-gray-800 mb-1">{item.q}</p>
                          <p className="text-gray-600 text-sm">{item.a}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-lg bg-white">
                  <CardContent className="p-6">
                    <h4 className="font-semibold text-gray-800 mb-4">Follow Us</h4>
                    <div className="flex gap-4">
                      {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
                        <a key={i} href="#" className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 hover:bg-emerald-100 hover:text-emerald-600 transition-colors">
                          <Icon className="h-5 w-5" />
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                {settings.companyLogo ? (
                  <img src={settings.companyLogo} alt={settings.companyName || 'Company'} className="h-10 w-auto brightness-0 invert" />
                ) : (
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-white" />
                  </div>
                )}
                <span className="text-xl font-bold">{settings.companyName || 'Money Mitra'}</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Your trusted financial partner for all your lending needs. Quick approvals, low rates, and exceptional service.
              </p>
              <div className="flex gap-4">
                {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 hover:bg-emerald-500 hover:text-white transition-colors">
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-lg mb-6">Quick Links</h4>
              <ul className="space-y-3">
                {['Home', 'About Us', 'Products', 'Calculator', 'Contact'].map((link) => (
                  <li key={link}>
                    <a href={`#${link.toLowerCase().replace(' ', '')}`} className="text-gray-400 hover:text-emerald-400 transition-colors text-sm">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Loan Products */}
            <div>
              <h4 className="font-semibold text-lg mb-6">Loan Products</h4>
              <ul className="space-y-3">
                {['Personal Loan', 'Business Loan', 'Home Loan', 'Education Loan', 'Gold Loan', 'Vehicle Loan'].map((product) => (
                  <li key={product}>
                    <a href="#products" className="text-gray-400 hover:text-emerald-400 transition-colors text-sm">
                      {product}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Contact */}
            <div>
              <h4 className="font-semibold text-lg mb-6">Contact Info</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-400 text-sm">{settings.companyAddress || 'Mumbai, Maharashtra, India'}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-emerald-400" />
                  <span className="text-gray-400 text-sm">{settings.companyPhone || '+91 1800-123-4567'}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-emerald-400" />
                  <span className="text-gray-400 text-sm">{settings.companyEmail || 'support@moneymitra.com'}</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-gray-400 text-sm text-center md:text-left">
                © {new Date().getFullYear()} {settings.companyName || 'Money Mitra Financial Services'}. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm text-gray-400">
                <a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-emerald-400 transition-colors">Disclaimer</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
