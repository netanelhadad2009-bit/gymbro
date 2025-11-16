/**
 * Inactivity Check / Re-engagement Cron Job
 *
 * Runs daily to detect users who haven't been active for 3+ days
 * Sends gentle re-engagement notifications to bring users back
 *
 * Schedule: Daily at 10:00 (10am)
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getInactiveUsers } from '@/lib/notifications/queries';
import { sendToUser, wasNotificationSentRecently } from '@/lib/notifications/send';
import { getInactivityNotification } from '@/lib/notifications/templates';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[InactivityCheck] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[InactivityCheck] Starting inactivity check cron job');

  const supabase = createAdminClient();

  try {
    // 2. Get users who are inactive (no activity for 3+ days)
    const inactiveUsers = await getInactiveUsers(supabase, 3);

    console.log(`[InactivityCheck] Found ${inactiveUsers.length} inactive users`);

    if (inactiveUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No inactive users',
        processed: 0,
        sent: 0,
        skipped: 0
      });
    }

    // 3. Send re-engagement notifications (with rate limiting)
    const results = {
      processed: inactiveUsers.length,
      sent: 0,
      skipped: 0,
      failed: 0
    };

    for (const user of inactiveUsers) {
      try {
        // Check if we already sent an inactivity nudge in the last 5 days
        // (we don't want to spam users who are taking a break)
        const alreadySent = await wasNotificationSentRecently(
          supabase,
          user.user_id,
          'inactivity_nudges',
          5
        );

        if (alreadySent) {
          console.log(`[InactivityCheck] Already sent nudge to user ${user.user_id.substring(0, 8)} recently`);
          results.skipped++;
          continue;
        }

        // Generate re-engagement notification
        const notification = getInactivityNotification({
          daysSince: user.days_since_activity
        });

        // Send notification
        const sendResult = await sendToUser(
          user.user_id,
          'inactivity_nudges',
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
        console.error(`[InactivityCheck] Error processing user ${user.user_id}:`, error);
        results.failed++;
      }
    }

    console.log('[InactivityCheck] Cron job complete:', results);

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error: any) {
    console.error('[InactivityCheck] Fatal error in cron job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
