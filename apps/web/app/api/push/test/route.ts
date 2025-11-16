import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/webpush';
import { subscriptions as subscriptionsStore } from '../subscriptions-store';

export async function POST(req: Request) {
  try {
    // Get the most recent subscription from our store
    if (!subscriptionsStore || subscriptionsStore.size === 0) {
      return NextResponse.json(
        { ok: false, error: 'No subscriptions found. Please subscribe first.' },
        { status: 404 }
      );
    }

    // Get the last added subscription
    const lastSubscription = Array.from(subscriptionsStore.values()).pop();

    if (!lastSubscription) {
      return NextResponse.json(
        { ok: false, error: 'No valid subscription found' },
        { status: 404 }
      );
    }

    console.log('[API] Sending test notification...');

    // Send test notification
    const payload = {
      title: 'FitJourney 💪',
      body: 'זוהי תזכורת בדיקה מ-FitJourney!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'test-notification',
      data: {
        url: '/',
        type: 'test'
      }
    };

    try {
      await sendPushNotification(lastSubscription.subscription, payload);

      return NextResponse.json({
        ok: true,
        message: 'Test notification sent successfully'
      });
    } catch (error: any) {
      // Handle expired subscriptions
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log('[API] Subscription expired (410/404)');
        return NextResponse.json(
          {
            ok: false,
            error: 'Subscription expired. Please re-subscribe.',
            statusCode: error.statusCode
          },
          { status: 410 }
        );
      }

      throw error;
    }
  } catch (e: any) {
    console.error('[API] Test notification error:', e);
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || 'Failed to send test notification',
        details: e?.body || e?.stack
      },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing in browser
export async function GET(req: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { ok: false, error: 'GET endpoint only available in development' },
      { status: 403 }
    );
  }

  return POST(req);
}
