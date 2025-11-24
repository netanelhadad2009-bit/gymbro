import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, validateBody, RateLimitPresets, ErrorResponses, handleApiError } from "@/lib/api/security";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET /api/meals/plan - Fetch all eaten plan meals for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Rate limiting check (STANDARD - read operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'meals-plan-get',
    });

    if (!rateLimit.allowed) {
      console.log('[PlanMeals GET] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    // Fetch all plan meals for this user
    const { data: planMeals, error } = await supabase
      .from("meals")
      .select("*")
      .eq("user_id", user.id)
      .eq("source", "plan")
      .order("date", { ascending: false });

    if (error) {
      console.error("[PlanMeals GET] Error fetching plan meals:", error);
      throw new Error(`Failed to fetch plan meals: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      meals: planMeals || [],
    });
  } catch (error) {
    console.error("[PlanMeals GET] Fatal error:", error);
    return handleApiError(error, 'PlanMealsGet');
  }
}

// Schema for creating a plan meal
const CreatePlanMealSchema = z.object({
  name: z.string().min(1),
  calories: z.number().int().min(0),
  protein: z.number().int().min(0).optional().default(0),
  carbs: z.number().int().min(0).optional().default(0),
  fat: z.number().int().min(0).optional().default(0),
  date: z.string(), // YYYY-MM-DD format
  planMealId: z.string().min(1), // Format: "dayIndex_mealIndex"
});

// Schema for deleting a plan meal
const DeletePlanMealSchema = z.object({
  planMealId: z.string().min(1),
  date: z.string(),
});

// POST /api/meals/plan - Create a new plan meal
export async function POST(request: NextRequest) {
  try {
    // Rate limiting check (STANDARD - write operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'meals-plan-post',
    });

    if (!rateLimit.allowed) {
      console.log('[PlanMeals POST] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    // Validate request body
    const validation = await validateBody(request, CreatePlanMealSchema);
    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;

    // Check if this plan meal already exists for this date
    const { data: existingMeal } = await supabase
      .from("meals")
      .select("id")
      .eq("user_id", user.id)
      .eq("plan_meal_id", data.planMealId)
      .eq("date", data.date)
      .single();

    if (existingMeal) {
      // Already exists, no need to insert again
      return NextResponse.json({ success: true, meal: existingMeal });
    }

    // Insert the plan meal
    const { data: meal, error: insertError } = await supabase
      .from("meals")
      .insert({
        user_id: user.id,
        date: data.date,
        name: data.name,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        source: "plan",
        plan_meal_id: data.planMealId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[PlanMeals POST] Error inserting plan meal:", insertError);
      throw new Error(`Failed to create plan meal: ${insertError.message}`);
    }

    return NextResponse.json({ success: true, meal });
  } catch (error) {
    console.error("[PlanMeals POST] Fatal error:", error);
    return handleApiError(error, 'PlanMealsPost');
  }
}

// DELETE /api/meals/plan - Delete a plan meal
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting check (STANDARD - write operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'meals-plan-delete',
    });

    if (!rateLimit.allowed) {
      console.log('[PlanMeals DELETE] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    // Validate request body
    const validation = await validateBody(request, DeletePlanMealSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { planMealId, date } = validation.data;

    // Delete the plan meal
    const { error: deleteError } = await supabase
      .from("meals")
      .delete()
      .eq("user_id", user.id)
      .eq("plan_meal_id", planMealId)
      .eq("date", date);

    if (deleteError) {
      console.error("[PlanMeals DELETE] Error deleting plan meal:", deleteError);
      throw new Error(`Failed to delete plan meal: ${deleteError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PlanMeals DELETE] Fatal error:", error);
    return handleApiError(error, 'PlanMealsDelete');
  }
}
