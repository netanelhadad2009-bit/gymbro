/**
 * API Route: Log Anonymous Onboarding Start to Google Sheets
 *
 * This endpoint logs anonymous users who started the onboarding questionnaire
 * before signing up. It writes to the Onboarding_Started_No_Signup sheet.
 * Called fire-and-forget from the client when onboarding starts.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  appendOnboardingStartedNoSignup,
  OnboardingDropoffPayload,
} from "@/lib/googleSheets";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required field
    if (!body.device_id) {
      return NextResponse.json(
        { ok: false, error: "device_id is required" },
        { status: 400 }
      );
    }

    const payload: OnboardingDropoffPayload = {
      device_id: String(body.device_id),
      created_at: body.created_at ?? new Date().toISOString(),
      goals: body.goals ?? null,
      height_cm: body.height_cm ?? null,
      weight_kg: body.weight_kg ?? null,
      source: body.source ?? null,
    };

    console.log("[OnboardingStart] Logging to Google Sheets:", {
      device_id: payload.device_id,
    });

    // Fire-and-forget: Log to Onboarding_Started_No_Signup sheet
    void appendOnboardingStartedNoSignup(payload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[OnboardingStart] Error:", error);
    // Return success anyway - sheets logging is best-effort
    return NextResponse.json({ ok: true });
  }
}
