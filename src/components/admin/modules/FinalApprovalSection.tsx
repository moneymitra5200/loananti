'use client';

import { useState, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Eye, Send, Wallet, User, 
  ChevronDown, ChevronUp, Loader2, Building2, Landmark,
  X, ArrowLeft
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Loan {
  id: string; applicationNo: string; status: string; requestedAmount: number; loanType: string;
  createdAt: string; riskScore: number; fraudFlag: boolean; purpose: string;
  customer: { id: string; name: string; email: string; phone: string; };
  sessionForm?: any; loanForm?: any; company?: any; companyId?: string;
  requestedTenure?: number; requestedInterestRate?: number;
  firstName?: string; lastName?: string; middleName?: string;
  phone?: string; address?: string; city?: string; state?: string; pincode?: string;
  panNumber?: string; aadhaarNumber?: string; dateOfBirth?: string;
  employmentType?: string; employerName?: string; monthlyIncome?: number;
  bankAccountNumber?: string; bankIfsc?: string; bankName?: string;
  bankBranch?: string; accountHolderName?: string;
  panCardDoc?: string; aadhaarFrontDoc?: string; aadhaarBackDoc?: string;
  incomeProofDoc?: string; addressProofDoc?: string; photoDoc?: string;
  bankStatementDoc?: string; salarySlipDoc?: string; electionCardDoc?: string;
  housePhotoDoc?: string; otherDocs?: string;
  reference1Name?: string; reference1Phone?: string; reference1Relation?: string; reference1Address?: string;
  reference2Name?: string; reference2Phone?: string; reference2Relation?: string; reference2Address?: string;
  fatherName?: string; motherName?: string; gender?: string; maritalStatus?: string;
  employerAddress?: string; designation?: string; yearsInEmployment?: number;
  annualIncome?: number; otherIncome?: number; incomeSource?: string;
  goldLoanDetail?: any; vehicleLoanDetail?: any;
}

interface Props {
  loans: Loan[];
  onRefresh: () => void;
  userId?: string;
}

const getStatusBadge = (status: string) => {
  const config: Record<string, { className: string; label: string }> = {
    FINAL_APPROVED: { className: 'bg-green-100 text-green-700', label: 'Final Approved' },
  };
  const c = config[status] || { className: 'bg-gray-100 text-gray-700', label: status };
  return <Badge className={c.className}>{c.label}</Badge>;
};

const formatCurrencyLocal = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

function FinalApprovalSection({ loans, onRefresh, userId }: Props) {
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    customer: true, loan: true, documents: false, references: false
  });
  
  const finalLoans = loans.filter(l => l.status === 'FINAL_APPROVED');

  const openLoanSheet = async (loan: Loan) => {
    setLoading(true);
    setRemarks('');
    
    try {
      const response = await fetch(`/api/loan/details?loanId=${loan.id}`);
      const data = await response.json();
      if (data.success) {
        setSelectedLoan({ ...loan, ...data.loan });
      } else {
        setSelectedLoan(loan);
      }
    } catch {
      setSelectedLoan(loan);
    } finally {
      setLoading(false);
      setShowSheet(true);
    }
  };

  const handleSendBack = async () => {
    if (!selectedLoan) return;
    setSaving(true);
    
    try {
      const response = await fetch('/api/workflow/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId: selectedLoan.id,
          action: 'send_back',
          role: 'SUPER_ADMIN',
          remarks
        })
      });
      
      if (response.ok) {
        toast({ title: 'Success', description: 'Loan sent back for review' });
        setShowSheet(false);
        onRefresh();
      } else {
        const data = await response.json();
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Action failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section as keyof typeof prev] }));
  };

  return (
    <>
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-green-600" />
            Final Approvals
          </CardTitle>
          <CardDescription>Loans ready for disbursement by Cashier</CardDescription>
        </CardHeader>
        <CardContent>
          {finalLoans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Eye className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p>No loans pending final approval</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {finalLoans.map((loan, index) => (
                <motion.div key={loan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }}
                  className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all bg-white">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 bg-gradient-to-br from-green-400 to-emerald-500">
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
                        {loan.company && <p className="text-xs text-blue-600">Company: {loan.company.name}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900">{formatCurrencyLocal(loan.sessionForm?.approvedAmount || loan.requestedAmount)}</p>
                        <p className="text-xs text-gray-500">{loan.sessionForm?.tenure} mo @ {loan.sessionForm?.interestRate}%</p>
                      </div>
                      <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => openLoanSheet(loan)}>
                        <Eye className="h-4 w-4 mr-1" /> View Details
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Right Side Sheet */}
      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col" side="right">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 flex-shrink-0">
            <SheetHeader>
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle className="text-xl flex items-center gap-2 text-white">
                    <Eye className="h-6 w-6" /> Approve Application
                  </SheetTitle>
                  <SheetDescription className="text-green-100 mt-1">
                    {selectedLoan?.applicationNo} - {selectedLoan?.customer?.name}
                  </SheetDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowSheet(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {selectedLoan?.company && (
                <div className="mt-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm bg-white/20 px-2 py-0.5 rounded">{selectedLoan.company.name}</span>
                </div>
              )}
            </SheetHeader>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              </div>
            ) : selectedLoan && (
              <div className="p-6 space-y-4">
                {/* Company Info */}
                {selectedLoan?.company && (
                  <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-6 w-6 text-blue-600" />
                        <div>
                          <p className="text-xs text-blue-600 font-medium">LOAN FROM COMPANY</p>
                          <h3 className="text-lg font-bold text-blue-800">{selectedLoan.company.name}</h3>
                        </div>
                        <Badge className="ml-auto bg-blue-500">{selectedLoan.company.code || 'N/A'}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Customer Info */}
                <Card className="border-0 shadow-sm">
                  <button onClick={() => toggleSection('customer')} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 rounded-t-lg">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" /> Customer Information
                    </CardTitle>
                    {expandedSections.customer ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  <AnimatePresence>
                    {expandedSections.customer && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <CardContent className="pt-0 border-t">
                          <div className="flex items-start gap-4 py-4 border-b">
                            <div className="relative">
                              {selectedLoan.photoDoc ? (
                                <img src={selectedLoan.photoDoc} alt="Customer" className="h-16 w-16 rounded-full object-cover border-2 border-blue-200" />
                              ) : (
                                <Avatar className="h-16 w-16 bg-gradient-to-br from-blue-400 to-indigo-500">
                                  <AvatarFallback className="bg-transparent text-white text-xl">{selectedLoan.customer?.name?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-3 text-sm">
                              <div><p className="text-xs text-gray-500">Full Name</p><p className="font-semibold">{selectedLoan.customer?.name}</p></div>
                              <div><p className="text-xs text-gray-500">Father&apos;s Name</p><p className="font-medium">{selectedLoan.fatherName || 'N/A'}</p></div>
                              <div><p className="text-xs text-gray-500">Email</p><p className="font-medium">{selectedLoan.customer?.email}</p></div>
                              <div><p className="text-xs text-gray-500">Phone</p><p className="font-medium">{selectedLoan.customer?.phone || selectedLoan.phone}</p></div>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-3 py-4 text-sm">
                            <div className="p-2 bg-gray-50 rounded"><p className="text-xs text-gray-500">PAN</p><p className="font-medium">{selectedLoan.panNumber || 'N/A'}</p></div>
                            <div className="p-2 bg-gray-50 rounded"><p className="text-xs text-gray-500">Aadhaar</p><p className="font-medium">{selectedLoan.aadhaarNumber ? `XXXX-XXXX-${selectedLoan.aadhaarNumber.slice(-4)}` : 'N/A'}</p></div>
                            <div className="p-2 bg-gray-50 rounded"><p className="text-xs text-gray-500">DOB</p><p className="font-medium">{selectedLoan.dateOfBirth ? formatDate(selectedLoan.dateOfBirth) : 'N/A'}</p></div>
                            <div className="p-2 bg-gray-50 rounded"><p className="text-xs text-gray-500">Gender</p><p className="font-medium">{selectedLoan.gender || 'N/A'}</p></div>
                          </div>
                          <div className="grid grid-cols-4 gap-3 py-2 text-sm border-t">
                            <div className="p-2 bg-purple-50 rounded"><p className="text-xs text-gray-500">Bank Name</p><p className="font-medium">{selectedLoan.bankName || 'N/A'}</p></div>
                            <div className="p-2 bg-purple-50 rounded"><p className="text-xs text-gray-500">Account No.</p><p className="font-medium">{selectedLoan.bankAccountNumber || 'N/A'}</p></div>
                            <div className="p-2 bg-purple-50 rounded"><p className="text-xs text-gray-500">IFSC</p><p className="font-medium">{selectedLoan.bankIfsc || 'N/A'}</p></div>
                            <div className="p-2 bg-purple-50 rounded"><p className="text-xs text-gray-500">Account Holder</p><p className="font-medium">{selectedLoan.accountHolderName || selectedLoan.customer?.name || 'N/A'}</p></div>
                          </div>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>

                {/* Loan Details */}
                <Card className="border-0 shadow-sm">
                  <button onClick={() => toggleSection('loan')} className="w-full p-4 flex items-center justify-between hover:bg-gray-50">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-emerald-600" /> Loan Details
                    </CardTitle>
                    {expandedSections.loan ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  <AnimatePresence>
                    {expandedSections.loan && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <CardContent className="pt-0 border-t">
                          <div className="grid grid-cols-4 gap-4 py-4">
                            <div className="p-4 bg-gray-50 rounded-lg text-center">
                              <p className="text-xs text-gray-500 mb-1">Requested</p>
                              <p className="text-xl font-bold">{formatCurrencyLocal(selectedLoan.requestedAmount)}</p>
                              <p className="text-xs text-gray-400">{selectedLoan.requestedTenure} mo @ {selectedLoan.requestedInterestRate}%</p>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-lg text-center border-2 border-emerald-200">
                              <p className="text-xs text-emerald-600 mb-1">Approved</p>
                              <p className="text-xl font-bold text-emerald-700">{formatCurrencyLocal(selectedLoan.sessionForm?.approvedAmount || selectedLoan.requestedAmount)}</p>
                              <p className="text-xs text-emerald-500">{selectedLoan.sessionForm?.tenure} mo @ {selectedLoan.sessionForm?.interestRate}%</p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg text-center">
                              <p className="text-xs text-blue-600 mb-1">EMI</p>
                              <p className="text-xl font-bold text-blue-700">{formatCurrencyLocal(selectedLoan.sessionForm?.emiAmount || 0)}</p>
                              <p className="text-xs text-blue-500">/month</p>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-lg text-center">
                              <p className="text-xs text-purple-600 mb-1">Total Interest</p>
                              <p className="text-xl font-bold text-purple-700">{formatCurrencyLocal(selectedLoan.sessionForm?.totalInterest || 0)}</p>
                              <p className="text-xs text-purple-500">Total: {formatCurrencyLocal(selectedLoan.sessionForm?.totalAmount || 0)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>

                <Separator />

                {/* Remarks */}
                <div className="space-y-2">
                  <Label>Remarks (Optional)</Label>
                  <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add any remarks for send back..." rows={2} />
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50 flex-shrink-0 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              This loan is <span className="font-semibold text-green-600">approved</span> and ready for Cashier disbursement.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSheet(false)}>
                Close
              </Button>
              <Button className="bg-amber-500 hover:bg-amber-600" onClick={handleSendBack} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowLeft className="h-4 w-4 mr-2" />} 
                Send Back
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default memo(FinalApprovalSection);
