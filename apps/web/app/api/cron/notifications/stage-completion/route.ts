/**
 * Stage Completion Notification Cron Job
 *
 * Runs every 15 minutes to check for recent stage completions
 * Celebrates progress and encourages users to continue their journey
 *
 * Schedule: Every 15 minutes
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getRecentStageCompletions } from '@/lib/notifications/queries';
import { sendToUser, wasNotificationSentRecently } from '@/lib/notifications/send';
import { getStageCompletionNotification } from '@/lib/notifications/templates';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[StageCompletion] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[StageCompletion] Starting stage completion notification cron job');

  const supabase = createAdminClient();

  try {
    // 2. Get recent stage completions (last 30 minutes to account for cron delays)
    const recentCompletions = await getRecentStageCompletions(supabase, 0.5);  // 30 minutes

    console.log(`[StageCompletion] Found ${recentCompletions.length} recent stage completions`);

    if (recentCompletions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No recent stage completions',
        processed: 0,
        sent: 0,
        skipped: 0
      });
    }

    // 3. Send notifications (with rate limiting to avoid duplicate celebrations)
    const results = {
      processed: recentCompletions.length,
      sent: 0,
      skipped: 0,
      failed: 0
    };

    for (const completion of recentCompletions) {
      try {
        // Check if we already sent a stage completion notification recently (last 6 hours)
        // to avoid spamming if user completes multiple stages
        const alreadySent = await wasNotificationSentRecently(
          supabase,
          completion.user_id,
          'stage_completion_alerts',
          0.25  // Last 6 hours (0.25 days)
        );

        if (alreadySent) {
          console.log(`[StageCompletion] Already sent celebration to user ${completion.user_id.substring(0, 8)} recently`);
          results.skipped++;
          continue;
        }

        // Generate notification with stage name
        const notification = getStageCompletionNotification({
          stageName: completion.stage_name
        });

        // Send notification
        const sendResult = await sendToUser(
          completion.user_id,
          'stage_completion_alerts',
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
        console.error(`[StageCompletion] Error processing completion for user ${completion.user_id}:`, error);
        results.failed++;
      }
    }

    console.log('[StageCompletion] Cron job complete:', results);

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error: any) {
    console.error('[StageCompletion] Fatal error in cron job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
