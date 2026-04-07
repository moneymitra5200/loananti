'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  History, Calendar, IndianRupee, Receipt, Download, Loader2, 
  CreditCard, FileText, AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { toast } from '@/hooks/use-toast';

interface InterestPayment {
  id: string;
  amount: number;
  paymentMode: string;
  receiptNumber: string | null;
  createdAt: string;
  remarks: string | null;
  proofUrl: string | null;
  status: string;
}

interface InterestHistorySectionProps {
  loanId: string;
  principalAmount: number;
  interestRate: number;
  totalInterestPaid: number;
}

export default function InterestHistorySection({
  loanId,
  principalAmount,
  interestRate,
  totalInterestPaid
}: InterestHistorySectionProps) {
  const [payments, setPayments] = useState<InterestPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyInterest, setMonthlyInterest] = useState(0);

  useEffect(() => {
    fetchInterestPayments();
    // Calculate monthly interest
    const mi = (principalAmount * interestRate / 100) / 12;
    setMonthlyInterest(mi);
  }, [loanId, principalAmount, interestRate]);

  const fetchInterestPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/loan/interest-payment?loanId=${loanId}`);
      const data = await response.json();
      if (data.success) {
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching interest payments:', error);
      toast({ title: 'Error', description: 'Failed to fetch interest payment history', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = (payment: InterestPayment) => {
    if (payment.receiptNumber) {
      // Open receipt in new window/tab
      window.open(`/receipt/${payment.receiptNumber}`, '_blank');
    } else {
      toast({ title: 'No Receipt', description: 'Receipt not available for this payment', variant: 'destructive' });
    }
  };

  const getPaymentModeBadge = (mode: string) => {
    const colors: Record<string, string> = {
      CASH: 'bg-green-100 text-green-700',
      UPI: 'bg-purple-100 text-purple-700',
      ONLINE: 'bg-blue-100 text-blue-700',
      BANK_TRANSFER: 'bg-blue-100 text-blue-700',
      CHEQUE: 'bg-amber-100 text-amber-700',
    };
    return <Badge className={colors[mode] || 'bg-gray-100 text-gray-700'}>{mode}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <IndianRupee className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Monthly Interest</span>
            </div>
            <p className="text-2xl font-bold text-purple-800">{formatCurrency(monthlyInterest)}</p>
            <p className="text-xs text-purple-600 mt-1">Based on {interestRate}% p.a.</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <History className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Total Paid</span>
            </div>
            <p className="text-2xl font-bold text-emerald-800">{formatCurrency(totalInterestPaid)}</p>
            <p className="text-xs text-emerald-600 mt-1">{payments.length} payment(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Principal Info */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">Principal Status</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700">Principal Amount</p>
              <p className="text-xl font-bold text-amber-800">{formatCurrency(principalAmount)}</p>
            </div>
            <Badge className="bg-amber-100 text-amber-700">Not Yet Started</Badge>
          </div>
          <p className="text-xs text-amber-600 mt-2">
            Principal repayment will begin when the loan is officially started.
          </p>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Interest Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>No interest payments recorded yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {payments.map((payment, index) => (
                  <div key={payment.id}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-lg">{formatCurrency(payment.amount)}</span>
                          {getPaymentModeBadge(payment.paymentMode)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(payment.createdAt)}
                          </span>
                          {payment.receiptNumber && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {payment.receiptNumber}
                            </span>
                          )}
                        </div>
                        {payment.remarks && (
                          <p className="text-xs text-gray-400 mt-1">{payment.remarks}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {payment.proofUrl && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => window.open(payment.proofUrl!, '_blank')}
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        )}
                        {payment.receiptNumber && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadReceipt(payment)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Receipt
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
