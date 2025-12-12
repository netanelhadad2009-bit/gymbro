/**
 * Food Details Page
 * Display full nutrition facts for a food item with portion control
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { ArrowRight, Loader2, AlertCircle, Check } from 'lucide-react';
import { logMealFromFood, type FoodToLog, type MealType } from '@/lib/nutrition/log';
import { useToast } from '@/components/ui/use-toast';
import type { FoodSearchResult } from '@/lib/hooks/useFoodSearch';
import PageSafeArea from '@/components/layout/PageSafeArea';
import AppHeader from '@/components/layout/AppHeader';
import { useSheet } from '@/contexts/SheetContext';
import { Keyboard } from '@capacitor/keyboard';

export default function FoodDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { setIsKeyboardVisible } = useSheet();

  const foodId = params.id as string;
  const linkBarcode = searchParams.get('link') || undefined;

  const [food, setFood] = useState<FoodSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [portion, setPortion] = useState(100);
  const [mealType, setMealType] = useState<MealType>('snack');

  const [isLogging, setIsLogging] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // Haptic feedback helpers
  const hapticSuccess = () => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const hapticError = () => {
    if (navigator.vibrate) {
      navigator.vibrate([30, 30, 30]);
    }
  };

  // Load food data
  useEffect(() => {
    async function loadFood() {
      try {
        setLoading(true);
        setError(null);

        // Fetch from search API by ID
        const response = await fetch(`/api/israel-moh/food/${foodId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load food data');
        }

        const data = await response.json();

        if (!data.ok || !data.food) {
          throw new Error('Food not found');
        }

        setFood(data.food);
      } catch (err: any) {
        console.error('[FoodDetails] Load error:', err);
        setError(err.message || 'שגיאה בטעינת המוצר');
        hapticError();
      } finally {
        setLoading(false);
      }
    }

    if (foodId) {
      loadFood();
    }
  }, [foodId]);

  // Listen for keyboard show/hide to hide bottom nav
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyboardShow = () => {
      console.log('[FoodDetails] Keyboard shown - hiding bottom nav');
      setIsKeyboardVisible(true);
    };

    const handleKeyboardHide = () => {
      console.log('[FoodDetails] Keyboard hidden - showing bottom nav');
      setIsKeyboardVisible(false);
    };

    let showListener: any;
    let hideListener: any;

    const setupListeners = async () => {
      showListener = await Keyboard.addListener('keyboardWillShow', handleKeyboardShow);
      hideListener = await Keyboard.addListener('keyboardWillHide', handleKeyboardHide);
    };

    setupListeners();

    return () => {
      setIsKeyboardVisible(false);
      showListener?.remove();
      hideListener?.remove();
    };
  }, [setIsKeyboardVisible]);

  // Handle barcode linking
  const handleLinkBarcode = async () => {
    if (!linkBarcode || !food) return;

    setIsLinking(true);
    console.log('[FoodDetails] Linking barcode', linkBarcode, 'to food', food.id);

    try {
      const response = await fetch('/api/barcode/alias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: linkBarcode,
          moh_food_id: food.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          hapticError();
          toast({
            title: 'ברקוד כבר קיים במערכת',
            description: data.error || 'ברקוד זה כבר מקושר למוצר אחר',
            variant: 'destructive',
          });
          return;
        }
        throw new Error(data.error || 'Failed to link barcode');
      }

      console.log('[FoodDetails] Link success, points:', data.points_awarded);
      hapticSuccess();

      toast({
        title: 'הברקוד קושר למוצר בהצלחה (+5 נקודות)',
        description: `${food.name_he}${food.brand ? ` (${food.brand})` : ''}`,
        duration: 4000,
      });

      // Navigate back to nutrition page after successful link
      setTimeout(() => {
        router.push('/nutrition');
      }, 1000);
    } catch (error: any) {
      console.error('[FoodDetails] Link error:', error);
      hapticError();
      toast({
        title: 'שגיאה בקישור הברקוד',
        description: error.message || 'נסו שוב מאוחר יותר',
        variant: 'destructive',
      });
    } finally {
      setIsLinking(false);
    }
  };

  // Handle adding meal to diary
  const handleAddMeal = async () => {
    if (!food) return;

    setIsLogging(true);
    console.log('[FoodDetails] Logging meal:', { portion, mealType });

    try {
      const foodToLog: FoodToLog = {
        name: food.name_he,
        name_he: food.name_he,
        brand: food.brand || undefined,
        calories_per_100g: food.calories_per_100g ?? 0,
        protein_g_per_100g: food.protein_g_per_100g ?? 0,
        carbs_g_per_100g: food.carbs_g_per_100g ?? 0,
        fat_g_per_100g: food.fat_g_per_100g ?? 0,
        fiber_g_per_100g: food.fiber_g_per_100g ?? undefined,
        sugars_g_per_100g: food.sugars_g_per_100g ?? undefined,
        sodium_mg_per_100g: food.sodium_mg_per_100g ?? undefined,
        source: 'israel_moh',
        isPartial: food.is_partial,
      };

      const result = await logMealFromFood({
        food: foodToLog,
        portionGrams: portion,
        mealType,
      });

      if (!result.ok) {
        throw new Error(result.error || 'Failed to log meal');
      }

      console.log('[FoodDetails] Log success:', result.mealId);
      hapticSuccess();

      toast({
        title: 'הארוחה נוספה ליומן',
        description: `${portion}ג׳ ${food.name_he}`,
        duration: 3000,
      });

      // Navigate back to nutrition page
      router.push('/nutrition?refresh=1');
    } catch (error: any) {
      console.error('[FoodDetails] Log error:', error);
      hapticError();
      toast({
        title: 'שגיאה ברישום הארוחה',
        description: error.message || 'נסו שוב מאוחר יותר',
        variant: 'destructive',
      });
    } finally {
      setIsLogging(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-[100dvh] bg-[#0D0E0F] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#E2F163] animate-spin mx-auto mb-4" />
          <p className="text-white">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !food) {
    return (
      <div className="h-[100dvh] bg-[#0D0E0F] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">שגיאה בטעינת המוצר</h2>
          <p className="text-zinc-400 mb-6">{error || 'המוצר לא נמצא'}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-[#E2F163] text-black rounded-xl font-semibold"
          >
            חזור
          </button>
        </div>
      </div>
    );
  }

  console.log('[SafeArea] product page ok');

  // Calculate nutrition values for current portion
  const calcValue = (per100g: number | null | undefined) => {
    if (!per100g) return 0;
    return Math.round((per100g * portion) / 100);
  };

  const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
    { value: 'breakfast', label: 'Breakfast', emoji: '🌅' },
    { value: 'lunch', label: 'Lunch', emoji: '☀️' },
    { value: 'dinner', label: 'Dinner', emoji: '🌙' },
    { value: 'snack', label: 'Snack', emoji: '🍎' },
  ];

  return (
    <PageSafeArea>
      <AppHeader
        title="פרטי מוצר"
        left={
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors"
            aria-label="חזור"
          >
            <ArrowRight className="w-5 h-5 text-zinc-300" />
          </button>
        }
        right={
          <button
            onClick={handleAddMeal}
            disabled={isLogging || portion <= 0}
            className="w-10 h-10 rounded-full bg-[#E2F163] flex items-center justify-center hover:bg-[#d4e350] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="הוסף ליומן"
          >
            {isLogging ? (
              <Loader2 className="w-5 h-5 text-black animate-spin" />
            ) : (
              <Check className="w-5 h-5 text-black" />
            )}
          </button>
        }
      />

      {/* Main Scrollable Content */}
      <main className="grow overflow-y-auto px-6 pb-4" dir="rtl">
        <div className="py-6 space-y-6">
          {/* Header */}
          <div className="text-right">
            <h2 className="text-2xl font-bold text-white">{food.name_he}</h2>
            {food.brand && (
              <p className="text-sm text-zinc-400 mt-1">{food.brand}</p>
            )}
          </div>

          {/* Portion Control */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2 text-right">
              כמות (גרם)
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPortion(Math.max(10, portion - 10))}
                className="w-12 h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-2xl text-white transition-colors"
              >
                −
              </button>
              <input
                type="number"
                value={portion}
                onChange={(e) => setPortion(Math.max(1, parseInt(e.target.value) || 0))}
                className="flex-1 text-center bg-zinc-900 text-white text-2xl font-bold rounded-xl h-12 focus:outline-none focus:ring-2 focus:ring-[#E2F163]/50"
                style={{ direction: 'ltr' }}
              />
              <button
                onClick={() => setPortion(portion + 10)}
                className="w-12 h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-2xl text-white transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Nutrition Preview */}
          <div className="bg-zinc-900/50 rounded-2xl p-4">
            <p className="text-xs text-zinc-400 mb-3 text-right">תזונה עבור {portion}ג׳</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-white">
                  {calcValue(food.calories_per_100g)}
                </div>
                <div className="text-xs text-zinc-400">קלוריות</div>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold" style={{ color: '#C9456C' }}>
                  {calcValue(food.protein_g_per_100g)}
                </div>
                <div className="text-xs text-zinc-400">חלבון (ג׳)</div>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold" style={{ color: '#FFA856' }}>
                  {calcValue(food.carbs_g_per_100g)}
                </div>
                <div className="text-xs text-zinc-400">פחמימות (ג׳)</div>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold" style={{ color: '#5B9BFF' }}>
                  {calcValue(food.fat_g_per_100g)}
                </div>
                <div className="text-xs text-zinc-400">שומן (ג׳)</div>
              </div>
            </div>
          </div>

          {/* Meal Type Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3 text-right">
              סוג ארוחה
            </label>
            <div className="grid grid-cols-2 gap-3">
              {MEAL_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setMealType(type.value)}
                  className={`
                    rounded-2xl px-4 py-3 flex flex-col items-center justify-center gap-1 transition-all
                    ${
                      mealType === type.value
                        ? 'bg-zinc-900/80 border-2 shadow-[0_0_0_1px_rgba(226,241,99,0.4)]'
                        : 'bg-zinc-900/50 border border-zinc-800/70 hover:bg-zinc-800/80'
                    }
                  `}
                  style={
                    mealType === type.value
                      ? { borderColor: '#E2F16380' }
                      : undefined
                  }
                >
                  <span className="text-2xl">{type.emoji}</span>
                  <span className="text-sm font-semibold text-white">{type.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Actions */}
      <div className="sticky bottom-0 z-50 bg-[#0D0E0F]/95 backdrop-blur border-t border-white/10 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3 space-y-3">
        {/* Link Barcode Button (if applicable) */}
        {linkBarcode && (
          <button
            onClick={handleLinkBarcode}
            disabled={isLinking}
            className="w-full py-3.5 bg-[#E2F163]/10 border border-[#E2F163]/30 text-[#E2F163] rounded-xl font-semibold hover:bg-[#E2F163]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLinking ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                קושר ברקוד...
              </>
            ) : (
              <>
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
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                קשר ברקוד למוצר זה
              </>
            )}
          </button>
        )}

        {/* Add to Meal Button */}
        <button
          onClick={handleAddMeal}
          disabled={isLogging || portion <= 0}
          className="w-full py-3.5 bg-[#E2F163] text-black rounded-xl font-semibold hover:bg-[#d4e350] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLogging ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              מוסיף ליומן...
            </>
          ) : (
            'הוסף ליומן'
          )}
        </button>
      </div>
    </PageSafeArea>
  );
}
