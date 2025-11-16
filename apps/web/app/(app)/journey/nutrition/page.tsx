"use client";

/**
 * Nutrition Details Page
 * Displays full meal plan with timing and macros
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, UtensilsCrossed, Clock, Flame, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface Meal {
  title?: string;
  time?: string;
  desc?: string;
  kcal?: number;
}

interface NutritionMeta {
  calories_target?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  avatar?: string;
}

interface NutritionPlan {
  meta?: NutritionMeta;
  meals_flat?: Meal[];
}

interface ProgramData {
  user_id: string;
  nutrition_plan_json?: NutritionPlan;
}

export default function NutritionDetailsPage() {
  const [program, setProgram] = useState<ProgramData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadNutritionPlan() {
      try {
        setIsLoading(true);
        setError(null);

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) {
          setError("לא מזוהה משתמש");
          return;
        }

        // Fetch nutrition data from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("nutrition_plan")
          .eq("id", user.id)
          .single();

        if (profileError) {
          if (profileError.code === "PGRST116") {
            setError("לא נמצאה תוכנית תזונה");
          } else {
            throw profileError;
          }
          return;
        }

        // Transform profile nutrition data to match program structure
        if (profileData?.nutrition_plan) {
          setProgram({
            user_id: user.id,
            nutrition_plan_json: profileData.nutrition_plan as any,
          });
        } else {
          setError("לא נמצאה תוכנית תזונה");
        }
      } catch (err) {
        console.error("[Nutrition Details] Error loading data:", err);
        setError("שגיאה בטעינת תוכנית התזונה");
      } finally {
        setIsLoading(false);
      }
    }

    loadNutritionPlan();
  }, []);

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white p-4 md:p-6" dir="rtl">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-4 md:p-6 flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">אופס! משהו השתבש</h2>
          <p className="text-neutral-400">{error}</p>
          <Link
            href="/journey"
            className="inline-block px-6 py-3 bg-[#E2F163] text-black rounded-xl font-semibold active:opacity-90"
          >
            חזור למסע
          </Link>
        </div>
      </div>
    );
  }

  const nutritionPlan = program?.nutrition_plan_json;
  const meta = nutritionPlan?.meta;
  const meals = nutritionPlan?.meals_flat || [];

  // Empty State
  if (!nutritionPlan || meals.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-4 md:p-6 flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4 max-w-md">
          <UtensilsCrossed className="w-12 h-12 text-neutral-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">אין תוכנית תזונה</h2>
          <p className="text-neutral-400">עדיין לא נוצרה תוכנית תזונה עבורך</p>
          <Link
            href="/journey"
            className="inline-block px-6 py-3 bg-[#E2F163] text-black rounded-xl font-semibold active:opacity-90"
          >
            חזור למסע
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20" dir="rtl">
      {/* Safe Area Padding */}
      <div className="pt-safe">
        {/* Header */}
        <header className="px-4 md:px-6 py-6 space-y-4">
          <Link
            href="/journey"
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
            <span>חזור למסע</span>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <UtensilsCrossed className="w-8 h-8 text-[#E2F163]" />
              תפריט התזונה שלך
            </h1>
            <p className="text-neutral-400 text-sm mt-2">תוכנית תזונה מותאמת אישית</p>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 md:px-6 space-y-6 max-w-3xl mx-auto">
          {/* Daily Targets Card */}
          {meta && (
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">יעדים יומיים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {meta.calories_target && (
                    <div className="text-center p-3 bg-neutral-800/50 rounded-lg">
                      <Flame className="w-5 h-5 text-[#E2F163] mx-auto mb-1" />
                      <p className="text-2xl font-bold text-white">{meta.calories_target}</p>
                      <p className="text-xs text-neutral-400">קלוריות</p>
                    </div>
                  )}
                  {meta.protein_g && (
                    <div className="text-center p-3 bg-neutral-800/50 rounded-lg">
                      <p className="text-2xl font-bold text-white">{meta.protein_g}g</p>
                      <p className="text-xs text-neutral-400">חלבון</p>
                    </div>
                  )}
                  {meta.carbs_g && (
                    <div className="text-center p-3 bg-neutral-800/50 rounded-lg">
                      <p className="text-2xl font-bold text-white">{meta.carbs_g}g</p>
                      <p className="text-xs text-neutral-400">פחמימות</p>
                    </div>
                  )}
                  {meta.fat_g && (
                    <div className="text-center p-3 bg-neutral-800/50 rounded-lg">
                      <p className="text-2xl font-bold text-white">{meta.fat_g}g</p>
                      <p className="text-xs text-neutral-400">שומנים</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meals List */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white px-2">הארוחות שלך</h2>
            {meals.map((meal, index) => (
              <Card key={index} className="bg-neutral-900 border-neutral-800">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Meal Info */}
                    <div className="flex-1 space-y-2">
                      {/* Title & Time */}
                      <div>
                        <h3 className="text-white font-semibold text-lg">
                          {meal.title || `ארוחה ${index + 1}`}
                        </h3>
                        {meal.time && (
                          <div className="flex items-center gap-1 text-neutral-400 text-sm mt-1">
                            <Clock className="w-4 h-4" />
                            <span>{meal.time}</span>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {meal.desc && (
                        <p className="text-neutral-300 text-sm leading-relaxed">{meal.desc}</p>
                      )}
                    </div>

                    {/* Calories Badge */}
                    {meal.kcal && (
                      <Badge
                        variant="secondary"
                        className="shrink-0 bg-[#E2F163]/10 text-[#E2F163] border-[#E2F163]/20 px-3 py-1"
                      >
                        {meal.kcal} kcal
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tips Section */}
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">טיפים לניהול תזונה</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-neutral-300 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-[#E2F163] font-bold">•</span>
                <p>הכן ארוחות מראש כדי לחסוך זמן ולהישאר עקבי</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#E2F163] font-bold">•</span>
                <p>שתה מים לאורך כל היום - לפחות 8 כוסות</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#E2F163] font-bold">•</span>
                <p>אפשר גמישות - לא צריך להיות מושלם כל יום</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#E2F163] font-bold">•</span>
                <p>עקוב אחרי התקדמות בשקילות שבועיות</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
