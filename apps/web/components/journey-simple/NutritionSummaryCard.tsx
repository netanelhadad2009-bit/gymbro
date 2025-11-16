"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed, Flame, TrendingUp } from "lucide-react";

interface NutritionMeta {
  calories_target?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

interface NutritionSummaryCardProps {
  meta?: NutritionMeta;
  mealCount?: number;
}

export function NutritionSummaryCard({ meta, mealCount = 0 }: NutritionSummaryCardProps) {
  const hasData = meta && meta.calories_target;

  if (!hasData) {
    return (
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-[#E2F163]" />
            תוכנית תזונה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-400 text-sm mb-4">
            תוכנית התזונה שלך תופיע כאן בקרוב.
          </p>
          <Link
            href="/onboarding"
            className="inline-block px-4 py-2 bg-[#E2F163] text-black rounded-lg font-medium text-sm active:opacity-90"
          >
            צור תוכנית
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <CardTitle className="text-white text-xl flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-[#E2F163]" />
          תוכנית תזונה
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calorie Target */}
        <div className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E2F163]/10 rounded-full flex items-center justify-center">
              <Flame className="w-5 h-5 text-[#E2F163]" />
            </div>
            <div>
              <p className="text-neutral-400 text-xs">קלוריות יעד</p>
              <p className="text-white text-2xl font-bold">{meta.calories_target}</p>
            </div>
          </div>
          <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            יומי
          </Badge>
        </div>

        {/* Macros */}
        {(meta.protein_g || meta.carbs_g || meta.fat_g) && (
          <div className="grid grid-cols-3 gap-2">
            {meta.protein_g && (
              <div className="bg-neutral-800/30 rounded-lg p-3 text-center">
                <p className="text-neutral-400 text-xs mb-1">חלבון</p>
                <p className="text-white font-semibold">{meta.protein_g}g</p>
              </div>
            )}
            {meta.carbs_g && (
              <div className="bg-neutral-800/30 rounded-lg p-3 text-center">
                <p className="text-neutral-400 text-xs mb-1">פחמימות</p>
                <p className="text-white font-semibold">{meta.carbs_g}g</p>
              </div>
            )}
            {meta.fat_g && (
              <div className="bg-neutral-800/30 rounded-lg p-3 text-center">
                <p className="text-neutral-400 text-xs mb-1">שומנים</p>
                <p className="text-white font-semibold">{meta.fat_g}g</p>
              </div>
            )}
          </div>
        )}

        {/* Meal Count */}
        {mealCount > 0 && (
          <div className="flex items-center gap-2 text-neutral-300 text-sm">
            <TrendingUp className="w-4 h-4 text-[#E2F163]" />
            <span>{mealCount} ארוחות מתוכננות</span>
          </div>
        )}

        {/* View Menu Button */}
        <Link
          href="/journey/nutrition"
          className="block w-full text-center px-4 py-3 bg-[#E2F163] text-black rounded-xl font-semibold text-sm active:opacity-90"
        >
          צפה בתפריט
        </Link>
      </CardContent>
    </Card>
  );
}
