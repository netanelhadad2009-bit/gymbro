/**
 * API Route: Log User Signup to Google Sheets
 *
 * This endpoint logs new user signups to the AllUsers and Registered_No_Sub sheets.
 * It's called fire-and-forget from the client after a successful signup.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  appendAllUsers,
  appendRegisteredNoSub,
  ExportableProfile,
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

    // Build exportable profile
    const profile: ExportableProfile = {
      id: String(body.id),
      email: body.email ?? null,
      full_name: body.full_name ?? null,
      device_id: body.device_id ?? null,
      created_at: body.created_at ?? new Date().toISOString(),
      onboarding_started_at: body.onboarding_started_at ?? null,
      onboarding_completed_at: body.onboarding_completed_at ?? null,
      source: body.source ?? null,
    };

    console.log("[SheetsSignup] Logging signup to Google Sheets:", {
      id: profile.id,
      email: profile.email,
    });

    // Fire-and-forget: Log to both sheets (all users + no subscription)
    // New signups don't have a subscription yet
    void appendAllUsers(profile, { plan: null, status: null });
    void appendRegisteredNoSub(profile);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SheetsSignup] Error:", error);
    // Return success anyway - sheets logging is best-effort
    return NextResponse.json({ ok: true });
  }
}
