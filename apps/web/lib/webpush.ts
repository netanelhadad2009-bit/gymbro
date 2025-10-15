/**
 * Server-side Web Push Utilities
 * Handles sending push notifications using web-push library
 * MUST only be imported in server-side code (API routes)
 */

import webpush from 'web-push';

let isInitialized = false;

/**
 * Initialize web-push with VAPID details
 * Call this before sending any push notifications
 */
export function initializeWebPush() {
  if (isInitialized) {
    return;
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@gymbro.app';

  if (!vapidPublicKey || vapidPublicKey === 'REPLACE_WITH_YOUR_BASE64URL_VAPID_PUBLIC_KEY') {
    throw new Error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured');
  }

  if (!vapidPrivateKey || vapidPrivateKey === 'REPLACE_WITH_YOUR_VAPID_PRIVATE_KEY') {
    throw new Error('VAPID_PRIVATE_KEY is not configured');
  }

  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );

  isInitialized = true;
  console.log('[WebPush] Initialized successfully');
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  vibrate?: number[];
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

/**
 * Send a push notification to a single subscription
 */
export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: PushPayload
): Promise<webpush.SendResult> {
  initializeWebPush();

  const payloadString = JSON.stringify(payload);

  try {
    const result = await webpush.sendNotification(subscription, payloadString);
    console.log('[WebPush] Notification sent successfully');
    return result;
  } catch (error: any) {
    console.error('[WebPush] Send error:', error);

    // Handle expired subscriptions
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log('[WebPush] Subscription expired (410/404)');
    }

    throw error;
  }
}

/**
 * Send a push notification to multiple subscriptions
 */
export async function sendPushNotificationToMultiple(
  subscriptions: webpush.PushSubscription[],
  payload: PushPayload
): Promise<{
  successful: number;
  failed: number;
  expired: webpush.PushSubscription[];
}> {
  initializeWebPush();

  const results = {
    successful: 0,
    failed: 0,
    expired: [] as webpush.PushSubscription[]
  };

  const promises = subscriptions.map(async (subscription) => {
    try {
      await sendPushNotification(subscription, payload);
      results.successful++;
    } catch (error: any) {
      results.failed++;
      // Track expired subscriptions (410/404)
      if (error.statusCode === 410 || error.statusCode === 404) {
        results.expired.push(subscription);
      }
    }
  });

  await Promise.allSettled(promises);

  console.log('[WebPush] Batch send complete:', results);
  return results;
}

export default webpush;
