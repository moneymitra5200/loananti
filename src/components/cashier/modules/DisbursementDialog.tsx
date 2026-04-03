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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, Loader2, User, Building2, ArrowRight, AlertCircle, Landmark, AlertTriangle,
  ChevronDown, ChevronUp, FileImage, ExternalLink, Car, Gem, Home, IdCard, FileText,
  IndianRupee, Wallet, Users2, Briefcase, ArrowLeft, RefreshCw, DollarSign, CreditCard,
  PlusCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import type { Loan, BankAccount, MirrorLoanInfo, DisbursementForm, ExpandedSections, SecondaryPaymentPage } from '../tabs/types';

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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'disburse' | 'send_back'>('disburse');
  const [secondaryPaymentPages, setSecondaryPaymentPages] = useState<SecondaryPaymentPage[]>([]);
  const [loadingPaymentPages, setLoadingPaymentPages] = useState(false);

  // Fetch secondary payment pages when dialog opens for a mirror loan
  useEffect(() => {
    if (open && mirrorLoanInfo?.isMirrorLoan) {
      fetchSecondaryPaymentPages();
    }
  }, [open, mirrorLoanInfo?.isMirrorLoan]);

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

  const handleConfirmAction = () => {
    if (confirmAction === 'disburse') {
      onDisburse();
    } else {
      onSendBack();
    }
    setShowConfirmDialog(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 gap-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 text-white">
              <Send className="h-6 w-6" /> Disburse Loan - Complete Details
            </DialogTitle>
            <DialogDescription className="text-green-100">
              {selectedLoan?.applicationNo} - {selectedLoan?.customer?.name}
              {selectedLoan?.company && <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-sm">Company: {selectedLoan.company.name}</span>}
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[calc(95vh-200px)]">
          {selectedLoan && (
            <div className="p-6 space-y-4">
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
                    <div className="grid grid-cols-3 gap-4 text-sm bg-white/50 p-3 rounded-lg mt-3">
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
                      <div className="grid grid-cols-3 gap-4 text-sm bg-white/50 p-3 rounded-lg">
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
                      <div className="grid grid-cols-3 gap-4 text-sm bg-white/50 p-3 rounded-lg">
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
                          <div className="grid grid-cols-4 gap-4 text-sm">
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
                          <div className="grid grid-cols-4 gap-4 text-sm">
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
                          <div className="grid grid-cols-4 gap-4 text-sm">
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
                        <div className="grid grid-cols-4 gap-3 py-4">
                          {[
                            { label: 'Photo', value: selectedLoan.photoDoc, icon: User },
                            { label: 'PAN Card', value: selectedLoan.panCardDoc, icon: IdCard },
                            { label: 'Aadhaar Front', value: selectedLoan.aadhaarFrontDoc, icon: IdCard },
                            { label: 'Aadhaar Back', value: selectedLoan.aadhaarBackDoc, icon: IdCard },
                            { label: 'Income Proof', value: selectedLoan.incomeProofDoc, icon: FileText },
                            { label: 'Address Proof', value: selectedLoan.addressProofDoc, icon: Home },
                            { label: 'Bank Statement', value: selectedLoan.bankStatementDoc, icon: Landmark },
                            { label: 'Salary Slip', value: selectedLoan.salarySlipDoc, icon: IndianRupee },
                            { label: 'Election Card', value: selectedLoan.electionCardDoc, icon: IdCard },
                            { label: 'House Photo', value: selectedLoan.housePhotoDoc, icon: Home },
                            { label: 'Other Docs', value: selectedLoan.otherDocs, icon: FileText },
                          ].filter(d => d.value).map((doc, i) => (
                            <a key={i} href={doc.value} target="_blank" rel="noopener noreferrer" 
                              className="p-3 bg-purple-50 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors flex flex-col items-center gap-2">
                              <doc.icon className="h-6 w-6 text-purple-600" />
                              <span className="text-xs font-medium text-purple-700">{doc.label}</span>
                              <ExternalLink className="h-3 w-3 text-purple-400" />
                            </a>
                          ))}
                          {![selectedLoan.photoDoc, selectedLoan.panCardDoc, selectedLoan.aadhaarFrontDoc, selectedLoan.aadhaarBackDoc, 
                             selectedLoan.incomeProofDoc, selectedLoan.addressProofDoc, selectedLoan.bankStatementDoc, 
                             selectedLoan.salarySlipDoc, selectedLoan.electionCardDoc, selectedLoan.housePhotoDoc, selectedLoan.otherDocs].some(Boolean) && (
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
                    <div className="grid grid-cols-4 gap-4 text-sm">
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
                    <div className="grid grid-cols-4 gap-4 text-sm">
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
                        <div className="grid grid-cols-4 gap-4 py-4">
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
                        <div className="grid grid-cols-4 gap-4 py-4 border-t">
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
                  <div>
                    <Label>Disbursement Amount (₹) *</Label>
                    <Input 
                      type="number" 
                      value={disbursementForm.disbursedAmount} 
                      onChange={(e) => setDisbursementForm({...disbursementForm, disbursedAmount: parseFloat(e.target.value) || 0})} 
                    />
                  </div>
                  <div>
                    <Label>Disbursement Mode *</Label>
                    <Select value={disbursementForm.disbursementMode} onValueChange={(v) => setDisbursementForm({...disbursementForm, disbursementMode: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Transaction Reference *</Label>
                    <Input 
                      value={disbursementForm.disbursementRef} 
                      onChange={(e) => setDisbursementForm({...disbursementForm, disbursementRef: e.target.value})} 
                      placeholder="UTR/Transaction ID"
                    />
                  </div>
                  <div>
                    <Label>Select Bank Account for Disbursement *</Label>
                    {mirrorLoanInfo?.isMirrorLoan ? (
                      <p className="text-xs text-purple-600 mb-2 font-medium">
                        Showing bank accounts for: <span className="text-purple-700">{mirrorLoanInfo.mirrorCompanyName}</span>
                        <span className="text-gray-500 ml-1">(Mirror Company)</span>
                      </p>
                    ) : selectedLoan?.company ? (
                      <p className="text-xs text-muted-foreground mb-2">
                        Showing bank accounts for: <span className="font-medium text-green-600">{selectedLoan.company.name}</span>
                      </p>
                    ) : null}
                    <Select 
                      value={disbursementForm.selectedBankAccountId} 
                      onValueChange={(v) => setDisbursementForm({...disbursementForm, selectedBankAccountId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={bankAccounts.length === 0 ? "No bank accounts available" : "Select bank account"} />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            No bank accounts found for this company
                          </div>
                        ) : (
                          bankAccounts.map(account => (
                            <SelectItem key={account.id} value={account.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{account.bankName}</span>
                                <span className="text-xs text-gray-500">
                                  A/C: {account.accountNumber} | Bal: {formatCurrency(account.currentBalance)}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {bankAccounts.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        Please add a bank account for {mirrorLoanInfo?.isMirrorLoan ? mirrorLoanInfo.mirrorCompanyName : selectedLoan?.company?.name || 'this company'} first.
                      </p>
                    )}
                  </div>
                </div>

                {/* Bank Balance Warning */}
                {disbursementForm.selectedBankAccountId && (() => {
                  const selectedBank = bankAccounts.find(a => a.id === disbursementForm.selectedBankAccountId);
                  if (selectedBank && selectedBank.currentBalance < disbursementForm.disbursedAmount) {
                    return (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-700">Insufficient Bank Balance</p>
                          <p className="text-sm text-red-600">
                            Selected bank account has only {formatCurrency(selectedBank.currentBalance)}. 
                            You need {formatCurrency(disbursementForm.disbursedAmount - selectedBank.currentBalance)} more.
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Selected Bank Balance Display */}
                {disbursementForm.selectedBankAccountId && (() => {
                  const selectedBank = bankAccounts.find(a => a.id === disbursementForm.selectedBankAccountId);
                  if (selectedBank && selectedBank.currentBalance >= disbursementForm.disbursedAmount) {
                    return (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Landmark className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium text-green-700">{selectedBank.bankName}</p>
                            <p className="text-sm text-green-600">Current Balance: {formatCurrency(selectedBank.currentBalance)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-green-600">After Disbursement</p>
                          <p className="font-bold text-green-700">{formatCurrency(selectedBank.currentBalance - disbursementForm.disbursedAmount)}</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

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
                    <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-white/70 rounded-lg">
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
        </ScrollArea>

        <DialogFooter className="p-6 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {/* Send Back button for FINAL_APPROVED loans */}
          {selectedLoan?.status === 'FINAL_APPROVED' && (
            <Button 
              variant="outline" 
              className="border-amber-500 text-amber-600 hover:bg-amber-50"
              onClick={() => {
                setConfirmAction('send_back');
                setShowConfirmDialog(true);
              }}
              disabled={saving}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Send Back
            </Button>
          )}
          <Button 
            className="bg-green-500 hover:bg-green-600" 
            onClick={() => {
              setConfirmAction('disburse');
              setShowConfirmDialog(true);
            }}
            disabled={saving || !disbursementForm.agreementSigned || (mirrorLoanInfo?.isMirrorLoan && !disbursementForm.extraEMIPaymentPageId)}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Confirmation Dialog */}
    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${confirmAction === 'disburse' ? 'bg-green-100' : 'bg-amber-100'}`}>
              {confirmAction === 'disburse' 
                ? <DollarSign className="h-6 w-6 text-green-600" />
                : <ArrowLeft className="h-6 w-6 text-amber-600" />
              }
            </div>
            <AlertDialogTitle>
              {confirmAction === 'disburse' ? 'Confirm Disbursement' : 'Confirm Send Back'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {confirmAction === 'disburse' 
              ? `Are you sure you want to DISBURSE ₹${disbursementForm.disbursedAmount?.toLocaleString() || '0'} for loan ${selectedLoan?.applicationNo}? This will transfer money to the customer's account.`
              : `Are you sure you want to SEND BACK loan ${selectedLoan?.applicationNo}? It will return to the previous stage for review.`
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirmAction();
            }}
            disabled={saving}
            className={confirmAction === 'disburse' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Yes, ${confirmAction === 'disburse' ? 'Disburse' : 'Send Back'}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
