import { NextResponse } from 'next/server';
import { createServerSupabaseClientWithAuth } from '@/lib/supabase-server';

/**
 * POST /api/push/register-native
 *
 * Registers a native push notification token (iOS APNS or Android FCM)
 * Saves token to push_subscriptions table associated with authenticated user
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, platform, deviceId } = body;

    // Validate required fields
    if (!token || !platform) {
      return NextResponse.json(
        { success: false, error: 'Token and platform are required' },
        { status: 400 }
      );
    }

    // Validate platform
    if (!['ios', 'android'].includes(platform)) {
      return NextResponse.json(
        { success: false, error: 'Platform must be ios or android' },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabase = await createServerSupabaseClientWithAuth();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[API] Auth error:', authError?.message || 'No user');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
      console.error('[API] Database error saving token:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to save token' },
        { status: 500 }
      );
    }

    console.log('[API] Token saved successfully:', {
      subscriptionId: subscription.id.substring(0, 8),
      userId: user.id.substring(0, 8),
      platform
    });

    return NextResponse.json({
      success: true,
      message: 'Token registered successfully',
      subscriptionId: subscription.id
    });
  } catch (error: any) {
    console.error('[API] Error registering native token:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to register token' },
      { status: 500 }
    );
  }
}