'use client';

import { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  RefreshCw, Building2, CheckCircle, XCircle, Clock, Loader2, AlertTriangle, 
  DollarSign, TrendingUp, User, Calendar, Hash, ArrowRight, Eye
} from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
};

const formatDate = (date: string | Date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface PendingMirrorLoan {
  id: string;
  status: string;
  mirrorType: string;
  principalAmount: number;
  originalInterestRate: number;
  originalInterestType: string;
  mirrorInterestRate: number;
  mirrorInterestType: string;
  originalEMIAmount: number;
  originalTenure: number;
  mirrorTenure: number;
  extraEMICount: number;
  createdBy: string;
  createdAt: string;
  approvedById?: string;
  approvedAt?: string;
  rejectedById?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  disbursedById?: string;
  disbursedAt?: string;
  originalLoan: {
    id: string;
    applicationNo: string;
    customer: { id: string; name: string; email: string; phone: string };
    company?: { id: string; name: string; code: string };
    sessionForm?: { approvedAmount: number; interestRate: number; tenure: number; interestType: string };
  };
  mirrorCompany: { id: string; name: string; code: string };
  originalCompany: { id: string; name: string; code: string };
}

interface Props {
  userId: string;
}

function PendingMirrorLoansSection({ userId }: Props) {
  const [loading, setLoading] = useState(true);
  const [pendingLoans, setPendingLoans] = useState<PendingMirrorLoan[]>([]);
  const [counts, setCounts] = useState({ PENDING: 0, APPROVED: 0, DISBURSED: 0, REJECTED: 0 });
  const [activeTab, setActiveTab] = useState('PENDING');
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<PendingMirrorLoan | null>(null);

  useEffect(() => {
    fetchPendingLoans();
  }, []);

  const fetchPendingLoans = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pending-mirror-loan');
      const data = await response.json();
      if (data.success) {
        setPendingLoans(data.pendingLoans);
        setCounts(data.counts);
      }
    } catch (error) {
      console.error('Error fetching pending mirror loans:', error);
      toast.error('Failed to load pending mirror loans');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      const response = await fetch('/api/pending-mirror-loan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action: 'approve',
          userId
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Mirror loan approved! Ready for Cashier disbursement.');
        fetchPendingLoans();
      } else {
        toast.error(data.error || 'Failed to approve');
      }
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Failed to approve mirror loan');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    setProcessing(id);
    try {
      const response = await fetch('/api/pending-mirror-loan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action: 'reject',
          userId,
          rejectionReason: reason
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Mirror loan rejected.');
        fetchPendingLoans();
      } else {
        toast.error(data.error || 'Failed to reject');
      }
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Failed to reject mirror loan');
    } finally {
      setProcessing(null);
    }
  };

  const filteredLoans = pendingLoans.filter(loan => loan.status === activeTab);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string; icon: any }> = {
      PENDING: { className: 'bg-amber-100 text-amber-700', label: 'Pending Approval', icon: Clock },
      APPROVED: { className: 'bg-blue-100 text-blue-700', label: 'Approved', icon: CheckCircle },
      DISBURSED: { className: 'bg-green-100 text-green-700', label: 'Disbursed', icon: DollarSign },
      REJECTED: { className: 'bg-red-100 text-red-700', label: 'Rejected', icon: XCircle }
    };
    const c = config[status] || { className: 'bg-gray-100 text-gray-700', label: status, icon: AlertTriangle };
    return <Badge className={c.className}><c.icon className="h-3 w-3 mr-1" />{c.label}</Badge>;
  };

  const getMirrorRateBadge = (loan: PendingMirrorLoan) => {
    const isCompany1 = loan.mirrorInterestRate === 15;
    return (
      <Badge className={isCompany1 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
        {loan.mirrorInterestRate}% REDUCING
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <RefreshCw className="h-6 w-6 text-purple-600" />
            <h3 className="text-xl font-bold text-purple-800">Pending Mirror Loans</h3>
          </div>
          <p className="text-purple-600 text-sm">
            Review and approve mirror loan requests. Once approved, the Cashier will disburse the loan from the mirror company's bank account.
          </p>
          
          {/* Status Counts */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="bg-white p-3 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-600">Pending</p>
              <p className="text-2xl font-bold text-amber-700">{counts.PENDING}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-600">Approved</p>
              <p className="text-2xl font-bold text-blue-700">{counts.APPROVED}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-green-200">
              <p className="text-xs text-green-600">Disbursed</p>
              <p className="text-2xl font-bold text-green-700">{counts.DISBURSED}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-red-200">
              <p className="text-xs text-red-600">Rejected</p>
              <p className="text-2xl font-bold text-red-700">{counts.REJECTED}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="DISBURSED">Disbursed</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <span className="ml-2 text-gray-500">Loading pending mirror loans...</span>
            </div>
          ) : filteredLoans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <RefreshCw className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No {activeTab.toLowerCase()} mirror loan requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredLoans.map((loan) => (
                <Card key={loan.id} className="border-l-4 border-l-purple-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Header Row */}
                        <div className="flex items-center gap-3 mb-4">
                          <Hash className="h-5 w-5 text-gray-400" />
                          <span className="font-semibold text-lg">{loan.originalLoan.applicationNo}</span>
                          {getStatusBadge(loan.status)}
                          {getMirrorRateBadge(loan)}
                        </div>

                        {/* Customer & Company Info */}
                        <div className="grid grid-cols-2 gap-6 mb-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Customer</p>
                            <p className="font-medium">{loan.originalLoan.customer?.name || 'N/A'}</p>
                            <p className="text-sm text-gray-500">{loan.originalLoan.customer?.phone || ''}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Mirror Company</p>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-purple-600" />
                              <span className="font-medium">{loan.mirrorCompany?.name}</span>
                              <Badge variant="outline">{loan.mirrorCompany?.code}</Badge>
                            </div>
                          </div>
                        </div>

                        {/* Loan Details */}
                        <div className="grid grid-cols-5 gap-4 bg-gray-50 p-4 rounded-lg">
                          <div>
                            <p className="text-xs text-gray-500">Principal</p>
                            <p className="font-bold text-lg">{formatCurrency(loan.principalAmount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Original Rate</p>
                            <p className="font-medium">{loan.originalInterestRate}% {loan.originalInterestType}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Mirror Rate</p>
                            <p className="font-medium text-purple-600">{loan.mirrorInterestRate}% REDUCING</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">EMI</p>
                            <p className="font-medium">{formatCurrency(loan.originalEMIAmount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Tenure</p>
                            <p className="font-medium">{loan.originalTenure} → {loan.mirrorTenure} mo</p>
                            {loan.extraEMICount > 0 && (
                              <p className="text-xs text-amber-600">+{loan.extraEMICount} extra EMI</p>
                            )}
                          </div>
                        </div>

                        {/* Timestamps */}
                        <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Created: {formatDate(loan.createdAt)}</span>
                          </div>
                          {loan.approvedAt && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <CheckCircle className="h-4 w-4" />
                              <span>Approved: {formatDate(loan.approvedAt)}</span>
                            </div>
                          )}
                          {loan.disbursedAt && (
                            <div className="flex items-center gap-1 text-green-600">
                              <DollarSign className="h-4 w-4" />
                              <span>Disbursed: {formatDate(loan.disbursedAt)}</span>
                            </div>
                          )}
                          {loan.rejectedAt && (
                            <div className="flex items-center gap-1 text-red-600">
                              <XCircle className="h-4 w-4" />
                              <span>Rejected: {formatDate(loan.rejectedAt)}</span>
                            </div>
                          )}
                        </div>

                        {/* Rejection Reason */}
                        {loan.rejectionReason && (
                          <Alert className="mt-4 bg-red-50 border-red-200">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertTitle className="text-red-800">Rejection Reason</AlertTitle>
                            <AlertDescription className="text-red-700">{loan.rejectionReason}</AlertDescription>
                          </Alert>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {loan.status === 'PENDING' && (
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(loan.id)}
                            disabled={processing === loan.id}
                          >
                            {processing === loan.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              const reason = prompt('Enter rejection reason:');
                              if (reason) handleReject(loan.id, reason);
                            }}
                            disabled={processing === loan.id}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default memo(PendingMirrorLoansSection);
