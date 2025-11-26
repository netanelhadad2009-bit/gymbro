import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/push/register-native
 *
 * @deprecated This endpoint is no longer used.
 *
 * Native push token registration is now handled directly by the client via:
 * - setupNativePush() in lib/push-notifications-native.ts
 * - Called automatically from PremiumGate after user login
 * - Saves directly to Supabase using the authenticated client (RLS)
 *
 * This endpoint remains to prevent 404 errors from any lingering calls,
 * but it does nothing and should be removed in a future cleanup.
 */
export async function POST(request: NextRequest) {
  console.log('[PushRegisterNative] ⚠️ DEPRECATED: This endpoint is no longer used.');
  console.log('[PushRegisterNative] Token registration now happens client-side via setupNativePush()');

  return NextResponse.json({
    success: true,
    deprecated: true,
    message: 'This endpoint is deprecated. Token registration is handled client-side via setupNativePush().'
  });
}
