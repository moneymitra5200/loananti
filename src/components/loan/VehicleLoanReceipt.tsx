'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  IndianRupee, 
  User, 
  Camera, 
  FileText, 
  Calendar, 
  Hash,
  Truck,
  Bike,
  Bus,
  Wrench,
  Gauge
} from 'lucide-react';

interface VehicleLoanReceiptData {
  vehicleType: string;
  vehicleNumber: string;
  manufacturer: string;
  model: string;
  yearOfManufacture: number;
  valuationAmount: number;
  loanAmount: number;
  ownerName: string;
  rcBookPhoto: string;
  vehiclePhoto: string;
  chassisNumber: string;
  engineNumber: string;
  fuelType: string;
  color: string;
  verificationDate: string;
  verifiedBy: string;
  remarks: string;
}

interface VehicleLoanReceiptProps {
  data: Partial<VehicleLoanReceiptData>;
  onChange: (data: Partial<VehicleLoanReceiptData>) => void;
  readOnly?: boolean;
}

const vehicleTypes = [
  { value: 'CAR', label: 'Car', icon: Car },
  { value: 'BIKE', label: 'Motorcycle/Scooter', icon: Bike },
  { value: 'TRUCK', label: 'Truck/Commercial', icon: Truck },
  { value: 'BUS', label: 'Bus', icon: Bus },
  { value: 'TRACTOR', label: 'Tractor', icon: Wrench },
  { value: 'THREE_WHEELER', label: 'Three Wheeler', icon: Truck },
];

const fuelTypes = [
  { value: 'PETROL', label: 'Petrol' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'ELECTRIC', label: 'Electric' },
  { value: 'CNG', label: 'CNG' },
  { value: 'HYBRID', label: 'Hybrid' },
];

export default function VehicleLoanReceipt({ data, onChange, readOnly = false }: VehicleLoanReceiptProps) {
  const [uploadingRcPhoto, setUploadingRcPhoto] = useState(false);
  const [uploadingVehiclePhoto, setUploadingVehiclePhoto] = useState(false);

  const handleInputChange = (field: keyof VehicleLoanReceiptData, value: string | number) => {
    onChange({ ...data, [field]: value });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'rcBook' | 'vehicle') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (type === 'rcBook') setUploadingRcPhoto(true);
      else setUploadingVehiclePhoto(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', `vehicle_${type}`);

      const res = await fetch('/api/upload/document', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const result = await res.json();
        if (type === 'rcBook') {
          onChange({ ...data, rcBookPhoto: result.url });
        } else {
          onChange({ ...data, vehiclePhoto: result.url });
        }
      } else {
        const error = await res.json();
        console.error('Photo upload error:', error);
        alert('Failed to upload photo: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      if (type === 'rcBook') setUploadingRcPhoto(false);
      else setUploadingVehiclePhoto(false);
    }
  };

  const suggestedLoanAmount = () => {
    const valuation = data.valuationAmount || 0;
    // Typically 70-85% of vehicle valuation
    return Math.round(valuation * 0.75);
  };

  const selectedVehicleType = vehicleTypes.find(v => v.value === data.vehicleType);
  const VehicleIcon = selectedVehicleType?.icon || Car;

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-sky-500 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-lg">
          <VehicleIcon className="h-5 w-5" />
          Vehicle Loan Receipt
          <Badge variant="secondary" className="ml-auto bg-white/20 text-white">
            Mandatory Document
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Vehicle Details */}
        <div className="space-y-4">
          <h3 className="font-semibold text-blue-800 flex items-center gap-2 border-b pb-2">
            <Car className="h-4 w-4" />
            Vehicle Details
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Car className="h-3 w-3" />
                Vehicle Type *
              </Label>
              <select
                value={data.vehicleType || ''}
                onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                disabled={readOnly}
                className="w-full px-3 py-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Type</option>
                {vehicleTypes.map(v => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                Vehicle Number *
              </Label>
              <Input
                value={data.vehicleNumber || ''}
                onChange={(e) => handleInputChange('vehicleNumber', e.target.value.toUpperCase())}
                placeholder="e.g., MH12AB1234"
                disabled={readOnly}
                className="bg-white uppercase"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Manufacturer *</Label>
              <Input
                value={data.manufacturer || ''}
                onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                placeholder="e.g., Maruti, Honda"
                disabled={readOnly}
                className="bg-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                value={data.model || ''}
                onChange={(e) => handleInputChange('model', e.target.value)}
                placeholder="e.g., Swift, City"
                disabled={readOnly}
                className="bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Year of Manufacture</Label>
              <Input
                type="number"
                value={data.yearOfManufacture || ''}
                onChange={(e) => handleInputChange('yearOfManufacture', parseInt(e.target.value) || 0)}
                placeholder="e.g., 2022"
                min="1990"
                max={new Date().getFullYear() + 1}
                disabled={readOnly}
                className="bg-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Fuel Type</Label>
              <select
                value={data.fuelType || ''}
                onChange={(e) => handleInputChange('fuelType', e.target.value)}
                disabled={readOnly}
                className="w-full px-3 py-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Fuel Type</option>
                {fuelTypes.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                value={data.color || ''}
                onChange={(e) => handleInputChange('color', e.target.value)}
                placeholder="e.g., White, Red"
                disabled={readOnly}
                className="bg-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Owner Name *</Label>
              <Input
                value={data.ownerName || ''}
                onChange={(e) => handleInputChange('ownerName', e.target.value)}
                placeholder="Enter owner's name"
                disabled={readOnly}
                className="bg-white"
              />
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="space-y-4">
          <h3 className="font-semibold text-blue-800 flex items-center gap-2 border-b pb-2">
            <Wrench className="h-4 w-4" />
            Technical Details (RC Book)
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Chassis Number</Label>
              <Input
                value={data.chassisNumber || ''}
                onChange={(e) => handleInputChange('chassisNumber', e.target.value.toUpperCase())}
                placeholder="Enter chassis number"
                disabled={readOnly}
                className="bg-white uppercase font-mono text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Engine Number</Label>
              <Input
                value={data.engineNumber || ''}
                onChange={(e) => handleInputChange('engineNumber', e.target.value.toUpperCase())}
                placeholder="Enter engine number"
                disabled={readOnly}
                className="bg-white uppercase font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Valuation Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-blue-800 flex items-center gap-2 border-b pb-2">
            <IndianRupee className="h-4 w-4" />
            Valuation & Loan Amount
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                Valuation Amount *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  value={data.valuationAmount || ''}
                  onChange={(e) => handleInputChange('valuationAmount', parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 500000"
                  disabled={readOnly}
                  className="bg-emerald-50 pl-7 font-medium"
                />
              </div>
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
                  placeholder="e.g., 375000"
                  disabled={readOnly}
                  className="bg-blue-50 pl-7 font-bold text-blue-800"
                />
              </div>
              <p className="text-xs text-blue-600">Suggested: ₹{suggestedLoanAmount().toLocaleString()} (75% of valuation)</p>
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
          <h3 className="font-semibold text-blue-800 flex items-center gap-2 border-b pb-2">
            <Camera className="h-4 w-4" />
            Documents & Photos
          </h3>
          
          <div className="flex flex-wrap gap-6">
            {/* RC Book Photo */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">RC Book Photo *</Label>
              {data.rcBookPhoto ? (
                <div className="relative">
                  <img
                    src={data.rcBookPhoto}
                    alt="RC Book"
                    className="w-40 h-28 object-cover rounded-lg border-2 border-blue-300"
                  />
                  {!readOnly && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => onChange({ ...data, rcBookPhoto: '' })}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center w-40 h-28 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <FileText className="h-8 w-8 text-blue-400" />
                  <span className="text-xs text-blue-600 mt-1">Upload RC Book</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, 'rcBook')}
                    disabled={readOnly || uploadingRcPhoto}
                  />
                </label>
              )}
            </div>
            
            {/* Vehicle Photo */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Vehicle Photo *</Label>
              {data.vehiclePhoto ? (
                <div className="relative">
                  <img
                    src={data.vehiclePhoto}
                    alt="Vehicle"
                    className="w-40 h-28 object-cover rounded-lg border-2 border-blue-300"
                  />
                  {!readOnly && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => onChange({ ...data, vehiclePhoto: '' })}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center w-40 h-28 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Camera className="h-8 w-8 text-blue-400" />
                  <span className="text-xs text-blue-600 mt-1">Upload Vehicle Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, 'vehicle')}
                    disabled={readOnly || uploadingVehiclePhoto}
                  />
                </label>
              )}
            </div>
          </div>
          
          {/* Remarks */}
          <div className="space-y-2 mt-4">
            <Label>Remarks</Label>
            <Input
              value={data.remarks || ''}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              placeholder="Any additional notes about the vehicle..."
              disabled={readOnly}
              className="bg-white"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-gradient-to-r from-blue-100 to-sky-100 rounded-lg border border-blue-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-xs text-blue-600">Vehicle Type</p>
              <p className="text-lg font-bold text-blue-800">{selectedVehicleType?.label || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-blue-600">Vehicle Number</p>
              <p className="text-lg font-bold text-blue-800">{data.vehicleNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-blue-600">Manufacturer</p>
              <p className="text-lg font-bold text-blue-800">{data.manufacturer || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-blue-600">Valuation</p>
              <p className="text-lg font-bold text-blue-800">₹{data.valuationAmount?.toLocaleString() || 0}</p>
            </div>
            <div>
              <p className="text-xs text-blue-600">Loan Amount</p>
              <p className="text-lg font-bold text-emerald-700">₹{data.loanAmount?.toLocaleString() || 0}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-200 text-center">
            <p className="text-sm text-blue-700">
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
