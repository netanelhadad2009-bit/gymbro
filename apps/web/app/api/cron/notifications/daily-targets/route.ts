/**
 * Daily Protein Target Reminder Cron Job
 *
 * Runs every evening at 8pm to remind users who haven't met their daily protein target
 * Checks if user has consumed enough protein and sends reminder if not
 *
 * Schedule: Daily at 20:00 (8pm)
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getUsersNeedingProteinReminder } from '@/lib/notifications/queries';
import { sendToUser, wasNotificationSentToday } from '@/lib/notifications/send';
import { getDailyProteinTargetNotification } from '@/lib/notifications/templates';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[DailyTargets] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[DailyTargets] Starting daily protein target reminder cron job');

  const supabase = createAdminClient();

  try {
    // 2. Get all users who need a protein reminder (remaining >= 10g)
    const usersNeedingReminder = await getUsersNeedingProteinReminder(supabase, 10);

    console.log(`[DailyTargets] Found ${usersNeedingReminder.length} users needing protein reminder`);

    if (usersNeedingReminder.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users need protein reminder',
        processed: 0,
        sent: 0,
        skipped: 0
      });
    }

    // 3. Send notifications (with rate limiting check)
    const results = {
      processed: usersNeedingReminder.length,
      sent: 0,
      skipped: 0,
      failed: 0
    };

    for (const user of usersNeedingReminder) {
      try {
        // Check if we already sent this notification today
        const alreadySent = await wasNotificationSentToday(
          supabase,
          user.user_id,
          'daily_protein_reminder'
        );

        if (alreadySent) {
          console.log(`[DailyTargets] Already sent to user ${user.user_id.substring(0, 8)} today`);
          results.skipped++;
          continue;
        }

        // Generate notification with personalized data
        const notification = getDailyProteinTargetNotification({
          target: user.target,
          current: user.current,
          remaining: user.remaining
        });

        // Send notification
        const sendResult = await sendToUser(
          user.user_id,
          'daily_protein_reminder',
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
        console.error(`[DailyTargets] Error processing user ${user.user_id}:`, error);
        results.failed++;
      }
    }

    console.log('[DailyTargets] Cron job complete:', results);

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error: any) {
    console.error('[DailyTargets] Fatal error in cron job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
