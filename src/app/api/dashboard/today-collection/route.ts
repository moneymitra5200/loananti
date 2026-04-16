import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/dashboard/today-collection
 *
 * Returns today's EMI collection breakdown:
 * - Total collected (all companies)
 * - Per-company: cash, online, total
 * - Collector role breakdown (who collected what)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); // optional YYYY-MM-DD, defaults to today

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // ── 1. Online loan EMI payments (Payment table) ────────────────────────────
    const onlinePayments = await db.payment.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        emiSchedule: {
          include: {
            loanApplication: {
              include: { company: { select: { id: true, name: true, code: true } } },
            },
          },
        },
      },
    });

    // ── 2. Offline loan EMI payments (OfflineLoanEMI table) ───────────────────
    const offlineEmis = await db.offlineLoanEMI.findMany({
      where: {
        paymentStatus: { in: ['PAID', 'INTEREST_ONLY_PAID', 'PARTIALLY_PAID'] },
        paidDate: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        offlineLoan: {
          include: { company: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    // ── 3. Credit transactions for collector info ─────────────────────────────
    const creditTxs = await db.creditTransaction.findMany({
      where: {
        sourceType: 'EMI_PAYMENT',
        transactionType: 'CREDIT_INCREASE',
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        user: { select: { id: true, name: true, role: true, email: true } },
      },
    });

    // ── Build company map ──────────────────────────────────────────────────────
    const companyMap = new Map<string, {
      id: string; name: string; code: string;
      cashTotal: number; onlineTotal: number; total: number;
      onlineEmiCount: number; offlineEmiCount: number;
    }>();

    const ensureCompany = (id: string, name: string, code: string) => {
      if (!companyMap.has(id)) {
        companyMap.set(id, { id, name, code, cashTotal: 0, onlineTotal: 0, total: 0, onlineEmiCount: 0, offlineEmiCount: 0 });
      }
      return companyMap.get(id)!;
    };

    const ONLINE_MODES = new Set(['ONLINE', 'UPI', 'BANK_TRANSFER', 'NEFT', 'RTGS', 'IMPS', 'CHEQUE']);

    for (const p of onlinePayments) {
      const company = p.emiSchedule?.loanApplication?.company;
      if (!company) continue;
      const c = ensureCompany(company.id, company.name, company.code);
      const amount = Number(p.amount) || 0;
      const isOnline = ONLINE_MODES.has((p.paymentMode || '').toUpperCase());
      if (isOnline) c.onlineTotal += amount; else c.cashTotal += amount;
      c.total += amount;
      c.onlineEmiCount++;
    }

    for (const e of offlineEmis) {
      const company = e.offlineLoan?.company;
      if (!company) continue;
      const c = ensureCompany(company.id, company.name, company.code);
      const amount = Number(e.paidAmount) || 0;
      const isOnline = ONLINE_MODES.has((e.paymentMode || '').toUpperCase());
      if (isOnline) c.onlineTotal += amount; else c.cashTotal += amount;
      c.total += amount;
      c.offlineEmiCount++;
    }

    // ── Collector (role) breakdown from credit transactions ───────────────────
    const collectorMap = new Map<string, { id: string; name: string; role: string; total: number; personal: number; company: number }>();
    for (const tx of creditTxs) {
      const u = tx.user;
      if (!u) continue;
      if (!collectorMap.has(u.id)) {
        collectorMap.set(u.id, { id: u.id, name: u.name || 'Unknown', role: u.role || 'STAFF', total: 0, personal: 0, company: 0 });
      }
      const col = collectorMap.get(u.id)!;
      const amt = Number(tx.amount) || 0;
      col.total += amt;
      if (tx.creditType === 'PERSONAL') col.personal += amt;
      else col.company += amt;
    }

    const companies = [...companyMap.values()].sort((a, b) => b.total - a.total);
    const collectors = [...collectorMap.values()].sort((a, b) => b.total - a.total);

    const grandTotal = companies.reduce((s, c) => s + c.total, 0);
    const grandCash = companies.reduce((s, c) => s + c.cashTotal, 0);
    const grandOnline = companies.reduce((s, c) => s + c.onlineTotal, 0);

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      summary: { total: grandTotal, cash: grandCash, online: grandOnline },
      companies,
      collectors,
      emiCounts: {
        online: onlinePayments.length,
        offline: offlineEmis.length,
        total: onlinePayments.length + offlineEmis.length,
      },
    });
  } catch (error: any) {
    console.error('[TodayCollection] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
