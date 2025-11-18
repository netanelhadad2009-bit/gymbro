import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/webpush';
import { subscriptions as subscriptionsStore } from '../subscriptions-store';
import { requireAuth, checkRateLimit, RateLimitPresets, requireDevelopment, handleApiError } from '@/lib/api/security';

export async function POST(request: NextRequest) {
  try {
    // Development-only endpoint
    requireDevelopment();

    // Rate limiting (STRICT - test endpoint)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.strict,
      keyPrefix: 'push-test',
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Rate limit exceeded',
          retryAfter: rateLimit.resetAt
        },
        { status: 429 }
      );
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user } = auth;

    console.log('[PushTest] Test notification request from:', user.id.substring(0, 8));

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
  } catch (error) {
    console.error('[PushTest] Test notification error:', error);
    return handleApiError(error, 'PushTest');
  }
}

// Also support GET for easy testing in browser
export async function GET(request: NextRequest) {
  try {
    // Development-only endpoint
    requireDevelopment();

    return POST(request);
  } catch (error) {
    return handleApiError(error, 'PushTestGet');
  }
}
