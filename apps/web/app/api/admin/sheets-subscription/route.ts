/**
 * API Route: Log Subscription Purchase to Google Sheets
 *
 * This endpoint logs subscription purchases to the Registered_With_Sub sheet.
 * It's called fire-and-forget from the client after a successful purchase.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  appendRegisteredWithSub,
  removeFromRegisteredNoSub,
  ExportableProfile,
  ExportableSubscription,
} from "@/lib/googleSheets";
import { notifyNewPurchase } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.id) {
      return NextResponse.json(
        { ok: false, error: "id is required" },
        { status: 400 }
      );
    }
    if (!body.plan) {
      return NextResponse.json(
        { ok: false, error: "plan is required" },
        { status: 400 }
      );
    }

    // Build exportable profile
    const profile: ExportableProfile = {
      id: String(body.id),
      email: body.email ?? null,
      full_name: body.full_name ?? null,
      device_id: body.device_id ?? null,
      created_at: body.created_at ?? null,
      onboarding_started_at: body.onboarding_started_at ?? null,
      onboarding_completed_at: body.onboarding_completed_at ?? null,
      source: body.source ?? null,
    };

    const subscription: ExportableSubscription = {
      plan: body.plan,
      status: body.status ?? "active",
    };

    console.log("[SheetsSubscription] Logging subscription to Google Sheets:", {
      id: profile.id,
      email: profile.email,
      plan: subscription.plan,
    });

    // Log to Registered_With_Sub sheet and remove from Registered_No_Sub
    console.log("[SheetsSubscription] Adding to Registered_With_Sub and removing from Registered_No_Sub");
    console.log("[SheetsSubscription] User ID for removal:", profile.id);

    void appendRegisteredWithSub(profile, subscription);
    void removeFromRegisteredNoSub(profile.id).then((removed) => {
      console.log(`[SheetsSubscription] Remove from Registered_No_Sub result: ${removed ? 'SUCCESS' : 'NOT_FOUND'}`);
    }).catch((err) => {
      console.error("[SheetsSubscription] Remove from Registered_No_Sub error:", err);
    });

    // Fire-and-forget: Send WhatsApp notification
    void notifyNewPurchase({
      email: profile.email,
      fullName: profile.full_name ?? null,
      plan: subscription.plan ?? "unknown",
      status: subscription.status ?? "active",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SheetsSubscription] Error:", error);
    // Return success anyway - sheets logging is best-effort
    return NextResponse.json({ ok: true });
  }
}
