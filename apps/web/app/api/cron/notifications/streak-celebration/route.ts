/**
 * Streak Celebration Cron Job
 *
 * Runs daily to celebrate users reaching streak milestones (3, 7, 14, 30 days)
 * Positively reinforces consistent behavior
 *
 * Schedule: Daily at 21:00 (9pm) - after users have had time to complete their day
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getUsersAtStreakMilestone } from '@/lib/notifications/queries';
import { sendToUser, wasNotificationSentRecently } from '@/lib/notifications/send';
import { getStreakCelebrationNotification } from '@/lib/notifications/templates';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[StreakCelebration] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[StreakCelebration] Starting streak celebration cron job');

  const supabase = createAdminClient();

  try {
    // 2. Get users at streak milestones (3, 7, 14, 30 days)
    const milestones = [3, 7, 14, 30];
    const usersAtMilestone = await getUsersAtStreakMilestone(supabase, milestones);

    console.log(`[StreakCelebration] Found ${usersAtMilestone.length} users at streak milestones`);

    if (usersAtMilestone.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users at streak milestones',
        processed: 0,
        sent: 0,
        skipped: 0
      });
    }

    // 3. Send notifications (with rate limiting to avoid duplicate celebrations)
    const results = {
      processed: usersAtMilestone.length,
      sent: 0,
      skipped: 0,
      failed: 0
    };

    for (const user of usersAtMilestone) {
      try {
        // Check if we already sent a streak celebration in the last 2 days
        // (in case streak gets recalculated or user hits milestone again)
        const alreadySent = await wasNotificationSentRecently(
          supabase,
          user.user_id,
          'streak_celebrations',
          2
        );

        if (alreadySent) {
          console.log(`[StreakCelebration] Already celebrated user ${user.user_id.substring(0, 8)} recently`);
          results.skipped++;
          continue;
        }

        // Generate celebration notification
        const notification = getStreakCelebrationNotification({
          streakDays: user.streak_days
        });

        // Send notification
        const sendResult = await sendToUser(
          user.user_id,
          'streak_celebrations',
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
        console.error(`[StreakCelebration] Error processing user ${user.user_id}:`, error);
        results.failed++;
      }
    }

    console.log('[StreakCelebration] Cron job complete:', results);

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error: any) {
    console.error('[StreakCelebration] Fatal error in cron job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
