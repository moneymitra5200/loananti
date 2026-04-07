'use client';

import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Building2, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';

interface SettingsData {
  companyName: string;
  companyTagline: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  defaultInterestRate: number;
}

interface Stats {
  totalUsers: number;
  companies: number;
  activeLoans: number;
  totalDisbursed: number;
}

interface Props {
  settings: SettingsData;
  setSettings: (settings: SettingsData) => void;
  savingSettings: boolean;
  onSave: () => void;
  stats: Stats;
  onShowResetDialog: () => void;
}

function SettingsSection({
  settings,
  setSettings,
  savingSettings,
  onSave,
  stats,
  onShowResetDialog
}: Props) {
  return (
    <div className="space-y-6">
      {/* Company Profile Settings */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-700" />
            System Settings
          </CardTitle>
          <CardDescription>Configure your company profile and system preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Basic Company Info */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company Profile
              </h4>
              <div className="space-y-3">
                <div>
                  <Label>Company Name</Label>
                  <Input
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tagline</Label>
                  <Input
                    value={settings.companyTagline || ''}
                    placeholder="Your tagline here..."
                    onChange={(e) => setSettings({ ...settings, companyTagline: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={settings.companyEmail}
                    onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={settings.companyPhone}
                    onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Textarea
                    value={settings.companyAddress}
                    onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Interest Rate Settings */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">
                Default Interest Rate
              </h4>
              <div className="space-y-3">
                <div>
                  <Label>Default Interest Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.defaultInterestRate}
                    onChange={(e) => setSettings({ ...settings, defaultInterestRate: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <h5 className="font-medium text-emerald-800 mb-2">Quick Info</h5>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Total Users</p>
                    <p className="font-semibold text-gray-900">{stats.totalUsers}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Companies</p>
                    <p className="font-semibold text-gray-900">{stats.companies}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Active Loans</p>
                    <p className="font-semibold text-gray-900">{stats.activeLoans}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Disbursed</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(stats.totalDisbursed)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={onSave} disabled={savingSettings}>
              <Save className="h-4 w-4 mr-2" />
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Reset Section */}
      <Card className="bg-white shadow-sm border-0 border-l-4 border-l-red-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect the entire system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <div>
              <h4 className="font-semibold text-gray-900">Reset Entire System</h4>
              <p className="text-sm text-gray-600 mt-1">
                This will delete all loans, EMIs, payments, transactions, and reset all credits to zero.
                <span className="font-semibold text-red-600"> Users will NOT be deleted.</span>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                This action cannot be undone. All data will be permanently erased.
              </p>
            </div>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 shrink-0"
              onClick={onShowResetDialog}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset System
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(SettingsSection);
