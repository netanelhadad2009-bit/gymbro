"use client";

import { useState, useEffect } from 'react';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

// MobileBoot: Shows loading screen on initial app load
// Auth redirects are handled by middleware.ts
export default function MobileBoot({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Show loading screen for minimum 500ms for smooth experience
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen message="טוען את האפליקציה..." />;
  }

  return <>{children}</>;
}