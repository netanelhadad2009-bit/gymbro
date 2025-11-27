/**
 * Core Notification Sender
 * Handles sending push notifications to users across all platforms
 * Respects user preferences, quiet hours, and logs all deliveries
 */

import { createAdminClient } from '@/lib/supabase-admin';
import { sendPushNotification, type PushPayload } from '@/lib/webpush';
import { sendAPNsPush, isAPNsConfigured, type APNsPayload } from '@/lib/apns';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface NotificationData {
  title: string;
  body: string;
  route?: string;  // Deep link route (e.g., '/nutrition', '/journey')
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
}

export interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  skipped?: string;  // Reason if skipped (e.g., 'no_subscriptions', 'disabled_by_user')
}

/**
 * Check if current time is within user's quiet hours
 */
function isWithinQuietHours(
  timezone: string,
  quietStart: string,  // "HH:MM"
  quietEnd: string     // "HH:MM"
): boolean {
  try {
    const now = new Date();
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();
    const currentMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMin] = quietStart.split(':').map(Number);
    const [endHour, endMin] = quietEnd.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } catch (error) {
    console.error('[Notifications] Error checking quiet hours:', error);
    return false;  // If timezone parsing fails, allow notification
  }
}

/**
 * Send a notification to a single user
 * Checks preferences, quiet hours, and handles all platforms
 */
export async function sendToUser(
  userId: string,
  type: string,
  notification: NotificationData
): Promise<SendResult> {
  const supabase = createAdminClient();

  try {
    // 1. Get user's notification preferences
    const { data: prefs, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (user has no prefs yet)
      console.error(`[Notifications] Error fetching preferences for user ${userId}:`, prefsError);
    }

    // 2. Check if push notifications are enabled globally
    if (prefs && prefs.push_enabled === false) {
      console.log(`[Notifications] Push disabled for user ${userId}`);
      return { success: true, sent: 0, failed: 0, skipped: 'push_disabled' };
    }

    // 3. Check if this specific notification type is enabled
    const typeKey = `${type.replace(/-/g, '_')}`;  // Convert 'meal-reminder' to 'meal_reminder'
    if (prefs && prefs[typeKey] === false) {
      console.log(`[Notifications] Type ${type} disabled for user ${userId}`);
      return { success: true, sent: 0, failed: 0, skipped: `${type}_disabled` };
    }

    // 4. Check quiet hours
    if (prefs?.quiet_hours_enabled) {
      const inQuietHours = isWithinQuietHours(
        prefs.timezone || 'Asia/Jerusalem',
        prefs.quiet_hours_start || '22:00',
        prefs.quiet_hours_end || '08:00'
      );

      if (inQuietHours) {
        console.log(`[Notifications] User ${userId} is in quiet hours`);
        return { success: true, sent: 0, failed: 0, skipped: 'quiet_hours' };
      }
    }

    // 5. Get all active subscriptions for this user
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true);

    if (subError) {
      console.error(`[Notifications] Error fetching subscriptions for user ${userId}:`, subError);
      return { success: false, sent: 0, failed: 0, skipped: 'db_error' };
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[Notifications] No active subscriptions for user ${userId}`);
      return { success: true, sent: 0, failed: 0, skipped: 'no_subscriptions' };
    }

    // 6. Build push payload
    const payload: PushPayload = {
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon-192.png',
      badge: notification.badge || '/badge-72.png',
      data: {
        url: notification.route || '/',
        type,
        ...notification.data
      },
      tag: type,  // Allows notifications of same type to stack/replace
      requireInteraction: false,  // Don't require user action
      vibrate: [200, 100, 200]  // Vibration pattern for mobile
    };

    // 7. Send to all subscriptions
    let sent = 0;
    let failed = 0;

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          if (sub.platform === 'web') {
            // Web push
            await sendPushNotification({
              endpoint: sub.endpoint!,
              keys: {
                p256dh: sub.p256dh!,
                auth: sub.auth!
              }
            }, payload);

            sent++;

            // Log successful delivery
            await supabase.from('notification_logs').insert({
              user_id: userId,
              type,
              title: notification.title,
              body: notification.body,
              data: notification.data,
              status: 'sent',
              sent_at: new Date().toISOString()
            });

          } else if (sub.platform === 'ios') {
            // iOS APNs push
            if (!sub.device_token) {
              console.warn(`[Notifications] No device token for iOS subscription ${sub.id}`);
              return;
            }

            if (!isAPNsConfigured()) {
              console.warn('[Notifications] APNs not configured, skipping iOS push');
              await supabase.from('notification_logs').insert({
                user_id: userId,
                type,
                title: notification.title,
                body: notification.body,
                data: notification.data,
                status: 'pending',
                error_message: 'APNs not configured'
              });
              return;
            }

            const apnsPayload: APNsPayload = {
              alert: {
                title: notification.title,
                body: notification.body
              },
              sound: 'default',
              data: {
                url: notification.route || '/',
                type,
                ...notification.data
              }
            };

            const result = await sendAPNsPush(sub.device_token, apnsPayload);

            if (result.success) {
              sent++;
              await supabase.from('notification_logs').insert({
                user_id: userId,
                type,
                title: notification.title,
                body: notification.body,
                data: notification.data,
                status: 'sent',
                sent_at: new Date().toISOString()
              });
            } else {
              failed++;
              await supabase.from('notification_logs').insert({
                user_id: userId,
                type,
                title: notification.title,
                body: notification.body,
                data: notification.data,
                status: 'failed',
                error_message: result.error || result.reason || 'APNs error'
              });

              // Mark subscription as inactive if device token is invalid
              if (result.reason === 'BadDeviceToken' || result.reason === 'Unregistered') {
                console.log(`[Notifications] Marking iOS subscription ${sub.id} as inactive`);
                await supabase
                  .from('push_subscriptions')
                  .update({ active: false, updated_at: new Date().toISOString() })
                  .eq('id', sub.id);
              }
            }

          } else if (sub.platform === 'android') {
            // Android FCM push - not yet implemented
            console.log(`[Notifications] Android FCM not yet implemented`);
            await supabase.from('notification_logs').insert({
              user_id: userId,
              type,
              title: notification.title,
              body: notification.body,
              data: notification.data,
              status: 'pending',
              error_message: 'Android FCM not yet implemented'
            });
          }

        } catch (error: any) {
          failed++;
          console.error(`[Notifications] Failed to send to subscription ${sub.id}:`, error);

          // Log failure
          await supabase.from('notification_logs').insert({
            user_id: userId,
            type,
            title: notification.title,
            body: notification.body,
            status: 'failed',
            error_message: error?.message || 'Unknown error'
          });

          // Mark subscription as inactive if expired (410/404)
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`[Notifications] Marking subscription ${sub.id} as expired`);
            await supabase
              .from('push_subscriptions')
              .update({ active: false, updated_at: new Date().toISOString() })
              .eq('id', sub.id);
          }
        }
      })
    );

    console.log(`[Notifications] Sent ${type} to user ${userId}:`, { sent, failed });
    return { success: true, sent, failed };

  } catch (error) {
    console.error(`[Notifications] Error sending to user ${userId}:`, error);
    return { success: false, sent: 0, failed: 0 };
  }
}

/**
 * Send a notification to multiple users
 * Useful for batch operations (e.g., daily reminders for all users)
 */
export async function sendToMultipleUsers(
  userIds: string[],
  type: string,
  getNotificationForUser: (userId: string) => NotificationData | Promise<NotificationData>
): Promise<{
  total: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const results = {
    total: userIds.length,
    sent: 0,
    failed: 0,
    skipped: 0
  };

  // Process in batches of 10 to avoid overwhelming the system
  const batchSize = 10;
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (userId) => {
        try {
          const notification = await getNotificationForUser(userId);
          const result = await sendToUser(userId, type, notification);

          if (result.skipped) {
            results.skipped++;
          } else {
            results.sent += result.sent;
            results.failed += result.failed;
          }
        } catch (error) {
          console.error(`[Notifications] Error processing user ${userId}:`, error);
          results.failed++;
        }
      })
    );
  }

  console.log(`[Notifications] Batch send complete (${type}):`, results);
  return results;
}

/**
 * Check if a notification of a specific type was already sent to a user today
 * Useful for preventing duplicate daily notifications
 */
export async function wasNotificationSentToday(
  supabase: SupabaseClient,
  userId: string,
  type: string
): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];  // YYYY-MM-DD

  const { data, error } = await supabase
    .from('notification_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('status', 'sent')
    .gte('sent_at', `${today}T00:00:00Z`)
    .limit(1);

  if (error) {
    console.error('[Notifications] Error checking notification log:', error);
    return false;  // Assume not sent to avoid blocking
  }

  return (data && data.length > 0);
}

/**
 * Check if a notification of a specific type was sent in the last N days
 * Useful for rate-limiting certain notification types
 */
export async function wasNotificationSentRecently(
  supabase: SupabaseClient,
  userId: string,
  type: string,
  days: number
): Promise<boolean> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, error } = await supabase
    .from('notification_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('status', 'sent')
    .gte('sent_at', cutoffDate.toISOString())
    .limit(1);

  if (error) {
    console.error('[Notifications] Error checking notification log:', error);
    return false;
  }

  return (data && data.length > 0);
}
