'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Ticket,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  ChevronRight,
  Send,
  X,
  Star,
  ArrowLeft,
  Loader2,
  Inbox,
  AlertTriangle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Types
type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type TicketCategory = 'GENERAL' | 'PAYMENT' | 'LOAN' | 'TECHNICAL' | 'OTHER';
type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

interface TicketMessage {
  id: string;
  message: string;           // DB field is 'message', not 'content'
  senderType: 'CUSTOMER' | 'ADMIN' | 'SYSTEM' | 'CHATBOT';
  senderId: string;
  senderName?: string;
  createdAt: string;
  attachments?: { id: string; name: string; url: string }[];
}

interface TicketData {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  category: TicketCategory;
  priority: TicketPriority;
  customerId: string;
  customer: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  rating?: number;
  feedback?: string;
  messages: TicketMessage[];
}

// Status badge configuration
const getStatusConfig = (status: TicketStatus) => {
  const configs: Record<TicketStatus, { className: string; label: string; icon: typeof AlertCircle }> = {
    OPEN: { className: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Open', icon: AlertCircle },
    IN_PROGRESS: { className: 'bg-amber-100 text-amber-700 border-amber-200', label: 'In Progress', icon: Clock },
    RESOLVED: { className: 'bg-green-100 text-green-700 border-green-200', label: 'Resolved', icon: CheckCircle },
    CLOSED: { className: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Closed', icon: X },
  };
  return configs[status];
};

// Priority badge configuration
const getPriorityConfig = (priority: TicketPriority) => {
  const configs: Record<TicketPriority, { className: string; label: string }> = {
    LOW: { className: 'bg-slate-100 text-slate-600', label: 'Low' },
    NORMAL: { className: 'bg-blue-100 text-blue-600', label: 'Normal' },
    HIGH: { className: 'bg-orange-100 text-orange-600', label: 'High' },
    CRITICAL: { className: 'bg-red-100 text-red-600', label: 'Critical' },
  };
  return configs[priority];
};

// Category label configuration
const getCategoryLabel = (category: TicketCategory) => {
  const labels: Record<TicketCategory, string> = {
    GENERAL: 'General Inquiry',
    PAYMENT: 'Payment Issue',
    LOAN: 'Loan Related',
    TECHNICAL: 'Technical Support',
    OTHER: 'Other',
  };
  return labels[category];
};

// Format date helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format relative time
const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(dateString);
};

export default function TicketSystem() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create ticket dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'GENERAL' as TicketCategory,
    priority: 'NORMAL' as TicketPriority,
    description: '',
  });

  // Close ticket dialog
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeFeedback, setCloseFeedback] = useState({
    rating: 5,
    feedback: '',
  });

  // Message input
  const [newMessage, setNewMessage] = useState('');

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/tickets?userId=${user.id}&userRole=${user.role}`);
      const data = await response.json();
      if (data.success) {
        setTickets(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tickets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch ticket details
  const fetchTicketDetails = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedTicket(data.data);  // API returns { data: ticket }
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ticket details',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Create ticket
  const handleCreateTicket = async () => {
    if (!user) return;

    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTicket,
          customerId: user.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: `Ticket ${data.data?.ticketNumber || ''} created successfully`,
        });
        setShowCreateDialog(false);
        setNewTicket({
          subject: '',
          category: 'GENERAL',
          priority: 'NORMAL',
          description: '',
        });
        fetchTickets();
      } else {
        throw new Error(data.error || 'Failed to create ticket');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create ticket',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    setSendingMessage(true);
    try {
      const response = await fetch(`/api/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user?.id,
          senderType: 'CUSTOMER',   // DB expects CUSTOMER not CUSTOMER
          message: newMessage,       // DB field is 'message' not 'content'
          isInternal: false
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        // Refresh ticket to get updated messages
        await fetchTicketDetails(selectedTicket.id);
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  // Close ticket with feedback
  const handleCloseTicket = async () => {
    if (!selectedTicket) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'PUT',  // [ticketId]/route.ts only has GET + PUT, not PATCH
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CLOSED',
          rating: closeFeedback.rating,
          feedback: closeFeedback.feedback,
          performedBy: user?.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Ticket closed successfully',
        });
        setShowCloseDialog(false);
        setCloseFeedback({ rating: 5, feedback: '' });
        setSelectedTicket(null);
        fetchTickets();
      } else {
        throw new Error(data.error || 'Failed to close ticket');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to close ticket',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
    const matchesSearch = 
      ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Get ticket counts by status
  const ticketCounts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'OPEN').length,
    inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter(t => t.status === 'RESOLVED').length,
    closed: tickets.filter(t => t.status === 'CLOSED').length,
  };

  // Render ticket list item
  const renderTicketItem = (ticket: TicketData) => {
    const statusConfig = getStatusConfig(ticket.status);
    const StatusIcon = statusConfig.icon;
    const priorityConfig = getPriorityConfig(ticket.priority);

    return (
      <motion.div
        key={ticket.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-200 transition-all"
        onClick={() => fetchTicketDetails(ticket.id)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-mono text-gray-500">#{ticket.ticketNumber}</span>
              <Badge className={`${statusConfig.className} border`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
              <Badge className={priorityConfig.className}>{priorityConfig.label}</Badge>
            </div>
            <h4 className="font-semibold text-gray-900 line-clamp-1">{ticket.subject}</h4>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{getCategoryLabel(ticket.category)}</span>
          <span className="text-gray-400">{getRelativeTime(ticket.updatedAt)}</span>
        </div>
        {ticket.messages.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-sm text-gray-500 line-clamp-1">
              {ticket.messages[ticket.messages.length - 1].message}
            </p>
          </div>
        )}
      </motion.div>
    );
  };

  // Render ticket detail view
  const renderTicketDetail = () => {
    if (!selectedTicket) return null;

    const statusConfig = getStatusConfig(selectedTicket.status);
    const StatusIcon = statusConfig.icon;
    const priorityConfig = getPriorityConfig(selectedTicket.priority);

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTicket(null)}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-gray-500">#{selectedTicket.ticketNumber}</span>
                <Badge className={`${statusConfig.className} border`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>
              <h2 className="font-semibold text-lg text-gray-900">{selectedTicket.subject}</h2>
            </div>
          </div>

          {/* Ticket Info */}
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-1 text-gray-500">
              <Ticket className="h-4 w-4" />
              <span>{getCategoryLabel(selectedTicket.category)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge className={priorityConfig.className}>{priorityConfig.label} Priority</Badge>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="h-4 w-4" />
              <span>Created {formatDate(selectedTicket.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {/* Initial Description */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-emerald-700">
                  {selectedTicket.customer.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{selectedTicket.customer.name}</span>
                  <span className="text-xs text-gray-400">{formatDate(selectedTicket.createdAt)}</span>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            {selectedTicket.messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.senderType === 'CUSTOMER' ? '' : 'flex-row-reverse'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.senderType === 'CUSTOMER' 
                    ? 'bg-emerald-100' 
                    : message.senderType === 'SYSTEM'
                    ? 'bg-gray-100'
                    : 'bg-blue-100'
                }`}>
                  <span className={`text-sm font-medium ${
                    message.senderType === 'CUSTOMER'
                      ? 'text-emerald-700'
                      : message.senderType === 'SYSTEM'
                      ? 'text-gray-600'
                      : 'text-blue-700'
                  }`}>
                    {message.senderType === 'SYSTEM' ? 'S' : (message.senderName ?? message.senderId ?? '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className={`flex-1 ${message.senderType !== 'CUSTOMER' ? 'text-right' : ''}`}>
                  <div className={`flex items-center gap-2 mb-1 ${message.senderType !== 'CUSTOMER' ? 'justify-end' : ''}`}>
                    <span className="font-medium text-gray-900">{message.senderName}</span>
                    <span className="text-xs text-gray-400">{formatDate(message.createdAt)}</span>
                  </div>
                  <div className={`rounded-xl p-4 ${
                    message.senderType === 'CUSTOMER'
                      ? 'bg-gray-50'
                      : message.senderType === 'SYSTEM'
                      ? 'bg-amber-50 border border-amber-100'
                      : 'bg-emerald-50 border border-emerald-100'
                  }`}>
                    <p className="text-gray-700 whitespace-pre-wrap">{message.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Reply Input */}
        {selectedTicket.status !== 'CLOSED' && (
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex gap-2">
              <Textarea
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendingMessage}
                className="px-4"
              >
                {sendingMessage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-400">Press Enter to send, Shift+Enter for new line</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCloseDialog(true)}
                className="text-gray-500"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Close Ticket
              </Button>
            </div>
          </div>
        )}

        {/* Closed Ticket Footer */}
        {selectedTicket.status === 'CLOSED' && selectedTicket.rating && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">You rated this support</p>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      star <= selectedTicket.rating!
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              {selectedTicket.feedback && (
                <p className="text-sm text-gray-600 mt-2 italic">"{selectedTicket.feedback}"</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Create Ticket Dialog
  const renderCreateDialog = () => (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Ticket
          </DialogTitle>
          <DialogDescription>
            Submit a support ticket and our team will get back to you shortly.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              placeholder="Brief description of your issue"
              value={newTicket.subject}
              onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={newTicket.category}
                onValueChange={(value: TicketCategory) => 
                  setNewTicket(prev => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General Inquiry</SelectItem>
                  <SelectItem value="PAYMENT">Payment Issue</SelectItem>
                  <SelectItem value="LOAN">Loan Related</SelectItem>
                  <SelectItem value="TECHNICAL">Technical Support</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={newTicket.priority}
                onValueChange={(value: TicketPriority) => 
                  setNewTicket(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Please describe your issue in detail..."
              value={newTicket.description}
              onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
              className="min-h-[120px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateTicket} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Ticket className="h-4 w-4 mr-2" />
                Create Ticket
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Close Ticket Dialog
  const renderCloseDialog = () => (
    <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Close Ticket
          </DialogTitle>
          <DialogDescription>
            Please rate your experience and provide feedback before closing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setCloseFeedback(prev => ({ ...prev, rating: star }))}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= closeFeedback.rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">Feedback (Optional)</Label>
            <Textarea
              id="feedback"
              placeholder="Share your experience with our support..."
              value={closeFeedback.feedback}
              onChange={(e) => setCloseFeedback(prev => ({ ...prev, feedback: e.target.value }))}
              className="min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleCloseTicket} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Closing...
              </>
            ) : (
              'Close Ticket'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Empty state
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Inbox className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No tickets found</h3>
      <p className="text-gray-500 text-center mb-4">
        {statusFilter !== 'ALL'
          ? `You don't have any ${statusFilter.toLowerCase().replace('_', ' ')} tickets`
          : "You haven't created any support tickets yet"}
      </p>
      <Button onClick={() => setShowCreateDialog(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Create Your First Ticket
      </Button>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-gray-500">Loading tickets...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      {selectedTicket ? (
        // Detail View
        renderTicketDetail()
      ) : (
        // List View
        <>
          <CardHeader className="border-b border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Support Tickets
                </CardTitle>
                <CardDescription>Manage your support requests</CardDescription>
              </div>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as TicketStatus | 'ALL')}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Tickets ({ticketCounts.all})</SelectItem>
                  <SelectItem value="OPEN">Open ({ticketCounts.open})</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress ({ticketCounts.inProgress})</SelectItem>
                  <SelectItem value="RESOLVED">Resolved ({ticketCounts.resolved})</SelectItem>
                  <SelectItem value="CLOSED">Closed ({ticketCounts.closed})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { key: 'ALL', label: 'All', count: ticketCounts.all },
                { key: 'OPEN', label: 'Open', count: ticketCounts.open },
                { key: 'IN_PROGRESS', label: 'In Progress', count: ticketCounts.inProgress },
                { key: 'RESOLVED', label: 'Resolved', count: ticketCounts.resolved },
                { key: 'CLOSED', label: 'Closed', count: ticketCounts.closed },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key as TicketStatus | 'ALL')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    statusFilter === tab.key
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-4">
            {filteredTickets.length === 0 ? (
              renderEmptyState()
            ) : (
              <ScrollArea className="h-full max-h-[calc(100vh-400px)]">
                <div className="space-y-3 pr-2">
                  <AnimatePresence mode="popLayout">
                    {filteredTickets.map(renderTicketItem)}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </>
      )}

      {/* Dialogs */}
      {renderCreateDialog()}
      {renderCloseDialog()}
    </Card>
  );
}
