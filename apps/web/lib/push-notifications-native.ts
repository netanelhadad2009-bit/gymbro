/**
 * Native Push Notifications for Capacitor
 * Handles iOS native push notifications through APNS
 */

import { PushNotifications, PushNotificationSchema, Token, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export interface NativePushResult {
  success: boolean;
  token?: string;
  permission?: string;
  error?: string;
}

/**
 * Check if we're running in Capacitor (native app)
 */
export function isCapacitorApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Initialize native push notifications
 */
export async function initializeNativePush(): Promise<void> {
  if (!isCapacitorApp()) {
    console.log('[NativePush] Not running in Capacitor, skipping initialization');
    return;
  }

  console.log('[NativePush] Initializing native push notifications...');

  // Register listeners before requesting permissions
  await addListeners();
}

/**
 * Add listeners for push notification events
 */
async function addListeners(): Promise<void> {
  // Handle registration success
  await PushNotifications.addListener('registration', (token: Token) => {
    console.log('[NativePush] Registration success, token:', token.value);
    // Save token to backend here
    saveTokenToBackend(token.value);
  });

  // Handle registration error
  await PushNotifications.addListener('registrationError', (error: any) => {
    console.error('[NativePush] Registration error:', error);
  });

  // Handle incoming notifications when app is in foreground
  await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    console.log('[NativePush] Push received:', notification);
    // Handle foreground notification
  });

  // Handle notification tap
  await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
    console.log('[NativePush] Push action performed:', notification);
    // Handle notification tap
  });
}

/**
 * Request permission and register for native push notifications
 */
export async function registerNativePush(): Promise<NativePushResult> {
  if (!isCapacitorApp()) {
    return {
      success: false,
      error: 'Not running in Capacitor environment'
    };
  }

  try {
    // Request permission
    console.log('[NativePush] Requesting permission...');
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.log('[NativePush] Permission denied');
      return {
        success: false,
        permission: permStatus.receive,
        error: 'הרשאות התראות נדחו. ניתן לשנות זאת בהגדרות המכשיר.'
      };
    }

    // Register with APNS
    console.log('[NativePush] Registering with APNS...');
    await PushNotifications.register();

    // Note: The actual token will be received in the 'registration' listener
    return {
      success: true,
      permission: 'granted'
    };
  } catch (error) {
    console.error('[NativePush] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'שגיאה בהרשמה להתראות'
    };
  }
}

/**
 * Save device token to backend
 */
async function saveTokenToBackend(token: string): Promise<void> {
  try {
    const response = await fetch('/api/push/register-native', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        platform: Capacitor.getPlatform(),
        deviceId: await getDeviceId()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save token to backend');
    }

    console.log('[NativePush] Token saved to backend');
  } catch (error) {
    console.error('[NativePush] Failed to save token:', error);
  }
}

/**
 * Get unique device ID
 */
async function getDeviceId(): Promise<string> {
  // In a real app, you'd use Device plugin to get unique ID
  // For now, generate a random ID and store it
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

/**
 * Get current push notification status
 */
export async function getNativePushStatus(): Promise<{
  isEnabled: boolean;
  permission: string;
}> {
  if (!isCapacitorApp()) {
    return {
      isEnabled: false,
      permission: 'denied'
    };
  }

  const permStatus = await PushNotifications.checkPermissions();
  return {
    isEnabled: permStatus.receive === 'granted',
    permission: permStatus.receive
  };
}