"use client";

import { useState } from "react";
import { sanitizeNumeric4 } from "@/lib/forms/numeric4";

export type UserMeal = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "manual" | "ai_vision";
  meal_type?: "breakfast" | "lunch" | "dinner" | "snack";
  image_url?: string;
  confidence?: number;
  portion_grams?: number;
  brand?: string;
  created_at: string;
};

// Edit form state uses strings for numeric inputs
type EditValues = {
  name?: string;
  calories?: string | number;
  protein?: string | number;
  carbs?: string | number;
  fat?: string | number;
};

type Props = {
  meals: UserMeal[];
  onDelete?: (mealId: string) => void;
  onEdit?: (mealId: string, updates: Partial<UserMeal>) => void;
  onClickEntry?: (meal: UserMeal) => void;
};

export function UserMealsList({ meals, onDelete, onEdit, onClickEntry }: Props) {
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditValues>({});

  const startEditing = (meal: UserMeal) => {
    setEditingMealId(meal.id);
    setEditValues({
      name: meal.name,
      calories: String(meal.calories),
      protein: String(meal.protein),
      carbs: String(meal.carbs),
      fat: String(meal.fat),
    });
  };

  const cancelEditing = () => {
    setEditingMealId(null);
    setEditValues({});
  };

  const saveEditing = () => {
    if (editingMealId && onEdit) {
      // Convert string values back to numbers
      const updates: Partial<UserMeal> = {
        ...editValues,
        calories: editValues.calories !== undefined ? Number(editValues.calories) || 0 : undefined,
        protein: editValues.protein !== undefined ? Number(editValues.protein) || 0 : undefined,
        carbs: editValues.carbs !== undefined ? Number(editValues.carbs) || 0 : undefined,
        fat: editValues.fat !== undefined ? Number(editValues.fat) || 0 : undefined,
      };
      onEdit(editingMealId, updates);
      setEditingMealId(null);
      setEditValues({});
    }
  };

  if (!meals || meals.length === 0) {
    return null;
  }

  // Meal type labels in Hebrew
  const mealTypeLabels: Record<string, string> = {
    breakfast: 'ארוחת בוקר',
    lunch: 'צהריים',
    dinner: 'ערב',
    snack: 'חטיפים',
  };

  // Meal type emojis
  const mealTypeEmojis: Record<string, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍎',
  };

  // Group meals by meal_type
  const groupedMeals: Record<string, UserMeal[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };

  meals.forEach((meal) => {
    const mealType = meal.meal_type || 'snack'; // Default to snack if no meal_type
    if (groupedMeals[mealType]) {
      groupedMeals[mealType].push(meal);
    }
  });

  // Order of meal types to display
  const mealTypeOrder: Array<keyof typeof groupedMeals> = ['breakfast', 'lunch', 'dinner', 'snack'];

  return (
    <div className="w-full space-y-6">
      {mealTypeOrder.map((mealType) => {
        const mealsForType = groupedMeals[mealType];

        if (mealsForType.length === 0) {
          return null; // Skip empty meal types
        }

        return (
          <div key={mealType} className="space-y-3">
            {/* Meal Type Header */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">{mealTypeEmojis[mealType]}</span>
              <h3 className="text-lg font-semibold text-white">{mealTypeLabels[mealType]}</h3>
            </div>

            {/* Meals for this type */}
            {mealsForType.map((meal) => {
              const isEditing = editingMealId === meal.id;

              return (
                <div
                  key={meal.id}
                  className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-700/50 rounded-2xl shadow-lg overflow-hidden cursor-pointer active:opacity-90 transition-opacity"
                  onClick={() => {
                    console.log('[UserMealsList] Card clicked:', meal.id, 'isEditing:', isEditing, 'hasOnClickEntry:', !!onClickEntry);
                    // Only trigger if not currently editing this meal
                    if (!isEditing && onClickEntry) {
                      onClickEntry(meal);
                    }
                  }}
                >
            <div className="w-full p-4" dir="rtl">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editValues.name || ''}
                        onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-neutral-800 text-white px-3 py-1 rounded-lg border border-neutral-600 focus:border-purple-500 focus:outline-none"
                        placeholder="שם הארוחה"
                      />
                    ) : (
                      <h3 className="text-white font-medium">{meal.name}</h3>
                    )}
                    <span className="text-neutral-400 text-sm">
                      {new Date(meal.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Macros */}
                  {isEditing ? (
                    <div className="flex flex-wrap gap-3 text-sm">
                      {/* Calories */}
                      <div className="flex items-center gap-1 text-lime-400">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="\d*"
                          value={editValues.calories || ""}
                          onChange={(e) => {
                            const { text } = sanitizeNumeric4(e.target.value);
                            setEditValues({ ...editValues, calories: text });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-neutral-800 text-white w-16 px-2 py-1 rounded border border-neutral-600 focus:border-lime-400 focus:outline-none active:translate-y-0.5 transition-transform duration-75"
                          maxLength={4}
                        />
                        <span className="text-lime-400/70">קלוריות</span>
                      </div>
                      {/* Protein */}
                      <div className="flex items-center gap-1" style={{ color: '#C9456C' }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="\d*"
                          value={editValues.protein || ""}
                          onChange={(e) => {
                            const { text } = sanitizeNumeric4(e.target.value);
                            setEditValues({ ...editValues, protein: text });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-neutral-800 text-white w-16 px-2 py-1 rounded border border-neutral-600 focus:outline-none active:translate-y-0.5 transition-transform duration-75"
                          style={{ borderColor: '#C9456C' }}
                          maxLength={4}
                        />
                        <span style={{ color: '#C9456C', opacity: 0.7 }}>חלבון</span>
                      </div>
                      {/* Carbs */}
                      <div className="flex items-center gap-1" style={{ color: '#FFA856' }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="\d*"
                          value={editValues.carbs || ""}
                          onChange={(e) => {
                            const { text } = sanitizeNumeric4(e.target.value);
                            setEditValues({ ...editValues, carbs: text });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-neutral-800 text-white w-16 px-2 py-1 rounded border border-neutral-600 focus:outline-none active:translate-y-0.5 transition-transform duration-75"
                          style={{ borderColor: '#FFA856' }}
                          maxLength={4}
                        />
                        <span style={{ color: '#FFA856', opacity: 0.7 }}>פחמימות</span>
                      </div>
                      {/* Fat */}
                      <div className="flex items-center gap-1" style={{ color: '#5B9BFF' }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="\d*"
                          value={editValues.fat || ""}
                          onChange={(e) => {
                            const { text } = sanitizeNumeric4(e.target.value);
                            setEditValues({ ...editValues, fat: text });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-neutral-800 text-white w-16 px-2 py-1 rounded border border-neutral-600 focus:outline-none active:translate-y-0.5 transition-transform duration-75"
                          style={{ borderColor: '#5B9BFF' }}
                          maxLength={4}
                        />
                        <span style={{ color: '#5B9BFF', opacity: 0.7 }}>שומן</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3 text-sm">
                      <div className="text-lime-400">
                        <span className="font-medium">{meal.calories}</span>
                        <span className="text-lime-400/70 mr-1">קלוריות</span>
                      </div>
                      {meal.protein > 0 && (
                        <div style={{ color: '#C9456C' }}>
                          <span className="font-medium">{meal.protein}</span>
                          <span style={{ color: '#C9456C', opacity: 0.7 }} className="mr-1">חלבון</span>
                        </div>
                      )}
                      {meal.carbs > 0 && (
                        <div style={{ color: '#FFA856' }}>
                          <span className="font-medium">{meal.carbs}</span>
                          <span style={{ color: '#FFA856', opacity: 0.7 }} className="mr-1">פחמימות</span>
                        </div>
                      )}
                      {meal.fat > 0 && (
                        <div style={{ color: '#5B9BFF' }}>
                          <span className="font-medium">{meal.fat}</span>
                          <span style={{ color: '#5B9BFF', opacity: 0.7 }} className="mr-1">שומן</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      {/* Save button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveEditing();
                        }}
                        className="p-2 text-green-400 hover:bg-green-900/20 rounded-lg transition-colors"
                        aria-label="שמור שינויים"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                      {/* Cancel button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEditing();
                        }}
                        className="p-2 text-neutral-400 hover:bg-neutral-800 rounded-lg transition-colors"
                        aria-label="בטל"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Edit button */}
                      {onEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(meal);
                          }}
                          className="p-2 text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
                          aria-label="ערוך ארוחה"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-5 h-5"
                          >
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      )}
                      {/* Delete button */}
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(meal.id);
                          }}
                          className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                          aria-label="מחק ארוחה"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-5 h-5"
                          >
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

            {/* Image preview if available */}
            {meal.image_url && (
              <div className="mt-3">
                <img
                  src={meal.image_url}
                  alt={meal.name}
                  className="w-full h-32 object-cover rounded-lg"
                />
              </div>
            )}
          </div>
        </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}