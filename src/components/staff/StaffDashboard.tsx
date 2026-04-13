'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout, { ROLE_MENU_ITEMS } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, Clock, Users, User, FileSearch, Upload, MapPin, Briefcase, Banknote, ArrowLeft, ArrowRight, Loader2, FileEdit, Sparkles, Car, ClipboardList, BarChart3, TrendingUp, Calendar, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { formatCurrency, validatePAN, validateAadhaar, validateIFSC, validatePhone } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import LoanDetailPanel from '@/components/loan/LoanDetailPanel';
import MyCreditPassbook from '@/components/credit/MyCreditPassbook';
import { DashboardTab, PendingTab, CompletedTab, ActiveLoansTab } from '@/components/staff/tabs';
import ProfileSection from '@/components/shared/ProfileSection';
import SecondaryPaymentPageSection from '@/components/shared/SecondaryPaymentPageSection';
import { LoanFormStepContent } from '@/components/staff/modules';
import ClosedLoansTab from '@/components/admin/modules/ClosedLoansTab';
import DirectMessaging from '@/components/messaging/DirectMessaging';
import { useRealtime } from '@/hooks/useRealtime';
import { useLoansStore } from '@/stores/loansStore';

interface Loan {
  id: string; applicationNo: string; status: string; requestedAmount: number; loanType: string;
  createdAt: string; riskScore: number; fraudFlag: boolean; purpose: string;
  customer: { id: string; name: string; email: string; phone: string; };
  sessionForm?: any; loanForm?: any; company?: any;
  requestedTenure?: number; requestedInterestRate?: number;
  currentHandlerId?: string;
  title?: string; firstName?: string; lastName?: string; fatherName?: string;
  panNumber?: string; aadhaarNumber?: string; dateOfBirth?: string;
  employmentType?: string; employerName?: string; monthlyIncome?: number;
  bankAccountNumber?: string; bankIfsc?: string; bankName?: string;
  address?: string; city?: string; state?: string; pincode?: string;
}

// Helper function to check if loan type is Gold Loan
const isGoldLoan = (loanType: string): boolean => {
  const upperType = loanType?.toUpperCase() || '';
  return upperType === 'GOLD' || upperType.includes('GOLD');
};

// Helper function to check if loan type is Vehicle Loan
const isVehicleLoan = (loanType: string): boolean => {
  const upperType = loanType?.toUpperCase() || '';
  return upperType === 'VEHICLE' || upperType.includes('VEHICLE');
};

const getStepsForLoanType = (loanType: string) => {
  const baseSteps = [
    { id: 1, title: 'Personal Info', icon: User, description: 'Basic personal details' },
    { id: 2, title: 'Contact', icon: MapPin, description: 'Address & contact info' },
    { id: 3, title: 'KYC', icon: FileSearch, description: 'Identity documents' },
    { id: 4, title: 'Employment', icon: Briefcase, description: 'Work & income details' },
    { id: 5, title: 'Bank', icon: Banknote, description: 'Bank account details' },
    { id: 6, title: 'Guarantor', icon: Users, description: 'Guarantor details' },
    { id: 7, title: 'Documents', icon: Upload, description: 'Upload documents' },
    { id: 8, title: 'Signature', icon: ClipboardList, description: 'Applicant signature' },
  ];
  
  // Add Collateral Details step for GOLD and VEHICLE loans
  const isGold = isGoldLoan(loanType);
  const isVehicle = isVehicleLoan(loanType);
  
  if (isGold || isVehicle) {
    baseSteps.push({ id: 9, title: 'Collateral Details', icon: isGold ? Sparkles : Car, description: `${isGold ? 'Gold' : 'Vehicle'} item details` });
  }
  
  // Review is always the last step
  baseSteps.push({ id: baseSteps.length + 1, title: 'Review', icon: ClipboardList, description: 'Final review & submit' });
  
  return baseSteps;
};

interface FormErrors {
  [key: string]: string;
}


// ── Staff Analytics Section ───────────────────────────────────────────────
function StaffAnalyticsSection({ loans, userId, userName }: { loans: any[]; userId: string; userName: string }) {
  const now = new Date();
  const getMonthRange = (monthsAgo: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0, 23, 59, 59);
    return { start: d, end };
  };

  const countInRange = (start: Date, end: Date) =>
    loans.filter(l => { const d = new Date(l.createdAt); return d >= start && d <= end; }).length;

  const thisMonth = getMonthRange(0);
  const lastMonth = getMonthRange(1);
  const twoMonthsAgo = getMonthRange(2);

  const thisMonthCount = countInRange(thisMonth.start, thisMonth.end);
  const lastMonthCount = countInRange(lastMonth.start, lastMonth.end);
  const twoMonthsAgoCount = countInRange(twoMonthsAgo.start, twoMonthsAgo.end);
  const totalForms = loans.filter(l => l.status !== 'AGENT_APPROVED_STAGE1').length;
  const pendingCount = loans.filter(l => l.status === 'AGENT_APPROVED_STAGE1').length;
  const completedCount = loans.filter(l => l.status === 'LOAN_FORM_COMPLETED').length;
  const successRate = loans.length > 0 ? Math.round((completedCount / loans.length) * 100) : 0;

  const monthName = (monthsAgo: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const maxCount = Math.max(thisMonthCount, lastMonthCount, twoMonthsAgoCount, 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-orange-600" />
          My Performance Analytics
        </h2>
        <p className="text-gray-500 mt-1">Forms processed and loan verification statistics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Forms', value: loans.length, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed', value: completedCount, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Pending', value: pendingCount, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Success Rate', value: `${successRate}%`, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Bar Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5 text-orange-600" />
            Monthly Form Activity
          </CardTitle>
          <CardDescription>Number of loan forms you processed each month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: monthName(0), count: thisMonthCount, color: 'bg-orange-500', badge: 'This Month' },
              { label: monthName(1), count: lastMonthCount, color: 'bg-blue-500', badge: 'Last Month' },
              { label: monthName(2), count: twoMonthsAgoCount, color: 'bg-gray-400', badge: '2 Months Ago' },
            ].map((month) => (
              <div key={month.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">{month.label}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">{month.badge}</span>
                  </div>
                  <span className="font-bold text-gray-900">{month.count} forms</span>
                </div>
                <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(month.count / maxCount) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full ${month.color} rounded-lg flex items-center pl-3`}
                  >
                    {month.count > 0 && <span className="text-xs text-white font-medium">{month.count}</span>}
                  </motion.div>
                </div>
              </div>
            ))}
          </div>

          {/* Growth indicator */}
          {lastMonthCount > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2">
                <TrendingUp className={`h-4 w-4 ${thisMonthCount >= lastMonthCount ? 'text-green-600' : 'text-red-500'}`} />
                <span className="text-sm text-gray-600">
                  {thisMonthCount >= lastMonthCount
                    ? `📈 ${thisMonthCount - lastMonthCount} more forms than last month`
                    : `📉 ${lastMonthCount - thisMonthCount} fewer forms than last month`}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Loan Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(
              loans.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {} as Record<string, number>)
            ).map(([status, count]) => (
              <div key={status} className="p-3 bg-gray-50 rounded-xl text-center">
                <p className="text-xl font-bold text-gray-900">{count as number}</p>
                <p className="text-xs text-gray-500 mt-1">{status.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showLoanFormDialog, setShowLoanFormDialog] = useState(false);
  const [showLoanDetailsDialog, setShowLoanDetailsDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Loan Detail Panel state
  const [showLoanDetailPanel, setShowLoanDetailPanel] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  
  // Loan form state
  const [loanForm, setLoanForm] = useState({
    title: '', firstName: '', lastName: '', middleName: '', fatherName: '', motherName: '',
    dateOfBirth: '', gender: '', maritalStatus: '', nationality: 'Indian',
    panNumber: '', aadhaarNumber: '', panVerified: false, aadhaarVerified: false,
    address: '', city: '', state: '', pincode: '', phone: '',
    employmentType: '', employerName: '', employerAddress: '', designation: '',
    yearsInEmployment: '', totalWorkExperience: '', monthlyIncome: '', annualIncome: '',
    // Employment-specific fields
    businessName: '', businessType: '', yearsInBusiness: '', annualTurnover: '', businessAddress: '',
    companyName: '', companyType: '', yearsInOperation: '', annualRevenue: '', numberOfEmployees: '',
    professionType: '', practiceName: '', yearsOfPractice: '', professionalRegNo: '',
    previousEmployer: '', retirementDate: '', pensionAmount: '',
    spouseName: '', spouseOccupation: '', spouseIncome: '', familyIncome: '',
    institutionName: '', courseProgram: '', expectedCompletion: '', guardianName: '', guardianIncome: '',
    sourceOfFunds: '', monthlySupportAmount: '', supportProviderName: '',
    officePhone: '', officeEmail: '',
    bankAccountNumber: '', bankIfsc: '', bankName: '', accountType: '', bankVerified: false,
    verificationRemarks: '', riskScore: 0, fraudFlag: false, visitDate: '', visitRemarks: '',
    // Reference fields
    ref1Name: '', ref1Phone: '', ref1Relation: '', ref1Address: '',
    ref2Name: '', ref2Phone: '', ref2Relation: '', ref2Address: '',
    creditScore: 0,
    // Signature
    applicantSignature: '',
    // GPS
    gpsLatitude: '', gpsLongitude: '', gpsAddress: '', gpsAccuracy: '', gpsCapturedAt: '',
  });

  // Document upload state
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { url: string; name: string; uploading: boolean }>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  
  // Gold Loan Details state
  const [goldLoanData, setGoldLoanData] = useState<Partial<{
    grossWeight: number;
    netWeight: number;
    goldRate: number;
    valuationAmount: number;
    loanAmount: number;
    ownerName: string;
    goldItemPhoto: string;
    karat: number;
    numberOfItems: number;
    itemDescription: string;
    verificationDate: string;
    verifiedBy: string;
    remarks: string;
  }>>({});
  
  // Vehicle Loan Details state
  const [vehicleLoanData, setVehicleLoanData] = useState<Partial<{
    vehicleType: string;
    vehicleNumber: string;
    manufacturer: string;
    model: string;
    yearOfManufacture: number;
    valuationAmount: number;
    loanAmount: number;
    ownerName: string;
    rcBookPhoto: string;
    vehiclePhoto: string;
    chassisNumber: string;
    engineNumber: string;
    fuelType: string;
    color: string;
    verificationDate: string;
    verifiedBy: string;
    remarks: string;
  }>>({});
  
  // Current steps based on loan type
  const [currentSteps, setCurrentSteps] = useState(getStepsForLoanType('PERSONAL'));

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
      fetchAllData(true);
    }
  });

  useEffect(() => {
    fetchAllData();
  }, [user]);

  // Optimized parallel fetch with caching
  const fetchAllData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;
    
    const loansStore = useLoansStore.getState();
    
    // Check cache first
    if (!forceRefresh && !loansStore.needsRefresh() && loansStore.loans.length > 0) {
      const staffLoans = loansStore.loans.filter(l => l.currentHandlerId === user.id);
      setLoans(staffLoans as Loan[]);
      if (!loansStore.activeNeedsRefresh() && loansStore.activeLoans.length > 0) {
        setActiveLoans(loansStore.activeLoans as Loan[]);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // PARALLEL FETCH
      const [loansRes, allActiveRes] = await Promise.all([
        fetch(`/api/loan/list?role=STAFF&staffId=${user.id}`),
        fetch('/api/loan/all-active')
      ]);

      // Process responses
      const [loansData, allActiveData] = await Promise.all([
        loansRes.json(),
        allActiveRes.json()
      ]);

      const loansList = loansData.loans || [];
      const activeLoansList = allActiveData.loans || [];
      
      // Update stores
      loansStore.setLoans(loansList);
      loansStore.setActiveLoans(activeLoansList);
      
      setLoans(loansList);
      setActiveLoans(activeLoansList);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to fetch loan applications', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchLoans = async () => {
    fetchAllData();
  };

  const fetchActiveLoans = async () => {
    const store = useLoansStore.getState();
    if (!store.activeNeedsRefresh() && store.activeLoans.length > 0) {
      setActiveLoans(store.activeLoans as Loan[]);
      return;
    }
    try {
      const response = await fetch('/api/loan/all-active');
      const data = await response.json();
      store.setActiveLoans(data.loans || []);
      setActiveLoans(data.loans || []);
    } catch (error) {
      console.error('Error fetching active loans:', error);
    }
  };

  const openLoanFormDialog = (loan: Loan) => {
    setSelectedLoan(loan);
    setFormErrors({});
    setSubmitError(null);
    // Pre-fill form with existing data
    setLoanForm({
      title: loan.title || '',
      firstName: loan.firstName || loan.customer?.name?.split(' ')[0] || '',
      lastName: loan.lastName || loan.customer?.name?.split(' ').slice(1).join(' ') || '',
      middleName: '',
      fatherName: loan.fatherName || '',
      motherName: '',
      dateOfBirth: loan.dateOfBirth ? new Date(loan.dateOfBirth).toISOString().split('T')[0] : '',
      gender: '',
      maritalStatus: '',
      nationality: 'Indian',
      panNumber: loan.panNumber || '',
      aadhaarNumber: loan.aadhaarNumber || '',
      panVerified: false,
      aadhaarVerified: false,
      address: loan.address || '',
      city: loan.city || '',
      state: loan.state || '',
      pincode: loan.pincode || '',
      phone: loan.customer?.phone || '',
      employmentType: loan.employmentType || '',
      employerName: loan.employerName || '',
      employerAddress: '',
      designation: '',
      yearsInEmployment: '',
      totalWorkExperience: '',
      monthlyIncome: loan.monthlyIncome?.toString() || '',
      annualIncome: '',
      // Employment-specific fields
      businessName: '', businessType: '', yearsInBusiness: '', annualTurnover: '', businessAddress: '',
      companyName: '', companyType: '', yearsInOperation: '', annualRevenue: '', numberOfEmployees: '',
      professionType: '', practiceName: '', yearsOfPractice: '', professionalRegNo: '',
      previousEmployer: '', retirementDate: '', pensionAmount: '',
      spouseName: '', spouseOccupation: '', spouseIncome: '', familyIncome: '',
      institutionName: '', courseProgram: '', expectedCompletion: '', guardianName: '', guardianIncome: '',
      sourceOfFunds: '', monthlySupportAmount: '', supportProviderName: '',
      officePhone: '', officeEmail: '',
      bankAccountNumber: loan.bankAccountNumber || '',
      bankIfsc: loan.bankIfsc || '',
      bankName: loan.bankName || '',
      accountType: '',
      bankVerified: false,
      verificationRemarks: '',
      riskScore: 0,
      fraudFlag: false,
      visitDate: '',
      visitRemarks: '',
      ref1Name: '', ref1Phone: '', ref1Relation: '', ref1Address: '',
      ref2Name: '', ref2Phone: '', ref2Relation: '', ref2Address: '',
      creditScore: 0,
      applicantSignature: '',
      // GPS - reset on each new loan
      gpsLatitude: '', gpsLongitude: '', gpsAddress: '', gpsAccuracy: '', gpsCapturedAt: '',
    });
    setUploadedDocs({});
    setCurrentStep(1);
    // Set steps based on loan type
    setCurrentSteps(getStepsForLoanType(loan.loanType));
    // Reset gold/vehicle loan data
    setGoldLoanData({});
    setVehicleLoanData({});
    setShowLoanFormDialog(true);
  };

  const validateCurrentStep = (): boolean => {
    const errors: FormErrors = {};
    
    switch (currentStep) {
      case 1:
        if (!loanForm.firstName.trim()) errors.firstName = 'First name is required';
        if (!loanForm.lastName.trim()) errors.lastName = 'Last name is required';
        break;
      case 2:
        if (!loanForm.address.trim()) errors.address = 'Address is required';
        if (!loanForm.city.trim()) errors.city = 'City is required';
        if (!loanForm.state.trim()) errors.state = 'State is required';
        if (!loanForm.pincode.trim()) errors.pincode = 'Pincode is required';
        else if (!/^\d{6}$/.test(loanForm.pincode)) errors.pincode = 'Invalid pincode (6 digits required)';
        break;
      case 3:
        if (!loanForm.panNumber.trim()) errors.panNumber = 'PAN number is required';
        else if (!validatePAN(loanForm.panNumber)) errors.panNumber = 'Invalid PAN format (e.g., ABCDE1234F)';
        if (!loanForm.aadhaarNumber.trim()) errors.aadhaarNumber = 'Aadhaar number is required';
        else if (!validateAadhaar(loanForm.aadhaarNumber)) errors.aadhaarNumber = 'Invalid Aadhaar (12 digits required)';
        break;
      case 4:
        if (!loanForm.employmentType) errors.employmentType = 'Employment type is required';
        // Dynamic validation based on employment type
        if (loanForm.employmentType === 'Salaried') {
          if (!loanForm.employerName.trim()) errors.employerName = 'Employer name is required';
          if (!loanForm.monthlyIncome.trim()) errors.monthlyIncome = 'Monthly income is required';
        } else if (loanForm.employmentType === 'Self-Employed') {
          if (!loanForm.businessName.trim()) errors.businessName = 'Business name is required';
          if (!loanForm.annualTurnover.trim()) errors.annualTurnover = 'Annual turnover is required';
        } else if (loanForm.employmentType === 'Business') {
          if (!loanForm.companyName.trim()) errors.companyName = 'Company name is required';
          if (!loanForm.annualRevenue.trim()) errors.annualRevenue = 'Annual revenue is required';
        } else if (loanForm.employmentType === 'Professional') {
          if (!loanForm.professionType.trim()) errors.professionType = 'Profession type is required';
          if (!loanForm.monthlyIncome.trim()) errors.monthlyIncome = 'Monthly income is required';
        } else if (loanForm.employmentType === 'Housewife') {
          if (!loanForm.spouseName.trim()) errors.spouseName = 'Spouse name is required';
          if (!loanForm.familyIncome.trim()) errors.familyIncome = 'Family income is required';
        } else if (loanForm.employmentType === 'Student') {
          if (!loanForm.institutionName.trim()) errors.institutionName = 'Institution name is required';
          if (!loanForm.guardianName.trim()) errors.guardianName = 'Guardian name is required';
        } else if (loanForm.employmentType === 'Retired') {
          if (!loanForm.previousEmployer.trim()) errors.previousEmployer = 'Previous employer is required';
          if (!loanForm.pensionAmount.trim()) errors.pensionAmount = 'Pension amount is required';
        } else if (loanForm.employmentType === 'Unemployed') {
          if (!loanForm.sourceOfFunds.trim()) errors.sourceOfFunds = 'Source of funds is required';
        }
        if (loanForm.monthlyIncome && parseFloat(loanForm.monthlyIncome) <= 0) errors.monthlyIncome = 'Income must be greater than 0';
        break;
      case 5:
        if (!loanForm.bankAccountNumber.trim()) errors.bankAccountNumber = 'Account number is required';
        if (!loanForm.bankIfsc.trim()) errors.bankIfsc = 'IFSC code is required';
        else if (!validateIFSC(loanForm.bankIfsc)) errors.bankIfsc = 'Invalid IFSC format (e.g., SBIN0001234)';
        if (!loanForm.bankName.trim()) errors.bankName = 'Bank name is required';
        break;
      case 6:
        // Guardians are optional but if provided, need phone validation
        if (loanForm.ref1Phone && !validatePhone(loanForm.ref1Phone)) {
          errors.ref1Phone = 'Invalid phone number';
        }
        if (loanForm.ref2Phone && !validatePhone(loanForm.ref2Phone)) {
          errors.ref2Phone = 'Invalid phone number';
        }
        break;
      case 7:
        // Documents - no validation for now
        break;
      case 8:
        // Signature - optional for now
        break;
      case 9:
        // Collateral Details - validate for GOLD/VEHICLE loans
        if (isGoldLoan(selectedLoan?.loanType || '')) {
          if (!goldLoanData.netWeight) errors.netWeight = 'Net weight is required';
          if (!goldLoanData.goldRate) errors.goldRate = 'Gold rate is required';
          if (!goldLoanData.loanAmount) errors.loanAmount = 'Loan amount is required';
          if (!goldLoanData.ownerName) errors.ownerName = 'Owner name is required';
        } else if (isVehicleLoan(selectedLoan?.loanType || '')) {
          if (!vehicleLoanData.vehicleType) errors.vehicleType = 'Vehicle type is required';
          if (!vehicleLoanData.vehicleNumber) errors.vehicleNumber = 'Vehicle number is required';
          if (!vehicleLoanData.valuationAmount) errors.valuationAmount = 'Valuation amount is required';
          if (!vehicleLoanData.loanAmount) errors.loanAmount = 'Loan amount is required';
        }
        break;
      case 10:
        // Final review - no additional validation
        break;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      if (currentStep < currentSteps.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setFormErrors({});
    }
  };

  const handleCompleteForm = async () => {
    if (!selectedLoan) return;
    
    if (!validateCurrentStep()) return;
    
    setSaving(true);
    setSubmitError(null);
    
    try {
      // Map uploadedDocs keys → DB field names
      const DOC_KEY_MAP: Record<string, string> = {
        pan_card:       'panCardDoc',
        aadhaar_front:  'aadhaarFrontDoc',
        aadhaar_back:   'aadhaarBackDoc',
        income_proof:   'incomeProofDoc',
        address_proof:  'addressProofDoc',
        photo:          'photoDoc',
        election_card:  'electionCardDoc',
        house_photo:    'housePhotoDoc',
        guarantor_photo:'photoDoc',   // fallback to photoDoc
        passbook_photo: 'passbookDoc',
        bank_statement: 'bankStatementDoc',
        salary_slip:    'salarySlipDoc',
        other:          'otherDocs',
      };
      const docFields: Record<string, string> = {};
      for (const [key, docObj] of Object.entries(uploadedDocs)) {
        const dbField = DOC_KEY_MAP[key];
        if (dbField && docObj.url) docFields[dbField] = docObj.url;
      }

      const response = await fetch('/api/loan/apply', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: selectedLoan.id,
          ...loanForm,
          ...docFields,           // ← document URLs mapped to proper DB field names
          status: 'LOAN_FORM_COMPLETED',
          userId: user?.id,
          // Include gold/vehicle loan details based on loan type
          ...(isGoldLoan(selectedLoan.loanType) && { goldLoanDetails: goldLoanData }),
          ...(isVehicleLoan(selectedLoan.loanType) && { vehicleLoanDetails: vehicleLoanData }),
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit form');
      }
      
      toast({ 
        title: '✅ Long Form Completed Successfully!', 
        description: `Loan form for ${selectedLoan.applicationNo} has been completed and submitted. It has been sent to the agent for sanction creation.`, 
        duration: 5000
      });
      setShowLoanFormDialog(false);
      fetchLoans();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit loan form';
      setSubmitError(message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedLoan) return;
    if (!loanForm.verificationRemarks.trim()) {
      setFormErrors({ verificationRemarks: 'Please provide a reason for rejection' });
      return;
    }
    
    setSaving(true);
    setSubmitError(null);
    
    try {
      const response = await fetch('/api/workflow/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: selectedLoan.id,
          action: 'reject',
          role: 'STAFF',
          userId: user?.id,
          remarks: loanForm.verificationRemarks
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject loan');
      }
      
      toast({ title: 'Loan Rejected', description: 'The loan application has been rejected.', variant: 'destructive' });
      setShowLoanFormDialog(false);
      fetchLoans();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject loan';
      setSubmitError(message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      AGENT_APPROVED_STAGE1: { className: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Pending Form' },
      LOAN_FORM_COMPLETED: { className: 'bg-violet-100 text-violet-700 border-violet-200', label: 'Form Completed' },
      SESSION_CREATED: { className: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Sanction Created' },
      REJECTED_FINAL: { className: 'bg-red-100 text-red-700 border-red-200', label: 'Rejected' },
    };
    const c = config[status] || { className: 'bg-gray-100 text-gray-700 border-gray-200', label: status };
    return <Badge className={c.className} variant="outline">{c.label}</Badge>;
  };

  const pendingLoans = loans.filter(l => l.status === 'AGENT_APPROVED_STAGE1');
  const completedLoans = loans.filter(l => l.status === 'LOAN_FORM_COMPLETED');
  const inProgressLoans = loans.filter(l => ['SESSION_CREATED', 'CUSTOMER_SESSION_APPROVED', 'FINAL_APPROVED', 'ACTIVE'].includes(l.status));

  const stats = [
    { label: 'Pending Forms', value: pendingLoans.length, icon: FileEdit, color: 'text-orange-600', bg: 'bg-orange-50', onClick: () => setActiveTab('pending') },
    { label: 'Completed', value: completedLoans.length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', onClick: () => setActiveTab('completed') },
    { label: 'In Progress', value: inProgressLoans.length, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', onClick: () => setActiveTab('activeLoans') },
    { label: 'Active Loans', value: activeLoans.length, icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50', onClick: () => setActiveTab('activeLoans') }
  ];

  const menuItems = ROLE_MENU_ITEMS.STAFF.map(item => ({
    ...item,
    count: item.id === 'pending' ? pendingLoans.length : 
           item.id === 'completed' ? completedLoans.length :
           item.id === 'activeLoans' ? activeLoans.length : undefined
  }));

  const renderContent = () => {
    switch (activeTab) {
      case 'pending':
        return <PendingTab pendingLoans={pendingLoans} openLoanFormDialog={openLoanFormDialog} />;
      case 'completed':
        return <CompletedTab completedLoans={completedLoans} getStatusBadge={getStatusBadge} />;
      case 'activeLoans':
        return <ActiveLoansTab activeLoans={activeLoans} setSelectedLoanId={setSelectedLoanId} setShowLoanDetailPanel={setShowLoanDetailPanel} />;
      case 'field':
        // Field visits removed — redirect to dashboard
        return <DashboardTab loans={loans} pendingLoans={pendingLoans} setActiveTab={setActiveTab} />;
      case 'messages':
        return (
          <DirectMessaging
            userId={user?.id || ''}
            userRole={user?.role || 'STAFF'}
            userName={user?.name || 'Staff'}
          />
        );
      case 'analytics':
        return <StaffAnalyticsSection loans={loans} userId={user?.id || ''} userName={user?.name || ''} />;
      case 'myCredit':
        return <MyCreditPassbook />;
      case 'secondary-payment-pages':
        return (
          <SecondaryPaymentPageSection
            userId={user?.id || 'system'}
          />
        );
      case 'profile':
        return <ProfileSection />;
      case 'closedLoans':
        return (
          <ClosedLoansTab
            setSelectedLoanId={setSelectedLoanId}
            setShowLoanDetailPanel={setShowLoanDetailPanel}
            createdById={user?.id}
          />
        );
      case 'dashboard':
      default:
        return <DashboardTab loans={loans} pendingLoans={pendingLoans} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <DashboardLayout
      title="Staff Dashboard"
      subtitle="Complete loan application forms"
      menuItems={menuItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      stats={stats}
      gradient="bg-gradient-to-br from-orange-500 to-red-600"
      logoIcon={User}
    >
      {renderContent()}

      {/* Loan Form Wizard Dialog */}
      <Dialog open={showLoanFormDialog} onOpenChange={setShowLoanFormDialog}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[95vh] p-0 gap-0">
          {/* Header */}
          <DialogHeader className="p-4 sm:p-6 border-b bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl text-white">Loan Application Form</DialogTitle>
                <DialogDescription className="text-emerald-100">
                  {selectedLoan?.applicationNo} • {selectedLoan?.customer?.name} • {selectedLoan ? formatCurrency(selectedLoan.requestedAmount) : ''}
                </DialogDescription>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-emerald-100">Step {currentStep} of {currentSteps.length}</p>
                <p className="text-sm font-medium">{currentSteps[currentStep - 1]?.title}</p>
              </div>
            </div>
          </DialogHeader>

          {/* Step Indicators */}
          <div className="px-4 sm:px-6 py-3 border-b bg-gray-50 overflow-x-auto">
            <div className="flex items-center justify-between min-w-max gap-1">
              {currentSteps.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <div key={step.id} className="flex items-center">
                    <button
                      onClick={() => currentStep > step.id && setCurrentStep(step.id)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                        currentStep === step.id 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : currentStep > step.id 
                            ? 'text-emerald-600 cursor-pointer hover:bg-emerald-50' 
                            : 'text-gray-400'
                      }`}
                      disabled={currentStep <= step.id}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        currentStep === step.id 
                          ? 'bg-emerald-500 text-white' 
                          : currentStep > step.id 
                            ? 'bg-emerald-200 text-emerald-700' 
                            : 'bg-gray-200 text-gray-500'
                      }`}>
                        {currentStep > step.id ? <CheckCircle className="h-4 w-4" /> : step.id}
                      </div>
                      <span className="text-xs sm:text-sm font-medium hidden md:inline">{step.title}</span>
                    </button>
                    {index < currentSteps.length - 1 && (
                      <div className={`w-4 sm:w-8 h-0.5 mx-1 ${currentStep > step.id ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Content */}
          <ScrollArea className="flex-1 max-h-[50vh] sm:max-h-[55vh]">
            <div className="p-4 sm:p-6">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={currentStep} 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <LoanFormStepContent
                    currentStep={currentStep}
                    loanForm={loanForm}
                    setLoanForm={setLoanForm}
                    formErrors={formErrors}
                    selectedLoan={selectedLoan}
                    goldLoanData={goldLoanData}
                    setGoldLoanData={setGoldLoanData}
                    vehicleLoanData={vehicleLoanData}
                    setVehicleLoanData={setVehicleLoanData}
                    uploadedDocs={uploadedDocs}
                    setUploadedDocs={setUploadedDocs}
                    uploadingDoc={uploadingDoc}
                    setUploadingDoc={setUploadingDoc}
                    submitError={submitError}
                    userId={user?.id}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </ScrollArea>

          {/* Footer */}
          <DialogFooter className="p-4 sm:p-6 border-t bg-gray-50 rounded-b-lg">
            <div className="flex items-center justify-between w-full gap-2">
              <div>
                {currentStep > 1 && (
                  <Button variant="outline" onClick={handlePrevStep}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Previous
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowLoanFormDialog(false)}>Cancel</Button>
                {currentStep < currentSteps.length ? (
                  <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleNextStep}>
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={handleReject} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Reject
                    </Button>
                    <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleCompleteForm} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Submit Form
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loan Details Dialog */}
      <Dialog open={showLoanDetailsDialog} onOpenChange={setShowLoanDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loan Details</DialogTitle>
            <DialogDescription>{selectedLoan?.applicationNo}</DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-semibold">{selectedLoan.customer?.name}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-semibold">{formatCurrency(selectedLoan.requestedAmount)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Loan Detail Panel */}
      <LoanDetailPanel
        loanId={selectedLoanId}
        open={showLoanDetailPanel}
        onClose={() => { setShowLoanDetailPanel(false); setSelectedLoanId(null); }}
        userRole={user?.role || 'STAFF'}
        userId={user?.id || ''}
        onPaymentSuccess={() => { fetchLoans(); fetchActiveLoans(); }}
      />
    </DashboardLayout>
  );
}
