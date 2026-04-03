'use client';

import { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Building2, AlertTriangle, CheckCircle, Info, Loader2,
  Calculator, TrendingUp
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
  mirrorInterestRate: number;
  defaultInterestRate: number;
  companyType?: 'COMPANY_1' | 'COMPANY_2' | 'COMPANY_3' | 'UNKNOWN';
  mirrorType?: 'COMPANY_1_15_PERCENT' | 'COMPANY_2_SAME_RATE';
  displayName?: string;
  isCompany1?: boolean;
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
  selectedMirrorCompany: MirrorCompany | null;
  onSelectionChange: (company: MirrorCompany | null) => void;
  showEMIChart?: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

const formatCurrencyExact = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};

function MirrorLoanSelectionPanel({ loan, selectedMirrorCompany, onSelectionChange, showEMIChart = true }: Props) {
  const [loading, setLoading] = useState(true);
  const [mirrorCompanies, setMirrorCompanies] = useState<MirrorCompany[]>([]);
  const [calculations, setCalculations] = useState<Record<string, MirrorCalculation>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMirrorCompanies();
  }, []);

  useEffect(() => {
    if (selectedMirrorCompany && !calculations[selectedMirrorCompany.id] && loan.sessionForm) {
      fetchCalculation(selectedMirrorCompany.id);
    }
  }, [selectedMirrorCompany, loan.sessionForm]);

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

  const fetchCalculation = async (companyId: string) => {
    const company = mirrorCompanies.find(c => c.id === companyId);
    if (!company || !loan.sessionForm) return;

    try {
      const mirrorType = company.mirrorType || 'COMPANY_1_15_PERCENT';
      const mirrorRate = company.mirrorInterestRate || 15;

      const response = await fetch(
        `/api/mirror-loan?action=preview&principal=${loan.sessionForm.approvedAmount}&originalRate=${loan.sessionForm.interestRate}&originalTenure=${loan.sessionForm.tenure}&originalType=${loan.sessionForm.interestType || 'FLAT'}&mirrorType=${mirrorType}&mirrorRate=${mirrorRate}`
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

  const handleSelectionChange = (companyId: string) => {
    if (companyId === 'none') {
      onSelectionChange(null);
    } else {
      const company = mirrorCompanies.find(c => c.id === companyId);
      onSelectionChange(company || null);
    }
  };

  const getMirrorTypeLabel = (company: MirrorCompany) => {
    if (company.companyType === 'COMPANY_1' || company.isCompany1 || company.mirrorInterestRate === 15) {
      return { label: '15% Reducing', className: 'bg-emerald-100 text-emerald-800 border border-emerald-200' };
    }
    return { label: '24% Reducing', className: 'bg-blue-100 text-blue-800 border border-blue-200' };
  };

  const principal = loan.sessionForm?.approvedAmount || loan.requestedAmount || 0;
  const interestRate = loan.sessionForm?.interestRate || loan.requestedInterestRate || 12;
  const tenure = loan.sessionForm?.tenure || loan.requestedTenure || 12;
  const emiAmount = loan.sessionForm?.emiAmount || 0;

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
        <p className="mt-3 text-gray-500">Loading mirror options...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="bg-red-50 border-red-200">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800">Error</AlertTitle>
        <AlertDescription className="text-red-700">{error}</AlertDescription>
      </Alert>
    );
  }

  const calculation = selectedMirrorCompany ? calculations[selectedMirrorCompany.id] : null;

  return (
    <div className="space-y-4">
      {/* Company Selection */}
      <div className="space-y-3">
        <h4 className="font-semibold text-base flex items-center gap-2">
          <Building2 className="h-5 w-5 text-purple-600" />
          Select Mirror Company (Single Selection)
        </h4>

        {mirrorCompanies.length === 0 ? (
          <Alert className="bg-amber-50 border-amber-200">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              No mirror companies configured. Enable &quot;Mirror Target&quot; in Company settings.
            </AlertDescription>
          </Alert>
        ) : (
          <RadioGroup
            value={selectedMirrorCompany?.id || 'none'}
            onValueChange={handleSelectionChange}
            className="space-y-2"
          >
            {/* No Mirror Option */}
            <div 
              className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                !selectedMirrorCompany 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              onClick={() => handleSelectionChange('none')}
            >
              <RadioGroupItem value="none" id="none" />
              <Label htmlFor="none" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="font-medium">No Mirror Loan</span>
                  <Badge variant="outline">Continue with original only</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">Proceed without creating a mirror loan</p>
              </Label>
            </div>

            {/* Mirror Companies */}
            {mirrorCompanies.map(company => {
              const isSelected = selectedMirrorCompany?.id === company.id;
              const mirrorType = getMirrorTypeLabel(company);

              return (
                <div 
                  key={company.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                  onClick={() => handleSelectionChange(company.id)}
                >
                  <RadioGroupItem value={company.id} id={company.id} />
                  <Label htmlFor={company.id} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{company.name}</span>
                      <Badge className={mirrorType.className}>{mirrorType.label}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Code: {company.code}</p>
                    {isSelected && calculation && (
                      <div className="mt-2 flex gap-4 text-xs">
                        <span className="text-gray-600">Mirror Tenure: <strong>{calculation.mirrorLoan.schedule.length} mo</strong></span>
                        <span className="text-gray-600">Interest Saved: <strong className="text-emerald-600">{formatCurrency(calculation.originalLoan.totalInterest - calculation.mirrorLoan.totalInterest)}</strong></span>
                      </div>
                    )}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        )}
      </div>

      {/* EMI Chart */}
      {showEMIChart && selectedMirrorCompany && calculation && (
        <>
          <Separator />
          
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-l-4 border-l-blue-500 bg-blue-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">How It Works</span>
                </div>
                <p className="text-xs text-gray-600">Original: {interestRate}% FLAT</p>
                <p className="text-xs text-gray-600">Mirror: {selectedMirrorCompany.mirrorInterestRate}% REDUCING</p>
                <p className="text-xs text-gray-500 mt-1">Same EMI: {formatCurrency(emiAmount)}</p>
              </CardContent>
            </Card>

            <Card className={`border-l-4 ${calculation.extraEMICount > 0 ? 'border-l-amber-500 bg-amber-50' : 'border-l-green-500 bg-green-50'}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  {calculation.extraEMICount > 0 ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
                  <span className="text-xs font-medium">{calculation.extraEMICount > 0 ? 'Extra EMIs' : 'Perfect Match'}</span>
                </div>
                {calculation.extraEMICount > 0 ? (
                  <p className="text-xs text-amber-700"><strong>{calculation.extraEMICount}</strong> extra EMI(s) → Company 3</p>
                ) : (
                  <p className="text-xs text-green-700">Same tenure for both</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 bg-purple-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-700">Hidden Profit</span>
                </div>
                <p className="text-xs font-bold text-green-600">
                  {formatCurrency((calculation.originalLoan.totalInterest - calculation.mirrorLoan.totalInterest) + (calculation.extraEMICount * emiAmount))}
                </p>
                <p className="text-xs text-gray-500">Interest Diff + Extra EMIs</p>
              </CardContent>
            </Card>
          </div>

          {/* EMI Table */}
          <Card className="shadow-sm">
            <CardHeader className="py-3 px-4 bg-gray-50">
              <CardTitle className="text-sm">EMI Schedule Comparison</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-100">
                      <th className="border-b px-2 py-1.5 text-center w-10">#</th>
                      <th colSpan={3} className="border-b border-r px-2 py-1.5 text-center bg-red-50">
                        <span className="font-medium text-red-700">Original ({interestRate}% FLAT)</span>
                      </th>
                      <th colSpan={3} className="border-b px-2 py-1.5 text-center bg-emerald-50">
                        <span className="font-medium text-emerald-700">Mirror ({selectedMirrorCompany.mirrorInterestRate}% REDUCING)</span>
                      </th>
                    </tr>
                    <tr className="bg-gray-50">
                      <th className="border-b"></th>
                      <th className="border-b border-r px-1 py-1 text-right bg-red-50">Prin</th>
                      <th className="border-b border-r px-1 py-1 text-right bg-red-50">Int</th>
                      <th className="border-b border-r px-1 py-1 text-right bg-red-50 font-medium">EMI</th>
                      <th className="border-b border-r px-1 py-1 text-right bg-emerald-50">Prin</th>
                      <th className="border-b border-r px-1 py-1 text-right bg-emerald-50">Int</th>
                      <th className="border-b px-1 py-1 text-right bg-emerald-50 font-medium">EMI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.max(calculation.originalLoan.schedule.length, calculation.mirrorLoan.schedule.length) }).map((_, index) => {
                      const originalEMI = calculation.originalLoan.schedule[index];
                      const mirrorEMI = calculation.mirrorLoan.schedule[index];
                      const isExtraEMI = index >= calculation.mirrorLoan.schedule.length && originalEMI;

                      return (
                        <tr key={index} className={isExtraEMI ? 'bg-amber-100' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border-b px-2 py-1 text-center font-medium">
                            {index + 1}
                            {isExtraEMI && <Badge className="ml-1 bg-amber-500 text-white text-[10px] px-1">EXTRA</Badge>}
                          </td>
                          <td className="border-b border-r px-1 py-1 text-right">{originalEMI ? formatCurrencyExact(originalEMI.principal) : '-'}</td>
                          <td className="border-b border-r px-1 py-1 text-right text-red-600">{originalEMI ? formatCurrencyExact(originalEMI.interest) : '-'}</td>
                          <td className="border-b border-r px-1 py-1 text-right font-medium">{originalEMI ? formatCurrencyExact(originalEMI.emi) : '-'}</td>
                          <td className="border-b border-r px-1 py-1 text-right">{mirrorEMI ? formatCurrencyExact(mirrorEMI.principal) : (isExtraEMI ? <span className="text-amber-700">Done</span> : '-')}</td>
                          <td className="border-b border-r px-1 py-1 text-right text-emerald-600">{mirrorEMI ? formatCurrencyExact(mirrorEMI.interest) : '-'}</td>
                          <td className="border-b px-1 py-1 text-right font-medium">{mirrorEMI ? formatCurrencyExact(mirrorEMI.emi) : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Payment Flow Note */}
          <Alert className="bg-emerald-50 border-emerald-200">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="text-emerald-800 font-medium text-sm">Payment Flow</AlertTitle>
            <AlertDescription className="text-emerald-700 text-xs">
              Interest-only payments create NEW EMI at next position for both loans. Mirror company records their interest; Company 3 records the difference as profit.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}

export default memo(MirrorLoanSelectionPanel);
