'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, Check, CheckCheck, FileText, AlertCircle, Clock, CreditCard, 
  TrendingUp, Wallet, Trash2, ExternalLink, RefreshCw, Loader2,
  Settings, DollarSign, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  userId: string;
  type: string;
  category: string;
  priority: string;
  title: string;
  message: string;
  data: string | null;
  isRead: boolean;
  readAt: string | null;
  actionUrl: string | null;
  actionText: string | null;
  createdAt: string;
}

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  EMI: { icon: Clock, color: 'text-orange-500', bgColor: 'bg-orange-100' },
  LOAN: { icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-100' },
  PAYMENT: { icon: CreditCard, color: 'text-green-500', bgColor: 'bg-green-100' },
  CREDIT: { icon: Wallet, color: 'text-purple-500', bgColor: 'bg-purple-100' },
  SYSTEM: { icon: Info, color: 'text-gray-500', bgColor: 'bg-gray-100' },
};

const PRIORITY_CONFIG: Record<string, { badge: string; color: string }> = {
  LOW: { badge: 'bg-gray-100 text-gray-600', color: '' },
  NORMAL: { badge: '', color: '' },
  HIGH: { badge: 'bg-orange-100 text-orange-600', color: 'border-l-orange-500' },
  CRITICAL: { badge: 'bg-red-100 text-red-600', color: 'border-l-red-500' },
};

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const response = await fetch(`/api/notification?userId=${user.id}&limit=100`);
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchNotifications(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Instant refresh when a foreground push arrives
  useEffect(() => {
    const handler = () => fetchNotifications(true);
    window.addEventListener('new-notification', handler);
    return () => window.removeEventListener('new-notification', handler);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/notification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isRead: true })
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch('/api/notification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true, userId: user.id })
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast({ title: 'Success', description: `Marked ${data.count} notifications as read` });
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const response = await fetch(`/api/notification?id=${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        const wasUnread = notifications.find(n => n.id === id)?.isRead === false;
        if (wasUnread) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    } finally {
      setDeleting(null);
    }
  };

  const handleClearRead = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/notification?action=read&userId=${user.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setNotifications(prev => prev.filter(n => !n.isRead));
        toast({ title: 'Success', description: `Cleared ${data.count} read notifications` });
      }
    } catch (error) {
      console.error('Failed to clear read notifications:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      setOpen(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.SYSTEM;
    const Icon = config.icon;
    return <Icon className={`h-4 w-4 ${config.color}`} />;
  };

  const getCategoryBg = (category: string) => {
    const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.SYSTEM;
    return config.bgColor;
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 7) {
      return past.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.isRead;
    return n.category === activeTab;
  });

  const categoryCounts = {
    all: notifications.length,
    unread: notifications.filter(n => !n.isRead).length,
    EMI: notifications.filter(n => n.category === 'EMI').length,
    LOAN: notifications.filter(n => n.category === 'LOAN').length,
    PAYMENT: notifications.filter(n => n.category === 'PAYMENT').length,
    CREDIT: notifications.filter(n => n.category === 'CREDIT').length,
    SYSTEM: notifications.filter(n => n.category === 'SYSTEM').length,
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-emerald-50">
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge className="h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => fetchNotifications(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs text-emerald-600 hover:text-emerald-700"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <ScrollArea className="w-full">
            <div className="flex p-2 gap-1">
              {[
                { key: 'all', label: 'All', count: categoryCounts.all },
                { key: 'unread', label: 'Unread', count: categoryCounts.unread },
                { key: 'EMI', label: 'EMI', count: categoryCounts.EMI },
                { key: 'LOAN', label: 'Loan', count: categoryCounts.LOAN },
                { key: 'PAYMENT', label: 'Payment', count: categoryCounts.PAYMENT },
                { key: 'CREDIT', label: 'Credit', count: categoryCounts.CREDIT },
              ].map(tab => (
                <Button
                  key={tab.key}
                  variant={activeTab === tab.key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab(tab.key)}
                  className={`h-7 text-xs px-3 ${
                    activeTab === tab.key 
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                      : 'text-gray-600'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-1 ${activeTab === tab.key ? 'text-emerald-100' : 'text-gray-400'}`}>
                      ({tab.count})
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No notifications</p>
            <p className="text-sm text-gray-400 mt-1">
              {activeTab === 'unread' ? 'All caught up!' : 'You have no notifications yet'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <AnimatePresence>
              {filteredNotifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.02 }}
                  className={`relative border-b last:border-b-0 transition-colors ${
                    !notification.isRead ? 'bg-blue-50/50' : 'bg-white'
                  } ${PRIORITY_CONFIG[notification.priority]?.color || ''} border-l-2 hover:bg-gray-50`}
                >
                  <div className="p-4 cursor-pointer" onClick={() => handleNotificationClick(notification)}>
                    <div className="flex gap-3">
                      {/* Category Icon */}
                      <div className={`p-2.5 rounded-xl ${getCategoryBg(notification.category)} flex-shrink-0`}>
                        {getCategoryIcon(notification.category)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm font-medium leading-tight ${
                            !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h4>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                          {notification.message}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            {!notification.isRead && (
                              <Badge className="bg-blue-100 text-blue-600 text-xs">
                                New
                              </Badge>
                            )}
                            {notification.priority === 'HIGH' && (
                              <Badge className="bg-orange-100 text-orange-600 text-xs">
                                Important
                              </Badge>
                            )}
                            {notification.priority === 'CRITICAL' && (
                              <Badge className="bg-red-100 text-red-600 text-xs">
                                Urgent
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {notification.actionUrl && (
                              <ExternalLink className="h-3 w-3 text-gray-400" />
                            )}
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-emerald-600 hover:text-emerald-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Read
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(notification.id);
                              }}
                              disabled={deleting === notification.id}
                            >
                              {deleting === notification.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </ScrollArea>
        )}

        {/* Footer */}
        {notifications.some(n => n.isRead) && (
          <div className="p-3 border-t bg-gray-50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-gray-500 hover:text-red-500"
              onClick={handleClearRead}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear all read notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
