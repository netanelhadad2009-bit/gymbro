import { NextResponse } from 'next/server';
import { createServerSupabaseClientWithAuth } from '@/lib/supabase-server';

/**
 * POST /api/push/subscribe
 *
 * Registers a web push subscription (Service Worker based)
 * Saves subscription to push_subscriptions table with endpoint, p256dh, and auth keys
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subscription, userId, resubscribe } = body;

    // Validate subscription object
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { ok: false, error: 'Invalid subscription object' },
        { status: 400 }
      );
    }

    if (!subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      return NextResponse.json(
        { ok: false, error: 'Invalid subscription keys' },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabase = await createServerSupabaseClientWithAuth();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[API] Auth error:', authError?.message || 'No user');
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const endpoint = subscription.endpoint;

    console.log('[API] Web push subscription registration:', {
      userId: user.id.substring(0, 8),
      endpoint: endpoint.substring(0, 50) + '...',
      resubscribe
    });

    // Save or update subscription in database
    // Use upsert to handle re-subscriptions (e.g., browser updates)
    const { data: savedSubscription, error: dbError } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        platform: 'web',
        endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: req.headers.get('user-agent') || undefined,
        active: true,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,platform,endpoint',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (dbError) {
      console.error('[API] Database error saving subscription:', dbError);
      return NextResponse.json(
        { ok: false, error: 'Failed to save subscription' },
        { status: 500 }
      );
    }

    console.log('[API] Web push subscription saved successfully:', {
      subscriptionId: savedSubscription.id.substring(0, 8),
      userId: user.id.substring(0, 8)
    });

    return NextResponse.json({
      ok: true,
      message: 'Subscription saved successfully',
      subscriptionId: savedSubscription.id
    });
  } catch (e: any) {
    console.error('[API] Error saving push subscription:', e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'unknown' },
      { status: 500 }
    );
  }
}
