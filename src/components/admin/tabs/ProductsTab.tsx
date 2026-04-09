'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';

interface Product {
  id: string;
  title: string;
  description: string;
  icon: string;
  isPermanent?: boolean;
  isActive: boolean;
  minInterestRate: number;
  maxInterestRate: number;
  minTenure: number;
  maxTenure: number;
  minAmount: number;
  maxAmount: number;
}

interface ProductsTabProps {
  products: Product[];
  openEditProduct: (product: Product) => void;
  handleDeleteProduct: (id: string) => void;
  setShowProductDialog: (show: boolean) => void;
}

export default function ProductsTab({
  products,
  openEditProduct,
  handleDeleteProduct,
  setShowProductDialog
}: ProductsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowProductDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />Add Product
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card key={product.id} className="border shadow-sm hover:shadow-md transition-shadow bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{product.icon || '💰'}</span>
                  <CardTitle className="text-lg">{product.title}</CardTitle>
                </div>
                <Badge className={product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                  {product.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Interest</p>
                  <p className="font-medium">{product.minInterestRate}% - {product.maxInterestRate}%</p>
                </div>
                <div>
                  <p className="text-gray-500">Tenure</p>
                  <p className="font-medium">{product.minTenure} - {product.maxTenure} mo</p>
                </div>
                <div>
                  <p className="text-gray-500">Min Amount</p>
                  <p className="font-medium">{formatCurrency(product.minAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Max Amount</p>
                  <p className="font-medium">{formatCurrency(product.maxAmount)}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditProduct(product)}>
                  <Edit className="h-4 w-4 mr-1" />Edit
                </Button>
                {!product.isPermanent && (
                  <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteProduct(product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
