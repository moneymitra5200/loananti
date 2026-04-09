'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Ticket, Search, User, Clock, CheckCircle, AlertTriangle,
  MessageSquare, Send, ChevronLeft, ChevronRight, Eye, Loader2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TicketData {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  _count?: {
    messages: number;
  };
}

interface Message {
  id: string;
  senderId: string;
  senderType: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

interface AdminTicketPanelProps {
  userId?: string;
  userRole?: string;
}

export default function AdminTicketPanel({ userId, userRole }: AdminTicketPanelProps) {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isInternalNote, setIsInternalNote] = useState(false);
  
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0, total: 0 });

  useEffect(() => {
    fetchTickets();
  }, [userId, userRole, page, statusFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      let url = `/api/tickets?userId=${userId}&userRole=${userRole}&page=${page}&limit=15`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTickets(data.data);
          setTotal(data.pagination.total);
          const open = data.data.filter((t: TicketData) => t.status === 'OPEN').length;
          const inProgress = data.data.filter((t: TicketData) => t.status === 'IN_PROGRESS').length;
          const resolved = data.data.filter((t: TicketData) => t.status === 'RESOLVED').length;
          setStats({ open, inProgress, resolved, total: data.pagination.total });
        }
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      setLoadingMessages(true);
      const res = await fetch(`/api/tickets/${ticketId}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setMessages(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const openTicketDetail = (ticket: TicketData) => {
    setSelectedTicket(ticket);
    setDetailOpen(true);
    fetchMessages(ticket.id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    try {
      setSendingMessage(true);
      const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: userId,
          senderType: 'ADMIN',
          message: newMessage,
          isInternal: isInternalNote
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMessages(prev => [...prev, data.data]);
          setNewMessage('');
          toast({ title: 'Message sent' });
        }
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket) return;
    try {
      const res = await fetch('/api/tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          status,
          performedBy: userId,
          performedByRole: userRole
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSelectedTicket(data.data);
          fetchTickets();
          toast({ title: 'Status Updated' });
        }
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-700 border-red-200';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'RESOLVED': return 'bg-green-100 text-green-700 border-green-200';
      case 'CLOSED': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-sm text-red-600">Open</p>
            <p className="text-2xl font-bold text-red-700">{stats.open}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-600">In Progress</p>
            <p className="text-2xl font-bold text-blue-700">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <p className="text-sm text-green-600">Resolved</p>
            <p className="text-2xl font-bold text-green-700">{stats.resolved}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4">
            <p className="text-sm text-purple-600">Total</p>
            <p className="text-2xl font-bold text-purple-700">{stats.total}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Panel */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
          <CardTitle className="text-lg flex items-center gap-2">
            <Ticket className="h-5 w-5" /> Support Tickets
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4">
          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input className="pl-10" placeholder="Search tickets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tickets List */}
          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Ticket className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No tickets found</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredTickets.map((ticket, index) => (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg border bg-white hover:shadow-md cursor-pointer"
                      onClick={() => openTicketDetail(ticket)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                            <span className="text-sm font-medium text-gray-600">{ticket.ticketNumber}</span>
                            <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                          </div>
                          <p className="font-medium text-gray-900">{ticket.subject}</p>
                          <p className="text-sm text-gray-500">{ticket.customer?.name} • {formatDate(ticket.createdAt)}</p>
                        </div>
                        <Button size="sm" variant="outline"><Eye className="h-4 w-4 mr-1" /> View</Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>

          {/* Pagination */}
          {total > 15 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 15)}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" disabled={page >= Math.ceil(total / 15)} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-emerald-600" />
              {selectedTicket?.ticketNumber}
            </SheetTitle>
            <SheetDescription>{selectedTicket?.subject}</SheetDescription>
          </SheetHeader>

          {selectedTicket && (
            <div className="space-y-6 mt-4">
              {/* Quick Actions */}
              <div className="flex gap-2 flex-wrap">
                <Select value={selectedTicket.status} onValueChange={handleUpdateStatus}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Info */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Customer</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-gray-500">Name</p><p className="font-medium">{selectedTicket.customer?.name}</p></div>
                  <div><p className="text-xs text-gray-500">Email</p><p className="font-medium">{selectedTicket.customer?.email}</p></div>
                  <div><p className="text-xs text-gray-500">Phone</p><p className="font-medium">{selectedTicket.customer?.phone}</p></div>
                  <div><p className="text-xs text-gray-500">Assigned</p><p className="font-medium">{selectedTicket.assignedTo?.name || 'Unassigned'}</p></div>
                </CardContent>
              </Card>

              {/* Description */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Description</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                </CardContent>
              </Card>

              {/* Messages */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Conversation</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px] mb-4">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
                    ) : messages.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No messages yet</p>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((msg) => (
                          <div key={msg.id} className={`p-3 rounded-lg ${msg.senderType === 'CUSTOMER' ? 'bg-blue-50' : msg.isInternal ? 'bg-amber-50' : 'bg-gray-50'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline">{msg.senderType === 'CUSTOMER' ? 'Customer' : msg.isInternal ? 'Internal' : 'Admin'}</Badge>
                              <span className="text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
                            </div>
                            <p className="text-gray-700">{msg.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <input type="checkbox" id="internalNote" checked={isInternalNote} onChange={(e) => setIsInternalNote(e.target.checked)} className="h-4 w-4" />
                      <Label htmlFor="internalNote" className="text-sm">Internal note (not visible to customer)</Label>
                    </div>
                    <div className="flex gap-2">
                      <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type your reply..." className="flex-1" rows={2} />
                      <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sendingMessage}>
                        {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
