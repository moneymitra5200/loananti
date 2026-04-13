'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Save, Printer, FileText, CreditCard, Loader2, RefreshCw,
  IndianRupee, Building2, PenLine, Stamp, CheckCircle, Settings2,
  Eye, Edit3
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ── Types ──────────────────────────────────────────────────────────────────
interface ReceiptConfig {
  id?: string;
  type: 'EMI' | 'LOAN';
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyGST: string;
  accentColor: string;
  stampText: string;      // e.g. "PAID", "RECEIVED"
  stampColor: string;     // e.g. "#dc2626"
  showStamp: boolean;
  footerText: string;
  signatureLabel: string;
  sealLabel: string;
}

const DEFAULT_EMI_CONFIG: ReceiptConfig = {
  type: 'EMI',
  companyName: 'MoneyMitra Finance Pvt. Ltd.',
  companyAddress: '123, Finance Tower, Mumbai, Maharashtra - 400001',
  companyPhone: '+91 98765 43210',
  companyEmail: 'info@moneymitra.com',
  companyGST: 'GSTIN: 27ABCDE1234F1Z5',
  accentColor: '#4F46E5',
  stampText: 'PAID',
  stampColor: '#16a34a',
  showStamp: true,
  footerText: 'Thank you for your timely payment. This is a computer generated receipt.',
  signatureLabel: 'Authorised Signatory',
  sealLabel: 'Company Seal',
};

const DEFAULT_LOAN_CONFIG: ReceiptConfig = {
  type: 'LOAN',
  companyName: 'MoneyMitra Finance Pvt. Ltd.',
  companyAddress: '123, Finance Tower, Mumbai, Maharashtra - 400001',
  companyPhone: '+91 98765 43210',
  companyEmail: 'info@moneymitra.com',
  companyGST: 'GSTIN: 27ABCDE1234F1Z5',
  accentColor: '#059669',
  stampText: 'DISBURSED',
  stampColor: '#059669',
  showStamp: true,
  footerText: 'This receipt confirms loan disbursement. Please retain for your records.',
  signatureLabel: 'Authorised Signatory',
  sealLabel: 'Company Seal',
};

// ── Sample data for preview ──
const EMI_SAMPLE: Record<string, string> = {
  receiptNo:        'RCP-MM-2025-00142',
  date:             '13 Apr 2025',
  customerName:     'Ramesh Kumar Sharma',
  customerId:       'CUS-00581',
  loanNo:           'LN-2025-00423',
  emiMonth:         'April 2025',
  installmentNo:    '4 of 24',
  emiAmount:        '₹8,500.00',
  principalPaid:    '₹6,200.00',
  interestPaid:     '₹2,300.00',
  penaltyPaid:      '₹0.00',
  totalPaid:        '₹8,500.00',
  remainingBalance: '₹1,54,200.00',
  paymentMode:      'CASH',
  collectedBy:      'Suresh Patel (Cashier)',
};

const LOAN_SAMPLE: Record<string, string> = {
  receiptNo:        'DISB-MM-2025-00098',
  date:             '13 Apr 2025',
  customerName:     'Priya Mehta',
  customerId:       'CUS-00312',
  loanNo:           'LN-2025-00987',
  loanType:         'Personal Loan',
  loanAmount:       '₹2,00,000.00',
  interestRate:     '12% p.a. (FLAT)',
  tenure:           '24 months',
  emiAmount:        '₹10,000.00',
  disbursedTo:      'Priya Mehta',
  disbursedVia:     'Bank Transfer (NEFT)',
  processingFee:    '₹2,000.00',
  netDisbursed:     '₹1,98,000.00',
  disbursedBy:      'Ajay Singh (Manager)',
};

// ── EMI Receipt HTML Preview ───────────────────────────────────────────────
function EMIReceiptPreview({ config, data }: { config: ReceiptConfig; data: Record<string, string> }) {
  const borderColor = config.accentColor;
  return (
    <div
      id="receipt-print-area"
      style={{ fontFamily: 'Arial, sans-serif', width: '100%', maxWidth: '680px', margin: '0 auto', border: `3px double ${borderColor}`, borderRadius: '4px', background: '#fff', position: 'relative', padding: 0 }}
    >
      {/* STAMP - rotated overlay */}
      {config.showStamp && (
        <div style={{
          position: 'absolute', top: '110px', right: '24px', zIndex: 10,
          width: '110px', height: '110px', borderRadius: '50%',
          border: `4px solid ${config.stampColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: 'rotate(-20deg)', opacity: 0.85,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: config.stampColor, fontWeight: 900, fontSize: '22px', letterSpacing: '2px' }}>{config.stampText}</div>
            <div style={{ color: config.stampColor, fontSize: '9px', letterSpacing: '1px' }}>✓ VERIFIED</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: config.accentColor, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: '20px' }}>{config.companyName}</div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px', marginTop: '4px' }}>{config.companyAddress}</div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px' }}>📞 {config.companyPhone} | ✉ {config.companyEmail}</div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '10px', marginTop: '2px' }}>{config.companyGST}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '16px', letterSpacing: '1px' }}>EMI RECEIPT</div>
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', marginTop: '4px' }}>No: {data.receiptNo}</div>
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}>Date: {data.date}</div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '4px', background: `linear-gradient(to right, ${config.accentColor}, #a5b4fc, ${config.accentColor})` }} />

      {/* Customer / Loan Info */}
      <div style={{ padding: '12px 24px', background: '#f8f9ff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '3px 8px 3px 0', color: '#6b7280', width: '25%' }}>Customer Name</td>
              <td style={{ padding: '3px 0', fontWeight: 700, color: '#111827' }}>: {data.customerName}</td>
              <td style={{ padding: '3px 8px 3px 0', color: '#6b7280', width: '25%' }}>Customer ID</td>
              <td style={{ padding: '3px 0', color: '#374151' }}>: {data.customerId}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 8px 3px 0', color: '#6b7280' }}>Loan Number</td>
              <td style={{ padding: '3px 0', fontWeight: 700, color: config.accentColor }}>: {data.loanNo}</td>
              <td style={{ padding: '3px 8px 3px 0', color: '#6b7280' }}>EMI Month</td>
              <td style={{ padding: '3px 0', color: '#374151' }}>: {data.emiMonth}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 8px 3px 0', color: '#6b7280' }}>Installment</td>
              <td style={{ padding: '3px 0', color: '#374151' }}>: {data.installmentNo}</td>
              <td style={{ padding: '3px 8px 3px 0', color: '#6b7280' }}>Payment Mode</td>
              <td style={{ padding: '3px 0', color: '#374151' }}>: {data.paymentMode}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ margin: '0 24px', borderTop: `1px dashed ${config.accentColor}` }} />

      {/* Payment Table */}
      <div style={{ padding: '12px 24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: config.accentColor }}>
              <th style={{ padding: '8px 12px', color: '#fff', textAlign: 'left', fontWeight: 700 }}>Sr.</th>
              <th style={{ padding: '8px 12px', color: '#fff', textAlign: 'left', fontWeight: 700 }}>Description</th>
              <th style={{ padding: '8px 12px', color: '#fff', textAlign: 'right', fontWeight: 700 }}>Debit (Dr)</th>
              <th style={{ padding: '8px 12px', color: '#fff', textAlign: 'right', fontWeight: 700 }}>Credit (Cr)</th>
              <th style={{ padding: '8px 12px', color: '#fff', textAlign: 'right', fontWeight: 700 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {[
              { sr: '01', desc: 'Principal Repayment', dr: data.principalPaid, cr: '—', amt: data.principalPaid },
              { sr: '02', desc: 'Interest Amount', dr: data.interestPaid, cr: '—', amt: data.interestPaid },
              { sr: '03', desc: 'Penalty / Late Fee', dr: data.penaltyPaid, cr: '—', amt: data.penaltyPaid },
            ].map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff', borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '7px 12px', color: '#6b7280' }}>{row.sr}</td>
                <td style={{ padding: '7px 12px', color: '#374151' }}>{row.desc}</td>
                <td style={{ padding: '7px 12px', textAlign: 'right', color: '#dc2626' }}>{row.dr}</td>
                <td style={{ padding: '7px 12px', textAlign: 'right', color: '#16a34a' }}>{row.cr}</td>
                <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>{row.amt}</td>
              </tr>
            ))}
            <tr style={{ background: '#eff6ff', borderTop: `2px solid ${config.accentColor}` }}>
              <td colSpan={2} style={{ padding: '10px 12px', fontWeight: 700, fontSize: '13px', color: '#111827' }}>TOTAL AMOUNT PAID</td>
              <td colSpan={2} style={{ padding: '10px 12px', textAlign: 'right', color: '#6b7280', fontSize: '11px' }}>Remaining Balance: {data.remainingBalance}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, fontSize: '15px', color: config.accentColor }}>{data.totalPaid}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Collected By + Signatures */}
      <div style={{ padding: '8px 24px 4px', fontSize: '11px', color: '#6b7280' }}>
        Collected By: <strong style={{ color: '#374151' }}>{data.collectedBy}</strong>
      </div>

      <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        {/* Company Seal box */}
        <div style={{ width: '110px', height: '70px', border: `2px dashed ${config.accentColor}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '10px', textAlign: 'center', padding: '8px' }}>
          {config.sealLabel}
        </div>

        {/* Signature */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: `1px solid #374151`, width: '160px', marginBottom: '4px' }} />
          <div style={{ fontSize: '11px', color: '#374151', fontWeight: 600 }}>{config.signatureLabel}</div>
          <div style={{ fontSize: '10px', color: '#6b7280' }}>{config.companyName}</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#f3f4f6', borderTop: `2px solid ${config.accentColor}`, padding: '8px 24px', textAlign: 'center', fontSize: '10px', color: '#6b7280', borderBottomLeftRadius: '2px', borderBottomRightRadius: '2px' }}>
        {config.footerText}
      </div>
    </div>
  );
}

// ── Loan Receipt Preview ───────────────────────────────────────────────────
function LoanReceiptPreview({ config, data }: { config: ReceiptConfig; data: Record<string, string> }) {
  const borderColor = config.accentColor;
  return (
    <div
      id="receipt-print-area"
      style={{ fontFamily: 'Arial, sans-serif', width: '100%', maxWidth: '680px', margin: '0 auto', border: `3px double ${borderColor}`, borderRadius: '4px', background: '#fff', position: 'relative', padding: 0 }}
    >
      {config.showStamp && (
        <div style={{
          position: 'absolute', top: '110px', right: '24px', zIndex: 10,
          width: '110px', height: '110px', borderRadius: '50%',
          border: `4px solid ${config.stampColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: 'rotate(-20deg)', opacity: 0.85,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: config.stampColor, fontWeight: 900, fontSize: '18px', letterSpacing: '2px' }}>{config.stampText}</div>
            <div style={{ color: config.stampColor, fontSize: '9px', letterSpacing: '1px' }}>✓ APPROVED</div>
          </div>
        </div>
      )}

      <div style={{ background: config.accentColor, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: '20px' }}>{config.companyName}</div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px', marginTop: '4px' }}>{config.companyAddress}</div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px' }}>📞 {config.companyPhone} | ✉ {config.companyEmail}</div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '10px', marginTop: '2px' }}>{config.companyGST}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '16px', letterSpacing: '1px' }}>LOAN DISBURSEMENT RECEIPT</div>
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', marginTop: '4px' }}>No: {data.receiptNo}</div>
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}>Date: {data.date}</div>
        </div>
      </div>

      <div style={{ height: '4px', background: `linear-gradient(to right, ${config.accentColor}, #6ee7b7, ${config.accentColor})` }} />

      <div style={{ padding: '12px 24px', background: '#f0fdf4' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '3px 8px 3px 0', color: '#6b7280', width: '25%' }}>Borrower Name</td>
              <td style={{ padding: '3px 0', fontWeight: 700, color: '#111827' }}>: {data.customerName}</td>
              <td style={{ padding: '3px 8px 3px 0', color: '#6b7280', width: '25%' }}>Customer ID</td>
              <td style={{ padding: '3px 0' }}>: {data.customerId}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 8px 3px 0', color: '#6b7280' }}>Loan Number</td>
              <td style={{ padding: '3px 0', fontWeight: 700, color: config.accentColor }}>: {data.loanNo}</td>
              <td style={{ padding: '3px 8px 3px 0', color: '#6b7280' }}>Loan Type</td>
              <td style={{ padding: '3px 0' }}>: {data.loanType}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 8px 3px 0', color: '#6b7280' }}>Interest Rate</td>
              <td style={{ padding: '3px 0' }}>: {data.interestRate}</td>
              <td style={{ padding: '3px 8px 3px 0', color: '#6b7280' }}>Tenure</td>
              <td style={{ padding: '3px 0' }}>: {data.tenure}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 8px 3px 0', color: '#6b7280' }}>Payment Mode</td>
              <td style={{ padding: '3px 0' }}>: {data.disbursedVia}</td>
              <td style={{ padding: '3px 8px 3px 0', color: '#6b7280' }}>Monthly EMI</td>
              <td style={{ padding: '3px 0', fontWeight: 600, color: config.accentColor }}>: {data.emiAmount}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ margin: '0 24px', borderTop: `1px dashed ${config.accentColor}` }} />

      <div style={{ padding: '12px 24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: config.accentColor }}>
              <th style={{ padding: '8px 12px', color: '#fff', textAlign: 'left' }}>Sr.</th>
              <th style={{ padding: '8px 12px', color: '#fff', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '8px 12px', color: '#fff', textAlign: 'right' }}>Debit (Dr)</th>
              <th style={{ padding: '8px 12px', color: '#fff', textAlign: 'right' }}>Credit (Cr)</th>
              <th style={{ padding: '8px 12px', color: '#fff', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {[
              { sr: '01', desc: 'Loan Sanctioned Amount', dr: '—', cr: data.loanAmount, amt: data.loanAmount },
              { sr: '02', desc: 'Processing Fee Deducted', dr: data.processingFee, cr: '—', amt: data.processingFee },
              { sr: '03', desc: 'Net Amount Disbursed', dr: '—', cr: data.netDisbursed, amt: data.netDisbursed },
            ].map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#f9fafb' : '#fff', borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '7px 12px', color: '#6b7280' }}>{row.sr}</td>
                <td style={{ padding: '7px 12px', color: '#374151' }}>{row.desc}</td>
                <td style={{ padding: '7px 12px', textAlign: 'right', color: '#dc2626' }}>{row.dr}</td>
                <td style={{ padding: '7px 12px', textAlign: 'right', color: '#16a34a' }}>{row.cr}</td>
                <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>{row.amt}</td>
              </tr>
            ))}
            <tr style={{ background: '#ecfdf5', borderTop: `2px solid ${config.accentColor}` }}>
              <td colSpan={3} style={{ padding: '10px 12px', fontWeight: 700, fontSize: '13px', color: '#111827' }}>NET DISBURSED AMOUNT</td>
              <td colSpan={2} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, fontSize: '15px', color: config.accentColor }}>{data.netDisbursed}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ padding: '4px 24px 4px', fontSize: '11px', color: '#6b7280' }}>
        Disbursed By: <strong style={{ color: '#374151' }}>{data.disbursedBy}</strong> &nbsp;|&nbsp; Disbursed To: <strong style={{ color: '#374151' }}>{data.disbursedTo}</strong>
      </div>

      <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ width: '110px', height: '70px', border: `2px dashed ${config.accentColor}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '10px', textAlign: 'center', padding: '8px' }}>
          {config.sealLabel}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #374151', width: '160px', marginBottom: '4px' }} />
          <div style={{ fontSize: '11px', color: '#374151', fontWeight: 600 }}>{config.signatureLabel}</div>
          <div style={{ fontSize: '10px', color: '#6b7280' }}>{config.companyName}</div>
        </div>
      </div>

      <div style={{ background: '#f3f4f6', borderTop: `2px solid ${config.accentColor}`, padding: '8px 24px', textAlign: 'center', fontSize: '10px', color: '#6b7280' }}>
        {config.footerText}
      </div>
    </div>
  );
}

// ── Print receipt ────────────────────────────────────────────────────────
function printReceipt(elementId: string, title: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const w = window.open('', '_blank', 'width=800,height=700');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>
  @media print { @page { margin: 10mm; } body { margin: 0; } }
  body { font-family: Arial, sans-serif; }
</style>
</head><body>${el.outerHTML}</body></html>`);
  w.document.close();
  setTimeout(() => { w.print(); }, 400);
}

// ── Config Editor Panel ────────────────────────────────────────────────────
function ConfigEditor({ config, onChange }: { config: ReceiptConfig; onChange: (c: ReceiptConfig) => void }) {
  const set = (field: keyof ReceiptConfig, value: any) => onChange({ ...config, [field]: value });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label className="text-xs font-semibold text-gray-600">Company Name</Label>
          <Input className="mt-1 h-8 text-sm" value={config.companyName} onChange={e => set('companyName', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold text-gray-600">Address</Label>
          <Input className="mt-1 h-8 text-sm" value={config.companyAddress} onChange={e => set('companyAddress', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs font-semibold text-gray-600">Phone</Label>
            <Input className="mt-1 h-8 text-sm" value={config.companyPhone} onChange={e => set('companyPhone', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-600">Email</Label>
            <Input className="mt-1 h-8 text-sm" value={config.companyEmail} onChange={e => set('companyEmail', e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs font-semibold text-gray-600">GST Number</Label>
          <Input className="mt-1 h-8 text-sm" value={config.companyGST} onChange={e => set('companyGST', e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs font-semibold text-gray-600">Accent Color</Label>
            <input type="color" value={config.accentColor} onChange={e => set('accentColor', e.target.value)}
              className="mt-1 h-8 w-full rounded border border-gray-200 cursor-pointer" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-600">Stamp Color</Label>
            <input type="color" value={config.stampColor} onChange={e => set('stampColor', e.target.value)}
              className="mt-1 h-8 w-full rounded border border-gray-200 cursor-pointer" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-600">Stamp Text</Label>
            <Input className="mt-1 h-8 text-sm" value={config.stampText} onChange={e => set('stampText', e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="showStamp" checked={config.showStamp} onChange={e => set('showStamp', e.target.checked)} className="w-4 h-4" />
          <Label htmlFor="showStamp" className="text-xs font-semibold text-gray-600 cursor-pointer">Show Stamp on Receipt</Label>
        </div>
        <div>
          <Label className="text-xs font-semibold text-gray-600">Signature Label</Label>
          <Input className="mt-1 h-8 text-sm" value={config.signatureLabel} onChange={e => set('signatureLabel', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold text-gray-600">Company Seal Label</Label>
          <Input className="mt-1 h-8 text-sm" value={config.sealLabel} onChange={e => set('sealLabel', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs font-semibold text-gray-600">Footer Text</Label>
          <Input className="mt-1 h-8 text-sm" value={config.footerText} onChange={e => set('footerText', e.target.value)} />
        </div>
      </div>
    </div>
  );
}

// ── Manual Fill Dialog ─────────────────────────────────────────────────────
function ManualDialog({ open, onClose, type, config }: {
  open: boolean; onClose: () => void; type: 'EMI' | 'LOAN'; config: ReceiptConfig;
}) {
  const [data, setData] = useState<Record<string, string>>(type === 'EMI' ? { ...EMI_SAMPLE } : { ...LOAN_SAMPLE });
  const set = (k: string, v: string) => setData(prev => ({ ...prev, [k]: v }));
  const fields = type === 'EMI'
    ? Object.keys(EMI_SAMPLE)
    : Object.keys(LOAN_SAMPLE);

  const handlePrint = () => {
    // Temporarily render receipt and print
    const container = document.createElement('div');
    container.style.display = 'none';
    document.body.appendChild(container);
    // Use the already rendered receipt if available
    const w = window.open('', '_blank', 'width=800,height=700');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title></head><body></body></html>`);
    w.document.close();
    toast({ title: '🖨️ Printing...', description: 'Receipt sent to printer.' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Fill {type === 'EMI' ? 'EMI' : 'Loan'} Receipt Details</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {fields.map(k => (
            <div key={k}>
              <Label className="text-xs text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</Label>
              <Input className="h-7 text-xs mt-0.5" value={data[k] || ''} onChange={e => set(k, e.target.value)} />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Printer className="h-4 w-4 mr-1" /> Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function ReceiptTemplateSection({ userId, userRole }: { userId: string; userRole: string }) {
  const [emiConfig, setEmiConfig]   = useState<ReceiptConfig>({ ...DEFAULT_EMI_CONFIG });
  const [loanConfig, setLoanConfig] = useState<ReceiptConfig>({ ...DEFAULT_LOAN_CONFIG });
  const [mode, setMode]             = useState<'preview' | 'edit'>('preview');
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(true);
  const [showManualEMI, setShowManualEMI]   = useState(false);
  const [showManualLoan, setShowManualLoan] = useState(false);

  useEffect(() => { loadConfigs(); }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/receipt-template');
      if (res.ok) {
        const { templates } = await res.json();
        const emi  = templates.find((t: any) => t.type === 'EMI');
        const loan = templates.find((t: any) => t.type === 'LOAN');
        if (emi)  setEmiConfig({ ...DEFAULT_EMI_CONFIG,  ...(typeof emi.fields  === 'string' ? JSON.parse(emi.fields)  : emi.fields)  });
        if (loan) setLoanConfig({ ...DEFAULT_LOAN_CONFIG, ...(typeof loan.fields === 'string' ? JSON.parse(loan.fields) : loan.fields) });
      }
    } catch (e) { /* use defaults */ }
    finally { setLoading(false); }
  };

  const saveConfig = async (cfg: ReceiptConfig) => {
    setSaving(true);
    try {
      const res = await fetch('/api/receipt-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: cfg.type, name: cfg.type === 'EMI' ? 'EMI Receipt' : 'Loan Receipt', fields: JSON.stringify(cfg), companyName: cfg.companyName, userId }),
      });
      if (res.ok) toast({ title: '✅ Saved', description: `${cfg.type} receipt template saved.` });
      else throw new Error('Save failed');
    } catch {
      toast({ title: 'Error', description: 'Could not save template', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      <span className="ml-3 text-gray-500">Loading receipt templates…</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-7 w-7 text-indigo-600" />
            Receipt Template Designer
          </h2>
          <p className="text-gray-500 text-sm mt-1">Professional receipt format with debit/credit ledger columns and stamp. Edit to customise.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={mode === 'preview' ? 'default' : 'outline'} onClick={() => setMode('preview')}>
            <Eye className="h-4 w-4 mr-1" />Preview
          </Button>
          <Button size="sm" variant={mode === 'edit' ? 'default' : 'outline'} onClick={() => setMode('edit')}>
            <Edit3 className="h-4 w-4 mr-1" />Customise
          </Button>
        </div>
      </div>

      <Tabs defaultValue="emi">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="emi"><CreditCard className="h-4 w-4 mr-1" />EMI Receipt</TabsTrigger>
          <TabsTrigger value="loan"><IndianRupee className="h-4 w-4 mr-1" />Loan Receipt</TabsTrigger>
        </TabsList>

        {/* ── EMI ───────────────────────────── */}
        <TabsContent value="emi" className="mt-6">
          <div className={`gap-6 ${mode === 'edit' ? 'grid lg:grid-cols-[1fr_300px]' : ''}`}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <Badge variant="outline" className="text-indigo-600 border-indigo-300">📄 EMI Payment Receipt — with Ledger Columns + Stamp</Badge>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEmiConfig({ ...DEFAULT_EMI_CONFIG })}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />Reset
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowManualEMI(true)}>
                    <PenLine className="h-3.5 w-3.5 mr-1" />Manual Receipt
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => printReceipt('emi-receipt-preview', 'EMI Receipt')}>
                    <Printer className="h-3.5 w-3.5 mr-1" />Print
                  </Button>
                  <Button size="sm" disabled={saving} onClick={() => saveConfig(emiConfig)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}Save
                  </Button>
                </div>
              </div>
              {/* Receipt Preview */}
              <div id="emi-receipt-preview">
                <EMIReceiptPreview config={emiConfig} data={EMI_SAMPLE} />
              </div>
            </div>
            {mode === 'edit' && (
              <Card className="border-0 shadow-sm h-fit">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Settings2 className="h-4 w-4 text-indigo-500" />Customise EMI Receipt</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[700px] overflow-y-auto">
                  <ConfigEditor config={emiConfig} onChange={setEmiConfig} />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── LOAN ──────────────────────────── */}
        <TabsContent value="loan" className="mt-6">
          <div className={`gap-6 ${mode === 'edit' ? 'grid lg:grid-cols-[1fr_300px]' : ''}`}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <Badge variant="outline" className="text-emerald-600 border-emerald-300">📄 Loan Disbursement Receipt — with Ledger Columns + Stamp</Badge>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setLoanConfig({ ...DEFAULT_LOAN_CONFIG })}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />Reset
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowManualLoan(true)}>
                    <PenLine className="h-3.5 w-3.5 mr-1" />Manual Receipt
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => printReceipt('loan-receipt-preview', 'Loan Receipt')}>
                    <Printer className="h-3.5 w-3.5 mr-1" />Print
                  </Button>
                  <Button size="sm" disabled={saving} onClick={() => saveConfig(loanConfig)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}Save
                  </Button>
                </div>
              </div>
              <div id="loan-receipt-preview">
                <LoanReceiptPreview config={loanConfig} data={LOAN_SAMPLE} />
              </div>
            </div>
            {mode === 'edit' && (
              <Card className="border-0 shadow-sm h-fit">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Settings2 className="h-4 w-4 text-emerald-500" />Customise Loan Receipt</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[700px] overflow-y-auto">
                  <ConfigEditor config={loanConfig} onChange={setLoanConfig} />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ManualDialog open={showManualEMI}  onClose={() => setShowManualEMI(false)}  type="EMI"  config={emiConfig} />
      <ManualDialog open={showManualLoan} onClose={() => setShowManualLoan(false)} type="LOAN" config={loanConfig} />
    </div>
  );
}
