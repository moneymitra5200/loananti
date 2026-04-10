'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Bell, BellOff, Settings, Zap, AlertTriangle, CheckCircle2,
  Clock, TrendingUp, Users, DollarSign, RefreshCw, Shield,
  Eye, EyeOff, Palette, Info, Save, RotateCcw, Send
} from 'lucide-react';
import { motion } from 'framer-motion';

const SCENARIO_LIST = [
  { key: 'emi_due_3days', label: 'EMI Due in 3 Days', icon: Clock, color: 'text-green-600', bg: 'bg-green-50', desc: 'Reminder sent to customer + role that last handled the loan' },
  { key: 'emi_due_1day', label: 'EMI Due Tomorrow', icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', desc: 'Urgent reminder sent day before due date' },
  { key: 'emi_due_today', label: 'EMI Due TODAY', icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50', desc: 'Same-day reminder — sent in morning' },
  { key: 'emi_overdue', label: 'EMI Overdue / Penalty', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', desc: 'Alert sent every N hours when EMI is overdue and penalty is accumulating' },
  { key: 'loan_passed', label: 'Loan Passed to Role', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Role is notified when a loan is assigned/moved to them' },
  { key: 'loan_approved', label: 'Loan Approved / Status Change', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Customer notified when loan status changes' },
  { key: 'payment_received', label: 'Payment Received', icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50', desc: 'Confirmation to customer + cashier when payment is collected' },
  { key: 'penalty_waiver', label: 'Penalty Waiver by Role', icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Super Admin notified when a role reduces the penalty amount during payment' },
  { key: 'loan_rejected', label: 'Loan Rejected', icon: BellOff, color: 'text-rose-600', bg: 'bg-rose-50', desc: 'Customer notified with rejection reason' },
  { key: 'credit_request', label: 'Credit Request by Role', icon: TrendingUp, color: 'text-cyan-600', bg: 'bg-cyan-50', desc: 'Super Admin notified when any role requests a credit adjustment' },
];

interface SystemSettings {
  id?: string;
  penaltyPerDay: number;
  penaltyGraceDays: number;
  penaltyMaxAmount: number | null;
  colorGreenDays: number;
  colorYellowDays: number;
  colorRedDaysOverdue: number;
  agentCanSeeMirror: boolean;
  staffCanSeeMirror: boolean;
  companyCanSeeMirror: boolean;
  accountantCanSeeMirror: boolean;
  sendEMIReminderDaysBefore: number;
  sendEMISameDayReminder: boolean;
  sendPenaltyNotify: boolean;
  penaltyNotifyIntervalHrs: number;
  onlineProcessingFeeMode: string;
  offlineProcessingFeeMode: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  penaltyPerDay: 100,
  penaltyGraceDays: 0,
  penaltyMaxAmount: null,
  colorGreenDays: 2,
  colorYellowDays: 1,
  colorRedDaysOverdue: 0,
  agentCanSeeMirror: false,
  staffCanSeeMirror: false,
  companyCanSeeMirror: false,
  accountantCanSeeMirror: false,
  sendEMIReminderDaysBefore: 3,
  sendEMISameDayReminder: true,
  sendPenaltyNotify: true,
  penaltyNotifyIntervalHrs: 24,
  onlineProcessingFeeMode: 'AT_DISBURSEMENT',
  offlineProcessingFeeMode: 'AT_CREATION',
};

interface Props {
  userId: string;
}

export default function NotificationManagementSection({ userId }: Props) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingPenalty, setApplyingPenalty] = useState(false);
  const [scenarioToggles, setScenarioToggles] = useState<Record<string, boolean>>({
    emi_due_3days: true,
    emi_due_1day: true,
    emi_due_today: true,
    emi_overdue: true,
    loan_passed: true,
    loan_approved: true,
    payment_received: true,
    penalty_waiver: true,
    loan_rejected: true,
    credit_request: true,
  });

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/system-settings');
      const data = await res.json();
      if (data.success) setSettings(data.settings);
    } catch { /* use defaults */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/system-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, updatedById: userId })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: '✅ Settings Saved', description: 'All notification and penalty settings have been updated.' });
        setSettings(data.settings);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPenalty = async () => {
    setApplyingPenalty(true);
    try {
      const res = await fetch('/api/emi/apply-penalty', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast({
          title: '✅ Penalty Applied',
          description: `Updated ${data.summary.total} EMIs. Online: ${data.summary.updatedOnline}, Offline: ${data.summary.updatedOffline}`
        });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to apply penalty', variant: 'destructive' });
    } finally {
      setApplyingPenalty(false);
    }
  };

  const update = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-7 w-7 text-indigo-600" />
            Notification & System Settings
          </h2>
          <p className="text-gray-500 mt-1">Control all automated alerts, penalties, and role access settings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSettings(DEFAULT_SETTINGS)}>
            <RotateCcw className="h-4 w-4 mr-2" />Reset Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save All Settings'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="scenarios" className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-1 h-auto p-1 bg-gray-100 rounded-xl">
          <TabsTrigger value="scenarios" className="rounded-lg text-sm">📋 Scenarios</TabsTrigger>
          <TabsTrigger value="penalty" className="rounded-lg text-sm">⚠️ Penalty</TabsTrigger>
          <TabsTrigger value="colors" className="rounded-lg text-sm">🎨 Colors</TabsTrigger>
          <TabsTrigger value="access" className="rounded-lg text-sm">🔒 Role Access</TabsTrigger>
        </TabsList>

        {/* ── Scenarios Tab ──────────────────────────────────────── */}
        <TabsContent value="scenarios" className="space-y-4">
          <Card className="border border-indigo-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-5 w-5 text-indigo-600" />
                Notification Scenarios
              </CardTitle>
              <CardDescription>
                Choose which events trigger automatic notifications. Each notification goes to the relevant role <strong>and</strong> the customer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {SCENARIO_LIST.map((scenario, i) => (
                <motion.div
                  key={scenario.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${scenario.bg}`}>
                      <scenario.icon className={`h-4 w-4 ${scenario.color}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{scenario.label}</p>
                      <p className="text-xs text-gray-400">{scenario.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={scenarioToggles[scenario.key]}
                    onCheckedChange={(v) => setScenarioToggles(prev => ({ ...prev, [scenario.key]: v }))}
                  />
                </motion.div>
              ))}
            </CardContent>
          </Card>

          {/* EMI Reminder Days */}
          <Card className="border border-blue-100">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                EMI Reminder Timing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Send First Reminder: {settings.sendEMIReminderDaysBefore} day(s) before due date</Label>
                <Slider
                  min={1} max={7} step={1}
                  value={[settings.sendEMIReminderDaysBefore]}
                  onValueChange={([v]) => update('sendEMIReminderDaysBefore', v)}
                  className="mt-3"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1 day before</span><span>7 days before</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border bg-blue-50/40">
                <div>
                  <p className="font-medium text-sm">Same-Day Reminder</p>
                  <p className="text-xs text-gray-500">Send notification on the actual due date morning</p>
                </div>
                <Switch
                  checked={settings.sendEMISameDayReminder}
                  onCheckedChange={(v) => update('sendEMISameDayReminder', v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Penalty Tab ──────────────────────────────────────────── */}
        <TabsContent value="penalty" className="space-y-4">
          <Card className="border border-red-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Penalty Configuration
              </CardTitle>
              <CardDescription>
                Penalty is automatically added when an EMI is overdue. Roles can edit it during payment — Super Admin gets notified if reduced.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Penalty Per Day (₹)</Label>
                  <Input
                    type="number"
                    value={settings.penaltyPerDay}
                    onChange={e => update('penaltyPerDay', parseFloat(e.target.value) || 0)}
                    className="font-semibold text-red-700"
                  />
                  <p className="text-xs text-gray-400">Added daily after due date</p>
                </div>
                <div className="space-y-2">
                  <Label>Grace Period (Days)</Label>
                  <Input
                    type="number"
                    value={settings.penaltyGraceDays}
                    onChange={e => update('penaltyGraceDays', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-gray-400">Days after due before penalty starts</p>
                </div>
                <div className="space-y-2">
                  <Label>Maximum Penalty Cap (₹)</Label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={settings.penaltyMaxAmount ?? ''}
                    onChange={e => update('penaltyMaxAmount', e.target.value ? parseFloat(e.target.value) : null)}
                  />
                  <p className="text-xs text-gray-400">Leave empty for no cap</p>
                </div>
              </div>

              {/* Penalty example calculator */}
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <p className="text-sm font-semibold text-red-700 mb-2">📊 Penalty Preview</p>
                <div className="grid grid-cols-4 gap-3 text-center">
                  {[1, 3, 7, 15].map(days => (
                    <div key={days} className="bg-white rounded-lg p-2 border border-red-100">
                      <p className="text-xs text-gray-500">{days} day{days>1?'s':''} overdue</p>
                      <p className="font-bold text-red-600">
                        ₹{Math.min(
                          days * settings.penaltyPerDay,
                          settings.penaltyMaxAmount || Infinity
                        ).toLocaleString('en-IN')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border bg-orange-50/40">
                <div>
                  <p className="font-medium text-sm">Notify Customer When Penalty Added</p>
                  <p className="text-xs text-gray-500">Customer sees penalty amount in notifications</p>
                </div>
                <Switch checked={settings.sendPenaltyNotify} onCheckedChange={v => update('sendPenaltyNotify', v)} />
              </div>

              <div>
                <Label>Re-notify Customer Every: {settings.penaltyNotifyIntervalHrs} hours</Label>
                <Slider min={6} max={72} step={6} value={[settings.penaltyNotifyIntervalHrs]}
                  onValueChange={([v]) => update('penaltyNotifyIntervalHrs', v)} className="mt-3" />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>6 hours</span><span>72 hours (3 days)</span>
                </div>
              </div>

              {/* Manual penalty apply button */}
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-3">
                  <Info className="inline h-4 w-4 mb-0.5 mr-1 text-blue-500" />
                  Penalty is auto-applied daily. You can also trigger it manually:
                </p>
                <Button
                  onClick={handleApplyPenalty}
                  disabled={applyingPenalty}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {applyingPenalty ? 'Applying...' : 'Apply Penalty Now (All Overdue EMIs)'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Colors Tab ───────────────────────────────────────────── */}
        <TabsContent value="colors" className="space-y-4">
          <Card className="border border-green-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-5 w-5 text-green-600" />
                Loan EMI Color System
              </CardTitle>
              <CardDescription>
                Configure when each color appears on loans in the active loans list. These colors blink to draw attention.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Color previews */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border-2 border-green-200 bg-green-50 text-center">
                  <div className="w-10 h-10 rounded-full bg-green-400 mx-auto mb-2 animate-pulse" />
                  <p className="font-semibold text-green-700">🟢 Green (Blink)</p>
                  <p className="text-xs text-gray-500 mt-1">{settings.colorGreenDays}+ days before due</p>
                  <p className="text-xs text-green-600 mt-1">"All good — upcoming soon"</p>
                </div>
                <div className="p-4 rounded-xl border-2 border-yellow-200 bg-yellow-50 text-center">
                  <div className="w-10 h-10 rounded-full bg-yellow-400 mx-auto mb-2 animate-pulse" />
                  <p className="font-semibold text-yellow-700">🟡 Yellow (Blink)</p>
                  <p className="text-xs text-gray-500 mt-1">{settings.colorYellowDays} day before due</p>
                  <p className="text-xs text-yellow-600 mt-1">"Send reminder today"</p>
                </div>
                <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50 text-center">
                  <div className="w-10 h-10 rounded-full bg-red-500 mx-auto mb-2 animate-pulse" />
                  <p className="font-semibold text-red-700">🔴 Red (Blink)</p>
                  <p className="text-xs text-gray-500 mt-1">Due today or overdue</p>
                  <p className="text-xs text-red-600 mt-1">"Overdue — penalty active"</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>🟢 Green Starts: {settings.colorGreenDays} days before due</Label>
                  <Slider min={2} max={7} step={1}
                    value={[settings.colorGreenDays]}
                    onValueChange={([v]) => update('colorGreenDays', v)} className="mt-3" />
                </div>
                <div>
                  <Label>🟡 Yellow Starts: {settings.colorYellowDays} day before due</Label>
                  <Slider min={1} max={3} step={1}
                    value={[settings.colorYellowDays]}
                    onValueChange={([v]) => update('colorYellowDays', v)} className="mt-3" />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border">
                <p className="text-sm font-medium text-gray-700 mb-2">Color Logic Summary:</p>
                <div className="space-y-1 text-sm">
                  <p>🔴 <strong>Red blink</strong> — Due today or past due date</p>
                  <p>🟡 <strong>Yellow blink</strong> — {settings.colorYellowDays} day before due</p>
                  <p>🟢 <strong>Green blink</strong> — {settings.colorGreenDays} days before due</p>
                  <p>⬜ <strong>Normal</strong> — More than {settings.colorGreenDays} days away</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Role Access Tab ──────────────────────────────────────── */}
        <TabsContent value="access" className="space-y-4">
          <Card className="border border-purple-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5 text-purple-600" />
                Mirror Loan Visibility by Role
              </CardTitle>
              <CardDescription>
                By default only Super Admin and Cashier can see mirror loans. Enable access for other roles here.
                When disabled, they see a "Not Accessible" message on the right side.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: 'agentCanSeeMirror', label: 'Agent', icon: Users, defaultOff: true },
                { key: 'staffCanSeeMirror', label: 'Staff', icon: Users, defaultOff: true },
                { key: 'companyCanSeeMirror', label: 'Company', icon: Users, defaultOff: true },
                { key: 'accountantCanSeeMirror', label: 'Accountant', icon: Shield, defaultOff: true },
              ].map((role, i) => (
                <motion.div
                  key={role.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl border bg-white"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${settings[role.key as keyof SystemSettings] ? 'bg-purple-50' : 'bg-gray-50'}`}>
                      {settings[role.key as keyof SystemSettings] ? (
                        <Eye className="h-4 w-4 text-purple-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{role.label}</p>
                      <p className="text-xs text-gray-400">
                        {settings[role.key as keyof SystemSettings]
                          ? 'Can see mirror loans'
                          : 'Cannot see mirror loans — shows "Not Accessible"'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={settings[role.key as keyof SystemSettings] ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}>
                      {settings[role.key as keyof SystemSettings] ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <Switch
                      checked={!!settings[role.key as keyof SystemSettings]}
                      onCheckedChange={(v) => update(role.key as keyof SystemSettings, v)}
                    />
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          {/* Processing Fee Config */}
          <Card className="border border-indigo-100">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-indigo-600" />
                Processing Fee Collection Mode
              </CardTitle>
              <CardDescription>When should processing fee be recorded as income?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm">Online Loans</Label>
                <div className="flex gap-2 mt-2">
                  {['AT_DISBURSEMENT', 'AT_EMI1'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => update('onlineProcessingFeeMode', mode)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        settings.onlineProcessingFeeMode === mode
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      {mode === 'AT_DISBURSEMENT' ? '🏦 At Disbursement' : '📅 At EMI #1'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm">Offline Loans</Label>
                <div className="flex gap-2 mt-2">
                  {['AT_CREATION', 'MANUAL'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => update('offlineProcessingFeeMode', mode)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        settings.offlineProcessingFeeMode === mode
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      {mode === 'AT_CREATION' ? '✏️ At Loan Creation' : '🖐 Manual'}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Notification button */}
          <Card className="border border-gray-200 bg-gray-50">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-gray-800">Test Penalty Engine</p>
                  <p className="text-xs text-gray-500">Apply penalty to all currently overdue EMIs right now</p>
                </div>
                <Button onClick={handleApplyPenalty} disabled={applyingPenalty} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                  <Send className="h-4 w-4 mr-2" />
                  {applyingPenalty ? 'Running...' : 'Run Penalty Engine'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save ribbon */}
      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg px-8">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  );
}
