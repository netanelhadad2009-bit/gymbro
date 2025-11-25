/**
 * LoadingContext - Global loading state management
 * Controls when the loading screen is displayed
 */

'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

interface LoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('טוען את המסע שלך...');
  const pathname = usePathname();

  // Show loading on route change
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300); // Minimum loading time for smooth transition

    return () => clearTimeout(timer);
  }, [pathname]);

  const showLoading = (message?: string) => {
    if (message) setLoadingMessage(message);
    setIsLoading(true);
  };

  const hideLoading = () => {
    setIsLoading(false);
  };

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading, showLoading, hideLoading }}>
      <AnimatePresence>
        {isLoading && <LoadingScreen message={loadingMessage} />}
      </AnimatePresence>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
