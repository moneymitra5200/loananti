'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseRealtimeOptions {
  userId?: string;
  role?: string;
  companyId?: string;
  onLoanCreated?: (loan: any) => void;
  onLoanUpdated?: (data: { loan: any; changes: string[] }) => void;
  onLoanStatusChanged?: (data: { loan: any; oldStatus: string; newStatus: string }) => void;
  onPaymentReceived?: (data: { loanId: string; amount: number; emiId?: string }) => void;
  onNotification?: (notification: any) => void;
  onDashboardRefresh?: () => void;
  onCreditUpdated?: (credit: { personalCredit: number; companyCredit: number }) => void;
  /** Polling interval in ms when WebSocket is unavailable. Default: 60000 (60s). Set 0 to disable. */
  pollInterval?: number;
}

let socketInstance: Socket | null = null;
let connectionCount = 0;

// Check if WebSocket is available (not available on Vercel serverless)
const isWebSocketAvailable = (): boolean => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('vercel.app') || hostname.includes('vercel')) {
      return false;
    }
  }
  return true;
};

export function useRealtime(options: UseRealtimeOptions = {}) {
  const {
    userId,
    role,
    companyId,
    onLoanCreated,
    onLoanUpdated,
    onLoanStatusChanged,
    onPaymentReceived,
    onNotification,
    onDashboardRefresh,
    onCreditUpdated,
    pollInterval = 60_000,
  } = options;

  const callbacksRef = useRef({
    onLoanCreated,
    onLoanUpdated,
    onLoanStatusChanged,
    onPaymentReceived,
    onNotification,
    onDashboardRefresh,
    onCreditUpdated,
  });

  // Always keep callbacks ref up-to-date (avoids stale closures)
  useEffect(() => {
    callbacksRef.current = {
      onLoanCreated,
      onLoanUpdated,
      onLoanStatusChanged,
      onPaymentReceived,
      onNotification,
      onDashboardRefresh,
      onCreditUpdated,
    };
  }, [onLoanCreated, onLoanUpdated, onLoanStatusChanged, onPaymentReceived, onNotification, onDashboardRefresh, onCreditUpdated]);

  // ─── WebSocket path ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !role || !isWebSocketAvailable()) return;

    if (!socketInstance) {
      try {
        socketInstance = io('/?XTransformPort=3005', {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
        });
      } catch (error) {
        console.log('[realtime] WebSocket not available:', error);
        return;
      }
    }

    const socket = socketInstance;
    connectionCount++;

    socket.emit('register', { userId, role });
    if (companyId) socket.emit('join-company', companyId);

    const handleLoanCreated       = (loan: any) => callbacksRef.current.onLoanCreated?.(loan);
    const handleLoanUpdated       = (data: any) => callbacksRef.current.onLoanUpdated?.(data);
    const handleLoanStatusChanged = (data: any) => callbacksRef.current.onLoanStatusChanged?.(data);
    const handlePaymentReceived   = (data: any) => callbacksRef.current.onPaymentReceived?.(data);
    const handleNotification      = (n: any)    => callbacksRef.current.onNotification?.(n);
    const handleDashboardRefresh  = ()          => callbacksRef.current.onDashboardRefresh?.();
    const handleCreditUpdated     = (c: any)    => callbacksRef.current.onCreditUpdated?.(c);

    socket.on('loan:created',        handleLoanCreated);
    socket.on('loan:updated',        handleLoanUpdated);
    socket.on('loan:status-changed', handleLoanStatusChanged);
    socket.on('payment:received',    handlePaymentReceived);
    socket.on('notification',        handleNotification);
    socket.on('dashboard:refresh',   handleDashboardRefresh);
    socket.on('credit:updated',      handleCreditUpdated);

    return () => {
      connectionCount--;
      socket.off('loan:created',        handleLoanCreated);
      socket.off('loan:updated',        handleLoanUpdated);
      socket.off('loan:status-changed', handleLoanStatusChanged);
      socket.off('payment:received',    handlePaymentReceived);
      socket.off('notification',        handleNotification);
      socket.off('dashboard:refresh',   handleDashboardRefresh);
      socket.off('credit:updated',      handleCreditUpdated);

      if (connectionCount === 0 && socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
    };
  }, [userId, role, companyId]);

  // ─── Polling fallback ────────────────────────────────────────────────────────
  // Acts as a safety net for missed events and Vercel/PWA deployments.
  useEffect(() => {
    if (!userId || !pollInterval || pollInterval <= 0) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    // Small initial delay so the first data load completes before polling starts
    const startDelay = setTimeout(() => {
      intervalId = setInterval(() => {
        // Only poll when the tab is visible to save battery / bandwidth
        if (document.visibilityState === 'visible') {
          callbacksRef.current.onDashboardRefresh?.();
        }
      }, pollInterval);
    }, 5000); // wait 5s after mount before first poll

    // Cleanup BOTH the timeout and the interval
    return () => {
      clearTimeout(startDelay);
      if (intervalId) clearInterval(intervalId);
    };
  }, [userId, pollInterval]);

  // ─── Visibility change restart ───────────────────────────────────────────────
  // When user returns to a hidden tab, do an immediate refresh
  useEffect(() => {
    if (!userId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh immediately when tab becomes active again
        callbacksRef.current.onDashboardRefresh?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId]);

  const requestRefresh = useCallback(() => {
    if (socketInstance && isWebSocketAvailable()) {
      socketInstance.emit('request-refresh');
    }
    // Also trigger local refresh immediately
    callbacksRef.current.onDashboardRefresh?.();
  }, []);

  return { requestRefresh, isRealtimeAvailable: isWebSocketAvailable() };
}

// Export a singleton getter for the socket (for use in API routes)
export function getRealtimeSocket() {
  return socketInstance;
}
