'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageCircle, Send, User, Clock, Loader2, Phone, Mail, X
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ChatSession {
  id: string;
  status: string;
  createdAt: string;
  lastMessageAt: string;
  customer: { id: string; name: string; email: string; phone?: string; };
  admin?: { id: string; name: string; role: string; };
  messages: Message[];
}

interface Message {
  id: string;
  senderId: string;
  senderType: string;
  message: string;
  createdAt: string;
}

interface AdminLiveChatPanelProps {
  userId?: string;
  userRole?: string;
}

export default function AdminLiveChatPanel({ userId, userRole }: AdminLiveChatPanelProps) {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/live-chat/sessions');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setSessions(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 120000); // 2 minutes
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const fetchMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/live-chat/${sessionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setMessages(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const selectSession = (session: ChatSession) => {
    setSelectedSession(session);
    fetchMessages(session.id);
    if (session.status === 'WAITING' && !session.admin && userId) {
      assignToSelf(session.id);
    }
  };

  const assignToSelf = async (sessionId: string) => {
    try {
      await fetch('/api/live-chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, adminId: userId, status: 'ACTIVE' })
      });
      fetchSessions();
    } catch (error) {
      console.error('Failed to assign:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedSession) return;
    try {
      setSending(true);
      const res = await fetch(`/api/live-chat/${selectedSession.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: userId, message: newMessage, senderType: 'ADMIN' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMessages(prev => [...prev, data.data]);
          setNewMessage('');
        }
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const closeSession = async () => {
    if (!selectedSession) return;
    try {
      await fetch('/api/live-chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: selectedSession.id, status: 'CLOSED' })
      });
      setSelectedSession(null);
      setMessages([]);
      fetchSessions();
      toast({ title: 'Chat closed' });
    } catch (error) {
      console.error('Failed to close:', error);
    }
  };

  const formatTime = (date: string) => new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const getStatusColor = (status: string) => status === 'WAITING' ? 'bg-amber-100 text-amber-700' : status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-t-lg">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" /> Live Chats
            {sessions.filter(s => s.status === 'WAITING').length > 0 && (
              <Badge className="bg-red-500 text-white ml-2">{sessions.filter(s => s.status === 'WAITING').length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No active chats</p>
              </div>
            ) : (
              <div className="divide-y">
                {sessions.map((session) => (
                  <div key={session.id} onClick={() => selectSession(session)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedSession?.id === session.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{session.customer?.name || 'Unknown'}</span>
                      </div>
                      <Badge className={getStatusColor(session.status)}>{session.status}</Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      <p>{session.customer?.email}</p>
                      <p className="text-xs mt-1"><Clock className="h-3 w-3 inline mr-1" />{formatTime(session.lastMessageAt || session.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        {selectedSession ? (
          <>
            <CardHeader className="pb-2 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-gray-500" />{selectedSession.customer?.name}
                  </CardTitle>
                  <p className="text-sm text-gray-500">{selectedSession.customer?.email}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={getStatusColor(selectedSession.status)}>{selectedSession.status}</Badge>
                  {selectedSession.status !== 'CLOSED' && (
                    <Button size="sm" variant="destructive" onClick={closeSession}><X className="h-4 w-4 mr-1" />Close</Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex flex-col h-[400px]">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.senderType === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg ${msg.senderType === 'ADMIN' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-100 text-gray-900 rounded-bl-none'}`}>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.senderType === 'ADMIN' ? 'text-blue-100' : 'text-gray-400'}`}>{formatTime(msg.createdAt)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
              {selectedSession.status !== 'CLOSED' && (
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex gap-2">
                    <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type your message..." className="flex-1" rows={2}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                    <Button onClick={sendMessage} disabled={!newMessage.trim() || sending} className="self-end">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[500px] text-gray-500">
            <MessageCircle className="h-16 w-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">Select a chat to start</p>
          </div>
        )}
      </Card>
    </div>
  );
}
