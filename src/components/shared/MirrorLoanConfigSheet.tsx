'use client';

import { useState, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, Building2, AlertTriangle, CheckCircle, Info, Loader2,
  ArrowRight, Calculator, IndianRupee, TrendingUp, X, ArrowLeft,
  DollarSign, Percent, Clock, Wallet, PiggyBank
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/helpers';

interface SessionForm {
  approvedAmount: number;
  interestRate: number;
  tenure: number;
  emiAmount: number;
  interestType?: string;
}

interface Loan {
  id: string;
  applicationNo: string;
  company?: {
    id: string;
    name: string;
    code: string;
  };
  sessionForm?: SessionForm;
}

interface MirrorCompany {
  id: string;
  name: string;
  code: string;
  isCompany1: boolean;
  mirrorRate: number | null;
  mirrorType: string;
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: { mirrorCompanyId: string; mirrorType: string }) => void;
  mirrorCompanies: MirrorCompany[];
  loading?: boolean;
}

const formatCurrencyExact = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};

function MirrorLoanConfigSheet({ loan, open, onOpenChange, onConfirm, mirrorCompanies, loading = false }: Props) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedMirrorType, setSelectedMirrorType] = useState<string>('');
  const [calculation, setCalculation] = useState<MirrorCalculation | null>(null);
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const sessionForm = loan.sessionForm;
  const selectedCompany = mirrorCompanies.find(c => c.id === selectedCompanyId);

  useEffect(() => {
    if (selectedCompanyId && selectedMirrorType && sessionForm) {
      fetchCalculation();
    } else {
      setCalculation(null);
    }
  }, [selectedCompanyId, selectedMirrorType]);

  const fetchCalculation = async () => {
    if (!sessionForm || !selectedMirrorType) return;
    setLoadingCalc(true);
    try {
      const response = await fetch(
        `/api/mirror-loan?action=preview&principal=${sessionForm.approvedAmount}&originalRate=${sessionForm.interestRate}&originalTenure=${sessionForm.tenure}&originalType=${sessionForm.interestType || 'FLAT'}&mirrorType=${selectedMirrorType}`
      );
      const data = await response.json();
      if (data.success) {
        setCalculation(data.calculation);
      } else {
        toast.error('Failed to calculate mirror loan');
      }
    } catch (error) {
      console.error('Error fetching calculation:', error);
      toast.error('Failed to calculate mirror loan');
    } finally {
      setLoadingCalc(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedCompanyId || !selectedMirrorType) {
      toast.error('Please select a mirror company');
      return;
    }
    onConfirm({ mirrorCompanyId: selectedCompanyId, mirrorType: selectedMirrorType });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // Calculate display values
  const extraEMIAmount = calculation ? calculation.extraEMICount * (sessionForm?.emiAmount || 0) : 0;
  const interestSaved = calculation ? calculation.originalLoan.totalInterest - calculation.mirrorLoan.totalInterest : 0;
  const totalProfit = calculation ? interestSaved + extraEMIAmount : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[700px] p-0 gap-0 flex flex-col bg-white overflow-hidden">
        {/* Header */}
        <SheetHeader className="flex-shrink-0 p-6 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-3 text-2xl font-bold text-white">
                <RefreshCw className="h-7 w-7" />
                Mirror Loan Configuration
              </SheetTitle>
              <SheetDescription className="text-purple-100 mt-2 text-base">
                Select the mirror company to disburse the loan. Original loan stays with {loan.company?.name || 'Company 3'}.
              </SheetDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClose}
              className="text-white hover:bg-white/20 h-10 w-10"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Original Loan Summary */}
          <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200 shadow-lg mb-6">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="h-6 w-6 text-red-600" />
                <span className="font-bold text-lg text-gray-800">Original Loan Details</span>
                <Badge variant="outline" className="ml-auto bg-white text-base px-3 py-1 border-red-200">
                  {loan.company?.name || 'Company 3'}
                </Badge>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded-lg border shadow-sm text-center">
                  <p className="text-xs text-gray-500 mb-1">Principal</p>
                  <p className="font-bold text-xl text-gray-900">{formatCurrency(sessionForm?.approvedAmount || 0)}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border shadow-sm text-center">
                  <p className="text-xs text-gray-500 mb-1">Interest</p>
                  <p className="font-bold text-xl text-red-600">{sessionForm?.interestRate}% <span className="text-sm font-normal">FLAT</span></p>
                </div>
                <div className="bg-white p-3 rounded-lg border shadow-sm text-center">
                  <p className="text-xs text-gray-500 mb-1">EMI</p>
                  <p className="font-bold text-xl text-gray-900">{formatCurrency(sessionForm?.emiAmount || 0)}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border shadow-sm text-center">
                  <p className="text-xs text-gray-500 mb-1">Tenure</p>
                  <p className="font-bold text-xl text-gray-900">{sessionForm?.tenure} mo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Select Mirror Company */}
          <div className="mb-6">
            <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-purple-600" />
              Select Mirror Company for Disbursement
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Money will be <strong>disbursed from the selected mirror company</strong>. Customer sees original company in their app.
            </p>

            <RadioGroup value={selectedCompanyId} onValueChange={(value) => {
              const company = mirrorCompanies.find(c => c.id === value);
              setSelectedCompanyId(value);
              if (company) {
                setSelectedMirrorType(company.mirrorType);
              }
            }} className="space-y-3">
              {mirrorCompanies.map((company) => (
                <div
                  key={company.id}
                  className={`relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedCompanyId === company.id
                      ? 'border-purple-500 bg-purple-50 shadow-lg'
                      : 'border-gray-200 hover:border-purple-300 bg-white hover:shadow-md'
                  }`}
                  onClick={() => {
                    setSelectedCompanyId(company.id);
                    setSelectedMirrorType(company.mirrorType);
                  }}
                >
                  <RadioGroupItem value={company.id} id={company.id} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={company.id} className="cursor-pointer">
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className="h-5 w-5 text-purple-600" />
                        <span className="font-bold text-lg text-gray-900">{company.name}</span>
                        {company.isCompany1 ? (
                          <Badge className="bg-emerald-500 text-white">15% REDUCING</Badge>
                        ) : (
                          <Badge className="bg-amber-500 text-white">24% REDUCING</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Interest Rate:</span>
                          <span className="font-semibold">{company.isCompany1 ? '15%' : '24%'} Reducing</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Disburses:</span>
                          <span className="font-semibold text-green-600">From this company</span>
                        </div>
                      </div>
                    </Label>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {mirrorCompanies.length === 0 && (
              <Alert className="bg-amber-50 border-amber-200">
                <Info className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>No mirror companies configured.</strong> Go to Companies → Enable Mirror Target.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Loading Calculation */}
          {loadingCalc && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <span className="ml-3 text-purple-600 text-lg">Calculating EMI structure...</span>
            </div>
          )}

          {/* Calculation Results */}
          {calculation && !loadingCalc && (
            <>
              <Separator className="my-6" />

              {/* EMI Structure Comparison */}
              <div className="mb-6">
                <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-purple-600" />
                  EMI Structure Comparison
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Original */}
                  <Card className="bg-red-50 border-red-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-red-800">
                        <Building2 className="h-4 w-4" />
                        {loan.company?.name || 'Company 3'}
                      </CardTitle>
                      <CardDescription>Original Loan</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Interest:</span>
                        <span className="font-bold text-red-600">{sessionForm?.interestRate}% FLAT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tenure:</span>
                        <span className="font-semibold">{sessionForm?.tenure} months</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Interest:</span>
                        <span className="font-bold text-red-600">{formatCurrency(calculation.originalLoan.totalInterest)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Mirror */}
                  <Card className="bg-emerald-50 border-emerald-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-emerald-800">
                        <Building2 className="h-4 w-4" />
                        {selectedCompany?.name || 'Mirror Company'}
                      </CardTitle>
                      <CardDescription>Mirror Loan</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Interest:</span>
                        <span className="font-bold text-emerald-600">{selectedCompany?.isCompany1 ? '15%' : '24%'} REDUCING</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tenure:</span>
                        <span className="font-semibold">{calculation.mirrorLoan.schedule.length} months</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Interest:</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(calculation.mirrorLoan.totalInterest)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Important Note - Extra/Remaining Amount */}
              {calculation.extraEMICount > 0 ? (
                <Alert className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-200 rounded-full">
                      <AlertTriangle className="h-6 w-6 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <AlertTitle className="text-lg font-bold text-amber-900">
                        Extra EMI Payments After Mirror Loan Completes
                      </AlertTitle>
                      <AlertDescription className="text-amber-800 mt-2">
                        <div className="space-y-2">
                          <p>
                            After <strong>{calculation.mirrorLoan.schedule.length} months</strong> of mirror loan, 
                            customer will pay <strong className="text-orange-700">{calculation.extraEMICount} extra EMI(s)</strong>.
                          </p>
                          <div className="mt-3 p-3 bg-white/80 rounded-lg border border-amber-200">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700">Extra Amount:</span>
                              <span className="font-bold text-xl text-orange-600">{formatCurrency(extraEMIAmount)}</span>
                            </div>
                            <p className="text-xs text-amber-600 mt-2">
                              💰 This extra amount goes to <strong>{loan.company?.name || 'Company 3'}</strong> as pure profit
                            </p>
                          </div>
                        </div>
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ) : calculation.leftoverAmount > 0 ? (
                <Alert className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-200 rounded-full">
                      <Info className="h-6 w-6 text-blue-700" />
                    </div>
                    <div className="flex-1">
                      <AlertTitle className="text-lg font-bold text-blue-900">
                        Remaining Balance After All EMIs
                      </AlertTitle>
                      <AlertDescription className="text-blue-800 mt-2">
                        <p>After paying all EMIs, <strong className="text-cyan-700">{formatCurrencyExact(calculation.leftoverAmount)}</strong> will remain as balance.</p>
                        <p className="text-xs text-blue-600 mt-2">This will be adjusted in the last EMI payment.</p>
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ) : (
                <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-200 rounded-full">
                      <CheckCircle className="h-6 w-6 text-green-700" />
                    </div>
                    <div>
                      <AlertTitle className="text-lg font-bold text-green-900">Perfect EMI Match!</AlertTitle>
                      <AlertDescription className="text-green-700">No extra or remaining amount - EMIs align perfectly.</AlertDescription>
                    </div>
                  </div>
                </Alert>
              )}

              {/* Profit Summary */}
              <Card className="bg-gradient-to-r from-purple-100 to-indigo-100 border-purple-300 mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PiggyBank className="h-5 w-5 text-purple-600" />
                    Hidden Profit Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-white rounded-lg border">
                      <p className="text-xs text-gray-500 mb-1">Interest Saved</p>
                      <p className="font-bold text-lg text-purple-700">{formatCurrency(interestSaved)}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border">
                      <p className="text-xs text-gray-500 mb-1">Extra EMIs</p>
                      <p className="font-bold text-lg text-amber-600">{formatCurrency(extraEMIAmount)}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-green-300 bg-green-50">
                      <p className="text-xs text-gray-500 mb-1">Total Profit</p>
                      <p className="font-bold text-xl text-green-600">{formatCurrency(totalProfit)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Show Schedule Toggle */}
              <Button 
                variant="outline" 
                className="w-full mb-4" 
                onClick={() => setShowSchedule(!showSchedule)}
              >
                {showSchedule ? 'Hide' : 'Show'} EMI Schedule Comparison
              </Button>

              {/* EMI Schedule Table */}
              {showSchedule && (
                <Card className="shadow-lg">
                  <CardHeader className="bg-gray-100">
                    <CardTitle className="text-base">EMI Schedule - Side by Side</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-gray-200">
                            <th rowSpan={2} className="border-b border-r px-3 py-2 text-center w-12">#</th>
                            <th colSpan={3} className="border-b border-r px-3 py-2 text-center bg-red-100">Original ({sessionForm?.interestRate}% FLAT)</th>
                            <th colSpan={3} className="border-b px-3 py-2 text-center bg-emerald-100">Mirror ({selectedCompany?.isCompany1 ? '15%' : '24%'} REDUCING)</th>
                          </tr>
                          <tr className="bg-gray-100">
                            <th className="border-b border-r px-2 py-1 text-right">Principal</th>
                            <th className="border-b border-r px-2 py-1 text-right">Interest</th>
                            <th className="border-b border-r px-2 py-1 text-right font-medium">EMI</th>
                            <th className="border-b border-r px-2 py-1 text-right">Principal</th>
                            <th className="border-b border-r px-2 py-1 text-right">Interest</th>
                            <th className="border-b px-2 py-1 text-right font-medium">EMI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: Math.max(calculation.originalLoan.schedule.length, calculation.mirrorLoan.schedule.length) }).map((_, idx) => {
                            const orig = calculation.originalLoan.schedule[idx];
                            const mirr = calculation.mirrorLoan.schedule[idx];
                            const isExtra = idx >= calculation.mirrorLoan.schedule.length && orig;
                            return (
                              <tr key={idx} className={isExtra ? 'bg-amber-100' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="border-b border-r px-3 py-1 text-center font-medium">
                                  {idx + 1}
                                  {isExtra && <Badge className="ml-1 bg-amber-500 text-white text-xs">EXTRA</Badge>}
                                </td>
                                <td className="border-b border-r px-2 py-1 text-right">{orig ? formatCurrencyExact(orig.principal) : '-'}</td>
                                <td className="border-b border-r px-2 py-1 text-right text-red-600">{orig ? formatCurrencyExact(orig.interest) : '-'}</td>
                                <td className="border-b border-r px-2 py-1 text-right font-medium">{orig ? formatCurrencyExact(orig.emi) : '-'}</td>
                                <td className="border-b border-r px-2 py-1 text-right">{mirr ? formatCurrencyExact(mirr.principal) : (isExtra ? <span className="text-amber-600">Done</span> : '-')}</td>
                                <td className="border-b border-r px-2 py-1 text-right text-emerald-600">{mirr ? formatCurrencyExact(mirr.interest) : '-'}</td>
                                <td className="border-b px-2 py-1 text-right font-medium">{mirr ? formatCurrencyExact(mirr.emi) : '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <SheetFooter className="flex-shrink-0 border-t p-6 gap-3 bg-gray-50">
          <Button variant="outline" onClick={handleClose} disabled={loading} className="h-12 px-6">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading || !selectedCompanyId || loadingCalc}
            className="bg-purple-600 hover:bg-purple-700 text-white h-12 px-8"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5 mr-2" />
                Confirm Mirror Configuration
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default memo(MirrorLoanConfigSheet);
