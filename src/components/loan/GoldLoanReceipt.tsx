'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Weight, 
  IndianRupee, 
  User, 
  Camera, 
  FileText, 
  Calendar, 
  Percent, 
  Hash,
  Sparkles
} from 'lucide-react';

interface GoldLoanReceiptData {
  grossWeight: number;
  netWeight: number;
  goldRate: number;
  valuationAmount: number;
  loanAmount: number;
  ownerName: string;
  goldItemPhoto: string;
  karat: number;
  numberOfItems: number;
  itemDescription: string;
  verificationDate: string;
  verifiedBy: string;
  remarks: string;
}

interface GoldLoanReceiptProps {
  data: Partial<GoldLoanReceiptData>;
  onChange: (data: Partial<GoldLoanReceiptData>) => void;
  readOnly?: boolean;
}

export default function GoldLoanReceipt({ data, onChange, readOnly = false }: GoldLoanReceiptProps) {
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleInputChange = (field: keyof GoldLoanReceiptData, value: string | number) => {
    onChange({ ...data, [field]: value });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', 'gold_item');

      const res = await fetch('/api/upload/document', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const result = await res.json();
        onChange({ ...data, goldItemPhoto: result.url });
      } else {
        const error = await res.json();
        console.error('Photo upload error:', error);
        alert('Failed to upload photo: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const calculateValuation = () => {
    const netWeight = data.netWeight || 0;
    const goldRate = data.goldRate || 0;
    return netWeight * goldRate;
  };

  const suggestedLoanAmount = () => {
    const valuation = calculateValuation();
    // Typically 75-85% of gold valuation
    return Math.round(valuation * 0.75);
  };

  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
      <CardHeader className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5" />
          Gold Loan Receipt
          <Badge variant="secondary" className="ml-auto bg-white/20 text-white">
            Mandatory Document
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Gold Item Details */}
        <div className="space-y-4">
          <h3 className="font-semibold text-amber-800 flex items-center gap-2 border-b pb-2">
            <Weight className="h-4 w-4" />
            Gold Item Details
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Weight className="h-3 w-3" />
                Gross Weight (g) *
              </Label>
              <Input
                type="number"
                step="0.01"
                value={data.grossWeight || ''}
                onChange={(e) => handleInputChange('grossWeight', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 25.5"
                disabled={readOnly}
                className="bg-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Weight className="h-3 w-3" />
                Net Weight (g) *
              </Label>
              <Input
                type="number"
                step="0.01"
                value={data.netWeight || ''}
                onChange={(e) => handleInputChange('netWeight', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 23.5"
                disabled={readOnly}
                className="bg-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Percent className="h-3 w-3" />
                Gold Karat
              </Label>
              <Input
                type="number"
                value={data.karat || ''}
                onChange={(e) => handleInputChange('karat', parseInt(e.target.value) || 0)}
                placeholder="e.g., 22"
                disabled={readOnly}
                className="bg-white"
              />
              <p className="text-xs text-gray-500">22K, 24K, etc.</p>
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                Number of Items
              </Label>
              <Input
                type="number"
                value={data.numberOfItems || ''}
                onChange={(e) => handleInputChange('numberOfItems', parseInt(e.target.value) || 0)}
                placeholder="e.g., 3"
                disabled={readOnly}
                className="bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Item Description</Label>
            <Input
              value={data.itemDescription || ''}
              onChange={(e) => handleInputChange('itemDescription', e.target.value)}
              placeholder="e.g., Gold chain, 2 gold rings, gold bangles..."
              disabled={readOnly}
              className="bg-white"
            />
          </div>
        </div>

        {/* Valuation Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-amber-800 flex items-center gap-2 border-b pb-2">
            <IndianRupee className="h-4 w-4" />
            Valuation & Loan Amount
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <IndianRupee className="h-3 w-3" />
                Gold Rate (₹/g) *
              </Label>
              <Input
                type="number"
                step="0.01"
                value={data.goldRate || ''}
                onChange={(e) => handleInputChange('goldRate', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 5500"
                disabled={readOnly}
                className="bg-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <IndianRupee className="h-3 w-3" />
                Valuation Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  value={data.valuationAmount || calculateValuation()}
                  onChange={(e) => handleInputChange('valuationAmount', parseFloat(e.target.value) || 0)}
                  disabled={readOnly}
                  className="bg-emerald-50 pl-7 font-medium"
                />
              </div>
              <p className="text-xs text-gray-500">Auto: Net Weight × Gold Rate</p>
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <IndianRupee className="h-3 w-3" />
                Loan Amount *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  value={data.loanAmount || ''}
                  onChange={(e) => handleInputChange('loanAmount', parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 95000"
                  disabled={readOnly}
                  className="bg-amber-50 pl-7 font-bold text-amber-800"
                />
              </div>
              <p className="text-xs text-amber-600">Suggested: ₹{suggestedLoanAmount().toLocaleString()} (75% of valuation)</p>
            </div>
          </div>
        </div>

        {/* Owner Details */}
        <div className="space-y-4">
          <h3 className="font-semibold text-amber-800 flex items-center gap-2 border-b pb-2">
            <User className="h-4 w-4" />
            Owner Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Owner Name *
              </Label>
              <Input
                value={data.ownerName || ''}
                onChange={(e) => handleInputChange('ownerName', e.target.value)}
                placeholder="Enter owner's full name"
                disabled={readOnly}
                className="bg-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Verification Date
              </Label>
              <Input
                type="date"
                value={data.verificationDate || new Date().toISOString().slice(0, 10)}
                onChange={(e) => handleInputChange('verificationDate', e.target.value)}
                disabled={readOnly}
                className="bg-white"
              />
            </div>
          </div>
        </div>

        {/* Photo Upload */}
        <div className="space-y-4">
          <h3 className="font-semibold text-amber-800 flex items-center gap-2 border-b pb-2">
            <Camera className="h-4 w-4" />
            Gold Item Photo
          </h3>
          
          <div className="flex items-start gap-4">
            {data.goldItemPhoto ? (
              <div className="relative">
                <img
                  src={data.goldItemPhoto}
                  alt="Gold Item"
                  className="w-32 h-32 object-cover rounded-lg border-2 border-amber-300"
                />
                {!readOnly && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={() => onChange({ ...data, goldItemPhoto: '' })}
                  >
                    ×
                  </Button>
                )}
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-50 ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Camera className="h-8 w-8 text-amber-400" />
                <span className="text-xs text-amber-600 mt-2">Upload Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={readOnly || uploadingPhoto}
                />
              </label>
            )}
            
            <div className="flex-1 space-y-2">
              <Label>Remarks</Label>
              <Input
                value={data.remarks || ''}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                placeholder="Any additional notes about the gold item..."
                disabled={readOnly}
                className="bg-white"
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-lg border border-amber-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-amber-600">Net Weight</p>
              <p className="text-lg font-bold text-amber-800">{data.netWeight || 0} g</p>
            </div>
            <div>
              <p className="text-xs text-amber-600">Gold Rate</p>
              <p className="text-lg font-bold text-amber-800">₹{data.goldRate?.toLocaleString() || 0}/g</p>
            </div>
            <div>
              <p className="text-xs text-amber-600">Valuation</p>
              <p className="text-lg font-bold text-amber-800">₹{(data.valuationAmount || calculateValuation())?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-amber-600">Loan Amount</p>
              <p className="text-lg font-bold text-emerald-700">₹{data.loanAmount?.toLocaleString() || 0}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-200 text-center">
            <p className="text-sm text-amber-700">
              LTV Ratio: {data.valuationAmount && data.loanAmount ? 
                ((data.loanAmount / data.valuationAmount) * 100).toFixed(1) : 0}% 
              (Max recommended: 75%)
            </p>
          </div>
        </div>

        {/* Verified By */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Verified By: {data.verifiedBy || 'Staff Name'}</span>
          </div>
          <span>Receipt Generated: {new Date().toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
