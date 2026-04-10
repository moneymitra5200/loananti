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
};

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

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('[SystemSettings] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT — Update system settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { updatedById, ...updateData } = body;

    let settings = await (db as any).systemSettings.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    if (!settings) {
      settings = await (db as any).systemSettings.create({
        data: { ...DEFAULT_SETTINGS, ...updateData, updatedById }
      });
    } else {
      settings = await (db as any).systemSettings.update({
        where: { id: settings.id },
        data: { ...updateData, updatedById, updatedAt: new Date() }
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('[SystemSettings] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
