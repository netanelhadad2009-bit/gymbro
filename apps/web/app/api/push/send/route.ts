/**
 * Admin Push Notification Endpoint
 * Sends push notifications to users via APNs (iOS), FCM (Android), or Web Push
 *
 * POST /api/push/send
 *
 * Body:
 * - userId: string (optional) - Target user ID. If not provided, uses authenticated user
 * - title: string - Notification title
 * - body: string - Notification body
 * - route?: string - Deep link route (e.g., '/nutrition')
 * - type?: string - Notification type for categorization (default: 'test')
 * - data?: object - Additional data to include
 *
 * Requires ADMIN_SECRET header for non-authenticated requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendToUser } from '@/lib/notifications/send';
import { sendAPNsPush, isAPNsConfigured } from '@/lib/apns';
import { requireAuth, handleApiError } from '@/lib/api/security';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

interface SendRequest {
  userId?: string;
  deviceToken?: string;  // Direct device token for testing
  title: string;
  body: string;
  route?: string;
  type?: string;
  data?: Record<string, any>;
  platform?: 'all' | 'ios' | 'web';  // Target platform filter
}

export async function POST(request: NextRequest) {
  try {
    // Check for admin secret or authenticated user
    const adminSecret = request.headers.get('x-admin-secret');
    let userId: string | undefined;

    if (adminSecret === ADMIN_SECRET && ADMIN_SECRET) {
      // Admin access - can send to any user
      console.log('[PushSend] Admin access granted');
    } else {
      // Regular auth - can only send to self
      const auth = await requireAuth();
      if (!auth.success) {
        return auth.response;
      }
      userId = auth.user.id;
    }

    const body: SendRequest = await request.json();

    // Validate required fields
    if (!body.title || !body.body) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: title, body' },
        { status: 400 }
      );
    }

    // Direct device token test (for development/testing)
    if (body.deviceToken) {
      if (!isAPNsConfigured()) {
        return NextResponse.json(
          {
            ok: false,
            error: 'APNs not configured. Required env vars: APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_P8'
          },
          { status: 500 }
        );
      }

      console.log('[PushSend] Sending direct APNs push to device token');

      const result = await sendAPNsPush(body.deviceToken, {
        alert: {
          title: body.title,
          body: body.body
        },
        sound: 'default',
        data: {
          url: body.route || '/',
          type: body.type || 'test',
          ...body.data
        }
      });

      return NextResponse.json({
        ok: result.success,
        result,
        apnsConfigured: true
      });
    }

    // Target user (admin can specify, regular users can only target themselves)
    const targetUserId = adminSecret ? (body.userId || userId) : userId;

    if (!targetUserId) {
      return NextResponse.json(
        { ok: false, error: 'No target user specified' },
        { status: 400 }
      );
    }

    console.log(`[PushSend] Sending notification to user ${targetUserId.substring(0, 8)}...`);

    // Use the notification system to send
    const result = await sendToUser(targetUserId, body.type || 'test', {
      title: body.title,
      body: body.body,
      route: body.route,
      data: body.data
    });

    return NextResponse.json({
      ok: result.success,
      result,
      apnsConfigured: isAPNsConfigured()
    });

  } catch (error) {
    console.error('[PushSend] Error:', error);
    return handleApiError(error, 'PushSend');
  }
}

/**
 * GET /api/push/send - Get push configuration status
 */
export async function GET(request: NextRequest) {
  try {
    // Check for admin secret
    const adminSecret = request.headers.get('x-admin-secret');

    if (adminSecret !== ADMIN_SECRET || !ADMIN_SECRET) {
      const auth = await requireAuth();
      if (!auth.success) {
        return auth.response;
      }
    }

    const supabase = createAdminClient();

    // Get subscription counts
    const { count: totalSubs } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true });

    const { count: iosSubs } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('platform', 'ios')
      .eq('active', true);

    const { count: webSubs } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('platform', 'web')
      .eq('active', true);

    return NextResponse.json({
      ok: true,
      config: {
        apns: {
          configured: isAPNsConfigured(),
          keyId: process.env.APNS_KEY_ID ? '***' + process.env.APNS_KEY_ID.slice(-4) : null,
          teamId: process.env.APNS_TEAM_ID ? '***' + process.env.APNS_TEAM_ID.slice(-4) : null,
          bundleId: process.env.APNS_BUNDLE_ID || 'com.fitjourney.app'
        },
        webPush: {
          configured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
          publicKey: process.env.VAPID_PUBLIC_KEY ? '***' + process.env.VAPID_PUBLIC_KEY.slice(-8) : null
        }
      },
      subscriptions: {
        total: totalSubs || 0,
        ios: iosSubs || 0,
        web: webSubs || 0
      }
    });

  } catch (error) {
    console.error('[PushSend] Config check error:', error);
    return handleApiError(error, 'PushSendConfig');
  }
}
