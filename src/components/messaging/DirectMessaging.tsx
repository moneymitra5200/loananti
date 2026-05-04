'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Send,
  Loader2,
  MessageCircle,
  User,
  ChevronLeft,
  Plus,
  Check,
  CheckCheck,
} from 'lucide-react';

interface Contact {
  id: string;
  name: string | null;
  role: string;
  profilePicture?: string | null;
  phone?: string | null;
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
  fromUser: {
    id: string;
    name: string | null;
    role: string;
  };
}

interface DirectMessagingProps {
  userId: string;
  userRole: string;
  userName: string;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function getInitials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getRoleColor(role: string) {
  switch (role) {
    case 'CUSTOMER': return 'bg-emerald-500';
    case 'AGENT': return 'bg-blue-500';
    case 'CASHIER': return 'bg-purple-500';
    case 'SUPER_ADMIN': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

export default function DirectMessaging({ userId, userRole, userName }: DirectMessagingProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Load contacts
  const loadContacts = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?userId=${userId}&contacts=true`);
      const data = await res.json();
      if (data.success) setContacts(data.contacts || []);
    } catch (e) {
      console.error('Failed to load contacts:', e);
    } finally {
      setLoadingContacts(false);
    }
  }, [userId]);

  // Load conversation with selected contact
  const loadMessages = useCallback(async (withId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/messages?userId=${userId}&conversation=true&withUserId=${withId}`);
      const data = await res.json();
      if (data.success) setMessages(data.messages || []);
    } catch (e) {
      console.error('Failed to load messages:', e);
    } finally {
      setLoadingMessages(false);
    }
  }, [userId]);

  // Search all customers/users to start new chat
  const searchAllCustomers = useCallback(async (q: string) => {
    if (!q.trim()) { setAllCustomers([]); return; }
    setLoadingCustomers(true);
    try {
      const res = await fetch(`/api/user?search=${encodeURIComponent(q)}&limit=20`);
      const data = await res.json();
      setAllCustomers((data.users || data.data || []).filter((u: any) => u.id !== userId));
    } catch (e) {
      setAllCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }, [userId]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.id);
      // Safety-net poll every 10 min. Instant messages via optimistic UI when sent.
      pollRef.current = setInterval(() => loadMessages(selectedContact.id), 600_000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedContact, loadMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Debounce customer search
  useEffect(() => {
    const t = setTimeout(() => searchAllCustomers(customerSearch), 400);
    return () => clearTimeout(t);
  }, [customerSearch, searchAllCustomers]);

  const handleSend = async () => {
    if (!inputText.trim() || !selectedContact || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistic UI
    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      body: text,
      fromUserId: userId,
      createdAt: new Date().toISOString(),
      isRead: false,
      fromUser: { id: userId, name: userName, role: userRole },
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: userId,
          toUserId: selectedContact.id,
          body: text,
        }),
      });
      // Refresh contacts to update last message
      loadContacts();
    } catch (e) {
      console.error('Failed to send:', e);
    } finally {
      setSending(false);
    }
  };

  const handleSelectNewContact = (user: any) => {
    const contact: Contact = {
      id: user.id,
      name: user.name,
      role: user.role,
      profilePicture: user.profilePicture,
      phone: user.phone,
      lastMessage: '',
      lastMessageAt: null,
      unreadCount: 0,
    };
    setSelectedContact(contact);
    setShowNewChat(false);
    setCustomerSearch('');
    setAllCustomers([]);
    // Add to contacts list if not there
    setContacts(prev => prev.some(c => c.id === user.id) ? prev : [contact, ...prev]);
  };

  const filteredContacts = contacts.filter(c =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex bg-[#f0f2f5] rounded-xl overflow-hidden shadow-lg border border-gray-200" style={{ height: 'clamp(500px, 78vh, 900px)' }}>
      {/* LEFT: Contact List */}
      <div className={`flex flex-col bg-white border-r border-gray-200 ${selectedContact ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] flex-shrink-0`}>
        {/* Header */}
        <div className="bg-[#128c7e] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              {getInitials(userName)}
            </div>
            <div>
              <p className="text-sm font-semibold">{userName}</p>
              <p className="text-xs text-emerald-100 capitalize">{userRole.toLowerCase().replace('_', ' ')}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNewChat(true)}
            className="text-white hover:bg-white/20 h-8 w-8"
            title="New Message"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 bg-white border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#f0f2f5] border-0 rounded-lg text-sm h-9"
            />
          </div>
        </div>

        {/* New Chat Selection */}
        {showNewChat && (
          <div className="border-b border-gray-100 bg-emerald-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowNewChat(false); setCustomerSearch(''); setAllCustomers([]); }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold text-emerald-800">Send to...</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search name or phone..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
                autoFocus
              />
            </div>
            {loadingCustomers && <p className="text-xs text-gray-400 mt-2 text-center">Searching...</p>}
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {allCustomers.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleSelectNewContact(u)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-emerald-100 text-left transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full ${getRoleColor(u.role)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                    {getInitials(u.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400 capitalize">{u.role?.toLowerCase().replace('_', ' ')}</p>
                  </div>
                </button>
              ))}
              {!loadingCustomers && customerSearch && allCustomers.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No users found</p>
              )}
            </div>
          </div>
        )}

        {/* Contact List */}
        <ScrollArea className="flex-1">
          {loadingContacts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <MessageCircle className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-sm text-gray-500">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Click + to start messaging</p>
            </div>
          ) : (
            filteredContacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 text-left ${
                  selectedContact?.id === contact.id ? 'bg-[#f0f2f5]' : ''
                }`}
              >
                <div className={`relative w-11 h-11 rounded-full ${getRoleColor(contact.role)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {getInitials(contact.name)}
                  {contact.unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#25d366] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {contact.unreadCount > 9 ? '9+' : contact.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 truncate">{contact.name || 'Unknown'}</p>
                    {contact.lastMessageAt && (
                      <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">
                        {formatTime(contact.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs text-gray-400 truncate flex-1">{contact.lastMessage || 'Start a conversation...'}</p>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize flex-shrink-0 border-gray-200">
                      {contact.role.toLowerCase().replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* RIGHT: Chat Panel */}
      {selectedContact ? (
        <div className="flex flex-col flex-1 min-w-0">
          {/* Chat Header */}
          <div className="bg-[#128c7e] text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white hover:bg-white/20 h-8 w-8"
              onClick={() => setSelectedContact(null)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className={`w-9 h-9 rounded-full ${getRoleColor(selectedContact.role)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
              {getInitials(selectedContact.name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{selectedContact.name || 'Unknown'}</p>
              <p className="text-xs text-emerald-100 capitalize">{selectedContact.role.toLowerCase().replace('_', ' ')}</p>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23128c7e\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', backgroundColor: '#e5ddd5' }}
          >
            {loadingMessages ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center">
                <div className="bg-white/80 rounded-xl px-4 py-2 text-xs text-gray-500 shadow-sm">
                  No messages yet. Say hello! 👋
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMine = msg.fromUserId === userId;
                const showSender = !isMine && (idx === 0 || messages[idx - 1].fromUserId !== msg.fromUserId);
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
                    <div
                      className={`relative max-w-[72%] rounded-2xl px-3 py-2 shadow-sm text-sm ${
                        isMine
                          ? 'bg-[#dcf8c6] rounded-tr-sm'
                          : 'bg-white rounded-tl-sm'
                      }`}
                    >
                      {showSender && !isMine && (
                        <p className="text-xs font-semibold text-[#128c7e] mb-0.5">
                          {msg.fromUser?.name || 'Unknown'}
                        </p>
                      )}
                      <p className="text-gray-800 whitespace-pre-wrap break-words leading-relaxed pr-10">
                        {msg.body}
                      </p>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        <span className="text-[10px] text-gray-400">
                          {new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </span>
                        {isMine && (
                          msg.isRead
                            ? <CheckCheck className="h-3 w-3 text-[#53bdeb]" />
                            : <Check className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Area */}
          <div className="bg-[#f0f2f5] border-t border-gray-200 px-3 py-2 flex items-end gap-2 flex-shrink-0">
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 bg-white rounded-2xl border-0 outline-none px-4 py-2.5 text-sm resize-none max-h-32 shadow-sm text-gray-800 placeholder-gray-400"
              style={{ lineHeight: '1.4' }}
            />
            <Button
              onClick={handleSend}
              disabled={!inputText.trim() || sending}
              size="icon"
              className="h-10 w-10 rounded-full bg-[#128c7e] hover:bg-[#0d7a6b] flex-shrink-0 shadow-sm"
            >
              {sending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </Button>
          </div>
        </div>
      ) : (
        /* Empty state — no chat selected */
        <div className="flex-1 flex flex-col items-center justify-center bg-[#f8f9fa] text-center px-8">
          <div className="w-24 h-24 rounded-full bg-[#25d366]/10 flex items-center justify-center mb-4">
            <MessageCircle className="h-12 w-12 text-[#128c7e]" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">MoneyMitra Messages</h3>
          <p className="text-sm text-gray-400 max-w-xs">
            Select a conversation or click <strong>+</strong> to send a message to any customer, agent, or cashier.
          </p>
        </div>
      )}
    </div>
  );
}
