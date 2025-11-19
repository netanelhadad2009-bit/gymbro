/**
 * Server-side Web Push Utilities
 * Handles sending push notifications using web-push library
 * MUST only be imported in server-side code (API routes)
 */

import webpush from 'web-push';
import { serverEnv, clientEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

let isInitialized = false;

/**
 * Initialize web-push with VAPID details
 * Call this before sending any push notifications
 */
export function initializeWebPush() {
  if (isInitialized) {
    return;
  }

  // Use centralized env validation
  const vapidPublicKey = clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = serverEnv.VAPID_PRIVATE_KEY;
  const vapidSubject = serverEnv.VAPID_SUBJECT;

  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );

  isInitialized = true;
  logger.info('WebPush initialized successfully');
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
    logger.debug('WebPush notification sent successfully');
    return result;
  } catch (error: any) {
    logger.error('WebPush send error', { error: error.message, statusCode: error.statusCode });

    // Handle expired subscriptions
    if (error.statusCode === 410 || error.statusCode === 404) {
      logger.debug('WebPush subscription expired (410/404)');
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

  logger.info('WebPush batch send complete', results);
  return results;
}

export default webpush;
