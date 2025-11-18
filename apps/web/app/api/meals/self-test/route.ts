import { NextRequest, NextResponse } from "next/server";
import { todayISO } from "@/lib/date";
import { requireAuth, checkRateLimit, requireDevelopment, RateLimitPresets, ErrorResponses, handleApiError } from "@/lib/api/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Self-test endpoint to verify RLS policies and authentication
 * Tests that:
 * 1. Bearer token authentication works
 * 2. User can insert a meal row (RLS allows INSERT)
 * 3. User can delete their own meal row (RLS allows DELETE)
 */
export async function POST(request: NextRequest) {
  try {
    // Development-only endpoint
    requireDevelopment();

    // Rate limiting check (STRICT - test endpoint)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.strict,
      keyPrefix: 'meals-self-test',
    });

    if (!rateLimit.allowed) {
      console.log('[MealsSelfTest] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

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
  } catch (error) {
    console.error("[MealsSelfTest] Unexpected error:", error);
    return handleApiError(error, 'MealsSelfTest');
  }
}
