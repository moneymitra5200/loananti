'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  X, 
  Send, 
  Minimize2, 
  Maximize2,
  Bot,
  User,
  Loader2,
  HelpCircle,
  CreditCard,
  FileText,
  AlertCircle,
  ArrowUpRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  suggestedActions?: SuggestedAction[];
  timestamp: Date;
  isTyping?: boolean;
}

interface SuggestedAction {
  label: string;
  action: string;
  type: 'query' | 'escalate' | 'link';
}

interface ChatSession {
  id: string;
  messages: ChatMessage[];
  status: 'ACTIVE' | 'ESCALATED' | 'CLOSED';
}

const QUICK_ACTIONS: SuggestedAction[] = [
  { label: '📅 EMI Due Dates', action: 'When is my next EMI due?', type: 'query' },
  { label: '⚠️ Overdue Status', action: 'Do I have any overdue EMIs?', type: 'query' },
  { label: '💰 Penalty Info', action: 'How much penalty do I have?', type: 'query' },
  { label: '🏦 Loan Status', action: 'What is my loan status?', type: 'query' },
  { label: '📊 Outstanding Balance', action: 'What is my outstanding balance?', type: 'query' },
  { label: '💳 How to Pay', action: 'How can I pay my EMI?', type: 'query' },
];

const INTENT_ICONS: Record<string, React.ReactNode> = {
  EMI_STATUS: <CreditCard className="h-4 w-4" />,
  LOAN_STATUS: <FileText className="h-4 w-4" />,
  PAYMENT_HELP: <HelpCircle className="h-4 w-4" />,
  GENERAL_QUERY: <MessageCircle className="h-4 w-4" />,
  ESCALATE: <AlertCircle className="h-4 w-4" />,
};

export default function AIChatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [session, setSession] = useState<ChatSession | null>(null);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [aiFailCount, setAiFailCount] = useState(0);
  // Generate a stable session ID per page load
  const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Fetch existing session on mount
  useEffect(() => {
    if (isOpen && !session) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/ai/chat?customerId=${user.id}&sessionId=${sessionIdRef.current}`);
      if (response.ok) {
        const data = await response.json();
        // Build prior messages from history if any
        if (data.history && data.history.length > 0) {
          const msgs: ChatMessage[] = data.history.flatMap((h: any) => [
            { id: `u-${h.id}`, role: 'user' as const, content: h.userMessage, timestamp: new Date(h.createdAt) },
            { id: `a-${h.id}`, role: 'assistant' as const, content: h.aiResponse, intent: h.intent, timestamp: new Date(h.createdAt) },
          ]);
          setSession({ id: sessionIdRef.current, messages: msgs, status: 'ACTIVE' });
          return;
        }
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
    // Default welcome
    setSession({
      id: sessionIdRef.current,
      messages: [{
        id: '1',
        role: 'assistant',
        content: `👋 Hi${user?.name ? ` ${user.name}` : ''}! I'm **MitraBot** — your AI Loan Assistant from MoneyMitra Finance!\n\nI can help you with:\n• Your EMI due dates & payment status\n• Outstanding balance & overdue details\n• Loan details & history\n• New loan suggestions\n• How to make payments\n• Foreclosure information\n\nJust ask me anything! 🤖`,
        timestamp: new Date(),
      }],
      status: 'ACTIVE',
    });
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading || !session || !user?.id) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, userMessage],
    } : null);

    setInputValue('');
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: ChatMessage = {
      id: 'typing',
      role: 'assistant',
      content: '',
      isTyping: true,
      timestamp: new Date(),
    };

    setSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, typingMessage],
    } : null);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          sessionId: sessionIdRef.current,
          customerId: user.id,
          customerName: user.name,
        }),
      });

      const data = await response.json();

      // Track AI fail count
      if (typeof data.aiFailCount === 'number') setAiFailCount(data.aiFailCount);

      // Remove typing indicator and add actual response
      setSession(prev => {
        if (!prev) return null;
        const messagesWithoutTyping = prev.messages.filter(m => m.id !== 'typing');
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.response,
          intent: data.intent,
          timestamp: new Date(),
        };
        return {
          ...prev,
          messages: [...messagesWithoutTyping, assistantMessage],
        };
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove typing indicator and add error message
      setSession(prev => {
        if (!prev) return null;
        const messagesWithoutTyping = prev.messages.filter(m => m.id !== 'typing');
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'I apologize, but I encountered an error. Please try again or contact support if the issue persists.',
          timestamp: new Date(),
        };
        return {
          ...prev,
          messages: [...messagesWithoutTyping, errorMessage],
        };
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEscalate = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'I need to speak with a human representative',
          sessionId: session?.id === 'new' ? null : session?.id,
          intent: 'ESCALATE',
          userId: user.id,
        }),
      });

      const data = await response.json();
      
      setSession(prev => {
        if (!prev) return null;
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };
        return {
          ...prev,
          id: data.sessionId || prev.id,
          messages: [...prev.messages, assistantMessage],
          status: 'ESCALATED',
        };
      });
      
      setShowEscalateDialog(false);
    } catch (error) {
      console.error('Failed to escalate:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: SuggestedAction) => {
    if (action.type === 'escalate') {
      setShowEscalateDialog(true);
    } else {
      sendMessage(action.action);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
        {session && session.messages.length > 1 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
            {session.messages.filter(m => m.role === 'user').length}
          </Badge>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={cn(
        "fixed z-50 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700",
        isMinimized 
          ? "bottom-6 right-6 w-72" 
          : "bottom-6 right-6 w-[380px] h-[550px] max-h-[80vh]"
      )}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">MitraBot 🤖</h3>
              <p className="text-xs text-white/80">AI Loan Assistant • Always here</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="flex flex-col h-[calc(100%-72px)]"
          >
            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {session?.messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-3",
                      message.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                      message.role === 'user' 
                        ? "bg-slate-100 dark:bg-slate-800" 
                        : "bg-gradient-to-r from-emerald-500 to-teal-500"
                    )}>
                      {message.role === 'user' ? (
                        <User className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                      ) : (
                        <Bot className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div className={cn(
                      "flex flex-col gap-1 max-w-[75%]",
                      message.role === 'user' ? "items-end" : "items-start"
                    )}>
                      {message.isTyping ? (
                        <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3">
                          <div className="flex items-center gap-1">
                            <motion.span
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                              className="h-2 w-2 bg-slate-400 rounded-full"
                            />
                            <motion.span
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                              className="h-2 w-2 bg-slate-400 rounded-full"
                            />
                            <motion.span
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                              className="h-2 w-2 bg-slate-400 rounded-full"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={cn(
                            "rounded-2xl px-4 py-3",
                            message.role === 'user'
                              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          )}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                          {message.intent && (
                            <Badge variant="outline" className="text-xs gap-1 mt-1">
                              {INTENT_ICONS[message.intent]}
                              {message.intent.replace('_', ' ')}
                            </Badge>
                          )}
                          {message.suggestedActions && message.suggestedActions.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {message.suggestedActions.map((action, idx) => (
                                <Button
                                  key={idx}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => handleQuickAction(action)}
                                >
                                  {action.label}
                                  {action.type === 'link' && <ArrowUpRight className="h-3 w-3 ml-1" />}
                                </Button>
                              ))}
                            </div>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {formatTime(message.timestamp)}
                          </span>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>

            {/* Quick Actions */}
            {session && session.messages.length <= 2 && (
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => handleQuickAction(action)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Escalate Button */}
            {session?.status !== 'ESCALATED' && (
              <div className="px-4 pb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  onClick={() => setShowEscalateDialog(true)}
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Need human support?
                </Button>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Escalate Dialog */}
      <AnimatePresence>
        {showEscalateDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full shadow-xl"
            >
              <h4 className="font-semibold text-lg mb-2">Contact Human Support</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Would you like to create a support ticket? Our team will get back to you shortly.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowEscalateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  onClick={handleEscalate}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Ticket'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
