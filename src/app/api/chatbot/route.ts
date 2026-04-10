import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// ─── Intent Detection ───────────────────────────────────────────────
const INTENT_KEYWORDS: Record<string, string[]> = {
  EMI_STATUS:       ['emi', 'installment', 'due date', 'emi schedule', 'next emi', 'upcoming emi', 'payment date', 'kab hai'],
  PAYMENT_HISTORY:  ['payment history', 'paid emi', 'past payments', 'already paid', 'kitna bhar chuka'],
  LOAN_STATUS:      ['loan status', 'application status', 'approved', 'pending', 'loan approved', 'my loan', 'loan details'],
  OVERDUE:          ['overdue', 'late', 'missed emi', 'due ho gaya', 'chuka nahi', 'default', 'backlogs'],
  PENALTY:          ['penalty', 'late fee', 'fine', 'charges', 'penalty kitna', 'penalty waiver', 'maafi', 'penalty remove'],
  INTEREST:         ['interest', 'interest rate', 'byaj', 'rate', 'flat rate', 'reducing rate', 'how much interest'],
  FORECLOSURE:      ['foreclosure', 'close loan', 'close early', 'prepay', 'pre-close', 'loan band karna', 'full payment'],
  EMI_DATE_CHANGE:  ['change emi date', 'emi date change', 'different date', 'tarikh badal', 'reschedule emi'],
  TOP_UP:           ['top up', 'extra loan', 'more money', 'additional loan', 'increase loan'],
  PROCESSING_FEE:   ['processing fee', 'processing charge', 'fee kitna hai', 'upfront fee'],
  DOCUMENTS:        ['documents', 'doc required', 'kyc', 'id proof', 'address proof', 'income proof', 'kya chahiye'],
  APPLY_LOAN:       ['apply loan', 'new loan', 'loan lena hai', 'loan kaise milega', 'loan apply'],
  PAYMENT_HELP:     ['pay emi', 'how to pay', 'payment method', 'upi', 'bank transfer', 'cheque', 'online payment'],
  BALANCE:          ['outstanding', 'remaining balance', 'kitna bacha', 'total due', 'principal remaining'],
  ESCALATE:         ['human', 'agent', 'speak to someone', 'support ticket', 'representative', 'manager', 'real person', 'complaint'],
  GENERAL_QUERY:    ['hello', 'hi', 'hey', 'help', 'what can you', 'thanks', 'thank you', 'bye'],
};

function detectIntent(message: string): string {
  const lower = message.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return intent;
  }
  return 'GENERAL_QUERY';
}

// ─── Customer Context ────────────────────────────────────────────────
async function getCustomerContext(userId: string) {
  try {
    const [loans, upcomingEMIs, overdueEMIs, recentPayments] = await Promise.all([
      db.loanApplication.findMany({
        where: { customerId: userId },
        select: {
          id: true, applicationNo: true, status: true, loanType: true,
          loanAmount: true, emiAmount: true, tenure: true, interestRate: true,
          disbursedAt: true, processingFee: true,
        },
        orderBy: { createdAt: 'desc' }, take: 5,
      }),
      db.eMISchedule.findMany({
        where: { loanApplication: { customerId: userId }, paymentStatus: 'PENDING', dueDate: { gte: new Date() } },
        select: { id: true, installmentNumber: true, dueDate: true, totalAmount: true, principalAmount: true, interestAmount: true,
          loanApplication: { select: { applicationNo: true, loanType: true } } },
        orderBy: { dueDate: 'asc' }, take: 5,
      }),
      db.eMISchedule.findMany({
        where: { loanApplication: { customerId: userId }, paymentStatus: 'OVERDUE' },
        select: { id: true, installmentNumber: true, dueDate: true, totalAmount: true, penaltyAmount: true,
          loanApplication: { select: { applicationNo: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      db.eMISchedule.findMany({
        where: { loanApplication: { customerId: userId }, paymentStatus: { in: ['PAID', 'PARTIALLY_PAID'] } },
        select: { id: true, installmentNumber: true, paidDate: true, paidAmount: true, paymentMode: true,
          loanApplication: { select: { applicationNo: true } } },
        orderBy: { paidDate: 'desc' }, take: 5,
      }),
    ]);
    return { loans, upcomingEMIs, overdueEMIs, recentPayments };
  } catch {
    return { loans: [], upcomingEMIs: [], overdueEMIs: [], recentPayments: [] };
  }
}

// ─── Powerful AI Response ────────────────────────────────────────────
async function generateAIResponse(
  message: string,
  intent: string,
  context: Awaited<ReturnType<typeof getCustomerContext>>,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[]
): Promise<{ response: string; suggestedActions: any[]; couldNotAnswer: boolean }> {

  const { loans, upcomingEMIs, overdueEMIs, recentPayments } = context;
  const activeLoans = loans.filter(l => ['ACTIVE', 'DISBURSED'].includes(l.status));
  const totalOutstanding = upcomingEMIs.reduce((s, e) => s + e.totalAmount, 0);
  const totalPenalty = overdueEMIs.reduce((s, e) => s + (e.penaltyAmount || 0), 0);

  const systemPrompt = `You are MitraBot — the AI financial assistant for MoneyMitra Finance, a loan management company.
You ONLY handle loan-related questions. You are confident, concise, and speak to the customer in a warm, helpful tone.
You can mix English and Hindi naturally (Hinglish) if needed.

## CUSTOMER DATA (Use this to give specific answers):
Active Loans: ${JSON.stringify(activeLoans)}
Upcoming EMIs (next 5): ${JSON.stringify(upcomingEMIs)}
Overdue EMIs: ${JSON.stringify(overdueEMIs)}
Recent Payments: ${JSON.stringify(recentPayments)}
Total Outstanding Balance: ₹${totalOutstanding.toLocaleString('en-IN')}
Total Penalty Accrued: ₹${totalPenalty.toLocaleString('en-IN')}

## TOPICS YOU CAN ANSWER:
1. **EMI Status** — upcoming EMIs, due dates, amounts (principal + interest)
2. **Payment History** — what has been paid, when, how much
3. **Overdue & Penalty** — overdue EMIs, penalty amount (₹100/day), how to clear
4. **Loan Status** — application progress, disbursement, active/closed loans
5. **Interest** — flat vs reducing rate, how interest is calculated on their specific loan
6. **Outstanding Balance** — remaining principal, total amount to repay
7. **Foreclosure** — how to close loan early, what charges apply
8. **EMI Date Change** — request to shift EMI date (tell them to use the app's Services section)
9. **Top-Up Loan** — how to request additional funds
10. **Processing Fee** — what it is, when it is deducted
11. **Documents** — what docs are needed for loan (Aadhaar, PAN, income proof, bank statement, photo)
12. **Payment Methods** — UPI, bank transfer, cheque, cash at branch
13. **How to Apply** — guide them to use the app's Apply section
14. **General** — greetings, company info, contact details

## RULES:
- Always use actual customer data when answering (loan numbers, amounts, dates)
- Format currency in ₹ Indian Rupee format 
- Format dates as DD-MMM-YYYY (e.g., 15-Apr-2025)
- If the customer has OVERDUE EMIs, always mention it with urgency
- If penalty exists, show the exact penalty amount
- For foreclosure/top-up/date-change: guide them to App → My Loans → [loan] → Services
- If you genuinely cannot answer something loan-related, say so clearly and offer to create a support ticket
- Do NOT answer questions completely unrelated to loans/finance
- Keep responses under 150 words, be direct and helpful`;

  let suggestedActions: any[] = [];
  let couldNotAnswer = false;

  try {
    const zai = await ZAI.create();
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6), // last 3 turns for context
      { role: 'user', content: message },
    ];

    const completion = await zai.chat.completions.create({
      messages,
      temperature: 0.5,
      max_tokens: 400,
    });

    const response = completion.choices[0]?.message?.content?.trim() ||
      'I apologize, I could not process that. Please try rephrasing or contact our support team.';

    // Detect if AI couldn't answer (uncertainty markers)
    const uncertainty = ['i don\'t know', 'i cannot', 'i\'m not sure', 'contact support', 'unable to', 'cannot answer'];
    couldNotAnswer = uncertainty.some(u => response.toLowerCase().includes(u));

    // Intent-based suggestions
    suggestedActions = getSuggestedActions(intent, overdueEMIs.length > 0);

    return { response, suggestedActions, couldNotAnswer };
  } catch {
    // Fallback: rule-based response
    const { response, suggestedActions: sa } = buildFallbackResponse(intent, context);
    return { response, suggestedActions: sa, couldNotAnswer: false };
  }
}

function getSuggestedActions(intent: string, hasOverdue: boolean): any[] {
  const base = hasOverdue ? [{ label: '⚠️ Clear Overdue', action: 'How do I clear my overdue EMI and penalty?', type: 'query' }] : [];
  const map: Record<string, any[]> = {
    EMI_STATUS:      [{ label: 'Payment History', action: 'Show my payment history', type: 'query' }, { label: 'Outstanding Balance', action: 'What is my outstanding balance?', type: 'query' }],
    OVERDUE:         [{ label: 'Penalty Details', action: 'How much penalty do I have?', type: 'query' }, { label: 'Contact Support', action: 'escalate', type: 'escalate' }],
    PENALTY:         [{ label: 'Penalty Waiver', action: 'Can I get a penalty waiver?', type: 'query' }, { label: 'Create Ticket', action: 'escalate', type: 'escalate' }],
    FORECLOSURE:     [{ label: 'Outstanding Balance', action: 'What is my outstanding balance?', type: 'query' }, { label: 'Contact Support', action: 'escalate', type: 'escalate' }],
    LOAN_STATUS:     [{ label: 'EMI Schedule', action: 'Show my EMI schedule', type: 'query' }, { label: 'Outstanding Balance', action: 'What is my outstanding balance?', type: 'query' }],
    APPLY_LOAN:      [{ label: 'Documents Needed', action: 'What documents do I need?', type: 'query' }, { label: 'Interest Rates', action: 'What are your interest rates?', type: 'query' }],
    ESCALATE:        [{ label: '🎫 Create Ticket', action: 'escalate', type: 'escalate' }],
  };
  return [...base, ...(map[intent] || [{ label: 'EMI Status', action: 'Check my EMI status', type: 'query' }, { label: 'Contact Support', action: 'escalate', type: 'escalate' }])];
}

function buildFallbackResponse(intent: string, ctx: Awaited<ReturnType<typeof getCustomerContext>>) {
  const { upcomingEMIs, overdueEMIs, loans } = ctx;
  let response = '';
  switch (intent) {
    case 'EMI_STATUS':
      response = upcomingEMIs.length > 0
        ? `Your next EMI of ₹${upcomingEMIs[0].totalAmount.toLocaleString('en-IN')} for ${upcomingEMIs[0].loanApplication?.applicationNo} is due on ${new Date(upcomingEMIs[0].dueDate).toLocaleDateString('en-IN')}.`
        : 'You have no upcoming EMIs at the moment. Great job staying on track! 🎉';
      break;
    case 'OVERDUE':
      response = overdueEMIs.length > 0
        ? `⚠️ You have ${overdueEMIs.length} overdue EMI(s) totalling ₹${overdueEMIs.reduce((s, e) => s + e.totalAmount, 0).toLocaleString('en-IN')}. A penalty of ₹100/day is being applied. Please pay immediately to stop penalty growth.`
        : 'Great news — you have no overdue EMIs! ✅';
      break;
    case 'LOAN_STATUS':
      response = loans.length > 0
        ? `You have ${loans.length} loan(s). Active: ${loans.filter(l => ['ACTIVE','DISBURSED'].includes(l.status)).length}. Latest: ${loans[0].applicationNo} (${loans[0].status}).`
        : 'You don\'t have any loans yet. Want to apply? Use the Apply section in your dashboard.';
      break;
    case 'DOCUMENTS':
      response = 'Documents required: ✅ Aadhaar Card, ✅ PAN Card, ✅ Last 3 months bank statement, ✅ Income proof (salary slip / ITR), ✅ Passport photo. Upload them in the app during loan application.';
      break;
    case 'PAYMENT_HELP':
      response = 'You can pay EMIs via: 💳 UPI, 🏦 Bank Transfer (NEFT/IMPS), 💵 Cash at branch, 🧾 Cheque. Go to My Loans → tap your loan → Pay EMI.';
      break;
    default:
      response = 'Hello! I\'m MitraBot 🤖 — your MoneyMitra AI assistant. I can help with EMI status, loan queries, payments, interest, penalties, and more. How can I assist you today?';
  }
  return { response, suggestedActions: getSuggestedActions(intent, overdueEMIs.length > 0) };
}

// ─── Auto-create Ticket when AI is overloaded ────────────────────────
async function autoCreateTicket(userId: string, sessionId: string | null, reason: string) {
  try {
    const year = new Date().getFullYear();
    const last = await db.supportTicket.findFirst({
      where: { ticketNumber: { startsWith: `TK-${year}-` } },
      orderBy: { ticketNumber: 'desc' },
    });
    const seq = last ? parseInt(last.ticketNumber.split('-')[2]) + 1 : 1;
    const ticketNumber = `TK-${year}-${seq.toString().padStart(4, '0')}`;

    const ticket = await db.supportTicket.create({
      data: {
        ticketNumber, customerId: userId,
        subject: reason || 'AI Chatbot Escalation',
        description: 'Customer\'s query could not be resolved by AI assistant. Human support required.',
        category: 'GENERAL', priority: 'NORMAL', status: 'OPEN', source: 'CHATBOT',
        chatbotSessionId: sessionId,
        activities: { create: { action: 'CREATED', description: 'Auto-escalated from AI chatbot', performedBy: userId } },
      },
    });

    if (sessionId) {
      await db.chatbotSession.update({ where: { id: sessionId }, data: { status: 'ESCALATED', escalationTicketId: ticket.id } });
    }

    return ticket;
  } catch { return null; }
}

// ─── POST /api/chatbot ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, intent: providedIntent, userId, conversationHistory = [] } = body;

    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

    const intent = providedIntent || detectIntent(message);
    const context = await getCustomerContext(userId);

    // Manual escalation request
    if (intent === 'ESCALATE') {
      const ticket = await autoCreateTicket(userId, sessionId, 'Customer requested human support');
      const finalResponse = ticket
        ? `I've created a support ticket for you: **${ticket.ticketNumber}** 🎫\n\nOur support team will contact you within 24 hours. Is there anything else I can help with?`
        : 'I\'ll connect you with our support team. Please call us at +91 1800-XXX-XXXX or email support@moneymitrafinance.com.';

      await saveSession(sessionId, userId, message, finalResponse, intent, getSuggestedActions('ESCALATE', false));
      return NextResponse.json({ response: finalResponse, intent, suggestedActions: [{ label: 'View My Tickets', action: 'Show my support tickets', type: 'query' }], sessionId, status: 'ESCALATED', ticketNumber: ticket?.ticketNumber });
    }

    // Generate AI response
    const { response, suggestedActions, couldNotAnswer } = await generateAIResponse(message, intent, context, conversationHistory);

    // Auto-escalate if AI couldn't answer (track in session metadata)
    let autoEscalated = false;
    let ticketNumber: string | null = null;

    if (couldNotAnswer) {
      // Check how many times AI has failed in this session
      const failCount = (body.aiFailCount || 0) + 1;
      if (failCount >= 3) {
        const ticket = await autoCreateTicket(userId, sessionId, `Customer query not resolved after ${failCount} attempts: "${message}"`);
        if (ticket) {
          ticketNumber = ticket.ticketNumber;
          autoEscalated = true;
        }
      }
    }

    let finalResponse = response;
    if (autoEscalated && ticketNumber) {
      finalResponse = `${response}\n\n📋 Since I wasn't able to fully resolve your query, I've automatically created support ticket **${ticketNumber}** for you. Our team will follow up within 24 hours!`;
    }

    const newSessionId = await saveSession(sessionId, userId, message, finalResponse, intent, suggestedActions);

    return NextResponse.json({
      response: finalResponse, intent, suggestedActions,
      sessionId: newSessionId || sessionId,
      status: autoEscalated ? 'ESCALATED' : 'ACTIVE',
      ticketNumber, autoEscalated,
      aiFailCount: couldNotAnswer ? (body.aiFailCount || 0) + 1 : 0,
    });
  } catch (error) {
    console.error('Chatbot API error:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}

async function saveSession(sessionId: string | null, userId: string, userMsg: string, botMsg: string, intent: string, suggestedActions: any[]) {
  try {
    let cSession: { id: string };
    if (sessionId) {
      cSession = await db.chatbotSession.update({
        where: { id: sessionId },
        data: { lastMessageAt: new Date(), messageCount: { increment: 2 } },
      });
    } else {
      cSession = await db.chatbotSession.create({ data: { customerId: userId, status: 'ACTIVE', messageCount: 2 } });
    }
    await db.chatbotMessage.createMany({
      data: [
        { sessionId: cSession.id, senderType: 'CUSTOMER', message: userMsg, intent },
        { sessionId: cSession.id, senderType: 'CHATBOT', message: botMsg, intent, suggestedActions: JSON.stringify(suggestedActions) },
      ],
    });
    return cSession.id;
  } catch { return null; }
}
