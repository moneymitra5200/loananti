'use client';

import { useState, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface SecondaryPaymentPage {
  id: string;
  name: string;
  role?: {
    id: string;
    name: string;
    role: string;
  };
}

interface EMISettings {
  id: string;
  enableFullPayment: boolean;
  enablePartialPayment: boolean;
  enableInterestOnly: boolean;
  useDefaultCompanyPage: boolean;
  secondaryPaymentPageId?: string;
  secondaryPaymentPage?: SecondaryPaymentPage;
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
  const [paymentPages, setPaymentPages] = useState<SecondaryPaymentPage[]>([]);

  const [formData, setFormData] = useState({
    enableFullPayment: true,
    enablePartialPayment: true,
    enableInterestOnly: true,
    useDefaultCompanyPage: true,
    secondaryPaymentPageId: ''
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/emi-payment-settings?emiScheduleId=${emiScheduleId}`);
      const data = await response.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        setFormData({
          enableFullPayment: data.settings.enableFullPayment,
          enablePartialPayment: data.settings.enablePartialPayment,
          // If EMI has partial payment, interest only must be disabled
          enableInterestOnly: isPartialPayment ? false : data.settings.enableInterestOnly,
          useDefaultCompanyPage: data.settings.useDefaultCompanyPage,
          secondaryPaymentPageId: data.settings.secondaryPaymentPageId || ''
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentPages = async () => {
    try {
      const response = await fetch(`/api/emi-payment-settings?action=secondary-pages&companyId=${companyId}`);
      const data = await response.json();
      if (data.success) {
        setPaymentPages(data.pages);
      }
    } catch (error) {
      console.error('Error fetching payment pages:', error);
    }
  };

  const handleOpenDialog = () => {
    setShowDialog(true);
    fetchSettings();
    fetchPaymentPages();
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
          modifiedById: userId
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('EMI settings updated');
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
    let count = 0;
    if (settings?.enableFullPayment) count++;
    if (settings?.enablePartialPayment) count++;
    if (settings?.enableInterestOnly) count++;
    return count;
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
              <Settings className="h-5 w-5" />
              EMI Payment Settings
            </DialogTitle>
            <DialogDescription>
              Configure payment options and payment page for this EMI
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Payment Options Toggles */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-700">Payment Options</h4>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {formData.enableFullPayment ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-red-400" />
                    )}
                    <Label htmlFor="full-payment">Full Payment</Label>
                  </div>
                  <Switch
                    id="full-payment"
                    checked={formData.enableFullPayment}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, enableFullPayment: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {formData.enablePartialPayment ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-red-400" />
                    )}
                    <Label htmlFor="partial-payment">Partial Payment</Label>
                  </div>
                  <Switch
                    id="partial-payment"
                    checked={formData.enablePartialPayment}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, enablePartialPayment: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {formData.enableInterestOnly ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-red-400" />
                    )}
                    <div>
                      <Label htmlFor="interest-only">Interest Only</Label>
                      {isPartialPayment && (
                        <p className="text-xs text-amber-600">Disabled due to partial payment</p>
                      )}
                    </div>
                  </div>
                  <Switch
                    id="interest-only"
                    checked={formData.enableInterestOnly}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, enableInterestOnly: checked }))
                    }
                    disabled={isPartialPayment}
                  />
                </div>
              </div>

              {/* Payment Page Selection */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium text-sm text-gray-700">Payment Page</h4>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="use-default">Use Company Default Page</Label>
                  <Switch
                    id="use-default"
                    checked={formData.useDefaultCompanyPage}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, useDefaultCompanyPage: checked }))
                    }
                  />
                </div>

                {!formData.useDefaultCompanyPage && (
                  <div className="space-y-2">
                    <Label>Select Secondary Payment Page</Label>
                    <Select
                      value={formData.secondaryPaymentPageId}
                      onValueChange={(value) => 
                        setFormData(prev => ({ ...prev, secondaryPaymentPageId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a payment page" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentPages.length === 0 ? (
                          <div className="px-2 py-4 text-sm text-gray-500 text-center">
                            No payment pages available
                          </div>
                        ) : (
                          paymentPages.map((page) => (
                            <SelectItem key={page.id} value={page.id}>
                              {page.name}
                              {page.role && (
                                <span className="text-gray-500 ml-1">
                                  ({page.role.name})
                                </span>
                              )}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Payments via this page will credit the selected role&apos;s personal credit
                    </p>
                  </div>
                )}

                {formData.useDefaultCompanyPage && (
                  <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    Customer will see the company&apos;s default bank account details
                  </p>
                )}
              </div>
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
