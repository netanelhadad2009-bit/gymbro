/**
 * API Route: Log Subscription Purchase to Google Sheets
 *
 * This endpoint logs subscription purchases to the Registered_With_Sub sheet.
 * It's called fire-and-forget from the client after a successful purchase.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  appendRegisteredWithSub,
  ExportableProfile,
  ExportableSubscription,
} from "@/lib/googleSheets";

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

    // Fire-and-forget: Log to Registered_With_Sub sheet
    void appendRegisteredWithSub(profile, subscription);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SheetsSubscription] Error:", error);
    // Return success anyway - sheets logging is best-effort
    return NextResponse.json({ ok: true });
  }
}
