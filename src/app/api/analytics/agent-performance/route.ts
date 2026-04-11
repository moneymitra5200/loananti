import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { startOfMonth, subMonths, endOfMonth } from 'date-fns';

function periodMetrics(loans: any[]) {
  const disbursed = loans.filter(l =>
    ['ACTIVE', 'DISBURSED', 'ACTIVE_INTEREST_ONLY', 'CLOSED'].includes(l.status)
  );
  const rejected = loans.filter(l => l.status?.includes('REJECTED'));
  const amount = disbursed.reduce(
    (s: number, l: any) => s + (l.disbursedAmount || l.requestedAmount || 0), 0
  );
  return {
    apps: loans.length,
    disbursed: disbursed.length,
    rejected: rejected.length,
    pending: loans.length - disbursed.length - rejected.length,
    amount,
    convRate: loans.length > 0 ? parseFloat(((disbursed.length / loans.length) * 100).toFixed(1)) : 0,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId') || undefined;

    const now = new Date();
    const since3M = startOfMonth(subMonths(now, 3));

    // Define 4 periods
    const periods = {
      current:        { start: startOfMonth(now),              end: now },
      lastMonth:      { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) },
      twoMonthsAgo:   { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(subMonths(now, 2)) },
      threeMonthsAgo: { start: startOfMonth(subMonths(now, 3)), end: endOfMonth(subMonths(now, 3)) },
    };

    // Fetch all active agents
    const agents = await db.user.findMany({
      where: { role: 'AGENT', isActive: true },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
        companyId: true,
      },
      orderBy: { name: 'asc' },
    });

    if (agents.length === 0) {
      return NextResponse.json({
        success: true,
        agents: [],
        summary: {
          totalAgents: 0, activeAgents: 0, topPerformers: [],
          periodLabels: {
            current:        `${now.toLocaleString('en-IN', { month: 'short' })} (partial)`,
            lastMonth:      subMonths(now, 1).toLocaleString('en-IN', { month: 'long' }),
            twoMonthsAgo:   subMonths(now, 2).toLocaleString('en-IN', { month: 'long' }),
            threeMonthsAgo: subMonths(now, 3).toLocaleString('en-IN', { month: 'long' }),
          },
        },
      });
    }

    const agentIds = agents.map(a => a.id);

    // ── Online loans: query via SessionForm (which has agentId) ──────────────
    const sessionForms = await db.sessionForm.findMany({
      where: {
        agentId:    { in: agentIds },
        createdAt:  { gte: since3M },
        deletedAt:  null,
        loanApplication: companyId ? { companyId } : undefined,
      },
      select: {
        agentId: true,
        loanApplication: {
          select: {
            status:          true,
            createdAt:       true,
            requestedAmount: true,
            disbursedAmount: true,
          },
        },
      },
    });

    // ── Offline loans: linked by createdById (agent is creator) ─────────────
    const offlineLoans = await db.offlineLoan.findMany({
      where: {
        createdById:   { in: agentIds },
        createdByRole: 'AGENT',
        createdAt:     { gte: since3M },
        ...(companyId ? { companyId } : {}),
      },
      select: {
        id:          true,
        createdById: true,
        status:      true,
        createdAt:   true,
        loanAmount:  true,
      },
    });

    // ── Build per-agent stats ────────────────────────────────────────────────
    const agentStats = agents.map(agent => {
      // Online loans for this agent (from sessionForms)
      const onlineRaw = sessionForms
        .filter(sf => sf.agentId === agent.id && sf.loanApplication)
        .map(sf => ({
          status:          sf.loanApplication!.status,
          createdAt:       sf.loanApplication!.createdAt,
          disbursedAmount: sf.loanApplication!.disbursedAmount,
          requestedAmount: sf.loanApplication!.requestedAmount,
        }));

      // Offline loans for this agent
      const offlineRaw = offlineLoans
        .filter(l => l.createdById === agent.id)
        .map(l => ({
          status:          l.status === 'ACTIVE' ? 'ACTIVE' : l.status === 'CLOSED' ? 'CLOSED' : l.status,
          createdAt:       l.createdAt,
          disbursedAmount: l.loanAmount,
          requestedAmount: l.loanAmount,
        }));

      const allLoans = [...onlineRaw, ...offlineRaw];

      const inPeriod = (start: Date, end: Date) =>
        allLoans.filter(l => { const d = new Date(l.createdAt); return d >= start && d <= end; });

      const pCurrent        = periodMetrics(inPeriod(periods.current.start,        periods.current.end));
      const pLastMonth      = periodMetrics(inPeriod(periods.lastMonth.start,      periods.lastMonth.end));
      const pTwoMonthsAgo   = periodMetrics(inPeriod(periods.twoMonthsAgo.start,   periods.twoMonthsAgo.end));
      const pThreeMonthsAgo = periodMetrics(inPeriod(periods.threeMonthsAgo.start, periods.threeMonthsAgo.end));

      // Growth score: last month vs 2 months ago
      const growthScore = pLastMonth.disbursed > 0 && pTwoMonthsAgo.disbursed > 0
        ? parseFloat((pLastMonth.disbursed / pTwoMonthsAgo.disbursed).toFixed(2))
        : (pLastMonth.disbursed > 0 ? 2 : 0.5);

      // Trend sparkline: 3M → 2M → 1M → current
      const trend = [
        { label: `-3M`, ...pThreeMonthsAgo },
        { label: `-2M`, ...pTwoMonthsAgo },
        { label: `Last`, ...pLastMonth },
        { label: `Now`,  ...pCurrent },
      ];

      // Momentum: annualise current partial month vs last full month
      const daysNow  = now.getDate();
      const daysLast = endOfMonth(subMonths(now, 1)).getDate();
      const currentProjected = daysNow > 0
        ? Math.round((pCurrent.disbursed / daysNow) * daysLast)
        : pCurrent.disbursed;

      const momentum = pLastMonth.disbursed > 0
        ? parseFloat((((currentProjected - pLastMonth.disbursed) / pLastMonth.disbursed) * 100).toFixed(1))
        : (currentProjected > 0 ? 100 : 0);

      return {
        id:               agent.id,
        name:             agent.name || 'Unknown',
        phone:            agent.phone || '',
        email:            agent.email || '',
        joinedAt:         agent.createdAt,
        companyId:        agent.companyId,
        totalLoans:       allLoans.length,
        totalDisbursed:   allLoans.filter(l => ['ACTIVE','DISBURSED','ACTIVE_INTEREST_ONLY','CLOSED'].includes(l.status)).length,
        periods: {
          current:        pCurrent,
          lastMonth:      pLastMonth,
          twoMonthsAgo:   pTwoMonthsAgo,
          threeMonthsAgo: pThreeMonthsAgo,
        },
        trend,
        growthScore,
        momentum,
        currentProjected,
        isGrowing: growthScore >= 1,
      };
    });

    // Sort by last month disbursed desc
    agentStats.sort((a, b) => b.periods.lastMonth.disbursed - a.periods.lastMonth.disbursed);

    const activeAgents  = agentStats.filter(a => a.periods.lastMonth.apps > 0 || a.periods.current.apps > 0);
    const topPerformers = agentStats.slice(0, 5);

    return NextResponse.json({
      success: true,
      agents:  agentStats,
      summary: {
        totalAgents:    agents.length,
        activeAgents:   activeAgents.length,
        topPerformers,
        periodLabels: {
          current:        `${now.toLocaleString('en-IN', { month: 'short' })} (partial)`,
          lastMonth:      subMonths(now, 1).toLocaleString('en-IN', { month: 'long' }),
          twoMonthsAgo:   subMonths(now, 2).toLocaleString('en-IN', { month: 'long' }),
          threeMonthsAgo: subMonths(now, 3).toLocaleString('en-IN', { month: 'long' }),
        },
      },
    });
  } catch (error) {
    console.error('[Agent Analytics]', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent analytics', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
