/**
 * NutritionFactsSheet Component
 * Displays product nutrition facts and allows logging to diary
 */

'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Star,
  StarOff,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import type { BarcodeProduct, MealType, ServingOption } from '@/types/barcode';

interface NutritionFactsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: BarcodeProduct;
  onSuccess?: () => void;
}

const QUICK_PORTIONS = [30, 50, 100, 150, 200];

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

export function NutritionFactsSheet({
  open,
  onOpenChange,
  product,
  onSuccess,
}: NutritionFactsSheetProps) {
  const [grams, setGrams] = useState(100);
  const [mealType, setMealType] = useState<MealType>('snack');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate scaled nutrition
  const scaledNutrition = useMemo(() => {
    const scale = grams / 100;
    return {
      kcal: Math.round(product.per100g.kcal * scale),
      protein_g: Math.round(product.per100g.protein_g * scale * 10) / 10,
      carbs_g: Math.round(product.per100g.carbs_g * scale * 10) / 10,
      fat_g: Math.round(product.per100g.fat_g * scale * 10) / 10,
      fiber_g: product.per100g.fiber_g
        ? Math.round(product.per100g.fiber_g * scale * 10) / 10
        : undefined,
      sugar_g: product.per100g.sugar_g
        ? Math.round(product.per100g.sugar_g * scale * 10) / 10
        : undefined,
      sodium_mg: product.per100g.sodium_mg
        ? Math.round(product.per100g.sodium_mg * scale)
        : undefined,
    };
  }, [grams, product.per100g]);

  // Handle log to diary
  const handleLogMeal = async () => {
    setIsLogging(true);
    setError(null);

    try {
      const response = await fetch('/api/nutrition/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: product.barcode,
          productName: product.name,
          brand: product.brand,
          grams,
          mealType,
          per100g: product.per100g,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to log meal');
      }

      // Haptic success
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }

      console.log('[NutritionFacts] Logged successfully:', data);

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error('[NutritionFacts] Log error:', err);
      setError(err.message || 'שגיאה בהוספת המזון');
    } finally {
      setIsLogging(false);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async () => {
    // TODO: Implement favorite API
    setIsFavorite(!isFavorite);
    console.log('[NutritionFacts] Toggle favorite:', product.barcode);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />

        <Dialog.Content
          className="fixed bottom-0 left-0 right-0 z-[101] max-h-[90vh] rounded-t-3xl bg-[#1a1b20] overflow-hidden"
          dir="rtl"
        >
          {/* Handle */}
          <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mt-3" />

          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-zinc-800">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">
                {product.name}
              </h2>
              {product.brand && (
                <p className="text-sm text-zinc-400">{product.brand}</p>
              )}
              <p className="text-xs text-zinc-500 mt-1">{product.barcode}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleToggleFavorite}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"
              >
                {isFavorite ? (
                  <Star className="w-5 h-5 text-[#E2F163]" fill="currentColor" />
                ) : (
                  <StarOff className="w-5 h-5 text-white/60" />
                )}
              </button>

              <Dialog.Close asChild>
                <button
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"
                  aria-label="סגור"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[70vh] pb-32">
            {/* Source Badge */}
            {product.source && product.source !== 'cache' && (
              <div className="px-4 pt-3">
                <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                  <span>מקור:</span>
                  <span className="font-medium">
                    {product.source === 'fatsecret' && 'FatSecret'}
                    {product.source === 'manual' && 'הוסף ידנית'}
                    {product.source === 'off' && 'Open Food Facts'}
                    {product.source === 'israel_moh' && (
                      <>
                        {product.matchMeta?.publisher?.includes('community')
                          ? 'משרד הבריאות (קישור קהילתי)'
                          : 'משרד הבריאות (data.gov.il)'}
                      </>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Partial Data Warning */}
            {product.isPartial && (
              <div className="mx-4 mt-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-orange-400 font-medium">נתונים חלקיים</p>
                    <p className="text-xs text-orange-400/80 mt-1">
                      חלק מהמידע התזונתי חסר או משוער. מומלץ לבדוק ולהשלים לפני ההוספה.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Product Image */}
            {product.imageUrl && (
              <div className="px-4 pt-4">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-24 h-24 object-contain rounded-lg bg-white/5 mx-auto"
                />
              </div>
            )}

            {/* Nutrition per 100g */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                ערכים ל-100 גרם
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <NutrientCard
                  label="קלוריות"
                  value={product.per100g.kcal}
                  unit=""
                  primary
                />
                <NutrientCard
                  label="חלבון"
                  value={product.per100g.protein_g}
                  unit="ג'"
                />
                <NutrientCard
                  label="פחמימות"
                  value={product.per100g.carbs_g}
                  unit="ג'"
                />
                <NutrientCard
                  label="שומן"
                  value={product.per100g.fat_g}
                  unit="ג'"
                />
                {product.per100g.fiber_g !== undefined && (
                  <NutrientCard
                    label="סיבים"
                    value={product.per100g.fiber_g}
                    unit="ג'"
                  />
                )}
                {product.per100g.sugar_g !== undefined && (
                  <NutrientCard
                    label="סוכר"
                    value={product.per100g.sugar_g}
                    unit="ג'"
                  />
                )}
                {product.per100g.sodium_mg !== undefined && (
                  <NutrientCard
                    label="נתרן"
                    value={product.per100g.sodium_mg}
                    unit="מ״ג"
                  />
                )}
              </div>
            </div>

            {/* Portion Size */}
            <div className="p-4 border-t border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                גודל מנה
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

            {/* Scaled Nutrition */}
            <div className="p-4 border-t border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                תזונה עבור {grams}ג׳
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

            {/* Meal Type */}
            <div className="p-4 border-t border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                סוג ארוחה
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {MEAL_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setMealType(type.value)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      mealType === type.value
                        ? 'bg-[#E2F163] text-black'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
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
            <button
              onClick={handleLogMeal}
              disabled={isLogging}
              className="w-full py-3 bg-[#E2F163] text-black rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLogging ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>מוסיף...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>הוסף ליומן</span>
                </>
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Nutrient Card Component
function NutrientCard({
  label,
  value,
  unit,
  primary = false,
}: {
  label: string;
  value: number;
  unit: string;
  primary?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-xl ${
        primary ? 'bg-[#E2F163]/10 border border-[#E2F163]/20' : 'bg-white/5'
      }`}
    >
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p
        className={`text-xl font-bold ${
          primary ? 'text-[#E2F163]' : 'text-white'
        }`}
      >
        {value}
        <span className="text-sm font-normal mr-0.5">{unit}</span>
      </p>
    </div>
  );
}