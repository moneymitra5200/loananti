'use client';

import { useAuth } from '@/contexts/AuthContext';
import PrefetchDataProvider from './PrefetchDataProvider';

/**
 * Wrapper component that provides user context to PrefetchDataProvider
 */
export default function DataPrefetchWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <>
      <PrefetchDataProvider />
      {children}
    </>
  );
}
