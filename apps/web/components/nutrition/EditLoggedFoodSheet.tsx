/**
 * EditLoggedFoodSheet Component
 * Bottom sheet for editing a logged food entry with portion-based macro recalculation
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Check, Loader2, AlertCircle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

// Type for a logged meal entry
export interface LoggedMealEntry {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portion_grams?: number;
  source?: string;
  image_url?: string;
  created_at: string;
}

interface EditLoggedFoodSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: LoggedMealEntry | null;
  onUpdated: (entry: LoggedMealEntry) => void;
}

const QUICK_PORTIONS = [50, 100, 150, 200, 250];

export function EditLoggedFoodSheet({
  open,
  onOpenChange,
  entry,
  onUpdated,
}: EditLoggedFoodSheetProps) {
  console.log('[EditLoggedFoodSheet] Render - open:', open, 'entry:', entry?.id, entry?.name);

  const [grams, setGrams] = useState(100);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate per-100g values from the current entry
  const per100g = useMemo(() => {
    if (!entry) return { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

    // If we have portion_grams, derive per-100g values
    const portionGrams = entry.portion_grams || 100;
    const scale = 100 / portionGrams;

    return {
      kcal: Math.round(entry.calories * scale * 10) / 10,
      protein_g: Math.round(entry.protein * scale * 10) / 10,
      carbs_g: Math.round(entry.carbs * scale * 10) / 10,
      fat_g: Math.round(entry.fat * scale * 10) / 10,
    };
  }, [entry]);

  // Reset grams when entry changes
  useEffect(() => {
    if (entry) {
      setGrams(entry.portion_grams || 100);
      setError(null);
    }
  }, [entry]);

  // Calculate scaled nutrition based on new grams
  const scaledNutrition = useMemo(() => {
    const scale = grams / 100;
    return {
      kcal: Math.round(per100g.kcal * scale),
      protein_g: Math.round(per100g.protein_g * scale),
      carbs_g: Math.round(per100g.carbs_g * scale),
      fat_g: Math.round(per100g.fat_g * scale),
    };
  }, [grams, per100g]);

  // Handle save
  const handleSave = async () => {
    if (!entry) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/meals?id=${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calories: scaledNutrition.kcal,
          protein: scaledNutrition.protein_g,
          carbs: scaledNutrition.carbs_g,
          fat: scaledNutrition.fat_g,
          portion_grams: grams,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update meal');
      }

      // Haptic success
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }

      // Return the updated entry
      const updatedEntry: LoggedMealEntry = {
        ...entry,
        calories: scaledNutrition.kcal,
        protein: scaledNutrition.protein_g,
        carbs: scaledNutrition.carbs_g,
        fat: scaledNutrition.fat_g,
        portion_grams: grams,
      };

      onUpdated(updatedEntry);
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('[EditLoggedFood] Save error:', err);
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון הארוחה');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if values have changed
  const hasChanges = useMemo(() => {
    if (!entry) return false;
    return grams !== (entry.portion_grams || 100);
  }, [entry, grams]);

  // Always render Dialog.Root for controlled open to work properly
  // Only hide the content when entry is null
  return (
    <Dialog.Root open={open && entry !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[99998] bg-black/40 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />

        <Dialog.Content
          className="fixed bottom-0 left-0 right-0 z-[99999] max-h-[85vh] rounded-t-3xl bg-[#1a1b20] overflow-hidden"
          dir="rtl"
        >
          {entry && (
            <>
          {/* Handle */}
          <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mt-3" />

          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-zinc-800">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">
                {entry.name}
              </h2>
              {entry.brand && (
                <p className="text-sm text-zinc-400">{entry.brand}</p>
              )}
            </div>

            <Dialog.Close asChild>
              <button
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"
                aria-label="סגור"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[60vh] pb-28">
            {/* Current portion display */}
            <div className="p-4 border-b border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-zinc-400">
                  כמות נוכחית
                </h3>
                <span className="text-lg font-bold text-white">
                  {entry.portion_grams || 100} גרם
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="text-lime-400">
                  <span className="font-medium">{entry.calories}</span>
                  <span className="text-lime-400/70 mr-1">קלוריות</span>
                </div>
                <div style={{ color: '#C9456C' }}>
                  <span className="font-medium">{entry.protein}</span>
                  <span style={{ color: '#C9456C', opacity: 0.7 }} className="mr-1">חלבון</span>
                </div>
                <div style={{ color: '#FFA856' }}>
                  <span className="font-medium">{entry.carbs}</span>
                  <span style={{ color: '#FFA856', opacity: 0.7 }} className="mr-1">פחמימות</span>
                </div>
                <div style={{ color: '#5B9BFF' }}>
                  <span className="font-medium">{entry.fat}</span>
                  <span style={{ color: '#5B9BFF', opacity: 0.7 }} className="mr-1">שומן</span>
                </div>
              </div>
            </div>

            {/* Portion Size Input */}
            <div className="p-4 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                עדכון כמות
              </h3>

              {/* Custom input */}
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="number"
                  value={grams}
                  onChange={(e) => setGrams(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 px-4 py-2 bg-white/5 rounded-xl text-white text-center font-semibold"
                  min="1"
                  step="10"
                />
                <span className="text-zinc-400">גרם</span>
              </div>

              {/* Quick buttons */}
              <div className="flex gap-2 flex-wrap">
                {QUICK_PORTIONS.map((portion) => (
                  <button
                    key={portion}
                    onClick={() => setGrams(portion)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      grams === portion
                        ? 'bg-[#E2F163] text-black'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {portion}g
                  </button>
                ))}
              </div>
            </div>

            {/* Updated Nutrition Preview */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                ערכים לאחר העדכון ({grams}ג׳)
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-white">
                    {scaledNutrition.kcal}
                  </div>
                  <div className="text-xs text-zinc-400">קלוריות</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold" style={{ color: '#C9456C' }}>
                    {scaledNutrition.protein_g}
                  </div>
                  <div className="text-xs text-zinc-400">חלבון (ג׳)</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold" style={{ color: '#FFA856' }}>
                    {scaledNutrition.carbs_g}
                  </div>
                  <div className="text-xs text-zinc-400">פחמימות (ג׳)</div>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold" style={{ color: '#5B9BFF' }}>
                    {scaledNutrition.fat_g}
                  </div>
                  <div className="text-xs text-zinc-400">שומן (ג׳)</div>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] bg-gradient-to-t from-[#1a1b20] to-transparent">
            <div className="flex gap-3">
              <button
                onClick={() => onOpenChange(false)}
                className="flex-1 py-3 bg-white/10 text-white rounded-xl font-bold"
              >
                ביטול
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="flex-1 py-3 bg-[#E2F163] text-black rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>שומר...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>שמור</span>
                  </>
                )}
              </button>
            </div>
          </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
