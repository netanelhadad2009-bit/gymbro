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
  appendMarketingOptIn,
  removeFromOnboardingStartedNoSignup,
  ExportableProfile,
} from "@/lib/googleSheets";
import { notifyNewSignup } from "@/lib/whatsapp";
import { requireAuth, checkRateLimit, RateLimitPresets, ErrorResponses } from "@/lib/api/security";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting to prevent abuse
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.strict,
      keyPrefix: 'admin-sheets-signup',
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

    // Build exportable profile - use authenticated user's ID, not client-provided
    const profile: ExportableProfile = {
      id: user.id,
      email: user.email ?? body.email ?? null,
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

    // Fire-and-forget: Send WhatsApp notification
    void notifyNewSignup({
      email: profile.email,
      fullName: profile.full_name ?? null,
      source: profile.source ?? null,
    });

    // If user opted in to marketing emails, add to "fitjourney mail yes" sheet
    if (body.accept_marketing && profile.email) {
      console.log("[SheetsSignup] User opted in to marketing emails:", profile.email);
      void appendMarketingOptIn(profile.email);
    }

    // If user has a device_id, remove them from Onboarding_Started_No_Signup
    // (they were tracked there before signing up)
    if (profile.device_id) {
      console.log("[SheetsSignup] Removing from Onboarding_Started_No_Signup, device_id:", profile.device_id);
      void removeFromOnboardingStartedNoSignup(profile.device_id).then((removed) => {
        console.log(`[SheetsSignup] Remove from Onboarding_Started_No_Signup result: ${removed ? 'SUCCESS' : 'NOT_FOUND'}`);
      }).catch((err) => {
        console.error("[SheetsSignup] Remove from Onboarding_Started_No_Signup error:", err);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SheetsSignup] Error:", error);
    // Return success anyway - sheets logging is best-effort
    return NextResponse.json({ ok: true });
  }
}
