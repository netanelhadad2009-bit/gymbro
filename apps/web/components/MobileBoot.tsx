"use client";

import { useEffect, useState } from 'react';
import { setupStatusBar } from '@/lib/capacitor/statusbar';
import { Capacitor } from '@capacitor/core';

/**
 * MobileBoot - Initializes mobile-specific features on app boot
 * - Sets up Capacitor StatusBar for native iOS/Android apps
 * - Checks dev server connection in CAP_DEV mode
 */
export function MobileBoot() {
  const [showDevError, setShowDevError] = useState(false);

  useEffect(() => {
    setupStatusBar();

    // Check if we're in dev mode on a native platform
    const isNative = Capacitor.isNativePlatform();
    const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

    if (isNative && isDev) {
      // Verify dev server is reachable
      checkDevServerConnection();
    }
  }, []);

  const checkDevServerConnection = async () => {
    console.log('[MobileBoot] Checking dev server connection...');

    try {
      // Create manual timeout with AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('http://localhost:3000/api/health', {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('[MobileBoot] ✅ Dev server is reachable:', data);
      } else {
        console.warn('[MobileBoot] ⚠️ Dev server responded with status:', response.status);
      }
    } catch (error) {
      console.error('[MobileBoot] ❌ Cannot reach dev server at http://localhost:3000');
      console.error('[MobileBoot] Error:', error instanceof Error ? error.message : String(error));
      console.error('[MobileBoot] Run: pnpm dev');
      setShowDevError(true);
    }
  };

  if (showDevError) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          zIndex: 9999,
          fontFamily: 'monospace',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', textAlign: 'center' }}>
          Cannot reach dev server
        </h2>
        <p style={{ opacity: 0.8, marginBottom: '2rem', textAlign: 'center' }}>
          Unable to connect to <code>http://localhost:3000</code>
        </p>
        <div
          style={{
            backgroundColor: '#1a1a1a',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
          }}
        >
          <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Start dev server:
          </p>
          <code style={{ color: '#4ade80' }}>cd apps/web && pnpm dev</code>
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '1rem',
            cursor: 'pointer',
            marginTop: '1rem',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}
