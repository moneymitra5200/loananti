'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageCircle, ChevronLeft, Send, Check, CheckCheck } from 'lucide-react';

interface Contact {
  id: string;
  name: string | null;
  role: string;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface ChatMessage {
  id: string;
  body: string;
  fromUserId: string;
  createdAt: string;
  isRead: boolean;
  fromUser: { id: string; name: string | null; role: string };
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function getInitials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function CustomerMessages() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const loadContacts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/messages?userId=${user.id}&contacts=true`);
      const data = await res.json();
      if (data.success) setContacts(data.contacts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContacts(false);
    }
  }, [user]);

  const loadMessages = useCallback(async (withId: string) => {
    if (!user) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/messages?userId=${user.id}&conversation=true&withUserId=${withId}`);
      const data = await res.json();
      if (data.success) setMessages(data.messages || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  }, [user]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  useEffect(() => {
    if (selected) {
      loadMessages(selected.id);
      pollRef.current = setInterval(() => loadMessages(selected.id), 30000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selected, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !selected || sending || !user) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      body: text,
      fromUserId: user.id,
      createdAt: new Date().toISOString(),
      isRead: false,
      fromUser: { id: user.id, name: user.name || null, role: user.role },
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: user.id, toUserId: selected.id, body: text }),
      });
      loadContacts();
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-full bg-[#e5ddd5] rounded-xl overflow-hidden" style={{ minHeight: 480 }}>
      {/* Contacts */}
      <div className={`flex flex-col bg-white border-r border-gray-200 ${selected ? 'hidden md:flex' : 'flex'} w-full md:w-[300px] flex-shrink-0`}>
        <div className="bg-[#128c7e] text-white px-4 py-3">
          <p className="font-semibold text-sm">Messages from Support</p>
        </div>
        <ScrollArea className="flex-1">
          {loadingContacts ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-emerald-500" /></div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageCircle className="h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No messages yet</p>
              <p className="text-xs text-gray-300 mt-1">Support staff will message you here</p>
            </div>
          ) : (
            contacts.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 text-left transition-colors ${selected?.id === c.id ? 'bg-[#f0f2f5]' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-[#128c7e] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {getInitials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold truncate">{c.name || 'Support'}</p>
                    {c.lastMessageAt && <span className="text-[10px] text-gray-400">{formatTime(c.lastMessageAt)}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 truncate">{c.lastMessage || 'Tap to open'}</p>
                    {c.unreadCount > 0 && (
                      <span className="min-w-[18px] h-[18px] bg-[#25d366] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ml-1">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Chat */}
      {selected ? (
        <div className="flex flex-col flex-1 min-w-0">
          <div className="bg-[#128c7e] text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-white/20 h-8 w-8" onClick={() => setSelected(null)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
              {getInitials(selected.name)}
            </div>
            <div>
              <p className="text-sm font-semibold">{selected.name}</p>
              <p className="text-xs text-emerald-100 capitalize">{selected.role.toLowerCase().replace('_', ' ')}</p>
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
            style={{ backgroundColor: '#e5ddd5' }}
          >
            {loadingMessages ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center">
                <div className="bg-white/80 rounded-xl px-4 py-2 text-xs text-gray-500 shadow-sm">No messages yet</div>
              </div>
            ) : messages.map((msg) => {
              const isMine = msg.fromUserId === user.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
                  <div className={`relative max-w-[72%] rounded-2xl px-3 py-2 shadow-sm text-sm ${isMine ? 'bg-[#dcf8c6] rounded-tr-sm' : 'bg-white rounded-tl-sm'}`}>
                    {!isMine && <p className="text-xs font-semibold text-[#128c7e] mb-0.5">{msg.fromUser?.name || 'Support'}</p>}
                    <p className="text-gray-800 whitespace-pre-wrap break-words pr-10">{msg.body}</p>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <span className="text-[10px] text-gray-400">
                        {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                      {isMine && (msg.isRead ? <CheckCheck className="h-3 w-3 text-[#53bdeb]" /> : <Check className="h-3 w-3 text-gray-400" />)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="bg-[#f0f2f5] border-t border-gray-200 px-3 py-2 flex items-end gap-2 flex-shrink-0">
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 bg-white rounded-2xl border-0 outline-none px-4 py-2.5 text-sm resize-none max-h-28 shadow-sm"
              style={{ lineHeight: '1.4' }}
            />
            <Button
              onClick={handleSend}
              disabled={!inputText.trim() || sending}
              size="icon"
              className="h-10 w-10 rounded-full bg-[#128c7e] hover:bg-[#0d7a6b] flex-shrink-0"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#f8f9fa]">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Select a conversation to open</p>
          </div>
        </div>
      )}
    </div>
  );
}
