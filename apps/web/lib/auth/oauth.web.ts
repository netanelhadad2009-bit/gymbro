import { supabase } from '@/lib/supabase';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

/**
 * Sign in with Google using web OAuth redirect flow
 * Opens OAuth in external browser (Safari on iOS) to avoid Google's WebView restrictions
 * @throws Error if OAuth initiation fails
 */
export async function signInWithGoogleWeb() {
  console.log('[OAuth Web] ========================================');
  console.log('[OAuth Web] Starting Google OAuth redirect flow');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const redirectTo = `${origin}/auth/callback`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const isNativePlatform = Capacitor.isNativePlatform();

  console.log('[OAuth Web] Environment:', {
    windowOrigin: origin,
    redirectTo: redirectTo,
    NEXT_PUBLIC_SITE_URL: siteUrl || '(not set)',
    currentURL: typeof window !== 'undefined' ? window.location.href : '(no window)',
    isNativePlatform,
  });
  console.log('[OAuth Web] ========================================');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo,
      skipBrowserRedirect: isNativePlatform, // Don't auto-redirect on native
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account', // Always show account picker
      },
    },
  });

  if (error) {
    console.error('[OAuth Web] ❌ Google OAuth initiation failed');
    console.error('[OAuth Web] Error details:', {
      message: error.message,
      name: error.name,
      status: (error as any).status,
      code: (error as any).code,
    });
    console.error('[OAuth Web] Full error:', JSON.stringify(error, null, 2));
    throw error;
  }

  console.log('[OAuth Web] ✅ Google OAuth URL obtained:', data.url);

  // On native platforms, open OAuth in external browser (Safari)
  // This avoids Google's "disallowed_useragent" error
  if (isNativePlatform && data.url) {
    console.log('[OAuth Web] Opening OAuth in external browser');
    await Browser.open({
      url: data.url,
      presentationStyle: 'popover', // Use popover on iOS
    });
    console.log('[OAuth Web] External browser opened');
  }

  return data;
}

/**
 * Sign in with Apple using web OAuth redirect flow
 * Opens OAuth in external browser (Safari on iOS) to avoid restrictions
 * @throws Error if OAuth initiation fails
 */
export async function signInWithAppleWeb() {
  console.log('[OAuth Web] ========================================');
  console.log('[OAuth Web] Starting Apple OAuth redirect flow');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const redirectTo = `${origin}/auth/callback`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const isNativePlatform = Capacitor.isNativePlatform();

  console.log('[OAuth Web] Environment:', {
    windowOrigin: origin,
    redirectTo: redirectTo,
    NEXT_PUBLIC_SITE_URL: siteUrl || '(not set)',
    currentURL: typeof window !== 'undefined' ? window.location.href : '(no window)',
    isNativePlatform,
  });
  console.log('[OAuth Web] ========================================');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: redirectTo,
      skipBrowserRedirect: isNativePlatform, // Don't auto-redirect on native
    },
  });

  if (error) {
    console.error('[OAuth Web] ❌ Apple OAuth initiation failed');
    console.error('[OAuth Web] Error details:', {
      message: error.message,
      name: error.name,
      status: (error as any).status,
      code: (error as any).code,
    });
    console.error('[OAuth Web] Full error:', JSON.stringify(error, null, 2));
    throw error;
  }

  console.log('[OAuth Web] ✅ Apple OAuth URL obtained:', data.url);

  // On native platforms, open OAuth in external browser (Safari)
  if (isNativePlatform && data.url) {
    console.log('[OAuth Web] Opening OAuth in external browser');
    await Browser.open({
      url: data.url,
      presentationStyle: 'popover', // Use popover on iOS
    });
    console.log('[OAuth Web] External browser opened');
  }

  return data;
}
