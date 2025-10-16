import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, platform, deviceId } = body;

    console.log('[API] Native push token registered:', {
      token: token?.substring(0, 20) + '...',
      platform,
      deviceId
    });

    // In a real app, you would:
    // 1. Save the token to a database
    // 2. Associate it with the user
    // 3. Use it to send notifications via APNS (iOS) or FCM (Android)

    // For now, just store in memory or localStorage for testing
    // You'll need a backend service to actually send notifications

    return NextResponse.json({
      success: true,
      message: 'Token registered successfully'
    });
  } catch (error) {
    console.error('[API] Error registering native token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register token' },
      { status: 500 }
    );
  }
}