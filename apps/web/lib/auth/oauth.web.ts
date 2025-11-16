import { supabase } from '@/lib/supabase';

/**
 * Sign in with Google using web OAuth redirect flow
 * Redirects to Google OAuth page and back to /auth/callback
 * @throws Error if OAuth initiation fails
 */
export async function signInWithGoogleWeb() {
  console.log('[OAuth Web] Starting Google OAuth redirect flow');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('[OAuth Web] Google OAuth initiation failed:', error);
    throw error;
  }

  console.log('[OAuth Web] Google OAuth redirect initiated');
  return data;
}

/**
 * Sign in with Apple using web OAuth redirect flow
 * Redirects to Apple OAuth page and back to /auth/callback
 * @throws Error if OAuth initiation fails
 */
export async function signInWithAppleWeb() {
  console.log('[OAuth Web] Starting Apple OAuth redirect flow');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('[OAuth Web] Apple OAuth initiation failed:', error);
    throw error;
  }

  console.log('[OAuth Web] Apple OAuth redirect initiated');
  return data;
}
