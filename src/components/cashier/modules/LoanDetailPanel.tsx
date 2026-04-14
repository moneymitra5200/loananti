'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { XCircle, Loader2, Percent, History, Calendar, DollarSign, FileText, Eye } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import { openDoc } from '@/utils/openDoc';

interface InterestPayment {
  id: string;
  amount: number;
  paymentMode: string;
  receiptNumber: string;
  createdAt: string;
  remarks: string | null;
}

interface LoanDetailPanelProps {
  loanId: string;
  open: boolean;
  onClose: () => void;
  onEMIPaid?: () => void;
}

export default function LoanDetailPanel({ loanId, open, onClose, onEMIPaid }: LoanDetailPanelProps) {
  const [loan, setLoan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [interestPayments, setInterestPayments] = useState<InterestPayment[]>([]);
  const [loadingInterestPayments, setLoadingInterestPayments] = useState(false);

  useEffect(() => {
    if (loanId && open) {
      fetchLoanDetails();
    }
  }, [loanId, open]);

  const fetchLoanDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/loan/details?loanId=${loanId}`);
      const data = await response.json();
      if (data.success) {
        setLoan(data.loan);
        
        // If this is an interest-only loan, fetch interest payment history
        if (data.loan?.isInterestOnlyLoan) {
          fetchInterestPaymentHistory();
        }
      }
    } catch (error) {
      console.error('Error fetching loan details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInterestPaymentHistory = async () => {
    setLoadingInterestPayments(true);
    try {
      const response = await fetch(`/api/loan/interest-payment?loanId=${loanId}`);
      const data = await response.json();
      if (data.success) {
        setInterestPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching interest payment history:', error);
    } finally {
      setLoadingInterestPayments(false);
    }
  };

  if (!open) return null;

  const principal = loan?.sessionForm?.approvedAmount || loan?.requestedAmount;
  const interestRate = loan?.sessionForm?.interestRate || loan?.interestRate || 12;
  const monthlyInterest = (principal * interestRate / 100) / 12;

  return (
    <AnimatePresence>
      {/* Backdrop Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <motion.div
        key={loanId || 'cashier-loan-panel'}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-white shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div>
            <h2 className="font-bold text-lg">Loan Details</h2>
            <p className="text-sm text-white/80">{loan?.applicationNo || loanId}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <XCircle className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : loan ? (
            <div className="p-4 space-y-4">
              {/* Customer Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Customer</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{loan.customer?.name}</p>
                  <p className="text-sm text-gray-500">{loan.customer?.email}</p>
                  <p className="text-sm text-gray-500">{loan.customer?.phone}</p>
                </CardContent>
              </Card>

              {/* Loan Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    Loan Details
                    {loan.status === 'ACTIVE_INTEREST_ONLY' && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs">
                        <Percent className="h-3 w-3 mr-1" />
                        Interest Only Phase
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Amount</p>
                      <p className="font-semibold">{formatCurrency(loan.sessionForm?.approvedAmount || loan.requestedAmount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">EMI</p>
                      <p className="font-semibold">{formatCurrency(loan.sessionForm?.emiAmount)}/mo</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Interest</p>
                      <p className="font-semibold">{loan.sessionForm?.interestRate}%</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Tenure</p>
                      <p className="font-semibold">{loan.sessionForm?.tenure} months</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Documents */}
              {(() => {
                const docs = [
                  { label: 'PAN Card',       url: loan.panCardDoc },
                  { label: 'Aadhaar Front',  url: loan.aadhaarFrontDoc },
                  { label: 'Aadhaar Back',   url: loan.aadhaarBackDoc },
                  { label: 'Income Proof',   url: loan.incomeProofDoc },
                  { label: 'Address Proof',  url: loan.addressProofDoc },
                  { label: 'Photo',          url: loan.photoDoc },
                  { label: 'Bank Statement', url: loan.bankStatementDoc },
                  { label: 'Passbook',       url: loan.passbookDoc },
                  { label: 'Salary Slip',    url: loan.salarySlipDoc },
                  { label: 'Election Card',  url: loan.electionCardDoc },
                  { label: 'House Photo',    url: loan.housePhotoDoc },
                ];
                const uploadedCount = docs.filter(d => d.url).length;
                return (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Documents
                        <span className="ml-auto text-xs font-normal text-gray-400">
                          {uploadedCount}/{docs.length} uploaded
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {docs.map((doc, idx) => {
                          const isPdf = doc.url?.includes('application/pdf') || doc.url?.toLowerCase().endsWith('.pdf');
                          const isImage = doc.url && !isPdf;
                          return (
                            <div key={idx} className={`rounded-lg border overflow-hidden ${
                              doc.url ? 'border-green-200' : 'border-dashed border-gray-200'
                            }`}>
                              {isImage ? (
                                <button type="button" onClick={() => openDoc(doc.url!)}
                                  className="block w-full bg-gray-100 hover:opacity-90 transition-opacity cursor-pointer">
                                  <img src={doc.url!} alt={doc.label}
                                    className="w-full h-24 object-cover"
                                    onError={(e) => {
                                      const t = e.target as HTMLImageElement;
                                      t.style.display = 'none';
                                      t.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                  <div className="hidden w-full h-24 flex items-center justify-center bg-gray-50">
                                    <FileText className="h-7 w-7 text-gray-300" />
                                  </div>
                                </button>
                              ) : isPdf ? (
                                <div className="w-full h-24 flex flex-col items-center justify-center bg-red-50 gap-1">
                                  <FileText className="h-7 w-7 text-red-400" />
                                  <span className="text-xs text-red-500 font-medium">PDF</span>
                                </div>
                              ) : (
                                <div className="w-full h-24 flex items-center justify-center bg-gray-50">
                                  <div className="text-center">
                                    <FileText className="h-7 w-7 text-gray-200 mx-auto" />
                                    <p className="text-xs text-gray-300 mt-1">Not uploaded</p>
                                  </div>
                                </div>
                              )}
                              <div className={`flex items-center justify-between px-2 py-1 ${
                                doc.url ? 'bg-green-50' : 'bg-gray-50'
                              }`}>
                                <p className="text-xs font-medium text-gray-600 truncate">{doc.label}</p>
                                {doc.url ? (
                                  <button type="button" onClick={() => openDoc(doc.url!)}
                                    className="text-xs text-blue-500 hover:underline flex items-center gap-1 shrink-0 ml-1">
                                    <Eye className="h-3 w-3" /> View
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-300 shrink-0">—</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Interest Only Loan Details */}
              {loan.isInterestOnlyLoan && (
                <Card className="border-purple-200 bg-purple-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-purple-700">
                      <Percent className="h-4 w-4" />
                      Interest-Only Phase
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Monthly Interest</p>
                        <p className="font-semibold text-purple-700">{formatCurrency(monthlyInterest)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total Collected</p>
                        <p className="font-semibold text-purple-700">{formatCurrency(loan.totalInterestOnlyPaid || 0)}</p>
                      </div>
                      {loan.interestOnlyStartDate && (
                        <div>
                          <p className="text-gray-500">Started On</p>
                          <p className="font-semibold">{formatDate(loan.interestOnlyStartDate)}</p>
                        </div>
                      )}
                      {loan.loanStartedAt && (
                        <div>
                          <p className="text-gray-500">Regular EMI Started</p>
                          <p className="font-semibold">{formatDate(loan.loanStartedAt)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Interest Payment History */}
              {loan.isInterestOnlyLoan && interestPayments.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Interest Collection History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingInterestPayments ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {interestPayments.map((payment) => (
                          <div 
                            key={payment.id} 
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                <DollarSign className="h-4 w-4 text-purple-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{formatCurrency(payment.amount)}</p>
                                <p className="text-xs text-gray-500">via {payment.paymentMode}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">{formatDate(payment.createdAt)}</p>
                              <p className="text-xs text-gray-400">{payment.receiptNumber}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t flex justify-between items-center">
                      <span className="text-sm text-gray-500">Total Collections</span>
                      <Badge className="bg-purple-100 text-purple-700">
                        {interestPayments.length} payments
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Empty State for Interest Payments */}
              {loan.isInterestOnlyLoan && interestPayments.length === 0 && !loadingInterestPayments && (
                <Card className="border-dashed">
                  <CardContent className="py-6 text-center text-gray-500">
                    <Percent className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No interest payments collected yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Monthly interest: {formatCurrency(monthlyInterest)}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Loan not found
            </div>
          )}
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  );
}
