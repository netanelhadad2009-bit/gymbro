import { NextResponse } from "next/server";
import { loadUserContext } from "@/lib/coach/loadUserContext";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Debug endpoint to verify Coach API has access to user data
 *
 * GET /api/coach/context
 *
 * Returns:
 * - raw.profile: Direct data from profiles table
 * - raw.snapshot: Most recent profile_snapshot from ai_messages
 * - raw.metadata: user_metadata from auth.user()
 * - raw.avatar: Persona data from avatars table
 * - merged: Final context after multi-source merge
 * - sources: Which source provided each field (in server logs)
 *
 * Use this to debug missing height/weight or other profile fields.
 */
export async function GET() {
  try {
    const supabase = supabaseServer();

    // Get authenticated user
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = user.id;

    // 1) Load raw profile data
    const { data: rawProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // 2) Load raw snapshot from most recent AI message
    const { data: rawSnapshot } = await supabase
      .from('ai_messages')
      .select('profile_snapshot, created_at')
      .eq('user_id', userId)
      .not('profile_snapshot', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3) Get user_metadata
    const rawMetadata = user.user_metadata || {};

    // 4) Load raw avatar
    const { data: rawAvatar } = await supabase
      .from('avatars')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // 5) Load merged context (uses loadUserContext with source tracking)
    const merged = await loadUserContext();

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      userId,
      raw: {
        profile: rawProfile,
        snapshot: rawSnapshot?.profile_snapshot || null,
        snapshotDate: rawSnapshot?.created_at || null,
        metadata: rawMetadata,
        avatar: rawAvatar,
      },
      merged,
      keys: Object.keys(merged),
      hint: 'Check raw.profile for height_cm/weight_kg. If missing there, check snapshot/metadata. Merged shows final result with source tracking in server logs.',
    });
  } catch (error: any) {
    console.error("[Coach Context Debug] Unexpected error:", error?.message || error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
        stage: "unknown",
      },
      { status: 500 }
    );
  }
}
