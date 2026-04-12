'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Eye, EyeOff, Lock, Mail, Loader2, ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettings } from '@/contexts/SettingsContext';

interface StaffLoginPageProps {
  onBack: () => void;
}

export default function StaffLoginPage({ onBack }: StaffLoginPageProps) {
  const { settings } = useSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          verificationCode: requires2FA ? verificationCode : undefined,
        }),
      });

      const data = await response.json();

      if (data.requiresCode) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      if (response.ok && data.success) {
        sessionStorage.setItem('demoUser', JSON.stringify(data.user));
        localStorage.setItem('lastActivity', Date.now().toString());
        setTimeout(() => window.location.reload(), 80);
        return;
      }

      // Friendly inline error messages
      const status = response.status;
      if (status === 401) {
        setError('Incorrect email or password. Please try again.');
      } else if (status === 403 && data.error?.toLowerCase().includes('lock')) {
        setError('Account locked due to too many failed attempts. Please contact support.');
      } else if (status === 403 && data.error?.toLowerCase().includes('deactivat')) {
        setError('Your account is deactivated. Please contact your administrator.');
      } else if (status === 403) {
        setError('Access denied. This portal is for authorised staff only.');
      } else {
        setError(data.error || 'Login failed. Please try again.');
      }
    } catch {
      setError('Network error – please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-100 rounded-full blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-100 rounded-full blur-3xl opacity-30 pointer-events-none" />

      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-md border border-gray-100 text-gray-600 hover:text-emerald-600 hover:shadow-lg transition-all"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm font-medium">Back</span>
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md relative"
      >
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="p-8 pb-6 text-center border-b border-gray-50">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 overflow-hidden">
              {settings.companyLogo ? (
                <img src={settings.companyLogo} alt={settings.companyName || 'Company'} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-8 w-8 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Staff Portal</h1>
            <p className="text-gray-500 text-sm mt-1">{settings.companyName || 'Money Mitra Financial Advisor'}</p>
          </div>

          {/* Form */}
          <div className="p-8 pt-6 space-y-5">
            <form onSubmit={handleLogin} className="space-y-5" noValidate>
              {!requires2FA ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-gray-700 text-sm font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="staff-email"
                        type="email"
                        autoComplete="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(null); }}
                        className={`pl-12 h-12 bg-gray-50 rounded-xl text-sm transition-colors ${
                          error ? 'border-red-300 bg-red-50 focus:border-red-400' : 'border-gray-200 focus:border-emerald-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="staff-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                        className={`pl-12 pr-12 h-12 bg-gray-50 rounded-xl text-sm transition-colors ${
                          error ? 'border-red-300 bg-red-50 focus:border-red-400' : 'border-gray-200 focus:border-emerald-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label className="text-gray-700 text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    Verification Code
                  </Label>
                  <Input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                    className="h-14 text-center text-2xl tracking-widest bg-gray-50 border-gray-200 rounded-xl font-mono"
                  />
                </div>
              )}

              {/* ── Inline Error Banner ─────────────────────────── */}
              {error && (
                <motion.div
                  key={error}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
                  <span>{error}</span>
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-200/50 transition-all text-sm"
              >
                {loading
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : requires2FA ? 'Verify & Sign In' : 'Sign In'}
              </Button>
            </form>

            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
              <p className="text-xs text-emerald-700 font-semibold mb-2">Demo Credentials:</p>
              <p className="text-xs text-emerald-600">
                <span className="font-semibold">Super Admin:</span> moneymitra@gmail.com / 1122334455
              </p>
            </div>
          </div>

          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">© 2024 {settings.companyName || 'Money Mitra Financial Advisor'}. All rights reserved.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
