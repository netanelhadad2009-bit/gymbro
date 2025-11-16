import { NextResponse } from "next/server";
import { createServerSupabaseClientWithAuth } from "@/lib/supabase-server";
import { normalizePersona } from "@/lib/persona/normalize";
import { resolveAvatar, type OnboardingAnswers } from "@/lib/avatar/resolveAvatar";

export const dynamic = "force-dynamic";

/**
 * POST /api/avatar/bootstrap
 *
 * Creates or updates user's persona (avatar) based on profile data.
 * Stores individual persona columns in public.avatars table.
 * Idempotent: If avatar already exists, returns existing persona.
 *
 * Requirements:
 * - User must be authenticated (via cookies or Bearer token)
 * - User must have profile data
 *
 * Returns:
 * - 200: Avatar created/updated and persona returned
 * - 401: Not authenticated
 * - 400: Missing required profile data
 * - 500: Server error
 */
export async function POST() {
  try {
    // 1. Check authentication (supports both cookies and Bearer tokens)
    const supabase = await createServerSupabaseClientWithAuth();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log("[Avatar Bootstrap] Processing for user:", userId.substring(0, 8));

    // 2. Check if avatar already exists
    const { data: existingAvatar, error: fetchError } = await supabase
      .from("avatars")
      .select("user_id, gender, goal, diet, frequency, experience, avatar_id, confidence, matched_rules, reasons, created_at, updated_at")
      .eq("user_id", userId)
      .single();

    if (existingAvatar && !fetchError) {
      const personaKey = `${existingAvatar.gender}_${existingAvatar.goal}_${existingAvatar.diet}`;
      console.log("[Avatar Bootstrap] Avatar already exists:", personaKey);
      return NextResponse.json({
        ok: true,
        persona: {
          gender: existingAvatar.gender,
          goal: existingAvatar.goal,
          diet: existingAvatar.diet,
          frequency: existingAvatar.frequency,
          experience: existingAvatar.experience,
        },
        avatar: {
          avatarId: existingAvatar.avatar_id,
          confidence: existingAvatar.confidence,
          matchedRules: existingAvatar.matched_rules,
          reasons: existingAvatar.reasons,
        },
        personaKey,
        alreadyExists: true,
        createdAt: existingAvatar.created_at,
        updatedAt: existingAvatar.updated_at,
      });
    }

    // 3. Get user profile (create if doesn't exist)
    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // If profile doesn't exist, create it
    if (profileError && (profileError.code === 'PGRST116' || profileError.message?.includes("database_error"))) {
      console.log("[Avatar Bootstrap] Profile not found or invalid → creating...");
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("[Avatar Bootstrap] Failed to create profile:", createError);
        return NextResponse.json(
          { ok: false, error: "profile_creation_failed", message: createError.message },
          { status: 500 }
        );
      }

      profile = newProfile;
      console.log("[Avatar Bootstrap] Profile created successfully");
    } else if (profileError) {
      console.error("[Avatar Bootstrap] Failed to fetch profile:", profileError);
      return NextResponse.json(
        { ok: false, error: "database_error", message: profileError.message },
        { status: 500 }
      );
    }

    // 4. Normalize persona attributes from profile
    const persona = normalizePersona({
      gender: profile.gender,
      goal: profile.goal,
      diet: profile.diet,
      frequency: profile.training_frequency_actual || profile.frequency,
      experience: profile.experience,
    });

    const personaKey = `${persona.gender}_${persona.goal}_${persona.diet}`;
    console.log("[Avatar Bootstrap] Normalized persona:", personaKey, persona);

    // 5. Resolve avatar based on persona
    const onboardingAnswers: OnboardingAnswers = {
      gender: profile.gender,
      goal: profile.goal,
      experience: profile.experience,
      frequency: profile.training_frequency_actual || profile.frequency,
      diet: profile.diet,
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg,
      bmi: profile.bmi,
      birthdate: profile.birthdate,
    };

    const resolvedAvatar = resolveAvatar(onboardingAnswers);
    console.log("[Avatar Bootstrap] Resolved avatar:", {
      avatarId: resolvedAvatar.avatarId,
      confidence: resolvedAvatar.confidence,
      matchedRules: resolvedAvatar.matchedRules.length,
    });

    // 6. Save to public.avatars table (now includes avatar_id and resolution data)
    const { data: savedAvatar, error: upsertError } = await supabase
      .from("avatars")
      .upsert(
        {
          user_id: userId,
          gender: persona.gender,
          goal: persona.goal,
          diet: persona.diet,
          frequency: persona.frequency,
          experience: persona.experience,
          avatar_id: resolvedAvatar.avatarId,
          confidence: resolvedAvatar.confidence,
          matched_rules: resolvedAvatar.matchedRules,
          reasons: resolvedAvatar.reasons,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("[Avatar Bootstrap] Failed to save avatar:", upsertError);
      return NextResponse.json(
        { ok: false, error: "database_error", message: "Failed to save persona to avatars table", details: upsertError },
        { status: 500 }
      );
    }

    console.log("[Avatar Bootstrap] Avatar saved successfully:", personaKey);

    return NextResponse.json({
      ok: true,
      persona,
      avatar: {
        avatarId: resolvedAvatar.avatarId,
        confidence: resolvedAvatar.confidence,
        matchedRules: resolvedAvatar.matchedRules,
        reasons: resolvedAvatar.reasons,
      },
      personaKey,
      alreadyExists: false,
      createdAt: savedAvatar.created_at,
      updatedAt: savedAvatar.updated_at,
    });

  } catch (err: any) {
    console.error("[Avatar Bootstrap] Fatal error:", err?.message, err?.stack);
    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        message: err?.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}
