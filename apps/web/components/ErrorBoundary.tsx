'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Test instrumentation: Push events to global error log
// DISABLED for iOS compatibility
// function pushErrorEvent(event: any) {
//   if (typeof window !== 'undefined') {
//     (window as any).__gbErrorEvents = (window as any).__gbErrorEvents || [];
//     (window as any).__gbErrorEvents.push({ ...event, ts: Date.now() });
//   }
// }

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };

    // Test hook: Track boundary mount - DISABLED for iOS compatibility
    // if (typeof window !== 'undefined') {
    //   pushErrorEvent({ type: 'boundary-mount' });
    // }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('[ErrorBoundary] Caught error:', error);

    // Test hook: Track error caught - DISABLED for iOS compatibility
    // pushErrorEvent({
    //   type: 'boundary-caught',
    //   errorName: error.name,
    //   message: error.message,
    // });

    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Error details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Log to external service if needed
    if (typeof window !== 'undefined') {
      // You can add Sentry/LogRocket here
      console.error('[ErrorBoundary] Full error context:', {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    }
  }

  handleReload = () => {
    // Clear potentially corrupted storage before reload
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        console.log('[ErrorBoundary] Clearing storage before reload');
        // Don't clear everything, just plan session which might be corrupted
        const planSessionKey = 'plan_session';
        localStorage.removeItem(planSessionKey);
      }
    } catch (e) {
      console.error('[ErrorBoundary] Failed to clear storage:', e);
    }
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          dir="rtl"
          data-testid="error-boundary"
          className="flex flex-col items-center justify-center min-h-screen bg-[#0B0D0E] text-center px-6"
        >
          <div className="max-w-md">
            <div className="text-6xl mb-6">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-3">
              אירעה שגיאה בטעינה
            </h2>
            <p className="text-white/60 text-sm mb-2">
              {this.state.error?.message || 'שגיאה לא צפויה'}
            </p>
            <p className="text-white/40 text-xs mb-8">
              נסה לטעון מחדש את העמוד. אם השגיאה נמשכת, צור קשר עם התמיכה.
            </p>

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                data-testid="error-retry-btn"
                className="w-full rounded-full bg-[#E2F163] px-6 py-3 text-[#0B0D0E] font-semibold hover:bg-[#d4e350] transition-colors"
              >
                טען מחדש
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="w-full rounded-full bg-white/10 px-6 py-3 text-white font-semibold hover:bg-white/20 transition-colors"
              >
                חזור לדף הבית
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 text-left bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <summary className="text-red-400 cursor-pointer font-mono text-xs">
                  Stack Trace (Dev Only)
                </summary>
                <pre className="text-red-300 text-xs mt-2 overflow-auto max-h-64">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
