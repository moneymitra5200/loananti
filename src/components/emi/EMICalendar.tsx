'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronLeft, ChevronRight, Calendar, IndianRupee, CheckCircle,
  Clock, AlertTriangle, User, Phone, Wallet, Building2, Filter, Eye
} from 'lucide-react';
import EMIPaymentDialog from './EMIPaymentDialog';

interface EMIItem {
  id: string;
  installmentNumber: number;
  totalAmount: number;
  principalAmount: number;
  interestAmount: number;
  dueDate: string;
  paymentStatus: string;
  paidAmount: number;
  paidPrincipal: number;
  paidInterest: number;
  outstandingPrincipal: number;
  loanApplicationId?: string;
  offlineLoanId?: string;
  loanApplication?: {
    id: string;
    applicationNo: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  offlineLoan?: {
    id: string;
    loanNumber: string;
    customerName: string;
    customerPhone: string;
    loanAmount: number;
    interestRate: number;
    tenure: number;
    company?: { id: string; name: string };
  };
}

interface CalendarDay {
  date: string;
  online: EMIItem[];
  offline: EMIItem[];
  total: number;
  paid: number;
}

interface EMICalendarProps {
  userId: string;
  userRole: string;
  onSelectLoan?: (loanId: string, type: 'online' | 'offline') => void;
}

export default function EMICalendar({ userId, userRole, onSelectLoan }: EMICalendarProps) {
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEmis, setSelectedEmis] = useState<{ online: EMIItem[]; offline: EMIItem[] }>({ online: [], offline: [] });
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedEmi, setSelectedEmi] = useState<EMIItem | null>(null);
  const [selectedType, setSelectedType] = useState<'online' | 'offline'>('offline');

  useEffect(() => {
    fetchCalendar();
  }, [userId, userRole, currentDate]);

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const res = await fetch(`/api/emi-reminder?action=calendar&userId=${userId}&userRole=${userRole}&year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCalendar(data.calendar);
        }
      }
    } catch (error) {
      console.error('Failed to fetch calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];

  const jumpToMonth = (monthIndex: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), monthIndex, 1));
  };

  const jumpToYear = (year: number) => {
    setCurrentDate(new Date(year, currentDate.getMonth(), 1));
  };

  const currentYear = currentDate.getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Generate calendar grid
  const generateCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: { date: Date; day: number; isCurrentMonth: boolean; emis?: CalendarDay }[] = [];
    
    // Add days from previous month
    const startDayOfWeek = firstDay.getDay();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, day: date.getDate(), isCurrentMonth: false });
    }
    
    // Add days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEmis = calendar.find(d => d.date === dateKey);
      days.push({ date, day, isCurrentMonth: true, emis: dayEmis });
    }
    
    // Add days from next month
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, day: date.getDate(), isCurrentMonth: false });
    }
    
    return days;
  };

  const handleDayClick = (day: { date: Date; emis?: CalendarDay }) => {
    if (day.emis && (day.emis.online.length > 0 || day.emis.offline.length > 0)) {
      const dateKey = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
      setSelectedDate(dateKey);
      setSelectedEmis({ online: day.emis.online, offline: day.emis.offline });
      setDialogOpen(true);
    }
  };

  const handlePayEmi = (emi: EMIItem, type: 'online' | 'offline') => {
    setSelectedEmi(emi);
    setSelectedType(type);
    setPaymentDialogOpen(true);
  };

  const handlePaymentComplete = () => {
    fetchCalendar();
    // Refresh the selected day's EMIs
    if (selectedDate) {
      const dayEmis = calendar.find(d => d.date === selectedDate);
      if (dayEmis) {
        setSelectedEmis({ online: dayEmis.online, offline: dayEmis.offline });
      }
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const renderEmiItem = (emi: EMIItem, type: 'online' | 'offline') => {
    const customerName = type === 'offline'
      ? emi.offlineLoan?.customerName
      : `${emi.loanApplication?.firstName || ''} ${emi.loanApplication?.lastName || ''}`.trim();
    const loanNumber = type === 'offline'
      ? emi.offlineLoan?.loanNumber
      : emi.loanApplication?.applicationNo;
    const phone = type === 'offline'
      ? emi.offlineLoan?.customerPhone
      : emi.loanApplication?.phone;
    const canPay = emi.paymentStatus !== 'PAID';
    const loanId = type === 'offline' 
      ? (emi.offlineLoan?.id || emi.offlineLoanId) 
      : (emi.loanApplication?.id || emi.loanApplicationId);

    const handleOpenLoan = () => {
      if (onSelectLoan && loanId) {
        setDialogOpen(false);
        onSelectLoan(loanId, type);
      }
    };

    return (
      <motion.div
        key={emi.id}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-3 rounded-lg border ${
          emi.paymentStatus === 'PAID'
            ? 'bg-green-50 border-green-200'
            : emi.paymentStatus === 'OVERDUE'
            ? 'bg-red-50 border-red-200'
            : emi.paymentStatus === 'PARTIALLY_PAID'
            ? 'bg-amber-50 border-amber-200'
            : emi.paymentStatus === 'INTEREST_ONLY_PAID'
            ? 'bg-blue-50 border-blue-200'
            : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant={type === 'offline' ? 'secondary' : 'outline'} className="text-xs">
                {type === 'offline' ? 'Offline' : 'Online'}
              </Badge>
              <Badge className={
                emi.paymentStatus === 'PAID'
                  ? 'bg-green-100 text-green-700'
                  : emi.paymentStatus === 'OVERDUE'
                  ? 'bg-red-100 text-red-700'
                  : emi.paymentStatus === 'PARTIALLY_PAID'
                  ? 'bg-amber-100 text-amber-700'
                  : emi.paymentStatus === 'INTEREST_ONLY_PAID'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }>
                {emi.paymentStatus.replace('_', ' ')}
              </Badge>
              <span className="text-xs text-gray-500">EMI #{emi.installmentNumber}</span>
            </div>
            <div
              className={`flex items-center gap-2 ${onSelectLoan && loanId ? 'cursor-pointer hover:text-purple-700 transition-colors' : ''}`}
              onClick={handleOpenLoan}
            >
              <User className="h-3 w-3 text-gray-400" />
              <span className="text-sm font-medium">{customerName}</span>
            </div>
            <div
              className={`text-xs text-gray-500 flex items-center gap-2 mt-1 ${onSelectLoan && loanId ? 'cursor-pointer hover:text-purple-700 transition-colors' : ''}`}
              onClick={handleOpenLoan}
            >
              <span className="font-semibold">{loanNumber}</span>
              {phone && <span>• {phone}</span>}
            </div>
            {type === 'offline' && emi.offlineLoan?.company && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                <Building2 className="h-3 w-3" />
                {emi.offlineLoan.company.name}
              </div>
            )}
            <div className="text-xs text-gray-600 font-medium mt-1">
              P: {formatCurrency(emi.principalAmount)} + I: {formatCurrency(emi.interestAmount)} = <span className="font-bold text-emerald-700">Total: {formatCurrency(emi.totalAmount)}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-900">{formatCurrency(emi.totalAmount)}</p>
            {emi.paymentStatus === 'PAID' && (
              <p className="text-xs text-green-600">Paid: {formatCurrency(emi.paidAmount)}</p>
            )}
            {emi.paymentStatus === 'PARTIALLY_PAID' && (
              <p className="text-xs text-amber-600">Remaining: {formatCurrency(emi.totalAmount - emi.paidAmount)}</p>
            )}
            <div className="flex items-center justify-end gap-1 mt-2">
              {canPay && (
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => {
                    if (onSelectLoan && loanId) {
                      setDialogOpen(false);
                      onSelectLoan(loanId, type);
                    } else {
                      handlePayEmi(emi, type);
                    }
                  }}
                >
                  <IndianRupee className="h-3 w-3 mr-1" /> Pay
                </Button>
              )}
              {onSelectLoan && loanId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                  onClick={handleOpenLoan}
                >
                  <Eye className="h-3 w-3 mr-1" /> Detail
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const calendarDays = generateCalendarGrid();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate summary
  const totalEmis = calendar.reduce((sum, d) => sum + d.online.length + d.offline.length, 0);

  let totalPrincipal = 0;
  let totalInterest = 0;
  let paidPrincipal = 0;
  let paidInterest = 0;

  calendar.forEach(d => {
    [...d.online, ...d.offline].forEach(emi => {
      totalPrincipal += (emi.principalAmount || 0);
      totalInterest += (emi.interestAmount || 0);
      if (emi.paymentStatus === 'PAID') {
        paidPrincipal += (emi.paidPrincipal || emi.principalAmount || 0);
        paidInterest += (emi.paidInterest || emi.interestAmount || 0);
      }
    });
  });

  const toCollectPrincipal = Math.max(0, totalPrincipal - paidPrincipal);
  const toCollectInterest = Math.max(0, totalInterest - paidInterest);
  const toCollectTotal = toCollectPrincipal + toCollectInterest;
  const collectedTotal = paidPrincipal + paidInterest;

  const grandMonthTotal = toCollectTotal + collectedTotal;
  const collectedPct = grandMonthTotal > 0 ? ((collectedTotal / grandMonthTotal) * 100).toFixed(1) : '0';
  const pendingPct = grandMonthTotal > 0 ? ((toCollectTotal / grandMonthTotal) * 100).toFixed(1) : '0';

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              EMI Calendar (All Companies)
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={goToToday}>
                Today
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {/* Month Navigation with jump selectors */}
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 flex-1 justify-center flex-wrap">
              {/* Month dropdown */}
              <select
                value={currentDate.getMonth()}
                onChange={e => jumpToMonth(parseInt(e.target.value))}
                className="text-sm font-semibold border rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              {/* Year dropdown */}
              <select
                value={currentDate.getFullYear()}
                onChange={e => jumpToYear(parseInt(e.target.value))}
                className="text-sm font-semibold border rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="p-3 rounded-lg bg-purple-50 border border-purple-100 flex flex-col justify-between text-center">
              <p className="text-xs text-purple-600 font-medium">Total EMIs</p>
              <p className="text-2xl font-bold text-purple-700">{totalEmis}</p>
              <p className="text-[11px] text-purple-500 mt-1">Scheduled for this month</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <p className="text-xs text-blue-600 font-semibold">To Collect</p>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                    {pendingPct}% Pending
                  </span>
                </div>
                <p className="text-lg font-bold text-blue-700">{formatCurrency(toCollectTotal)}</p>
              </div>
              <div className="text-[11px] text-blue-600/90 pt-1.5 border-t border-blue-200/60 flex justify-between font-medium">
                <span>P: {formatCurrency(toCollectPrincipal)}</span>
                <span>+ I: {formatCurrency(toCollectInterest)}</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-green-50 border border-green-100 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <p className="text-xs text-green-600 font-semibold">Collected</p>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                    {collectedPct}% Collected
                  </span>
                </div>
                <p className="text-lg font-bold text-green-700">{formatCurrency(collectedTotal)}</p>
              </div>
              <div className="text-[11px] text-green-600/90 pt-1.5 border-t border-green-200/60 flex justify-between font-medium">
                <span>P: {formatCurrency(paidPrincipal)}</span>
                <span>+ I: {formatCurrency(paidInterest)}</span>
              </div>
            </div>
          </div>

          {/* Monthly Collection Progress Bar */}
          {grandMonthTotal > 0 && (
            <div className="mb-4 p-3 bg-gradient-to-r from-slate-50 to-purple-50/60 rounded-lg border border-purple-100 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-1.5 flex-wrap gap-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Monthly Collection Efficiency: <span className="text-emerald-700 font-bold text-sm">{collectedPct}%</span>
                </span>
                <span className="text-gray-600 text-[11px]">
                  Collected: <span className="text-emerald-700 font-bold">{formatCurrency(collectedTotal)}</span> ({collectedPct}%) | 
                  Pending: <span className="text-amber-700 font-bold">{formatCurrency(toCollectTotal)}</span> ({pendingPct}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden flex">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-500" 
                  style={{ width: `${collectedPct}%` }}
                ></div>
                <div 
                  className="bg-amber-400 h-full transition-all duration-500" 
                  style={{ width: `${pendingPct}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1 bg-gray-50 rounded">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((day, index) => {
                const hasEmis = day.emis && (day.emis.online.length > 0 || day.emis.offline.length > 0);
                const isPaid = day.emis && day.emis.paid >= day.emis.total && hasEmis;
                const hasPending = day.emis && day.emis.paid < day.emis.total && hasEmis;
                const emiCount = hasEmis ? (day.emis!.online.length + day.emis!.offline.length) : 0;

                return (
                  <motion.button
                    key={index}
                    whileHover={hasEmis ? { scale: 1.03 } : {}}
                    whileTap={hasEmis ? { scale: 0.97 } : {}}
                    onClick={() => handleDayClick(day)}
                    disabled={!hasEmis}
                    className={`h-16 rounded-lg flex flex-col items-center justify-between p-1.5 relative transition-all border ${
                      !day.isCurrentMonth
                        ? 'text-gray-300 bg-gray-50/40 border-transparent'
                        : isToday(day.date)
                        ? 'bg-purple-100 text-purple-700 font-bold border-purple-300 shadow-2xs'
                        : hasEmis
                        ? isPaid
                          ? 'bg-green-50 hover:bg-green-100 border-green-200 cursor-pointer shadow-2xs'
                          : 'bg-amber-50 hover:bg-amber-100 border-amber-200 cursor-pointer shadow-2xs'
                        : 'bg-white hover:bg-gray-50 border-gray-100'
                    }`}
                  >
                    <span className="text-sm font-semibold">{day.day}</span>
                    {hasEmis ? (
                      <div className="flex items-center gap-1 bg-white/90 px-1.5 py-0.5 rounded-full border border-gray-200 shadow-2xs">
                        {day.emis!.online.length > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Online Loan EMI" />
                        )}
                        {day.emis!.offline.length > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500" title="Offline Loan EMI" />
                        )}
                        <span className={`text-[10px] font-bold ${
                          isPaid ? 'text-green-700' : 'text-amber-700'
                        }`}>
                          {emiCount} {emiCount === 1 ? 'EMI' : 'EMIs'}
                        </span>
                      </div>
                    ) : (
                      <div className="h-3" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400" />
              <span className="text-xs text-gray-500">Online Loan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-400" />
              <span className="text-xs text-gray-500">Offline Loan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-50 border border-green-200" />
              <span className="text-xs text-gray-500">Paid</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-50 border border-amber-200" />
              <span className="text-xs text-gray-500">Pending</span>
            </div>
          </div>
        </CardContent>

        {/* Day Detail Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-500" />
                EMIs for {selectedDate && formatDate(selectedDate)}
              </DialogTitle>
            </DialogHeader>

            {(() => {
              const allDayEmis = [...selectedEmis.offline, ...selectedEmis.online];
              const dayTotalPrincipal = allDayEmis.reduce((s, e) => s + (e.principalAmount || 0), 0);
              const dayTotalInterest = allDayEmis.reduce((s, e) => s + (e.interestAmount || 0), 0);
              const dayTotalAmount = dayTotalPrincipal + dayTotalInterest;

              const dayTotalCollected = allDayEmis.reduce((s, e) => {
                if (e.paymentStatus === 'PAID') return s + (e.totalAmount || 0);
                if (e.paymentStatus === 'PARTIALLY_PAID') return s + (e.paidAmount || 0);
                return s;
              }, 0);
              const dayTotalPending = Math.max(0, dayTotalAmount - dayTotalCollected);
              const dayRecoveryPct = dayTotalAmount > 0 ? ((dayTotalCollected / dayTotalAmount) * 100).toFixed(1) : '0';

              return (
                <div className="space-y-3 py-2">
                  {allDayEmis.length > 0 && (
                    <div className="p-3.5 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="text-xs font-medium text-purple-700">Day Total Due ({allDayEmis.length} EMIs)</p>
                          <p className="text-xl font-bold text-purple-900">{formatCurrency(dayTotalAmount)}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-300 inline-flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            {dayRecoveryPct}% Recovery Rate
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-purple-200/60 flex items-center justify-between text-xs font-semibold flex-wrap gap-2">
                        <div className="bg-white/90 px-2 py-0.5 rounded border border-purple-300 inline-block text-[11px] text-purple-900">
                          <span>P: {formatCurrency(dayTotalPrincipal)}</span>
                          <span className="mx-1">+</span>
                          <span>I: {formatCurrency(dayTotalInterest)}</span>
                          <span className="mx-1">=</span>
                          <span className="font-bold text-purple-950">Total: {formatCurrency(dayTotalAmount)}</span>
                        </div>
                        <div className="text-gray-600 text-[11px]">
                          Collected: <span className="text-emerald-700 font-bold">{formatCurrency(dayTotalCollected)}</span> ({dayRecoveryPct}%) | 
                          Pending: <span className="text-amber-700 font-bold">{formatCurrency(dayTotalPending)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {allDayEmis.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No EMIs for this date</p>
                    </div>
                  ) : (
                    <div className="max-w-full">
                      <div className="space-y-3">
                        {/* Show offline EMIs first (more common for offline loan system) */}
                        {selectedEmis.offline.map(emi => renderEmiItem(emi, 'offline'))}
                        {selectedEmis.online.map(emi => renderEmiItem(emi, 'online'))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </Card>

      {/* Payment Dialog */}
      <EMIPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        emi={selectedEmi}
        type={selectedType}
        userId={userId}
        userRole={userRole}
        onPaymentComplete={handlePaymentComplete}
      />
    </>
  );
}
