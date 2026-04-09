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
}

let socketInstance: Socket | null = null;
let connectionCount = 0;

// Check if WebSocket is available (not available on Vercel serverless)
const isWebSocketAvailable = (): boolean => {
  // Check if running on Vercel or other serverless platforms
  // Vercel deployments typically have vercel.app in the hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Disable WebSocket on Vercel deployments
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

  // Update callbacks ref when they change
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

  useEffect(() => {
    // Only connect if we have user info AND WebSocket is available
    if (!userId || !role || !isWebSocketAvailable()) return;

    // Create socket connection if not exists
    if (!socketInstance) {
      try {
        socketInstance = io('/?XTransformPort=3005', {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 2000,
        });
      } catch (error) {
        console.log('WebSocket not available:', error);
        return;
      }
    }

    const socket = socketInstance;
    connectionCount++;

    // Register user
    socket.emit('register', { userId, role });

    // Join company room if specified
    if (companyId) {
      socket.emit('join-company', companyId);
    }

    // Set up event listeners
    const handleLoanCreated = (loan: any) => {
      callbacksRef.current.onLoanCreated?.(loan);
    };

    const handleLoanUpdated = (data: { loan: any; changes: string[] }) => {
      callbacksRef.current.onLoanUpdated?.(data);
    };

    const handleLoanStatusChanged = (data: { loan: any; oldStatus: string; newStatus: string }) => {
      callbacksRef.current.onLoanStatusChanged?.(data);
    };

    const handlePaymentReceived = (data: { loanId: string; amount: number; emiId?: string }) => {
      callbacksRef.current.onPaymentReceived?.(data);
    };

    const handleNotification = (notification: any) => {
      callbacksRef.current.onNotification?.(notification);
    };

    const handleDashboardRefresh = () => {
      callbacksRef.current.onDashboardRefresh?.();
    };

    const handleCreditUpdated = (credit: { personalCredit: number; companyCredit: number }) => {
      callbacksRef.current.onCreditUpdated?.(credit);
    };

    socket.on('loan:created', handleLoanCreated);
    socket.on('loan:updated', handleLoanUpdated);
    socket.on('loan:status-changed', handleLoanStatusChanged);
    socket.on('payment:received', handlePaymentReceived);
    socket.on('notification', handleNotification);
    socket.on('dashboard:refresh', handleDashboardRefresh);
    socket.on('credit:updated', handleCreditUpdated);

    return () => {
      connectionCount--;
      socket.off('loan:created', handleLoanCreated);
      socket.off('loan:updated', handleLoanUpdated);
      socket.off('loan:status-changed', handleLoanStatusChanged);
      socket.off('payment:received', handlePaymentReceived);
      socket.off('notification', handleNotification);
      socket.off('dashboard:refresh', handleDashboardRefresh);
      socket.off('credit:updated', handleCreditUpdated);
      
      // Only disconnect if no more components are using the socket
      if (connectionCount === 0 && socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
    };
  }, [userId, role, companyId]);

  // Return function to trigger refresh
  const requestRefresh = useCallback(() => {
    if (socketInstance && isWebSocketAvailable()) {
      socketInstance.emit('request-refresh');
    }
  }, []);

  return { requestRefresh, isRealtimeAvailable: isWebSocketAvailable() };
}

// Export a singleton getter for the socket (for use in API routes)
export function getRealtimeSocket() {
  return socketInstance;
}
