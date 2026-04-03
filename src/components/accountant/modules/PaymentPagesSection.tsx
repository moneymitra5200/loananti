'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, QrCode, Users, Loader2 } from 'lucide-react';

interface PaymentPage {
  id: string;
  qrCodeUrl?: string;
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  isActive: boolean;
  company?: { name: string; code: string };
  secondaryPaymentRole?: { name: string; role: string };
}

interface PaymentPagesSectionProps {
  paymentPages: PaymentPage[];
  loading: boolean;
  onAddBank: () => void;
}

export default function PaymentPagesSection({ 
  paymentPages, 
  loading, 
  onAddBank 
}: PaymentPagesSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Company Payment Pages</h2>
          <p className="text-sm text-gray-500">Default payment pages for EMI collections (auto-created with bank accounts)</p>
        </div>
        <Button onClick={onAddBank} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Bank Account to Create Page
        </Button>
      </div>

      {/* Payment Pages Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : paymentPages.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <QrCode className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No Payment Pages Yet</h3>
            <p className="text-gray-500 mb-4">
              Payment pages are automatically created when you add a bank account with UPI ID or QR code.
            </p>
            <Button onClick={onAddBank}>
              <Plus className="h-4 w-4 mr-2" />
              Add Bank Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {paymentPages.map((page) => (
            <Card key={page.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{page.company?.name || 'Company'}</CardTitle>
                    <p className="text-emerald-100 text-sm">{page.company?.code}</p>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {page.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* QR Code Display */}
                {page.qrCodeUrl && (
                  <div className="mb-4 flex justify-center">
                    <img 
                      src={page.qrCodeUrl} 
                      alt="Payment QR Code" 
                      className="w-40 h-40 object-contain border rounded-lg"
                    />
                  </div>
                )}
                
                {/* UPI ID */}
                {page.upiId && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500 mb-1">UPI ID</p>
                    <p className="font-mono font-medium text-lg">{page.upiId}</p>
                  </div>
                )}
                
                {/* Bank Details */}
                <div className="space-y-2 text-sm">
                  {page.bankName && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bank</span>
                      <span className="font-medium">{page.bankName}</span>
                    </div>
                  )}
                  {page.accountNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Account</span>
                      <span className="font-mono">****{page.accountNumber.slice(-4)}</span>
                    </div>
                  )}
                  {page.ifscCode && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">IFSC</span>
                      <span className="font-mono">{page.ifscCode}</span>
                    </div>
                  )}
                </div>

                {/* Secondary Payment Role */}
                {page.secondaryPaymentRole && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                    <p className="text-xs text-amber-600 mb-1">Extra EMI Credit Goes To</p>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-700">{page.secondaryPaymentRole.name}</span>
                      <Badge variant="outline" className="text-xs">{page.secondaryPaymentRole.role}</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* How it Works */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-700">How Payment Pages Work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-600 space-y-2">
          <p>• <strong>Company Payment Pages</strong> are automatically created when you add a bank account with UPI ID or QR code.</p>
          <p>• <strong>EMI Payments:</strong> Regular EMIs are paid through the company's default payment page.</p>
          <p>• <strong>Extra EMIs:</strong> For mirror loans, extra EMIs are paid through the secondary payment page.</p>
          <p>• <strong>Credit Routing:</strong> If a secondary role is assigned, extra EMI payments credit to that role's personal credit.</p>
        </CardContent>
      </Card>
    </div>
  );
}
