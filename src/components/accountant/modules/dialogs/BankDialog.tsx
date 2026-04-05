'use client';

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BankForm, Company } from '../../types';
import { Upload, X, QrCode, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankForm: BankForm;
  setBankForm: React.Dispatch<React.SetStateAction<BankForm>>;
  selectedCompany: Company | undefined;
  onSubmit: () => void;
}

export default function BankDialog({ 
  open, 
  onOpenChange, 
  bankForm, 
  setBankForm, 
  selectedCompany,
  onSubmit 
}: BankDialogProps) {
  const [uploadingQR, setUploadingQR] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploadingQR(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'qr-code');

      const res = await fetch('/api/upload/qr-code', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setBankForm(prev => ({ ...prev, qrCodeUrl: data.url }));
        toast.success('QR Code uploaded successfully');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to upload QR code');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload QR code');
    } finally {
      setUploadingQR(false);
    }
  };

  const removeQRCode = () => {
    setBankForm(prev => ({ ...prev, qrCodeUrl: '' }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add Bank Account
          </DialogTitle>
          <DialogDescription>
            Add a bank account for {selectedCompany?.name || 'your company'}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Bank Details</TabsTrigger>
            <TabsTrigger value="payment">Payment Info</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 mt-4">
            <div>
              <Label>Bank Name *</Label>
              <Input 
                value={bankForm.bankName} 
                onChange={(e) => setBankForm(prev => ({ ...prev, bankName: e.target.value }))}
                placeholder="State Bank of India"
              />
            </div>
            <div>
              <Label>Account Number *</Label>
              <Input 
                value={bankForm.accountNumber} 
                onChange={(e) => setBankForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                placeholder="1234567890"
              />
            </div>
            <div>
              <Label>Account Name</Label>
              <Input 
                value={bankForm.accountName} 
                onChange={(e) => setBankForm(prev => ({ ...prev, accountName: e.target.value }))}
                placeholder="Company Account Name"
              />
            </div>
            <div>
              <Label>Bank Owner Name</Label>
              <Input 
                value={bankForm.ownerName} 
                onChange={(e) => setBankForm(prev => ({ ...prev, ownerName: e.target.value }))}
                placeholder="Name of bank account owner"
              />
              <p className="text-xs text-gray-500 mt-1">
                This name will be shown to customers for payment verification
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>IFSC Code</Label>
                <Input 
                  value={bankForm.ifscCode} 
                  onChange={(e) => setBankForm(prev => ({ ...prev, ifscCode: e.target.value }))}
                  placeholder="SBIN0001234"
                />
              </div>
              <div>
                <Label>Branch Name</Label>
                <Input 
                  value={bankForm.branchName} 
                  onChange={(e) => setBankForm(prev => ({ ...prev, branchName: e.target.value }))}
                  placeholder="Main Branch"
                />
              </div>
            </div>
            <div>
              <Label>Opening Balance</Label>
              <Input 
                type="number"
                value={bankForm.openingBalance} 
                onChange={(e) => setBankForm(prev => ({ ...prev, openingBalance: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={bankForm.isDefault}
                onChange={(e) => setBankForm(prev => ({ ...prev, isDefault: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="isDefault">Set as default bank account</Label>
            </div>
          </TabsContent>
          
          <TabsContent value="payment" className="space-y-4 mt-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Payment Display Settings
              </h4>
              <p className="text-sm text-blue-600">
                These details will be shown to customers when they pay EMI online
              </p>
            </div>
            
            <div>
              <Label>UPI ID</Label>
              <Input 
                value={bankForm.upiId} 
                onChange={(e) => setBankForm(prev => ({ ...prev, upiId: e.target.value }))}
                placeholder="company@upi"
              />
              <p className="text-xs text-gray-500 mt-1">
                Customers will use this UPI ID to make payments
              </p>
            </div>
            
            <div>
              <Label>QR Code Image</Label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleQRUpload}
                className="hidden"
              />
              
              {bankForm.qrCodeUrl ? (
                <div className="relative mt-2 inline-block">
                  <img 
                    src={bankForm.qrCodeUrl} 
                    alt="QR Code" 
                    className="w-48 h-48 object-contain border rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={removeQRCode}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors"
                >
                  {uploadingQR ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                      <span className="text-sm text-gray-500">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <span className="text-sm text-gray-500">
                        Click to upload QR code image
                      </span>
                      <span className="text-xs text-gray-400">
                        PNG, JPG up to 5MB
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit}>Add Bank Account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
