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
  Clock, AlertTriangle, User, Phone, Wallet, Building2, Filter, Eye, Download, CreditCard
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
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
  const [selectedType, setSelectedType] = useState<'online' | 'offline'>('online');
  const [dueFilterTab, setDueFilterTab] = useState<'ALL' | 'PENDING' | 'OVERDUE' | 'PAID'>('OVERDUE');
  const [historicalOverdue, setHistoricalOverdue] = useState<Array<EMIItem & { loanTypeLabel: 'online' | 'offline'; dateStr: string }>>([]);

  useEffect(() => {
    fetchCalendar();
  }, [userId, userRole, currentDate]);

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const [calRes, overdueRes] = await Promise.all([
        fetch(`/api/emi-reminder?action=calendar&userId=${userId}&userRole=${userRole}&year=${year}&month=${month}`),
        fetch(`/api/emi-reminder?action=today-tomorrow&userId=${userId}&userRole=${userRole}`)
      ]);

      if (calRes.ok) {
        const data = await calRes.json();
        if (data.success) {
          setCalendar(data.calendar);
        }
      }

      if (overdueRes.ok) {
        const oData = await overdueRes.json();
        if (oData.success && oData.overdueEmis) {
          const list: Array<EMIItem & { loanTypeLabel: 'online' | 'offline'; dateStr: string }> = [];
          oData.overdueEmis.online?.forEach((e: any) => {
            list.push({
              ...e,
              loanTypeLabel: 'online',
              dateStr: e.dueDate ? new Date(e.dueDate).toISOString().split('T')[0] : ''
            });
          });
          oData.overdueEmis.offline?.forEach((e: any) => {
            list.push({
              ...e,
              loanTypeLabel: 'offline',
              dateStr: e.dueDate ? new Date(e.dueDate).toISOString().split('T')[0] : ''
            });
          });
          setHistoricalOverdue(list);
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

  const downloadDaySummaryPDF = async () => {
    if (!selectedDate) return;
    const allDayEmis = [...selectedEmis.offline, ...selectedEmis.online];
    if (allDayEmis.length === 0) return;

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
      const margin = 14;
      const contentWidth = pageWidth - (margin * 2); // 182 mm
      let y = 14;

      const formatPdfCurrency = (val: number) => `Rs. ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(val)}`;

      // 1. Header Banner Box (Sleek Deep Indigo/Purple)
      doc.setFillColor(88, 28, 135); // #581c87 (Rich Deep Purple)
      doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');

      // White Header Title
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('MONEY MITRA FINANCIAL ADVISOR', margin + 6, y + 11);

      // Subtitle & Date
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(233, 213, 255); // #e9d5ff
      doc.text(`DAILY EMI COLLECTION REPORT  |  DATE: ${formatDate(selectedDate).toUpperCase()}`, margin + 6, y + 20);

      y += 34;

      // 2. Collection Summary Box
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

      // Summary Card Background
      doc.setFillColor(250, 245, 255); // #faf5ff
      doc.setDrawColor(216, 180, 254); // #d8b4fe
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y, contentWidth, 38, 3, 3, 'FD');

      // Top Row: Title & Recovery Badge
      doc.setTextColor(107, 33, 168); // #6b21a8
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('DAY COLLECTION SUMMARY', margin + 6, y + 8);

      // Recovery Rate Pill Badge on the right
      doc.setFillColor(220, 252, 231); // light green
      doc.setDrawColor(134, 239, 172);
      doc.roundedRect(margin + contentWidth - 48, y + 4, 42, 6, 1.5, 1.5, 'FD');
      doc.setTextColor(22, 101, 52); // green text
      doc.setFontSize(8);
      doc.text(`Recovery Rate: ${dayRecoveryPct}%`, margin + contentWidth - 27, y + 8, { align: 'center' });

      // Total Due Big Number
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(formatPdfCurrency(dayTotalAmount), margin + 6, y + 18);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 33, 168);
      doc.text(`(Principal: ${formatPdfCurrency(dayTotalPrincipal)}  +  Interest: ${formatPdfCurrency(dayTotalInterest)})`, margin + 6, y + 24);

      // Bottom Row Stats: Collected & Pending cleanly spaced across 2 columns
      doc.setDrawColor(233, 213, 255);
      doc.line(margin + 6, y + 28, margin + contentWidth - 6, y + 28);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 101, 52); // Green
      doc.text(`Collected: ${formatPdfCurrency(dayTotalCollected)}`, margin + 6, y + 34);

      doc.setTextColor(180, 83, 9); // Amber/Red
      doc.text(`Pending: ${formatPdfCurrency(dayTotalPending)}`, margin + (contentWidth / 2) + 10, y + 34);

      y += 44;

      // 3. Section Header
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text(`SCHEDULED EMIS FOR THE DAY (${allDayEmis.length})`, margin, y);

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(margin, y + 2, margin + contentWidth, y + 2);
      y += 8;

      // 4. EMI Breakdown Cards
      allDayEmis.forEach((emi) => {
        if (y > 255) {
          doc.addPage();
          y = 15;
        }

        const type = emi.offlineLoanId ? 'offline' : 'online';
        const customerName = type === 'offline'
          ? (emi.offlineLoan?.customerName || 'Offline Customer')
          : `${emi.loanApplication?.firstName || ''} ${emi.loanApplication?.lastName || ''}`.trim();
        const loanNo = type === 'offline'
          ? (emi.offlineLoan?.loanNumber || '')
          : (emi.loanApplication?.applicationNo || '');
        const phone = type === 'offline'
          ? emi.offlineLoan?.customerPhone
          : emi.loanApplication?.phone;

        const isPaid = emi.paymentStatus === 'PAID';
        const isOverdue = emi.paymentStatus === 'OVERDUE';

        // Card Colors
        if (isPaid) {
          doc.setFillColor(240, 253, 244); // light green
          doc.setDrawColor(187, 247, 208);
        } else if (isOverdue) {
          doc.setFillColor(254, 242, 242); // light red
          doc.setDrawColor(254, 202, 202);
        } else {
          doc.setFillColor(255, 251, 235); // light amber
          doc.setDrawColor(253, 230, 138);
        }

        const cardHeight = 26;
        doc.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, 'FD');

        // Type Pill Badge
        doc.setFillColor(type === 'offline' ? 226 : 219, type === 'offline' ? 232 : 234, type === 'offline' ? 240 : 254);
        doc.roundedRect(margin + 4, y + 4, 18, 5, 1, 1, 'F');
        doc.setTextColor(type === 'offline' ? 51 : 30, type === 'offline' ? 65 : 64, type === 'offline' ? 85 : 175);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(type.toUpperCase(), margin + 13, y + 7.5, { align: 'center' });

        // Status Tag
        doc.setTextColor(isPaid ? 22 : isOverdue ? 185 : 180, isPaid ? 101 : isOverdue ? 28 : 83, isPaid ? 52 : isOverdue ? 28 : 9);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`STATUS: ${emi.paymentStatus.replace('_', ' ')}   |   EMI #${emi.installmentNumber}`, margin + 26, y + 7.5);

        // Customer Name
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(customerName, margin + 4, y + 15);

        // Sub details line (Loan No & Phone)
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`Loan: ${loanNo}${phone ? `   •   Phone: ${phone}` : ''}`, margin + 4, y + 21);

        // Right side Amount Block
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(formatPdfCurrency(emi.totalAmount), margin + contentWidth - 6, y + 13, { align: 'right' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(4, 120, 87);
        doc.text(`P: ${formatPdfCurrency(emi.principalAmount)}  +  I: ${formatPdfCurrency(emi.interestAmount)}`, margin + contentWidth - 6, y + 19, { align: 'right' });

        y += cardHeight + 4;
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated on ${new Date().toLocaleString('en-IN')}  •  Money Mitra Financial Portal`, margin, 287);

      doc.save(`EMI_Report_${selectedDate}.pdf`);
      toast({ title: 'PDF Downloaded', description: `EMI_Report_${selectedDate}.pdf generated successfully.` });
    } catch (e: any) {
      console.error('PDF generation error:', e);
      toast({ title: 'PDF Error', description: e?.message || 'Failed to generate PDF.', variant: 'destructive' });
    }
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-4">
            <div className="p-3.5 rounded-lg bg-purple-50 border border-purple-100 flex flex-col justify-between text-center">
              <p className="text-sm text-purple-700 font-bold">Total EMIs</p>
              <p className="text-3xl font-extrabold text-purple-900 my-0.5">{totalEmis}</p>
              <p className="text-xs text-purple-600 font-semibold">Scheduled for this month</p>
            </div>
            <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-100 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1.5">
                <div>
                  <p className="text-sm text-blue-800 font-bold">To Collect</p>
                  <span className="text-xs font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                    {pendingPct}% Pending
                  </span>
                </div>
                <p className="text-xl md:text-2xl font-black text-blue-900">{formatCurrency(toCollectTotal)}</p>
              </div>
              <div className="text-xs md:text-sm text-blue-900 pt-2 border-t border-blue-200/80 flex justify-between font-bold">
                <span>P: {formatCurrency(toCollectPrincipal)}</span>
                <span>+ I: {formatCurrency(toCollectInterest)}</span>
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-green-50 border border-green-100 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1.5">
                <div>
                  <p className="text-sm text-green-800 font-bold">Collected</p>
                  <span className="text-xs font-extrabold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300">
                    {collectedPct}% Collected
                  </span>
                </div>
                <p className="text-xl md:text-2xl font-black text-green-900">{formatCurrency(collectedTotal)}</p>
              </div>
              <div className="text-xs md:text-sm text-green-900 pt-2 border-t border-green-200/80 flex justify-between font-bold">
                <span>P: {formatCurrency(paidPrincipal)}</span>
                <span>+ I: {formatCurrency(paidInterest)}</span>
              </div>
            </div>
          </div>

          {/* Monthly Collection Progress Bar */}
          {grandMonthTotal > 0 && (
            <div className="mb-4 p-3.5 bg-gradient-to-r from-slate-50 to-purple-50/70 rounded-lg border border-purple-200 shadow-xs">
              <div className="flex items-center justify-between text-sm font-bold text-slate-800 mb-2 flex-wrap gap-1.5">
                <span className="flex items-center gap-2 text-sm md:text-base">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  Monthly Collection Efficiency: <span className="text-emerald-700 font-extrabold">{collectedPct}%</span>
                </span>
                <span className="text-slate-700 text-xs md:text-sm font-semibold">
                  Collected: <span className="text-emerald-700 font-bold">{formatCurrency(collectedTotal)}</span> ({collectedPct}%) | 
                  Pending: <span className="text-amber-700 font-bold">{formatCurrency(toCollectTotal)}</span> ({pendingPct}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex">
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

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dayDate = new Date(day.date);
                dayDate.setHours(0, 0, 0, 0);

                const isPast = dayDate < today;
                const isOverdueUnpaid = isPast && hasPending;

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
                        : isOverdueUnpaid
                        ? 'bg-red-50 hover:bg-red-100 border-red-400 text-red-700 animate-pulse font-bold shadow-md cursor-pointer'
                        : isPaid
                        ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800 font-bold shadow-2xs cursor-pointer'
                        : isToday(day.date)
                        ? 'bg-purple-100 text-purple-700 font-bold border-purple-300 shadow-2xs cursor-pointer'
                        : hasEmis
                        ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800 cursor-pointer shadow-2xs'
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
                          isOverdueUnpaid ? 'text-red-700 font-extrabold' : isPaid ? 'text-emerald-700' : 'text-amber-700'
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
              <div className="w-3 h-3 rounded bg-emerald-50 border border-emerald-300" />
              <span className="text-xs text-emerald-700 font-medium">All Paid (Green Light)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-100 border border-red-400 animate-pulse" />
              <span className="text-xs text-red-700 font-medium">Overdue Unpaid (Red Blink)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-50 border border-amber-200" />
              <span className="text-xs text-gray-500">Pending Due</span>
            </div>
          </div>

          {/* Due EMIs List Section at Bottom of Calendar */}
          {(() => {
            const todayStr = new Date().toISOString().split('T')[0];
            const allEmisInMonth: Array<EMIItem & { loanTypeLabel: 'online' | 'offline'; dateStr: string }> = [];

            calendar.forEach(day => {
              day.offline.forEach(emi => allEmisInMonth.push({ ...emi, loanTypeLabel: 'offline', dateStr: day.date }));
              day.online.forEach(emi => allEmisInMonth.push({ ...emi, loanTypeLabel: 'online', dateStr: day.date }));
            });

            const pendingList = allEmisInMonth.filter(e => e.paymentStatus !== 'PAID' && e.paymentStatus !== 'WAIVED');
            
            // Combine current month overdue + historical past overdue EMIs across all previous months!
            const overdueMap = new Map<string, EMIItem & { loanTypeLabel: 'online' | 'offline'; dateStr: string }>();
            historicalOverdue.forEach(e => overdueMap.set(`${e.loanTypeLabel}-${e.id}`, e));
            pendingList.filter(e => e.dateStr < todayStr).forEach(e => overdueMap.set(`${e.loanTypeLabel}-${e.id}`, e));

            const overdueList = Array.from(overdueMap.values()).sort((a, b) => (a.dateStr > b.dateStr ? 1 : -1));
            const paidList = allEmisInMonth.filter(e => e.paymentStatus === 'PAID');

            let displayList = allEmisInMonth;
            if (dueFilterTab === 'PENDING') displayList = pendingList;
            if (dueFilterTab === 'OVERDUE') displayList = overdueList;
            if (dueFilterTab === 'PAID') displayList = paidList;

            return (
              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      All Due EMIs ({getMonthName(currentDate)})
                    </h3>
                    <p className="text-xs text-slate-500">Quickly view and collect payments for all EMIs</p>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl flex-wrap">
                    <button
                      type="button"
                      onClick={() => setDueFilterTab('OVERDUE')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        dueFilterTab === 'OVERDUE' ? 'bg-red-600 text-white shadow-2xs animate-pulse' : 'text-red-700 bg-red-50 hover:bg-red-100'
                      }`}
                    >
                      🚨 All Past Overdue ({overdueList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDueFilterTab('PENDING')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        dueFilterTab === 'PENDING' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Pending ({pendingList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDueFilterTab('PAID')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        dueFilterTab === 'PAID' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Paid ({paidList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDueFilterTab('ALL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        dueFilterTab === 'ALL' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Month ({allEmisInMonth.length})
                    </button>
                  </div>
                </div>

                {displayList.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100 text-slate-500 text-sm">
                    No EMIs matching "{dueFilterTab.toLowerCase()}" in this month.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[500px] overflow-y-auto pr-1">
                    {displayList.map((emi) => {
                      const customerName = emi.loanTypeLabel === 'offline'
                        ? (emi.offlineLoan?.customerName || 'N/A')
                        : (`${emi.loanApplication?.firstName || ''} ${emi.loanApplication?.lastName || ''}`.trim() || 'N/A');
                      const loanNo = emi.loanTypeLabel === 'offline'
                        ? (emi.offlineLoan?.loanNumber || 'N/A')
                        : (emi.loanApplication?.applicationNo || 'N/A');

                      return (
                        <div key={`${emi.loanTypeLabel}-${emi.id}`} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-purple-300 transition-all flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                emi.loanTypeLabel === 'offline' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {emi.loanTypeLabel.toUpperCase()} • {loanNo}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                emi.paymentStatus === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : emi.dateStr < todayStr
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {emi.paymentStatus === 'PAID' ? 'PAID' : emi.dateStr < todayStr ? 'OVERDUE' : 'DUE'}
                              </span>
                            </div>

                            <p className="text-sm font-bold text-slate-900 truncate">{customerName}</p>
                            <p className="text-xs text-slate-500 flex items-center justify-between mt-1">
                              <span>Due: <strong className="text-slate-700">{formatDate(emi.dueDate || emi.dateStr)}</strong></span>
                              <span>Inst. #{emi.installmentNumber}</span>
                            </p>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-slate-400 font-medium">EMI Amount</p>
                              <p className="text-base font-extrabold text-slate-900">{formatCurrency(emi.totalAmount)}</p>
                            </div>

                            {emi.paymentStatus !== 'PAID' && (
                              <Button
                                size="sm"
                                onClick={() => handlePayEmi(emi, emi.loanTypeLabel)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-bold px-3 rounded-lg shadow-2xs gap-1 cursor-pointer"
                              >
                                <CreditCard className="h-3.5 w-3.5" /> Pay
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </CardContent>

        {/* Day Detail Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto p-6 bg-white">
            <DialogHeader className="flex flex-row items-center justify-between pr-6">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5.5 w-5.5 text-purple-500" />
                EMIs for {selectedDate && formatDate(selectedDate)}
              </DialogTitle>
              {([...selectedEmis.offline, ...selectedEmis.online].length > 0) && (
                <Button
                  size="sm"
                  onClick={downloadDaySummaryPDF}
                  className="pdf-download-btn bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-2xs text-xs font-semibold px-3 py-1.5"
                >
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
              )}
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
                <div id="emi-day-report-printable" className="space-y-3.5 py-2">
                  {allDayEmis.length > 0 && (
                    <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="text-sm font-semibold text-purple-800">Day Total Due ({allDayEmis.length} EMIs)</p>
                          <p className="text-2xl font-bold text-purple-950">{formatCurrency(dayTotalAmount)}</p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <span className="text-sm font-bold bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded-full border border-emerald-300 inline-flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                            {dayRecoveryPct}% Recovery Rate
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={downloadDaySummaryPDF}
                            className="pdf-download-btn bg-white hover:bg-purple-50 text-purple-700 border-purple-300 gap-1.5 h-8 text-xs font-semibold shadow-2xs"
                          >
                            <Download className="h-3.5 w-3.5" /> PDF
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-purple-200/80 flex items-center justify-between text-xs md:text-sm font-semibold flex-wrap gap-2">
                        <div className="bg-white/95 px-2.5 py-1 rounded border border-purple-300 inline-block text-xs md:text-sm text-purple-950 font-bold">
                          <span>P: {formatCurrency(dayTotalPrincipal)}</span>
                          <span className="mx-1.5">+</span>
                          <span>I: {formatCurrency(dayTotalInterest)}</span>
                          <span className="mx-1.5">=</span>
                          <span className="font-extrabold text-purple-950">Total: {formatCurrency(dayTotalAmount)}</span>
                        </div>
                        <div className="text-gray-700 text-xs md:text-sm font-semibold">
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
