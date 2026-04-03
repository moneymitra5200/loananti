import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// Intent detection keywords
const INTENT_KEYWORDS: Record<string, string[]> = {
  EMI_STATUS: ['emi', 'emi status', 'emi due', 'emi payment', 'installment', 'due date', 'payment history', 'emi schedule', 'next emi', 'upcoming emi'],
  LOAN_STATUS: ['loan status', 'loan application', 'application status', 'loan approved', 'loan pending', 'my loan', 'loan details'],
  PAYMENT_HELP: ['payment help', 'how to pay', 'make payment', 'pay emi', 'payment method', 'payment issue', 'pay online', 'upi payment'],
  GENERAL_QUERY: ['hello', 'hi', 'hey', 'help', 'what can you', 'how are you', 'thank', 'thanks'],
  ESCALATE: ['human', 'speak to someone', 'agent', 'support ticket', 'customer care', 'representative', 'real person'],
};

function detectIntent(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        return intent;
      }
    }
  }
  
  return 'GENERAL_QUERY';
}

async function getCustomerContext(userId: string) {
  try {
    // Get customer's loans
    const loans = await db.loanApplication.findMany({
      where: { customerId: userId },
      select: {
        id: true,
        applicationNo: true,
        status: true,
        loanType: true,
        loanAmount: true,
        emiAmount: true,
        tenure: true,
        interestRate: true,
        disbursedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get upcoming EMIs
    const upcomingEMIs = await db.eMISchedule.findMany({
      where: {
        loanApplication: { customerId: userId },
        paymentStatus: 'PENDING',
        dueDate: { gte: new Date() },
      },
      select: {
        id: true,
        installmentNumber: true,
        dueDate: true,
        totalAmount: true,
        loanApplication: {
          select: {
            applicationNo: true,
            loanType: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 3,
    });

    // Get overdue EMIs
    const overdueEMIs = await db.eMISchedule.findMany({
      where: {
        loanApplication: { customerId: userId },
        paymentStatus: 'OVERDUE',
      },
      select: {
        id: true,
        installmentNumber: true,
        dueDate: true,
        totalAmount: true,
        penaltyAmount: true,
        loanApplication: {
          select: {
            applicationNo: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return { loans, upcomingEMIs, overdueEMIs };
  } catch (error) {
    console.error('Error fetching customer context:', error);
    return { loans: [], upcomingEMIs: [], overdueEMIs: [] };
  }
}

async function generateAIResponse(
  message: string,
  intent: string,
  context: { loans: any[]; upcomingEMIs: any[]; overdueEMIs: any[] }
): Promise<{ response: string; suggestedActions: any[] }> {
  let systemPrompt = `You are a helpful AI assistant for a loan management system. You help customers with their loan queries, EMI payments, and general questions. Be friendly, concise, and helpful.

Intents to handle:
- EMI_STATUS: Help customers check their EMI due dates and payment history
- LOAN_STATUS: Help customers check their loan application status
- PAYMENT_HELP: Help customers with payment-related queries
- GENERAL_QUERY: Handle general greetings and questions
- ESCALATE: When customer wants to speak to a human, acknowledge and prepare for ticket creation

Always be helpful and professional. If you don't know something, suggest escalating to human support.`;

  // Add customer context to prompt
  if (context.loans.length > 0) {
    systemPrompt += `\n\nCustomer's Loans:\n${JSON.stringify(context.loans, null, 2)}`;
  }
  if (context.upcomingEMIs.length > 0) {
    systemPrompt += `\n\nUpcoming EMIs:\n${JSON.stringify(context.upcomingEMIs, null, 2)}`;
  }
  if (context.overdueEMIs.length > 0) {
    systemPrompt += `\n\nOverdue EMIs:\n${JSON.stringify(context.overdueEMIs, null, 2)}`;
  }

  let suggestedActions: any[] = [];

  try {
    const zai = await ZAI.create();
    
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    let response = completion.choices[0]?.message?.content || 'I apologize, but I could not process your request. Please try again.';

    // Add intent-specific suggestions
    switch (intent) {
      case 'EMI_STATUS':
        suggestedActions = [
          { label: 'View All EMIs', action: 'Show me all my EMI schedules', type: 'query' },
          { label: 'Payment History', action: 'Show my payment history', type: 'query' },
          { label: 'Contact Support', action: 'escalate', type: 'escalate' },
        ];
        break;
      case 'LOAN_STATUS':
        suggestedActions = [
          { label: 'Active Loans', action: 'Show my active loans', type: 'query' },
          { label: 'Loan Details', action: 'Show detailed loan information', type: 'query' },
          { label: 'Contact Support', action: 'escalate', type: 'escalate' },
        ];
        break;
      case 'PAYMENT_HELP':
        suggestedActions = [
          { label: 'Payment Methods', action: 'What payment methods are available?', type: 'query' },
          { label: 'UPI Payment', action: 'How do I pay via UPI?', type: 'query' },
          { label: 'Contact Support', action: 'escalate', type: 'escalate' },
        ];
        break;
      case 'ESCALATE':
        suggestedActions = [
          { label: 'Create Ticket', action: 'escalate', type: 'escalate' },
        ];
        break;
      default:
        suggestedActions = [
          { label: 'EMI Status', action: 'Check my EMI status', type: 'query' },
          { label: 'Loan Status', action: 'Check my loan status', type: 'query' },
          { label: 'Payment Help', action: 'I need payment help', type: 'query' },
        ];
    }

    return { response, suggestedActions };
  } catch (error) {
    console.error('AI generation error:', error);
    
    // Fallback response
    let fallbackResponse = '';
    switch (intent) {
      case 'EMI_STATUS':
        if (context.upcomingEMIs.length > 0) {
          fallbackResponse = `You have ${context.upcomingEMIs.length} upcoming EMI(s). Your next EMI of ₹${context.upcomingEMIs[0].totalAmount.toLocaleString()} is due on ${new Date(context.upcomingEMIs[0].dueDate).toLocaleDateString()}.`;
        } else {
          fallbackResponse = 'You have no upcoming EMIs at the moment.';
        }
        break;
      case 'LOAN_STATUS':
        if (context.loans.length > 0) {
          const activeLoans = context.loans.filter(l => l.status === 'ACTIVE' || l.status === 'DISBURSED');
          fallbackResponse = `You have ${context.loans.length} loan(s). ${activeLoans.length} are active.`;
        } else {
          fallbackResponse = 'You don\'t have any loans yet.';
        }
        break;
      case 'PAYMENT_HELP':
        fallbackResponse = 'I can help you with payments! You can pay your EMIs via UPI, bank transfer, or cash at our office. Would you like more details?';
        break;
      case 'ESCALATE':
        fallbackResponse = 'I understand you\'d like to speak with a human representative. I\'ll help create a support ticket for you.';
        break;
      default:
        fallbackResponse = 'Hello! How can I assist you today? I can help with EMI status, loan queries, and payment assistance.';
    }

    return { response: fallbackResponse, suggestedActions };
  }
}

async function createSupportTicket(userId: string, sessionId: string | null) {
  try {
    const ticketNumber = `TK-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    
    const ticket = await db.supportTicket.create({
      data: {
        ticketNumber,
        customerId: userId,
        subject: 'Chatbot Escalation - Customer Requested Human Support',
        description: 'Customer requested to speak with a human representative via the AI chatbot.',
        category: 'GENERAL',
        priority: 'NORMAL',
        status: 'OPEN',
        source: 'CHATBOT',
        chatbotSessionId: sessionId,
      },
    });

    // Create initial ticket message
    await db.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: userId,
        senderType: 'CUSTOMER',
        message: 'I need to speak with a human representative.',
        isInternal: false,
      },
    });

    // Update chatbot session if exists
    if (sessionId) {
      await db.chatbotSession.update({
        where: { id: sessionId },
        data: { 
          status: 'ESCALATED',
          escalationTicketId: ticket.id,
        },
      });
    }

    return ticket;
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, intent: providedIntent, userId } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Detect intent
    const intent = providedIntent || detectIntent(message);

    // Get customer context
    const context = await getCustomerContext(userId);

    // Generate AI response
    const { response, suggestedActions } = await generateAIResponse(message, intent, context);

    // Handle escalation
    let ticketNumber: string | null = null;
    if (intent === 'ESCALATE') {
      const ticket = await createSupportTicket(userId, sessionId);
      if (ticket) {
        ticketNumber = ticket.ticketNumber;
      }
    }

    // Save chatbot session and messages
    let chatSession: { id: string } | null = null;
    try {
      if (sessionId) {
        // Update existing session
        chatSession = await db.chatbotSession.update({
          where: { id: sessionId },
          data: {
            lastMessageAt: new Date(),
            messageCount: { increment: 2 },
            status: intent === 'ESCALATE' ? 'ESCALATED' : 'ACTIVE',
          },
        });

        // Save user message
        await db.chatbotMessage.create({
          data: {
            sessionId: sessionId,
            senderType: 'CUSTOMER',
            message: message,
            intent: intent,
          },
        });

        // Save bot response
        await db.chatbotMessage.create({
          data: {
            sessionId: sessionId,
            senderType: 'CHATBOT',
            message: response,
            intent: intent,
            suggestedActions: JSON.stringify(suggestedActions),
          },
        });
      } else {
        // Create new session
        chatSession = await db.chatbotSession.create({
          data: {
            customerId: userId,
            status: intent === 'ESCALATE' ? 'ESCALATED' : 'ACTIVE',
            messageCount: 2,
          },
        });

        // Save user message
        await db.chatbotMessage.create({
          data: {
            sessionId: chatSession.id,
            senderType: 'CUSTOMER',
            message: message,
            intent: intent,
          },
        });

        // Save bot response
        await db.chatbotMessage.create({
          data: {
            sessionId: chatSession.id,
            senderType: 'CHATBOT',
            message: response,
            intent: intent,
            suggestedActions: JSON.stringify(suggestedActions),
          },
        });
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue even if DB save fails
    }

    // Add escalation info to response
    let finalResponse = response;
    if (intent === 'ESCALATE' && ticketNumber) {
      finalResponse = `${response}\n\nYour support ticket has been created: ${ticketNumber}. Our team will contact you shortly.`;
    }

    return NextResponse.json({
      response: finalResponse,
      intent,
      suggestedActions,
      sessionId: chatSession?.id || sessionId,
      status: intent === 'ESCALATE' ? 'ESCALATED' : 'ACTIVE',
      ticketNumber,
    });
  } catch (error) {
    console.error('Chatbot API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
