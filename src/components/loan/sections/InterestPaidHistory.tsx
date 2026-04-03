'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  History, 
  IndianRupee, 
  Calendar, 
  User, 
  CreditCard, 
  FileText,
  Loader2,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';

interface InterestPayment {
  id: string;
  amount: number;
  paymentMode: string;
  receiptNumber: string;
  createdAt: string;
  remarks: string;
  status: string;
  cashier?: {
    name: string;
  };
}

interface InterestPaidHistoryProps {
  loanId: string;
  principalAmount: number;
  interestRate: number;
  monthlyInterestAmount: number;
}

export default function InterestPaidHistory({
  loanId,
  principalAmount,
  interestRate,
  monthlyInterestAmount
}: InterestPaidHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<InterestPayment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/interest-emi?loanId=${loanId}&action=history`);
      const data = await response.json();
      
      if (data.success) {
        setPayments(data.payments || []);
        setTotalPaid(data.loan?.totalInterestPaid || 0);
      }
    } catch (error) {
      console.error('Error fetching interest history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [loanId]);

  const getPaymentModeBadge = (mode: string) => {
    const modeColors: Record<string, string> = {
      'CASH': 'bg-green-100 text-green-700',
      'UPI': 'bg-purple-100 text-purple-700',
      'BANK_TRANSFER': 'bg-blue-100 text-blue-700',
      'CHEQUE': 'bg-orange-100 text-orange-700',
      'ONLINE': 'bg-cyan-100 text-cyan-700'
    };
    return modeColors[mode] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <History className="h-5 w-5" />
            Interest Paid History
            <Badge className="bg-amber-200 text-amber-700">
              Interest Only Phase
            </Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-white rounded-lg border border-amber-200">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <IndianRupee className="h-3 w-3" /> Principal Amount
            </p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(principalAmount)}</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-amber-200">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Interest Rate
            </p>
            <p className="text-lg font-bold text-amber-700">{interestRate}% p.a.</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-amber-200">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Monthly Interest
            </p>
            <p className="text-lg font-bold text-amber-700">{formatCurrency(monthlyInterestAmount)}</p>
          </div>
        </div>

        {/* Total Paid */}
        <div className="p-4 bg-green-50 rounded-lg border border-green-200 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Total Interest Paid</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Number of Payments</p>
              <p className="text-xl font-bold text-gray-700">{payments.length}</p>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Payment History List */}
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Payment Records
        </h4>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No interest payments recorded yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Payments will appear here after the first interest collection
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {payments.map((payment, index) => (
                <div
                  key={payment.id}
                  className="p-4 bg-white rounded-lg border border-gray-200 hover:border-amber-300 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-amber-100 text-amber-700">
                          Payment #{payments.length - index}
                        </Badge>
                        <Badge className={getPaymentModeBadge(payment.paymentMode)}>
                          {payment.paymentMode}
                        </Badge>
                        {payment.status === 'COMPLETED' && (
                          <Badge className="bg-green-100 text-green-700">Paid</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(payment.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="h-4 w-4" />
                          <span>{payment.cashier?.name || 'System'}</span>
                        </div>
                      </div>

                      {payment.remarks && (
                        <p className="text-xs text-gray-500 mt-2 italic">
                          "{payment.remarks}"
                        </p>
                      )}

                      {payment.receiptNumber && (
                        <p className="text-xs text-gray-400 mt-1">
                          Receipt: {payment.receiptNumber}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs text-gray-500">Interest Amount</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
