'use client';

import { useState, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Check, X, Banknote, CreditCard, TrendingDown, Percent } from 'lucide-react';
import { toast } from 'sonner';

interface EMISettings {
  id: string;
  enableFullPayment: boolean;
  enablePartialPayment: boolean;
  enableInterestOnly: boolean;
  enablePrincipalOnly: boolean;
}

interface EMISettingsButtonProps {
  emiScheduleId: string;
  loanApplicationId: string;
  companyId: string;
  userId: string;
  emiStatus?: string;
  isPartialPayment?: boolean;
  onSettingsUpdate?: () => void;
}

const PAYMENT_OPTIONS = [
  {
    key: 'enableFullPayment' as const,
    label: 'Full Payment',
    description: 'Pay the entire EMI (principal + interest)',
    icon: Banknote,
    color: 'text-emerald-600',
  },
  {
    key: 'enablePartialPayment' as const,
    label: 'Partial Payment',
    description: 'Pay a portion now, rest later',
    icon: CreditCard,
    color: 'text-blue-600',
  },
  {
    key: 'enableInterestOnly' as const,
    label: 'Interest Only',
    description: 'Pay only interest; defer principal to next EMI',
    icon: Percent,
    color: 'text-amber-600',
  },
  {
    key: 'enablePrincipalOnly' as const,
    label: 'Principal Only',
    description: 'Pay only principal; interest written off as loss',
    icon: TrendingDown,
    color: 'text-red-600',
  },
];

const EMISettingsButton = memo(function EMISettingsButton({
  emiScheduleId,
  loanApplicationId,
  companyId,
  userId,
  emiStatus,
  isPartialPayment = false,
  onSettingsUpdate
}: EMISettingsButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<EMISettings | null>(null);

  const [formData, setFormData] = useState({
    enableFullPayment:    true,   // ON by default
    enablePartialPayment: false,  // OFF by default
    enableInterestOnly:   false,  // OFF by default
    enablePrincipalOnly:  false,  // OFF by default
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/emi-payment-settings?emiScheduleId=${emiScheduleId}`);
      const data = await response.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        setFormData({
          enableFullPayment:    data.settings.enableFullPayment    ?? true,
          enablePartialPayment: isPartialPayment ? false : (data.settings.enablePartialPayment ?? false),
          enableInterestOnly:   isPartialPayment ? false : (data.settings.enableInterestOnly   ?? false),
          enablePrincipalOnly:  data.settings.enablePrincipalOnly  ?? false,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setShowDialog(true);
    fetchSettings();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/emi-payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emiScheduleId,
          loanApplicationId,
          ...formData,
          useDefaultCompanyPage: true,   // always use default page now
          secondaryPaymentPageId: null,
          modifiedById: userId
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('EMI payment settings saved');
        setShowDialog(false);
        if (onSettingsUpdate) onSettingsUpdate();
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getActivePaymentCount = () => {
    if (!settings) return 1; // at least Full
    let count = 0;
    if (settings.enableFullPayment)    count++;
    if (settings.enablePartialPayment) count++;
    if (settings.enableInterestOnly)   count++;
    if (settings.enablePrincipalOnly)  count++;
    return count;
  };

  const toggle = (key: keyof typeof formData, checked: boolean) => {
    // Cannot disable Full Payment if it's the only enabled option
    if (key === 'enableFullPayment' && !checked) {
      const othersEnabled = formData.enablePartialPayment || formData.enableInterestOnly || formData.enablePrincipalOnly;
      if (!othersEnabled) {
        toast.error('At least one payment option must be enabled');
        return;
      }
    }
    // Interest Only and Partial Payment are incompatible with partial payment state
    if ((key === 'enableInterestOnly' || key === 'enablePartialPayment') && isPartialPayment && checked) {
      toast.error('Cannot enable this option when EMI has a partial payment');
      return;
    }
    setFormData(prev => ({ ...prev, [key]: checked }));
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={handleOpenDialog}
        className="gap-1"
      >
        <Settings className="h-4 w-4" />
        <span className="hidden sm:inline">Settings</span>
        <Badge variant="secondary" className="ml-1 text-xs">
          {getActivePaymentCount()}
        </Badge>
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-emerald-600" />
              EMI Payment Settings
            </DialogTitle>
            <DialogDescription>
              Enable or disable payment types for this EMI. Full Payment is required.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading settings...</div>
          ) : (
            <div className="space-y-3 py-2">
              {PAYMENT_OPTIONS.map(({ key, label, description, icon: Icon, color }) => {
                const isDisabled =
                  (key === 'enableInterestOnly' || key === 'enablePartialPayment') && isPartialPayment;
                const isOn = formData[key];

                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                      isOn ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'
                    } ${isDisabled ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${isOn ? color : 'text-gray-400'}`}>
                        {isOn ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${isOn ? color : 'text-gray-400'}`} />
                          <Label htmlFor={key} className={`font-medium cursor-pointer ${isOn ? '' : 'text-gray-500'}`}>
                            {label}
                          </Label>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                        {isDisabled && (
                          <p className="text-xs text-amber-600 mt-0.5">Disabled: EMI has partial payment</p>
                        )}
                      </div>
                    </div>
                    <Switch
                      id={key}
                      checked={formData[key]}
                      onCheckedChange={(checked) => toggle(key, checked)}
                      disabled={isDisabled}
                    />
                  </div>
                );
              })}

              <p className="text-xs text-gray-400 pt-1 text-center">
                Payment always goes to the company&apos;s default bank account
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

export default EMISettingsButton;
