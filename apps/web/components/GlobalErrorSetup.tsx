'use client';

import { useEffect } from 'react';
import { setupGlobalErrorHandlers } from '@/lib/globalErrorHandler';

/**
 * Client component that sets up global error handlers on mount
 */
export function GlobalErrorSetup() {
  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

  return null;
}
