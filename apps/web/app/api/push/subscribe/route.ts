import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, validateBody, RateLimitPresets, ErrorResponses, handleApiError } from '@/lib/api/security';
import { z } from 'zod';

// Request validation schema
const PushSubscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url('Endpoint must be a valid URL'),
    keys: z.object({
      p256dh: z.string().min(1, 'p256dh key is required'),
      auth: z.string().min(1, 'auth key is required'),
    }),
  }),
  userId: z.string().optional(), // Legacy field, ignored
  resubscribe: z.boolean().optional(),
});

/**
 * POST /api/push/subscribe
 *
 * Registers a web push subscription (Service Worker based)
 * Saves subscription to push_subscriptions table with endpoint, p256dh, and auth keys
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting check (STANDARD - write operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'push-subscribe',
    });

    if (!rateLimit.allowed) {
      console.log('[PushSubscribe] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    // Validate request body
    const validation = await validateBody(request, PushSubscribeSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { subscription, resubscribe } = validation.data;
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
        user_agent: request.headers.get('user-agent') || undefined,
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
      console.error('[PushSubscribe] Database error saving subscription:', dbError);
      throw new Error(`Failed to save subscription: ${dbError.message}`);
    }

    console.log('[PushSubscribe] Web push subscription saved successfully:', {
      subscriptionId: savedSubscription.id.substring(0, 8),
      userId: user.id.substring(0, 8)
    });

    return NextResponse.json({
      ok: true,
      message: 'Subscription saved successfully',
      subscriptionId: savedSubscription.id
    });
  } catch (error) {
    console.error('[PushSubscribe] Fatal error:', error);
    return handleApiError(error, 'PushSubscribe');
  }
}
