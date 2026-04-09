'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Percent, AlertTriangle, RefreshCw, Save, Camera } from 'lucide-react';

interface Settings {
  companyName: string;
  companyLogo: string;
  companyTagline: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  defaultInterestRate: number;
  minInterestRate: number;
  maxInterestRate: number;
}

interface SettingsTabProps {
  settings: Settings;
  setSettings: (settings: Settings) => void;
  savingSettings: boolean;
  uploadingLogo: boolean;
  saveSettings: () => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  logoInputRef: React.RefObject<HTMLInputElement>;
  setShowResetDialog: (show: boolean) => void;
}

export default function SettingsTab({
  settings,
  setSettings,
  savingSettings,
  uploadingLogo,
  saveSettings,
  handleLogoUpload,
  logoInputRef,
  setShowResetDialog
}: SettingsTabProps) {
  return (
    <div className="space-y-6">
      {/* Company Information */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input value={settings.companyTagline} onChange={(e) => setSettings({ ...settings, companyTagline: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={settings.companyEmail} onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={settings.companyPhone} onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Address</Label>
              <Input value={settings.companyAddress} onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })} />
            </div>
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
              {settings.companyLogo && (
                <img src={settings.companyLogo} alt="Logo" className="h-16 w-16 object-contain border rounded" />
              )}
              <input
                type="file"
                ref={logoInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleLogoUpload}
              />
              <Button variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                <Camera className="h-4 w-4 mr-2" />
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interest Rate Settings */}
      <Card className="bg-white shadow-sm border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-purple-600" />
            Default Interest Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Default Rate (%)</Label>
              <Input type="number" value={settings.defaultInterestRate} onChange={(e) => setSettings({ ...settings, defaultInterestRate: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Min Rate (%)</Label>
              <Input type="number" value={settings.minInterestRate} onChange={(e) => setSettings({ ...settings, minInterestRate: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Max Rate (%)</Label>
              <Input type="number" value={settings.maxInterestRate} onChange={(e) => setSettings({ ...settings, maxInterestRate: Number(e.target.value) })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-red-50 border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions that affect the entire system</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setShowResetDialog(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />Reset System Data
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={saveSettings} disabled={savingSettings}>
          <Save className="h-4 w-4 mr-2" />
          {savingSettings ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
