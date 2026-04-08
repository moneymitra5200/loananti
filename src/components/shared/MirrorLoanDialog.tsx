'use client';

import { useState, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  RefreshCw, Building2, AlertTriangle, CheckCircle, Info, Loader2,
  ArrowRight, Calculator, IndianRupee, TrendingUp, X, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

interface Loan {
  id: string;
  applicationNo: string;
  requestedAmount?: number;
  requestedTenure?: number;
  requestedInterestRate?: number;
  sessionForm?: {
    approvedAmount: number;
    interestRate: number;
    tenure: number;
    emiAmount: number;
    interestType?: string;
  };
  company?: {
    id: string;
    name: string;
    code: string;
    interestType?: string;
  };
  companyId?: string;
}

interface MirrorCompany {
  id: string;
  name: string;
  code: string;
  interestType: string;
  mirrorInterestRate: number | null;
  defaultInterestRate: number;
}

interface EMIScheduleItem {
  installmentNumber: number;
  principal: number;
  interest: number;
  emi: number;
  outstandingPrincipal: number;
}

interface MirrorCalculation {
  originalLoan: {
    emiAmount: number;
    totalAmount: number;
    totalInterest: number;
    principal: number;
    schedule: EMIScheduleItem[];
  };
  mirrorLoan: {
    emiAmount: number;
    totalAmount: number;
    totalInterest: number;
    principal: number;
    schedule: EMIScheduleItem[];
  };
  extraEMICount: number;
  leftoverAmount: number;
  adjustmentType: string;
}

interface Props {
  loan: Loan;
  userId: string;
  onComplete: () => void;
  onCancel: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

const formatCurrencyExact = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};

function MirrorLoanDialog({ loan, userId, onComplete, onCancel }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mirrorCompanies, setMirrorCompanies] = useState<MirrorCompany[]>([]);
  const [selectedMirrors, setSelectedMirrors] = useState<string[]>([]);
  const [calculations, setCalculations] = useState<Record<string, MirrorCalculation>>({});
  const [paymentPages, setPaymentPages] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedPaymentPages, setSelectedPaymentPages] = useState<Record<string, string>>({});
  const [loanDetails, setLoanDetails] = useState<Loan>(loan);
  const [activeScheduleTab, setActiveScheduleTab] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // NEW: Per-company interest rate and type (user-defined)
  const [mirrorRates, setMirrorRates] = useState<Record<string, string>>({});
  const [mirrorTypes, setMirrorTypes] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchLoanDetails = async () => {
      if (!loan.sessionForm) {
        try {
          const response = await fetch(`/api/loan/details?loanId=${loan.id}`);
          const data = await response.json();
          if (data.success && data.loan) {
            setLoanDetails({ ...loan, ...data.loan });
          }
        } catch (error) {
          console.error('Error fetching loan details:', error);
        }
      }
    };
    fetchLoanDetails();
  }, [loan]);

  useEffect(() => {
    fetchMirrorCompanies();
    fetchPaymentPages();
  }, []);

  useEffect(() => {
    selectedMirrors.forEach(companyId => {
      if (!calculations[companyId] && loanDetails.sessionForm) {
        fetchCalculation(companyId);
      }
    });
    if (selectedMirrors.length > 0 && !activeScheduleTab) {
      setActiveScheduleTab(selectedMirrors[0]);
    }
  }, [selectedMirrors, loanDetails.sessionForm]);

  const fetchMirrorCompanies = async () => {
    try {
      const response = await fetch('/api/mirror-loan?action=mirror-companies');
      const data = await response.json();
      if (data.success) {
        setMirrorCompanies(data.companies);
      } else {
        setError(data.error || 'Failed to load mirror companies');
      }
    } catch (error) {
      console.error('Error fetching mirror companies:', error);
      setError('Failed to load mirror companies');
      toast.error('Failed to load mirror companies');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentPages = async () => {
    try {
      const response = await fetch('/api/emi-payment-settings?action=secondary-pages');
      const data = await response.json();
      if (data.success) {
        setPaymentPages(data.pages || []);
      }
    } catch (error) {
      console.error('Error fetching payment pages:', error);
    }
  };

  const fetchCalculation = async (companyId: string) => {
    if (!loanDetails.sessionForm) return;

    // Use user-entered rate and type, or defaults
    const mirrorRate = mirrorRates[companyId] ? parseFloat(mirrorRates[companyId]) : 15;
    const mirrorType = mirrorTypes[companyId] || 'REDUCING';

    try {
      const response = await fetch(
        `/api/mirror-loan?action=preview&principal=${loanDetails.sessionForm.approvedAmount}&originalRate=${loanDetails.sessionForm.interestRate}&originalTenure=${loanDetails.sessionForm.tenure}&originalType=${loanDetails.sessionForm.interestType || 'FLAT'}&mirrorRate=${mirrorRate}&mirrorType=${mirrorType}`
      );
      const data = await response.json();
      if (data.success) {
        setCalculations(prev => ({
          ...prev,
          [companyId]: data.calculation
        }));
      } else {
        console.error('Calculation error:', data.error);
        toast.error('Failed to calculate mirror loan: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error fetching calculation:', error);
      toast.error('Failed to calculate mirror loan');
    }
  };

  const toggleMirror = (companyId: string) => {
    setSelectedMirrors(prev => {
      const newSelection = prev.includes(companyId) 
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId];
      
      if (newSelection.length > 0) {
        setActiveScheduleTab(newSelection[0]);
      }
      return newSelection;
    });
    
    // Initialize default values when selecting a company
    if (!mirrorRates[companyId]) {
      setMirrorRates(prev => ({ ...prev, [companyId]: '15' }));
    }
    if (!mirrorTypes[companyId]) {
      setMirrorTypes(prev => ({ ...prev, [companyId]: 'REDUCING' }));
    }
  };

  // Update calculation when rate or type changes
  const handleRateTypeChange = (companyId: string, rate?: string, type?: string) => {
    if (rate !== undefined) {
      setMirrorRates(prev => ({ ...prev, [companyId]: rate }));
    }
    if (type !== undefined) {
      setMirrorTypes(prev => ({ ...prev, [companyId]: type }));
    }
    // Re-fetch calculation after a short delay
    setTimeout(() => fetchCalculation(companyId), 100);
  };

  const handleConfirm = async () => {
    if (!userId) {
      toast.error('User ID not found. Please try again.');
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      let createdCount = 0;
      let existingCount = 0;
      
      for (const companyId of selectedMirrors) {
        // Get user-entered rate and type
        const mirrorRate = mirrorRates[companyId] || '15';
        const mirrorType = mirrorTypes[companyId] || 'REDUCING';

        const response = await fetch('/api/mirror-loan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalLoanId: loan.id,
            mirrorCompanyId: companyId,
            mirrorInterestRate: parseFloat(mirrorRate),
            mirrorInterestType: mirrorType,
            extraEMIPaymentPageId: selectedPaymentPages[companyId] || null,
            createdBy: userId
          })
        });

        const data = await response.json();
        
        // Handle case where mirror loan already exists
        if (data.alreadyExists) {
          existingCount++;
          console.log('[Mirror Loan] Already exists:', data.mirrorLoan);
          continue;
        }
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to create mirror loan');
        }
        
        createdCount++;
      }

      // Show appropriate message
      if (createdCount > 0 && existingCount > 0) {
        toast.success(`Created ${createdCount} new mirror loan(s). ${existingCount} already existed.`);
      } else if (existingCount > 0 && createdCount === 0) {
        toast.info(`Mirror loan(s) already existed for all selected companies.`);
      } else {
        toast.success(`Mirror loan(s) created successfully for ${createdCount} company(ies)`);
      }
      
      onComplete();
    } catch (error: unknown) {
      console.error('Error creating mirror loans:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create mirror loans';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  const principal = loanDetails.sessionForm?.approvedAmount || loanDetails.requestedAmount || 0;
  const interestRate = loanDetails.sessionForm?.interestRate || loanDetails.requestedInterestRate || 12;
  const tenure = loanDetails.sessionForm?.tenure || loanDetails.requestedTenure || 12;
  const emiAmount = loanDetails.sessionForm?.emiAmount || 0;
  const interestType = loanDetails.sessionForm?.interestType || 'FLAT';

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="w-[95vw] sm:w-[98vw] max-w-[1600px] h-[95vh] sm:h-[98vh] max-h-[98vh] p-0 gap-0 flex flex-col bg-white">
        {/* Fixed Header */}
        <DialogHeader className="flex-shrink-0 p-3 sm:p-6 border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-2xl font-bold">
                <RefreshCw className="h-5 w-5 sm:h-7 sm:w-7 flex-shrink-0" />
                <span className="truncate">Mirror Loan Configuration</span>
              </DialogTitle>
              <DialogDescription className="text-purple-100 mt-1 sm:mt-2 text-xs sm:text-base hidden sm:block">
                Create mirror loans with reducing interest. Compare EMI schedules for both companies side by side.
              </DialogDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleCancel}
              className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </div>
        </DialogHeader>

        {/* Error Alert */}
        {error && (
          <Alert className="m-2 sm:m-4 bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Error</AlertTitle>
            <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-600" />
              <p className="mt-4 text-gray-500 text-lg">Loading mirror options...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Original Loan Info */}
              <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200 shadow-lg">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                    <span className="font-bold text-base sm:text-xl text-gray-800">Original Loan</span>
                    <Badge variant="outline" className="bg-white text-xs sm:text-base px-2 sm:px-3 py-0.5 sm:py-1 border-red-200">
                      {loanDetails.company?.name || 'Company 3'}
                    </Badge>
                    <Badge className="bg-red-500 text-white text-xs sm:text-base px-2 sm:px-3 py-0.5 sm:py-1">{interestRate}% FLAT</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-6">
                    <div className="bg-white p-2 sm:p-4 rounded-lg border shadow-sm">
                      <p className="text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Principal Amount</p>
                      <p className="font-bold text-base sm:text-2xl text-gray-900">{formatCurrency(principal)}</p>
                    </div>
                    <div className="bg-white p-2 sm:p-4 rounded-lg border shadow-sm">
                      <p className="text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Interest Rate</p>
                      <p className="font-bold text-base sm:text-2xl text-gray-900">{interestRate}% <span className="text-xs sm:text-base font-normal text-red-500">FLAT</span></p>
                    </div>
                    <div className="bg-white p-2 sm:p-4 rounded-lg border shadow-sm">
                      <p className="text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1">EMI Amount</p>
                      <p className="font-bold text-base sm:text-2xl text-gray-900">{formatCurrency(emiAmount)}</p>
                    </div>
                    <div className="bg-white p-2 sm:p-4 rounded-lg border shadow-sm">
                      <p className="text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1">Tenure</p>
                      <p className="font-bold text-base sm:text-2xl text-gray-900">{tenure} months</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Mirror Companies Selection */}
              <div className="space-y-3 sm:space-y-4">
                <h4 className="font-bold text-base sm:text-xl flex items-center gap-2 text-gray-800">
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  Select Mirror Companies
                </h4>

                {mirrorCompanies.length === 0 ? (
                  <Alert className="bg-amber-50 border-amber-200">
                    <Info className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                    <AlertDescription className="text-amber-800 text-sm">
                      <strong>No mirror companies configured.</strong>
                      <br />
                      <span className="text-xs sm:text-sm">Go to Companies → View Company → Mirror Loan Settings → Enable &quot;Mirror Target&quot;</span>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    {mirrorCompanies.map(company => {
                      const isSelected = selectedMirrors.includes(company.id);
                      const calculation = calculations[company.id];

                      return (
                        <Card 
                          key={company.id} 
                          className={`cursor-pointer transition-all shadow-md ${
                            isSelected 
                              ? 'border-2 border-purple-500 bg-purple-50 shadow-purple-200' 
                              : 'border border-gray-200 hover:border-purple-400 hover:shadow-lg bg-white'
                          }`}
                          onClick={() => toggleMirror(company.id)}
                        >
                          <CardContent className="p-3 sm:p-5">
                            <div className="flex items-start gap-3 sm:gap-4">
                              <Checkbox 
                                checked={isSelected} 
                                onCheckedChange={() => toggleMirror(company.id)}
                                className="mt-1 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 h-4 w-4 sm:h-5 sm:w-5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                  <span className="font-bold text-sm sm:text-lg text-gray-900">{company.name}</span>
                                  <Badge className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1">{company.code}</Badge>
                                </div>
                                
                                {isSelected && (
                                  <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
                                    {/* Interest Rate and Type Inputs */}
                                    <div className="grid grid-cols-2 gap-2 sm:gap-3" onClick={e => e.stopPropagation()}>
                                      <div>
                                        <label className="text-xs font-medium text-gray-600">Interest Rate (%)</label>
                                        <Input
                                          type="number"
                                          placeholder="e.g., 15"
                                          value={mirrorRates[company.id] || '15'}
                                          onChange={(e) => handleRateTypeChange(company.id, e.target.value, undefined)}
                                          className="mt-1"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs font-medium text-gray-600">Interest Type</label>
                                        <Select
                                          value={mirrorTypes[company.id] || 'REDUCING'}
                                          onValueChange={(v) => handleRateTypeChange(company.id, undefined, v)}
                                        >
                                          <SelectTrigger className="mt-1">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="REDUCING">Reducing Balance</SelectItem>
                                            <SelectItem value="FLAT">Flat Rate</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    
                                    {calculation && (
                                      <div className="flex gap-4">
                                        <div className="bg-white p-2 rounded border">
                                          <p className="text-xs text-gray-500">Mirror Tenure</p>
                                          <p className="font-bold text-emerald-600">{calculation.mirrorLoan.schedule.length} months</p>
                                        </div>
                                        <div className="bg-white p-2 rounded border">
                                          <p className="text-xs text-gray-500">Interest Saved</p>
                                          <p className="font-bold text-emerald-600">
                                            {formatCurrency(calculation.originalLoan.totalInterest - calculation.mirrorLoan.totalInterest)}
                                          </p>
                                        </div>
                                        <div className="bg-white p-2 rounded border">
                                          <p className="text-xs text-gray-500">Extra EMIs</p>
                                          <p className="font-bold text-amber-600">{calculation.extraEMICount}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* EMI Schedule Comparison */}
              {selectedMirrors.length > 0 && Object.keys(calculations).length > 0 && (
                <>
                  <Separator className="my-6" />
                  
                  <Tabs value={activeScheduleTab} onValueChange={setActiveScheduleTab}>
                    <TabsList className="w-full justify-start h-12 bg-gray-100 p-1 rounded-lg">
                      {selectedMirrors.map(companyId => {
                        const company = mirrorCompanies.find(c => c.id === companyId);
                        return (
                          <TabsTrigger key={companyId} value={companyId} className="text-base px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            {company?.name || 'Company'}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    {selectedMirrors.map(companyId => {
                      const company = mirrorCompanies.find(c => c.id === companyId);
                      const calculation = calculations[companyId];
                      if (!calculation) return null;

                      const originalSchedule = calculation.originalLoan.schedule;
                      const mirrorSchedule = calculation.mirrorLoan.schedule;
                      const extraEMIs = calculation.extraEMICount;
                      const leftover = calculation.leftoverAmount;
                      const maxRows = Math.max(originalSchedule.length, mirrorSchedule.length);
                      const interestDiff = calculation.originalLoan.totalInterest - calculation.mirrorLoan.totalInterest;

                      return (
                        <TabsContent key={companyId} value={companyId} className="space-y-6 mt-6">
                          {/* Explanation Cards */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* How Mirror Works */}
                            <Card className="border-l-4 border-l-blue-500 bg-blue-50 shadow-md">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Calculator className="h-5 w-5 text-blue-600" />
                                  How Mirror Loan Works
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="text-sm space-y-2">
                                <p><strong>Original (Company 3):</strong> {interestRate}% {interestType}</p>
                                <p><strong>Mirror ({company?.name}):</strong> {mirrorRates[companyId] || '15'}% {mirrorTypes[companyId] || 'REDUCING'}</p>
                                <p className="text-gray-600">Same EMI ({formatCurrency(emiAmount)}) for both loans.</p>
                              </CardContent>
                            </Card>

                            {/* Extra EMI */}
                            <Card className={`border-l-4 ${extraEMIs > 0 ? 'border-l-amber-500 bg-amber-50' : 'border-l-green-500 bg-green-50'} shadow-md`}>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                  {extraEMIs > 0 ? <AlertTriangle className="h-5 w-5 text-amber-600" /> : <CheckCircle className="h-5 w-5 text-green-600" />}
                                  {extraEMIs > 0 ? 'Extra EMIs' : 'Perfect Match'}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="text-sm">
                                {extraEMIs > 0 ? (
                                  <div className="space-y-1">
                                    <p className="text-amber-800"><strong>{extraEMIs} extra EMI(s)</strong> after mirror completes</p>
                                    <p className="text-gray-600">Mirror: {mirrorSchedule.length} mo vs Original: {originalSchedule.length} mo</p>
                                    <p className="font-medium text-amber-700">{formatCurrency(extraEMIs * emiAmount)} → Company 3 Cash Book</p>
                                  </div>
                                ) : (
                                  <p className="text-green-800">Both loans have same EMIs.</p>
                                )}
                              </CardContent>
                            </Card>

                            {/* Profit Summary */}
                            <Card className="border-l-4 border-l-purple-500 bg-purple-50 shadow-md">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <TrendingUp className="h-5 w-5 text-purple-600" />
                                  Hidden Profit
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="text-sm space-y-1">
                                <p>Interest Diff: <strong className="text-purple-700">{formatCurrency(interestDiff)}</strong></p>
                                <p>Extra EMIs: <strong className="text-purple-700">{formatCurrency(extraEMIs * emiAmount)}</strong></p>
                                <Separator className="my-2" />
                                <p className="text-base">Total: <strong className="text-green-600">{formatCurrency(interestDiff + (extraEMIs * emiAmount))}</strong></p>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Leftover Amount */}
                          {leftover > 0 && (
                            <Alert className="bg-orange-50 border-orange-200">
                              <IndianRupee className="h-4 w-4 text-orange-600" />
                              <AlertTitle className="text-orange-800">Leftover Amount: {formatCurrencyExact(leftover)}</AlertTitle>
                              <AlertDescription className="text-orange-700">
                                This small amount will be adjusted in the last EMI payment.
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Payment Page Selection */}
                          {extraEMIs > 0 && paymentPages.length > 0 && (
                            <div className="bg-gray-50 p-4 rounded-lg" onClick={e => e.stopPropagation()}>
                              <Label className="text-base font-medium text-gray-700">Payment Page for Extra EMIs (Optional)</Label>
                              <Select 
                                value={selectedPaymentPages[companyId] || ''} 
                                onValueChange={(value) => setSelectedPaymentPages(prev => ({ ...prev, [companyId]: value }))}
                              >
                                <SelectTrigger className="mt-2 bg-white border-gray-300 h-12 text-base">
                                  <SelectValue placeholder="Select payment page for extra EMIs" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border shadow-lg">
                                  {paymentPages.map(page => (
                                    <SelectItem key={page.id} value={page.id}>{page.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* EMI Schedule Table - Both Companies Side by Side */}
                          <Card className="shadow-lg border-0">
                            <CardHeader className="bg-gray-100 border-b">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Calculator className="h-5 w-5 text-gray-600" />
                                EMI Schedule - Both Companies
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                              {/* Horizontal scrolling wrapper */}
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse min-w-[1000px]">
                                  <thead className="sticky top-0 z-10">
                                    {/* Company Headers */}
                                    <tr className="bg-gray-200">
                                      <th rowSpan={2} className="border-b border-r px-4 py-3 text-center w-16 bg-gray-300">#</th>
                                      <th colSpan={3} className="border-b border-r px-4 py-3 text-center bg-red-100">
                                        <div className="flex items-center justify-center gap-2">
                                          <Building2 className="h-4 w-4 text-red-600" />
                                          <span className="font-bold text-red-800">Company 3 (Original) - {interestRate}% FLAT</span>
                                        </div>
                                      </th>
                                      <th colSpan={3} className="border-b px-4 py-3 text-center bg-emerald-100">
                                        <div className="flex items-center justify-center gap-2">
                                          <Building2 className="h-4 w-4 text-emerald-600" />
                                          <span className="font-bold text-emerald-800">{company?.name} (Mirror) - {company?.mirrorInterestRate || interestRate}% REDUCING</span>
                                        </div>
                                      </th>
                                    </tr>
                                    {/* Column Headers */}
                                    <tr className="bg-gray-100">
                                      <th className="border-b border-r px-3 py-2 text-right text-sm bg-red-50">Principal</th>
                                      <th className="border-b border-r px-3 py-2 text-right text-sm bg-red-50">Interest</th>
                                      <th className="border-b border-r px-3 py-2 text-right text-sm bg-red-50 font-medium">EMI</th>
                                      <th className="border-b border-r px-3 py-2 text-right text-sm bg-emerald-50">Principal</th>
                                      <th className="border-b border-r px-3 py-2 text-right text-sm bg-emerald-50">Interest</th>
                                      <th className="border-b px-3 py-2 text-right text-sm bg-emerald-50 font-medium">EMI</th>
                                    </tr>
                                  </thead>
                                  {/* Scrollable Body */}
                                  <tbody className="max-h-[400px] overflow-y-auto">
                                    {Array.from({ length: maxRows }).map((_, index) => {
                                      const originalEMI = originalSchedule[index];
                                      const mirrorEMI = mirrorSchedule[index];
                                      const isExtraEMI = index >= mirrorSchedule.length && originalEMI;

                                      return (
                                        <tr 
                                          key={index}
                                          className={isExtraEMI ? 'bg-amber-100 font-medium' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                        >
                                          <td className="border-b border-r px-4 py-2 text-center font-medium">
                                            {index + 1}
                                            {isExtraEMI && (
                                              <Badge className="ml-2 bg-amber-500 text-white text-xs">EXTRA</Badge>
                                            )}
                                          </td>
                                          
                                          {/* Original EMI */}
                                          <td className="border-b border-r px-3 py-2 text-right">{originalEMI ? formatCurrencyExact(originalEMI.principal) : '-'}</td>
                                          <td className="border-b border-r px-3 py-2 text-right text-red-600">{originalEMI ? formatCurrencyExact(originalEMI.interest) : '-'}</td>
                                          <td className="border-b border-r px-3 py-2 text-right font-medium">{originalEMI ? formatCurrencyExact(originalEMI.emi) : '-'}</td>
                                          
                                          {/* Mirror EMI */}
                                          <td className="border-b border-r px-3 py-2 text-right">{mirrorEMI ? formatCurrencyExact(mirrorEMI.principal) : (isExtraEMI ? <span className="text-amber-700">Done</span> : '-')}</td>
                                          <td className="border-b border-r px-3 py-2 text-right text-emerald-600">{mirrorEMI ? formatCurrencyExact(mirrorEMI.interest) : '-'}</td>
                                          <td className="border-b px-3 py-2 text-right font-medium">{mirrorEMI ? formatCurrencyExact(mirrorEMI.emi) : '-'}</td>
                                        </tr>
                                      );
                                    })}
                                    
                                    {/* Total Row */}
                                    <tr className="bg-gray-200 font-bold">
                                      <td className="border-r px-4 py-3 text-center">TOTAL</td>
                                      <td className="border-r px-3 py-2 text-right">{formatCurrencyExact(principal)}</td>
                                      <td className="border-r px-3 py-2 text-right text-red-600">{formatCurrencyExact(calculation.originalLoan.totalInterest)}</td>
                                      <td className="border-r px-3 py-2 text-right">{formatCurrencyExact(calculation.originalLoan.totalAmount)}</td>
                                      <td className="border-r px-3 py-2 text-right">{formatCurrencyExact(principal)}</td>
                                      <td className="border-r px-3 py-2 text-right text-emerald-600">{formatCurrencyExact(calculation.mirrorLoan.totalInterest)}</td>
                                      <td className="px-3 py-2 text-right">{formatCurrencyExact(calculation.mirrorLoan.totalAmount)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Legend */}
                          <div className="flex flex-wrap gap-6 text-sm bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 bg-amber-100 border-2 border-amber-300 rounded"></div>
                              <span className="font-medium">Extra EMI - Goes to Company 3 Cash Book</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 bg-red-100 border-2 border-red-300 rounded"></div>
                              <span className="font-medium">Original Loan (FLAT)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 bg-emerald-100 border-2 border-emerald-300 rounded"></div>
                              <span className="font-medium">Mirror Loan (REDUCING)</span>
                            </div>
                          </div>
                        </TabsContent>
                      );
                    })}
                  </Tabs>

                  <Separator className="my-6" />
                  
                  <Alert className="bg-emerald-50 border-emerald-200 shadow-md">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    <AlertTitle className="text-emerald-800 font-medium">Payment Flow</AlertTitle>
                    <AlertDescription className="text-emerald-700">
                      When customer pays EMI on original loan, mirror loan EMI is automatically synced.
                      Extra EMIs are recorded in Company 3&apos;s Cash Book as pure profit.
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="flex-shrink-0 border-t p-3 sm:p-6 gap-2 sm:gap-3 bg-gray-50 flex-col sm:flex-row">
          <Button 
            variant="outline" 
            onClick={handleCancel} 
            disabled={saving} 
            className="border-gray-300 h-10 sm:h-12 px-4 sm:px-6 text-sm sm:text-base w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Cancel & Go Back
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={saving || loading || (selectedMirrors.length > 0 && Object.keys(calculations).length < selectedMirrors.length)}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg h-10 sm:h-12 px-4 sm:px-8 text-sm sm:text-base w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                Creating Mirror Loans...
              </>
            ) : selectedMirrors.length > 0 ? (
              <>
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Confirm & Create {selectedMirrors.length} Mirror Loan(s)
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Continue Without Mirror
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default memo(MirrorLoanDialog);
