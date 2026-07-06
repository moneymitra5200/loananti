import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';

    if (q.length < 2) {
      return NextResponse.json({ success: true, results: [] });
    }

    // Fetch all mirror loan IDs to exclude them from online loan search
    const mirrorMappings = await db.mirrorLoanMapping.findMany({
      where: {
        mirrorLoanId: { not: null }
      },
      select: {
        mirrorLoanId: true
      }
    });
    const mirrorLoanIds = mirrorMappings
      .map((m) => m.mirrorLoanId)
      .filter((id): id is string => !!id);

    // Run queries in parallel
    const [onlineLoans, offlineLoans, users] = await Promise.all([
      db.loanApplication.findMany({
        where: {
          id: { notIn: mirrorLoanIds },
          OR: [
            { applicationNo: { contains: q } },
            { customer: { name: { contains: q } } },
            { customer: { phone: { contains: q } } },
            { customer: { email: { contains: q } } }
          ]
        },
        take: 5,
        select: {
          id: true,
          applicationNo: true,
          status: true,
          loanAmount: true,
          customer: {
            select: {
              name: true,
              phone: true,
              email: true
            }
          },
          company: {
            select: {
              name: true
            }
          }
        }
      }),
      db.offlineLoan.findMany({
        where: {
          isMirrorLoan: false,
          OR: [
            { loanNumber: { contains: q } },
            { customerName: { contains: q } },
            { customerPhone: { contains: q } },
            { customerEmail: { contains: q } }
          ]
        },
        take: 5,
        select: {
          id: true,
          loanNumber: true,
          status: true,
          loanAmount: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          company: {
            select: {
              name: true
            }
          }
        }
      }),
      db.user.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
            { email: { contains: q } }
          ]
        },
        take: 5,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          company: {
            select: {
              name: true
            }
          }
        }
      })
    ]);

    // Format results into a single list
    const results: any[] = [];

    onlineLoans.forEach((loan) => {
      results.push({
        type: 'online_loan',
        id: loan.id,
        title: loan.applicationNo,
        subtitle: `Online Loan — ${loan.customer?.name || 'Customer'} (${loan.company?.name || 'No Company'})`,
        amount: loan.loanAmount,
        status: loan.status,
        meta: {
          name: loan.customer?.name,
          phone: loan.customer?.phone,
          email: loan.customer?.email
        }
      });
    });

    offlineLoans.forEach((loan) => {
      results.push({
        type: 'offline_loan',
        id: loan.id,
        title: loan.loanNumber,
        subtitle: `Offline Loan — ${loan.customerName || 'Customer'} (${loan.company?.name || 'No Company'})`,
        amount: loan.loanAmount,
        status: loan.status,
        meta: {
          name: loan.customerName,
          phone: loan.customerPhone,
          email: loan.customerEmail
        }
      });
    });

    users.forEach((user) => {
      results.push({
        type: 'user',
        id: user.id,
        title: user.name || 'No Name',
        subtitle: `${user.role.replace('_', ' ')} — ${user.phone || 'No Phone'} (${user.company?.name || 'No Company'})`,
        email: user.email,
        role: user.role,
        meta: {
          name: user.name,
          phone: user.phone,
          email: user.email
        }
      });
    });

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Global search API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
