'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  User, Phone, IndianRupee, Percent, Calendar,
  FileText, Plus, Save, X, ChevronDown, ChevronUp, Building2,
  Upload, CheckCircle, Info, AlertCircle, Loader2, Sparkles, Car,
  RefreshCw, Calculator, TrendingUp, Wallet
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import GoldLoanReceipt from '@/components/loan/GoldLoanReceipt';
import VehicleLoanReceipt from '@/components/loan/VehicleLoanReceipt';

interface Company {
  id: string;
  name: string;
  code: string;
  createdAt?: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  currentBalance: number;
  isDefault: boolean;
  companyId?: string;
}

interface LoanProduct {
  id: string;
  title: string;
  description: string;
  icon: string;
  code: string;
  loanType: string;
  isInterestOnly?: boolean;  // Is this an Interest Only loan product?
  minInterestRate: number;
  maxInterestRate: number;
  defaultInterestRate: number;
  minTenure: number;
  maxTenure: number;
  defaultTenure: number;
  minAmount: number;
  maxAmount: number;
  processingFeePercent: number;
  isActive: boolean;
 }

interface UploadedDoc {
  url: string;
  name: string;
  uploading: boolean;
}

interface OfflineLoanFormProps {
  createdById: string;
  createdByRole: string;
  companyId?: string;
  onLoanCreated?: () => void;
}

// Document types for upload
const DOCUMENT_TYPES = [
  { id: 'pan_card', name: 'PAN Card', desc: 'Front side', required: true },
  { id: 'aadhaar_front', name: 'Aadhaar Front', desc: 'Front side', required: true },
  { id: 'aadhaar_back', name: 'Aadhaar Back', desc: 'Back side', required: true },
  { id: 'income_proof', name: 'Income Proof', desc: 'Salary slip/ITR', required: false },
  { id: 'address_proof', name: 'Address Proof', desc: 'Utility bill', required: false },
  { id: 'photo', name: 'Photo', desc: 'Passport size', required: false },
  { id: 'election_card', name: 'Election Card', desc: 'Voter ID', required: false },
  { id: 'house_photo', name: 'House Photo', desc: 'Residence photo', required: false },
];

export default function OfflineLoanForm({ createdById, createdByRole, onLoanCreated }: OfflineLoanFormProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loanProducts, setLoanProducts] = useState<LoanProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, UploadedDoc>>({});
  
  // Interest Only and Mirror Loan states
  const [isInterestOnly, setIsInterestOnly] = useState(false);
  const [isMirrorLoan, setIsMirrorLoan] = useState(false);
  const [mirrorCompanyId, setMirrorCompanyId] = useState('');
  const [mirrorInterestType] = useState('REDUCING'); // Always REDUCING for mirror loans
  const [showMirrorDialog, setShowMirrorDialog] = useState(false);
  
  // Cashbook balance for Company 3
  const [cashbookBalance, setCashbookBalance] = useState<number | null>(null);
  const [loadingCashbook, setLoadingCashbook] = useState(false);
  
  // Secondary Payment Page for Extra EMIs (Mirror Loan)
  const [paymentPages, setPaymentPages] = useState<Array<{ id: string; name: string }>>([]);
  const [extraEmiPaymentPageId, setExtraEmiPaymentPageId] = useState('');

  // Form data - declared before useMemo hooks that depend on it
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAadhaar: '',
    customerPan: '',
    customerAddress: '',
    customerCity: '',
    customerState: '',
    customerPincode: '',
    customerDOB: '',
    customerOccupation: '',
    customerMonthlyIncome: '',
    reference1Name: '',
    reference1Phone: '',
    reference1Relation: '',
    reference2Name: '',
    reference2Phone: '',
    reference2Relation: '',
    loanType: 'PERSONAL',
    productId: '',
    loanAmount: '',
    interestRate: '12',
    interestType: 'FLAT', // FLAT or REDUCING - default FLAT
    tenure: '12',
    emiAmount: '',
    processingFee: '0',
    disbursementDate: new Date().toISOString().slice(0, 10),
    disbursementMode: 'CASH',
    disbursementRef: '',
    startDate: new Date().toISOString().slice(0, 10),
    notes: '',
    internalNotes: '',
    // Company selection - REQUIRED for all roles
    companyId: '',
    // Bank account for disbursement
    bankAccountId: '',
    // Interest Only loan
    isInterestOnly: false
  });

  // Get mirror interest rate based on company (Company 1: 15%, Company 2: 24%)
  const getMirrorInterestRate = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (!company) return 0;
    // Company 1 (C1) = 15% reducing
    if (company.code === 'C1' || company.id.includes('1')) return 15;
    // Company 2 (C2) = 24% reducing
    if (company.code === 'C2' || company.id.includes('2')) return 24;
    // Default based on order
    const sortedCompanies = [...companies].sort((a, b) => 
      new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
    const companyIndex = sortedCompanies.findIndex(c => c.id === companyId);
    if (companyIndex === 0) return 15; // First company = 15%
    if (companyIndex === 1) return 24; // Second company = 24%
    return 15; // Default
  };

  // Calculate EMI schedule for original loan
  const originalEmiSchedule = useMemo(() => {
    const P = parseFloat(formData.loanAmount) || 0;
    const rate = parseFloat(formData.interestRate) || 0;
    const months = parseInt(formData.tenure) || 0;
    const type = formData.interestType || 'FLAT';
    
    if (P <= 0 || rate <= 0 || months <= 0) return [];
    
    const schedule: Array<{
      installmentNumber: number;
      principal: number;
      interest: number;
      emi: number;
      outstandingPrincipal: number;
    }> = [];
    
    if (type === 'FLAT') {
      const totalInterest = (P * rate * months) / 1200;
      const totalAmount = P + totalInterest;
      const emi = totalAmount / months;
      const principalPerMonth = P / months;
      const interestPerMonth = totalInterest / months;
      
      for (let i = 1; i <= months; i++) {
        schedule.push({
          installmentNumber: i,
          principal: principalPerMonth,
          interest: interestPerMonth,
          emi,
          outstandingPrincipal: Math.max(0, P - (principalPerMonth * i))
        });
      }
    } else {
      // Reducing balance
      const monthlyRate = rate / 100 / 12;
      const emi = monthlyRate === 0 ? P / months : (P * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
      let outstanding = P;
      
      for (let i = 1; i <= months; i++) {
        const interest = outstanding * monthlyRate;
        const principal = emi - interest;
        outstanding = Math.max(0, outstanding - principal);
        schedule.push({
          installmentNumber: i,
          principal,
          interest,
          emi,
          outstandingPrincipal: outstanding
        });
      }
    }
    
    return schedule;
  }, [formData.loanAmount, formData.interestRate, formData.tenure, formData.interestType]);

  // Calculate EMI schedule for mirror loan (always REDUCING)
  const mirrorEmiSchedule = useMemo(() => {
    if (!isMirrorLoan || !mirrorCompanyId) return [];
    
    const P = parseFloat(formData.loanAmount) || 0;
    const mirrorRate = getMirrorInterestRate(mirrorCompanyId);
    const originalEmi = originalEmiSchedule.length > 0 ? originalEmiSchedule[0].emi : 0;
    
    if (P <= 0 || mirrorRate <= 0 || originalEmi <= 0) return [];
    
    const schedule: Array<{
      installmentNumber: number;
      principal: number;
      interest: number;
      emi: number;
      outstandingPrincipal: number;
    }> = [];
    
    const monthlyRate = mirrorRate / 100 / 12;
    let outstanding = P;
    let installmentNumber = 1;
    
    // Use same EMI amount, calculate reducing schedule
    while (outstanding > 0.01 && installmentNumber <= 100) {
      const interest = outstanding * monthlyRate;
      let principal = originalEmi - interest;
      
      if (principal >= outstanding) {
        principal = outstanding;
        const lastEmi = principal + interest;
        schedule.push({
          installmentNumber,
          principal,
          interest,
          emi: lastEmi,
          outstandingPrincipal: 0
        });
        break;
      }
      
      outstanding = Math.max(0, outstanding - principal);
      schedule.push({
        installmentNumber,
        principal,
        interest,
        emi: originalEmi,
        outstandingPrincipal: outstanding
      });
      installmentNumber++;
    }
    
    return schedule;
  }, [isMirrorLoan, mirrorCompanyId, formData.loanAmount, originalEmiSchedule, companies]);

  // Calculate extra EMIs and mirror loan summary
  const mirrorLoanSummary = useMemo(() => {
    if (!isMirrorLoan || mirrorEmiSchedule.length === 0) return null;
    
    const originalTenure = originalEmiSchedule.length;
    const mirrorTenure = mirrorEmiSchedule.length;
    const extraEMICount = Math.max(0, originalTenure - mirrorTenure);
    
    const originalTotalInterest = originalEmiSchedule.reduce((sum, e) => sum + e.interest, 0);
    const mirrorTotalInterest = mirrorEmiSchedule.reduce((sum, e) => sum + e.interest, 0);
    const interestSaved = originalTotalInterest - mirrorTotalInterest;
    
    const mirrorRate = getMirrorInterestRate(mirrorCompanyId);
    
    return {
      originalTenure,
      mirrorTenure,
      extraEMICount,
      interestSaved,
      mirrorRate,
      mirrorTotalInterest
    };
  }, [isMirrorLoan, mirrorEmiSchedule, originalEmiSchedule, mirrorCompanyId]);
  
  // Helper to check if selected company is Company 3 (mirror loans only for Company 3)
  const isSelectedCompany3 = () => {
    if (!formData.companyId || companies.length < 3) return false;
    // Check by code C3
    const selectedCompany = companies.find(c => c.id === formData.companyId);
    if (selectedCompany?.code === 'C3') return true;
    // Check by position (3rd company by creation order)
    const sortedCompanies = [...companies].sort((a, b) => 
      new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
    if (sortedCompanies.length >= 3 && sortedCompanies[2].id === formData.companyId) return true;
    return false;
  };

  // Gold Loan Receipt State
  const [goldLoanData, setGoldLoanData] = useState({
    grossWeight: 0,
    netWeight: 0,
    goldRate: 0,
    valuationAmount: 0,
    loanAmount: 0,
    ownerName: '',
    goldItemPhoto: '',
    karat: 22,
    numberOfItems: 1,
    itemDescription: '',
    verificationDate: new Date().toISOString().slice(0, 10),
    verifiedBy: '',
    remarks: ''
  });

  // Vehicle Loan Receipt State
  const [vehicleLoanData, setVehicleLoanData] = useState({
    vehicleType: 'CAR',
    vehicleNumber: '',
    manufacturer: '',
    model: '',
    yearOfManufacture: new Date().getFullYear(),
    valuationAmount: 0,
    loanAmount: 0,
    ownerName: '',
    rcBookPhoto: '',
    vehiclePhoto: '',
    chassisNumber: '',
    engineNumber: '',
    fuelType: 'PETROL',
    color: '',
    verificationDate: new Date().toISOString().slice(0, 10),
    verifiedBy: '',
    remarks: ''
  });

  // Fetch companies and products on mount
  useEffect(() => {
    if (open) {
      fetchCompanies();
      fetchLoanProducts();
      fetchPaymentPages();
    }
  }, [open]);

  // Fetch bank accounts or cashbook when company is selected
  useEffect(() => {
    if (formData.companyId) {
      if (isSelectedCompany3()) {
        // Company 3 uses cashbook, not bank accounts
        fetchCashbookBalance(formData.companyId);
        setBankAccounts([]);
      } else {
        // Company 1 and 2 use bank accounts
        fetchBankAccounts(formData.companyId);
        setCashbookBalance(null);
      }
    } else {
      setBankAccounts([]);
      setCashbookBalance(null);
    }
  }, [formData.companyId, companies.length]);

  // Fetch cashbook balance for Company 3
  const fetchCashbookBalance = async (companyId: string) => {
    try {
      setLoadingCashbook(true);
      const res = await fetch(`/api/accountant/cashbook?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setCashbookBalance(data.currentBalance || 0);
      }
    } catch (error) {
      console.error('Failed to fetch cashbook:', error);
    } finally {
      setLoadingCashbook(false);
    }
  };

  // Update form when product is selected - Auto-apply Interest Only based on product
  useEffect(() => {
    if (formData.productId) {
      const product = loanProducts.find(p => p.id === formData.productId);
      if (product) {
        // Auto-apply Interest Only based on product
        const productIsInterestOnly = product.isInterestOnly || false;
        setIsInterestOnly(productIsInterestOnly);
        
        setFormData(prev => ({
          ...prev,
          loanType: product.loanType,
          interestRate: product.defaultInterestRate.toString(),
          tenure: productIsInterestOnly ? '0' : product.defaultTenure.toString(),
          processingFee: ((parseFloat(formData.loanAmount || '0') * product.processingFeePercent) / 100).toFixed(0),
          isInterestOnly: productIsInterestOnly
        }));
      }
    }
  }, [formData.productId, formData.loanAmount, loanProducts]);

  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const res = await fetch('/api/company?isActive=true');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
        // Auto-select first company if only one exists
        if (data.companies?.length === 1) {
          setFormData(prev => ({ ...prev, companyId: data.companies[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchLoanProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await fetch('/api/cms/product?isActive=true');
      if (res.ok) {
        const data = await res.json();
        setLoanProducts(data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch loan products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchBankAccounts = async (companyId: string) => {
    try {
      const res = await fetch(`/api/accounting/bank?action=list&companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Filter bank accounts by company
          const companyBanks = (data.data || []).filter((b: BankAccount) => 
            !b.companyId || b.companyId === companyId
          );
          setBankAccounts(companyBanks);
          // Auto-select default bank
          const defaultBank = companyBanks.find((b: BankAccount) => b.isDefault);
          if (defaultBank) {
            setFormData(prev => ({ ...prev, bankAccountId: defaultBank.id }));
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    }
  };

  // Fetch secondary payment pages for mirror loan extra EMIs
  const fetchPaymentPages = async () => {
    try {
      const response = await fetch('/api/emi-payment-settings?action=secondary-pages');
      const data = await response.json();
      if (data.success) {
        setPaymentPages(data.pages || []);
      }
    } catch (error) {
      console.error('Failed to fetch payment pages:', error);
    }
  };

  // Calculate EMI based on interest type
  const calculateEmi = () => {
    const P = parseFloat(formData.loanAmount) || 0;
    const annualRate = parseFloat(formData.interestRate) || 0;
    const n = parseInt(formData.tenure) || 1;
    const interestType = formData.interestType || 'FLAT';

    if (P > 0 && annualRate > 0 && n > 0) {
      if (interestType === 'FLAT') {
        // FLAT Interest: Total Interest = P * R * T / 100, EMI = (P + Total Interest) / n
        const totalInterest = (P * annualRate * n) / 1200;
        const totalAmount = P + totalInterest;
        return Math.round(totalAmount / n);
      } else {
        // REDUCING Balance: Standard EMI formula
        const r = annualRate / 100 / 12;
        const emi = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
        return Math.round(emi);
      }
    }
    return 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Reset mirror loan if company changes to non-Company 3
    if (field === 'companyId') {
      // Check if new company is Company 3
      const selectedCompany = companies.find(c => c.id === value);
      const sortedCompanies = [...companies].sort((a, b) => 
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );
      const isC3 = selectedCompany?.code === 'C3' || 
                   (sortedCompanies.length >= 3 && sortedCompanies[2].id === value);
      
      if (!isC3) {
        // Reset mirror loan state when not Company 3
        setIsMirrorLoan(false);
        setMirrorCompanyId('');
      }
    }
    
    if (['loanAmount', 'interestRate', 'tenure', 'interestType'].includes(field)) {
      setTimeout(() => {
        const emi = calculateEmi();
        setFormData(prev => ({ ...prev, emiAmount: emi.toString() }));
        
        // Update processing fee based on product
        if (formData.productId && field === 'loanAmount') {
          const product = loanProducts.find(p => p.id === formData.productId);
          if (product) {
            const fee = (parseFloat(value) * product.processingFeePercent) / 100;
            setFormData(prev => ({ ...prev, processingFee: fee.toFixed(0) }));
          }
        }
      }, 100);
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (documentType: string, file: File) => {
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({ 
        title: 'Invalid File Type', 
        description: 'Only images (PNG, JPG, WEBP) and PDF files are allowed.', 
        variant: 'destructive' 
      });
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ 
        title: 'File Too Large', 
        description: 'Maximum file size is 10MB.', 
        variant: 'destructive' 
      });
      return;
    }
    
    setUploadingDoc(documentType);
    setUploadedDocs(prev => ({
      ...prev,
      [documentType]: { url: '', name: file.name, uploading: true }
    }));
    
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('documentType', documentType);
      formDataUpload.append('uploadedBy', createdById);
      
      const response = await fetch('/api/upload/document', {
        method: 'POST',
        body: formDataUpload
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      
      setUploadedDocs(prev => ({
        ...prev,
        [documentType]: { url: data.url, name: file.name, uploading: false }
      }));
      
      toast({ 
        title: 'Upload Successful', 
        description: `${DOCUMENT_TYPES.find(d => d.id === documentType)?.name || documentType} uploaded successfully.` 
      });
    } catch (error) {
      setUploadedDocs(prev => {
        const newDocs = { ...prev };
        delete newDocs[documentType];
        return newDocs;
      });
      toast({ 
        title: 'Upload Failed', 
        description: error instanceof Error ? error.message : 'Failed to upload document.', 
        variant: 'destructive' 
      });
    } finally {
      setUploadingDoc(null);
    }
  };

  // Remove uploaded document
  const handleRemoveDocument = (documentType: string) => {
    setUploadedDocs(prev => {
      const newDocs = { ...prev };
      delete newDocs[documentType];
      return newDocs;
    });
    toast({ title: 'Document Removed', description: 'The document has been removed.' });
  };

  const handleSubmit = async () => {
    // Validate required fields including company
    // For Interest Only loans, tenure is not required
    const requiresTenure = !isInterestOnly && (!formData.tenure || parseInt(formData.tenure) <= 0);
    
    if (!formData.customerName || !formData.customerPhone || !formData.loanAmount || 
        !formData.interestRate || requiresTenure || !formData.disbursementDate || 
        !formData.startDate || !formData.companyId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields including Company',
        variant: 'destructive'
      });
      return;
    }

    // Validate Gold Loan Receipt Data
    if (formData.loanType === 'GOLD') {
      if (!goldLoanData.grossWeight || !goldLoanData.netWeight || !goldLoanData.goldRate ||
          !goldLoanData.valuationAmount || !goldLoanData.loanAmount || !goldLoanData.ownerName) {
        toast({
          title: 'Gold Loan Receipt Required',
          description: 'Please fill all required fields in the Gold Loan Receipt',
          variant: 'destructive'
        });
        return;
      }
    }

    // Validate Vehicle Loan Receipt Data
    if (formData.loanType === 'VEHICLE') {
      if (!vehicleLoanData.vehicleType || !vehicleLoanData.vehicleNumber || 
          !vehicleLoanData.manufacturer || !vehicleLoanData.valuationAmount ||
          !vehicleLoanData.loanAmount || !vehicleLoanData.ownerName ||
          !vehicleLoanData.rcBookPhoto || !vehicleLoanData.vehiclePhoto) {
        toast({
          title: 'Vehicle Loan Receipt Required',
          description: 'Please fill all required fields in the Vehicle Loan Receipt including photos',
          variant: 'destructive'
        });
        return;
      }
    }

    try {
      setSubmitting(true);
      
      const requestBody: Record<string, unknown> = {
        createdById,
        createdByRole,
        ...formData,
        loanAmount: parseFloat(formData.loanAmount),
        interestRate: parseFloat(formData.interestRate),
        tenure: isInterestOnly ? 0 : parseInt(formData.tenure),
        emiAmount: parseFloat(formData.emiAmount) || calculateEmi(),
        processingFee: parseFloat(formData.processingFee) || 0,
        customerMonthlyIncome: formData.customerMonthlyIncome ? parseFloat(formData.customerMonthlyIncome) : null,
        customerDOB: formData.customerDOB || null,
        bankAccountId: formData.bankAccountId || null,
        // Documents
        documents: uploadedDocs,
        // Interest Only Loan
        isInterestOnly,
        // Mirror Loan
        isMirrorLoan,
        mirrorCompanyId: isMirrorLoan ? mirrorCompanyId : null,
        mirrorInterestRate: isMirrorLoan ? getMirrorInterestRate(mirrorCompanyId) : null,
        mirrorInterestType: isMirrorLoan ? 'REDUCING' : null,
        // Extra EMI Payment Page for mirror loans
        extraEmiPaymentPageId: isMirrorLoan ? extraEmiPaymentPageId || null : null
      };

      // Add Gold Loan Receipt Data
      if (formData.loanType === 'GOLD') {
        requestBody.goldLoanDetail = {
          ...goldLoanData,
          verifiedBy: createdById
        };
      }

      // Add Vehicle Loan Receipt Data
      if (formData.loanType === 'VEHICLE') {
        requestBody.vehicleLoanDetail = {
          ...vehicleLoanData,
          verifiedBy: createdById
        };
      }
      
      const res = await fetch('/api/offline-loan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const isInterestOnlyLoan = data.loan?.isInterestOnlyLoan || isInterestOnly;
          const emiGenerated = data.emiCount > 0;
          
          toast({
            title: '🎉 Loan Created Successfully!',
            description: isInterestOnlyLoan 
              ? `Interest Only loan ${data.loan.loanNumber} created for ${formData.customerName}. Loan Amount: ₹${parseFloat(formData.loanAmount).toLocaleString()}. Monthly Interest: ₹${((parseFloat(formData.loanAmount) * parseFloat(formData.interestRate)) / 100 / 12).toLocaleString()}`
              : emiGenerated 
                ? `Loan ${data.loan.loanNumber} created for ${formData.customerName}. Amount: ₹${parseFloat(formData.loanAmount).toLocaleString()}. ${data.emiCount} EMIs generated.`
                : `Loan ${data.loan.loanNumber} created for ${formData.customerName}. Amount: ₹${parseFloat(formData.loanAmount).toLocaleString()}.`
          });
          setOpen(false);
          resetForm();
          onLoanCreated?.();
        }
      } else {
        const error = await res.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to create loan',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Loan creation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create loan',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '', customerPhone: '', customerEmail: '', customerAadhaar: '', customerPan: '',
      customerAddress: '', customerCity: '', customerState: '', customerPincode: '', customerOccupation: '',
      customerMonthlyIncome: '', customerDOB: '', reference1Name: '', reference1Phone: '', reference1Relation: '',
      reference2Name: '', reference2Phone: '', reference2Relation: '', loanType: 'PERSONAL',
      productId: '', loanAmount: '', interestRate: '12', interestType: 'FLAT', tenure: '12', emiAmount: '', processingFee: '0',
      disbursementDate: new Date().toISOString().slice(0, 10), disbursementMode: 'CASH',
      disbursementRef: '', startDate: new Date().toISOString().slice(0, 10), notes: '', internalNotes: '',
      companyId: '', bankAccountId: '', isInterestOnly: false
    });
    // Reset Interest Only and Mirror Loan states
    setIsInterestOnly(false);
    setIsMirrorLoan(false);
    setMirrorCompanyId('');
    setExtraEmiPaymentPageId('');
    setCashbookBalance(null);
    // Reset Gold Loan Data
    setGoldLoanData({
      grossWeight: 0, netWeight: 0, goldRate: 0, valuationAmount: 0, loanAmount: 0,
      ownerName: '', goldItemPhoto: '', karat: 22, numberOfItems: 1, itemDescription: '',
      verificationDate: new Date().toISOString().slice(0, 10), verifiedBy: '', remarks: ''
    });
    // Reset Vehicle Loan Data
    setVehicleLoanData({
      vehicleType: 'CAR', vehicleNumber: '', manufacturer: '', model: '',
      yearOfManufacture: new Date().getFullYear(), valuationAmount: 0, loanAmount: 0,
      ownerName: '', rcBookPhoto: '', vehiclePhoto: '', chassisNumber: '', engineNumber: '',
      fuelType: 'PETROL', color: '', verificationDate: new Date().toISOString().slice(0, 10),
      verifiedBy: '', remarks: ''
    });
    // Reset documents
    setUploadedDocs({});
    setShowAdvanced(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };

  const selectedProduct = loanProducts.find(p => p.id === formData.productId);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500">
        <Plus className="h-4 w-4 mr-2" /> Create Offline Loan
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Create Offline Loan</DialogTitle>
            <DialogDescription>Fill in the customer and loan details below</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Company Selection - REQUIRED for all roles */}
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h3 className="font-semibold flex items-center gap-2 text-amber-800 mb-3">
                <Building2 className="h-4 w-4" /> Select Company *
              </h3>
              <Select value={formData.companyId} onValueChange={(v) => handleInputChange('companyId', v)}>
                <SelectTrigger className={formData.companyId ? '' : 'border-red-300'}>
                  <SelectValue placeholder="Select company for this loan..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name} ({company.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!formData.companyId && (
                <p className="text-xs text-red-500 mt-1">Company selection is required</p>
              )}
            </div>

            {/* Loan Product Selection */}
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <h3 className="font-semibold flex items-center gap-2 text-emerald-800 mb-3">
                <IndianRupee className="h-4 w-4" /> Select Loan Product *
              </h3>
              {loadingProducts ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading products...
                </div>
              ) : (
                <>
                  <Select value={formData.productId} onValueChange={(v) => handleInputChange('productId', v)}>
                    <SelectTrigger className={formData.productId ? '' : 'border-red-300'}>
                      <SelectValue placeholder="Select loan product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loanProducts.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          <span className="flex items-center gap-2">
                            <span>{product.icon}</span>
                            <span>{product.title}</span>
                            {product.isInterestOnly ? (
                              <Badge className="bg-purple-100 text-purple-700 text-xs">Interest Only</Badge>
                            ) : (
                              <span className="text-gray-500 text-xs">({product.defaultInterestRate}% p.a., {product.defaultTenure} months)</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedProduct && (
                    <div className="mt-3 p-3 bg-white rounded-lg border text-sm">
                      <p className="text-gray-600">{selectedProduct.description}</p>
                      <div className="grid grid-cols-4 gap-4 mt-2">
                        <div>
                          <p className="text-xs text-gray-500">Interest Rate</p>
                          <p className="font-medium">{selectedProduct.minInterestRate}% - {selectedProduct.maxInterestRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tenure</p>
                          <p className="font-medium">
                            {selectedProduct.isInterestOnly 
                              ? 'Set at Start Loan' 
                              : `${selectedProduct.minTenure} - ${selectedProduct.maxTenure} months`
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Loan Amount</p>
                          <p className="font-medium">{formatCurrency(selectedProduct.minAmount)} - {formatCurrency(selectedProduct.maxAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Processing Fee</p>
                          <p className="font-medium">{selectedProduct.processingFeePercent}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Customer Details */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><User className="h-4 w-4" /> Customer Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Customer Name *</Label><Input value={formData.customerName} onChange={(e) => handleInputChange('customerName', e.target.value)} placeholder="Full name" /></div>
                <div className="space-y-2"><Label>Phone Number *</Label><Input value={formData.customerPhone} onChange={(e) => handleInputChange('customerPhone', e.target.value)} placeholder="10-digit number" /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.customerEmail} onChange={(e) => handleInputChange('customerEmail', e.target.value)} /></div>
                <div className="space-y-2"><Label>PAN Number</Label><Input value={formData.customerPan} onChange={(e) => handleInputChange('customerPan', e.target.value.toUpperCase())} maxLength={10} /></div>
                <div className="space-y-2"><Label>Aadhaar Number</Label><Input value={formData.customerAadhaar} onChange={(e) => handleInputChange('customerAadhaar', e.target.value)} maxLength={12} /></div>
                <div className="space-y-2"><Label>Occupation</Label><Input value={formData.customerOccupation} onChange={(e) => handleInputChange('customerOccupation', e.target.value)} /></div>
                <div className="space-y-2"><Label>Monthly Income</Label><Input type="number" value={formData.customerMonthlyIncome} onChange={(e) => handleInputChange('customerMonthlyIncome', e.target.value)} /></div>
                <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={formData.customerDOB} onChange={(e) => handleInputChange('customerDOB', e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Address *</Label><Input value={formData.customerAddress} onChange={(e) => handleInputChange('customerAddress', e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>City</Label><Input value={formData.customerCity} onChange={(e) => handleInputChange('customerCity', e.target.value)} /></div>
                <div className="space-y-2"><Label>State</Label><Input value={formData.customerState} onChange={(e) => handleInputChange('customerState', e.target.value)} /></div>
                <div className="space-y-2"><Label>Pincode</Label><Input value={formData.customerPincode} onChange={(e) => handleInputChange('customerPincode', e.target.value)} maxLength={6} /></div>
              </div>
            </div>

            {/* Loan Details */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Loan Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loan Type</Label>
                  <Input value={selectedProduct?.title || formData.loanType} disabled className="bg-gray-50" />
                </div>
                <div className="space-y-2"><Label>Loan Amount *</Label><Input type="number" value={formData.loanAmount} onChange={(e) => handleInputChange('loanAmount', e.target.value)} /></div>
                <div className="space-y-2"><Label>Interest Rate (% p.a.) *</Label><Input type="number" step="0.1" value={formData.interestRate} onChange={(e) => handleInputChange('interestRate', e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Interest Type</Label>
                  <Select value={formData.interestType || 'FLAT'} onValueChange={(v) => handleInputChange('interestType', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FLAT">Flat Interest</SelectItem>
                      <SelectItem value="REDUCING">Reducing Balance</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {formData.interestType === 'REDUCING' 
                      ? 'Interest calculated on outstanding balance' 
                      : 'Interest calculated on principal for full tenure'}
                  </p>
                </div>
                {/* Hide tenure field for Interest Only loans - will be asked at Start Loan time */}
                {!isInterestOnly && (
                  <div className="space-y-2"><Label>Tenure (months) *</Label><Input type="number" value={formData.tenure} onChange={(e) => handleInputChange('tenure', e.target.value)} /></div>
                )}
                {/* Show tenure info for Interest Only loans */}
                {isInterestOnly && (
                  <div className="space-y-2">
                    <Label>Tenure</Label>
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm text-purple-700">
                        <Info className="h-4 w-4 inline mr-1" />
                        Tenure will be set when starting the loan
                      </p>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{isInterestOnly ? 'Monthly Interest' : 'EMI Amount (Auto-calculated)'}</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      value={isInterestOnly 
                        ? ((parseFloat(formData.loanAmount || '0') * parseFloat(formData.interestRate || '0') / 100) / 12).toFixed(0)
                        : calculateEmi()
                      } 
                      disabled 
                      className="bg-gray-100 text-gray-700 font-semibold" 
                    />
                    <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                      {formatCurrency(isInterestOnly 
                        ? ((parseFloat(formData.loanAmount || '0') * parseFloat(formData.interestRate || '0') / 100) / 12)
                        : calculateEmi()
                      )}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {isInterestOnly 
                      ? 'Monthly interest payment. Customer pays this until loan is started.'
                      : 'EMI is auto-calculated based on Loan Amount, Interest Rate, Tenure & Interest Type'
                    }
                  </p>
                </div>
                <div className="space-y-2"><Label>Processing Fee</Label><Input type="number" value={formData.processingFee} onChange={(e) => handleInputChange('processingFee', e.target.value)} /></div>
              </div>
            </div>

            {/* Loan Options - Interest Only Info & Mirror Loan */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Loan Options</h3>
              
              {/* Interest Only Loan Info - Auto-applied based on product selection */}
              {isInterestOnly && (
                <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-700">Interest Only Loan (Auto-applied)</Badge>
                    </div>
                    <p className="text-sm text-purple-600 mt-1">
                      Customer pays only monthly interest until loan is activated. Principal remains unchanged.
                    </p>
                    <div className="mt-3 p-3 bg-white rounded-lg border border-purple-200">
                      <div className="flex justify-between items-center">
                        <span className="text-purple-700 font-medium">Monthly Interest Payment:</span>
                        <span className="text-xl font-bold text-purple-600">
                          {formatCurrency((parseFloat(formData.loanAmount || '0') * parseFloat(formData.interestRate || '0') / 100) / 12)}
                        </span>
                      </div>
                      <p className="text-xs text-purple-500 mt-2">
                        No EMI schedule will be generated. Customer pays interest monthly until "Start Loan" is clicked.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mirror Loan Checkbox - Only for Company 3 and non-Interest Only loans */}
              {!isInterestOnly && isSelectedCompany3() && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <input
                    type="checkbox"
                    id="isMirrorLoan"
                    checked={isMirrorLoan}
                    onChange={(e) => {
                      setIsMirrorLoan(e.target.checked);
                    }}
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-blue-300 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <Label htmlFor="isMirrorLoan" className="font-medium text-blue-800 cursor-pointer">
                      Create Mirror Loan
                    </Label>
                    <p className="text-sm text-blue-600 mt-1">
                      Create a duplicate loan record in another company with reducing interest. Company 1 = 15% Reducing, Company 2 = 24% Reducing.
                    </p>
                    {isMirrorLoan && (
                      <div className="mt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-blue-700">Mirror Company</Label>
                            <Select value={mirrorCompanyId} onValueChange={setMirrorCompanyId}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select company..." />
                              </SelectTrigger>
                              <SelectContent>
                                {companies.filter(c => c.id !== formData.companyId).map(c => {
                                  const mirrorRate = getMirrorInterestRate(c.id);
                                  return (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name} ({mirrorRate}% Reducing)
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-blue-300">
                            <p className="text-xs text-gray-500">Mirror Interest Rate</p>
                            <p className="text-lg font-bold text-blue-700">
                              {mirrorCompanyId ? `${getMirrorInterestRate(mirrorCompanyId)}% REDUCING` : 'Select company'}
                            </p>
                          </div>
                        </div>

                        {/* EMI Schedule Preview for Mirror Loan */}
                        {mirrorCompanyId && mirrorLoanSummary && originalEmiSchedule.length > 0 && (
                          <div className="mt-4 space-y-4">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                <p className="text-xs text-emerald-600">Interest Saved</p>
                                <p className="text-lg font-bold text-emerald-700">{formatCurrency(mirrorLoanSummary.interestSaved)}</p>
                              </div>
                              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <p className="text-xs text-amber-600">Extra EMIs (Company 3 Profit)</p>
                                <p className="text-lg font-bold text-amber-700">{mirrorLoanSummary.extraEMICount}</p>
                              </div>
                              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <p className="text-xs text-purple-600">Mirror Tenure</p>
                                <p className="text-lg font-bold text-purple-700">{mirrorLoanSummary.mirrorTenure} months</p>
                              </div>
                            </div>

                            {/* EMI Schedule Table */}
                            <div className="border rounded-lg overflow-hidden">
                              <div className="bg-gray-100 p-2 border-b">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  <Calculator className="h-4 w-4" /> EMI Schedule Comparison
                                </h4>
                              </div>
                              <div className="overflow-x-auto max-h-60">
                                <table className="w-full text-xs">
                                  <thead className="sticky top-0 bg-gray-50">
                                    <tr>
                                      <th className="px-2 py-1 text-left border-b">#</th>
                                      <th className="px-2 py-1 text-right border-b bg-red-50">Original Principal</th>
                                      <th className="px-2 py-1 text-right border-b bg-red-50">Original Interest</th>
                                      <th className="px-2 py-1 text-right border-b bg-emerald-50">Mirror Principal</th>
                                      <th className="px-2 py-1 text-right border-b bg-emerald-50">Mirror Interest</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Array.from({ length: Math.max(originalEmiSchedule.length, mirrorEmiSchedule.length) }).map((_, idx) => {
                                      const originalEMI = originalEmiSchedule[idx];
                                      const mirrorEMI = mirrorEmiSchedule[idx];
                                      const isExtraEMI = idx >= mirrorEmiSchedule.length && originalEMI;
                                      
                                      return (
                                        <tr key={idx} className={isExtraEMI ? 'bg-amber-100' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                          <td className="px-2 py-1 border-b">
                                            {idx + 1}
                                            {isExtraEMI && <Badge className="ml-1 bg-amber-500 text-white text-[10px]">EXTRA</Badge>}
                                          </td>
                                          <td className="px-2 py-1 text-right border-b">{originalEMI ? formatCurrency(originalEMI.principal) : '-'}</td>
                                          <td className="px-2 py-1 text-right border-b text-red-600">{originalEMI ? formatCurrency(originalEMI.interest) : '-'}</td>
                                          <td className="px-2 py-1 text-right border-b">{mirrorEMI ? formatCurrency(mirrorEMI.principal) : (isExtraEMI ? <span className="text-amber-700">Done</span> : '-')}</td>
                                          <td className="px-2 py-1 text-right border-b text-emerald-600">{mirrorEMI ? formatCurrency(mirrorEMI.interest) : '-'}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-4 text-xs">
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></div>
                                <span>Extra EMI - Goes to Company 3 Cash Book</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-red-50 border border-red-300 rounded"></div>
                                <span>Original ({formData.interestRate}% FLAT)</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-emerald-50 border border-emerald-300 rounded"></div>
                                <span>Mirror ({mirrorLoanSummary.mirrorRate}% REDUCING)</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Secondary Payment Page for Extra EMIs */}
                        {mirrorLoanSummary && mirrorLoanSummary.extraEMICount > 0 && paymentPages.length > 0 && (
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <Label className="text-amber-800 font-medium">Secondary Payment Page for Extra EMIs</Label>
                            <p className="text-xs text-amber-600 mb-2">
                              Extra EMIs (profit for Company 3) will be recorded to this payment page
                            </p>
                            <Select value={extraEmiPaymentPageId} onValueChange={setExtraEmiPaymentPageId}>
                              <SelectTrigger className="mt-1 bg-white">
                                <SelectValue placeholder="Select payment page (optional)..." />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentPages.map(page => (
                                  <SelectItem key={page.id} value={page.id}>{page.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Show info message for non-Company 3 selections */}
              {!isInterestOnly && formData.companyId && !isSelectedCompany3() && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <Info className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Mirror Loan:</span> Only available for Company 3 loans. 
                      Select Company 3 to enable mirror loan functionality.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Gold Loan Receipt - Shows when loan type is GOLD */}
            {formData.loanType === 'GOLD' && (
              <div className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-800">Gold Loan Receipt</h3>
                  <Badge className="bg-amber-100 text-amber-700">Required for Gold Loan</Badge>
                </div>
                <Alert className="bg-amber-50 border-amber-200 mb-4">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700">
                    Please fill in all gold item details. This information is mandatory for gold loan processing.
                  </AlertDescription>
                </Alert>
                <GoldLoanReceipt
                  data={goldLoanData}
                  onChange={(data) => setGoldLoanData(prev => ({ ...prev, ...data }))}
                />
              </div>
            )}

            {/* Vehicle Loan Receipt - Shows when loan type is VEHICLE */}
            {formData.loanType === 'VEHICLE' && (
              <div className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Car className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">Vehicle Loan Receipt</h3>
                  <Badge className="bg-blue-100 text-blue-700">Required for Vehicle Loan</Badge>
                </div>
                <Alert className="bg-blue-50 border-blue-200 mb-4">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    Please fill in all vehicle details including RC Book and Vehicle photos. This information is mandatory for vehicle loan processing.
                  </AlertDescription>
                </Alert>
                <VehicleLoanReceipt
                  data={vehicleLoanData}
                  onChange={(data) => setVehicleLoanData(prev => ({ ...prev, ...data }))}
                />
              </div>
            )}

            {/* Document Upload Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold">Document Upload</h3>
              </div>
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 text-sm">
                  Upload clear scanned copies or photos. Supported formats: PNG, JPG, WEBP, PDF. Max size: 10MB.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {DOCUMENT_TYPES.map((doc) => {
                  const uploaded = uploadedDocs[doc.id];
                  const isUploading = uploadingDoc === doc.id;
                  
                  return (
                    <div key={doc.id} className="relative">
                      <input
                        type="file"
                        id={`doc-${doc.id}`}
                        className="hidden"
                        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleDocumentUpload(doc.id, file);
                          e.target.value = '';
                        }}
                        disabled={isUploading}
                      />
                      <label
                        htmlFor={`doc-${doc.id}`}
                        className={`block p-3 border-2 rounded-lg text-center transition-all cursor-pointer ${
                          uploaded
                            ? 'border-emerald-400 bg-emerald-50'
                            : 'border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50'
                        } ${isUploading ? 'opacity-70 cursor-wait' : ''}`}
                      >
                        {uploaded ? (
                          <div className="flex flex-col items-center">
                            <CheckCircle className="h-6 w-6 text-emerald-500 mb-1" />
                            <p className="text-xs font-medium text-emerald-700">{doc.name}</p>
                            <p className="text-xs text-emerald-600 truncate max-w-full">{uploaded.name}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-1 text-red-600 hover:text-red-700 hover:bg-red-50 h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemoveDocument(doc.id);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : isUploading ? (
                          <div className="flex flex-col items-center">
                            <Loader2 className="h-6 w-6 text-emerald-500 animate-spin mb-1" />
                            <p className="text-xs font-medium text-gray-600">Uploading...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <Upload className="h-6 w-6 text-gray-400 mb-1" />
                            <p className="text-xs font-medium">{doc.name}</p>
                            <p className="text-xs text-gray-500">{doc.desc}</p>
                            {doc.required && (
                              <span className="text-xs text-red-500 mt-1">*Required</span>
                            )}
                          </div>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
              
              {/* Upload Summary */}
              {Object.keys(uploadedDocs).length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>{Object.keys(uploadedDocs).length}</strong> of {DOCUMENT_TYPES.filter(d => d.required).length} required documents uploaded
                  </p>
                </div>
              )}
            </div>

            {/* Dates & Disbursement */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Dates & Disbursement</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Disbursement Date *</Label><Input type="date" value={formData.disbursementDate} onChange={(e) => handleInputChange('disbursementDate', e.target.value)} /></div>
                <div className="space-y-2"><Label>EMI Start Date *</Label><Input type="date" value={formData.startDate} onChange={(e) => handleInputChange('startDate', e.target.value)} /></div>
              </div>
              
              {/* Bank Account / Cashbook Selection */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Disbursement Account
                </h4>
                
                {!formData.companyId ? (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-700 text-sm">
                      Please select a company first to see available accounts.
                    </AlertDescription>
                  </Alert>
                ) : isSelectedCompany3() ? (
                  // Company 3 - Show Cashbook instead of Bank Accounts
                  <div className="space-y-4">
                    <Alert className="bg-emerald-50 border-emerald-200">
                      <Wallet className="h-4 w-4 text-emerald-600" />
                      <AlertDescription className="text-emerald-700 text-sm">
                        <strong>Company 3 uses Cashbook</strong> - No bank accounts available for this company.
                      </AlertDescription>
                    </Alert>
                    
                    {loadingCashbook ? (
                      <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm text-gray-600">Loading cashbook...</span>
                      </div>
                    ) : (
                      <div className="p-4 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg border border-emerald-300">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-emerald-700">Cashbook Balance</p>
                            <p className="text-2xl font-bold text-emerald-800">
                              {cashbookBalance !== null ? formatCurrency(cashbookBalance) : '₹0'}
                            </p>
                          </div>
                          <div className="p-3 bg-white rounded-full">
                            <Wallet className="h-8 w-8 text-emerald-600" />
                          </div>
                        </div>
                        <p className="text-xs text-emerald-600 mt-2">
                          Loan disbursement will be recorded in the cashbook
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Payment Mode</Label>
                        <Select value={formData.disbursementMode} onValueChange={(v) => handleInputChange('disbursementMode', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="CHEQUE">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Reference Number</Label>
                        <Input value={formData.disbursementRef} onChange={(e) => handleInputChange('disbursementRef', e.target.value)} placeholder="Ref No. (optional)" />
                      </div>
                    </div>
                  </div>
                ) : bankAccounts.length === 0 ? (
                  <Alert className="bg-gray-50 border-gray-200">
                    <Info className="h-4 w-4 text-gray-600" />
                    <AlertDescription className="text-gray-700 text-sm">
                      No bank accounts found for this company. Please add bank accounts in the accounting section.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Payment Mode</Label>
                        <Select value={formData.disbursementMode} onValueChange={(v) => handleInputChange('disbursementMode', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                            <SelectItem value="CHEQUE">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Reference Number</Label>
                        <Input value={formData.disbursementRef} onChange={(e) => handleInputChange('disbursementRef', e.target.value)} placeholder="Cheque No. / Ref" />
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <Label>Select Bank Account for Disbursement</Label>
                      <Select 
                        value={formData.bankAccountId || ''} 
                        onValueChange={(v) => handleInputChange('bankAccountId', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank account..." />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.bankName} - {acc.accountNumber}
                              <span className="text-gray-500 ml-1">(Bal: ₹{acc.currentBalance?.toLocaleString()})</span>
                              {acc.isDefault && <span className="text-amber-600 ml-1">★ Default</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-blue-600">
                        The loan amount will be deducted from the selected bank account
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Advanced Toggle */}
            <div className="pt-4 border-t">
              <button type="button" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900" onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Reference Contacts & Notes
              </button>
              
              {showAdvanced && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Guardian 1</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="Name" value={formData.reference1Name} onChange={(e) => handleInputChange('reference1Name', e.target.value)} />
                      <Input placeholder="Phone" value={formData.reference1Phone} onChange={(e) => handleInputChange('reference1Phone', e.target.value)} />
                      <Input placeholder="Relation" value={formData.reference1Relation} onChange={(e) => handleInputChange('reference1Relation', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Guardian 2</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="Name" value={formData.reference2Name} onChange={(e) => handleInputChange('reference2Name', e.target.value)} />
                      <Input placeholder="Phone" value={formData.reference2Phone} onChange={(e) => handleInputChange('reference2Phone', e.target.value)} />
                      <Input placeholder="Relation" value={formData.reference2Relation} onChange={(e) => handleInputChange('reference2Relation', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Notes</Label><Input value={formData.notes} onChange={(e) => handleInputChange('notes', e.target.value)} /></div>
                    <div className="space-y-2"><Label>Internal Notes</Label><Input value={formData.internalNotes} onChange={(e) => handleInputChange('internalNotes', e.target.value)} /></div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => { setOpen(false); resetForm(); }}><X className="h-4 w-4 mr-2" /> Cancel</Button>
              <Button className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500" onClick={handleSubmit} disabled={submitting || !formData.companyId}>
                <Save className="h-4 w-4 mr-2" /> {submitting ? 'Creating...' : 'Create Loan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
