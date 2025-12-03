import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, validateBody, validateSearchParams, RateLimitPresets, ErrorResponses, handleApiError } from "@/lib/api/security";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Helper function to get today's date in local timezone (YYYY-MM-DD)
function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Macro value schema: 0-9999 integer range
const Macro4 = z.number().int().min(0).max(9999);

// Schema for creating a meal
const CreateMealSchema = z.object({
  name: z.string().min(1),
  calories: Macro4,
  protein: Macro4.optional().default(0),
  carbs: Macro4.optional().default(0),
  fat: Macro4.optional().default(0),
  date: z.string().optional(), // YYYY-MM-DD format
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional().default('snack'),
  fiber: Macro4.optional(),
  sugar: Macro4.optional(),
  sodium_mg: Macro4.optional(),
  portion_grams: Macro4.optional(),
  source: z.string().optional(),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  is_partial: z.boolean().optional(),
});

// Schema for GET query params
const GetMealsQuerySchema = z.object({
  date: z.string().optional(),
});

// Schema for DELETE/PATCH query params
const MealIdQuerySchema = z.object({
  id: z.string().min(1, "Meal ID is required"),
});

// Schema for updating a meal
const UpdateMealSchema = z.object({
  name: z.string().optional(),
  calories: Macro4.optional(),
  protein: Macro4.optional(),
  carbs: Macro4.optional(),
  fat: Macro4.optional(),
  portion_grams: Macro4.optional(),
});

// GET /api/meals - Fetch user's meals
export async function GET(request: NextRequest) {
  try {
    // Rate limiting check (STANDARD - read operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'meals-get',
    });

    if (!rateLimit.allowed) {
      console.log('[Meals GET] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    // Validate query params
    const validation = validateSearchParams(request, GetMealsQuerySchema);
    if (!validation.success) {
      return validation.response;
    }
    const date = validation.data.date || getTodayLocalDate();

    // Fetch meals for the specified date
    const { data: meals, error } = await supabase
      .from("meals")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Meals GET] Error fetching meals:", error);
      throw new Error(`Failed to fetch meals: ${error.message}`);
    }

    return NextResponse.json({ meals: meals || [] });
  } catch (error) {
    console.error("[Meals GET] Fatal error:", error);
    return handleApiError(error, 'MealsGet');
  }
}

// POST /api/meals - Create a new meal
export async function POST(request: NextRequest) {
  try {
    // Rate limiting check (STANDARD - write operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'meals-post',
    });

    if (!rateLimit.allowed) {
      console.log('[Meals POST] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    // Validate request body
    const validation = await validateBody(request, CreateMealSchema);
    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;
    const date = data.date || getTodayLocalDate();

    const insertData = {
      user_id: user.id,
      date,
      name: data.name,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      meal_type: data.meal_type,
      source: data.source || "manual",
    };

    console.log('[Meals API] Inserting meal:', insertData);

    // Insert the meal
    const { data: meal, error: insertError } = await supabase
      .from("meals")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("[Meals POST] Error inserting meal:", insertError);
      console.error("[Meals POST] Insert error details:", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      });
      throw new Error(`Failed to create meal: ${insertError.message}`);
    }

    return NextResponse.json({ success: true, meal });
  } catch (error) {
    console.error("[Meals POST] Fatal error:", error);
    return handleApiError(error, 'MealsPost');
  }
}

// DELETE /api/meals/:id - Delete a meal
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting check (STANDARD - write operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'meals-delete',
    });

    if (!rateLimit.allowed) {
      console.log('[Meals DELETE] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    // Validate query params
    const paramsValidation = validateSearchParams(request, MealIdQuerySchema);
    if (!paramsValidation.success) {
      return paramsValidation.response;
    }
    const mealId = paramsValidation.data.id;

    // Delete the meal (RLS ensures user can only delete their own)
    const { error: deleteError } = await supabase
      .from("meals")
      .delete()
      .eq("id", mealId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("[Meals DELETE] Error deleting meal:", deleteError);
      throw new Error(`Failed to delete meal: ${deleteError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Meals DELETE] Fatal error:", error);
    return handleApiError(error, 'MealsDelete');
  }
}

// PATCH /api/meals?id=:id - Update a meal
export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting check (STANDARD - write operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'meals-patch',
    });

    if (!rateLimit.allowed) {
      console.log('[Meals PATCH] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    // Validate query params
    const paramsValidation = validateSearchParams(request, MealIdQuerySchema);
    if (!paramsValidation.success) {
      return paramsValidation.response;
    }
    const mealId = paramsValidation.data.id;

    // Validate request body
    const validation = await validateBody(request, UpdateMealSchema);
    if (!validation.success) {
      return validation.response;
    }

    const updates = validation.data;

    if (Object.keys(updates).length === 0) {
      return ErrorResponses.badRequest("No valid fields to update");
    }

    // Update the meal (RLS ensures user can only update their own)
    const { data: meal, error: updateError } = await supabase
      .from("meals")
      .update(updates)
      .eq("id", mealId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("[Meals PATCH] Error updating meal:", updateError);
      throw new Error(`Failed to update meal: ${updateError.message}`);
    }

    if (!meal) {
      return ErrorResponses.notFound("Meal not found or unauthorized");
    }

    return NextResponse.json({ success: true, meal });
  } catch (error) {
    console.error("[Meals PATCH] Fatal error:", error);
    return handleApiError(error, 'MealsPatch');
  }
}