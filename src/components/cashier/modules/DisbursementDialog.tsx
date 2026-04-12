'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';

import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Send, Loader2, User, Building2, ArrowRight, AlertCircle, Landmark, AlertTriangle,
  ChevronDown, ChevronUp, FileImage, ExternalLink, Car, Gem, Home, IdCard, FileText,
  IndianRupee, Wallet, Users2, Briefcase, ArrowLeft, RefreshCw, CreditCard,
  PlusCircle, Split, Banknote
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import type { Loan, BankAccount, MirrorLoanInfo, DisbursementForm, ExpandedSections, SecondaryPaymentPage } from '../tabs/types';

// Payment Source Type - Combined Bank + Cash
interface PaymentSource {
  id: string;
  type: 'BANK' | 'CASH';
  name: string;
  displayName: string;
  accountNumber: string | null;
  ifscCode: string | null;
  currentBalance: number;
  isDefault: boolean;
  details: any;
}

interface DisbursementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLoan: Loan | null;
  bankAccounts: BankAccount[];
  mirrorLoanInfo: MirrorLoanInfo | null;
  disbursementForm: DisbursementForm;
  setDisbursementForm: React.Dispatch<React.SetStateAction<DisbursementForm>>;
  expandedSections: ExpandedSections;
  setExpandedSections: React.Dispatch<React.SetStateAction<ExpandedSections>>;
  saving: boolean;
  remainingLimit: number;
  dailyLimit: number;
  onDisburse: () => void;
  onSendBack: () => void;
  isCompany3?: boolean;
  cashBook?: { currentBalance: number; company?: { id: string; name: string; code: string } } | null;
}

export default function DisbursementDialog({
  open,
  onOpenChange,
  selectedLoan,
  bankAccounts,
  mirrorLoanInfo,
  disbursementForm,
  setDisbursementForm,
  expandedSections,
  setExpandedSections,
  saving,
  remainingLimit,
  dailyLimit,
  onDisburse,
  onSendBack,
  isCompany3 = false,
  cashBook = null
}: DisbursementDialogProps) {
  const [secondaryPaymentPages, setSecondaryPaymentPages] = useState<SecondaryPaymentPage[]>([]);
  const [loadingPaymentPages, setLoadingPaymentPages] = useState(false);
  
  // Combined payment sources state
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [loadingPaymentSources, setLoadingPaymentSources] = useState(false);

  // Fetch secondary payment pages when dialog opens for a mirror loan
  useEffect(() => {
    if (open && mirrorLoanInfo?.isMirrorLoan) {
      fetchSecondaryPaymentPages();
    }
  }, [open, mirrorLoanInfo?.isMirrorLoan]);
  
  // Fetch payment sources when dialog opens
  // For mirror loans, fetch from MIRROR company; for regular loans, fetch from loan's company
  useEffect(() => {
    if (open) {
      // For mirror loans, use mirrorCompanyId; otherwise use loan's companyId
      const companyIdToUse = mirrorLoanInfo?.isMirrorLoan && mirrorLoanInfo?.mirrorCompanyId
        ? mirrorLoanInfo.mirrorCompanyId
        : selectedLoan?.companyId;
      
      if (companyIdToUse) {
        fetchPaymentSources(companyIdToUse);
      }
    }
  }, [open, selectedLoan?.companyId, mirrorLoanInfo?.isMirrorLoan, mirrorLoanInfo?.mirrorCompanyId]);
  
  const fetchPaymentSources = async (companyId: string) => {
    setLoadingPaymentSources(true);
    try {
      const response = await fetch(`/api/payment-sources?companyId=${companyId}`);
      const data = await response.json();
      if (data.success) {
        setPaymentSources(data.paymentSources || []);
      }
    } catch (error) {
      console.error('Error fetching payment sources:', error);
    } finally {
      setLoadingPaymentSources(false);
    }
  };

  const fetchSecondaryPaymentPages = async () => {
    setLoadingPaymentPages(true);
    try {
      const response = await fetch('/api/emi-payment-settings?action=secondary-pages&companyId=all');
      const data = await response.json();
      if (data.success) {
        setSecondaryPaymentPages(data.pages || []);
      }
    } catch (error) {
      console.error('Error fetching secondary payment pages:', error);
    } finally {
      setLoadingPaymentPages(false);
    }
  };
  
  const toggleSection = (section: keyof ExpandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };



  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl p-0 gap-0 overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-5 flex-shrink-0">
          <SheetHeader>
            <SheetTitle className="text-xl flex items-center gap-2 text-white">
              <Send className="h-6 w-6" /> Disburse Loan - Complete Details
            </SheetTitle>
            <SheetDescription className="text-green-100">
              {selectedLoan?.applicationNo} - {selectedLoan?.customer?.name}
              {selectedLoan?.company && <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-sm">Company: {selectedLoan.company.name}</span>}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {selectedLoan && (
            <div className="p-5 space-y-4">
              {/* Mirror Loan Disbursement Info - Show FIRST if mirror loan */}
              {mirrorLoanInfo?.isMirrorLoan && (
                <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <RefreshCw className="h-6 w-6 text-purple-600" />
                      <div>
                        <p className="text-xs text-purple-600 font-medium">MIRROR LOAN - DISBURSEMENT FROM MIRROR COMPANY</p>
                        <h3 className="text-lg font-bold text-purple-800">{mirrorLoanInfo.mirrorCompanyName}</h3>
                      </div>
                      <Badge className="ml-auto bg-purple-500 text-white">MIRROR COMPANY</Badge>
                    </div>
                    <div className="bg-white/70 p-4 rounded-lg space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-500" />
                          <span className="text-gray-600">Original Company (Loan Owner):</span>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {mirrorLoanInfo.originalCompanyName || selectedLoan.company?.name || 'N/A'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-purple-600 font-medium">
                        <ArrowRight className="h-4 w-4" />
                        <span>Money will be disbursed from MIRROR COMPANY bank account</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-green-500" />
                          <span className="text-gray-600">Disbursement Company (Bank Account):</span>
                        </div>
                        <Badge className="bg-green-500 text-white">
                          {mirrorLoanInfo.mirrorCompanyName}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-white/50 p-3 rounded-lg mt-3">
                      <div>
                        <p className="text-gray-500">Mirror Company Bank Accounts</p>
                        <p className="font-medium text-lg text-green-600">{bankAccounts.length} available</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total Bank Balance</p>
                        <p className="font-medium text-lg text-green-600">{formatCurrency(bankAccounts.reduce((sum, a) => sum + a.currentBalance, 0))}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Loan Amount to Disburse</p>
                        <p className="font-medium text-lg text-emerald-600">{formatCurrency(selectedLoan.sessionForm?.approvedAmount || selectedLoan.requestedAmount)}</p>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs text-amber-700">
                        <strong>⚠️ IMPORTANT:</strong> The money will be disbursed from <strong>{mirrorLoanInfo.mirrorCompanyName}</strong>&apos;s bank account. 
                        Make sure to select a bank account from <strong>{mirrorLoanInfo.mirrorCompanyName}</strong> below.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Company Information Section - Show for non-mirror loans OR as additional info */}
              {selectedLoan?.company && !mirrorLoanInfo?.isMirrorLoan && (
                <Card className={`border-0 shadow-sm border-l-4 ${isCompany3 ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-l-amber-500' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-blue-500'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Building2 className={`h-6 w-6 ${isCompany3 ? 'text-amber-600' : 'text-blue-600'}`} />
                      <div>
                        <p className={`text-xs font-medium ${isCompany3 ? 'text-amber-600' : 'text-blue-600'}`}>
                          {isCompany3 ? 'COMPANY 3 - CASH BOOK' : 'LOAN FROM COMPANY'}
                        </p>
                        <h3 className={`text-lg font-bold ${isCompany3 ? 'text-amber-800' : 'text-blue-800'}`}>{selectedLoan.company.name}</h3>
                      </div>
                      <Badge className={`ml-auto ${isCompany3 ? 'bg-amber-500' : 'bg-blue-500'}`}>{selectedLoan.company.code || 'N/A'}</Badge>
                    </div>
                    
                    {/* Company 3: Show CashBook */}
                    {isCompany3 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-white/50 p-3 rounded-lg">
                        <div>
                          <p className="text-gray-500">Cash Book Balance</p>
                          <p className={`font-medium text-lg ${cashBook && cashBook.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {cashBook ? formatCurrency(cashBook.currentBalance) : '₹0'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Disbursement Mode</p>
                          <p className="font-medium text-lg text-amber-600">CASH ONLY</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Loan Amount to Disburse</p>
                          <p className="font-medium text-lg text-emerald-600">{formatCurrency(selectedLoan.sessionForm?.approvedAmount || selectedLoan.requestedAmount)}</p>
                        </div>
                      </div>
                    ) : (
                      /* Other companies: Show Bank Accounts */
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-white/50 p-3 rounded-lg">
                        <div>
                          <p className="text-gray-500">Company Bank Accounts</p>
                          <p className="font-medium text-lg text-green-600">{bankAccounts.length} available</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total Bank Balance</p>
                          <p className="font-medium text-lg text-green-600">{formatCurrency(bankAccounts.reduce((sum, a) => sum + a.currentBalance, 0))}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Loan Amount to Disburse</p>
                          <p className="font-medium text-lg text-emerald-600">{formatCurrency(selectedLoan.sessionForm?.approvedAmount || selectedLoan.requestedAmount)}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Company 3 Warning */}
                    {isCompany3 && (
                      <div className="mt-3 p-3 bg-amber-100 rounded-lg border border-amber-200">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                          <div className="text-xs text-amber-800">
                            <p className="font-semibold">Company 3 uses Cash Book (no bank account)</p>
                            <p className="mt-1">Balance can go negative. Accountant can add funds manually.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Original Company Info for Mirror Loans - Show smaller */}
              {mirrorLoanInfo?.isMirrorLoan && selectedLoan?.company && (
                <Card className="border-0 shadow-sm bg-gray-50 border-l-4 border-l-gray-400">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Original Loan Company (For Reference Only)</p>
                        <p className="font-medium text-gray-700">{selectedLoan.company.name} ({selectedLoan.company.code || 'N/A'})</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Customer Information Section - Expanded */}
              <Card className="border-0 shadow-sm">
                <button 
                  onClick={() => toggleSection('customer')}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 rounded-t-lg"
                >
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Customer Information (A to Z)
                  </CardTitle>
                  {expandedSections.customer ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
                <AnimatePresence>
                  {expandedSections.customer && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="pt-0 border-t">
                        {/* Customer Photo and Basic Info */}
                        <div className="flex items-start gap-4 py-4 border-b">
                          <div className="relative">
                            {selectedLoan.photoDoc ? (
                              <img src={selectedLoan.photoDoc} alt="Customer" className="h-20 w-20 rounded-full object-cover border-2 border-blue-200" />
                            ) : (
                              <Avatar className="h-20 w-20 bg-gradient-to-br from-blue-400 to-indigo-500">
                                <AvatarFallback className="bg-transparent text-white text-2xl">
                                  {selectedLoan.customer?.name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">Full Name</p>
                              <p className="font-semibold text-lg">{selectedLoan.customer?.name || 
                                [selectedLoan.firstName, selectedLoan.middleName, selectedLoan.lastName].filter(Boolean).join(' ') || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Father&apos;s Name</p>
                              <p className="font-medium">{selectedLoan.fatherName || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Email</p>
                              <p className="font-medium">{selectedLoan.customer?.email || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Phone</p>
                              <p className="font-medium">{selectedLoan.customer?.phone || selectedLoan.phone || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Personal Details Grid */}
                        <div className="py-4 border-b">
                          <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <IdCard className="h-4 w-4" /> Personal Details
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500">PAN Number</p>
                              <p className="font-medium">{selectedLoan.panNumber || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500">Aadhaar Number</p>
                              <p className="font-medium">{selectedLoan.aadhaarNumber ? `XXXX-XXXX-${selectedLoan.aadhaarNumber.slice(-4)}` : 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500">Date of Birth</p>
                              <p className="font-medium">{selectedLoan.dateOfBirth ? formatDate(selectedLoan.dateOfBirth) : 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500">Gender</p>
                              <p className="font-medium">{selectedLoan.gender || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500">Marital Status</p>
                              <p className="font-medium">{selectedLoan.maritalStatus || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500">Mother&apos;s Name</p>
                              <p className="font-medium">{selectedLoan.motherName || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                              <p className="text-xs text-gray-500">Full Address</p>
                              <p className="font-medium">{[selectedLoan.address, selectedLoan.city, selectedLoan.state, selectedLoan.pincode].filter(Boolean).join(', ') || 'N/A'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Employment Details */}
                        <div className="py-4 border-b">
                          <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <Briefcase className="h-4 w-4" /> Employment Details
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-xs text-gray-500">Employment Type</p>
                              <p className="font-medium">{selectedLoan.employmentType || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-xs text-gray-500">Employer Name</p>
                              <p className="font-medium">{selectedLoan.employerName || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-xs text-gray-500">Designation</p>
                              <p className="font-medium">{selectedLoan.designation || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-xs text-gray-500">Years in Employment</p>
                              <p className="font-medium">{selectedLoan.yearsInEmployment ? `${selectedLoan.yearsInEmployment} years` : 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg">
                              <p className="text-xs text-gray-500">Monthly Income</p>
                              <p className="font-medium text-green-600">{selectedLoan.monthlyIncome ? formatCurrency(selectedLoan.monthlyIncome) : 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg">
                              <p className="text-xs text-gray-500">Annual Income</p>
                              <p className="font-medium text-green-600">{selectedLoan.annualIncome ? formatCurrency(selectedLoan.annualIncome) : 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg">
                              <p className="text-xs text-gray-500">Other Income</p>
                              <p className="font-medium">{selectedLoan.otherIncome ? formatCurrency(selectedLoan.otherIncome) : 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg">
                              <p className="text-xs text-gray-500">Income Source</p>
                              <p className="font-medium">{selectedLoan.incomeSource || 'N/A'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Bank Details */}
                        <div className="py-4">
                          <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <Landmark className="h-4 w-4" /> Customer Bank Account (For Disbursement)
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="p-3 bg-purple-50 rounded-lg">
                              <p className="text-xs text-gray-500">Account Holder</p>
                              <p className="font-medium">{selectedLoan.accountHolderName || selectedLoan.customer?.name || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-lg">
                              <p className="text-xs text-gray-500">Bank Name</p>
                              <p className="font-medium">{selectedLoan.bankName || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-lg">
                              <p className="text-xs text-gray-500">Account Number</p>
                              <p className="font-medium">{selectedLoan.bankAccountNumber || 'N/A'}</p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-lg">
                              <p className="text-xs text-gray-500">IFSC Code</p>
                              <p className="font-medium">{selectedLoan.bankIfsc || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              {/* References Section */}
              {(selectedLoan.reference1Name || selectedLoan.reference2Name) && (
                <Card className="border-0 shadow-sm">
                  <button 
                    onClick={() => toggleSection('references')}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users2 className="h-5 w-5 text-orange-600" />
                      References
                    </CardTitle>
                    {expandedSections.references ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  <AnimatePresence>
                    {expandedSections.references && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CardContent className="pt-0 border-t">
                          <div className="grid grid-cols-2 gap-4 py-4">
                            {selectedLoan.reference1Name && (
                              <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                                <h5 className="font-medium text-orange-800 mb-2">Reference 1</h5>
                                <div className="space-y-2 text-sm">
                                  <p><span className="text-gray-500">Name:</span> {selectedLoan.reference1Name}</p>
                                  <p><span className="text-gray-500">Phone:</span> {selectedLoan.reference1Phone || 'N/A'}</p>
                                  <p><span className="text-gray-500">Relation:</span> {selectedLoan.reference1Relation || 'N/A'}</p>
                                  <p><span className="text-gray-500">Address:</span> {selectedLoan.reference1Address || 'N/A'}</p>
                                </div>
                              </div>
                            )}
                            {selectedLoan.reference2Name && (
                              <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                                <h5 className="font-medium text-orange-800 mb-2">Reference 2</h5>
                                <div className="space-y-2 text-sm">
                                  <p><span className="text-gray-500">Name:</span> {selectedLoan.reference2Name}</p>
                                  <p><span className="text-gray-500">Phone:</span> {selectedLoan.reference2Phone || 'N/A'}</p>
                                  <p><span className="text-gray-500">Relation:</span> {selectedLoan.reference2Relation || 'N/A'}</p>
                                  <p><span className="text-gray-500">Address:</span> {selectedLoan.reference2Address || 'N/A'}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )}

              {/* Documents Section */}
              <Card className="border-0 shadow-sm">
                <button 
                  onClick={() => toggleSection('employment')}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileImage className="h-5 w-5 text-purple-600" />
                    Documents
                  </CardTitle>
                  {expandedSections.employment ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
                <AnimatePresence>
                  {expandedSections.employment && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="pt-0 border-t">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 py-4">
                          {[
                            { label: 'Photo', value: selectedLoan.photoDoc, icon: User },
                            { label: 'PAN Card', value: selectedLoan.panCardDoc, icon: IdCard },
                            { label: 'Aadhaar Front', value: selectedLoan.aadhaarFrontDoc, icon: IdCard },
                            { label: 'Aadhaar Back', value: selectedLoan.aadhaarBackDoc, icon: IdCard },
                            { label: 'Income Proof', value: selectedLoan.incomeProofDoc, icon: FileText },
                            { label: 'Address Proof', value: selectedLoan.addressProofDoc, icon: Home },
                            { label: 'Bank Statement', value: selectedLoan.bankStatementDoc, icon: Landmark },
                            { label: 'Passbook', value: selectedLoan.passbookDoc, icon: Landmark },
                            { label: 'Salary Slip', value: selectedLoan.salarySlipDoc, icon: IndianRupee },
                            { label: 'Election Card', value: selectedLoan.electionCardDoc, icon: IdCard },
                            { label: 'House Photo', value: selectedLoan.housePhotoDoc, icon: Home },
                            { label: 'Guarantor Photo', value: selectedLoan.guarantorPhotoDoc, icon: Users2 },
                            { label: 'Other Docs', value: selectedLoan.otherDocs, icon: FileText },
                          ].filter(d => d.value).map((doc, i) => (
                            <a key={i} href={doc.value} target="_blank" rel="noopener noreferrer" 
                              className="p-3 bg-purple-50 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors flex flex-col items-center gap-2">
                              <doc.icon className="h-6 w-6 text-purple-600" />
                              <span className="text-xs font-medium text-purple-700">{doc.label}</span>
                              <ExternalLink className="h-3 w-3 text-purple-400" />
                            </a>
                          ))}
                          {![
                             selectedLoan.photoDoc, selectedLoan.panCardDoc, selectedLoan.aadhaarFrontDoc, selectedLoan.aadhaarBackDoc, 
                             selectedLoan.incomeProofDoc, selectedLoan.addressProofDoc, selectedLoan.bankStatementDoc, 
                             selectedLoan.passbookDoc, selectedLoan.salarySlipDoc, selectedLoan.electionCardDoc, 
                             selectedLoan.housePhotoDoc, selectedLoan.guarantorPhotoDoc, selectedLoan.otherDocs
                          ].some(Boolean) && (
                            <div className="col-span-4 text-center py-8 text-gray-500">
                              No documents uploaded
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              {/* Gold Loan Details */}
              {selectedLoan.goldLoanDetail && (
                <Card className="border-0 shadow-sm bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Gem className="h-6 w-6 text-yellow-600" />
                      <h4 className="font-semibold text-yellow-800">Gold Loan Details</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Gross Weight</p>
                        <p className="font-medium">{selectedLoan.goldLoanDetail.grossWeight}g</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Net Weight</p>
                        <p className="font-medium">{selectedLoan.goldLoanDetail.netWeight}g</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Gold Rate</p>
                        <p className="font-medium">₹{selectedLoan.goldLoanDetail.goldRate}/g</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Valuation</p>
                        <p className="font-medium">{formatCurrency(selectedLoan.goldLoanDetail.valuationAmount)}</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Karat</p>
                        <p className="font-medium">{selectedLoan.goldLoanDetail.karat}K</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">No. of Items</p>
                        <p className="font-medium">{selectedLoan.goldLoanDetail.numberOfItems || 'N/A'}</p>
                      </div>
                      {selectedLoan.goldLoanDetail.goldItemPhoto && (
                        <div className="p-3 bg-white rounded-lg col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Gold Item Photo</p>
                          <a href={selectedLoan.goldLoanDetail.goldItemPhoto} target="_blank" className="text-blue-600 text-sm flex items-center gap-1">
                            <ExternalLink className="h-4 w-4" /> View Photo
                          </a>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Vehicle Loan Details */}
              {selectedLoan.vehicleLoanDetail && (
                <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-gray-50 border-l-4 border-l-slate-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Car className="h-6 w-6 text-slate-600" />
                      <h4 className="font-semibold text-slate-800">Vehicle Loan Details</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Vehicle Type</p>
                        <p className="font-medium">{selectedLoan.vehicleLoanDetail.vehicleType}</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Vehicle Number</p>
                        <p className="font-medium">{selectedLoan.vehicleLoanDetail.vehicleNumber || 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Manufacturer</p>
                        <p className="font-medium">{selectedLoan.vehicleLoanDetail.manufacturer || 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Model</p>
                        <p className="font-medium">{selectedLoan.vehicleLoanDetail.model || 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Year</p>
                        <p className="font-medium">{selectedLoan.vehicleLoanDetail.yearOfManufacture || 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Valuation</p>
                        <p className="font-medium">{formatCurrency(selectedLoan.vehicleLoanDetail.valuationAmount)}</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Chassis No.</p>
                        <p className="font-medium text-xs">{selectedLoan.vehicleLoanDetail.chassisNumber || 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Engine No.</p>
                        <p className="font-medium text-xs">{selectedLoan.vehicleLoanDetail.engineNumber || 'N/A'}</p>
                      </div>
                      {selectedLoan.vehicleLoanDetail.rcBookPhoto && (
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">RC Book</p>
                          <a href={selectedLoan.vehicleLoanDetail.rcBookPhoto} target="_blank" className="text-blue-600 text-sm flex items-center gap-1">
                            <ExternalLink className="h-4 w-4" /> View
                          </a>
                        </div>
                      )}
                      {selectedLoan.vehicleLoanDetail.vehiclePhoto && (
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Vehicle Photo</p>
                          <a href={selectedLoan.vehicleLoanDetail.vehiclePhoto} target="_blank" className="text-blue-600 text-sm flex items-center gap-1">
                            <ExternalLink className="h-4 w-4" /> View
                          </a>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Loan Details Section */}
              <Card className="border-0 shadow-sm">
                <button 
                  onClick={() => toggleSection('loan')}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-emerald-600" />
                    Loan Details
                  </CardTitle>
                  {expandedSections.loan ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
                <AnimatePresence>
                  {expandedSections.loan && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="pt-0 border-t">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 py-4">
                          <div className="p-4 bg-gray-50 rounded-lg text-center">
                            <p className="text-xs text-gray-500 mb-1">Requested</p>
                            <p className="text-xl font-bold">{formatCurrency(selectedLoan.requestedAmount)}</p>
                            <p className="text-xs text-gray-400">{selectedLoan.requestedTenure} mo @ {selectedLoan.requestedInterestRate}%</p>
                          </div>
                          <div className="p-4 bg-emerald-50 rounded-lg text-center border-2 border-emerald-200">
                            <p className="text-xs text-emerald-600 mb-1">Approved</p>
                            <p className="text-xl font-bold text-emerald-700">{formatCurrency(selectedLoan.sessionForm?.approvedAmount || selectedLoan.requestedAmount)}</p>
                            <p className="text-xs text-emerald-500">{selectedLoan.sessionForm?.tenure} mo @ {selectedLoan.sessionForm?.interestRate}%</p>
                          </div>
                          <div className="p-4 bg-blue-50 rounded-lg text-center">
                            <p className="text-xs text-blue-600 mb-1">EMI Amount</p>
                            <p className="text-xl font-bold text-blue-700">{formatCurrency(selectedLoan.sessionForm?.emiAmount || 0)}</p>
                            <p className="text-xs text-blue-500">/month</p>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-lg text-center">
                            <p className="text-xs text-purple-600 mb-1">Interest Type</p>
                            <p className="text-lg font-bold text-purple-700">{selectedLoan.sessionForm?.interestType || 'FLAT'}</p>
                            <p className="text-xs text-purple-500">{selectedLoan.loanType}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t">
                          <div>
                            <p className="text-gray-500 text-sm">Purpose</p>
                            <p className="font-medium">{selectedLoan.purpose || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-sm">Processing Fee</p>
                            <p className="font-medium">{formatCurrency(selectedLoan.sessionForm?.processingFee || 0)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-sm">Application Date</p>
                            <p className="font-medium">{formatDate(selectedLoan.createdAt)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              <Separator className="my-4" />

              {/* Disbursement Form */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <Send className="h-5 w-5 text-green-600" />
                  Disbursement Details
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  {/* Disbursement Amount - Read Only */}
                  <div>
                    <Label>Disbursement Amount (₹)</Label>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-2xl font-bold text-green-700">
                        {formatCurrency(disbursementForm.disbursedAmount)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label>Select Payment Source (Bank/Cash) *</Label>
                    {mirrorLoanInfo?.isMirrorLoan ? (
                      <p className="text-xs text-purple-600 mb-2 font-medium">
                        Showing sources for: <span className="text-purple-700">{mirrorLoanInfo.mirrorCompanyName}</span>
                        <span className="text-gray-500 ml-1">(Mirror Company)</span>
                      </p>
                    ) : selectedLoan?.company ? (
                      <p className="text-xs text-muted-foreground mb-2">
                        Showing sources for: <span className="font-medium text-green-600">{selectedLoan.company.name}</span>
                      </p>
                    ) : null}
                    
                    {loadingPaymentSources ? (
                      <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                        <span className="text-sm text-gray-500">Loading payment sources...</span>
                      </div>
                    ) : disbursementForm.useSplitPayment ? (
                      /* When split is active, replace Select with stable static display */
                      <div className="flex items-center justify-between p-3 border-2 border-purple-400 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-purple-100 rounded-lg">
                            <Split className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-purple-800 text-sm">Split Payment Active</p>
                            <p className="text-xs text-purple-500">Bank + Cash distribution below</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs text-purple-700 border-purple-300 hover:bg-purple-100"
                          onClick={() => setDisbursementForm({
                            ...disbursementForm,
                            selectedBankAccountId: '',
                            useSplitPayment: false,
                            bankAmount: 0,
                            cashAmount: 0
                          })}
                        >
                          × Change Method
                        </Button>
                      </div>
                    ) : (
                      <Select 
                        value={disbursementForm.selectedBankAccountId} 
                        onValueChange={(v) => {
                          if (v === 'SPLIT_PAYMENT') {
                            // Enable split payment with default 50-50 split
                            const halfAmount = Math.floor(disbursementForm.disbursedAmount / 2);
                            setDisbursementForm({
                              ...disbursementForm, 
                              selectedBankAccountId: 'SPLIT_PAYMENT',
                              useSplitPayment: true,
                              bankAmount: halfAmount,
                              cashAmount: disbursementForm.disbursedAmount - halfAmount
                            });
                          } else {
                            // Regular selection - disable split if it was enabled
                            setDisbursementForm({
                              ...disbursementForm, 
                              selectedBankAccountId: v,
                              useSplitPayment: false,
                              bankAmount: 0,
                              cashAmount: 0
                            });
                          }
                        }}
                      >
                        <SelectTrigger className={disbursementForm.useSplitPayment ? "border-blue-400 bg-blue-50" : ""}>
                          <SelectValue placeholder={paymentSources.length === 0 ? "No payment sources available" : "Select payment source"} />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Bank Accounts Section */}
                          {paymentSources.filter(s => s.type === 'BANK').length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 flex items-center gap-1">
                                <Landmark className="h-3 w-3" /> BANK ACCOUNTS
                              </div>
                              {paymentSources.filter(s => s.type === 'BANK').map(source => (
                                <SelectItem key={source.id} value={source.id}>
                                  <div className="flex items-center gap-2">
                                    <Landmark className="h-4 w-4 text-blue-500" />
                                    <div className="flex flex-col">
                                      <span className="font-medium">{source.name}</span>
                                      <span className="text-xs text-gray-500">
                                        A/C: {source.accountNumber} | Bal: {formatCurrency(source.currentBalance)}
                                      </span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* Cash Book Section */}
                          {paymentSources.filter(s => s.type === 'CASH').length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 flex items-center gap-1 mt-1">
                                <Banknote className="h-3 w-3" /> CASH BOOK
                              </div>
                              {paymentSources.filter(s => s.type === 'CASH').map(source => (
                                <SelectItem key={source.id} value={source.id}>
                                  <div className="flex items-center gap-2">
                                    <Banknote className="h-4 w-4 text-green-500" />
                                    <div className="flex flex-col">
                                      <span className="font-medium">{source.displayName}</span>
                                      <span className="text-xs text-gray-500">
                                        Bal: {formatCurrency(source.currentBalance)}
                                      </span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </>
                          )}
                          
                          {/* Split Payment Option - Show when both Bank and Cash are available */}
                          {!isCompany3 && paymentSources.filter(s => s.type === 'BANK').length > 0 && paymentSources.filter(s => s.type === 'CASH').length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 flex items-center gap-1 mt-1">
                                <Split className="h-3 w-3" /> SPLIT PAYMENT
                              </div>
                              <SelectItem value="SPLIT_PAYMENT">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 bg-purple-100 rounded">
                                    <Split className="h-4 w-4 text-purple-600" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-purple-700">Bank + Cash Split</span>
                                    <span className="text-xs text-purple-500">Pay from both sources</span>
                                  </div>
                                </div>
                              </SelectItem>
                            </>
                          )}
                          
                          {paymentSources.length === 0 && (
                            <div className="p-2 text-sm text-muted-foreground">
                              No payment sources found for this company
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {paymentSources.length === 0 && !loadingPaymentSources && (
                      <p className="text-xs text-amber-600 mt-1">
                        Please add a bank account or cash book for {mirrorLoanInfo?.isMirrorLoan ? mirrorLoanInfo.mirrorCompanyName : selectedLoan?.company?.name || 'this company'} first.
                      </p>
                    )}
                    
                    {/* Warning when no payment source selected */}
                    {paymentSources.length > 0 && !disbursementForm.selectedBankAccountId && (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg mt-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm text-amber-700">
                          <strong>Required:</strong> Please select a payment source above to enable the Disburse button
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Split Payment UI - Show when SPLIT_PAYMENT is selected */}
                {disbursementForm.useSplitPayment && disbursementForm.selectedBankAccountId === 'SPLIT_PAYMENT' && (
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Split className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <Label className="font-bold text-purple-800 text-base">Split Payment Active</Label>
                        <p className="text-xs text-purple-500">Distribute amount between Bank and Cash</p>
                      </div>
                    </div>

                    {/* Balances Display */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-3 bg-white rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Landmark className="h-4 w-4 text-blue-500" />
                          <p className="text-xs text-gray-500">Bank Balance</p>
                        </div>
                        <p className="font-bold text-green-600 text-lg">
                          {formatCurrency(paymentSources.find(s => s.type === 'BANK')?.currentBalance || 0)}
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Banknote className="h-4 w-4 text-green-500" />
                          <p className="text-xs text-gray-500">Cash Balance</p>
                        </div>
                        <p className={`font-bold text-lg ${((paymentSources.find(s => s.type === 'CASH')?.currentBalance || 0) >= 0) ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(paymentSources.find(s => s.type === 'CASH')?.currentBalance || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Bank Account Selection for Split */}
                    <div className="mb-3">
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Select Bank Account</Label>
                      <Select
                        value={disbursementForm.splitBankAccountId || ''}
                        onValueChange={(v) => setDisbursementForm({...disbursementForm, splitBankAccountId: v})}
                      >
                        <SelectTrigger className="border-blue-200">
                          <SelectValue placeholder="Choose bank account for split" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentSources.filter(s => s.type === 'BANK').map(source => (
                            <SelectItem key={source.id} value={source.id}>
                              <div className="flex items-center gap-2">
                                <Landmark className="h-4 w-4 text-blue-500" />
                                <span>{source.name} - {source.accountNumber}</span>
                                <span className="text-xs text-gray-500">(Bal: {formatCurrency(source.currentBalance)})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Split Amount Inputs */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-3 bg-white rounded-lg border border-blue-200">
                        <Label className="text-sm font-medium text-blue-700 mb-2 block">Bank Amount (₹)</Label>
                        <Input
                          type="number"
                          value={disbursementForm.bankAmount || 0}
                          onChange={(e) => {
                            const bankAmt = parseFloat(e.target.value) || 0;
                            const total = disbursementForm.disbursedAmount;
                            setDisbursementForm({
                              ...disbursementForm,
                              bankAmount: bankAmt,
                              cashAmount: total - bankAmt
                            });
                          }}
                          className="border-blue-200"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Available: {formatCurrency(paymentSources.find(s => s.type === 'BANK' && s.id === disbursementForm.splitBankAccountId)?.currentBalance || paymentSources.find(s => s.type === 'BANK')?.currentBalance || 0)}
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-green-200">
                        <Label className="text-sm font-medium text-green-700 mb-2 block">Cash Amount (₹)</Label>
                        <Input
                          type="number"
                          value={disbursementForm.cashAmount || 0}
                          onChange={(e) => {
                            const cashAmt = parseFloat(e.target.value) || 0;
                            const total = disbursementForm.disbursedAmount;
                            setDisbursementForm({
                              ...disbursementForm,
                              cashAmount: cashAmt,
                              bankAmount: total - cashAmt
                            });
                          }}
                          className="border-green-200"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Available: {formatCurrency(paymentSources.find(s => s.type === 'CASH')?.currentBalance || 0)}
                        </p>
                      </div>
                    </div>

                    {/* Confirm Split Button */}
                    {(() => {
                      const total = (disbursementForm.bankAmount || 0) + (disbursementForm.cashAmount || 0);
                      const bankBal = paymentSources.find(s => s.type === 'BANK' && s.id === disbursementForm.splitBankAccountId)?.currentBalance || paymentSources.find(s => s.type === 'BANK')?.currentBalance || 0;
                      const cashBal = paymentSources.find(s => s.type === 'CASH')?.currentBalance || 0;
                      const isValid = total === disbursementForm.disbursedAmount && (disbursementForm.bankAmount || 0) <= bankBal;

                      if (total !== disbursementForm.disbursedAmount) {
                        return (
                          <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-700 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Bank + Cash (₹{total.toLocaleString()}) must equal ₹{disbursementForm.disbursedAmount.toLocaleString()}
                          </div>
                        );
                      }
                      if ((disbursementForm.bankAmount || 0) > bankBal) {
                        return (
                          <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Bank amount exceeds balance ({formatCurrency(bankBal)})
                          </div>
                        );
                      }
                      return (
                        <div className="p-3 bg-green-50 border border-green-300 rounded-lg text-sm text-green-700 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-green-500 text-lg">✓</span>
                            Split: Bank {formatCurrency(disbursementForm.bankAmount || 0)} + Cash {formatCurrency(disbursementForm.cashAmount || 0)} = {formatCurrency(total)}
                          </div>
                          <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full font-semibold">Done ✓</span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Selected Payment Source Balance Warning */}
                {disbursementForm.selectedBankAccountId && !disbursementForm.useSplitPayment && (() => {
                  const selectedSource = paymentSources.find(s => s.id === disbursementForm.selectedBankAccountId);
                  if (selectedSource && selectedSource.currentBalance < disbursementForm.disbursedAmount) {
                    return (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-700">Insufficient Balance</p>
                          <p className="text-sm text-red-600">
                            Selected {selectedSource.type === 'CASH' ? 'Cash Book' : 'Bank Account'} has only {formatCurrency(selectedSource.currentBalance)}. 
                            You need {formatCurrency(disbursementForm.disbursedAmount - selectedSource.currentBalance)} more.
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Selected Payment Source Balance Display - Only show for non-split payments */}
                {disbursementForm.selectedBankAccountId && !disbursementForm.useSplitPayment && (() => {
                  const selectedSource = paymentSources.find(s => s.id === disbursementForm.selectedBankAccountId);
                  if (selectedSource && selectedSource.currentBalance >= disbursementForm.disbursedAmount) {
                    return (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {selectedSource.type === 'CASH' ? (
                            <Banknote className="h-5 w-5 text-green-600" />
                          ) : (
                            <Landmark className="h-5 w-5 text-green-600" />
                          )}
                          <div>
                            <p className="font-medium text-green-700">{selectedSource.displayName}</p>
                            <p className="text-sm text-green-600">Current Balance: {formatCurrency(selectedSource.currentBalance)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-green-600">After Disbursement</p>
                          <p className="font-bold text-green-700">{formatCurrency(selectedSource.currentBalance - disbursementForm.disbursedAmount)}</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Charges Amount - Added to cashier's personal credit only */}
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <IndianRupee className="h-4 w-4 text-orange-600" />
                    <Label className="font-semibold text-orange-800">Charges Amount (₹)</Label>
                    <span className="text-xs text-orange-500 ml-1">→ Your Personal Credit</span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={disbursementForm.chargesAmount || ''}
                    onChange={(e) => setDisbursementForm({ ...disbursementForm, chargesAmount: parseFloat(e.target.value) || 0 })}
                    className="border-orange-200"
                  />
                  <p className="text-xs text-orange-600 mt-1">
                    If you enter a charges amount, it will be credited to <strong>your personal account only</strong>. No accounting entry is created.
                  </p>
                </div>

                <div>
                  <Label>Remarks</Label>
                  <Textarea 
                    value={disbursementForm.remarks} 
                    onChange={(e) => setDisbursementForm({...disbursementForm, remarks: e.target.value})} 
                    placeholder="Any additional notes..."
                    rows={2}
                  />
                </div>


                {/* Agreement Checkbox */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="agreement-signed"
                      checked={disbursementForm.agreementSigned}
                      onCheckedChange={(checked) => setDisbursementForm({...disbursementForm, agreementSigned: checked as boolean})}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label htmlFor="agreement-signed" className="font-medium text-amber-800 cursor-pointer">
                        ✓ I confirm that the loan agreement form has been signed
                      </label>
                      <p className="text-sm text-amber-600 mt-1">
                        The customer has signed all necessary loan documents and agreement forms before disbursement.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Extra EMI Payment Page Selection - COMPULSORY for Mirror Loans */}
                {mirrorLoanInfo?.isMirrorLoan && (
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <CreditCard className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-purple-800">Extra EMI Payment Page Selection</h4>
                        <p className="text-sm text-purple-600 mt-1">
                          <strong>REQUIRED:</strong> This is a Mirror Loan with <strong>{mirrorLoanInfo.extraEMICount || 'N/A'} Extra EMI(s)</strong>.
                          Select a Secondary Payment Page to receive these Extra EMI payments.
                        </p>
                      </div>
                    </div>

                    {/* Extra EMI Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4 p-3 bg-white/70 rounded-lg">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Original Tenure</p>
                        <p className="font-bold text-gray-800">{mirrorLoanInfo.originalTenure || selectedLoan.sessionForm?.tenure} EMIs</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Mirror Tenure</p>
                        <p className="font-bold text-purple-700">{mirrorLoanInfo.mirrorTenure || '?'} EMIs</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Extra EMIs</p>
                        <p className="font-bold text-green-600">{mirrorLoanInfo.extraEMICount || '?'} EMIs</p>
                      </div>
                    </div>

                    {/* Payment Page Selection */}
                    <div className="space-y-2">
                      <Label className="text-purple-700 font-medium">
                        Select Payment Page for Extra EMIs *
                      </Label>
                      {loadingPaymentPages ? (
                        <div className="flex items-center gap-2 p-3 bg-white rounded-lg">
                          <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                          <span className="text-sm text-gray-500">Loading payment pages...</span>
                        </div>
                      ) : secondaryPaymentPages.length === 0 ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-2 text-amber-700 mb-2">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">No Secondary Payment Pages Available</span>
                          </div>
                          <p className="text-sm text-amber-600">
                            Please create a Secondary Payment Page first before disbursing this Mirror Loan.
                            Go to <strong>Secondary Payment Pages</strong> tab to create one.
                          </p>
                        </div>
                      ) : (
                        <Select 
                          value={disbursementForm.extraEMIPaymentPageId || ''} 
                          onValueChange={(v) => setDisbursementForm({...disbursementForm, extraEMIPaymentPageId: v})}
                        >
                          <SelectTrigger className="border-purple-300 bg-white">
                            <SelectValue placeholder="Select a payment page for Extra EMIs" />
                          </SelectTrigger>
                          <SelectContent>
                            {secondaryPaymentPages.map((page) => (
                              <SelectItem key={page.id} value={page.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{page.name}</span>
                                  <span className="text-xs text-gray-500">
                                    {page.upiId && `UPI: ${page.upiId}`}
                                    {page.bankName && ` | Bank: ${page.bankName}`}
                                    {page.role && ` | Role: ${page.role.name}`}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {/* Selected Payment Page Preview */}
                      {disbursementForm.extraEMIPaymentPageId && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-medium text-green-800 mb-2">✓ Selected Payment Page:</p>
                          {(() => {
                            const selectedPage = secondaryPaymentPages.find(p => p.id === disbursementForm.extraEMIPaymentPageId);
                            if (!selectedPage) return null;
                            return (
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-500">Name:</span>
                                  <span className="font-medium ml-1">{selectedPage.name}</span>
                                </div>
                                {selectedPage.upiId && (
                                  <div>
                                    <span className="text-gray-500">UPI:</span>
                                    <span className="font-medium ml-1">{selectedPage.upiId}</span>
                                  </div>
                                )}
                                {selectedPage.bankName && (
                                  <div>
                                    <span className="text-gray-500">Bank:</span>
                                    <span className="font-medium ml-1">{selectedPage.bankName}</span>
                                  </div>
                                )}
                                {selectedPage.role && (
                                  <div>
                                    <span className="text-gray-500">Credit To:</span>
                                    <span className="font-medium ml-1 text-purple-600">{selectedPage.role.name}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          <p className="text-xs text-green-600 mt-2">
                            <PlusCircle className="h-3 w-3 inline mr-1" />
                            Extra EMI payments will credit to the selected role&apos;s personal credit
                          </p>
                        </div>
                      )}

                      {/* Warning if not selected */}
                      {!disbursementForm.extraEMIPaymentPageId && secondaryPaymentPages.length > 0 && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                          <p className="text-sm text-red-600">
                            <strong>Required:</strong> Please select a payment page for Extra EMIs to proceed with disbursement.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Warning for limit */}
                {disbursementForm.disbursedAmount > remainingLimit && (
                  <div className="p-3 bg-red-50 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Amount exceeds your daily limit of {formatCurrency(dailyLimit)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="p-5 border-t flex-shrink-0 flex-col gap-2">
          {/* Show missing requirements warning */}
          {(!disbursementForm.selectedBankAccountId || !disbursementForm.agreementSigned || (mirrorLoanInfo?.isMirrorLoan && !disbursementForm.extraEMIPaymentPageId)) && (
            <div className="w-full p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">
                {!disbursementForm.selectedBankAccountId ? "⚠️ Please select a Payment Source. " : ""}
                {!disbursementForm.agreementSigned ? "⚠️ Please confirm the Agreement is signed. " : ""}
                {mirrorLoanInfo?.isMirrorLoan && !disbursementForm.extraEMIPaymentPageId ? "⚠️ Please select Extra EMI Payment Page." : ""}
              </span>
            </div>
          )}
          <div className="flex gap-2 justify-end w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            {selectedLoan?.status === 'FINAL_APPROVED' && (
              <Button 
                variant="outline" 
                className="border-amber-500 text-amber-600 hover:bg-amber-50"
                onClick={onSendBack}
                disabled={saving}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Send Back
              </Button>
            )}
            <Button 
              className="bg-green-500 hover:bg-green-600" 
              onClick={onDisburse}
              disabled={saving || !disbursementForm.agreementSigned || !disbursementForm.selectedBankAccountId || (mirrorLoanInfo?.isMirrorLoan && !disbursementForm.extraEMIPaymentPageId)}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirm Disbursement
                </>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
    </>
  );
}
