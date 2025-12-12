import { NextRequest, NextResponse } from "next/server";
import { sendNewSubscriptionEmail } from "@/lib/email/adminNotifications";
import { requireAuth, checkRateLimit, RateLimitPresets, ErrorResponses } from "@/lib/api/security";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting to prevent abuse
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.strict,
      keyPrefix: 'admin-notify-sub',
    });

    if (!rateLimit.allowed) {
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user } = auth;

    const body = await request.json();
    const {
      plan,
      status,
      appleOriginalTransactionId,
      appleProductId,
      createdAt,
    } = body;

    // Use authenticated user's ID - never trust client-provided userId
    const userId = user.id;

    // Fire-and-forget: don't await, let email send in background
    sendNewSubscriptionEmail({
      userId,
      plan: plan ?? null,
      status: status ?? null,
      appleOriginalTransactionId: appleOriginalTransactionId ?? null,
      appleProductId: appleProductId ?? null,
      createdAt: createdAt ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] notify-subscription error:", error);
    // Return success anyway - email is best-effort
    return NextResponse.json({ success: true });
  }
}
