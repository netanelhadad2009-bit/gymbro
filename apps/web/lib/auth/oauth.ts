import { isNative } from '@/lib/platform/isNative';
import { signInWithGoogleNative, signInWithAppleNative } from './oauth.native';
import { signInWithGoogleWeb, signInWithAppleWeb } from './oauth.web';
import { withOAuthErrorHandling } from './oauth-errors';

/**
 * Start Google sign-in
 * Automatically selects native SDK (iOS) or web redirect flow based on platform
 * Falls back to web if native is unavailable
 * @throws OAuthError if sign-in fails
 */
export async function startGoogleSignIn() {
  console.log('[OAuth] Starting Google sign-in');

  return withOAuthErrorHandling('google', async () => {
    if (isNative()) {
      console.log('[OAuth] Using native Google SDK');
      try {
        return await signInWithGoogleNative();
      } catch (error: any) {
        console.log('[OAuth] Native SDK error caught:', error);
        // If native SDK is unimplemented or fails, fall back to web
        if (error?.code === 'UNIMPLEMENTED' || String(error).includes('UNIMPLEMENTED')) {
          console.log('[OAuth] Native SDK not available, falling back to web');
          return signInWithGoogleWeb();
        }
        console.log('[OAuth] Rethrowing error (not UNIMPLEMENTED)');
        throw error;
      }
    }

    console.log('[OAuth] Using web redirect flow');
    return signInWithGoogleWeb();
  });
}

/**
 * Start Apple sign-in
 * Automatically selects native SDK (iOS) or web redirect flow based on platform
 * Falls back to web if native is unavailable
 * @throws OAuthError if sign-in fails
 */
export async function startAppleSignIn() {
  console.log('[OAuth] Starting Apple sign-in');

  return withOAuthErrorHandling('apple', async () => {
    if (isNative()) {
      console.log('[OAuth] Using native Apple SDK');
      try {
        return await signInWithAppleNative();
      } catch (error: any) {
        console.log('[OAuth] Native SDK error caught:', error);
        // If native SDK is unimplemented or fails, fall back to web
        if (error?.code === 'UNIMPLEMENTED' || String(error).includes('UNIMPLEMENTED')) {
          console.log('[OAuth] Native SDK not available, falling back to web');
          return signInWithAppleWeb();
        }
        console.log('[OAuth] Rethrowing error (not UNIMPLEMENTED)');
        throw error;
      }
    }

    console.log('[OAuth] Using web redirect flow');
    return signInWithAppleWeb();
  });
}

// Legacy export for backward compatibility
// This maintains compatibility with existing code that calls startOAuth(provider)
export async function startOAuth(provider: 'google' | 'apple'): Promise<void> {
  console.warn('[OAuth] startOAuth is deprecated, use startGoogleSignIn or startAppleSignIn instead');

  if (provider === 'google') {
    await startGoogleSignIn();
  } else {
    await startAppleSignIn();
  }
}
