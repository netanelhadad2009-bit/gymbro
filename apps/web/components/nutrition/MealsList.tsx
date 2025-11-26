"use client";

import { useState } from "react";
import type { DayPlanT } from "@/lib/schemas/nutrition";

type Props = {
  day: DayPlanT | null;
  eatenMeals: Set<number>;
  onToggleMeal: (mealIndex: number) => void;
};

export function MealsList({ day, eatenMeals, onToggleMeal }: Props) {
  const [expandedMealIndex, setExpandedMealIndex] = useState<number | null>(null);

  if (!day || !day.meals || day.meals.length === 0) {
    return (
      <div className="w-full bg-neutral-900/80 border border-neutral-800 rounded-2xl shadow-lg p-8 text-center">
        <div className="text-neutral-500">אין ארוחות מתוכננות להיום</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <h2 className="text-lg font-semibold text-white mb-3">הארוחות של היום</h2>
      {day.meals.map((meal, idx) => {
        const isExpanded = expandedMealIndex === idx;
        const isEaten = eatenMeals.has(idx);
        const totalKcal = meal.macros.calories;
        const protein = meal.macros.protein_g;
        const carbs = meal.macros.carbs_g;
        const fat = meal.macros.fat_g;

        return (
          <div
            key={idx}
            className={`bg-neutral-900/80 border rounded-2xl shadow-lg overflow-hidden transition-all ${
              isEaten ? "border-[#e2f163]" : "border-neutral-800"
            }`}
          >
            {/* Meal header */}
            <div className="w-full flex items-center gap-4 p-4" dir="rtl">
              {/* Checkbox on the right */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMeal(idx);
                }}
                className="flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all active:scale-95"
                style={{
                  borderColor: isEaten ? "#e2f163" : "#525252",
                  backgroundColor: isEaten ? "#e2f163" : "transparent",
                }}
              >
                {isEaten && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4 text-black"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>

              {/* Meal info - clickable to expand */}
              <button
                onClick={() => setExpandedMealIndex(isExpanded ? null : idx)}
                className="flex-1 flex items-center justify-between gap-4 text-right active:opacity-90 transition-opacity"
              >
                <div className="flex-1">
                  <div className={`text-base font-semibold mb-1 ${isEaten ? "text-neutral-400 line-through" : "text-white"}`}>
                    {meal.name}
                  </div>
                  <div className="text-xs text-neutral-400">
                    {totalKcal.toFixed(0)} קק״ל · {protein.toFixed(0)}g חלבון · {carbs.toFixed(0)}g פחמימות · {fat.toFixed(0)}g שומן
                  </div>
                </div>

                {/* Expand indicator */}
                <div className="flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`w-5 h-5 text-neutral-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </button>
            </div>

            {/* Expanded items list */}
            {isExpanded && (
              <div className="border-t border-neutral-800 px-4 py-3 space-y-2">
                {meal.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex items-start justify-between gap-2 text-sm">
                    <div className="flex-1 text-right text-neutral-300">
                      {item.food}
                      {item.notes && <span className="text-neutral-500 text-xs mr-2">({item.notes})</span>}
                    </div>
                    <div className="flex-shrink-0 text-neutral-500">
                      {item.amount_g.toFixed(0)}g
                    </div>
                  </div>
                ))}
                {meal.prep && (
                  <div className="mt-3 pt-2 border-t border-neutral-800 text-xs text-neutral-500">
                    <strong className="text-neutral-400">הכנה:</strong> {meal.prep}
                  </div>
                )}
                {meal.swaps && meal.swaps.length > 0 && (
                  <div className="mt-2 text-xs text-neutral-500">
                    <strong className="text-neutral-400">תחליפים:</strong>
                    <ul className="mt-1 space-y-1">
                      {meal.swaps.map((swap, swapIdx) => (
                        <li key={swapIdx} className="mr-4">
                          • {swap.option}
                          {swap.equivalence_note && ` (${swap.equivalence_note})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
