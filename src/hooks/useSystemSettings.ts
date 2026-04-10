/**
 * useSystemSettings — lightweight hook to fetch SystemSettings from /api/system-settings.
 * Caches the result in module-level memory so it's only fetched once per browser session.
 */

import { useState, useEffect } from 'react';

export interface SystemSettings {
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

const DEFAULT: SystemSettings = {
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

// Module-level cache so we don't re-fetch on every component mount
let cachedSettings: SystemSettings | null = null;
let fetchPromise: Promise<SystemSettings> | null = null;

async function loadSettings(): Promise<SystemSettings> {
  if (cachedSettings) return cachedSettings;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/system-settings')
    .then(r => r.json())
    .then(data => {
      if (data.success && data.settings) {
        cachedSettings = { ...DEFAULT, ...data.settings };
      } else {
        cachedSettings = DEFAULT;
      }
      fetchPromise = null;
      return cachedSettings!;
    })
    .catch(() => {
      fetchPromise = null;
      cachedSettings = DEFAULT;
      return DEFAULT;
    });

  return fetchPromise;
}

export function invalidateSystemSettingsCache() {
  cachedSettings = null;
  fetchPromise = null;
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(cachedSettings ?? DEFAULT);
  const [loading, setLoading] = useState(!cachedSettings);

  useEffect(() => {
    if (cachedSettings) {
      setSettings(cachedSettings);
      setLoading(false);
      return;
    }
    loadSettings().then(s => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  return { settings, loading };
}
