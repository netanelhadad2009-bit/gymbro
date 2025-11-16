/**
 * Journey Nudge (Stuck on Stage) Cron Job
 *
 * Runs daily to nudge users who haven't made progress on their current stage for 2+ days
 * Encourages users to continue their journey without being pushy
 *
 * Schedule: Daily at 12:00 (noon)
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getUsersStuckOnStage } from '@/lib/notifications/queries';
import { sendToUser, wasNotificationSentRecently } from '@/lib/notifications/send';
import { getJourneyNudgeNotification } from '@/lib/notifications/templates';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[JourneyNudge] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[JourneyNudge] Starting journey nudge cron job');

  const supabase = createAdminClient();

  try {
    // 2. Get users who are stuck on their current stage (no progress for 2+ days)
    const stuckUsers = await getUsersStuckOnStage(supabase, 2);

    console.log(`[JourneyNudge] Found ${stuckUsers.length} users stuck on current stage`);

    if (stuckUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users stuck on current stage',
        processed: 0,
        sent: 0,
        skipped: 0
      });
    }

    // 3. Send notifications (with rate limiting to avoid daily spam)
    const results = {
      processed: stuckUsers.length,
      sent: 0,
      skipped: 0,
      failed: 0
    };

    for (const user of stuckUsers) {
      try {
        // Check if we already sent a journey nudge in the last 3 days
        // (we don't want to nag users every day)
        const alreadySent = await wasNotificationSentRecently(
          supabase,
          user.user_id,
          'journey_nudges',
          3
        );

        if (alreadySent) {
          console.log(`[JourneyNudge] Already sent nudge to user ${user.user_id.substring(0, 8)} recently`);
          results.skipped++;
          continue;
        }

        // Generate notification with days since progress
        const notification = getJourneyNudgeNotification({
          daysSince: user.days_since_progress
        });

        // Send notification
        const sendResult = await sendToUser(
          user.user_id,
          'journey_nudges',
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
        console.error(`[JourneyNudge] Error processing user ${user.user_id}:`, error);
        results.failed++;
      }
    }

    console.log('[JourneyNudge] Cron job complete:', results);

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error: any) {
    console.error('[JourneyNudge] Fatal error in cron job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
