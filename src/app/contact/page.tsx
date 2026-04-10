'use client';

import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, Building2, MessageSquare, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const BRANCHES = [
  { city: 'Mumbai', address: '12, Nariman Point, Mumbai – 400021', phone: '+91 98765 43210', hours: 'Mon–Sat: 9am–6pm' },
  { city: 'Delhi', address: '34, Connaught Place, New Delhi – 110001', phone: '+91 98765 43211', hours: 'Mon–Sat: 9am–6pm' },
  { city: 'Bangalore', address: '56, MG Road, Bangalore – 560001', phone: '+91 98765 43212', hours: 'Mon–Sat: 9am–6pm' },
];

export default function ContactUsPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError('Name, email and message are required.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/contact-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSent(true);
        setForm({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to send. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      {/* Hero */}
      <section className="relative py-20 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15)_0%,transparent_70%)]" />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Badge className="mb-4 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-1">
            <MessageSquare className="h-3.5 w-3.5 mr-1.5 inline" /> Get In Touch
          </Badge>
          <h1 className="text-5xl font-black text-white mb-4">Contact Us</h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            We&apos;re here to help. Reach out to our team for loan enquiries, support, or branch information.
          </p>
        </motion.div>
      </section>

      {/* Main Content — Wide Side-by-Side */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid lg:grid-cols-2 gap-10 items-start">

          {/* LEFT — Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-2">Send us a Message</h2>
            <p className="text-slate-400 text-sm mb-6">Fill out the form and our team will respond within 24 hours.</p>

            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Message Sent!</h3>
                <p className="text-slate-400">We&apos;ll get back to you within 24 hours.</p>
                <Button
                  variant="outline"
                  className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                  onClick={() => setSent(false)}
                >
                  Send Another
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block">Full Name *</label>
                    <Input
                      className="bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="John Doe"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block">Email *</label>
                    <Input
                      type="email"
                      className="bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="john@example.com"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block">Phone</label>
                    <Input
                      className="bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 mb-1.5 block">Subject</label>
                    <Input
                      className="bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="Loan enquiry / Support"
                      value={form.subject}
                      onChange={e => setForm({ ...form, subject: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-300 mb-1.5 block">Message *</label>
                  <Textarea
                    className="bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-emerald-500 min-h-[140px]"
                    placeholder="Tell us how we can help you..."
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                  />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-all"
                >
                  {sending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" />Send Message</>
                  )}
                </Button>
              </form>
            )}
          </motion.div>

          {/* RIGHT — Contact Info + Branches */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Quick Contact */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-5">Quick Contact</h2>
              <div className="space-y-4">
                {[
                  { icon: Phone, label: 'Phone', value: '+91 1800-XXX-XXXX', sub: 'Toll-free, Mon–Sat 9am–6pm', color: 'text-emerald-400' },
                  { icon: Mail, label: 'Email', value: 'support@moneymitrafinance.com', sub: 'Response within 24 hours', color: 'text-blue-400' },
                  { icon: Clock, label: 'Office Hours', value: 'Mon – Sat: 9:00 AM – 6:00 PM', sub: 'IST (Indian Standard Time)', color: 'text-amber-400' },
                ].map(({ icon: Icon, label, value, sub, color }) => (
                  <div key={label} className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 ${color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
                      <p className="text-white font-medium">{value}</p>
                      <p className="text-xs text-slate-500">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Branch Offices */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-400" /> Branch Offices
              </h2>
              <div className="space-y-4">
                {BRANCHES.map((b) => (
                  <div key={b.city} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-emerald-400" />
                      <span className="font-semibold text-white">{b.city}</span>
                    </div>
                    <p className="text-sm text-slate-400 mb-1">{b.address}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {b.phone}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {b.hours}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
