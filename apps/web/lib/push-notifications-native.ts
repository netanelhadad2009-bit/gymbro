/**
 * Native Push Notifications for Capacitor
 * Handles iOS native push notifications through APNS
 *
 * IMPORTANT: This module handles the full flow:
 * 1. Request permissions
 * 2. Register with APNs
 * 3. Receive token via listener
 * 4. Save token to Supabase
 */

import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

// Store PushNotifications module reference
let PushNotifications: any = null;

// Track setup state
let setupCompleted = false;
let setupInProgress = false;
let currentUserId: string | null = null;

// Store listener handles for cleanup
let registrationListenerHandle: any = null;
let errorListenerHandle: any = null;

/**
 * Load the PushNotifications plugin dynamically
 */
async function loadPushPlugin(): Promise<boolean> {
  if (PushNotifications) {
    console.log('[Push] Plugin already loaded');
    return true;
  }

  if (typeof window === 'undefined') {
    console.log('[Push] Not in browser environment');
    return false;
  }

  if (!Capacitor.isNativePlatform()) {
    console.log('[Push] Not on native platform');
    return false;
  }

  try {
    console.log('[Push] Dynamically importing @capacitor/push-notifications...');
    const module = await import('@capacitor/push-notifications');
    PushNotifications = module.PushNotifications;
    console.log('[Push] ✓ Plugin imported successfully');
    return true;
  } catch (error) {
    console.error('[Push] ✗ Failed to import plugin:', error);
    return false;
  }
}

/**
 * Check if we're running in Capacitor (native app)
 */
export function isCapacitorApp(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

/**
 * Get unique device ID (persisted in localStorage)
 */
function getDeviceId(): string {
  if (typeof window === 'undefined') return 'unknown';

  let deviceId = localStorage.getItem('push_device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('push_device_id', deviceId);
    console.log('[Push] Generated new device ID:', deviceId);
  }
  return deviceId;
}

/**
 * Save push subscription directly to Supabase
 * Uses the authenticated user's session for RLS
 */
async function saveToSupabase(userId: string, token: string): Promise<boolean> {
  const platform = Capacitor.getPlatform() as 'ios' | 'android';
  const deviceId = getDeviceId();

  console.log('[Push] ========================================');
  console.log('[Push] 🔄 Saving push subscription to Supabase...');
  console.log('[Push] User ID:', userId.substring(0, 8) + '...');
  console.log('[Push] Platform:', platform);
  console.log('[Push] Device ID:', deviceId);
  console.log('[Push] Token length:', token?.length || 0);
  console.log('[Push] Token (first 30):', token?.substring(0, 30) + '...');
  console.log('[Push] ========================================');

  try {
    // First, check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Push] ✗ User not authenticated:', authError);
      return false;
    }

    console.log('[Push] ✓ User authenticated:', user.id.substring(0, 8) + '...');

    // Deactivate any existing subscriptions for this user+platform
    console.log('[Push] Deactivating old subscriptions...');
    const { error: deactivateError } = await supabase
      .from('push_subscriptions')
      .update({
        active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('active', true);

    if (deactivateError) {
      console.warn('[Push] Warning deactivating old subs:', deactivateError.message);
    }

    // Insert new subscription
    console.log('[Push] Inserting new subscription...');
    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: userId,
        platform,
        device_id: deviceId,
        token,
        active: true,
        last_used_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Push] ✗ Supabase insert error:', error.message);
      console.error('[Push] Error details:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log('[Push] ========================================');
    console.log('[Push] ✅ Push subscription saved successfully!');
    console.log('[Push] Subscription ID:', data.id);
    console.log('[Push] ========================================');

    return true;
  } catch (error) {
    console.error('[Push] ✗ Exception saving to Supabase:', error);
    return false;
  }
}

/**
 * Handle registration token received from APNs/FCM
 */
async function handleRegistrationToken(token: { value: string }): Promise<void> {
  console.log('[Push] ╔════════════════════════════════════════╗');
  console.log('[Push] ║  🎉 REGISTRATION TOKEN RECEIVED!       ║');
  console.log('[Push] ╚════════════════════════════════════════╝');
  console.log('[Push] Token value:', token.value);
  console.log('[Push] Token length:', token.value?.length);
  console.log('[Push] Current user ID:', currentUserId?.substring(0, 8) + '...');

  if (!currentUserId) {
    console.error('[Push] ✗ No user ID available to save token!');
    return;
  }

  if (!token.value) {
    console.error('[Push] ✗ Token value is empty!');
    return;
  }

  // Save to Supabase
  const saved = await saveToSupabase(currentUserId, token.value);

  if (saved) {
    setupCompleted = true;
    console.log('[Push] ✅ Native push setup COMPLETE!');
  } else {
    console.error('[Push] ✗ Failed to save token to Supabase');
  }
}

/**
 * Handle registration error
 */
function handleRegistrationError(error: any): void {
  console.error('[Push] ╔════════════════════════════════════════╗');
  console.error('[Push] ║  ❌ REGISTRATION ERROR!                ║');
  console.error('[Push] ╚════════════════════════════════════════╝');
  console.error('[Push] Error:', JSON.stringify(error, null, 2));
}

/**
 * Set up push notification listeners
 * MUST be called before PushNotifications.register()
 */
async function setupListeners(): Promise<void> {
  if (!PushNotifications) {
    console.error('[Push] Cannot setup listeners - plugin not loaded');
    return;
  }

  console.log('[Push] Setting up push notification listeners...');

  // Remove any existing listeners first
  try {
    if (registrationListenerHandle) {
      await registrationListenerHandle.remove();
      registrationListenerHandle = null;
    }
    if (errorListenerHandle) {
      await errorListenerHandle.remove();
      errorListenerHandle = null;
    }
  } catch (e) {
    console.warn('[Push] Error removing old listeners:', e);
  }

  // Add registration listener
  console.log('[Push] Adding "registration" listener...');
  registrationListenerHandle = await PushNotifications.addListener(
    'registration',
    handleRegistrationToken
  );
  console.log('[Push] ✓ Registration listener added');

  // Add error listener
  console.log('[Push] Adding "registrationError" listener...');
  errorListenerHandle = await PushNotifications.addListener(
    'registrationError',
    handleRegistrationError
  );
  console.log('[Push] ✓ Error listener added');

  // Add foreground notification listener
  await PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: any) => {
      console.log('[Push] 📬 Notification received in foreground:', notification);
    }
  );

  // Add notification action listener
  await PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (notification: any) => {
      console.log('[Push] 👆 Notification action performed:', notification);
    }
  );

  console.log('[Push] ✓ All listeners set up');
}

/**
 * Main entry point: Set up native push notifications for a logged-in user
 */
export async function setupNativePush(userId: string): Promise<void> {
  console.log('[Push] ════════════════════════════════════════════');
  console.log('[Push] setupNativePush() called');
  console.log('[Push] User ID:', userId ? userId.substring(0, 8) + '...' : 'null');
  console.log('[Push] ════════════════════════════════════════════');

  // Guard: Must have userId
  if (!userId) {
    console.log('[Push] ✗ No userId provided, skipping setup');
    return;
  }

  // Guard: Must be on client
  if (typeof window === 'undefined') {
    console.log('[Push] ✗ Not on client, skipping setup');
    return;
  }

  // Guard: Only run on native platform
  if (!Capacitor.isNativePlatform()) {
    console.log('[Push] ✗ Not on native platform, skipping');
    return;
  }

  // Note: We DON'T skip if setupCompleted - APNs tokens can be rotated by Apple
  // and we should always re-register to ensure we have the latest valid token.
  // The saveToSupabase function handles deactivating old tokens.
  if (setupCompleted && currentUserId === userId) {
    console.log('[Push] Re-registering to refresh token (tokens can rotate)');
  }

  // Guard: Prevent concurrent setup
  if (setupInProgress) {
    console.log('[Push] ⏳ Setup already in progress, skipping');
    return;
  }

  setupInProgress = true;
  currentUserId = userId;

  console.log('[Push] ========================================');
  console.log('[Push] 🚀 Starting native push setup');
  console.log('[Push] Platform:', Capacitor.getPlatform());
  console.log('[Push] ========================================');

  try {
    // Step 1: Load the plugin
    console.log('[Push] Step 1: Loading plugin...');
    const loaded = await loadPushPlugin();
    if (!loaded) {
      console.error('[Push] ✗ Failed to load plugin');
      return;
    }

    // Step 2: Check current permission status
    console.log('[Push] Step 2: Checking permissions...');
    let permStatus = await PushNotifications.checkPermissions();
    console.log('[Push] Current permission status:', permStatus.receive);

    // Step 3: Request permission if needed
    if (permStatus.receive === 'prompt') {
      console.log('[Push] Step 3: Requesting permission (showing system dialog)...');
      permStatus = await PushNotifications.requestPermissions();
      console.log('[Push] Permission result:', permStatus.receive);
    } else {
      console.log('[Push] Step 3: Permission already resolved:', permStatus.receive);
    }

    // Step 4: Check if permission was granted
    if (permStatus.receive !== 'granted') {
      console.log('[Push] ✗ Permission not granted:', permStatus.receive);
      return;
    }
    console.log('[Push] ✓ Permission granted');

    // Step 5: Set up listeners BEFORE calling register
    console.log('[Push] Step 5: Setting up listeners...');
    await setupListeners();

    // Small delay to ensure listeners are fully set up
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 6: Register with APNs
    console.log('[Push] Step 6: Calling PushNotifications.register()...');
    console.log('[Push] This will request an APNs token from Apple...');
    await PushNotifications.register();
    console.log('[Push] ✓ register() called successfully');
    console.log('[Push] ⏳ Waiting for token via "registration" listener...');
    console.log('[Push] (Token should appear above if successful)');

    // Set up a timeout to warn if no token is received
    setTimeout(() => {
      if (!setupCompleted) {
        console.warn('[Push] ⚠️ WARNING: No token received after 10 seconds!');
        console.warn('[Push] This could indicate:');
        console.warn('[Push]   1. APNs entitlements not configured in Xcode');
        console.warn('[Push]   2. Push capability not added to app');
        console.warn('[Push]   3. Provisioning profile issue');
        console.warn('[Push]   4. Network connectivity issue');
      }
    }, 10000);

  } catch (error) {
    console.error('[Push] ✗ Error in setupNativePush:', error);
  } finally {
    setupInProgress = false;
  }
}

/**
 * Reset the setup state (useful for testing or logout)
 */
export function resetPushSetup(): void {
  setupCompleted = false;
  setupInProgress = false;
  currentUserId = null;
  registrationListenerHandle = null;
  errorListenerHandle = null;
  console.log('[Push] Setup state reset');
}

/**
 * Get current push notification status
 */
export async function getNativePushStatus(): Promise<{
  isEnabled: boolean;
  permission: string;
}> {
  if (!isCapacitorApp()) {
    return { isEnabled: false, permission: 'denied' };
  }

  const loaded = await loadPushPlugin();
  if (!loaded) {
    return { isEnabled: false, permission: 'denied' };
  }

  const permStatus = await PushNotifications.checkPermissions();
  return {
    isEnabled: permStatus.receive === 'granted',
    permission: permStatus.receive
  };
}

// Legacy exports for compatibility
export interface NativePushResult {
  success: boolean;
  token?: string;
  permission?: string;
  error?: string;
}

export async function registerNativePush(): Promise<NativePushResult> {
  if (!isCapacitorApp()) {
    return { success: false, error: 'Not running in Capacitor environment' };
  }

  try {
    const loaded = await loadPushPlugin();
    if (!loaded) {
      return { success: false, error: 'Failed to load push notifications plugin' };
    }

    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      return { success: false, permission: permStatus.receive, error: 'Permission denied' };
    }

    await PushNotifications.register();
    return { success: true, permission: 'granted' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function initializeNativePush(): Promise<void> {
  // No-op for now, setup is done via setupNativePush
  console.log('[Push] initializeNativePush called (no-op)');
}
