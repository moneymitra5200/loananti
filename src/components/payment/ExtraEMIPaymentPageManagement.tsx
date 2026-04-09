'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, Loader2, Wallet, Building2, RefreshCw, Settings, 
  Eye, Edit, ChevronDown, ChevronUp, AlertCircle, CheckCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';

interface MirrorLoanMapping {
  id: string;
  originalLoanId: string;
  originalCompanyId: string;
  mirrorCompanyId: string;
  originalInterestRate: number;
  mirrorInterestRate: number;
  originalTenure: number;
  mirrorTenure: number;
  extraEMICount: number;
  mirrorEMIsPaid: number;
  extraEMIsPaid: number;
  extraEMIPaymentPageId: string | null;
  totalProfitReceived: number;
  originalCompany: { id: string; name: string; code: string };
  mirrorCompany: { id: string; name: string; code: string };
  loanApplication: {
    id: string;
    applicationNo: string;
    customer: { id: string; name: string; phone: string };
    sessionForm: { approvedAmount: number; emiAmount: number; tenure: number };
    emiSchedules: EMISchedule[];
  };
  secondaryPaymentPage?: {
    id: string;
    name: string;
    role?: { id: string; name: string; role: string };
  };
}

interface EMISchedule {
  id: string;
  installmentNumber: number;
  dueDate: string;
  totalAmount: number;
  principalAmount: number;
  interestAmount: number;
  paymentStatus: string;
  paidAmount: number;
  paidDate: string | null;
}

interface SecondaryPaymentPage {
  id: string;
  name: string;
  role?: { id: string; name: string; role: string };
}

interface ExtraEMIPaymentPageManagementProps {
  userId?: string;
  companyId?: string;
}

export default function ExtraEMIPaymentPageManagement({ 
  userId, 
  companyId 
}: ExtraEMIPaymentPageManagementProps) {
  const [loading, setLoading] = useState(true);
  const [mirrorLoans, setMirrorLoans] = useState<MirrorLoanMapping[]>([]);
  const [secondaryPages, setSecondaryPages] = useState<SecondaryPaymentPage[]>([]);
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<MirrorLoanMapping | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMirrorLoans();
    fetchSecondaryPages();
  }, [companyId]);

  const fetchMirrorLoans = async () => {
    setLoading(true);
    try {
      let url = '/api/mirror-loan?action=list-with-extra-emi';
      if (companyId) {
        url += `&companyId=${companyId}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      console.log('[Extra EMI] Mirror loans:', data);
      if (data.success) {
        setMirrorLoans(data.mappings || []);
      }
    } catch (error) {
      console.error('Error fetching mirror loans:', error);
      toast({ title: 'Error', description: 'Failed to load mirror loans', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSecondaryPages = async () => {
    try {
      const response = await fetch('/api/secondary-payment-pages?activeOnly=true');
      const data = await response.json();
      if (data.success) {
        setSecondaryPages(data.pages || []);
      }
    } catch (error) {
      console.error('Error fetching secondary pages:', error);
    }
  };

  const handleEditPaymentPage = (mapping: MirrorLoanMapping) => {
    setSelectedMapping(mapping);
    setSelectedPageId(mapping.extraEMIPaymentPageId || 'default');
    setShowEditDialog(true);
  };

  const handleSavePaymentPage = async () => {
    if (!selectedMapping) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/mirror-loan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-extra-emi-payment-page',
          mappingId: selectedMapping.id,
          extraEMIPaymentPageId: selectedPageId === 'default' ? null : selectedPageId,
          modifiedById: userId
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({ 
          title: 'Payment Page Updated', 
          description: 'Extra EMI payment page has been updated successfully' 
        });
        setShowEditDialog(false);
        fetchMirrorLoans();
      } else {
        throw new Error(data.error || 'Failed to update payment page');
      }
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to update payment page', 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const getExtraEMIs = (mapping: MirrorLoanMapping) => {
    const { loanApplication, mirrorTenure } = mapping;
    if (!loanApplication?.emiSchedules) return [];
    
    // EMIs after mirror tenure are extra EMIs
    return loanApplication.emiSchedules.filter(
      emi => emi.installmentNumber > mirrorTenure
    );
  };

  const getExtraEMIStatus = (emi: EMISchedule) => {
    switch (emi.paymentStatus) {
      case 'PAID':
        return { label: 'Paid', className: 'bg-green-100 text-green-700', icon: CheckCircle };
      case 'PARTIALLY_PAID':
        return { label: 'Partial', className: 'bg-orange-100 text-orange-700', icon: AlertCircle };
      default:
        return { label: 'Pending', className: 'bg-yellow-100 text-yellow-700', icon: CreditCard };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-purple-600" />
            Extra EMI Payment Page Management
          </CardTitle>
          <CardDescription>
            Manage which secondary payment page is used for extra EMI collections. 
            Extra EMIs are profit for the original company (Company 3).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mirrorLoans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No mirror loans found with extra EMIs</p>
              <p className="text-sm mt-2">Mirror loans will appear here when they have extra EMIs configured</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mirrorLoans.map((mapping) => {
                const extraEMIs = getExtraEMIs(mapping);
                const isExpanded = expandedLoan === mapping.id;
                
                return (
                  <Card key={mapping.id} className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                      {/* Header Row */}
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedLoan(isExpanded ? null : mapping.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <RefreshCw className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{mapping.loanApplication?.applicationNo}</h4>
                              <Badge variant="outline" className="text-xs">
                                {mapping.extraEMICount} Extra EMI{mapping.extraEMICount > 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">
                              {mapping.loanApplication?.customer?.name} • {formatCurrency(mapping.loanApplication?.sessionForm?.approvedAmount || 0)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Extra EMIs Paid</p>
                            <p className="font-semibold">{mapping.extraEMIsPaid}/{mapping.extraEMICount}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Profit Received</p>
                            <p className="font-semibold text-green-600">{formatCurrency(mapping.totalProfitReceived)}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPaymentPage(mapping);
                            }}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                      </div>
                      
                      {/* Payment Page Info */}
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Extra EMI Payment Page</p>
                          <p className="font-medium">
                            {mapping.secondaryPaymentPage ? (
                              <span className="text-purple-600">
                                {mapping.secondaryPaymentPage.name}
                                {mapping.secondaryPaymentPage.role && (
                                  <span className="text-gray-500 ml-2">
                                    (Credit to: {mapping.secondaryPaymentPage.role.name})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-600">Company Default Bank Account</span>
                            )}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditPaymentPage(mapping)}
                        >
                          <Edit className="h-3 w-3 mr-1" /> Change
                        </Button>
                      </div>
                      
                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-4"
                          >
                            <Separator className="mb-4" />
                            
                            {/* Company Info */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-xs text-blue-600">Original Company (Loan Owner)</p>
                                <p className="font-semibold text-blue-800">{mapping.originalCompany?.name}</p>
                                <p className="text-xs text-blue-500">Receives Extra EMI Profit</p>
                              </div>
                              <div className="p-3 bg-green-50 rounded-lg">
                                <p className="text-xs text-green-600">Mirror Company (Operational)</p>
                                <p className="font-semibold text-green-800">{mapping.mirrorCompany?.name}</p>
                                <p className="text-xs text-green-500">Receives Regular EMI Interest</p>
                              </div>
                            </div>
                            
                            {/* Extra EMI Table */}
                            <h5 className="font-medium mb-2">Extra EMI Schedule</h5>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>EMI #</TableHead>
                                  <TableHead>Due Date</TableHead>
                                  <TableHead>Amount</TableHead>
                                  <TableHead>Principal</TableHead>
                                  <TableHead>Interest</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Paid Date</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {extraEMIs.map((emi) => {
                                  const status = getExtraEMIStatus(emi);
                                  const StatusIcon = status.icon;
                                  
                                  return (
                                    <TableRow key={emi.id}>
                                      <TableCell className="font-medium">#{emi.installmentNumber}</TableCell>
                                      <TableCell>{formatDate(emi.dueDate)}</TableCell>
                                      <TableCell className="font-semibold">{formatCurrency(emi.totalAmount)}</TableCell>
                                      <TableCell>{formatCurrency(emi.principalAmount)}</TableCell>
                                      <TableCell>{formatCurrency(emi.interestAmount)}</TableCell>
                                      <TableCell>
                                        <Badge className={status.className}>
                                          <StatusIcon className="h-3 w-3 mr-1" />
                                          {status.label}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>{emi.paidDate ? formatDate(emi.paidDate) : '-'}</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                            
                            {extraEMIs.length === 0 && (
                              <p className="text-center text-gray-500 py-4">
                                No extra EMIs scheduled yet
                              </p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Payment Page Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Extra EMI Payment Page</DialogTitle>
            <DialogDescription>
              Select where extra EMI payments should be credited. 
              This affects where the profit from extra EMIs goes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedMapping && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Loan</p>
                <p className="font-medium">{selectedMapping.loanApplication?.applicationNo}</p>
                <p className="text-sm text-gray-500">
                  {selectedMapping.extraEMICount} Extra EMI(s) • {formatCurrency(selectedMapping.totalProfitReceived)} received
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Payment Page for Extra EMIs</Label>
              <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    <div className="flex flex-col">
                      <span className="font-medium">Company Default Bank Account</span>
                      <span className="text-xs text-gray-500">Extra EMIs go to company's bank account</span>
                    </div>
                  </SelectItem>
                  {secondaryPages.map((page) => (
                    <SelectItem key={page.id} value={page.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{page.name}</span>
                        <span className="text-xs text-gray-500">
                          {page.role ? `Credit to: ${page.role.name}` : 'Personal collection page'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedPageId !== 'default' && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-700">
                  <strong>Note:</strong> Extra EMI payments will be credited to the selected payment page's 
                  assigned role as personal credit.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePaymentPage} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
