import { isNative } from '@/lib/platform/isNative';
import { signInWithGoogleNative, signInWithAppleNative } from './oauth.native';
import { signInWithGoogleWeb, signInWithAppleWeb } from './oauth.web';

/**
 * Start Google sign-in
 * Automatically selects native SDK (iOS) or web redirect flow based on platform
 * @throws Error if sign-in fails
 */
export async function startGoogleSignIn() {
  console.log('[OAuth] Starting Google sign-in');

  if (isNative()) {
    console.log('[OAuth] Using native Google SDK');
    return signInWithGoogleNative();
  }

  console.log('[OAuth] Using web redirect flow');
  return signInWithGoogleWeb();
}

/**
 * Start Apple sign-in
 * Automatically selects native SDK (iOS) or web redirect flow based on platform
 * @throws Error if sign-in fails
 */
export async function startAppleSignIn() {
  console.log('[OAuth] Starting Apple sign-in');

  if (isNative()) {
    console.log('[OAuth] Using native Apple SDK');
    return signInWithAppleNative();
  }

  console.log('[OAuth] Using web redirect flow');
  return signInWithAppleWeb();
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
