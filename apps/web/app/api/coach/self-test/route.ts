import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Self-test endpoint to verify RLS policies work correctly
 *
 * Tests:
 * 1. INSERT - Can insert message as authenticated user
 * 2. SELECT - Can read own messages
 * 3. DELETE - Can delete own messages
 *
 * Usage (in browser console while logged in):
 * fetch("/api/coach/self-test", { method: "POST" }).then(r => r.json()).then(console.log)
 *
 * Expected: { ok: true }
 */
export async function POST() {
  try {
    const supabase = supabaseServer();

    // Verify authentication
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      console.error("[Self-Test] Unauthorized:", userErr);
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Self-Test] Testing RLS for user:", user.id);

    // Test 1: INSERT
    const testPayload = {
      user_id: user.id,
      role: "user" as const,
      content: "__rls_test__",
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("ai_messages")
      .insert(testPayload)
      .select("id")
      .single();

    if (insertErr) {
      console.error("[Self-Test] INSERT failed:", insertErr);
      return NextResponse.json(
        {
          ok: false,
          stage: "insert",
          error: insertErr.message,
          code: insertErr.code,
          details: insertErr.details,
        },
        { status: 500 }
      );
    }

    console.log("[Self-Test] INSERT success, id:", inserted.id);

    // Test 2: SELECT (verify we can read what we just inserted)
    const { data: selected, error: selectErr } = await supabase
      .from("ai_messages")
      .select("id")
      .eq("id", inserted.id)
      .single();

    if (selectErr) {
      console.error("[Self-Test] SELECT failed:", selectErr);
      // Clean up
      await supabase.from("ai_messages").delete().eq("id", inserted.id);
      return NextResponse.json(
        {
          ok: false,
          stage: "select",
          error: selectErr.message,
          code: selectErr.code,
          details: selectErr.details,
        },
        { status: 500 }
      );
    }

    console.log("[Self-Test] SELECT success, id:", selected.id);

    // Test 3: DELETE
    const { error: deleteErr } = await supabase
      .from("ai_messages")
      .delete()
      .eq("id", inserted.id);

    if (deleteErr) {
      console.error("[Self-Test] DELETE failed:", deleteErr);
      return NextResponse.json(
        {
          ok: false,
          stage: "delete",
          error: deleteErr.message,
          code: deleteErr.code,
          details: deleteErr.details,
        },
        { status: 500 }
      );
    }

    console.log("[Self-Test] DELETE success");

    // All tests passed
    return NextResponse.json({
      ok: true,
      message: "RLS policies working correctly",
      user_id: user.id,
    });
  } catch (error: any) {
    console.error("[Self-Test] Unexpected error:", error);
    return NextResponse.json(
      {
        ok: false,
        stage: "unknown",
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
