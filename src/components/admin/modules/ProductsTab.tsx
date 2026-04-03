'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Edit, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  description: string;
  icon: string;
  code: string;
  isActive: boolean;
  isPermanent: boolean;
  minInterestRate: number;
  maxInterestRate: number;
  minTenure: number;
  maxTenure: number;
  minAmount: number;
  maxAmount: number;
}

interface ProductsTabProps {
  products: Product[];
  setShowProductDialog: (show: boolean) => void;
  setSelectedProduct: (product: Product | null) => void;
  setProductForm: (form: any) => void;
  openEditProduct: (product: Product) => void;
  handleDeleteProduct: (id: string) => void;
}

export default function ProductsTab({
  products,
  setShowProductDialog,
  setSelectedProduct,
  setProductForm,
  openEditProduct,
  handleDeleteProduct
}: ProductsTabProps) {
  const handleAddProduct = () => {
    setSelectedProduct(null);
    setProductForm({
      title: '', description: '', icon: '💰', code: '', loanType: 'PERSONAL',
      minInterestRate: 8, maxInterestRate: 24, defaultInterestRate: 12,
      minTenure: 6, maxTenure: 60, defaultTenure: 12,
      minAmount: 10000, maxAmount: 10000000,
      processingFeePercent: 1, processingFeeMin: 500, processingFeeMax: 10000,
      latePaymentPenaltyPercent: 2, gracePeriodDays: 5, bounceCharges: 500,
      allowMoratorium: true, maxMoratoriumMonths: 3,
      allowPrepayment: true, prepaymentCharges: 2, isActive: true
    });
    setShowProductDialog(true);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Loan Products</CardTitle>
              <CardDescription>Manage loan products and their configurations</CardDescription>
            </div>
            <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleAddProduct}>
              <Plus className="h-4 w-4 mr-2" />Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No loan products configured</p>
              <Button className="mt-4 bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowProductDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />Create First Product
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <Card key={product.id} className={`border hover:shadow-md transition-shadow ${!product.isActive ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-2xl">
                          {product.icon || '💰'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold">{product.title}</h4>
                            {product.code && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-mono">
                                {product.code}
                              </Badge>
                            )}
                            {!product.isActive && <Badge variant="secondary">Inactive</Badge>}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {product.minInterestRate}% - {product.maxInterestRate}% p.a.
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {product.minTenure}-{product.maxTenure} months
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            ₹{Number(product.minAmount).toLocaleString()} - ₹{Number(product.maxAmount).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button size="sm" variant="outline" onClick={() => openEditProduct(product)}>
                        <Edit className="h-3 w-3 mr-1" />Edit
                      </Button>
                      {!product.isPermanent && (
                        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash2 className="h-3 w-3 mr-1" />Delete
                        </Button>
                      )}
                      {product.isPermanent && (
                        <Badge variant="secondary" className="text-xs">Permanent</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
