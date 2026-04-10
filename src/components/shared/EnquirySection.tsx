'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare, CheckCircle2, Clock, Search, RefreshCw,
  Mail, Phone, Send, Eye, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '@/utils/helpers';

interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: string;
  seenByCashier: boolean;
  seenBySA: boolean;
  resolvedNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

interface Props {
  role: 'CASHIER' | 'SUPER_ADMIN';
  userId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'bg-orange-100 text-orange-700', icon: Clock },
  SEEN: { label: 'Seen', color: 'bg-blue-100 text-blue-700', icon: Eye },
  RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
};

export default function EnquirySection({ role, userId }: Props) {
  const { toast } = useToast();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('ALL');
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [resolvedNote, setResolvedNote] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/enquiry?take=100');
      const data = await res.json();
      if (data.success) {
        setEnquiries(data.enquiries);
        setPendingCount(data.pendingCount);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load enquiries', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchEnquiries(); }, [fetchEnquiries]);

  const markSeen = async (id: string) => {
    const patch: any = {};
    if (role === 'CASHIER') patch.seenByCashier = true;
    if (role === 'SUPER_ADMIN') patch.seenBySA = true;
    if (enquiries.find(e => e.id === id)?.status === 'PENDING') patch.status = 'SEEN';

    await fetch('/api/enquiry', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch })
    });
    fetchEnquiries();
  };

  const handleResolve = async () => {
    if (!selected) return;
    setResolving(true);
    try {
      await fetch('/api/enquiry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          resolvedNote,
          resolvedBy: userId,
          status: 'RESOLVED'
        })
      });
      toast({ title: '✅ Enquiry Resolved', description: 'The enquiry has been marked as resolved.' });
      setSelected(null);
      setResolvedNote('');
      fetchEnquiries();
    } catch {
      toast({ title: 'Error', variant: 'destructive', description: 'Failed to resolve' });
    } finally {
      setResolving(false);
    }
  };

  const filtered = enquiries.filter(e => {
    const matchFilter = filter === 'ALL' || e.status === filter;
    const matchSearch = !search || 
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.subject.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-indigo-600" />
            Contact Enquiries
            {pendingCount > 0 && (
              <Badge className="bg-red-500 text-white ml-1">{pendingCount} New</Badge>
            )}
          </h2>
          <p className="text-gray-500 mt-1">Messages submitted via the Contact Us page</p>
        </div>
        <Button variant="outline" onClick={fetchEnquiries} size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, subject..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['ALL', 'PENDING', 'SEEN', 'RESOLVED'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                filter === f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-200" />
              <p>No enquiries found</p>
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map((enq, i) => {
                const cfg = STATUS_CONFIG[enq.status] || STATUS_CONFIG.PENDING;
                const StatusIcon = cfg.icon;
                const isNew = role === 'CASHIER' ? !enq.seenByCashier : !enq.seenBySA;

                return (
                  <motion.div
                    key={enq.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => { setSelected(enq); markSeen(enq.id); }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                      selected?.id === enq.id ? 'border-indigo-300 bg-indigo-50' :
                      isNew ? 'border-orange-200 bg-orange-50/40' : 'border-gray-100 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-gray-900 text-sm truncate">{enq.name}</p>
                          {isNew && <Badge className="bg-orange-500 text-white text-xs">New</Badge>}
                          <Badge className={`${cfg.color} text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1 inline" />{cfg.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 font-medium truncate">{enq.subject}</p>
                        <p className="text-xs text-gray-400 truncate">{enq.message.substring(0, 80)}...</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Mail className="h-3 w-3" />{enq.email}
                          </span>
                          {enq.phone && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Phone className="h-3 w-3" />{enq.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(enq.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selected ? (
            <Card className="border border-indigo-100 sticky top-4">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base">Enquiry Detail</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">From</p>
                  <p className="font-semibold text-gray-900">{selected.name}</p>
                  <p className="text-sm text-gray-500">{selected.email}</p>
                  {selected.phone && <p className="text-sm text-gray-500">{selected.phone}</p>}
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Subject</p>
                  <p className="font-semibold text-gray-800">{selected.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Message</p>
                  <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg">{selected.message}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Received: {new Date(selected.createdAt).toLocaleString('en-IN')}</p>
                </div>
                {selected.resolvedNote && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                    <p className="text-xs text-green-600 font-medium mb-1">Resolution Note:</p>
                    <p className="text-sm text-gray-700">{selected.resolvedNote}</p>
                  </div>
                )}
                {selected.status !== 'RESOLVED' && (
                  <div className="space-y-2 border-t pt-3">
                    <p className="text-xs font-medium text-gray-600">Resolve this enquiry:</p>
                    <Textarea
                      placeholder="Add a resolution note (optional)..."
                      value={resolvedNote}
                      onChange={e => setResolvedNote(e.target.value)}
                      rows={3}
                    />
                    <Button
                      onClick={handleResolve}
                      disabled={resolving}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {resolving ? 'Resolving...' : 'Mark as Resolved'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 border border-dashed border-gray-200 rounded-xl">
              <Eye className="h-8 w-8 mb-2 text-gray-300" />
              <p className="text-sm">Select an enquiry to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
