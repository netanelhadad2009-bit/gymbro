'use client';

import { ErrorBoundary } from './ErrorBoundary';
// import { GlobalErrorSetup } from './GlobalErrorSetup';

/**
 * Client-side layout wrapper with error boundary
 *
 * NOTE: GlobalErrorSetup temporarily disabled to fix black screen issue in iOS
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* <GlobalErrorSetup /> */}
      <ErrorBoundary>{children}</ErrorBoundary>
    </>
  );
}
