import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = CreatePlanMealSchema.safeParse(body);

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
      console.error("Error inserting plan meal:", insertError);
      return NextResponse.json(
        { error: "Failed to create plan meal" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, meal });
  } catch (error) {
    console.error("Plan meals API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/meals/plan - Delete a plan meal
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

    const body = await request.json();
    const validationResult = DeletePlanMealSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const { planMealId, date } = validationResult.data;

    // Delete the plan meal
    const { error: deleteError } = await supabase
      .from("meals")
      .delete()
      .eq("user_id", user.id)
      .eq("plan_meal_id", planMealId)
      .eq("date", date);

    if (deleteError) {
      console.error("Error deleting plan meal:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete plan meal" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Plan meals API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
