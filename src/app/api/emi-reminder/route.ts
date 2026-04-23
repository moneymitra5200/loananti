import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysOverdue = Math.max(0, Math.floor((today.getTime() - due.getTime()) / msPerDay) - graceDays);
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

    // Get today's and tomorrow's EMIs (both online and offline)
    if (action === 'today-tomorrow') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      // Get online loan EMIs with loan amount for penalty calculation
      const onlineEmiWhere: Record<string, unknown> = {
        paymentStatus: { in: ['PENDING', 'OVERDUE'] }
      };

      // For agents, filter by their loans
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
        }
      });

      // Get offline loan EMIs with loan amount for penalty calculation
      // IMPORTANT: isMirrorLoan=true loans are excluded — mirror EMIs are internal accounting
      // duplicates of the original loan and must never be double-counted in alerts.
      const offlineEmiWhere: Record<string, unknown> = {
        paymentStatus: { in: ['PENDING', 'OVERDUE'] },
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
              loanAmount: true,
              isMirrorLoan: true
            }
          }
        }
      });

      // Add penalty info to online EMIs
      const onlineEmisWithPenalty = onlineEmis.map(e => {
        const loanAmount = e.loanApplication?.sessionForm?.approvedAmount || e.totalAmount;
        const { daysOverdue, penaltyAmount, ratePerDay } = calculatePenalty(e.dueDate, loanAmount, graceDays);
        return {
          ...e,
          loanAmount,
          daysOverdue,
          penaltyAmount: e.penaltyAmount || penaltyAmount,
          ratePerDay
        };
      });

      // Add penalty info to offline EMIs
      const offlineEmisWithPenalty = offlineEmis.map(e => {
        const loanAmount = e.offlineLoan?.loanAmount || e.totalAmount;
        const { daysOverdue, penaltyAmount, ratePerDay } = calculatePenalty(e.dueDate, loanAmount, graceDays);
        return {
          ...e,
          loanAmount,
          daysOverdue,
          penaltyAmount: e.penaltyAmount || penaltyAmount,
          ratePerDay
        };
      });

      // Categorize EMIs
      const todayEmis = {
        online: onlineEmisWithPenalty.filter(e => {
          const dueDate = new Date(e.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() === today.getTime();
        }),
        offline: offlineEmisWithPenalty.filter(e => {
          const dueDate = new Date(e.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() === today.getTime();
        })
      };

      const tomorrowEmis = {
        online: onlineEmisWithPenalty.filter(e => {
          const dueDate = new Date(e.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() === tomorrow.getTime();
        }),
        offline: offlineEmisWithPenalty.filter(e => {
          const dueDate = new Date(e.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() === tomorrow.getTime();
        })
      };

      const overdueEmis = {
        online: onlineEmisWithPenalty.filter(e => {
          const dueDate = new Date(e.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() < today.getTime();
        }),
        offline: offlineEmisWithPenalty.filter(e => {
          const dueDate = new Date(e.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() < today.getTime();
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
        dueDate: { gte: startDate, lte: endDate }
      };

      if (userRole === 'AGENT') {
        offlineEmiWhere.offlineLoan = { createdById: userId };
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
      }

      const calendar: Record<string, CalendarDay> = {};

      for (const emi of onlineEmis) {
        const dateKey = new Date(emi.dueDate).toISOString().slice(0, 10);
        if (!calendar[dateKey]) {
          calendar[dateKey] = { date: dateKey, online: [], offline: [], total: 0, paid: 0 };
        }
        calendar[dateKey].online.push(emi);
        calendar[dateKey].total += emi.totalAmount;
        if (emi.paymentStatus === 'PAID') {
          calendar[dateKey].paid += emi.paidAmount;
        }
      }

      for (const emi of offlineEmis) {
        const dateKey = new Date(emi.dueDate).toISOString().slice(0, 10);
        if (!calendar[dateKey]) {
          calendar[dateKey] = { date: dateKey, online: [], offline: [], total: 0, paid: 0 };
        }
        calendar[dateKey].offline.push(emi);
        calendar[dateKey].total += emi.totalAmount;
        if (emi.paymentStatus === 'PAID') {
          calendar[dateKey].paid += emi.paidAmount;
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

    // Get EMIs by specific date
    if (action === 'by-date') {
      const dateStr = searchParams.get('date'); // Format: YYYY-MM-DD

      if (!dateStr) {
        return NextResponse.json({ error: 'date parameter is required (YYYY-MM-DD format)' }, { status: 400 });
      }

      const selectedDate = new Date(dateStr);
      selectedDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Get online EMIs for the selected date
      const onlineEmiWhere: Record<string, unknown> = {
        paymentStatus: { in: ['PENDING', 'OVERDUE'] },
        dueDate: { gte: selectedDate, lt: nextDay }
      };

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
              companyId: true
            }
          }
        },
        orderBy: { dueDate: 'asc' }
      });

      // Get offline EMIs for the selected date (exclude mirror loans)
      const offlineEmiWhere: Record<string, unknown> = {
        paymentStatus: { in: ['PENDING', 'OVERDUE'] },
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
              companyId: true
            }
          }
        },
        orderBy: { dueDate: 'asc' }
      });

      // Calculate totals with principal and interest breakdown
      const summary = {
        online: {
          count: onlineEmis.length,
          totalAmount: onlineEmis.reduce((sum, e) => sum + e.totalAmount, 0),
          totalPrincipal: onlineEmis.reduce((sum, e) => sum + e.principalAmount, 0),
          totalInterest: onlineEmis.reduce((sum, e) => sum + e.interestAmount, 0)
        },
        offline: {
          count: offlineEmis.length,
          totalAmount: offlineEmis.reduce((sum, e) => sum + e.totalAmount, 0),
          totalPrincipal: offlineEmis.reduce((sum, e) => sum + e.principalAmount, 0),
          totalInterest: offlineEmis.reduce((sum, e) => sum + e.interestAmount, 0)
        },
        combined: {
          count: onlineEmis.length + offlineEmis.length,
          totalAmount: onlineEmis.reduce((sum, e) => sum + e.totalAmount, 0) + offlineEmis.reduce((sum, e) => sum + e.totalAmount, 0),
          totalPrincipal: onlineEmis.reduce((sum, e) => sum + e.principalAmount, 0) + offlineEmis.reduce((sum, e) => sum + e.principalAmount, 0),
          totalInterest: onlineEmis.reduce((sum, e) => sum + e.interestAmount, 0) + offlineEmis.reduce((sum, e) => sum + e.interestAmount, 0)
        }
      };

      return NextResponse.json({
        success: true,
        date: dateStr,
        onlineEmis,
        offlineEmis,
        summary
      });
    }

    // Get all EMIs to collect (for SuperAdmin view)
    if (action === 'all-to-collect') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      // Get all pending/overdue EMIs
      const [onlineEmis, offlineEmis] = await Promise.all([
        db.eMISchedule.findMany({
          where: {
            paymentStatus: { in: ['PENDING', 'OVERDUE'] },
            dueDate: { lt: dayAfter }
          },
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

    // Send daily reminders to all roles
    if (action === 'send-daily-reminders') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get all active staff who should receive reminders
      const users = await db.user.findMany({
        where: {
          role: { in: ['SUPER_ADMIN', 'AGENT', 'STAFF', 'COMPANY', 'CASHIER'] },
          isActive: true
        }
      });

      let remindersSent = 0;

      for (const user of users) {
        // Get EMIs for this user based on role
        let onlineEmis: typeof onlineEmisInner = [];
        let offlineEmis: typeof offlineEmisInner = [];

        const onlineEmisInner = await db.eMISchedule.findMany({
          where: {
            paymentStatus: { in: ['PENDING', 'OVERDUE'] },
            dueDate: { gte: today, lt: tomorrow }
          },
          include: {
            loanApplication: {
              select: { applicationNo: true, firstName: true, lastName: true }
            }
          }
        });

        const offlineEmisInner = await db.offlineLoanEMI.findMany({
          where: {
            paymentStatus: { in: ['PENDING', 'OVERDUE'] },
            dueDate: { gte: today, lt: tomorrow }
          },
          include: {
            offlineLoan: {
              select: { loanNumber: true, customerName: true, createdById: true }
            }
          }
        });

        // For agents, filter by their loans
        if (user.role === 'AGENT') {
          const agentLoanIds = await db.sessionForm.findMany({
            where: { agentId: user.id },
            select: { loanApplicationId: true }
          });
          const loanIdSet = new Set(agentLoanIds.map(s => s.loanApplicationId));
          
          onlineEmis = onlineEmisInner.filter(e => loanIdSet.has(e.loanApplicationId));
          
          offlineEmis = offlineEmisInner.filter(e => 
            e.offlineLoan.createdById === user.id
          );
        } else {
          onlineEmis = onlineEmisInner;
          offlineEmis = offlineEmisInner;
        }

        // Send notification if there are EMIs
        if (onlineEmis.length > 0 || offlineEmis.length > 0) {
          const totalEmis = onlineEmis.length + offlineEmis.length;
          const totalAmount = [...onlineEmis, ...offlineEmis].reduce((sum, e) => sum + e.totalAmount, 0);

          await db.notification.create({
            data: {
              userId: user.id,
              type: 'EMI_REMINDER_DAILY',
              title: `${totalEmis} EMIs Due Today`,
              message: `You have ${totalEmis} EMIs to collect today. Total amount: ₹${totalAmount.toFixed(0)}`,
              data: JSON.stringify({ count: totalEmis, amount: totalAmount })
            }
          });

          remindersSent++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Sent ${remindersSent} daily reminders`,
        remindersSent
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('EMI reminder error:', error);
    return NextResponse.json({ error: 'Failed to process EMI reminder' }, { status: 500 });
  }
}
