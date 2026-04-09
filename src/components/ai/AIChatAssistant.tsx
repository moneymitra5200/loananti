'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  X,
  Minimize2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Quick action buttons data
const QUICK_ACTIONS = [
  { label: 'Check my EMI status', icon: '📅' },
  { label: 'Loan eligibility', icon: '✅' },
  { label: 'Interest rates', icon: '💰' },
  { label: 'Contact support', icon: '📞' }
];

// Message type
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Props for the component
interface AIChatAssistantProps {
  customerId: string;
  customerName?: string;
}

// Generate unique session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Generate unique message ID
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export default function AIChatAssistant({ customerId, customerName }: AIChatAssistantProps) {
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => generateSessionId());

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Load chat history on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await fetch(
          `/api/ai/chat?customerId=${customerId}&sessionId=${sessionId}`
        );
        const data = await response.json();

        if (data.success && data.history && data.history.length > 0) {
          const formattedMessages: Message[] = data.history.flatMap((chat: {
            userMessage: string;
            aiResponse: string;
            createdAt: string;
          }) => [
            {
              id: generateMessageId(),
              role: 'user' as const,
              content: chat.userMessage,
              timestamp: new Date(chat.createdAt)
            },
            {
              id: generateMessageId(),
              role: 'assistant' as const,
              content: chat.aiResponse,
              timestamp: new Date(chat.createdAt)
            }
          ]);
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    };

    if (isOpen && customerId) {
      loadChatHistory();
    }
  }, [isOpen, customerId, sessionId]);

  // Send message to API
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          sessionId,
          message: messageText.trim(),
          customerName
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again or contact our support team for assistance.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  // Handle quick action click
  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  // Welcome message
  const welcomeMessage: Message = {
    id: 'welcome',
    role: 'assistant',
    content: `Hello${customerName ? ` ${customerName}` : ''}! 👋\n\nI'm your AI Loan Assistant. I can help you with:\n• Checking your EMI status\n• Loan eligibility queries\n• Interest rate information\n• Application guidance\n\nHow can I assist you today?`,
    timestamp: new Date()
  };

  // Display messages including welcome
  const displayMessages = messages.length === 0 ? [welcomeMessage] : messages;

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
          >
            <MessageSquare className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? 'auto' : '600px'
            }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)]"
          >
            <Card className="h-full shadow-2xl border-emerald-100 overflow-hidden">
              {/* Header */}
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">AI Loan Assistant</CardTitle>
                      <div className="flex items-center gap-1 text-xs text-white/80">
                        <span className="h-2 w-2 rounded-full bg-green-300 animate-pulse" />
                        Online
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:bg-white/20"
                      onClick={() => setIsMinimized(!isMinimized)}
                    >
                      <Minimize2 className="h-4 w-4" />
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
              </CardHeader>

              {/* Chat Content */}
              <AnimatePresence>
                {!isMinimized && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="flex flex-col"
                  >
                    {/* Messages Area */}
                    <CardContent className="p-0 flex-1">
                      <ScrollArea className="h-[380px]" ref={scrollRef}>
                        <div className="p-4 space-y-4">
                          {displayMessages.map((message) => (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn(
                                'flex gap-2',
                                message.role === 'user' ? 'justify-end' : 'justify-start'
                              )}
                            >
                              {message.role === 'assistant' && (
                                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                                  <Sparkles className="h-4 w-4 text-white" />
                                </div>
                              )}
                              <div
                                className={cn(
                                  'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                                  message.role === 'user'
                                    ? 'bg-emerald-500 text-white rounded-br-md'
                                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                                )}
                              >
                                {message.role === 'assistant' ? (
                                  <div className="prose prose-sm max-w-none">
                                    <ReactMarkdown
                                      components={{
                                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                        li: ({ children }) => <li className="mb-1">{children}</li>,
                                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                                      }}
                                    >
                                      {message.content}
                                    </ReactMarkdown>
                                  </div>
                                ) : (
                                  <p>{message.content}</p>
                                )}
                                <span className="text-xs opacity-60 mt-1 block">
                                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              {message.role === 'user' && (
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                  <User className="h-4 w-4 text-gray-600" />
                                </div>
                              )}
                            </motion.div>
                          ))}

                          {/* Typing indicator */}
                          {isLoading && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex gap-2 justify-start"
                            >
                              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
                                <Sparkles className="h-4 w-4 text-white" />
                              </div>
                              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                                <div className="flex gap-1">
                                  <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>

                    {/* Quick Actions */}
                    {messages.length === 0 && (
                      <div className="px-4 pb-2">
                        <p className="text-xs text-gray-500 mb-2">Quick actions:</p>
                        <div className="flex flex-wrap gap-2">
                          {QUICK_ACTIONS.map((action) => (
                            <Button
                              key={action.label}
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuickAction(action.label)}
                              disabled={isLoading}
                              className="h-8 text-xs bg-white hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300"
                            >
                              <span className="mr-1">{action.icon}</span>
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Input Area */}
                    <div className="border-t p-3 bg-gray-50">
                      <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input
                          ref={inputRef}
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder="Type your message..."
                          disabled={isLoading}
                          className="flex-1 h-10 bg-white"
                        />
                        <Button
                          type="submit"
                          disabled={!inputValue.trim() || isLoading}
                          className="h-10 w-10 bg-emerald-500 hover:bg-emerald-600"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </form>
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        Powered by AI • For support, contact our team
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
