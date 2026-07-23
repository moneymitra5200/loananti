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
  Hash,
  Star,
} from 'lucide-react';

interface SilverLoanReceiptData {
  grossWeight: number;
  netWeight: number;
  silverRate: number;
  purity: string;          // e.g. "999", "925 Sterling", "Fine Silver"
  valuationAmount: number;
  loanAmount: number;
  ownerName: string;
  silverItemPhoto: string;
  numberOfItems: number;
  itemDescription: string;
  verificationDate: string;
  verifiedBy: string;
  remarks: string;
}

interface SilverLoanReceiptProps {
  data: Partial<SilverLoanReceiptData>;
  onChange: (data: Partial<SilverLoanReceiptData>) => void;
  readOnly?: boolean;
}

export default function SilverLoanReceipt({ data, onChange, readOnly = false }: SilverLoanReceiptProps) {
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleInputChange = (field: keyof SilverLoanReceiptData, value: string | number) => {
    onChange({ ...data, [field]: value });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', 'silver_item');

      const res = await fetch('/api/upload/document', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        onChange({ ...data, silverItemPhoto: result.url });
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
    const silverRate = data.silverRate || 0;
    return netWeight * silverRate;
  };

  const suggestedLoanAmount = () => {
    const valuation = calculateValuation();
    // Typically 60–70 % for silver
    return Math.round(valuation * 0.65);
  };

  return (
    <Card className="border-2 border-slate-300 bg-gradient-to-br from-slate-50 to-gray-100">
      <CardHeader className="bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="h-5 w-5" />
          Silver Loan Receipt
          <Badge variant="secondary" className="ml-auto bg-white/20 text-white">
            Mandatory Document
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-6">

        {/* Silver Item Details */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
            <Weight className="h-4 w-4" />
            Silver Item Details
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
                placeholder="e.g., 150.5"
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
                placeholder="e.g., 145.0"
                disabled={readOnly}
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Purity
              </Label>
              <Input
                value={data.purity || ''}
                onChange={(e) => handleInputChange('purity', e.target.value)}
                placeholder="e.g., 999, 925"
                disabled={readOnly}
                className="bg-white"
              />
              <p className="text-xs text-gray-500">999 / 925 Sterling / Fine</p>
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
                placeholder="e.g., 5"
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
              placeholder="e.g., Silver bangles, silver coins, silver necklace..."
              disabled={readOnly}
              className="bg-white"
            />
          </div>
        </div>

        {/* Valuation Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
            <IndianRupee className="h-4 w-4" />
            Valuation &amp; Loan Amount
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <IndianRupee className="h-3 w-3" />
                Silver Rate (₹/g) *
              </Label>
              <Input
                type="number"
                step="0.01"
                value={data.silverRate || ''}
                onChange={(e) => handleInputChange('silverRate', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 85"
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
              <p className="text-xs text-gray-500">Auto: Net Weight × Silver Rate</p>
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
                  placeholder="e.g., 6000"
                  disabled={readOnly}
                  className="bg-slate-50 pl-7 font-bold text-slate-800"
                />
              </div>
              <p className="text-xs text-slate-600">
                Suggested: ₹{suggestedLoanAmount().toLocaleString()} (65% of valuation)
              </p>
            </div>
          </div>
        </div>

        {/* Owner Details */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
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
          <h3 className="font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
            <Camera className="h-4 w-4" />
            Silver Item Photo
          </h3>

          <div className="flex items-start gap-4">
            {data.silverItemPhoto ? (
              <div className="relative">
                <img
                  src={data.silverItemPhoto}
                  alt="Silver Item"
                  className="w-32 h-32 object-cover rounded-lg border-2 border-slate-300"
                />
                {!readOnly && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={() => onChange({ ...data, silverItemPhoto: '' })}
                  >
                    ×
                  </Button>
                )}
              </div>
            ) : (
              <label
                className={`flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 ${
                  readOnly ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Camera className="h-8 w-8 text-slate-400" />
                <span className="text-xs text-slate-500 mt-2">
                  {uploadingPhoto ? 'Uploading…' : 'Upload Photo'}
                </span>
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
                placeholder="Any additional notes about the silver item..."
                disabled={readOnly}
                className="bg-white"
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-gradient-to-r from-slate-100 to-gray-200 rounded-lg border border-slate-300">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-slate-500">Net Weight</p>
              <p className="text-lg font-bold text-slate-700">{data.netWeight || 0} g</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Silver Rate</p>
              <p className="text-lg font-bold text-slate-700">₹{data.silverRate?.toLocaleString() || 0}/g</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Valuation</p>
              <p className="text-lg font-bold text-slate-700">
                ₹{(data.valuationAmount || calculateValuation())?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Loan Amount</p>
              <p className="text-lg font-bold text-emerald-700">₹{data.loanAmount?.toLocaleString() || 0}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-300 text-center">
            <p className="text-sm text-slate-600">
              LTV Ratio:{' '}
              {data.valuationAmount && data.loanAmount
                ? ((data.loanAmount / data.valuationAmount) * 100).toFixed(1)
                : 0}
              % (Max recommended: 65%)
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
