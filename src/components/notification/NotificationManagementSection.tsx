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
  Eye, EyeOff, Palette, Info, Save, RotateCcw, Send, Activity,
  PlayCircle, Calendar, Timer
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

// Default theme color
const DEFAULT_THEME_COLOR = '#4F46E5'; // indigo-600

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
  // Scenario toggles stored as JSON
  notificationScenarios?: Record<string, boolean>;
  // Theme color
  themeColor?: string;
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
  notificationScenarios: {},
  themeColor: DEFAULT_THEME_COLOR,
};

const DEFAULT_SCENARIO_TOGGLES = SCENARIO_LIST.reduce((acc, s) => ({ ...acc, [s.key]: true }), {} as Record<string, boolean>);

interface Props {
  userId: string;
}

export default function NotificationManagementSection({ userId }: Props) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingPenalty, setApplyingPenalty] = useState(false);
  const [scenarioToggles, setScenarioToggles] = useState<Record<string, boolean>>(DEFAULT_SCENARIO_TOGGLES);
  const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR);
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState<any>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/system-settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        // Restore scenario toggles from saved settings
        if (data.settings.notificationScenarios && Object.keys(data.settings.notificationScenarios).length > 0) {
          setScenarioToggles({ ...DEFAULT_SCENARIO_TOGGLES, ...data.settings.notificationScenarios });
        }
        // Restore theme color
        if (data.settings.themeColor) {
          setThemeColor(data.settings.themeColor);
          applyThemeColor(data.settings.themeColor);
        }
      }
    } catch { /* use defaults */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const applyThemeColor = (color: string) => {
    // Apply to CSS root variable immediately
    document.documentElement.style.setProperty('--primary-color', color);
  };

  const handleColorChange = (color: string) => {
    setThemeColor(color);
    applyThemeColor(color);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/system-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          notificationScenarios: scenarioToggles,
          themeColor,
          updatedById: userId
        })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: '✅ Settings Saved', description: 'All notification, penalty and color settings have been updated.' });
        setSettings(data.settings);
      } else {
        throw new Error(data.error || 'Save failed');
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
          description: `Updated ${data.summary.total} EMIs. Online: ${data.summary.updatedOnline}, Offline: ${data.summary.updatedOffline}. ${data.summary.tierFormula}`
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

  const handleTriggerCron = async (cronPath: string, label: string) => {
    setCronRunning(true);
    setCronResult(null);
    try {
      const res = await fetch(cronPath);
      const data = await res.json();
      setCronResult({ label, ...data, ok: res.ok });
      toast({
        title: data.success ? `✅ ${label} Completed` : `❌ ${label} Failed`,
        description: data.success
          ? `Online: ${data.stats?.onlineOverdue ?? 0} overdue, Offline: ${data.stats?.offlineOverdue ?? 0} overdue. Notifications sent.`
          : data.error || 'Cron failed',
        variant: data.success ? 'default' : 'destructive',
      });
    } catch (err: any) {
      setCronResult({ label, ok: false, error: err.message });
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCronRunning(false);
    }
  };

  const toggleScenario = (key: string, value: boolean) => {
    setScenarioToggles(prev => ({ ...prev, [key]: value }));
  };

  const enableAllScenarios = () => {
    setScenarioToggles(SCENARIO_LIST.reduce((acc, s) => ({ ...acc, [s.key]: true }), {}));
  };

  const disableAllScenarios = () => {
    setScenarioToggles(SCENARIO_LIST.reduce((acc, s) => ({ ...acc, [s.key]: false }), {}));
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
          <p className="text-gray-500 mt-1">Control all automated alerts, penalties, colors and role access settings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setSettings(DEFAULT_SETTINGS); setScenarioToggles(DEFAULT_SCENARIO_TOGGLES); setThemeColor(DEFAULT_THEME_COLOR); }}>
            <RotateCcw className="h-4 w-4 mr-2" />Reset Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save All Settings'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="scenarios" className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 gap-1 h-auto p-1 bg-gray-100 rounded-xl">
          <TabsTrigger value="scenarios" className="rounded-lg text-sm">📋 Scenarios</TabsTrigger>
          <TabsTrigger value="penalty" className="rounded-lg text-sm">⚠️ Penalty</TabsTrigger>
          <TabsTrigger value="colors" className="rounded-lg text-sm">🎨 Colors</TabsTrigger>
          <TabsTrigger value="access" className="rounded-lg text-sm">🔒 Role Access</TabsTrigger>
          <TabsTrigger value="crons" className="rounded-lg text-sm">⏰ Cron Jobs</TabsTrigger>
        </TabsList>

        {/* ── Scenarios Tab ──────────────────────────────────────── */}
        <TabsContent value="scenarios" className="space-y-4">
          <Card className="border border-indigo-100">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bell className="h-5 w-5 text-indigo-600" />
                    Notification Scenarios
                  </CardTitle>
                  <CardDescription>
                    Choose which events trigger automatic notifications. Changes are saved when you click "Save All Settings".
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={enableAllScenarios}>Enable All</Button>
                  <Button size="sm" variant="outline" onClick={disableAllScenarios}>Disable All</Button>
                </div>
              </div>
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
                  <div className="flex items-center gap-2">
                    <Badge className={scenarioToggles[scenario.key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                      {scenarioToggles[scenario.key] ? 'ON' : 'OFF'}
                    </Badge>
                    <Switch
                      checked={scenarioToggles[scenario.key] ?? true}
                      onCheckedChange={(v) => toggleScenario(scenario.key, v)}
                    />
                  </div>
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
                Penalty is automatically calculated using a tiered formula based on loan amount. Roles can edit it during payment — Super Admin gets notified if reduced.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Tiered penalty info */}
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm font-semibold text-red-700 mb-3">📊 Tiered Penalty Formula</p>
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div className="bg-white rounded-lg p-3 border border-red-100">
                    <p className="font-bold text-red-600">₹100/day</p>
                    <p className="text-xs text-gray-500 mt-1">Loan ≤ ₹1 Lakh</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-red-100">
                    <p className="font-bold text-red-600">₹200/day</p>
                    <p className="text-xs text-gray-500 mt-1">₹1L – ₹3 Lakh</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-red-100">
                    <p className="font-bold text-red-600">₹100×lakhs/day</p>
                    <p className="text-xs text-gray-500 mt-1">Above ₹3 Lakh</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Example: 4L loan = ₹400/day | 5L loan = ₹500/day</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grace Period (Days)</Label>
                  <Input
                    type="number"
                    value={settings.penaltyGraceDays}
                    onChange={e => update('penaltyGraceDays', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-gray-400">Days after due date before penalty starts</p>
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

              {/* Manual penalty apply */}
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-3">
                  <Info className="inline h-4 w-4 mb-0.5 mr-1 text-blue-500" />
                  Penalty is auto-applied daily via cron. You can also apply it manually:
                </p>
                <Button onClick={handleApplyPenalty} disabled={applyingPenalty} className="bg-red-600 hover:bg-red-700">
                  <Zap className="h-4 w-4 mr-2" />
                  {applyingPenalty ? 'Applying...' : 'Apply Penalty Now (All Overdue EMIs)'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Colors Tab ───────────────────────────────────────────── */}
        <TabsContent value="colors" className="space-y-4">
          {/* ── Theme Color Picker ── */}
          <Card className="border border-purple-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-5 w-5 text-purple-600" />
                App Theme Color
              </CardTitle>
              <CardDescription>
                Change the primary accent color of the entire app. Click "Save All Settings" to persist.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Custom Color</p>
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-20 h-20 rounded-xl cursor-pointer border-2 border-gray-200 p-1"
                    style={{ backgroundColor: themeColor }}
                  />
                  <p className="text-xs text-gray-500 mt-1 font-mono">{themeColor}</p>
                </div>

                {/* Preset colors */}
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-3">Quick Presets</p>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { name: 'Indigo', color: '#4F46E5' },
                      { name: 'Blue', color: '#2563EB' },
                      { name: 'Emerald', color: '#059669' },
                      { name: 'Violet', color: '#7C3AED' },
                      { name: 'Rose', color: '#E11D48' },
                      { name: 'Amber', color: '#D97706' },
                      { name: 'Teal', color: '#0D9488' },
                      { name: 'Cyan', color: '#0891B2' },
                      { name: 'Orange', color: '#EA580C' },
                      { name: 'Fuchsia', color: '#A21CAF' },
                    ].map((preset) => (
                      <button
                        key={preset.color}
                        onClick={() => handleColorChange(preset.color)}
                        className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${themeColor === preset.color ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: preset.color }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 rounded-xl border" style={{ borderColor: themeColor + '40' }}>
                <p className="text-sm font-medium text-gray-700 mb-3">Live Preview</p>
                <div className="flex flex-wrap gap-3">
                  <Button style={{ backgroundColor: themeColor, color: 'white', borderColor: themeColor }}>
                    Primary Button
                  </Button>
                  <Badge style={{ backgroundColor: themeColor + '20', color: themeColor }}>
                    Badge Example
                  </Badge>
                  <div className="flex items-center gap-2 text-sm" style={{ color: themeColor }}>
                    <Settings className="h-4 w-4" /> Accent Text
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── EMI Color System ── */}
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
        </TabsContent>

        {/* ── Cron Jobs Tab ─────────────────────────────────────────── */}
        <TabsContent value="crons" className="space-y-4">
          <Card className="border border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Timer className="h-5 w-5 text-blue-600" />
                Scheduled Cron Jobs
              </CardTitle>
              <CardDescription>
                These jobs run automatically on Vercel. You can also trigger them manually to test or catch up on missed runs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Schedule info table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-50 text-blue-700">
                      <th className="text-left p-3 rounded-tl-lg">Cron Job</th>
                      <th className="text-left p-3">Schedule (IST)</th>
                      <th className="text-left p-3">UTC Schedule</th>
                      <th className="text-left p-3 rounded-tr-lg">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-medium">🌅 Morning Overdue Alert</td>
                      <td className="p-3 text-gray-600">8:00 AM IST</td>
                      <td className="p-3 font-mono text-xs text-gray-500">30 2 * * *</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleTriggerCron('/api/cron/overdue-notify', '🌅 Morning Overdue Alert')}
                          disabled={cronRunning}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg disabled:opacity-50 transition-colors"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          {cronRunning ? 'Running...' : 'Run Now'}
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-medium">☀️ Afternoon Overdue Alert</td>
                      <td className="p-3 text-gray-600">1:00 PM IST</td>
                      <td className="p-3 font-mono text-xs text-gray-500">30 7 * * *</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleTriggerCron('/api/cron/overdue-notify', '☀️ Afternoon Overdue Alert')}
                          disabled={cronRunning}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg disabled:opacity-50 transition-colors"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          {cronRunning ? 'Running...' : 'Run Now'}
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="p-3 font-medium">🌆 Evening Overdue Alert</td>
                      <td className="p-3 text-gray-600">7:00 PM IST</td>
                      <td className="p-3 font-mono text-xs text-gray-500">30 13 * * *</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleTriggerCron('/api/cron/overdue-notify', '🌆 Evening Overdue Alert')}
                          disabled={cronRunning}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg disabled:opacity-50 transition-colors"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          {cronRunning ? 'Running...' : 'Run Now'}
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50 border-t-2 border-gray-200">
                      <td className="p-3 font-medium">⚡ Auto Penalty Apply</td>
                      <td className="p-3 text-gray-600">12:00 AM IST</td>
                      <td className="p-3 font-mono text-xs text-gray-500">30 18 * * *</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleTriggerCron('/api/cron/auto-penalty', '⚡ Auto Penalty Apply')}
                          disabled={cronRunning}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg disabled:opacity-50 transition-colors"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          {cronRunning ? 'Running...' : 'Run Now'}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Cron result display */}
              {cronResult && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl border ${cronResult.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {cronResult.ok
                      ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                      : <AlertTriangle className="h-5 w-5 text-red-600" />}
                    <span className="font-semibold text-sm">{cronResult.label}</span>
                  </div>
                  {cronResult.stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mt-2">
                      <div className="bg-white rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-orange-600">{cronResult.stats.onlineOverdue ?? 0}</p>
                        <p className="text-xs text-gray-500">Online Overdue</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-red-600">{cronResult.stats.offlineOverdue ?? 0}</p>
                        <p className="text-xs text-gray-500">Offline Overdue</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-blue-600">{cronResult.stats.customerNotifications ?? 0}</p>
                        <p className="text-xs text-gray-500">Customer Alerts</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-purple-600">{cronResult.stats.staffNotifications ?? 0}</p>
                        <p className="text-xs text-gray-500">Staff Alerts</p>
                      </div>
                    </div>
                  )}
                  {cronResult.error && (
                    <p className="text-sm text-red-700 mt-2">Error: {cronResult.error}</p>
                  )}
                  {(cronResult.stats?.errors?.length > 0) && (
                    <p className="text-xs text-orange-700 mt-2">{cronResult.stats.errors.length} minor error(s) during run.</p>
                  )}
                </motion.div>
              )}

              {/* Info box */}
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-sm font-semibold text-blue-800 mb-2">📋 What these crons do:</p>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li><strong>Overdue Alert (3x daily)</strong>: Finds all overdue EMIs (online + offline), sends push + in-app notifications to customer, loan agent, company, and super admin showing EMI amount + penalty.</li>
                  <li><strong>Auto Penalty (midnight)</strong>: Adds daily penalty to all overdue EMIs based on loan amount tier (₹100–₹500+/day).</li>
                  <li>All notifications appear in the 🔔 bell panel AND as phone push notifications.</li>
                </ul>
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
