'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';

// Settings interface defining all company settings
export interface AppSettings {
  // Company branding
  companyName: string;
  companyLogo: string;
  companyTagline: string;
  
  // Contact information
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  
  // Currency & Locale
  defaultCurrency: string;
  currencySymbol: string;
  timezone: string;
  
  // Interest rates
  defaultInterestRate: number;
  minInterestRate: number;
  maxInterestRate: number;
  
  // Security settings
  sessionTimeout: number;
  maxLoginAttempts: number;
  twoFactorAuth: boolean;
  ipWhitelist: boolean;
  
  // Notification settings
  emailNotifications: boolean;
  smsNotifications: boolean;
  emiReminders: boolean;
  fraudAlerts: boolean;
}

// Default settings with sensible defaults
const defaultSettings: AppSettings = {
  companyName: 'MM Square',
  companyLogo: '/mm-logo.png',  // Permanent MM logo
  companyTagline: 'Your Trusted Financial Partner',
  companyEmail: 'support@mmsquare.com',
  companyPhone: '+91 1800-123-4567',
  companyAddress: 'Bhavnagar, Gujarat, India',
  defaultCurrency: 'INR',
  currencySymbol: '₹',
  timezone: 'Asia/Kolkata',
  defaultInterestRate: 12,
  minInterestRate: 8,
  maxInterestRate: 24,
  sessionTimeout: 30,
  maxLoginAttempts: 5,
  emailNotifications: true,
  smsNotifications: true,
  emiReminders: true,
  fraudAlerts: true,
  twoFactorAuth: false,
  ipWhitelist: false,
};

// Local storage key for caching
const SETTINGS_STORAGE_KEY = 'app_settings_cache';
const SETTINGS_TIMESTAMP_KEY = 'app_settings_timestamp';

// Cache duration in milliseconds (15 minutes — reduces DB queries)
const CACHE_DURATION = 15 * 60 * 1000;

// Memory cache for current session
let memoryCache: AppSettings | null = null;
let memoryCacheTimestamp: number = 0;

// Context type definition
interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}

// Create context with default values
const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loading: true,
  error: null,
  refreshSettings: async () => {},
  updateSettings: async () => {},
});

// Helper function to get cached settings from localStorage
function getCachedSettings(): { settings: AppSettings | null; isValid: boolean } {
  try {
    if (typeof window === 'undefined') {
      return { settings: null, isValid: false };
    }

    // Check memory cache first (fastest)
    if (memoryCache && Date.now() - memoryCacheTimestamp < CACHE_DURATION) {
      return { settings: memoryCache, isValid: true };
    }

    // Check localStorage cache
    const cachedData = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const cachedTimestamp = localStorage.getItem(SETTINGS_TIMESTAMP_KEY);

    if (cachedData && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10);
      const isValid = Date.now() - timestamp < CACHE_DURATION;

      if (isValid) {
        const parsedSettings = JSON.parse(cachedData) as AppSettings;
        // Update memory cache
        memoryCache = parsedSettings;
        memoryCacheTimestamp = timestamp;
        return { settings: parsedSettings, isValid: true };
      }

      return { settings: JSON.parse(cachedData) as AppSettings, isValid: false };
    }

    return { settings: null, isValid: false };
  } catch {
    return { settings: null, isValid: false };
  }
}

// Helper function to save settings to cache
function saveToCache(settings: AppSettings): void {
  try {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    
    // Save to memory cache
    memoryCache = settings;
    memoryCacheTimestamp = now;

    // Save to localStorage
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    localStorage.setItem(SETTINGS_TIMESTAMP_KEY, now.toString());
  } catch (error) {
    console.error('Failed to save settings to cache:', error);
  }
}

// Helper function to clear cache
function clearCache(): void {
  memoryCache = null;
  memoryCacheTimestamp = 0;
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_TIMESTAMP_KEY);
  }
}

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  // Initialize with default settings to avoid hydration mismatch
  // Cached settings will be loaded in useEffect after mount
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to track if we've already fetched settings
  const hasFetchedRef = useRef(false);
  // Use ref to prevent multiple simultaneous fetches
  const fetchingRef = useRef(false);
  // Use ref to track if hydration is complete
  const hydratedRef = useRef(false);

  // Fetch settings from API
  const fetchSettings = useCallback(async (forceRefresh: boolean = false) => {
    // Prevent duplicate fetches
    if (fetchingRef.current) return;
    
    // Check if we have valid cached data
    if (!forceRefresh) {
      const { settings: cachedSettings, isValid } = getCachedSettings();
      if (isValid && cachedSettings) {
        setSettings({ ...defaultSettings, ...cachedSettings });
        setLoading(false);
        return;
      }
    }

    fetchingRef.current = true;
    setError(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Use cache for GET requests, but bypass if force refresh
        cache: forceRefresh ? 'no-store' : 'default',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.settings) {
        // Merge with defaults to ensure all fields are present
        const mergedSettings: AppSettings = { ...defaultSettings, ...data.settings };
        
        // Update state
        setSettings(mergedSettings);
        
        // Save to cache
        saveToCache(mergedSettings);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      console.error('Error fetching settings:', err);
      setError(errorMessage);
      
      // On error, try to use cached settings even if expired
      const { settings: cachedSettings } = getCachedSettings();
      if (cachedSettings) {
        setSettings({ ...defaultSettings, ...cachedSettings });
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Refresh settings (force refresh from API)
  const refreshSettings = useCallback(async () => {
    clearCache();
    await fetchSettings(true);
  }, [fetchSettings]);

  // Update settings via API
  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: newSettings }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update settings: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Merge new settings with current settings
        const updatedSettings: AppSettings = { ...settings, ...newSettings };
        
        // Update state
        setSettings(updatedSettings);
        
        // Update cache
        saveToCache(updatedSettings);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      console.error('Error updating settings:', err);
      throw new Error(errorMessage);
    }
  }, [settings]);

  // Fetch settings on mount (only once)
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      
      // First, try to load from cache for instant display
      if (!hydratedRef.current) {
        hydratedRef.current = true;
        const { settings: cachedSettings, isValid } = getCachedSettings();
        if (isValid && cachedSettings) {
          setSettings({ ...defaultSettings, ...cachedSettings });
          setLoading(false);
          // Still fetch in background to ensure fresh data
          fetchSettings(true);
          return;
        }
      }
      
      fetchSettings();
    }
  }, [fetchSettings]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<SettingsContextType>(() => ({
    settings,
    loading,
    error,
    refreshSettings,
    updateSettings,
  }), [settings, loading, error, refreshSettings, updateSettings]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

// Custom hook to use settings
export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  
  return context;
}

// Hook for accessing just the company branding (optimized for logo/name displays)
export function useCompanyBranding() {
  const { settings } = useSettings();
  
  return useMemo(() => ({
    companyName: settings.companyName,
    companyLogo: settings.companyLogo,
    companyTagline: settings.companyTagline,
  }), [settings.companyName, settings.companyLogo, settings.companyTagline]);
}

// Hook for accessing just currency settings (optimized for financial displays)
export function useCurrencySettings() {
  const { settings } = useSettings();
  
  return useMemo(() => ({
    currency: settings.defaultCurrency,
    symbol: settings.currencySymbol,
    timezone: settings.timezone,
  }), [settings.defaultCurrency, settings.currencySymbol, settings.timezone]);
}

export default SettingsContext;
