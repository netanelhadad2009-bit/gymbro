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

    console.log('[API] Native push token registration:', {
      userId: user.id.substring(0, 8),
      token: token?.substring(0, 20) + '...',
      platform,
      deviceId
    });

    // Save or update subscription in database
    // Use upsert to handle re-registrations (e.g., app reinstall)
    const { data: subscription, error: dbError } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        platform,
        token,
        device_id: deviceId,
        user_agent: request.headers.get('user-agent') || undefined,
        active: true,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,platform,token',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (dbError) {
      console.error('[PushRegisterNative] Database error saving token:', dbError);
      throw new Error(`Failed to save token: ${dbError.message}`);
    }

    console.log('[PushRegisterNative] Token saved successfully:', {
      subscriptionId: subscription.id.substring(0, 8),
      userId: user.id.substring(0, 8),
      platform
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