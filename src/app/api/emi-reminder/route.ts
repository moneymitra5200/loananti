import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getISTDateKey, getISTDayStart, getISTDayEnd, getISTTodayStart } from '@/utils/helpers';

/**
 * Returns the penalty per day based on the loan amount.
 * Formula: loan_amount / 1000 = penalty per day
 * Examples:
 *   ₹1,00,000 (1 L)   → ₹100 / day
 *   ₹2,00,000 (2 L)   → ₹200 / day
 *   ₹3,00,000 (3 L)   → ₹300 / day
 *   ₹50,000           → ₹50 / day
 *   ₹5,00,000 (5 L)   → ₹500 / day
 */
function getPenaltyPerDay(loanAmount: number): number {
  return Math.round(loanAmount / 1000);
}

/**
 * Calculate penalty for an EMI based on days overdue and loan amount
 */
function calculatePenalty(dueDate: Date, loanAmount: number, graceDays: number = 0): { daysOverdue: number; penaltyAmount: number; ratePerDay: number } {
  const today = getISTTodayStart();
  // Use IST date key to get the correct IST date for the due date, then convert to IST midnight
  const dueIST = getISTDayStart(getISTDateKey(dueDate));
  
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueIST.getTime()) / msPerDay) - graceDays);
  const ratePerDay = getPenaltyPerDay(loanAmount);
  const penaltyAmount = daysOverdue * ratePerDay;
  
  return { daysOverdue, penaltyAmount, ratePerDay };
}

// GET - Get EMI reminders for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'userId and userRole are required' }, { status: 400 });
    }

    // Get system settings for grace days
    let settings: any = await (db as any).systemSettings.findFirst();
    const graceDays = settings?.penaltyGraceDays || 0;

    // Get all online mirror loan IDs to exclude them from calculations / alerts / collection
    const mirrorMappings = await db.mirrorLoanMapping.findMany({
      where: { mirrorLoanId: { not: null } },
      select: { mirrorLoanId: true }
    });
    const mirrorLoanIds = mirrorMappings.map(m => m.mirrorLoanId).filter(Boolean) as string[];

    // Get today's and tomorrow's EMIs (both online and offline)
    if (action === 'today-tomorrow') {
      // IST-safe: get today's date key in IST, then derive boundaries
      const todayKey = getISTDateKey(new Date());
      const today = getISTDayStart(todayKey);
      
      const tomorrowDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowKey = getISTDateKey(tomorrowDate);
      const tomorrow = getISTDayStart(tomorrowKey);
      
      const dayAfterDate = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
      const dayAfterKey = getISTDateKey(dayAfterDate);
      const dayAfter = getISTDayStart(dayAfterKey);

      // Get online loan EMIs with loan amount for penalty calculation
      const onlineEmiWhere: Record<string, unknown> = {
        paymentStatus: { in: ['PENDING', 'OVERDUE'] },
        loanApplication: {
          status: { in: ['ACTIVE', 'DISBURSED', 'ACTIVE_INTEREST_ONLY'] }
        }
      };
      if (mirrorLoanIds.length > 0) {
        onlineEmiWhere.loanApplicationId = { notIn: mirrorLoanIds };
      }

      // For agents, filter by their loans
      if (userRole === 'AGENT') {
        onlineEmiWhere.loanApplication = {
          status: { in: ['ACTIVE', 'DISBURSED', 'ACTIVE_INTEREST_ONLY'] },
          sessionForm: { agentId: userId }
        };
      }

      const onlineEmis = await db.eMISchedule.findMany({
        where: onlineEmiWhere,
        include: {
          loanApplication: {
            select: {
              id: true,
              applicationNo: true,
              firstName: true,
              lastName: true,
              phone: true,
              address: true,
              companyId: true,
              sessionForm: { select: { approvedAmount: true } }
            }
          }
        }
      });

      // Get offline loan EMIs with loan amount for penalty calculation
      // IMPORTANT: isMirrorLoan=true loans are excluded — mirror EMIs are internal accounting
      // duplicates of the original loan and must never be double-counted in alerts.
      const offlineEmiWhere: Record<string, unknown> = {
        paymentStatus: { in: ['PENDING', 'OVERDUE'] },
        offlineLoan: {
          isMirrorLoan: false,
          status: { in: ['ACTIVE', 'INTEREST_ONLY'] }
        }
      };

      if (userRole === 'AGENT') {
        offlineEmiWhere.offlineLoan = {
          isMirrorLoan: false,
          status: { in: ['ACTIVE', 'INTEREST_ONLY'] },
          createdById: userId
        };
      }

      const offlineEmis = await db.offlineLoanEMI.findMany({
        where: offlineEmiWhere,
        include: {
          offlineLoan: {
            select: {
              id: true,
              loanNumber: true,
              customerName: true,
              customerPhone: true,
              customerAddress: true,
              loanAmount: true,
              isMirrorLoan: true
            }
          }
        }
      });

      // Exclude EMIs where remaining balance is 0 or paidAmount >= totalAmount
      const activeOnlineEmis = onlineEmis.filter(e => (e.totalAmount - (e.paidAmount || 0)) > 0.01);
      const activeOfflineEmis = offlineEmis.filter(e => (e.totalAmount - (e.paidAmount || 0)) > 0.01);

      // Add penalty info to online EMIs
      const onlineEmisWithPenalty = activeOnlineEmis.map(e => {
        const isPaid = ['PAID', 'WAIVED', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus);
        const loanAmount = e.loanApplication?.sessionForm?.approvedAmount || e.totalAmount;
        if (isPaid) {
          const isPaidOnTime = e.paidDate && e.dueDate && new Date(e.paidDate) <= new Date(e.dueDate);
          const actualPenaltyPaid = isPaidOnTime ? 0 : (e.penaltyPaid || 0);
          return { ...e, loanAmount, daysOverdue: 0, penaltyAmount: actualPenaltyPaid, penaltyPaid: actualPenaltyPaid, ratePerDay: 0 };
        }
        const { daysOverdue, penaltyAmount, ratePerDay } = calculatePenalty(e.dueDate, loanAmount, graceDays);
        return { ...e, loanAmount, daysOverdue, penaltyAmount: e.penaltyAmount || penaltyAmount, ratePerDay };
      });

      // Add penalty info to offline EMIs
      const offlineEmisWithPenalty = activeOfflineEmis.map(e => {
        const isPaid = ['PAID', 'WAIVED', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus);
        const loanAmount = e.offlineLoan?.loanAmount || e.totalAmount;
        if (isPaid) {
          const isPaidOnTime = e.paidDate && e.dueDate && new Date(e.paidDate) <= new Date(e.dueDate);
          const actualPenaltyPaid = isPaidOnTime ? 0 : (e.penaltyPaid || 0);
          return { ...e, loanAmount, daysOverdue: 0, penaltyAmount: actualPenaltyPaid, penaltyPaid: actualPenaltyPaid, ratePerDay: 0 };
        }
        const { daysOverdue, penaltyAmount, ratePerDay } = calculatePenalty(e.dueDate, loanAmount, graceDays);
        return { ...e, loanAmount, daysOverdue, penaltyAmount: e.penaltyAmount || penaltyAmount, ratePerDay };
      });

      // Categorize EMIs using IST date key comparison
      const todayEmis = {
        online: onlineEmisWithPenalty.filter(e => getISTDateKey(e.dueDate) === todayKey),
        offline: offlineEmisWithPenalty.filter(e => getISTDateKey(e.dueDate) === todayKey)
      };

      const tomorrowEmis = {
        online: onlineEmisWithPenalty.filter(e => getISTDateKey(e.dueDate) === tomorrowKey),
        offline: offlineEmisWithPenalty.filter(e => getISTDateKey(e.dueDate) === tomorrowKey)
      };

      const overdueEmis = {
        online: onlineEmisWithPenalty.filter(e => {
          const dueIST = getISTDayStart(getISTDateKey(e.dueDate));
          return dueIST.getTime() < today.getTime();
        }),
        offline: offlineEmisWithPenalty.filter(e => {
          const dueIST = getISTDayStart(getISTDateKey(e.dueDate));
          return dueIST.getTime() < today.getTime();
        })
      };

      // Calculate totals with penalties
      const summary = {
        today: {
          count: todayEmis.online.length + todayEmis.offline.length,
          amount: [...todayEmis.online, ...todayEmis.offline].reduce((sum, e) => sum + e.totalAmount + (e.penaltyAmount || 0), 0)
        },
        tomorrow: {
          count: tomorrowEmis.online.length + tomorrowEmis.offline.length,
          amount: [...tomorrowEmis.online, ...tomorrowEmis.offline].reduce((sum, e) => sum + e.totalAmount + (e.penaltyAmount || 0), 0)
        },
        overdue: {
          count: overdueEmis.online.length + overdueEmis.offline.length,
          amount: [...overdueEmis.online, ...overdueEmis.offline].reduce((sum, e) => sum + e.totalAmount + (e.penaltyAmount || 0), 0)
        }
      };

      return NextResponse.json({
        success: true,
        todayEmis,
        tomorrowEmis,
        overdueEmis,
        summary,
        penaltyFormula: 'loan_amount / 1000 per day (e.g., ₹1L loan = ₹100/day, ₹2L loan = ₹200/day)'
      });
    }

    // Get calendar view
    if (action === 'calendar') {
      const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
      const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Get online EMIs
      const onlineEmiWhere: Record<string, unknown> = {
        dueDate: { gte: startDate, lte: endDate }
      };
      if (mirrorLoanIds.length > 0) {
        onlineEmiWhere.loanApplicationId = { notIn: mirrorLoanIds };
      }

      if (userRole === 'AGENT') {
        onlineEmiWhere.loanApplication = {
          sessionForm: { agentId: userId }
        };
      }

      const onlineEmis = await db.eMISchedule.findMany({
        where: onlineEmiWhere,
        include: {
          loanApplication: {
            select: {
              applicationNo: true,
              firstName: true,
              lastName: true,
              phone: true
            }
          }
        }
      });

      // Get offline EMIs
      const offlineEmiWhere: Record<string, unknown> = {
        dueDate: { gte: startDate, lte: endDate },
        offlineLoan: { isMirrorLoan: false }
      };

      if (userRole === 'AGENT') {
        offlineEmiWhere.offlineLoan = { isMirrorLoan: false, createdById: userId };
      }

      const offlineEmis = await db.offlineLoanEMI.findMany({
        where: offlineEmiWhere,
        include: {
          offlineLoan: {
            select: {
              loanNumber: true,
              customerName: true,
              customerPhone: true
            }
          }
        }
      });

      // Group by date
      interface CalendarDay {
        date: string;
        online: typeof onlineEmis;
        offline: typeof offlineEmis;
        total: number;
        paid: number;
        totalPrincipal: number;
        totalInterest: number;
        paidPrincipal: number;
        paidInterest: number;
      }

      const calendar: Record<string, CalendarDay> = {};

      for (const emi of onlineEmis) {
        const dateKey = getISTDateKey(emi.dueDate);
        if (!calendar[dateKey]) {
          calendar[dateKey] = {
            date: dateKey,
            online: [],
            offline: [],
            total: 0,
            paid: 0,
            totalPrincipal: 0,
            totalInterest: 0,
            paidPrincipal: 0,
            paidInterest: 0
          };
        }
        calendar[dateKey].online.push(emi);
        calendar[dateKey].total += emi.totalAmount;
        calendar[dateKey].totalPrincipal += (emi.principalAmount || 0);
        calendar[dateKey].totalInterest += (emi.interestAmount || 0);
        if (emi.paymentStatus === 'PAID' || emi.paymentStatus === 'INTEREST_ONLY_PAID' || emi.paymentStatus === 'WAIVED') {
          calendar[dateKey].paid += (emi.paymentStatus === 'WAIVED' ? emi.totalAmount : (emi.paidAmount || emi.totalAmount));
          calendar[dateKey].paidPrincipal += (emi.paidPrincipal || emi.principalAmount || 0);
          calendar[dateKey].paidInterest += (emi.paidInterest || emi.interestAmount || 0);
        }
      }

      for (const emi of offlineEmis) {
        const dateKey = getISTDateKey(emi.dueDate);
        if (!calendar[dateKey]) {
          calendar[dateKey] = {
            date: dateKey,
            online: [],
            offline: [],
            total: 0,
            paid: 0,
            totalPrincipal: 0,
            totalInterest: 0,
            paidPrincipal: 0,
            paidInterest: 0
          };
        }
        calendar[dateKey].offline.push(emi);
        calendar[dateKey].total += emi.totalAmount;
        calendar[dateKey].totalPrincipal += (emi.principalAmount || 0);
        calendar[dateKey].totalInterest += (emi.interestAmount || 0);
        if (emi.paymentStatus === 'PAID' || emi.paymentStatus === 'INTEREST_ONLY_PAID' || emi.paymentStatus === 'WAIVED') {
          calendar[dateKey].paid += (emi.paymentStatus === 'WAIVED' ? emi.totalAmount : (emi.paidAmount || emi.totalAmount));
          calendar[dateKey].paidPrincipal += (emi.paidPrincipal || emi.principalAmount || 0);
          calendar[dateKey].paidInterest += (emi.paidInterest || emi.interestAmount || 0);
        }
      }

      // Convert to array and sort
      const calendarArray = Object.values(calendar).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      return NextResponse.json({
        success: true,
        year,
        month,
        calendar: calendarArray
      });
    }

    // Get reminder history
    if (action === 'history') {
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const skip = (page - 1) * limit;

      const [reminders, total] = await Promise.all([
        db.eMIReminderLog.findMany({
          where: { userId },
          orderBy: { sentAt: 'desc' },
          skip,
          take: limit
        }),
        db.eMIReminderLog.count({ where: { userId } })
      ]);

      return NextResponse.json({
        success: true,
        reminders,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    }

    // Get EMIs by date range (startDate to endDate)
    if (action === 'by-date-range') {
      const startDateStr = searchParams.get('startDate');
      const endDateStr   = searchParams.get('endDate');

      if (!startDateStr || !endDateStr) {
        return NextResponse.json({ error: 'startDate and endDate required (YYYY-MM-DD)' }, { status: 400 });
      }

      // IST-safe date range boundaries
      const rangeStart = getISTDayStart(startDateStr);
      const rangeEnd = getISTDayEnd(endDateStr);

      const onlineEmiWhere: Record<string, unknown> = {
        dueDate: { gte: rangeStart, lte: rangeEnd }
      };
      if (mirrorLoanIds.length > 0) {
        onlineEmiWhere.loanApplicationId = { notIn: mirrorLoanIds };
      }
      if (userRole === 'AGENT') {
        onlineEmiWhere.loanApplication = { sessionForm: { agentId: userId } };
      }

      const offlineEmiWhere: Record<string, unknown> = {
        dueDate: { gte: rangeStart, lte: rangeEnd },
        offlineLoan: { isMirrorLoan: false }
      };
      if (userRole === 'AGENT') {
        offlineEmiWhere.offlineLoan = { isMirrorLoan: false, createdById: userId };
      }

      const [onlineEmis, offlineEmis] = await Promise.all([
        db.eMISchedule.findMany({
          where: onlineEmiWhere,
          include: {
            loanApplication: {
              select: {
                id: true,
                applicationNo: true,
                firstName: true,
                lastName: true,
                phone: true,
                address: true,
                companyId: true,
                sessionForm: { select: { approvedAmount: true } }
              }
            }
          },
          orderBy: { dueDate: 'asc' }
        }),
        db.offlineLoanEMI.findMany({
          where: offlineEmiWhere,
          include: {
            offlineLoan: {
              select: {
                id: true,
                loanNumber: true,
                customerName: true,
                customerPhone: true,
                customerAddress: true,
                companyId: true,
                loanAmount: true,
                isMirrorLoan: true
              }
            }
          },
          orderBy: { dueDate: 'asc' }
        })
      ]);

      const onlineEmisWithPenalty = onlineEmis.map(e => {
        const isPaid = ['PAID', 'WAIVED', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus);
        const loanAmount = e.loanApplication?.sessionForm?.approvedAmount || e.totalAmount;
        if (isPaid) {
          const isPaidOnTime = e.paidDate && e.dueDate && new Date(e.paidDate) <= new Date(e.dueDate);
          const actualPenaltyPaid = isPaidOnTime ? 0 : (e.penaltyPaid || 0);
          return { ...e, loanAmount, daysOverdue: 0, penaltyAmount: actualPenaltyPaid, penaltyPaid: actualPenaltyPaid, ratePerDay: 0 };
        }
        const { daysOverdue, penaltyAmount, ratePerDay } = calculatePenalty(e.dueDate, loanAmount, graceDays);
        return { ...e, loanAmount, daysOverdue, penaltyAmount: e.penaltyAmount || penaltyAmount, ratePerDay };
      });

      const offlineEmisWithPenalty = offlineEmis.map(e => {
        const isPaid = ['PAID', 'WAIVED', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus);
        const loanAmount = e.offlineLoan?.loanAmount || e.totalAmount;
        if (isPaid) {
          const isPaidOnTime = e.paidDate && e.dueDate && new Date(e.paidDate) <= new Date(e.dueDate);
          const actualPenaltyPaid = isPaidOnTime ? 0 : (e.penaltyPaid || 0);
          return { ...e, loanAmount, daysOverdue: 0, penaltyAmount: actualPenaltyPaid, penaltyPaid: actualPenaltyPaid, ratePerDay: 0 };
        }
        const { daysOverdue, penaltyAmount, ratePerDay } = calculatePenalty(e.dueDate, loanAmount, graceDays);
        return { ...e, loanAmount, daysOverdue, penaltyAmount: e.penaltyAmount || penaltyAmount, ratePerDay };
      });

      const onlinePaid = onlineEmisWithPenalty.reduce((s, e) => s + (e.paidAmount || 0), 0);
      const onlinePending = onlineEmisWithPenalty.reduce((s, e) => {
        if (['PAID', 'WAIVED', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus)) return s;
        return s + Math.max(0, (e.totalAmount + (e.penaltyAmount || 0)) - (e.paidAmount || 0));
      }, 0);

      const offlinePaid = offlineEmisWithPenalty.reduce((s, e) => s + (e.paidAmount || 0), 0);
      const offlinePending = offlineEmisWithPenalty.reduce((s, e) => {
        if (['PAID', 'WAIVED', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus)) return s;
        return s + Math.max(0, (e.totalAmount + (e.penaltyAmount || 0)) - (e.paidAmount || 0));
      }, 0);

      const summary = {
        online: {
          count: onlineEmisWithPenalty.length,
          totalAmount: onlineEmisWithPenalty.reduce((s, e) => s + e.totalAmount, 0),
          totalPrincipal: onlineEmisWithPenalty.reduce((s, e) => s + e.principalAmount, 0),
          totalInterest: onlineEmisWithPenalty.reduce((s, e) => s + e.interestAmount, 0),
          totalCollected: onlinePaid,
          totalPending: onlinePending
        },
        offline: {
          count: offlineEmisWithPenalty.length,
          totalAmount: offlineEmisWithPenalty.reduce((s, e) => s + e.totalAmount, 0),
          totalPrincipal: offlineEmisWithPenalty.reduce((s, e) => s + e.principalAmount, 0),
          totalInterest: offlineEmisWithPenalty.reduce((s, e) => s + e.interestAmount, 0),
          totalCollected: offlinePaid,
          totalPending: offlinePending
        },
        combined: {
          count: onlineEmisWithPenalty.length + offlineEmisWithPenalty.length,
          totalAmount: onlineEmisWithPenalty.reduce((s, e) => s + e.totalAmount, 0) + offlineEmisWithPenalty.reduce((s, e) => s + e.totalAmount, 0),
          totalPrincipal: onlineEmisWithPenalty.reduce((s, e) => s + e.principalAmount, 0) + offlineEmisWithPenalty.reduce((s, e) => s + e.principalAmount, 0),
          totalInterest: onlineEmisWithPenalty.reduce((s, e) => s + e.interestAmount, 0) + offlineEmisWithPenalty.reduce((s, e) => s + e.interestAmount, 0),
          totalCollected: onlinePaid + offlinePaid,
          totalPending: onlinePending + offlinePending
        }
      };

      return NextResponse.json({
        success: true,
        startDate: startDateStr,
        endDate: endDateStr,
        onlineEmis: onlineEmisWithPenalty,
        offlineEmis: offlineEmisWithPenalty,
        summary
      });
    }

    // Get EMIs by specific date
    if (action === 'by-date') {
      const dateStr = searchParams.get('date'); // Format: YYYY-MM-DD

      if (!dateStr) {
        return NextResponse.json({ error: 'date parameter is required (YYYY-MM-DD format)' }, { status: 400 });
      }

      // IST-safe: convert YYYY-MM-DD to IST midnight boundaries
      const selectedDate = getISTDayStart(dateStr);
      const nextDay = new Date(getISTDayEnd(dateStr).getTime() + 1);

      // Get online EMIs for the selected date
      const onlineEmiWhere: Record<string, unknown> = {
        dueDate: { gte: selectedDate, lt: nextDay }
      };
      if (mirrorLoanIds.length > 0) {
        onlineEmiWhere.loanApplicationId = { notIn: mirrorLoanIds };
      }

      if (userRole === 'AGENT') {
        onlineEmiWhere.loanApplication = {
          sessionForm: { agentId: userId }
        };
      }

      const onlineEmis = await db.eMISchedule.findMany({
        where: onlineEmiWhere,
        include: {
          loanApplication: {
            select: {
              id: true,
              applicationNo: true,
              firstName: true,
              lastName: true,
              phone: true,
              address: true,
              companyId: true,
              sessionForm: { select: { approvedAmount: true } }
            }
          }
        },
        orderBy: { dueDate: 'asc' }
      });

      // Get offline EMIs for the selected date (exclude mirror loans)
      const offlineEmiWhere: Record<string, unknown> = {
        dueDate: { gte: selectedDate, lt: nextDay },
        offlineLoan: { isMirrorLoan: false }
      };

      if (userRole === 'AGENT') {
        offlineEmiWhere.offlineLoan = { isMirrorLoan: false, createdById: userId };
      }

      const offlineEmis = await db.offlineLoanEMI.findMany({
        where: offlineEmiWhere,
        include: {
          offlineLoan: {
            select: {
              id: true,
              loanNumber: true,
              customerName: true,
              customerPhone: true,
              customerAddress: true,
              companyId: true,
              loanAmount: true,
              isMirrorLoan: true
            }
          }
        },
        orderBy: { dueDate: 'asc' }
      });

      const onlineEmisWithPenalty = onlineEmis.map(e => {
        const isPaid = ['PAID', 'WAIVED', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus);
        const loanAmount = e.loanApplication?.sessionForm?.approvedAmount || e.totalAmount;
        if (isPaid) {
          const isPaidOnTime = e.paidDate && e.dueDate && new Date(e.paidDate) <= new Date(e.dueDate);
          const actualPenaltyPaid = isPaidOnTime ? 0 : (e.penaltyPaid || 0);
          return { ...e, loanAmount, daysOverdue: 0, penaltyAmount: actualPenaltyPaid, penaltyPaid: actualPenaltyPaid, ratePerDay: 0 };
        }
        const { daysOverdue, penaltyAmount, ratePerDay } = calculatePenalty(e.dueDate, loanAmount, graceDays);
        return { ...e, loanAmount, daysOverdue, penaltyAmount: e.penaltyAmount || penaltyAmount, ratePerDay };
      });

      const offlineEmisWithPenalty = offlineEmis.map(e => {
        const isPaid = ['PAID', 'WAIVED', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus);
        const loanAmount = e.offlineLoan?.loanAmount || e.totalAmount;
        if (isPaid) {
          const isPaidOnTime = e.paidDate && e.dueDate && new Date(e.paidDate) <= new Date(e.dueDate);
          const actualPenaltyPaid = isPaidOnTime ? 0 : (e.penaltyPaid || 0);
          return { ...e, loanAmount, daysOverdue: 0, penaltyAmount: actualPenaltyPaid, penaltyPaid: actualPenaltyPaid, ratePerDay: 0 };
        }
        const { daysOverdue, penaltyAmount, ratePerDay } = calculatePenalty(e.dueDate, loanAmount, graceDays);
        return { ...e, loanAmount, daysOverdue, penaltyAmount: e.penaltyAmount || penaltyAmount, ratePerDay };
      });

      const onlinePaid = onlineEmisWithPenalty.reduce((s, e) => s + (e.paidAmount || 0), 0);
      const onlinePending = onlineEmisWithPenalty.reduce((s, e) => {
        if (['PAID', 'WAIVED', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus)) return s;
        return s + Math.max(0, (e.totalAmount + (e.penaltyAmount || 0)) - (e.paidAmount || 0));
      }, 0);

      const offlinePaid = offlineEmisWithPenalty.reduce((s, e) => s + (e.paidAmount || 0), 0);
      const offlinePending = offlineEmisWithPenalty.reduce((s, e) => {
        if (['PAID', 'WAIVED', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus)) return s;
        return s + Math.max(0, (e.totalAmount + (e.penaltyAmount || 0)) - (e.paidAmount || 0));
      }, 0);

      // Calculate totals with principal and interest breakdown
      const summary = {
        online: {
          count: onlineEmisWithPenalty.length,
          totalAmount: onlineEmisWithPenalty.reduce((sum, e) => sum + e.totalAmount, 0),
          totalPrincipal: onlineEmisWithPenalty.reduce((sum, e) => sum + e.principalAmount, 0),
          totalInterest: onlineEmisWithPenalty.reduce((sum, e) => sum + e.interestAmount, 0),
          totalCollected: onlinePaid,
          totalPending: onlinePending
        },
        offline: {
          count: offlineEmisWithPenalty.length,
          totalAmount: offlineEmisWithPenalty.reduce((sum, e) => sum + e.totalAmount, 0),
          totalPrincipal: offlineEmisWithPenalty.reduce((sum, e) => sum + e.principalAmount, 0),
          totalInterest: offlineEmisWithPenalty.reduce((sum, e) => sum + e.interestAmount, 0),
          totalCollected: offlinePaid,
          totalPending: offlinePending
        },
        combined: {
          count: onlineEmisWithPenalty.length + offlineEmisWithPenalty.length,
          totalAmount: onlineEmisWithPenalty.reduce((sum, e) => sum + e.totalAmount, 0) + offlineEmisWithPenalty.reduce((sum, e) => sum + e.totalAmount, 0),
          totalPrincipal: onlineEmisWithPenalty.reduce((sum, e) => sum + e.principalAmount, 0) + offlineEmisWithPenalty.reduce((sum, e) => sum + e.principalAmount, 0),
          totalInterest: onlineEmisWithPenalty.reduce((sum, e) => sum + e.interestAmount, 0) + offlineEmisWithPenalty.reduce((sum, e) => sum + e.interestAmount, 0),
          totalCollected: onlinePaid + offlinePaid,
          totalPending: onlinePending + offlinePending
        }
      };

      return NextResponse.json({
        success: true,
        date: dateStr,
        onlineEmis: onlineEmisWithPenalty,
        offlineEmis: offlineEmisWithPenalty,
        summary
      });
    }

    // Get all EMIs to collect (for SuperAdmin view)
    if (action === 'all-to-collect') {
      // IST-safe date boundaries
      const todayKey = getISTDateKey(new Date());
      const today = getISTDayStart(todayKey);

      const tomorrowDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowKey = getISTDateKey(tomorrowDate);
      const tomorrow = getISTDayStart(tomorrowKey);

      const dayAfterDate = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
      const dayAfterKey = getISTDateKey(dayAfterDate);
      const dayAfter = getISTDayStart(dayAfterKey);

      // Get all pending/overdue EMIs
      const onlineWhere: Record<string, any> = {
        paymentStatus: { in: ['PENDING', 'OVERDUE'] },
        dueDate: { lt: dayAfter }
      };
      if (mirrorLoanIds.length > 0) {
        onlineWhere.loanApplicationId = { notIn: mirrorLoanIds };
      }

      const [onlineEmis, offlineEmis] = await Promise.all([
        db.eMISchedule.findMany({
          where: onlineWhere,
          include: {
            loanApplication: {
              select: {
                id: true,
                applicationNo: true,
                firstName: true,
                lastName: true,
                phone: true,
                address: true
              }
            }
          }
        }),
        db.offlineLoanEMI.findMany({
          where: {
            paymentStatus: { in: ['PENDING', 'OVERDUE'] },
            dueDate: { lt: dayAfter },
            offlineLoan: { isMirrorLoan: false }  // exclude mirror loan EMIs
          },
          include: {
            offlineLoan: {
              select: {
                id: true,
                loanNumber: true,
                customerName: true,
                customerPhone: true,
                customerAddress: true,
                createdById: true,
                createdByRole: true
              }
            }
          }
        })
      ]);

      // Group by creator for offline loans
      const groupedByCreator = offlineEmis.reduce((acc, emi) => {
        const creatorId = emi.offlineLoan.createdById;
        if (!acc[creatorId]) {
          acc[creatorId] = [];
        }
        acc[creatorId].push(emi);
        return acc;
      }, {} as Record<string, typeof offlineEmis>);

      return NextResponse.json({
        success: true,
        onlineEmis,
        offlineEmis,
        groupedByCreator,
        summary: {
          onlineCount: onlineEmis.length,
          offlineCount: offlineEmis.length,
          onlineAmount: onlineEmis.reduce((sum, e) => sum + e.totalAmount, 0),
          offlineAmount: offlineEmis.reduce((sum, e) => sum + e.totalAmount, 0)
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('EMI reminder fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch EMI reminders' }, { status: 500 });
  }
}

// POST - Create/send EMI reminders
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId } = body;

    // Get all online mirror loan IDs to exclude them
    const mirrorMappings = await db.mirrorLoanMapping.findMany({
      where: { mirrorLoanId: { not: null } },
      select: { mirrorLoanId: true }
    });
    const mirrorLoanIds = mirrorMappings.map(m => m.mirrorLoanId).filter(Boolean) as string[];

    // Send daily reminders to all roles + customers
    if (action === 'send-daily-reminders') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      // ── 1. Staff notifications (existing behaviour) ─────────────────────────
      const staffUsers = await db.user.findMany({
        where: {
          role: { in: ['SUPER_ADMIN', 'AGENT', 'STAFF', 'COMPANY', 'CASHIER'] },
          isActive: true
        }
      });

      let remindersSent = 0;

      for (const user of staffUsers) {
        let onlineEmis: typeof onlineEmisInner = [];
        let offlineEmis: typeof offlineEmisInner = [];

        const onlineWhere: Record<string, any> = {
          paymentStatus: { in: ['PENDING', 'OVERDUE'] },
          dueDate: { gte: today, lt: tomorrow }
        };
        if (mirrorLoanIds.length > 0) {
          onlineWhere.loanApplicationId = { notIn: mirrorLoanIds };
        }

        const onlineEmisInner = await db.eMISchedule.findMany({
          where: onlineWhere,
          include: {
            loanApplication: {
              select: { applicationNo: true, firstName: true, lastName: true }
            }
          }
        });

        const offlineEmisInner = await db.offlineLoanEMI.findMany({
          where: {
            paymentStatus: { in: ['PENDING', 'OVERDUE'] },
            dueDate: { gte: today, lt: tomorrow },
            offlineLoan: { isMirrorLoan: false }
          },
          include: {
            offlineLoan: {
              select: { loanNumber: true, customerName: true, createdById: true }
            }
          }
        });

        if (user.role === 'AGENT') {
          const agentLoanIds = await db.sessionForm.findMany({
            where: { agentId: user.id },
            select: { loanApplicationId: true }
          });
          const loanIdSet = new Set(agentLoanIds.map(s => s.loanApplicationId));
          onlineEmis = onlineEmisInner.filter(e => loanIdSet.has(e.loanApplicationId));
          offlineEmis = offlineEmisInner.filter(e => e.offlineLoan.createdById === user.id);
        } else {
          onlineEmis = onlineEmisInner;
          offlineEmis = offlineEmisInner;
        }

        if (onlineEmis.length > 0 || offlineEmis.length > 0) {
          const totalEmis = onlineEmis.length + offlineEmis.length;
          const totalAmount = [...onlineEmis, ...offlineEmis].reduce((sum, e) => sum + e.totalAmount, 0);
          await db.notification.create({
            data: {
              userId: user.id,
              type: 'EMI_REMINDER_DAILY',
              title: `${totalEmis} EMIs Due Today`,
              message: `You have ${totalEmis} EMIs to collect today. Total: ₹${totalAmount.toFixed(0)}`,
              data: JSON.stringify({ count: totalEmis, amount: totalAmount })
            }
          });
          remindersSent++;
        }
      }

      // ── 2. Customer notifications — Due Today ────────────────────────────────
      // Online loans: find EMIs due today where the loanApplication has a customerId
      const onlineTodayWhere: Record<string, any> = {
        paymentStatus: { in: ['PENDING', 'OVERDUE'] },
        dueDate: { gte: today, lt: tomorrow }
      };
      if (mirrorLoanIds.length > 0) {
        onlineTodayWhere.loanApplicationId = { notIn: mirrorLoanIds };
      }

      const onlineTodayEmis = await db.eMISchedule.findMany({
        where: onlineTodayWhere,
        include: {
          loanApplication: {
            select: { id: true, applicationNo: true, customerId: true, firstName: true, lastName: true }
          }
        }
      });

      let customerNotifCount = 0;
      for (const emi of onlineTodayEmis) {
        const cid = emi.loanApplication?.customerId;
        if (!cid) continue;
        await db.notification.create({
          data: {
            userId: cid,
            type: 'EMI_DUE_TODAY',
            title: '📅 Your EMI is Due Today',
            message: `Your EMI of ₹${emi.totalAmount.toFixed(0)} for loan ${emi.loanApplication?.applicationNo} is due today. Please pay to avoid penalty.`,
            data: JSON.stringify({ emiId: emi.id, amount: emi.totalAmount, loanNo: emi.loanApplication?.applicationNo })
          }
        });
        customerNotifCount++;
      }

      // ── 3. Customer notifications — Due Tomorrow ─────────────────────────────
      const onlineTomorrowWhere: Record<string, any> = {
        paymentStatus: { in: ['PENDING'] },
        dueDate: { gte: tomorrow, lt: dayAfterTomorrow }
      };
      if (mirrorLoanIds.length > 0) {
        onlineTomorrowWhere.loanApplicationId = { notIn: mirrorLoanIds };
      }

      const onlineTomorrowEmis = await db.eMISchedule.findMany({
        where: onlineTomorrowWhere,
        include: {
          loanApplication: {
            select: { id: true, applicationNo: true, customerId: true }
          }
        }
      });

      for (const emi of onlineTomorrowEmis) {
        const cid = emi.loanApplication?.customerId;
        if (!cid) continue;
        await db.notification.create({
          data: {
            userId: cid,
            type: 'EMI_DUE_TOMORROW',
            title: '⏰ EMI Due Tomorrow',
            message: `Your EMI of ₹${emi.totalAmount.toFixed(0)} for loan ${emi.loanApplication?.applicationNo} is due tomorrow. Please arrange payment.`,
            data: JSON.stringify({ emiId: emi.id, amount: emi.totalAmount, loanNo: emi.loanApplication?.applicationNo })
          }
        });
        customerNotifCount++;
      }

      return NextResponse.json({
        success: true,
        message: `Sent ${remindersSent} staff + ${customerNotifCount} customer notifications`,
        remindersSent,
        customerNotifCount
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('EMI reminder error:', error);
    return NextResponse.json({ error: 'Failed to process EMI reminder' }, { status: 500 });
  }
}
