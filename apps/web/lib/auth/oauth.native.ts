import { isNative } from '@/lib/platform/isNative';
import { supabase } from '@/lib/supabase';
import { signInWithGoogleWeb, signInWithAppleWeb } from './oauth.web';

/**
 * Get SocialLogin plugin from Capacitor's global plugin registry
 * Capacitor plugins are registered globally by the native app at runtime,
 * not available as ES modules during the build or in the browser
 */
function getSocialLogin() {
  // Access plugin from Capacitor's global plugin registry
  const SocialLogin = (window as any).Capacitor?.Plugins?.SocialLogin;

  if (!SocialLogin) {
    throw new Error('SocialLogin plugin not found. Make sure the plugin is installed and registered.');
  }

  return SocialLogin;
}

const GOOGLE_WEB_CLIENT_ID =
  '122734915921-3kmos54i1erohqii9rtu6df0r3130obi.apps.googleusercontent.com';

// Apple Services ID - must match what's configured in Supabase Dashboard
// This ensures the ID token has the correct 'aud' claim that Supabase expects
const APPLE_SERVICE_ID = 'com.fitjourney.app';

/**
 * Generate a cryptographically secure random nonce
 * @param length Length of the nonce string (default 32)
 * @returns Random string of specified length
 */
function generateRandomNonce(length = 32): string {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  const cryptoObj = typeof crypto !== 'undefined' && 'getRandomValues' in crypto ? crypto : null;

  if (cryptoObj) {
    const randomValues = new Uint32Array(length);
    cryptoObj.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += charset[randomValues[i] % charset.length];
    }
  } else {
    // Fallback to Math.random (less secure but works in all environments)
    for (let i = 0; i < length; i++) {
      result += charset[Math.floor(Math.random() * charset.length)];
    }
  }

  return result;
}

/**
 * Simple, reliable SHA-256 implementation for iOS WebView
 * This implementation correctly handles message padding and length
 */
function sha256Js(msg: string): Uint8Array {
  // SHA-256 constants
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  // Convert string to UTF-8 bytes
  const msgBytes = new TextEncoder().encode(msg);
  const msgLength = msgBytes.length;
  const bitLength = msgLength * 8;

  // Add padding: append 0x80, then zeros, then 64-bit length
  const paddingLength = (msgLength % 64 < 56) ? (56 - msgLength % 64) : (120 - msgLength % 64);
  const paddedLength = msgLength + paddingLength + 8;
  const padded = new Uint8Array(paddedLength);

  // Copy message
  padded.set(msgBytes);

  // Add 0x80 byte
  padded[msgLength] = 0x80;

  // Add length as 64-bit big-endian at the end
  // JavaScript numbers are 53-bit precise, but for our use case this is fine
  const lengthHi = (bitLength / 0x100000000) >>> 0;
  const lengthLo = bitLength >>> 0;
  padded[paddedLength - 8] = (lengthHi >>> 24) & 0xff;
  padded[paddedLength - 7] = (lengthHi >>> 16) & 0xff;
  padded[paddedLength - 6] = (lengthHi >>> 8) & 0xff;
  padded[paddedLength - 5] = lengthHi & 0xff;
  padded[paddedLength - 4] = (lengthLo >>> 24) & 0xff;
  padded[paddedLength - 3] = (lengthLo >>> 16) & 0xff;
  padded[paddedLength - 2] = (lengthLo >>> 8) & 0xff;
  padded[paddedLength - 1] = lengthLo & 0xff;

  // Process message in 512-bit (64-byte) blocks
  const blocks = paddedLength / 64;

  // Initialize hash values
  let H0 = 0x6a09e667;
  let H1 = 0xbb67ae85;
  let H2 = 0x3c6ef372;
  let H3 = 0xa54ff53a;
  let H4 = 0x510e527f;
  let H5 = 0x9b05688c;
  let H6 = 0x1f83d9ab;
  let H7 = 0x5be0cd19;

  for (let block = 0; block < blocks; block++) {
    const W = new Array(64);

    // Copy block into first 16 words of message schedule
    for (let t = 0; t < 16; t++) {
      const offset = block * 64 + t * 4;
      W[t] = (padded[offset] << 24) |
             (padded[offset + 1] << 16) |
             (padded[offset + 2] << 8) |
             padded[offset + 3];
    }

    // Extend the first 16 words into the remaining 48 words
    for (let t = 16; t < 64; t++) {
      const s0 = ((W[t-15] >>> 7) | (W[t-15] << 25)) ^
                 ((W[t-15] >>> 18) | (W[t-15] << 14)) ^
                 (W[t-15] >>> 3);
      const s1 = ((W[t-2] >>> 17) | (W[t-2] << 15)) ^
                 ((W[t-2] >>> 19) | (W[t-2] << 13)) ^
                 (W[t-2] >>> 10);
      W[t] = (W[t-16] + s0 + W[t-7] + s1) >>> 0;
    }

    // Initialize working variables
    let a = H0;
    let b = H1;
    let c = H2;
    let d = H3;
    let e = H4;
    let f = H5;
    let g = H6;
    let h = H7;

    // Main loop
    for (let t = 0; t < 64; t++) {
      const S1 = ((e >>> 6) | (e << 26)) ^
                 ((e >>> 11) | (e << 21)) ^
                 ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;

      const S0 = ((a >>> 2) | (a << 30)) ^
                 ((a >>> 13) | (a << 19)) ^
                 ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    // Add compressed chunk to hash value
    H0 = (H0 + a) >>> 0;
    H1 = (H1 + b) >>> 0;
    H2 = (H2 + c) >>> 0;
    H3 = (H3 + d) >>> 0;
    H4 = (H4 + e) >>> 0;
    H5 = (H5 + f) >>> 0;
    H6 = (H6 + g) >>> 0;
    H7 = (H7 + h) >>> 0;
  }

  // Convert hash to byte array
  const hash = new Uint8Array(32);
  const hashWords = [H0, H1, H2, H3, H4, H5, H6, H7];
  for (let i = 0; i < 8; i++) {
    hash[i * 4] = (hashWords[i] >>> 24) & 0xff;
    hash[i * 4 + 1] = (hashWords[i] >>> 16) & 0xff;
    hash[i * 4 + 2] = (hashWords[i] >>> 8) & 0xff;
    hash[i * 4 + 3] = hashWords[i] & 0xff;
  }

  return hash;
}

/**
 * Compute SHA-256 hash and encode as hexadecimal string
 * Uses crypto.subtle when available, falls back to pure JS implementation
 *
 * NOTE: Supabase expects the nonce to be SHA-256 hashed in HEXADECIMAL format,
 * not base64url. This is documented in their official React Native guide.
 *
 * @param input String to hash
 * @returns Hexadecimal-encoded SHA-256 hash
 */
async function sha256Hex(input: string): Promise<string> {
  try {
    let bytes: Uint8Array;

    // Check if crypto.subtle is available
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      bytes = new Uint8Array(hashBuffer);
      console.log('[OAuth Native] Used crypto.subtle for SHA-256');
    } else {
      // Fallback to pure JavaScript implementation for iOS WebView
      console.log('[OAuth Native] crypto.subtle not available, using pure JS SHA-256');
      bytes = sha256Js(input);
    }

    // Convert to hexadecimal encoding (as required by Supabase)
    // Each byte is converted to a 2-character hex string
    const hexString = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return hexString;
  } catch (err) {
    console.error('[OAuth Native] SHA-256 hashing failed:', err);
    throw new Error('Failed to compute SHA-256 hash');
  }
}

/**
 * Base64url decode helper
 * Converts base64url encoding to base64 and decodes
 * @param str Base64url encoded string
 * @returns Decoded string
 */
function base64UrlDecode(str: string): string {
  // Replace base64url characters with base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed
  const padding = base64.length % 4;
  if (padding > 0) {
    base64 += '='.repeat(4 - padding);
  }

  // Decode using atob (browser environment)
  try {
    return atob(base64);
  } catch (err) {
    console.error('[OAuth Native] Base64 decode error:', err);
    throw new Error('Failed to decode base64url string');
  }
}

/**
 * Extract nonce from JWT ID token payload
 * @param idToken JWT ID token
 * @returns Nonce string if present, undefined otherwise
 */
function extractNonceFromToken(idToken: string): string | undefined {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      console.warn('[OAuth Native] Invalid JWT format (expected 3 parts)');
      return undefined;
    }

    const payload = JSON.parse(base64UrlDecode(parts[1]));
    const nonce = payload.nonce as string | undefined;

    if (nonce) {
      console.log('[OAuth Native] Found nonce in ID token payload');
    } else {
      console.log('[OAuth Native] No nonce found in ID token payload');
    }

    return nonce;
  } catch (err) {
    console.error('[OAuth Native] Failed to extract nonce from token:', err);
    return undefined;
  }
}

/**
 * Initialize social login plugins
 * Must be called once before using Google or Apple sign-in
 */
let isInitialized = false;

async function ensureInitialized() {
  if (isInitialized) return;

  // Detect platform - Apple Sign-In is only available on iOS
  const platform = typeof window !== 'undefined' ? (window as any).Capacitor?.getPlatform() : 'unknown';
  const isIOS = platform === 'ios';

  console.log('[OAuth Native] Initializing SocialLogin plugin');
  console.log('[OAuth Native] Platform:', platform);
  console.log('[OAuth Native] Google Web Client ID:', GOOGLE_WEB_CLIENT_ID.substring(0, 20) + '...');
  if (isIOS) {
    console.log('[OAuth Native] Apple Service ID:', APPLE_SERVICE_ID);
  }

  try {
    const SocialLogin = getSocialLogin();

    // Build initialization config based on platform
    // Apple Sign-In requires redirectUrl on Android which we don't have,
    // so we only initialize Apple on iOS where it's natively supported
    // Using 'online' mode for Google - simpler setup, returns ID token directly
    // (offline mode requires MainActivity modifications for the plugin)
    const initConfig: any = {
      google: {
        webClientId: GOOGLE_WEB_CLIENT_ID,
        mode: 'online'
      }
    };

    // Only add Apple config on iOS
    if (isIOS) {
      initConfig.apple = {
        clientId: APPLE_SERVICE_ID
      };
    }

    await SocialLogin.initialize(initConfig);

    isInitialized = true;
    console.log('[OAuth Native] SocialLogin initialized successfully');
  } catch (err: any) {
    console.error('[OAuth Native] Failed to initialize SocialLogin:', err);
    throw err;
  }
}

/**
 * Sign in with Google using native SDK
 * Opens native Google sign-in sheet on iOS/Android
 * @throws Error if not on native platform or if sign-in fails
 */
export async function signInWithGoogleNative() {
  console.log('[OAuth Native] ========================================');
  console.log('[OAuth Native] Starting Google sign-in');
  console.log('[OAuth Native] Platform check:', {
    isNative: isNative(),
    platform: typeof window !== 'undefined' ? (window as any).Capacitor?.getPlatform() : 'unknown',
  });
  console.log('[OAuth Native] ========================================');

  if (!isNative()) {
    const error = new Error('signInWithGoogleNative called on non-native platform');
    console.error('[OAuth Native] ❌ Platform error:', error);
    throw error;
  }

  try {
    // Ensure plugin is initialized
    console.log('[OAuth Native] Step 1: Ensuring SocialLogin plugin is initialized...');
    await ensureInitialized();
    console.log('[OAuth Native] ✅ Plugin initialized');

    // Get SocialLogin plugin from Capacitor registry
    const SocialLogin = getSocialLogin();

    // Logout any previous Google session to force account picker
    console.log('[OAuth Native] Step 1.5: Logging out previous Google session to force account picker...');
    try {
      await SocialLogin.logout({ provider: 'google' });
      console.log('[OAuth Native] ✅ Previous Google session cleared');
    } catch (logoutErr) {
      console.log('[OAuth Native] No previous session to logout (this is fine):', logoutErr);
    }

    // Generate nonce for secure OAuth flow
    // Note: sha256Hex has a pure JS fallback for iOS WebView
    console.log('[OAuth Native] Step 2: Generating nonce for Google sign-in...');
    const rawNonce = generateRandomNonce();
    const hashedNonce = await sha256Hex(rawNonce);
    console.log('[OAuth Native] ✅ Generated nonce (raw + hashed to hex) for Google sign-in');

    // Trigger native Google sign-in sheet
    // Note: Don't pass scopes - the plugin includes email, profile, openid by default
    // Passing scopes requires MainActivity modifications we don't have
    // Note: Temporarily removing nonce for simpler flow (can add back later for security)
    console.log('[OAuth Native] Step 3: Calling SocialLogin.login() for Google...');
    const loginOptions: any = {
      provider: 'google',
      options: {}
    };

    console.log('[OAuth Native] Login options:', {
      provider: 'google',
      webClientId: GOOGLE_WEB_CLIENT_ID.substring(0, 20) + '...',
    });

    const result = await SocialLogin.login(loginOptions);

    console.log('[OAuth Native] ✅ Google sign-in successful');
    console.log('[OAuth Native] Raw result structure:', {
      hasResult: !!(result as any).result,
      resultKeys: (result as any).result ? Object.keys((result as any).result) : [],
    });

    // Extract ID token from new response structure
    const idToken = (result as any).result?.idToken;

    if (!idToken) {
      console.error('[OAuth Native] ❌ No ID token found in response');
      console.error('[OAuth Native] Full response:', JSON.stringify(result, null, 2));
      throw new Error('No Google ID token returned from native SDK');
    }

    console.log('[OAuth Native] ✅ ID token obtained (length:', idToken.length, ')');

    // Exchange ID token for Supabase session
    console.log('[OAuth Native] Step 4: Exchanging ID token with Supabase...');

    // Verify nonce in token matches what we sent
    const nonceFromToken = extractNonceFromToken(idToken);
    if (nonceFromToken) {
      const matches = nonceFromToken === hashedNonce;
      console.log('[OAuth Native] Nonce verification:', {
        hashedNonceSent: hashedNonce.substring(0, 20) + '...',
        nonceInToken: nonceFromToken.substring(0, 20) + '...',
        matches
      });
      if (!matches) {
        console.warn('[OAuth Native] ⚠️ Nonce mismatch - token nonce does not match what we sent!');
      }
    } else {
      console.warn('[OAuth Native] ⚠️ No nonce found in token - this may cause authentication to fail');
    }

    // Send to Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
      nonce: rawNonce  // Always send raw nonce for verification
    });

    console.log('[OAuth Native] ✅ Sent raw nonce to Supabase for verification');

    if (error) {
      console.error('[OAuth Native] ❌ Supabase signInWithIdToken error');
      console.error('[OAuth Native] Error details:', {
        message: error.message,
        name: error.name,
        status: (error as any).status,
        code: (error as any).code,
        __isAuthError: (error as any).__isAuthError,
      });
      console.error('[OAuth Native] Full error object:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('[OAuth Native] ✅ Supabase session established');
    console.log('[OAuth Native] User:', {
      id: data.user?.id,
      email: data.user?.email,
      provider: data.user?.app_metadata?.provider,
    });
    return data;
  } catch (err: any) {
    // Extract error code from various possible error formats
    const code =
      err?.code ||
      (typeof err === 'string' ? err : undefined) ||
      err?.message;

    console.error('[OAuth Native] ❌ Google sign-in failed');
    console.error('[OAuth Native] Error type:', err?.constructor?.name || typeof err);
    console.error('[OAuth Native] Error message:', err?.message);
    console.error('[OAuth Native] Error name:', err?.name);
    console.error('[OAuth Native] Error status:', (err as any)?.status);
    console.error('[OAuth Native] Error code:', code);
    console.error('[OAuth Native] Error stack:', err?.stack?.split('\n').slice(0, 5));

    // Check if the error indicates the plugin is unavailable
    const isPluginUnavailable =
      code === 'UNIMPLEMENTED' ||
      code === 'ERR_UNAVAILABLE' ||
      (typeof code === 'string' && code.includes('UNIMPLEMENTED')) ||
      (typeof code === 'string' && code.includes('unavailable'));

    if (isPluginUnavailable) {
      console.warn('[OAuth Native] ⚠️ GoogleAuth plugin unavailable, falling back to web OAuth');
      console.log('[OAuth Native] Attempting web OAuth flow as fallback...');

      // Fallback to web OAuth flow
      try {
        const webResult = await signInWithGoogleWeb();
        console.log('[OAuth Native] ✅ Web OAuth fallback successful');
        return webResult;
      } catch (webErr) {
        console.error('[OAuth Native] ❌ Web OAuth fallback also failed:', webErr);
        throw webErr;
      }
    }

    // For all other errors, rethrow so the UI can show the error banner
    throw err;
  }
}

/**
 * Sign in with Apple using native SDK
 * Opens native Apple sign-in sheet on iOS/Android
 * @throws Error if not on native platform or if sign-in fails
 */
export async function signInWithAppleNative() {
  console.log('[OAuth Native] ========================================');
  console.log('[OAuth Native] Starting Apple sign-in');
  console.log('[OAuth Native] Platform check:', {
    isNative: isNative(),
    platform: typeof window !== 'undefined' ? (window as any).Capacitor?.getPlatform() : 'unknown',
  });
  console.log('[OAuth Native] ========================================');

  if (!isNative()) {
    const error = new Error('signInWithAppleNative called on non-native platform');
    console.error('[OAuth Native] ❌ Platform error:', error);
    throw error;
  }

  try {
    // Ensure plugin is initialized
    console.log('[OAuth Native] Step 1: Ensuring SocialLogin plugin is initialized...');
    await ensureInitialized();
    console.log('[OAuth Native] ✅ Plugin initialized');

    // Get SocialLogin plugin from Capacitor registry
    const SocialLogin = getSocialLogin();

    // Trigger native Apple sign-in sheet
    console.log('[OAuth Native] Step 2: Calling SocialLogin.login() for Apple...');
    console.log('[OAuth Native] Login options:', {
      provider: 'apple',
      scopes: ['email', 'name'],
    });

    const result = await SocialLogin.login({
      provider: 'apple',
      options: {
        scopes: ['email', 'name']
      }
    });

    console.log('[OAuth Native] ✅ Apple sign-in successful');
    console.log('[OAuth Native] Raw result structure:', {
      hasResult: !!(result as any).result,
      resultKeys: (result as any).result ? Object.keys((result as any).result) : [],
    });

    // Extract identity token from new response structure
    const identityToken = (result as any).result?.idToken;

    if (!identityToken) {
      console.error('[OAuth Native] ❌ No identity token found in response');
      console.error('[OAuth Native] Full response:', JSON.stringify(result, null, 2));
      throw new Error('No Apple identity token returned from native SDK');
    }

    console.log('[OAuth Native] ✅ Identity token obtained (length:', identityToken.length, ')');

    // Exchange identity token for Supabase session
    console.log('[OAuth Native] Step 3: Exchanging identity token with Supabase...');
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
    });

    if (error) {
      console.error('[OAuth Native] ❌ Supabase signInWithIdToken error');
      console.error('[OAuth Native] Error details:', {
        message: error.message,
        name: error.name,
        status: (error as any).status,
        code: (error as any).code,
        __isAuthError: (error as any).__isAuthError,
      });
      console.error('[OAuth Native] Full error object:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('[OAuth Native] ✅ Supabase session established');
    console.log('[OAuth Native] User:', {
      id: data.user?.id,
      email: data.user?.email,
      provider: data.user?.app_metadata?.provider,
    });
    return data;
  } catch (err: any) {
    // Extract error code from various possible error formats
    const code =
      err?.code ||
      (typeof err === 'string' ? err : undefined) ||
      err?.message;

    console.error('[OAuth Native] ❌ Apple sign-in failed');
    console.error('[OAuth Native] Error type:', err?.constructor?.name || typeof err);
    console.error('[OAuth Native] Error message:', err?.message);
    console.error('[OAuth Native] Error name:', err?.name);
    console.error('[OAuth Native] Error status:', (err as any)?.status);
    console.error('[OAuth Native] Error code:', code);
    console.error('[OAuth Native] Error stack:', err?.stack?.split('\n').slice(0, 5));

    // Check if the error indicates the plugin is unavailable
    const isPluginUnavailable =
      code === 'UNIMPLEMENTED' ||
      code === 'ERR_UNAVAILABLE' ||
      (typeof code === 'string' && code.includes('UNIMPLEMENTED')) ||
      (typeof code === 'string' && code.includes('unavailable'));

    if (isPluginUnavailable) {
      console.warn('[OAuth Native] ⚠️ AppleAuth plugin unavailable, falling back to web OAuth');
      console.log('[OAuth Native] Attempting web OAuth flow as fallback...');

      // Fallback to web OAuth flow
      try {
        const webResult = await signInWithAppleWeb();
        console.log('[OAuth Native] ✅ Web OAuth fallback successful');
        return webResult;
      } catch (webErr) {
        console.error('[OAuth Native] ❌ Web OAuth fallback also failed:', webErr);
        throw webErr;
      }
    }

    // For all other errors, rethrow so the UI can show the error banner
    throw err;
  }
}
