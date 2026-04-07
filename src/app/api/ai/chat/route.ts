import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// System prompt for the loan assistant
const LOAN_ASSISTANT_PROMPT = `You are a helpful and friendly AI Loan Assistant for a financial services company.`;

// Smart response system for loan queries
function generateSmartResponse(message: string, customerName?: string): { response: string; intent: string } {
  const lowerMessage = message.toLowerCase();
  
  // EMI Status queries
  if (lowerMessage.includes('emi') && (lowerMessage.includes('status') || lowerMessage.includes('check') || lowerMessage.includes('due'))) {
    return {
      response: `📅 **EMI Status Check**

To check your EMI status, please follow these steps:

1. Go to your **Dashboard** home page
2. Look for the **"Next EMI Due"** card
3. Click on **"My Loans"** tab to see all your active loans
4. Select a loan to view detailed EMI schedule

**What you'll see:**
- Next EMI amount and due date
- Payment status (Pending/Paid/Overdue)
- Complete EMI schedule with all installments

💡 **Tip:** Set up EMI reminders to never miss a payment!

Need help with anything else?`,
      intent: 'EMI_STATUS'
    };
  }

  // EMI Payment queries
  if (lowerMessage.includes('emi') && (lowerMessage.includes('pay') || lowerMessage.includes('payment') || lowerMessage.includes('make'))) {
    return {
      response: `💳 **How to Pay Your EMI**

You have multiple payment options:

**Online Payment:**
1. Go to **My Loans** → Select your loan
2. Click **"Pay Now"** on the EMI due
3. Choose payment mode (UPI, Net Banking, Card)
4. Complete the payment

**Payment Modes Available:**
- UPI (Google Pay, PhonePe, Paytm)
- Net Banking
- Debit/Credit Card
- Cash (visit our branch)

**Payment will be credited instantly!**

Need help with payment issues?`,
      intent: 'EMI_PAYMENT'
    };
  }

  // Loan Eligibility
  if (lowerMessage.includes('eligib') || lowerMessage.includes('qualify') || lowerMessage.includes('can i get') || lowerMessage.includes('eligible')) {
    return {
      response: `✅ **Loan Eligibility Criteria**

**Basic Requirements:**
- Age: 21-65 years
- Indian resident with valid ID proof
- Regular income source

**Documents Required:**
- PAN Card
- Aadhaar Card
- Income Proof (Salary Slip/ITR)
- Bank Statement (last 6 months)
- Address Proof

**Factors Affecting Eligibility:**
- Credit Score (600+ preferred)
- Monthly Income
- Existing Loans
- Employment Stability

**Loan Amount You May Get:**
- Personal Loan: Up to ₹50 Lakhs
- Gold Loan: Up to 75% of gold value
- Vehicle Loan: Up to 90% of vehicle value
- Business Loan: Up to ₹1 Crore

Want to check your eligibility? Apply now and get instant approval!`,
      intent: 'LOAN_ELIGIBILITY'
    };
  }

  // Interest Rates
  if (lowerMessage.includes('interest') || lowerMessage.includes('rate')) {
    return {
      response: `📊 **Interest Rates**

Here are our competitive interest rates:

| Loan Type | Interest Rate (p.a.) |
|-----------|---------------------|
| Personal Loan | 10% - 24% |
| Gold Loan | 8% - 18% |
| Vehicle Loan | 10% - 20% |
| Business Loan | 12% - 24% |
| Home Loan | 8% - 14% |

**What Determines Your Rate?**
- Credit Score
- Loan Amount
- Tenure
- Income Level
- Relationship with us

💡 **Lower your rate by:**
- Maintaining good credit score
- Choosing shorter tenure
- Applying with co-applicant

Want to know your personalized rate? Apply now!`,
      intent: 'INTEREST_RATES'
    };
  }

  // Loan Application
  if (lowerMessage.includes('apply') || lowerMessage.includes('application') || lowerMessage.includes('new loan')) {
    return {
      response: `📝 **How to Apply for a Loan**

**Step-by-Step Process:**

1. **Apply Online**
   - Click "Apply" on your dashboard
   - Select loan type and amount
   - Fill in basic details

2. **Verification**
   - Our agent will contact you
   - Document verification at your doorstep

3. **Approval**
   - Quick approval within 24-48 hours
   - Sanction letter generation

4. **Disbursement**
   - Accept the sanction letter
   - Amount credited to your bank account

**Documents Needed:**
- PAN Card ✓
- Aadhaar Card ✓
- Income Proof ✓
- Photo ✓

**Quick Tips:**
- Keep documents ready
- Provide accurate information
- Be available for verification

Ready to apply? Click the "Apply" button now! 🚀`,
      intent: 'LOAN_APPLICATION'
    };
  }

  // Documentation
  if (lowerMessage.includes('document') || lowerMessage.includes('paper') || lowerMessage.includes('required')) {
    return {
      response: `📄 **Documents Required**

**For Salaried Employees:**
- PAN Card
- Aadhaar Card
- Salary Slips (last 3 months)
- Bank Statement (last 6 months)
- Employment Proof/ID Card
- Address Proof

**For Self-Employed:**
- PAN Card
- Aadhaar Card
- Business Registration
- ITR (last 2 years)
- Bank Statement (last 12 months)
- Business Address Proof

**For Gold Loan:**
- PAN Card
- Aadhaar Card
- Gold Valuation Certificate

**For Vehicle Loan:**
- PAN Card
- Aadhaar Card
- Income Proof
- Vehicle Quotation/Invoice

📸 Documents can be uploaded directly through the app!

Need clarification on any document?`,
      intent: 'DOCUMENTATION'
    };
  }

  // Support
  if (lowerMessage.includes('support') || lowerMessage.includes('help') || lowerMessage.includes('contact')) {
    return {
      response: `📞 **Contact Support**

We're here to help you!

**Support Channels:**

🎫 **Support Tickets:**
- Go to "Support" tab in your dashboard
- Create a new ticket
- Get response within 24 hours

📧 **Email:**
- support@loanservice.com

📱 **Customer Care:**
- 1800-XXX-XXXX (Toll Free)
- Available: 9 AM - 8 PM (Mon-Sat)

💬 **Live Chat:**
- Chat with us right here!

**For Urgent Issues:**
- Visit your nearest branch
- Call our toll-free number

How can we assist you today?`,
      intent: 'SUPPORT'
    };
  }

  // Foreclosure
  if (lowerMessage.includes('foreclose') || lowerMessage.includes('close') || lowerMessage.includes('prepay')) {
    return {
      response: `🏠 **Loan Foreclosure/Prepayment**

**What is Foreclosure?**
Closing your loan before the original tenure by paying the outstanding amount.

**Benefits:**
- Save on future interest
- Become debt-free sooner
- Improve credit score

**How to Apply:**
1. Go to **My Loans** → Select your loan
2. Click on **EMI** tab
3. Click **"Close Loan"** button
4. View foreclosure amount breakdown
5. Make payment

**Foreclosure Calculation:**
- Current month EMI: Principal + Interest
- Future EMIs: Principal only (Interest saved!)

**Example:**
If you have 4 EMIs remaining, you pay:
- This month: Full EMI
- Remaining 3 EMIs: Only principal (no interest!)

💡 **No prepayment charges for loans after 6 months!**

Want to close your loan? Check your dashboard for the exact amount.`,
      intent: 'FORECLOSURE'
    };
  }

  // Balance Check
  if (lowerMessage.includes('balance') || lowerMessage.includes('outstanding') || lowerMessage.includes('remaining')) {
    return {
      response: `💰 **Check Your Loan Balance**

**How to View:**

1. Go to **My Loans** tab
2. Select your active loan
3. View **"Outstanding Balance"** section

**You'll See:**
- Total Outstanding Amount
- Principal Remaining
- Interest Paid
- EMIs Remaining
- Next EMI Due Date

**Quick Balance Check:**
Your dashboard shows:
- Active Loan Amount
- Total Paid So Far
- Remaining Balance

💡 **Tip:** Pay extra towards principal to reduce your loan faster!

Need detailed breakdown?`,
      intent: 'LOAN_BALANCE'
    };
  }

  // General Greeting
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return {
      response: `Hello${customerName ? ` ${customerName}` : ''}! 👋

Welcome to our Loan Assistant! I'm here to help you with:

📅 **EMI Status & Payments**
✅ **Loan Eligibility Check**
📊 **Interest Rate Information**
📝 **Loan Applications**
📄 **Document Requirements**
🏠 **Loan Foreclosure**
💰 **Balance Enquiries**

Just type your question, or try these quick options:
- "What are the interest rates?"
- "How do I pay my EMI?"
- "Am I eligible for a loan?"
- "How to close my loan?"

How can I assist you today? 😊`,
      intent: 'GREETING'
    };
  }

  // Thank you
  if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
    return {
      response: `You're welcome${customerName ? ` ${customerName}` : ''}! 😊

I'm glad I could help! If you have any more questions about:
- EMI payments
- Loan applications
- Interest rates
- Or anything else...

Feel free to ask anytime! 

Have a great day! 🌟`,
      intent: 'THANKS'
    };
  }

  // Default response
  return {
    response: `I understand you're asking about: "${message}"

I can help you with:

📅 **EMI Related**
- Check EMI status
- Make EMI payment
- Change EMI date

💰 **Loan Information**
- Interest rates
- Loan eligibility
- Outstanding balance

📝 **Services**
- Apply for new loan
- Loan foreclosure
- Document requirements

**Try asking:**
- "Check my EMI status"
- "What are the interest rates?"
- "How to apply for a loan?"
- "Documents required"

Or create a support ticket for personalized assistance! 🎫`,
    intent: 'GENERAL'
  };
}

// POST - Handle chat messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, sessionId, message, customerName } = body;

    if (!customerId || !sessionId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate smart response
    const { response: aiResponse, intent } = generateSmartResponse(message, customerName);

    // Save chat history to database
    let savedChatId: string | undefined;
    try {
      const saved = await db.aIChatHistory.create({
        data: {
          customerId,
          sessionId,
          userMessage: message,
          aiResponse,
          intent
        }
      });
      savedChatId = saved.id;
    } catch (dbError) {
      console.log('Could not save chat history:', dbError);
      // Continue without saving - don't fail the request
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      intent,
      chatId: savedChatId
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json({ 
      error: 'Failed to process your message. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Fetch chat history for a session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const sessionId = searchParams.get('sessionId');

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    // If sessionId provided, get history for that session
    if (sessionId) {
      try {
        const history = await db.aIChatHistory.findMany({
          where: {
            customerId,
            sessionId
          },
          orderBy: { createdAt: 'asc' }
        });

        return NextResponse.json({
          success: true,
          history
        });
      } catch (dbError) {
        return NextResponse.json({
          success: true,
          history: []
        });
      }
    }

    // Otherwise, get all sessions for the customer (grouped)
    try {
      const allHistory = await db.aIChatHistory.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      // Group by session
      const sessions = allHistory.reduce((acc, chat) => {
        if (!acc[chat.sessionId]) {
          acc[chat.sessionId] = {
            sessionId: chat.sessionId,
            createdAt: chat.createdAt,
            messages: []
          };
        }
        acc[chat.sessionId].messages.push(chat);
        return acc;
      }, {} as Record<string, { sessionId: string; createdAt: Date; messages: typeof allHistory }>);

      return NextResponse.json({
        success: true,
        sessions: Object.values(sessions).sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      });
    } catch (dbError) {
      return NextResponse.json({
        success: true,
        sessions: []
      });
    }

  } catch (error) {
    console.error('Chat history fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
  }
}
