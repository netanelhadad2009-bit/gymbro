/**
 * Push Notification Permissions
 * Handles native iOS permission requests via Capacitor and web fallback
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications, PermissionStatus, Token } from '@capacitor/push-notifications';

export type PushPermissionStatus = 'prompt' | 'granted' | 'denied' | 'unavailable';

/**
 * Get current push notification permission status
 * Works on both native (iOS/Android) and web
 */
export async function getPushStatus(): Promise<PushPermissionStatus> {
  // Web fallback
  if (!Capacitor.isNativePlatform()) {
    if (!('Notification' in window)) return 'unavailable';
    const status = Notification.permission;
    return status === 'default' ? 'prompt' : (status as PushPermissionStatus);
  }

  // Native platform (iOS/Android)
  try {
    const status: PermissionStatus = await PushNotifications.checkPermissions();
    const receive = status.receive;

    if (receive === 'granted') return 'granted';
    if (receive === 'denied') return 'denied';
    return 'prompt';
  } catch (error) {
    console.error('[Permissions] Error checking push status:', error);
    return 'unavailable';
  }
}

/**
 * Request push notification permission
 * Shows native iOS system sheet on iOS
 * @returns Permission status after request
 */
export async function requestPushPermission(): Promise<PushPermissionStatus> {
  // Web fallback
  if (!Capacitor.isNativePlatform()) {
    if (!('Notification' in window)) return 'denied';

    try {
      const result = await Notification.requestPermission();
      return result === 'granted' ? 'granted' : 'denied';
    } catch (error) {
      console.error('[Permissions] Web permission request failed:', error);
      return 'denied';
    }
  }

  // Native platform - show system permission sheet
  try {
    console.log('[Permissions] Requesting native push permissions');
    const status: PermissionStatus = await PushNotifications.requestPermissions();
    const receive = status.receive;

    console.log('[Permissions] Permission result:', receive);

    if (receive === 'granted') return 'granted';
    if (receive === 'denied') return 'denied';
    return 'prompt';
  } catch (error) {
    console.error('[Permissions] Native permission request failed:', error);
    return 'denied';
  }
}

/**
 * Register for push notifications and set up token listener
 * Should only be called after permission is granted
 * @param onToken Callback to handle the device token
 */
export async function registerForPush(
  onToken: (token: Token) => Promise<void> | void
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Permissions] registerForPush called on web - skipping native registration');
    return;
  }

  try {
    console.log('[Permissions] Registering for push notifications');

    // Register with APNs (iOS) or FCM (Android)
    await PushNotifications.register();

    // Set up registration listener
    await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[Permissions] Push token received:', token.value);
      await onToken(token);
    });

    // Set up registration error listener
    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('[Permissions] Push registration error:', error);
    });

    console.log('[Permissions] Push registration complete, waiting for token');
  } catch (error) {
    console.error('[Permissions] Failed to register for push:', error);
    throw error;
  }
}

/**
 * Open iOS app settings (deep link)
 * Only works on iOS
 */
export async function openAppSettings(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.warn('[Permissions] Cannot open settings on web');
    return;
  }

  try {
    const { App } = await import('@capacitor/app');

    // iOS uses app-settings: URL scheme
    if (Capacitor.getPlatform() === 'ios') {
      await App.openUrl({ url: 'app-settings:' });
    } else {
      // Android - open app info settings
      console.log('[Permissions] Opening Android app settings not yet implemented');
    }
  } catch (error) {
    console.error('[Permissions] Failed to open app settings:', error);
  }
}

/**
 * Check if we should show permission prompt
 * Prevents duplicate prompts in the same session
 */
export function shouldShowPrompt(): boolean {
  if (typeof window === 'undefined') return false;

  const key = 'notifPrompted';
  const prompted = sessionStorage.getItem(key);

  return !prompted;
}

/**
 * Mark that we've shown the permission prompt
 */
export function markPromptShown(): void {
  if (typeof window === 'undefined') return;

  sessionStorage.setItem('notifPrompted', '1');
}

/**
 * Clear the prompt flag (useful for testing)
 */
export function clearPromptFlag(): void {
  if (typeof window === 'undefined') return;

  sessionStorage.removeItem('notifPrompted');
}
