import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { todayISO } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Self-test endpoint to verify RLS policies and authentication
 * Tests that:
 * 1. Bearer token authentication works
 * 2. User can insert a meal row (RLS allows INSERT)
 * 3. User can delete their own meal row (RLS allows DELETE)
 */
export async function POST(req: Request) {
  try {
    // A. Get Authorization header (Bearer token from client)
    const authHeader = req.headers.get("authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");

    if (!jwt) {
      return NextResponse.json(
        { ok: false, error: "Missing authorization token" },
        { status: 401 }
      );
    }

    // B. Create Supabase client with the user's token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    // C. Verify user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
          details: userError?.message,
        },
        { status: 401 }
      );
    }

    console.log("[SELF-TEST] Testing RLS for user:", { userId: user.id });

    // D. Test INSERT - Create a test meal row
    const testMealPayload = {
      user_id: user.id,
      date: todayISO(),
      name: "__test__",
      calories: 1,
      protein: 0,
      carbs: 0,
      fat: 0,
      source: "manual" as const,
    };

    const { data: insertedMeal, error: insertError } = await supabase
      .from("meals")
      .insert(testMealPayload)
      .select()
      .single();

    if (insertError) {
      console.error("[SELF-TEST] INSERT failed:", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      });

      return NextResponse.json(
        {
          ok: false,
          stage: "INSERT",
          error: "RLS or DB error on INSERT",
          code: insertError.code,
          message: insertError.message,
          hint: insertError.hint,
          details: insertError.details,
        },
        { status: 500 }
      );
    }

    console.log("[SELF-TEST] INSERT succeeded:", { id: insertedMeal.id });

    // E. Test DELETE - Remove the test row
    const { error: deleteError } = await supabase
      .from("meals")
      .delete()
      .eq("id", insertedMeal.id);

    if (deleteError) {
      console.error("[SELF-TEST] DELETE failed:", {
        code: deleteError.code,
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
      });

      return NextResponse.json(
        {
          ok: false,
          stage: "DELETE",
          error: "RLS or DB error on DELETE",
          code: deleteError.code,
          message: deleteError.message,
          hint: deleteError.hint,
          details: deleteError.details,
          warning: "Test row was inserted but could not be deleted. You may need to manually delete it.",
          testRowId: insertedMeal.id,
        },
        { status: 500 }
      );
    }

    console.log("[SELF-TEST] DELETE succeeded");

    // F. All tests passed!
    return NextResponse.json({
      ok: true,
      message: "RLS policies and authentication working correctly",
      tests: {
        authentication: "✓ Token valid",
        insert: "✓ INSERT allowed",
        delete: "✓ DELETE allowed",
      },
      userId: user.id,
    });
  } catch (err: any) {
    console.error("[SELF-TEST] Unexpected error:", {
      message: err?.message,
      stack: err?.stack,
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Server error during self-test",
        message: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
