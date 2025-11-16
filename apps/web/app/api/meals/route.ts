import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

// GET /api/meals - Fetch user's meals
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get date from query params (default to today in local timezone)
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || getTodayLocalDate();

    // Fetch meals for the specified date
    const { data: meals, error } = await supabase
      .from("meals")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching meals:", error);
      return NextResponse.json(
        { error: "Failed to fetch meals" },
        { status: 500 }
      );
    }

    return NextResponse.json({ meals: meals || [] });
  } catch (error) {
    console.error("Meals API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/meals - Create a new meal
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = CreateMealSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;
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
      console.error("Error inserting meal:", insertError);
      console.error("Insert error details:", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      });
      return NextResponse.json(
        { error: "Failed to create meal", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, meal });
  } catch (error) {
    console.error("Meals API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/meals/:id - Delete a meal
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get meal ID from URL
    const { searchParams } = new URL(request.url);
    const mealId = searchParams.get("id");

    if (!mealId) {
      return NextResponse.json(
        { error: "Meal ID required" },
        { status: 400 }
      );
    }

    // Delete the meal (RLS ensures user can only delete their own)
    const { error: deleteError } = await supabase
      .from("meals")
      .delete()
      .eq("id", mealId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting meal:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete meal" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Meals API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/meals?id=:id - Update a meal
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get meal ID from URL
    const { searchParams } = new URL(request.url);
    const mealId = searchParams.get("id");

    if (!mealId) {
      return NextResponse.json(
        { error: "Meal ID required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Build update object with only allowed fields
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;

    // Validate macro values if provided
    if (body.calories !== undefined) {
      const result = Macro4.safeParse(body.calories);
      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid calories value (must be 0-9999)" },
          { status: 400 }
        );
      }
      updates.calories = result.data;
    }
    if (body.protein !== undefined) {
      const result = Macro4.safeParse(body.protein);
      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid protein value (must be 0-9999)" },
          { status: 400 }
        );
      }
      updates.protein = result.data;
    }
    if (body.carbs !== undefined) {
      const result = Macro4.safeParse(body.carbs);
      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid carbs value (must be 0-9999)" },
          { status: 400 }
        );
      }
      updates.carbs = result.data;
    }
    if (body.fat !== undefined) {
      const result = Macro4.safeParse(body.fat);
      if (!result.success) {
        return NextResponse.json(
          { error: "Invalid fat value (must be 0-9999)" },
          { status: 400 }
        );
      }
      updates.fat = result.data;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
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
      console.error("Error updating meal:", updateError);
      return NextResponse.json(
        { error: "Failed to update meal" },
        { status: 500 }
      );
    }

    if (!meal) {
      return NextResponse.json(
        { error: "Meal not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, meal });
  } catch (error) {
    console.error("Meals API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}