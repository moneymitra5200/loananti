'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Ticket,
  Plus,
  MessageCircle,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

// Types
interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: string;
  message: string;
  attachments?: string;
  isRead: boolean;
  readAt?: string;
  isAIResponse: boolean;
  createdAt: string;
  sender?: {
    id: string;
    name: string | null;
    role: string;
    profilePicture?: string | null;
  };
}

interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assignedToId?: string;
  resolution?: string;
  resolvedAt?: string;
  resolvedById?: string;
  rating?: number;
  ratingComment?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string | null;
    email: string;
    phone?: string | null;
  };
  assignedTo?: {
    id: string;
    name: string | null;
    role: string;
  } | null;
  resolvedBy?: {
    id: string;
    name: string | null;
  } | null;
  messages?: TicketMessage[];
  _count?: {
    messages: number;
  };
}

interface TicketSystemProps {
  customerId: string;
}

// Status badge component with colors
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { label: 'Open', className: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'IN_PROGRESS':
        return { label: 'In Progress', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
      case 'WAITING_CUSTOMER':
        return { label: 'Waiting for Response', className: 'bg-orange-100 text-orange-700 border-orange-200' };
      case 'RESOLVED':
        return { label: 'Resolved', className: 'bg-green-100 text-green-700 border-green-200' };
      case 'CLOSED':
        return { label: 'Closed', className: 'bg-gray-100 text-gray-700 border-gray-200' };
      default:
        return { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const config = getStatusConfig(status);
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
};

// Priority badge component
const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return { label: 'Low', className: 'bg-slate-100 text-slate-600 border-slate-200' };
      case 'MEDIUM':
        return { label: 'Medium', className: 'bg-blue-100 text-blue-600 border-blue-200' };
      case 'HIGH':
        return { label: 'High', className: 'bg-red-100 text-red-600 border-red-200' };
      case 'URGENT':
        return { label: 'Urgent', className: 'bg-red-500 text-white border-red-600' };
      default:
        return { label: priority, className: 'bg-gray-100 text-gray-600 border-gray-200' };
    }
  };

  const config = getPriorityConfig(priority);
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
};

// Category badge component
const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'GENERAL':
        return 'General';
      case 'PAYMENT_ISSUE':
        return 'Payment Issue';
      case 'LOAN_INQUIRY':
        return 'Loan Inquiry';
      case 'TECHNICAL':
        return 'Technical';
      case 'COMPLAINT':
        return 'Complaint';
      case 'OTHER':
        return 'Other';
      default:
        return category;
    }
  };

  return (
    <Badge variant="secondary" className="bg-gray-100 text-gray-700">
      {getCategoryLabel(category)}
    </Badge>
  );
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
const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
};

const TicketSystem: React.FC<TicketSystemProps> = ({ customerId }) => {
  // State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Form state for creating ticket
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'GENERAL',
    priority: 'MEDIUM',
    description: '',
  });

  // Message reply state
  const [replyMessage, setReplyMessage] = useState('');

  // Fetch tickets list
  const fetchTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/tickets?customerId=${customerId}`);
      const data = await response.json();

      if (data.success) {
        setTickets(data.tickets);
      } else {
        setError(data.error || 'Failed to fetch tickets');
      }
    } catch (err) {
      setError('Failed to load tickets. Please try again.');
      console.error('Error fetching tickets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  // Fetch ticket detail
  const fetchTicketDetail = async (ticketId: string) => {
    try {
      setIsDetailLoading(true);
      const response = await fetch(`/api/tickets?action=detail&ticketId=${ticketId}`);
      const data = await response.json();

      if (data.success) {
        setSelectedTicket(data.ticket);
      } else {
        setError(data.error || 'Failed to fetch ticket details');
      }
    } catch (err) {
      setError('Failed to load ticket details. Please try again.');
      console.error('Error fetching ticket detail:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Create new ticket
  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          customerId,
          subject: newTicket.subject,
          description: newTicket.description,
          category: newTicket.category,
          priority: newTicket.priority,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTickets((prev) => [data.ticket, ...prev]);
        setIsCreateDialogOpen(false);
        setNewTicket({
          subject: '',
          category: 'GENERAL',
          priority: 'MEDIUM',
          description: '',
        });
      } else {
        setError(data.error || 'Failed to create ticket');
      }
    } catch (err) {
      setError('Failed to create ticket. Please try again.');
      console.error('Error creating ticket:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send reply message
  const handleSendMessage = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    try {
      setIsSendingMessage(true);
      setError(null);

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          ticketId: selectedTicket.id,
          message: replyMessage,
          senderId: customerId,
          senderRole: 'CUSTOMER',
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh ticket detail
        await fetchTicketDetail(selectedTicket.id);
        setReplyMessage('');
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (err) {
      setError('Failed to send message. Please try again.');
      console.error('Error sending message:', err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Empty state
  const EmptyState = () => (
    <Card className="border-dashed">
      <CardContent className="p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Ticket className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Tickets Yet</h3>
        <p className="text-sm text-gray-500 mb-4">
          You haven&apos;t created any support tickets yet.
        </p>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Your First Ticket
        </Button>
      </CardContent>
    </Card>
  );

  // Ticket list item
  const TicketListItem: React.FC<{ ticket: SupportTicket }> = ({ ticket }) => (
    <Card
      className="cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all duration-200"
      onClick={() => fetchTicketDetail(ticket.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-mono text-gray-500">{ticket.ticketNumber}</span>
              <StatusBadge status={ticket.status} />
            </div>
            <h3 className="font-medium text-gray-900 truncate">{ticket.subject}</h3>
            <p className="text-sm text-gray-500 line-clamp-1 mt-1">{ticket.description}</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center text-xs text-gray-400">
                <Clock className="w-3 h-3 mr-1" />
                {formatRelativeTime(ticket.createdAt)}
              </div>
              {ticket._count && ticket._count.messages > 1 && (
                <div className="flex items-center text-xs text-gray-400">
                  <MessageCircle className="w-3 h-3 mr-1" />
                  {ticket._count.messages} messages
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <PriorityBadge priority={ticket.priority} />
            <CategoryBadge category={ticket.category} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Ticket detail view
  const TicketDetailView = () => {
    if (isDetailLoading) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!selectedTicket) return null;

    return (
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTicket(null)}
                className="mt-0"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
                  <StatusBadge status={selectedTicket.status} />
                </div>
                <CardDescription>
                  Ticket #{selectedTicket.ticketNumber}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Ticket Info */}
        <div className="border-b p-4 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Category</p>
              <CategoryBadge category={selectedTicket.category} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Priority</p>
              <PriorityBadge priority={selectedTicket.priority} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Created</p>
              <p className="text-sm font-medium">{formatDate(selectedTicket.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Assigned To</p>
              <p className="text-sm font-medium">
                {selectedTicket.assignedTo?.name || 'Unassigned'}
              </p>
            </div>
          </div>
        </div>

        {/* Message Thread */}
        <CardContent className="p-0">
          <div className="border-b p-4 bg-white">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Message Thread
            </h4>
          </div>
          
          <ScrollArea className="h-96">
            <div className="p-4 space-y-4">
              {selectedTicket.messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderRole === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.senderRole === 'CUSTOMER'
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {msg.sender?.name || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {msg.senderRole === 'CUSTOMER' ? '(You)' : '(Support)'}
                      </span>
                      {msg.isAIResponse && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                          AI
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDate(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Reply Input */}
          {selectedTicket.status !== 'CLOSED' && selectedTicket.status !== 'RESOLVED' && (
            <div className="border-t p-4 bg-gray-50">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your reply..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="flex-1 min-h-[80px] resize-none"
                  disabled={isSendingMessage}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!replyMessage.trim() || isSendingMessage}
                  className="self-end"
                >
                  {isSendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Resolution Info */}
          {selectedTicket.status === 'RESOLVED' && selectedTicket.resolution && (
            <div className="border-t p-4 bg-green-50">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-green-800">Ticket Resolved</h5>
                  <p className="text-sm text-green-700 mt-1">{selectedTicket.resolution}</p>
                  {selectedTicket.resolvedAt && (
                    <p className="text-xs text-green-600 mt-2">
                      Resolved on {formatDate(selectedTicket.resolvedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full">
      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700 hover:bg-red-100"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
          <p className="text-sm text-gray-500">
            Manage your support requests and track their status
          </p>
        </div>

        {/* Create Ticket Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Ticket</DialogTitle>
              <DialogDescription>
                Submit a new support request. Our team will respond as soon as possible.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your issue"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newTicket.category}
                  onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="PAYMENT_ISSUE">Payment Issue</SelectItem>
                    <SelectItem value="LOAN_INQUIRY">Loan Inquiry</SelectItem>
                    <SelectItem value="TECHNICAL">Technical</SelectItem>
                    <SelectItem value="COMPLAINT">Complaint</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newTicket.priority}
                  onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Please describe your issue in detail..."
                  className="min-h-[120px] resize-none"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTicket}
                disabled={!newTicket.subject.trim() || !newTicket.description.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Ticket className="w-4 h-4 mr-2" />
                    Create Ticket
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      {selectedTicket ? (
        <TicketDetailView />
      ) : isLoading ? (
        <LoadingSkeleton />
      ) : tickets.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <TicketListItem key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TicketSystem;
