import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireDevelopment, requireAuth, handleApiError } from "@/lib/api/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Visible Self-Test Endpoint (DEV ONLY)
 *
 * Tests end-to-end visibility under RLS:
 * 1. Gets current user from cookies
 * 2. Inserts a test message with user_id = user.id
 * 3. Selects the message back
 * 4. Verifies user_id matches
 *
 * This validates: auth → insert (user_id set) → select (RLS visible)
 *
 * Usage:
 *   POST http://localhost:3000/api/coach/visible-self-test
 */

export async function POST(request: NextRequest) {
  // Block in production
  const devGuard = requireDevelopment(request);
  if (devGuard) {
    return devGuard;
  }

  try {
    // Require authentication even in dev
    const auth = await requireAuth();
    if (!auth.success) {
      console.error("[Visible Self-Test] Authentication failed");
      return auth.response;
    }
    const { user, supabase } = auth;

    console.log("[Visible Self-Test] Testing for user:", user.id);

    // 2) Insert test message with user_id = user.id
    const testPayload = {
      user_id: user.id,
      role: "user" as const,
      content: "__visibility_test__",
      profile_snapshot: {},
    };

    console.log("[Visible Self-Test] Inserting with user_id:", user.id);

    const { data: inserted, error: insertErr } = await supabase
      .from("ai_messages")
      .insert(testPayload)
      .select("id, user_id, role, content, created_at")
      .single();

    if (insertErr) {
      console.error("[Visible Self-Test] Insert failed:", insertErr);
      return NextResponse.json(
        {
          ok: false,
          stage: "insert",
          user_id: user.id,
          error: insertErr.message,
          code: insertErr.code,
          details: insertErr.details,
        },
        { status: 500 }
      );
    }

    console.log("[Visible Self-Test] Inserted message:", inserted.id, "with user_id:", inserted.user_id);

    // 3) Select the message back (tests RLS visibility)
    const { data: selected, error: selectErr } = await supabase
      .from("ai_messages")
      .select("id, user_id, role, content, created_at")
      .eq("id", inserted.id)
      .single();

    if (selectErr) {
      console.error("[Visible Self-Test] Select failed:", selectErr);

      // Clean up
      await supabase.from("ai_messages").delete().eq("id", inserted.id);

      return NextResponse.json(
        {
          ok: false,
          stage: "select",
          user_id: user.id,
          inserted_id: inserted.id,
          inserted_user_id: inserted.user_id,
          error: selectErr.message,
          code: selectErr.code,
          details: selectErr.details,
        },
        { status: 500 }
      );
    }

    console.log("[Visible Self-Test] Selected message:", selected.id, "with user_id:", selected.user_id);

    // 4) Verify user_id matches
    const userIdMatches = selected.user_id === user.id;

    // 5) Get count of all visible messages
    const { count, error: countErr } = await supabase
      .from("ai_messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countErr) {
      console.error("[Visible Self-Test] Count failed:", countErr);
    }

    // 6) Clean up test message
    const { error: deleteErr } = await supabase
      .from("ai_messages")
      .delete()
      .eq("id", inserted.id);

    if (deleteErr) {
      console.error("[Visible Self-Test] Delete cleanup failed:", deleteErr);
    }

    // 7) Success response
    console.log("[Visible Self-Test] Test passed!");

    return NextResponse.json({
      ok: true,
      message: "✅ Visibility test passed",
      auth: {
        user_id: user.id,
        email: user.email,
      },
      insert: {
        id: inserted.id,
        user_id: inserted.user_id,
        success: true,
      },
      select: {
        id: selected.id,
        user_id: selected.user_id,
        success: true,
      },
      verification: {
        user_id_matches: userIdMatches,
        expected: user.id,
        actual: selected.user_id,
      },
      visibility: {
        total_messages: count ?? "unknown",
      },
    });
  } catch (error: any) {
    console.error("[Visible Self-Test] Unexpected error:", error);
    return handleApiError(error, 'CoachVisibleSelfTest');
  }
}
