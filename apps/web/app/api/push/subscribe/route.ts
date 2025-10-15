import { NextResponse } from 'next/server';
import { subscriptions } from '../subscriptions-store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subscription, userId, resubscribe } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { ok: false, error: 'Invalid subscription object' },
        { status: 400 }
      );
    }

    // Store subscription (using endpoint as key for upsert behavior)
    const endpoint = subscription.endpoint;
    subscriptions.set(endpoint, {
      subscription,
      userId,
      createdAt: new Date()
    });

    console.log('[API] Push subscription saved:', {
      endpoint: endpoint.substring(0, 50) + '...',
      userId,
      resubscribe,
      totalSubscriptions: subscriptions.size
    });

    // TODO: In production, persist to Supabase:
    // const supabase = await createServerSupabaseClient();
    // await supabase.from('push_subscriptions').upsert({
    //   endpoint,
    //   p256dh: subscription.keys.p256dh,
    //   auth: subscription.keys.auth,
    //   user_id: userId ?? null,
    //   created_at: new Date().toISOString()
    // }, { onConflict: 'endpoint' });

    return NextResponse.json({
      ok: true,
      message: 'Subscription saved successfully'
    });
  } catch (e: any) {
    console.error('[API] Error saving push subscription:', e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'unknown' },
      { status: 500 }
    );
  }
}

// Note: subscriptions store is in-memory and should be replaced with Supabase in production
