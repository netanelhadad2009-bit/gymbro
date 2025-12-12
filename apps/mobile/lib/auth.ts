/**
 * Authentication module for React Native
 * Handles Google, Apple, and Email/Password authentication
 * Uses native Google Sign In when available (development build)
 * Falls back to web OAuth in Expo Go
 */

import { Platform } from 'react-native';
import { supabase } from './supabase';

// Check if we're running in Expo Go (native modules not available)
const isExpoGo = !!(global as any).expo?.modules?.ExpoGo;

// Get iOS Client ID from environment
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/**
 * Check if native Google Sign In is available
 */
async function isNativeGoogleSignInAvailable(): Promise<boolean> {
  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    // Check if the module is loaded AND all critical methods are available
    return (
      !!GoogleSignin &&
      typeof GoogleSignin.configure === 'function' &&
      typeof GoogleSignin.isSignedIn === 'function' &&
      typeof GoogleSignin.signIn === 'function'
    );
  } catch {
    return false;
  }
}

/**
 * Sign in with Google using native SDK (development build)
 */
async function signInWithGoogleNative(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Auth] Using native Google Sign In...');

    const { GoogleSignin, statusCodes } = require('@react-native-google-signin/google-signin');

    // Configure Google Sign In
    GoogleSignin.configure({
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      scopes: ['email', 'profile'],
    });

    // Check if already signed in
    const isSignedIn = await GoogleSignin.isSignedIn();
    if (isSignedIn) {
      await GoogleSignin.signOut();
    }

    // Perform sign in
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();

    console.log('[Auth] Google Sign In successful, exchanging token...');

    // Get the ID token
    const idToken = userInfo.data?.idToken;

    if (!idToken) {
      console.error('[Auth] No ID token received from Google');
      return { success: false, error: 'No token received from Google' };
    }

    // Exchange Google ID token with Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      console.error('[Auth] Supabase token exchange error:', error);
      return { success: false, error: error.message };
    }

    console.log('[Auth] Native Google Sign In complete');
    return { success: true };
  } catch (error: any) {
    const { statusCodes } = require('@react-native-google-signin/google-signin');

    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log('[Auth] Google Sign In cancelled');
      return { success: false, error: 'Sign-in was cancelled' };
    } else if (error.code === statusCodes.IN_PROGRESS) {
      console.log('[Auth] Google Sign In already in progress');
      return { success: false, error: 'Sign-in already in progress' };
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      console.log('[Auth] Play Services not available');
      return { success: false, error: 'Google services not available' };
    }

    console.error('[Auth] Native Google Sign In error:', error);
    return { success: false, error: error.message || 'Error signing in with Google' };
  }
}

/**
 * Sign in with Google using web OAuth (Expo Go fallback)
 */
async function signInWithGoogleWeb(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Auth] Using web OAuth for Google Sign In...');

    // Dynamic imports to avoid crash in Expo Go
    let WebBrowser: typeof import('expo-web-browser') | null = null;
    let makeRedirectUri: typeof import('expo-auth-session').makeRedirectUri | null = null;

    try {
      WebBrowser = require('expo-web-browser');
      const authSession = require('expo-auth-session');
      makeRedirectUri = authSession.makeRedirectUri;
      WebBrowser.maybeCompleteAuthSession();
    } catch (e) {
      console.log('[Auth] Web browser modules not available');
      return { success: false, error: 'Browser modules not available' };
    }

    // Use deep link for the final redirect after OAuth completes
    // Note: This is different from the OAuth redirect_uri which is always the Supabase callback URL
    const redirectTo = 'fitjourney://auth/callback';
    console.log('[Auth] Using redirectTo:', redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      console.error('[Auth] Google OAuth error:', error);
      return { success: false, error: error.message };
    }

    if (data.url) {
      console.log('[Auth] ========== OAUTH DEBUG ==========');
      console.log('[Auth] Full OAuth URL:', data.url);

      // Extract and log all OAuth parameters
      try {
        const url = new URL(data.url);
        console.log('[Auth] OAuth Host:', url.host);
        console.log('[Auth] OAuth Path:', url.pathname);
        console.log('[Auth] OAuth Parameters:');
        console.log('[Auth]   - client_id:', url.searchParams.get('client_id'));
        console.log('[Auth]   - redirect_uri:', url.searchParams.get('redirect_uri'));
        console.log('[Auth]   - response_type:', url.searchParams.get('response_type'));
        console.log('[Auth]   - scope:', url.searchParams.get('scope'));
        console.log('[Auth]   - state:', url.searchParams.get('state')?.substring(0, 50) + '...');
      } catch (e) {
        console.error('[Auth] Failed to parse OAuth URL:', e);
      }

      console.log('[Auth] ====================================');
      console.log('[Auth] Opening in external browser (Safari)...');

      // Open in external browser (Safari)
      const result = await WebBrowser.openBrowserAsync(data.url);

      console.log('[Auth] Browser result:', result.type);

      // The actual authentication will be completed via deep link callback
      // Supabase will handle the token exchange and redirect to fitjourney://auth/callback
      return { success: true };
    }

    return { success: false, error: 'Unexpected error occurred' };
  } catch (error: any) {
    console.error('[Auth] Google Sign In error:', error);
    return { success: false, error: error.message || 'Error signing in with Google' };
  }
}

/**
 * Sign in with Google
 * Uses native SDK in development builds, falls back to web OAuth for preview/Expo Go
 */
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  console.log('[Auth] Starting Google Sign In...');

  // Try native Google Sign In first (available in development builds)
  const nativeAvailable = await isNativeGoogleSignInAvailable();

  if (nativeAvailable && GOOGLE_IOS_CLIENT_ID) {
    console.log('[Auth] Native Google Sign In available, trying native SDK');
    const result = await signInWithGoogleNative();

    // If native fails, fall back to web OAuth
    if (!result.success) {
      console.log('[Auth] Native SDK failed, falling back to web OAuth');
      console.log('[Auth] Error was:', result.error);
      return signInWithGoogleWeb();
    }

    return result;
  }

  // Fall back to web OAuth (preview builds, Expo Go, or when native unavailable)
  console.log('[Auth] Native not available, using web OAuth');
  return signInWithGoogleWeb();
}

/**
 * Sign in with Apple (iOS only)
 * Requires development build - not available in Expo Go
 */
export async function signInWithApple(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Auth] Starting Apple Sign In...');

    // Dynamic imports
    let AppleAuthentication: typeof import('expo-apple-authentication') | null = null;
    let Crypto: typeof import('expo-crypto') | null = null;

    try {
      AppleAuthentication = require('expo-apple-authentication');
      Crypto = require('expo-crypto');
    } catch (e) {
      console.log('[Auth] Apple Authentication not available (Expo Go)');
      return {
        success: false,
        error: 'Apple Sign In not available in Expo Go. Development build required.'
      };
    }

    // Check if Apple Auth is available on device
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      console.log('[Auth] Apple Sign In not available');
      return { success: false, error: 'Apple Sign In not available on this device' };
    }

    // Generate nonce for security
    const rawNonce = generateNonce();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    // Request Apple credentials
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      ],
      nonce: hashedNonce,
    });

    console.log('[Auth] Apple credential received');

    if (!credential.identityToken) {
      return { success: false, error: 'No token received from Apple' };
    }

    // Exchange Apple token with Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });

    if (error) {
      console.error('[Auth] Supabase Apple auth error:', error);
      return { success: false, error: error.message };
    }

    // Update user metadata with name if available
    if (credential.fullName?.givenName || credential.fullName?.familyName) {
      const fullName = [credential.fullName.givenName, credential.fullName.familyName]
        .filter(Boolean)
        .join(' ');

      if (fullName) {
        await supabase.auth.updateUser({
          data: { full_name: fullName },
        });
      }
    }

    console.log('[Auth] Apple Sign In successful');
    return { success: true };
  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      console.log('[Auth] Apple Sign In cancelled');
      return { success: false, error: 'Sign-in was cancelled' };
    }
    console.error('[Auth] Apple Sign In error:', error);
    return { success: false, error: error.message || 'Error signing in with Apple' };
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  options?: {
    emailConsent?: boolean;
    metadata?: Record<string, any>;
  }
): Promise<{ success: boolean; error?: string; needsVerification?: boolean; user?: any }> {
  try {
    console.log('[Auth] Starting email signup...');

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          email_consent: options?.emailConsent ?? false,
          ...options?.metadata,
        },
      },
    });

    if (error) {
      console.error('[Auth] Email signup error:', error);
      return { success: false, error: translateAuthError(error.message) };
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
      console.log('[Auth] Email verification required');
      return { success: true, needsVerification: true };
    }

    console.log('[Auth] Email signup successful');
    return { success: true, user: data.user };
  } catch (error: any) {
    console.error('[Auth] Email signup error:', error);
    return { success: false, error: error.message || 'Error signing up' };
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Auth] Starting email sign in...');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error('[Auth] Email sign in error:', error);
      return { success: false, error: translateAuthError(error.message) };
    }

    console.log('[Auth] Email sign in successful');
    return { success: true };
  } catch (error: any) {
    console.error('[Auth] Email sign in error:', error);
    return { success: false, error: error.message || 'Error signing in' };
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if Apple Sign In is available (iOS 13+ with development build)
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    const AppleAuthentication = require('expo-apple-authentication');
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    // Module not available (Expo Go)
    return false;
  }
}

// Helper functions

/**
 * Generate a random nonce for OAuth security
 */
function generateNonce(length = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }

  return result;
}

/**
 * Translate common auth errors to user-friendly English
 */
function translateAuthError(message: string): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Invalid email or password',
    'Email not confirmed': 'Email not verified. Please check your inbox',
    'User already registered': 'This email is already registered',
    'Password should be at least 6 characters': 'Password must be at least 6 characters',
    'Invalid email': 'Invalid email address',
    'Signup disabled': 'Sign up is currently disabled',
    'Email rate limit exceeded': 'Too many emails sent. Please try again later',
  };

  for (const [key, value] of Object.entries(errorMap)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  return message;
}
