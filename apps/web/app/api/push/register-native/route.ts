import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, validateBody, RateLimitPresets, ErrorResponses, handleApiError } from '@/lib/api/security';
import { z } from 'zod';

// Request validation schema
const RegisterNativeSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  platform: z.enum(['ios', 'android']),
  deviceId: z.string().optional(),
});

/**
 * POST /api/push/register-native
 *
 * Registers a native push notification token (iOS APNS or Android FCM)
 * Saves token to push_subscriptions table associated with authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting check (STANDARD - write operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'push-register-native',
    });

    if (!rateLimit.allowed) {
      console.log('[PushRegisterNative] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    // Validate request body
    const validation = await validateBody(request, RegisterNativeSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { token, platform, deviceId } = validation.data;

    console.log('[PushRegisterNative] Native push token registration:', {
      userId: user.id.substring(0, 8),
      token: token?.substring(0, 20) + '...',
      platform,
      deviceId
    });

    // First, check if an active subscription already exists for this user+platform+token
    const { data: existing, error: findError } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('token', token)
      .eq('active', true)
      .maybeSingle();

    if (findError) {
      console.error('[PushRegisterNative] Error finding existing subscription:', findError);
    }

    let subscription;
    let dbError;

    if (existing) {
      // Update existing subscription
      console.log('[PushRegisterNative] Updating existing subscription:', existing.id.substring(0, 8));
      const result = await supabase
        .from('push_subscriptions')
        .update({
          device_id: deviceId,
          user_agent: request.headers.get('user-agent') || undefined,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      subscription = result.data;
      dbError = result.error;
    } else {
      // Deactivate any old subscriptions for this user+platform first
      await supabase
        .from('push_subscriptions')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('platform', platform)
        .eq('active', true);

      // Insert new subscription
      console.log('[PushRegisterNative] Creating new subscription');
      const result = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          platform,
          token,
          device_id: deviceId,
          user_agent: request.headers.get('user-agent') || undefined,
          active: true,
          last_used_at: new Date().toISOString()
        })
        .select()
        .single();

      subscription = result.data;
      dbError = result.error;
    }

    if (dbError) {
      console.error('[PushRegisterNative] Database error saving token:', dbError);
      throw new Error(`Failed to save token: ${dbError.message}`);
    }

    console.log('[PushRegisterNative] ✓ Token saved successfully:', {
      subscriptionId: subscription.id.substring(0, 8),
      userId: user.id.substring(0, 8),
      platform,
      isUpdate: !!existing
    });

    return NextResponse.json({
      success: true,
      message: 'Token registered successfully',
      subscriptionId: subscription.id
    });
  } catch (error) {
    console.error('[PushRegisterNative] Fatal error:', error);
    return handleApiError(error, 'PushRegisterNative');
  }
}