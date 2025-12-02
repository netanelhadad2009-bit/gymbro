import { NextRequest, NextResponse } from "next/server";
import { sendNewSubscriptionEmail } from "@/lib/email/adminNotifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      plan,
      status,
      appleOriginalTransactionId,
      appleProductId,
      createdAt,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

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
