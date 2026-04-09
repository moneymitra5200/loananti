'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductForm {
  title: string;
  description: string;
  icon: string;
  code: string;
  loanType: string;
  minInterestRate: number;
  maxInterestRate: number;
  minTenure: number;
  maxTenure: number;
  minAmount: number;
  maxAmount: number;
  isActive: boolean;
}

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProduct: any;
  productForm: ProductForm;
  setProductForm: (form: ProductForm) => void;
  handleSaveProduct: () => void;
}

export default function ProductDialog({
  open,
  onOpenChange,
  selectedProduct,
  productForm,
  setProductForm,
  handleSaveProduct,
}: ProductDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedProduct ? 'Edit Loan Product' : 'Create Loan Product'}</DialogTitle>
          <DialogDescription>
            {selectedProduct ? 'Update product details' : 'Configure a new loan product for your customers'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Basic Information</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input placeholder="e.g., Gold Loan" value={productForm.title} onChange={(e) => setProductForm({...productForm, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Product Code *</Label>
                <Input placeholder="e.g., GL" maxLength={4} value={productForm.code} onChange={(e) => setProductForm({...productForm, code: e.target.value.toUpperCase()})} className="uppercase" />
                <p className="text-xs text-gray-500">Used for application numbers: GL00001</p>
              </div>
              <div className="space-y-2">
                <Label>Icon (Emoji)</Label>
                <Input placeholder="🏆" value={productForm.icon} onChange={(e) => setProductForm({...productForm, icon: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input placeholder="Short description of the loan product" value={productForm.description} onChange={(e) => setProductForm({...productForm, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loan Type</Label>
                <Select value={productForm.loanType} onValueChange={(v) => setProductForm({...productForm, loanType: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERSONAL">Personal Loan</SelectItem>
                    <SelectItem value="BUSINESS">Business Loan</SelectItem>
                    <SelectItem value="HOME">Home Loan</SelectItem>
                    <SelectItem value="EDUCATION">Education Loan</SelectItem>
                    <SelectItem value="VEHICLE">Vehicle Loan</SelectItem>
                    <SelectItem value="GOLD">Gold Loan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={productForm.isActive ? 'active' : 'inactive'} onValueChange={(v) => setProductForm({...productForm, isActive: v === 'active'})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Interest & Tenure */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Interest Rate & Tenure</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Interest (%)</Label>
                <Input type="number" step="0.1" value={productForm.minInterestRate} onChange={(e) => setProductForm({...productForm, minInterestRate: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Max Interest (%)</Label>
                <Input type="number" step="0.1" value={productForm.maxInterestRate} onChange={(e) => setProductForm({...productForm, maxInterestRate: parseFloat(e.target.value)})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Tenure (months)</Label>
                <Input type="number" value={productForm.minTenure} onChange={(e) => setProductForm({...productForm, minTenure: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Max Tenure (months)</Label>
                <Input type="number" value={productForm.maxTenure} onChange={(e) => setProductForm({...productForm, maxTenure: parseInt(e.target.value)})} />
              </div>
            </div>
          </div>

          {/* Loan Amount */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Loan Amount</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Amount (₹)</Label>
                <Input type="number" value={productForm.minAmount} onChange={(e) => setProductForm({...productForm, minAmount: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Max Amount (₹)</Label>
                <Input type="number" value={productForm.maxAmount} onChange={(e) => setProductForm({...productForm, maxAmount: parseFloat(e.target.value)})} />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleSaveProduct}>
            {selectedProduct ? 'Update Product' : 'Create Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
