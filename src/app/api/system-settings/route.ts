import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Default settings
const DEFAULT_SETTINGS = {
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
  notificationScenarios: null,
  themeColor: '#4F46E5',
};

/** Parse notificationScenarios from stored JSON string → object */
function parseSettings(settings: any) {
  if (!settings) return settings;
  return {
    ...settings,
    notificationScenarios: settings.notificationScenarios
      ? JSON.parse(settings.notificationScenarios)
      : {}
  };
}

// GET — Fetch system settings (creates defaults if none exist)
export async function GET() {
  try {
    let settings = await (db as any).systemSettings.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    if (!settings) {
      settings = await (db as any).systemSettings.create({
        data: DEFAULT_SETTINGS
      });
    }

    return NextResponse.json({ success: true, settings: parseSettings(settings) });
  } catch (error) {
    console.error('[SystemSettings] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT — Update system settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { updatedById, notificationScenarios, themeColor, ...rest } = body;

    // Serialize notificationScenarios object → JSON string for storage
    const updateData: any = {
      ...rest,
      updatedById,
      updatedAt: new Date(),
    };
    if (notificationScenarios !== undefined) {
      updateData.notificationScenarios = JSON.stringify(notificationScenarios);
    }
    if (themeColor !== undefined) {
      updateData.themeColor = themeColor;
    }

    let settings = await (db as any).systemSettings.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    if (!settings) {
      settings = await (db as any).systemSettings.create({
        data: {
          ...DEFAULT_SETTINGS,
          ...updateData,
          notificationScenarios: notificationScenarios ? JSON.stringify(notificationScenarios) : null,
          themeColor: themeColor || DEFAULT_SETTINGS.themeColor,
        }
      });
    } else {
      settings = await (db as any).systemSettings.update({
        where: { id: settings.id },
        data: updateData
      });
    }

    return NextResponse.json({ success: true, settings: parseSettings(settings) });
  } catch (error) {
    console.error('[SystemSettings] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
