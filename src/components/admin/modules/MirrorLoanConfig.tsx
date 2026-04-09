'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RefreshCw, Building2, Calculator, AlertTriangle, Info, CheckCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';

interface MirrorCompany {
  id: string;
  name: string;
  code: string;
  isCompany1: boolean;
  mirrorRate: number | null;
  mirrorType: string;
}

interface SessionForm {
  approvedAmount: number;
  interestRate: number;
  tenure: number;
  emiAmount: number;
  interestType?: string;
}

interface MirrorLoanConfigProps {
  loanId: string;
  sessionForm: SessionForm;
  companyName: string;
  mirrorCompanies: MirrorCompany[];
  onConfigChange: (config: {
    enabled: boolean;
    mirrorCompanyId: string;
    mirrorType: string;
  }) => void;
}

export default function MirrorLoanConfig({
  loanId,
  sessionForm,
  companyName,
  mirrorCompanies,
  onConfigChange
}: MirrorLoanConfigProps) {
  const [enabled, setEnabled] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [mirrorType, setMirrorType] = useState<string>('');
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onConfigChange({
      enabled,
      mirrorCompanyId: selectedCompanyId,
      mirrorType
    });
  }, [enabled, selectedCompanyId, mirrorType, onConfigChange]);

  const fetchPreview = async (companyId: string, type: string) => {
    if (!sessionForm || !companyId) {
      setPreview(null);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `/api/mirror-loan?action=preview&principal=${sessionForm.approvedAmount}&originalRate=${sessionForm.interestRate}&originalTenure=${sessionForm.tenure}&originalType=${sessionForm.interestType || 'FLAT'}&mirrorType=${type}`
      );
      const data = await response.json();
      if (data.success) {
        setPreview(data.calculation);
      }
    } catch (error) {
      console.error('Error fetching mirror preview:', error);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelect = (company: MirrorCompany) => {
    setSelectedCompanyId(company.id);
    setMirrorType(company.mirrorType);
    fetchPreview(company.id, company.mirrorType);
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      setSelectedCompanyId('');
      setMirrorType('');
      setPreview(null);
    }
  };

  if (mirrorCompanies.length === 0) {
    return null;
  }

  return (
    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-purple-600" />
          <h4 className="font-semibold text-purple-800">Mirror Loan Configuration</h4>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="enableMirror"
            checked={enabled}
            onCheckedChange={(checked) => handleToggle(checked as boolean)}
          />
          <Label htmlFor="enableMirror" className="text-sm font-medium text-purple-700 cursor-pointer">
            Enable Mirror Loan
          </Label>
        </div>
      </div>
      
      {enabled && (
        <>
          <div className="space-y-3">
            <Label className="text-sm font-medium text-purple-700">Select Mirror Company</Label>
            <p className="text-xs text-purple-600">
              Choose which company will lend the actual money. The loan will stay with {companyName} for customer display.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {mirrorCompanies.map((company) => (
                <div
                  key={company.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedCompanyId === company.id
                      ? 'border-purple-500 bg-purple-100'
                      : 'border-purple-200 hover:border-purple-400 bg-white'
                  }`}
                  onClick={() => handleCompanySelect(company)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold text-gray-900">{company.name}</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Interest Rate:</span>
                      <span className="font-medium text-purple-700">
                        {company.isCompany1 ? '15%' : `${sessionForm.interestRate}%`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Interest Type:</span>
                      <span className="font-medium text-green-600">REDUCING</span>
                    </div>
                    <Badge className={`mt-2 ${company.isCompany1 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {company.isCompany1 ? '15% Reducing (Lower Cost)' : 'Same Rate Reducing'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {loading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              <span className="ml-2 text-purple-600">Calculating mirror loan...</span>
            </div>
          )}
          
          {preview && !loading && (
            <div className="bg-white p-4 rounded-lg border border-purple-200 space-y-4">
              <h5 className="font-semibold text-purple-800 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                EMI Structure Comparison
              </h5>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Original Loan */}
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-800">Original ({companyName})</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Principal:</span>
                      <span className="font-medium">{formatCurrency(sessionForm.approvedAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">EMI:</span>
                      <span className="font-medium">{formatCurrency(sessionForm.emiAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tenure:</span>
                      <span className="font-medium">{sessionForm.tenure} months</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Rate:</span>
                      <span className="font-medium text-red-600">{sessionForm.interestRate}% FLAT</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 mt-1">
                      <span className="text-gray-500">Total Interest:</span>
                      <span className="font-bold text-red-600">{formatCurrency(preview.originalLoan.totalInterest)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Mirror Loan */}
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium text-emerald-800">Mirror ({mirrorCompanies.find(c => c.id === selectedCompanyId)?.name})</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Principal:</span>
                      <span className="font-medium">{formatCurrency(sessionForm.approvedAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">EMI:</span>
                      <span className="font-medium">{formatCurrency(sessionForm.emiAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tenure:</span>
                      <span className="font-medium">{preview.mirrorLoan.schedule.length} months</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Rate:</span>
                      <span className="font-medium text-emerald-600">
                        {mirrorType === 'COMPANY_1_15_PERCENT' ? '15%' : `${sessionForm.interestRate}%`} REDUCING
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-1 mt-1">
                      <span className="text-gray-500">Total Interest:</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(preview.mirrorLoan.totalInterest)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Extra/Remaining Info */}
              <div className={`p-3 rounded-lg ${preview.extraEMICount > 0 ? 'bg-amber-50 border border-amber-200' : preview.leftoverAmount > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'}`}>
                {preview.extraEMICount > 0 ? (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Extra EMI Payments After Mirror Completion</p>
                      <p className="text-sm text-amber-700 mt-1">
                        After {preview.mirrorLoan.schedule.length} months, customer will pay <strong>{preview.extraEMICount} extra EMI(s)</strong> of {formatCurrency(sessionForm.emiAmount)}.
                      </p>
                      <p className="text-sm font-medium text-amber-800 mt-1">
                        Extra Amount: {formatCurrency(preview.extraEMICount * sessionForm.emiAmount)} → Goes to {companyName} as profit
                      </p>
                    </div>
                  </div>
                ) : preview.leftoverAmount > 0 ? (
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800">Remaining Balance</p>
                      <p className="text-sm text-blue-700 mt-1">
                        After paying all EMIs, <strong>{formatCurrency(preview.leftoverAmount)}</strong> will remain as balance.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="font-medium text-green-800">Perfect EMI Match - No extra or remaining amount</p>
                  </div>
                )}
              </div>
              
              {/* Interest Savings */}
              <div className="p-3 bg-purple-100 rounded-lg border border-purple-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600">Interest Savings</p>
                    <p className="text-xl font-bold text-purple-800">
                      {formatCurrency(preview.originalLoan.totalInterest - preview.mirrorLoan.totalInterest)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-600">Mirror Completes In</p>
                    <p className="text-xl font-bold text-purple-800">
                      {preview.mirrorLoan.schedule.length} / {sessionForm.tenure} months
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
