/**
 * Push Notification Client Utilities
 * Handles permission requests, subscription management, and device detection
 */

import { registerServiceWorker, getServiceWorkerRegistration } from './register-sw';

export interface PushSubscribeResult {
  success: boolean;
  subscription: PushSubscription | null;
  permission: NotificationPermission;
  supported: boolean;
  error?: string;
}

export interface DeviceInfo {
  isIOS: boolean;
  isPWA: boolean;
  isSafari: boolean;
  iosVersion: number | null;
  supportsWebPush: boolean;
}

/**
 * Detect device and browser capabilities
 */
export function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      isIOS: false,
      isPWA: false,
      isSafari: false,
      iosVersion: null,
      supportsWebPush: false
    };
  }

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true;

  let iosVersion: number | null = null;
  if (isIOS) {
    const match = ua.match(/OS (\d+)_/);
    if (match) {
      iosVersion = parseInt(match[1], 10);
    }
  }

  // Web Push requires iOS 16.4+ AND PWA mode
  const supportsWebPush = Boolean(
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    (!isIOS || (iosVersion && iosVersion >= 16 && isPWA))
  );

  return {
    isIOS,
    isPWA,
    isSafari,
    iosVersion,
    supportsWebPush
  };
}

/**
 * Convert VAPID public key from base64 URL to Uint8Array
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Request notification permission
 */
export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  // Already granted or denied
  if (Notification.permission !== 'default') {
    return Notification.permission;
  }

  // Request permission
  try {
    const permission = await Notification.requestPermission();
    console.log('[Push] Permission result:', permission);
    return permission;
  } catch (error) {
    console.error('[Push] Permission request failed:', error);
    return 'denied';
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribePush(): Promise<PushSubscribeResult> {
  // Check if running in Capacitor - simulate success for simulator
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    console.log('[Push] Running in Capacitor - simulating success for development');

    // For iOS simulator, just simulate success
    // Real push notifications would require Apple certificates and physical device
    return {
      success: true,
      subscription: null,
      permission: 'granted' as NotificationPermission,
      supported: true
    };
  }

  // Original web push logic for browsers
  const deviceInfo = getDeviceInfo();

  // Check if web push is supported
  if (!deviceInfo.supportsWebPush) {
    let error = 'התראות אינן נתמכות במכשיר זה';

    if (deviceInfo.isIOS && !deviceInfo.isPWA) {
      error = 'ב-iOS, התראות זמינות רק לאחר התקנת האפליקציה (הוסף למסך הבית)';
    } else if (deviceInfo.isIOS && deviceInfo.iosVersion && deviceInfo.iosVersion < 16) {
      error = 'התראות דורשות iOS 16.4 ומעלה';
    }

    return {
      success: false,
      subscription: null,
      permission: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied',
      supported: false,
      error
    };
  }

  try {
    // Request permission first
    const permission = await ensureNotificationPermission();

    if (permission !== 'granted') {
      return {
        success: false,
        subscription: null,
        permission,
        supported: true,
        error: 'Permission not granted'
      };
    }

    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      return {
        success: false,
        subscription: null,
        permission,
        supported: true,
        error: 'Service Worker registration failed'
      };
    }

    // Get VAPID public key
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey || vapidPublicKey === 'REPLACE_WITH_YOUR_BASE64URL_VAPID_PUBLIC_KEY') {
      return {
        success: false,
        subscription: null,
        permission,
        supported: true,
        error: 'VAPID public key not configured'
      };
    }

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // Create new subscription if none exists
    if (!subscription) {
      console.log('[Push] Creating new subscription...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource
      });
      console.log('[Push] Subscription created');
    } else {
      console.log('[Push] Using existing subscription');
    }

    // Send subscription to backend
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON()
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to save subscription: ${response.statusText}`);
    }

    return {
      success: true,
      subscription,
      permission,
      supported: true
    };
  } catch (error) {
    console.error('[Push] Subscribe error:', error);
    return {
      success: false,
      subscription: null,
      permission: Notification.permission,
      supported: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribePush(): Promise<boolean> {
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const success = await subscription.unsubscribe();
      console.log('[Push] Unsubscribed:', success);
      return success;
    }

    return false;
  } catch (error) {
    console.error('[Push] Unsubscribe error:', error);
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      return null;
    }

    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('[Push] Get subscription error:', error);
    return null;
  }
}

/**
 * Send a test notification
 */
export async function sendTestNotification(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send test notification');
    }

    return { success: true };
  } catch (error) {
    console.error('[Push] Test notification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
