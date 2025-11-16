/**
 * Midday Protein Reminder Cron Job
 *
 * Runs at 2pm to nudge users who are below 50% of their protein target
 * Helps users avoid the "oops I'm short on protein" problem at night
 *
 * Schedule: Daily at 14:00 (2pm)
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getUsersBelowMiddayProteinTarget } from '@/lib/notifications/queries';
import { sendToUser, wasNotificationSentToday } from '@/lib/notifications/send';
import { getMiddayProteinNotification } from '@/lib/notifications/templates';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[MiddayProtein] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[MiddayProtein] Starting midday protein reminder cron job');

  const supabase = createAdminClient();

  try {
    // 2. Get all users below 50% of their protein target
    const usersBelowTarget = await getUsersBelowMiddayProteinTarget(supabase);

    console.log(`[MiddayProtein] Found ${usersBelowTarget.length} users below midday protein target`);

    if (usersBelowTarget.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users below midday protein target',
        processed: 0,
        sent: 0,
        skipped: 0
      });
    }

    // 3. Send notifications (with rate limiting check)
    const results = {
      processed: usersBelowTarget.length,
      sent: 0,
      skipped: 0,
      failed: 0
    };

    for (const user of usersBelowTarget) {
      try {
        // Check if we already sent this notification today
        const alreadySent = await wasNotificationSentToday(
          supabase,
          user.user_id,
          'midday_protein_reminder'
        );

        if (alreadySent) {
          console.log(`[MiddayProtein] Already sent to user ${user.user_id.substring(0, 8)} today`);
          results.skipped++;
          continue;
        }

        // Generate notification with personalized data
        const notification = getMiddayProteinNotification({
          target: user.target,
          current: user.current,
          remaining: user.remaining
        });

        // Send notification
        const sendResult = await sendToUser(
          user.user_id,
          'midday_protein_reminder',
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
        console.error(`[MiddayProtein] Error processing user ${user.user_id}:`, error);
        results.failed++;
      }
    }

    console.log('[MiddayProtein] Cron job complete:', results);

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error: any) {
    console.error('[MiddayProtein] Fatal error in cron job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
