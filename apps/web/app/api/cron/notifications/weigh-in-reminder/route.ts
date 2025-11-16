/**
 * Weekly Weigh-In Reminder Cron Job
 *
 * Runs every morning at 7am to remind users to weigh themselves
 * Checks user's preferred weigh-in day (default: Friday)
 *
 * Schedule: Daily at 07:00 (7am) - checks if today is user's weigh-in day
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getUsersForWeighInReminder } from '@/lib/notifications/queries';
import { sendToUser, wasNotificationSentRecently } from '@/lib/notifications/send';
import { getWeighInReminderNotification } from '@/lib/notifications/templates';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[WeighInReminder] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[WeighInReminder] Starting weekly weigh-in reminder cron job');

  const supabase = createAdminClient();

  try {
    // 2. Get current day of week (0 = Sunday, 5 = Friday, 6 = Saturday)
    const now = new Date();
    const dayOfWeek = now.getDay();

    console.log(`[WeighInReminder] Today is day ${dayOfWeek} (0=Sunday, 5=Friday)`);

    // 3. Get all users whose weigh-in day is today
    const usersForReminder = await getUsersForWeighInReminder(supabase, dayOfWeek);

    console.log(`[WeighInReminder] Found ${usersForReminder.length} users for weigh-in reminder today`);

    if (usersForReminder.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users scheduled for weigh-in reminder today',
        dayOfWeek,
        processed: 0,
        sent: 0,
        skipped: 0
      });
    }

    // 4. Send notifications (with weekly rate limiting check)
    const results = {
      processed: usersForReminder.length,
      sent: 0,
      skipped: 0,
      failed: 0
    };

    for (const userId of usersForReminder) {
      try {
        // Check if we already sent this notification in the last 6 days
        // (to avoid sending multiple times per week)
        const alreadySent = await wasNotificationSentRecently(
          supabase,
          userId,
          'weigh_in_reminders',
          6
        );

        if (alreadySent) {
          console.log(`[WeighInReminder] Already sent to user ${userId.substring(0, 8)} this week`);
          results.skipped++;
          continue;
        }

        // Generate notification
        const notification = getWeighInReminderNotification();

        // Send notification
        const sendResult = await sendToUser(
          userId,
          'weigh_in_reminders',
          notification
        );

        if (sendResult.skipped) {
          results.skipped++;
        } else if (sendResult.success && sendResult.sent > 0) {
          results.sent++;
        } else {
          results.failed++;
        }

      } catch (error) {
        console.error(`[WeighInReminder] Error processing user ${userId}:`, error);
        results.failed++;
      }
    }

    console.log('[WeighInReminder] Cron job complete:', results);

    return NextResponse.json({
      success: true,
      dayOfWeek,
      ...results
    });

  } catch (error: any) {
    console.error('[WeighInReminder] Fatal error in cron job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
