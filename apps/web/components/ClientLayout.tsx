'use client';

import { ErrorBoundary } from './ErrorBoundary';
import { GlobalErrorSetup } from './GlobalErrorSetup';

/**
 * Client-side layout wrapper with error boundary
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalErrorSetup />
      <ErrorBoundary>{children}</ErrorBoundary>
    </>
  );
}
