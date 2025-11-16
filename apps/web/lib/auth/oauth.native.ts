import { isNative } from '@/lib/platform/isNative';
import { supabase } from '@/lib/supabase';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SignInWithApple, SignInWithAppleResponse } from '@capacitor-community/apple-sign-in';

/**
 * Sign in with Google using native SDK
 * Opens native Google sign-in sheet on iOS
 * @throws Error if not on native platform or if sign-in fails
 */
export async function signInWithGoogleNative() {
  console.log('[OAuth Native] Starting Google sign-in');

  if (!isNative()) {
    throw new Error('signInWithGoogleNative called on non-native platform');
  }

  try {
    // CRITICAL: Initialize GoogleAuth plugin before use
    // This prevents the Plugin.swift:74 crash (nil unwrapping error)
    console.log('[OAuth Native] Initializing GoogleAuth plugin');
    await GoogleAuth.initialize({
      clientId: '122734915921-3kmos54i1erohqii9rtu6df0r3130obi.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
    console.log('[OAuth Native] GoogleAuth initialized successfully');

    // Trigger native Google sign-in sheet
    console.log('[OAuth Native] Calling GoogleAuth.signIn()');
    const googleUser = await GoogleAuth.signIn();
    console.log('[OAuth Native] Google sign-in successful, extracting ID token');

    // Extract ID token from response (handle different response formats)
    const idToken =
      (googleUser as any)?.authentication?.idToken ||
      (googleUser as any)?.idToken ||
      (googleUser as any)?.id_token;

    if (!idToken) {
      console.error('[OAuth Native] No ID token found in response:', googleUser);
      throw new Error('No Google ID token returned from native SDK');
    }

    console.log('[OAuth Native] ID token obtained, signing in to Supabase');

    // Exchange ID token for Supabase session
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      console.error('[OAuth Native] Supabase signInWithIdToken error:', error);
      throw error;
    }

    console.log('[OAuth Native] Supabase session established:', data.user?.email);
    return data;
  } catch (err: any) {
    console.error('[OAuth Native] Google sign-in failed:', err);
    throw err;
  }
}

/**
 * Sign in with Apple using native SDK
 * Opens native Apple sign-in sheet on iOS
 * @throws Error if not on native platform or if sign-in fails
 */
export async function signInWithAppleNative() {
  console.log('[OAuth Native] Starting Apple sign-in');

  if (!isNative()) {
    throw new Error('signInWithAppleNative called on non-native platform');
  }

  try {
    // Trigger native Apple sign-in sheet
    console.log('[OAuth Native] Calling SignInWithApple.authorize()');
    const appleResponse: SignInWithAppleResponse = await SignInWithApple.authorize();

    console.log('[OAuth Native] Apple sign-in successful, extracting identity token');

    // Extract identity token from response
    const identityToken = appleResponse.response?.identityToken;

    if (!identityToken) {
      console.error('[OAuth Native] No identity token found in response:', appleResponse);
      throw new Error('No Apple identity token returned from native SDK');
    }

    console.log('[OAuth Native] Identity token obtained, signing in to Supabase');

    // Exchange identity token for Supabase session
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
    });

    if (error) {
      console.error('[OAuth Native] Supabase signInWithIdToken error:', error);
      throw error;
    }

    console.log('[OAuth Native] Supabase session established:', data.user?.email);
    return data;
  } catch (err: any) {
    console.error('[OAuth Native] Apple sign-in failed:', err);
    throw err;
  }
}
