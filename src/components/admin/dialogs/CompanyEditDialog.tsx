'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Percent, Calculator, RefreshCw, Save, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Company {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  defaultInterestRate?: number;
  defaultInterestType?: string;
  enableMirrorLoan?: boolean;
  mirrorInterestRate?: number | null;
  mirrorInterestType?: string;
  maxLoanAmount?: number;
  minLoanAmount?: number;
  maxTenureMonths?: number;
}

interface CompanyEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  onSuccess: () => void;
}

export default function CompanyEditDialog({
  open,
  onOpenChange,
  company,
  onSuccess
}: CompanyEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    defaultInterestRate: 12,
    defaultInterestType: 'FLAT',
    enableMirrorLoan: false,
    mirrorInterestRate: null as number | null,
    mirrorInterestType: 'REDUCING',
    maxLoanAmount: 10000000,
    minLoanAmount: 10000,
    maxTenureMonths: 60
  });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        defaultInterestRate: company.defaultInterestRate ?? 12,
        defaultInterestType: company.defaultInterestType ?? 'FLAT',
        enableMirrorLoan: company.enableMirrorLoan ?? false,
        mirrorInterestRate: company.mirrorInterestRate ?? null,
        mirrorInterestType: company.mirrorInterestType ?? 'REDUCING',
        maxLoanAmount: company.maxLoanAmount ?? 10000000,
        minLoanAmount: company.minLoanAmount ?? 10000,
        maxTenureMonths: company.maxTenureMonths ?? 60
      });
    }
  }, [company]);

  const handleSave = async () => {
    if (!company) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: company.id,
          ...formData
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({ title: 'Success', description: 'Company settings updated successfully' });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update company', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error updating company:', error);
      toast({ title: 'Error', description: 'Failed to update company', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Edit Company Settings
          </DialogTitle>
          <DialogDescription>
            {company.name} ({company.code})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Interest Settings */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <h4 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Interest Settings
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Interest Rate (% p.a.)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.defaultInterestRate}
                    onChange={(e) => setFormData({ ...formData, defaultInterestRate: parseFloat(e.target.value) || 12 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Interest Type</Label>
                  <Select
                    value={formData.defaultInterestType}
                    onValueChange={(value) => setFormData({ ...formData, defaultInterestType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FLAT">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-orange-100 text-orange-700">FLAT</Badge>
                          <span className="text-sm">Fixed on Principal</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="REDUCING">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-700">REDUCING</Badge>
                          <span className="text-sm">On Outstanding Balance</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  <strong>FLAT:</strong> Interest calculated on full principal for entire tenure. Higher total interest.
                </p>
                <p className="text-sm text-green-700 mt-1">
                  <strong>REDUCING:</strong> Interest calculated on outstanding balance. Lower total interest.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Mirror Loan Settings */}
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-purple-800 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Mirror Loan Settings
                </h4>
                <div className="flex items-center gap-2">
                  <Switch
                    id="enableMirror"
                    checked={formData.enableMirrorLoan}
                    onCheckedChange={(checked) => setFormData({ ...formData, enableMirrorLoan: checked })}
                  />
                  <Label htmlFor="enableMirror" className="text-sm font-medium text-purple-700">
                    Enable Mirror Loan
                  </Label>
                </div>
              </div>

              {formData.enableMirrorLoan && (
                <div className="space-y-4 mt-4">
                  <p className="text-sm text-purple-600">
                    When enabled, loans from this company can be mirrored to another lending company.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Mirror Interest Rate (% p.a.)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Leave empty to use default"
                        value={formData.mirrorInterestRate || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          mirrorInterestRate: e.target.value ? parseFloat(e.target.value) : null 
                        })}
                      />
                      <p className="text-xs text-purple-500">
                        Leave empty to use the company's default rate
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Mirror Interest Type</Label>
                      <Select
                        value={formData.mirrorInterestType}
                        onValueChange={(value) => setFormData({ ...formData, mirrorInterestType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FLAT">
                            <Badge className="bg-orange-100 text-orange-700">FLAT</Badge>
                          </SelectItem>
                          <SelectItem value="REDUCING">
                            <Badge className="bg-green-100 text-green-700">REDUCING</Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-purple-200">
                    <div className="flex items-start gap-2">
                      <Calculator className="h-4 w-4 text-purple-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-purple-800">Mirror Loan Flow:</p>
                        <p className="text-purple-600 mt-1">
                          1. Original loan created with {formData.defaultInterestType} interest at {formData.defaultInterestRate}%<br/>
                          2. Mirror loan uses {formData.mirrorInterestType} interest at {formData.mirrorInterestRate || formData.defaultInterestRate}%<br/>
                          3. Customer pays original EMI, mirror EMI settles automatically
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loan Limits */}
          <Card className="border-gray-200 bg-gray-50/50">
            <CardContent className="p-4">
              <h4 className="font-semibold text-gray-800 mb-4">Loan Limits</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Min Amount (₹)</Label>
                  <Input
                    type="number"
                    value={formData.minLoanAmount}
                    onChange={(e) => setFormData({ ...formData, minLoanAmount: parseInt(e.target.value) || 10000 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Amount (₹)</Label>
                  <Input
                    type="number"
                    value={formData.maxLoanAmount}
                    onChange={(e) => setFormData({ ...formData, maxLoanAmount: parseInt(e.target.value) || 10000000 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Tenure (months)</Label>
                  <Input
                    type="number"
                    value={formData.maxTenureMonths}
                    onChange={(e) => setFormData({ ...formData, maxTenureMonths: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            className="bg-emerald-500 hover:bg-emerald-600"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
