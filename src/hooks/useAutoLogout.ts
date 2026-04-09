'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UseAutoLogoutOptions {
  /** Timeout in minutes before auto-logout (default: 15) */
  timeoutMinutes?: number;
  /** Minutes before timeout to show warning (default: 2) */
  warningMinutes?: number;
  /** Callback when user is logged out due to inactivity */
  onAutoLogout?: () => void;
  /** Callback when warning is shown */
  onWarning?: () => void;
  /** Whether to enable auto-logout (default: true) */
  enabled?: boolean;
}

interface AutoLogoutState {
  /** Timestamp of the last user activity */
  lastActivity: Date | null;
  /** Time remaining in milliseconds before logout */
  timeRemaining: number;
  /** Whether the warning dialog should be shown */
  showWarning: boolean;
  /** Whether the user is currently inactive (warning shown or logged out) */
  isInactive: boolean;
  /** Extend the session by resetting the timer */
  extendSession: () => void;
  /** Force logout immediately */
  logout: () => void;
}

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll'
];

export function useAutoLogout(options: UseAutoLogoutOptions = {}): AutoLogoutState {
  const {
    timeoutMinutes = 15,
    warningMinutes = 2,
    onAutoLogout,
    onWarning,
    enabled = true
  } = options;

  const { signOut, user } = useAuth();
  
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(timeoutMinutes * 60 * 1000);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [isInactive, setIsInactive] = useState<boolean>(false);

  // Use refs to avoid stale closure issues in timers
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<Date | null>(null);
  const isLoggingOutRef = useRef<boolean>(false);

  // Convert minutes to milliseconds
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = warningMinutes * 60 * 1000;

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Handle logout
  const performLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    
    clearTimers();
    setShowWarning(false);
    
    try {
      // Call logout API
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {
        // Ignore API errors, proceed with local logout
      });
      
      // Call AuthContext signOut
      await signOut();
      
      // Call optional callback
      onAutoLogout?.();
    } catch (error) {
      console.error('Auto-logout error:', error);
    } finally {
      isLoggingOutRef.current = false;
    }
  }, [signOut, clearTimers, onAutoLogout]);

  // Extend session (reset timer)
  const extendSession = useCallback(() => {
    const now = new Date();
    setLastActivity(now);
    lastActivityRef.current = now;
    setShowWarning(false);
    setIsInactive(false);
    setTimeRemaining(timeoutMs);
  }, [timeoutMs]);

  // Force logout
  const logout = useCallback(() => {
    performLogout();
  }, [performLogout]);

  // Reset timers
  const resetTimers = useCallback(() => {
    clearTimers();

    if (!enabled || !user) return;

    const now = new Date();
    setLastActivity(now);
    lastActivityRef.current = now;
    setShowWarning(false);
    setIsInactive(false);
    setTimeRemaining(timeoutMs);

    // Set warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setIsInactive(true);
      onWarning?.();
    }, timeoutMs - warningMs);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      performLogout();
    }, timeoutMs);

    // Update time remaining every second
    intervalRef.current = setInterval(() => {
      if (lastActivityRef.current) {
        const elapsed = Date.now() - lastActivityRef.current.getTime();
        const remaining = Math.max(0, timeoutMs - elapsed);
        setTimeRemaining(remaining);
      }
    }, 1000);
  }, [enabled, user, timeoutMs, warningMs, clearTimers, performLogout, onWarning]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    if (!enabled || !user) return;

    const now = Date.now();
    const lastTime = lastActivityRef.current?.getTime() || 0;
    
    // Throttle: Only reset if more than 1 second has passed
    if (now - lastTime > 1000) {
      resetTimers();
    }
  }, [enabled, user, resetTimers]);

  // Setup event listeners
  useEffect(() => {
    if (!enabled || !user) {
      clearTimers();
      return;
    }

    // Initialize on mount
    resetTimers();

    // Add event listeners with passive option for better performance
    const eventOptions = { passive: true };
    
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, eventOptions);
    });

    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [enabled, user, handleActivity, resetTimers, clearTimers]);

  // Handle visibility change (tab switch)
  useEffect(() => {
    if (!enabled || !user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User came back to the tab - check if we should show warning or logout
        if (lastActivityRef.current) {
          const elapsed = Date.now() - lastActivityRef.current.getTime();
          
          if (elapsed >= timeoutMs) {
            // Session expired while tab was hidden
            performLogout();
          } else if (elapsed >= timeoutMs - warningMs) {
            // Should show warning
            setShowWarning(true);
            setIsInactive(true);
            setTimeRemaining(Math.max(0, timeoutMs - elapsed));
          } else {
            // Still within normal session
            setTimeRemaining(timeoutMs - elapsed);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, user, timeoutMs, warningMs, performLogout]);

  return {
    lastActivity,
    timeRemaining,
    showWarning,
    isInactive,
    extendSession,
    logout
  };
}

export default useAutoLogout;
