'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { FileText, Save, Loader2, CheckCircle, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ReceiptSettings {
  companyName: string;
  bgColor: string;
  accentColor: string;
  footerText: string;
  headerSubtitle: string;
  // Customer section
  showCustomerName: boolean;
  showFatherName: boolean;
  showPhone: boolean;
  showAddress: boolean;
  // Loan section
  showLoanAccount: boolean;
  showEmiNumber: boolean;
  showDueDate: boolean;
  showPaymentDate: boolean;
  // Payment breakdown
  showPrincipal: boolean;
  showInterest: boolean;
  showPenalty: boolean;
  showTotalAmount: boolean;
  showAmountInWords: boolean;
  // Payment details
  showPaymentMode: boolean;
  showReferenceNo: boolean;
  showBalanceDue: boolean;
  showSplitBreakdown: boolean;
  showRemainingDue: boolean;
  // Footer
  showSignatureSection: boolean;
  showCompanyStamp: boolean;
}

const DEFAULTS: ReceiptSettings = {
  companyName: 'Money Mitra Finance',
  bgColor: '#ffffff',
  accentColor: '#1e40af',
  footerText: 'This is a computer generated receipt.',
  headerSubtitle: 'Your Trusted Financial Partner',
  showCustomerName: true,
  showFatherName: true,
  showPhone: true,
  showAddress: true,
  showLoanAccount: true,
  showEmiNumber: true,
  showDueDate: true,
  showPaymentDate: true,
  showPrincipal: true,
  showInterest: true,
  showPenalty: true,
  showTotalAmount: true,
  showAmountInWords: true,
  showPaymentMode: true,
  showReferenceNo: true,
  showBalanceDue: true,
  showSplitBreakdown: true,
  showRemainingDue: true,
  showSignatureSection: true,
  showCompanyStamp: true,
};

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}
function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1 mr-4">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

export default function ReceiptSettingsCard() {
  const [settings, setSettings] = useState<ReceiptSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/receipt-settings')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.settings) {
          setSettings({ ...DEFAULTS, ...data.settings });
        }
      })
      .catch(() => {/* use defaults */})
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof ReceiptSettings, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/receipt-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        toast({ title: '✅ Receipt Settings Saved', description: 'All receipt defaults updated successfully.' });
        setTimeout(() => setSaved(false), 3000);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULTS);
    toast({ title: 'Reset to Defaults', description: 'Click Save to apply.' });
  };

  if (loading) {
    return (
      <Card className="bg-white shadow-sm border-0">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400 mr-2" />
          <span className="text-gray-500 text-sm">Loading receipt settings...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Receipt Default Settings
        </CardTitle>
        <CardDescription>
          Configure what appears on every EMI payment receipt (Split, Partial, Interest Only, Principal Only, Full)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ── Appearance ── */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Appearance</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-600">Company Name on Receipt</Label>
              <Input
                value={settings.companyName}
                onChange={e => set('companyName', e.target.value)}
                placeholder="Money Mitra Finance"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Header Subtitle</Label>
              <Input
                value={settings.headerSubtitle}
                onChange={e => set('headerSubtitle', e.target.value)}
                placeholder="Your Trusted Financial Partner"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Accent Color (border / totals)</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={e => set('accentColor', e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer p-0.5"
                />
                <Input
                  value={settings.accentColor}
                  onChange={e => set('accentColor', e.target.value)}
                  placeholder="#1e40af"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Footer Text</Label>
              <Input
                value={settings.footerText}
                onChange={e => set('footerText', e.target.value)}
                placeholder="This is a computer generated receipt."
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* ── Customer Info toggles ── */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Customer Information</h4>
          <div className="divide-y divide-gray-100">
            <ToggleRow label="Customer Name" value={settings.showCustomerName} onChange={v => set('showCustomerName', v)} />
            <ToggleRow label="Father / Husband Name" value={settings.showFatherName} onChange={v => set('showFatherName', v)} />
            <ToggleRow label="Phone Number" value={settings.showPhone} onChange={v => set('showPhone', v)} />
            <ToggleRow label="Address" value={settings.showAddress} onChange={v => set('showAddress', v)} />
          </div>
        </div>

        <Separator />

        {/* ── Loan Details ── */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Loan & EMI Details</h4>
          <div className="divide-y divide-gray-100">
            <ToggleRow label="Loan Account No." value={settings.showLoanAccount} onChange={v => set('showLoanAccount', v)} />
            <ToggleRow label="EMI Number (e.g. 3 of 10)" value={settings.showEmiNumber} onChange={v => set('showEmiNumber', v)} />
            <ToggleRow label="Due Date" value={settings.showDueDate} onChange={v => set('showDueDate', v)} />
            <ToggleRow label="Payment Date" value={settings.showPaymentDate} onChange={v => set('showPaymentDate', v)} />
          </div>
        </div>

        <Separator />

        {/* ── Payment Breakdown ── */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Payment Breakdown</h4>
          <div className="divide-y divide-gray-100">
            <ToggleRow label="Principal Amount" value={settings.showPrincipal} onChange={v => set('showPrincipal', v)} />
            <ToggleRow label="Interest Amount" value={settings.showInterest} onChange={v => set('showInterest', v)} />
            <ToggleRow label="Penalty / Waiver" description="Shows penalty charged and waived amount" value={settings.showPenalty} onChange={v => set('showPenalty', v)} />
            <ToggleRow label="Total Amount Paid" value={settings.showTotalAmount} onChange={v => set('showTotalAmount', v)} />
            <ToggleRow label="Amount in Words" description="e.g. Nine Thousand Three Hundred Sixty Rupees Only" value={settings.showAmountInWords} onChange={v => set('showAmountInWords', v)} />
            <ToggleRow label="Split Breakdown" description="Cash / Online portions for SPLIT payments" value={settings.showSplitBreakdown} onChange={v => set('showSplitBreakdown', v)} />
            <ToggleRow label="Remaining Due" description="Shown on PARTIAL payments" value={settings.showRemainingDue} onChange={v => set('showRemainingDue', v)} />
          </div>
        </div>

        <Separator />

        {/* ── Payment Details ── */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Payment Details</h4>
          <div className="divide-y divide-gray-100">
            <ToggleRow label="Payment Mode" description="CASH / ONLINE / SPLIT" value={settings.showPaymentMode} onChange={v => set('showPaymentMode', v)} />
            <ToggleRow label="Transaction Reference No." value={settings.showReferenceNo} onChange={v => set('showReferenceNo', v)} />
            <ToggleRow label="Balance Due" description="Remaining loan outstanding" value={settings.showBalanceDue} onChange={v => set('showBalanceDue', v)} />
          </div>
        </div>

        <Separator />

        {/* ── Footer ── */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Receipt Footer</h4>
          <div className="divide-y divide-gray-100">
            <ToggleRow label="Signature Section" description="Borrower & Authorized Signatory lines" value={settings.showSignatureSection} onChange={v => set('showSignatureSection', v)} />
            <ToggleRow label="Company Stamp Circle" value={settings.showCompanyStamp} onChange={v => set('showCompanyStamp', v)} />
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className={`${saved ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
            ) : saved ? (
              <><CheckCircle className="h-4 w-4 mr-2" />Saved!</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Save Receipt Settings</>
            )}
          </Button>
          <Button variant="outline" onClick={handleReset} className="border-gray-300">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
