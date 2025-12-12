import { NextRequest, NextResponse } from "next/server";
import { profileFingerprint } from "@/lib/storage";
import { generateNutritionPlanWithTimeout, type NutritionPayload } from "@/lib/server/nutrition/generate";
import { requireAuth, checkRateLimit, validateBody, RateLimitPresets, ErrorResponses, handleApiError } from "@/lib/api/security";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Zod schema for nutrition draft validation
const AttachDraftSchema = z.object({
  fingerprint: z.string().min(1, "Fingerprint is required"),
  status: z.enum(['ready', 'pending']).optional(),
  plan: z.any().optional(),
  calories: z.number().optional(),
});

/**
 * Helper: Finalize pending draft server-side with timeout and retry
 * Uses internal generation utility (no HTTP calls)
 */
async function finalizeServerSideIfNeeded(userId: string, draft: any, supabase: any) {
  // If already has plan, return it
  if (draft.status === 'ready' && draft.plan && typeof draft.plan === 'object') {
    return { ok: true, hasPlan: true, plan: draft.plan, fingerprint: draft.fingerprint, calories: draft.calories };
  }

  // If status is pending without plan, generate server-side
  if (draft.status === 'pending' && !draft.plan) {
    const days = 1; // Always force days=1
    console.log(`[Security][NutritionPlan] userId=${userId.substring(0, 8)} source=onboarding status=pending - triggering server-side generation`);
    console.log(`[Attach] Server-side generate start (days=${days})`);

    // Fetch user profile for generation
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("gender, birthdate, height_cm, weight_kg, target_weight_kg, activity, goal, diet")
      .eq("id", userId)
      .limit(1);

    const profile = Array.isArray(profileData) ? profileData[0] : profileData;

    // Build minimal payload with fallbacks (even if profile is missing/incomplete)
    const age = profile?.birthdate ? (() => {
      const birthDate = new Date(profile.birthdate);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      return calculatedAge;
    })() : 25;

    const payload: NutritionPayload = {
      gender: profile?.gender || "male",
      age: age,
      height_cm: profile?.height_cm || 170,
      weight_kg: profile?.weight_kg || 70,
      target_weight_kg: profile?.target_weight_kg || profile?.weight_kg || 70,
      activity: profile?.activity || "moderate",
      goal: profile?.goal || "maintain",
      diet: profile?.diet || "none",
      days: days,
    };

    // Attempt 1: Generate with 30s timeout
    try {
      const result = await generateNutritionPlanWithTimeout(payload, 30000, {
        logPrefix: '[Attach]',
        enableVerboseLogging: false,
      });

      console.log(`[Attach] Server-side generate response status=success`);
      console.log(`[Attach] Parsed hasPlan=true days=${result.plan?.days?.length || 0}`);

      return {
        ok: true,
        hasPlan: true,
        plan: result.plan,
        fingerprint: result.fingerprint,
        calories: result.calories,
      };
    } catch (firstError: any) {
      // Retry once with another 30s timeout
      if (firstError.name === 'AbortError') {
        console.warn('[Attach] First attempt timed out, retrying...');
      } else {
        console.warn('[Attach] First attempt failed:', firstError.message);
      }

      try {
        const result = await generateNutritionPlanWithTimeout(payload, 30000, {
          logPrefix: '[Attach]',
          enableVerboseLogging: false,
        });

        console.log(`[Attach] Server-side generate response status=success (retry)`);
        console.log(`[Attach] Parsed hasPlan=true days=${result.plan?.days?.length || 0}`);

        return {
          ok: true,
          hasPlan: true,
          plan: result.plan,
          fingerprint: result.fingerprint,
          calories: result.calories,
        };
      } catch (retryError: any) {
        // Both attempts failed
        if (retryError.name === 'AbortError') {
          console.error('[Attach] Server-side generate response status=timeout');
        } else {
          console.error('[Attach] Server-side generate response status=error', retryError.message);
        }

        console.log(`[Attach] Parsed hasPlan=false days=0`);

        // Return pending state - do NOT save placeholder to nutrition_plan
        return {
          ok: false,
          hasPlan: false,
          error: retryError.name === 'AbortError' ? 'timeout' : 'generation_failed',
          fingerprint: draft.fingerprint,
        };
      }
    }
  }

  // Unknown state - check if we have a plan
  if (draft.plan && typeof draft.plan === 'object') {
    return { ok: true, hasPlan: true, plan: draft.plan, fingerprint: draft.fingerprint, calories: draft.calories };
  }

  return { ok: false, hasPlan: false, error: 'no_plan', fingerprint: draft.fingerprint };
}

/**
 * POST /api/nutrition/attach
 *
 * Migrates nutrition draft from onboarding to authenticated user
 * Self-healing: creates profile if missing, generates server-side if pending
 *
 * Requirements:
 * - User must be authenticated
 * - Request body must include draft with fingerprint
 *
 * Returns:
 * - 200: Plan attached successfully (or skipped if same fingerprint)
 * - 400: Missing draft data
 * - 401: Not authenticated
 * - 500: Server error (only on unexpected DB failures)
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting check (AI preset - expensive 60s AI operation with retry!)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.ai,
      keyPrefix: 'nutrition-attach',
    });

    if (!rateLimit.allowed) {
      console.log('[NutritionAttach] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    const userId = user.id;

    // Validate request body
    const validation = await validateBody(request, AttachDraftSchema);
    if (!validation.success) {
      return validation.response;
    }

    const draft = validation.data;

    console.log(`[Attach] POST user=${userId.substring(0, 8)} fp=${draft.fingerprint.substring(0, 12)}`);

    // 2. Ensure profile exists - self-healing
    const { data: existingData, error: fetchError } = await supabase
      .from("profiles")
      .select("id, nutrition_fingerprint, nutrition_plan, nutrition_status")
      .eq("id", userId)
      .limit(1);

    const existing = Array.isArray(existingData) ? existingData[0] : existingData;

    // If profile not found or database error, create it
    if (fetchError && (fetchError.code === 'PGRST116' || fetchError.message?.includes('profile_not_found') || fetchError.message?.includes('database_error'))) {
      console.log("[Attach] Profile not found → creating...");

      const nowISO = new Date().toISOString();
      const { error: createError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          created_at: nowISO,
          updated_at: nowISO,
        });

      if (createError) {
        console.error("[Attach] Failed to create profile:", createError);
        // Continue anyway - will try to update below
      } else {
        console.log("[Attach] Profile created successfully");
      }
    }

    // 3. Short-circuit: Skip if incoming fingerprint equals existing fingerprint AND plan already exists
    // BUT: Allow retry if status is 'pending' (previous generation failed)
    if (existing && existing.nutrition_fingerprint === draft.fingerprint) {
      // If plan exists and status is 'ready', skip
      if (existing.nutrition_plan && existing.nutrition_status === 'ready') {
        console.log(`[Attach] Skipping (same fingerprint: ${draft.fingerprint.substring(0, 12)}, status: ready)`);
        return NextResponse.json({
          ok: true,
          saved: false,
          fingerprint: draft.fingerprint,
        });
      }

      // If status is 'pending', allow retry
      if (existing.nutrition_status === 'pending') {
        console.log(`[Attach] Retrying generation (same fingerprint: ${draft.fingerprint.substring(0, 12)}, status: pending)`);
        // Continue to generation below
      }
    }

    // 4. Finalize draft server-side if needed (with 30s timeout + 30s retry = 60s total)
    const finalizeResult = await finalizeServerSideIfNeeded(userId, draft, supabase);

    // 5. Persist to database based on result
    if (finalizeResult.hasPlan) {
      // We have a real plan - save it with all fields including calories
      const { error: upsertError } = await supabase
        .from("profiles")
        .update({
          nutrition_plan: finalizeResult.plan,
          nutrition_fingerprint: finalizeResult.fingerprint,
          nutrition_calories: finalizeResult.calories,
          nutrition_status: 'ready',
          nutrition_updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (upsertError) {
        console.error("[Attach] Failed to save plan:", upsertError);
        return NextResponse.json(
          { ok: false, error: "database_error", message: upsertError.message },
          { status: 500 }
        );
      }

      console.log(`[Attach] Plan saved (fingerprint: ${finalizeResult.fingerprint.substring(0, 12)})`);

      return NextResponse.json({
        ok: true,
        saved: true,
        fingerprint: finalizeResult.fingerprint,
        calories: finalizeResult.calories,
      });
    } else {
      // No plan - keep nutrition_plan=NULL, nutrition_calories=NULL, set status='pending'
      const { error: upsertError } = await supabase
        .from("profiles")
        .update({
          nutrition_plan: null,
          nutrition_fingerprint: finalizeResult.fingerprint,
          nutrition_calories: null,
          nutrition_status: 'pending',
          nutrition_updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (upsertError) {
        console.error("[Attach] Failed to save pending status:", upsertError);
        return NextResponse.json(
          { ok: false, error: "database_error", message: upsertError.message },
          { status: 500 }
        );
      }

      console.log(`[Attach] Marked pending (fingerprint: ${finalizeResult.fingerprint.substring(0, 12)})`);

      return NextResponse.json({
        ok: false,
        error: 'pending',
        fingerprint: finalizeResult.fingerprint,
      });
    }

  } catch (error) {
    console.error("[NutritionAttach] Fatal error:", error);
    return handleApiError(error, 'NutritionAttach');
  }
}
