import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─────────────────────────────────────────────────────────────────────────────
// Fetch real customer context from database
// ─────────────────────────────────────────────────────────────────────────────
async function getCustomerContext(customerId: string) {
  try {
    // Get customer's active loans with EMI schedules
    const loans = await db.loanApplication.findMany({
      where: { customerId, status: { in: ['DISBURSED', 'ACTIVE', 'ACTIVE_INTEREST_ONLY'] } },
      include: {
        emiSchedules: {
          orderBy: { installmentNumber: 'asc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        company: { select: { name: true } },
      },
      take: 5,
    });

    const allLoans = await db.loanApplication.findMany({
      where: { customerId },
      select: { id: true, applicationNo: true, status: true, loanAmount: true, disbursedAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const customer = await db.user.findUnique({
      where: { id: customerId },
      select: { name: true, phone: true, email: true },
    });

    // Process EMI data
    const loanContexts = loans.map(loan => {
      const emis = loan.emiSchedules || [];
      const pending = emis.filter((e: any) => e.paymentStatus === 'PENDING');
      const overdue = emis.filter((e: any) => e.paymentStatus === 'OVERDUE');
      const paid = emis.filter((e: any) => e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID');

      const nextEmi = pending.sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
      const overdueAmount = overdue.reduce((s: number, e: any) => s + Number(e.totalAmount || 0), 0);
      const paidAmount = paid.reduce((s: number, e: any) => s + Number(e.paidAmount || 0), 0);
      const outstandingPrincipal = (emis as any[]).find((e: any) => e.paymentStatus !== 'PAID')?.outstandingPrincipal || 0;

      return {
        applicationNo: loan.applicationNo,
        loanAmount: Number(loan.loanAmount),
        company: loan.company?.name || 'MoneyMitra',
        status: loan.status,
        totalEMIs: emis.length,
        paidEMIs: paid.length,
        pendingEMIs: pending.length,
        overdueEMIs: overdue.length,
        overdueAmount,
        paidAmount,
        outstandingPrincipal: Number(outstandingPrincipal),
        nextEmi: nextEmi ? {
          installmentNumber: nextEmi.installmentNumber,
          dueDate: new Date(nextEmi.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          amount: Number(nextEmi.totalAmount),
          status: nextEmi.paymentStatus,
        } : null,
        recentPayments: (loan.payments || []).map(p => ({
          amount: Number(p.amount),
          date: new Date(p.createdAt).toLocaleDateString('en-IN'),
          mode: p.paymentMode,
        })),
      };
    });

    const customerName = customer?.name || '';
    return { customerName, loanContexts, allLoans };
  } catch (err) {
    console.error('[AI Chat] Failed to fetch customer context:', err);
    return { customer: null, loanContexts: [], allLoans: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Smart AI response engine using real customer data
// ─────────────────────────────────────────────────────────────────────────────
function generateIntelligentResponse(
  message: string,
  customerName: string,
  ctx: { loanContexts: any[]; allLoans: any[] }
): { response: string; intent: string } {
  const msg = message.toLowerCase();
  const loans = ctx.loanContexts;
  const name = customerName || 'there';

  // ── Greeting ────────────────────────────────────────────────────────────
  if (/^(hi|hello|hey|namaste|hii|helo)\b/.test(msg)) {
    const hasLoans = loans.length > 0;
    const hasOverdue = loans.some(l => l.overdueEMIs > 0);
    let greeting = `👋 Hello ${name}! I'm **MitraBot**, your personal AI Loan Assistant.\n\n`;
    if (hasLoans) {
      if (hasOverdue) {
        greeting += `⚠️ You have **overdue EMIs** on your loan. Please check the details below.\n\n`;
      }
      greeting += `You have **${loans.length} active loan(s)**. I can help you with:\n`;
    } else {
      greeting += `I can help you with:\n`;
    }
    greeting += `📅 EMI due dates & payment status\n💰 Outstanding balance & penalties\n🏦 Loan details & history\n📝 New loan eligibility & suggestions\n📞 Support & escalation\n\nWhat would you like to know? 😊`;
    return { response: greeting, intent: 'GREETING' };
  }

  // ── EMI Due / Next EMI ─────────────────────────────────────────────────
  if (msg.includes('emi') || msg.includes('due') || msg.includes('next payment') || msg.includes('installment')) {
    if (loans.length === 0) {
      return { response: `📅 You don't have any active loans with pending EMIs right now.\n\nIf you'd like to apply for a new loan, I can guide you! Just ask "How do I apply for a loan?" 😊`, intent: 'EMI_STATUS' };
    }
    let response = `📅 **Your EMI Status:**\n\n`;
    loans.forEach((loan, i) => {
      response += `**Loan ${i + 1}: ${loan.applicationNo}** (${loan.company})\n`;
      response += `• Loan Amount: ₹${loan.loanAmount.toLocaleString('en-IN')}\n`;
      response += `• Progress: ${loan.paidEMIs}/${loan.totalEMIs} EMIs paid\n`;
      if (loan.nextEmi) {
        const isOverdue = loan.nextEmi.status === 'OVERDUE';
        response += `• ${isOverdue ? '⚠️ **OVERDUE**' : '📅 Next EMI'}: ₹${loan.nextEmi.amount.toLocaleString('en-IN')} due on **${loan.nextEmi.dueDate}**\n`;
      } else if (loan.paidEMIs === loan.totalEMIs) {
        response += `• ✅ All EMIs paid — Loan closed!\n`;
      }
      if (loan.overdueEMIs > 0) {
        response += `• ⚠️ ${loan.overdueEMIs} overdue EMI(s) — Total overdue: ₹${loan.overdueAmount.toLocaleString('en-IN')}\n`;
      }
      response += '\n';
    });
    response += `💡 Please pay on time to avoid late fees. Contact your branch or cashier to make a payment.`;
    return { response, intent: 'EMI_STATUS' };
  }

  // ── Outstanding Balance ─────────────────────────────────────────────────
  if (msg.includes('balance') || msg.includes('outstanding') || msg.includes('remaining') || msg.includes('kitna bacha') || msg.includes('how much left')) {
    if (loans.length === 0) {
      return { response: `💰 You don't have any active loans right now.\n\nWould you like to apply for a new loan? I can help with that! 😊`, intent: 'LOAN_BALANCE' };
    }
    let response = `💰 **Your Outstanding Balance:**\n\n`;
    let grandTotal = 0;
    loans.forEach((loan, i) => {
      response += `**${loan.applicationNo}** — Outstanding: ₹${loan.outstandingPrincipal.toLocaleString('en-IN')}\n`;
      response += `  • Paid so far: ₹${loan.paidAmount.toLocaleString('en-IN')}\n`;
      response += `  • ${loan.pendingEMIs} EMI(s) remaining\n\n`;
      grandTotal += loan.outstandingPrincipal;
    });
    if (loans.length > 1) {
      response += `**Total Outstanding (all loans): ₹${grandTotal.toLocaleString('en-IN')}**\n\n`;
    }
    response += `💡 You can close your loan early by paying the outstanding amount. Ask me about "loan foreclosure" for details!`;
    return { response, intent: 'LOAN_BALANCE' };
  }

  // ── Overdue / Penalty ───────────────────────────────────────────────────
  if (msg.includes('overdue') || msg.includes('penalty') || msg.includes('late') || msg.includes('fine') || msg.includes('default')) {
    const overdueLoans = loans.filter(l => l.overdueEMIs > 0);
    if (overdueLoans.length === 0) {
      return { response: `✅ Great news, ${name}! You have **no overdue EMIs** on any of your loans.\n\nKeep up the good work! Timely payments help maintain your credit score. 🌟`, intent: 'PENALTY_INFO' };
    }
    let response = `⚠️ **Overdue EMI Alert:**\n\n`;
    overdueLoans.forEach(loan => {
      response += `**${loan.applicationNo}**\n`;
      response += `• Overdue EMIs: ${loan.overdueEMIs}\n`;
      response += `• Total Overdue Amount: ₹${loan.overdueAmount.toLocaleString('en-IN')}\n\n`;
    });
    response += `**Important:** Late payments attract penalty charges. Please contact your branch or cashier immediately to clear overdue EMIs and avoid further charges.\n\n📞 Need help? Ask me to "connect with support".`;
    return { response, intent: 'PENALTY_INFO' };
  }

  // ── Payment History ─────────────────────────────────────────────────────
  if (msg.includes('payment history') || msg.includes('paid') || msg.includes('receipt') || msg.includes('transaction')) {
    if (loans.length === 0) {
      return { response: `📄 No payment history found. You don't have any active loans.\n\nWould you like to apply for a loan? 😊`, intent: 'PAYMENT_HISTORY' };
    }
    let response = `📄 **Recent Payment History:**\n\n`;
    loans.forEach(loan => {
      if (loan.recentPayments.length > 0) {
        response += `**${loan.applicationNo}:**\n`;
        loan.recentPayments.forEach((p: any) => {
          response += `  • ₹${p.amount.toLocaleString('en-IN')} on ${p.date} via ${p.mode}\n`;
        });
        response += '\n';
      }
    });
    response += `📊 **Summary:**\n`;
    loans.forEach(loan => {
      response += `• ${loan.applicationNo}: ${loan.paidEMIs}/${loan.totalEMIs} EMIs paid (₹${loan.paidAmount.toLocaleString('en-IN')} total paid)\n`;
    });
    return { response, intent: 'PAYMENT_HISTORY' };
  }

  // ── Loan Status / Details ───────────────────────────────────────────────
  if (msg.includes('loan status') || msg.includes('my loan') || msg.includes('loan detail') || msg.includes('application')) {
    if (ctx.allLoans.length === 0) {
      return { response: `📋 You don't have any loan applications yet.\n\nWould you like to apply for a loan? Just ask "How do I apply?" and I'll guide you step by step! 🚀`, intent: 'LOAN_STATUS' };
    }
    let response = `📋 **Your Loan Summary:**\n\n`;
    ctx.allLoans.forEach(loan => {
      const statusIcon: Record<string, string> = {
        DISBURSED: '✅', ACTIVE: '🟢', CLOSED: '🏁', OVERDUE: '⚠️',
        PENDING: '⏳', APPROVED: '👍', REJECTED_BY_SA: '❌', FINAL_APPROVED: '✅',
      };
      response += `${statusIcon[loan.status] || '📄'} **${loan.applicationNo}** — ₹${Number(loan.loanAmount).toLocaleString('en-IN')} — **${loan.status}**\n`;
    });
    return { response, intent: 'LOAN_STATUS' };
  }

  // ── Foreclosure / Close Loan ────────────────────────────────────────────
  if (msg.includes('foreclose') || msg.includes('close loan') || msg.includes('prepay') || msg.includes('full payment') || msg.includes('close my loan')) {
    if (loans.length === 0) {
      return { response: `You don't have any active loans to foreclose.\n\nWould you like to apply for a new loan? 😊`, intent: 'FORECLOSURE' };
    }
    let response = `🏁 **Loan Foreclosure Information:**\n\nYou can close your loan early by paying the outstanding balance.\n\n`;
    loans.forEach(loan => {
      response += `**${loan.applicationNo}:**\n`;
      response += `• Outstanding Principal: ₹${loan.outstandingPrincipal.toLocaleString('en-IN')}\n`;
      response += `• Remaining EMIs: ${loan.pendingEMIs}\n\n`;
    });
    response += `**How to Foreclose:**\n1. Visit your branch or contact your cashier\n2. Request foreclosure statement\n3. Pay the outstanding amount\n4. Receive a No Dues Certificate\n\n💡 Foreclosure saves you on future interest payments!`;
    return { response, intent: 'FORECLOSURE' };
  }

  // ── New Loan / Apply / Suggest ──────────────────────────────────────────
  if (msg.includes('apply') || msg.includes('new loan') || msg.includes('loan lena') || msg.includes('suggest') || msg.includes('eligib') || msg.includes('qualify')) {
    const hasGoodHistory = loans.every(l => l.overdueEMIs === 0);
    let response = `📝 **Loan Suggestions for You:**\n\n`;

    if (hasGoodHistory && loans.length > 0) {
      response += `✅ Based on your **good repayment history**, you may be eligible for:\n\n`;
    } else {
      response += `Here are the loan products available:\n\n`;
    }

    response += `💼 **Personal Loan**\n• Amount: ₹50,000 – ₹10,00,000\n• Rate: 14% – 24% p.a.\n• Tenure: 6 – 60 months\n• Purpose: Medical, education, travel, etc.\n\n`;
    response += `🏠 **Business Loan**\n• Amount: ₹1,00,000 – ₹50,00,000\n• Rate: 12% – 20% p.a.\n• Tenure: 12 – 84 months\n• Purpose: Business expansion, working capital\n\n`;
    response += `🥇 **Gold Loan**\n• Amount: Up to 75% of gold value\n• Rate: 8% – 16% p.a.\n• Instant approval!\n\n`;

    response += `**Documents Required:**\n• PAN Card + Aadhaar Card\n• Income proof (salary slip / ITR)\n• Bank statement (6 months)\n• Address proof\n\n`;
    response += `**How to Apply:**\n1. Contact your MoneyMitra agent\n2. Or visit our branch with documents\n3. Get approval in 24-48 hours! 🚀\n\nWant me to tell you more about any specific loan type?`;
    return { response, intent: 'LOAN_SUGGESTION' };
  }

  // ── Support / Help ──────────────────────────────────────────────────────
  if (msg.includes('support') || msg.includes('help') || msg.includes('contact') || msg.includes('human') || msg.includes('agent') || msg.includes('problem')) {
    return {
      response: `📞 **Need Help?**\n\nI can assist with most queries, but if you need to speak with our team:\n\n🎫 **Create a Support Ticket:**\nGo to "Support" in your dashboard → "New Ticket"\n\n📱 **Call Us:**\nContact your assigned agent or visit your nearest branch.\n\n💬 **For urgent issues:**\n• Visit your branch in person\n• Call during business hours (9 AM – 6 PM)\n\nI'm also here 24/7! What else can I help you with? 😊`,
      intent: 'SUPPORT',
    };
  }

  // ── How to Pay ──────────────────────────────────────────────────────────
  if (msg.includes('how to pay') || msg.includes('payment mode') || msg.includes('pay online') || msg.includes('pay emi') || msg.includes('kaise pay')) {
    return {
      response: `💳 **How to Pay Your EMI:**\n\n**Via App/Dashboard:**\n1. Login → Go to "My Loans"\n2. Select your loan\n3. Click "Pay EMI"\n4. Choose payment mode & pay!\n\n**Payment Modes Accepted:**\n• 💵 Cash (at branch)\n• 📱 UPI (Google Pay, PhonePe, Paytm)\n• 🏦 Net Banking / Bank Transfer\n• 💳 Debit/Credit Card\n• 📝 Cheque\n\n**Via Cashier:**\nVisit your nearest branch with cash or cheque. Your cashier will record the payment immediately.\n\n⚡ Payment reflects instantly in your account!`,
      intent: 'PAYMENT_HELP',
    };
  }

  // ── Interest Rate ───────────────────────────────────────────────────────
  if (msg.includes('interest') || msg.includes('rate') || msg.includes('byaj') || msg.includes('percent')) {
    return {
      response: `📊 **Interest Rates at MoneyMitra:**\n\n| Loan Type | Rate (p.a.) |\n|-----------|-------------|\n| Personal Loan | 14% – 24% |\n| Business Loan | 12% – 20% |\n| Gold Loan | 8% – 16% |\n| Vehicle Loan | 10% – 18% |\n| Home Loan | 9% – 14% |\n\n**Your rate depends on:**\n• Credit score\n• Loan amount & tenure\n• Income & repayment history\n\n💡 Customers with **good repayment history** (like you!) may qualify for **lower rates** on their next loan!\n\nWant to know your exact rate? Talk to our agent. 😊`,
      intent: 'INTEREST_RATES',
    };
  }

  // ── Thank you ───────────────────────────────────────────────────────────
  if (/thank|thanks|shukriya|dhanyavad|great|helpful/.test(msg)) {
    return {
      response: `You're welcome, ${name}! 😊 I'm glad I could help!\n\nFeel free to ask me anything anytime — I'm available 24/7. Have a great day! 🌟`,
      intent: 'THANKS',
    };
  }

  // ── Default ─────────────────────────────────────────────────────────────
  return {
    response: `I understand you're asking about: *"${message}"*\n\nI can help you with:\n📅 **EMI status & due dates**\n💰 **Outstanding balance & penalties**\n📋 **Loan details & history**\n💳 **How to make payments**\n📝 **New loan suggestions & eligibility**\n🏁 **Loan foreclosure**\n📞 **Support & escalation**\n\nTry asking:\n• "When is my next EMI due?"\n• "What is my outstanding balance?"\n• "Do I have any overdue payments?"\n• "Suggest a loan for me"\n\nOr type your question and I'll do my best to help! 🤖`,
    intent: 'GENERAL',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — Handle chat messages
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, sessionId, message, customerName } = body;

    if (!customerId || !sessionId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch real customer context from DB
    const ctx = await getCustomerContext(customerId);

    const resolvedName = customerName || ctx.customerName || '';


    // Generate intelligent response using real data
    const { response: aiResponse, intent } = generateIntelligentResponse(
      message,
      resolvedName,
      ctx,
    );

    // Save chat history
    let savedChatId: string | undefined;
    try {
      const saved = await db.aIChatHistory.create({
        data: { customerId, sessionId, userMessage: message, aiResponse, intent }
      });
      savedChatId = saved.id;
    } catch (dbError) {
      console.log('[AI Chat] Could not save history:', dbError);
    }

    return NextResponse.json({ success: true, response: aiResponse, intent, chatId: savedChatId });
  } catch (error) {
    console.error('[AI Chat] Error:', error);
    return NextResponse.json({
      error: 'Failed to process your message. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — Fetch chat history
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const sessionId = searchParams.get('sessionId');

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    try {
      const history = await db.aIChatHistory.findMany({
        where: { customerId, ...(sessionId ? { sessionId } : {}) },
        orderBy: { createdAt: 'asc' },
        take: sessionId ? undefined : 50,
      });
      return NextResponse.json({ success: true, history });
    } catch {
      return NextResponse.json({ success: true, history: [] });
    }
  } catch (error) {
    console.error('[AI Chat] History fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
  }
}
