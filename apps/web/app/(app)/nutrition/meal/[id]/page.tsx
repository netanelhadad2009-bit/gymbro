/**
 * Meal Details Page
 * Display a previously logged meal with portion multiplier and allow reuse
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowRight, Loader2, AlertCircle, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { logMealFromSavedMeal, type MealType } from '@/lib/nutrition/log';
import PageSafeArea from '@/components/layout/PageSafeArea';
import AppHeader from '@/components/layout/AppHeader';
import { useSheet } from '@/contexts/SheetContext';
import { Keyboard } from '@capacitor/keyboard';

interface Meal {
  id: string;
  user_id: string;
  date: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: string;
  image_url?: string;
  created_at: string;
}

export default function MealDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { setIsKeyboardVisible } = useSheet();

  const mealId = params.id as string;

  const [meal, setMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);

  // Portion state (grams-based, defaults to 100g)
  const [portion, setPortion] = useState(100);
  const [mealType, setMealType] = useState<MealType>('snack');

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

  // Load meal data
  useEffect(() => {
    async function loadMeal() {
      try {
        setLoading(true);
        setError(null);

        console.log('[MealDetail] Loading meal:', mealId);

        const response = await fetch(`/api/meals/${mealId}`, { cache: 'no-store' });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load meal');
        }

        const data = await response.json();

        if (!data.ok || !data.meal) {
          throw new Error('Meal not found');
        }

        console.log('[MealDetail] Loaded:', data.meal.name);
        setMeal(data.meal);
      } catch (err: any) {
        console.error('[MealDetail] Load error:', err);
        setError(err.message || 'שגיאה בטעינת הארוחה');
        hapticError();
      } finally {
        setLoading(false);
      }
    }

    if (mealId) {
      loadMeal();
    }
  }, [mealId]);

  // Listen for keyboard show/hide to hide bottom nav
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyboardShow = () => {
      console.log('[MealDetail] Keyboard shown - hiding bottom nav');
      setIsKeyboardVisible(true);
    };

    const handleKeyboardHide = () => {
      console.log('[MealDetail] Keyboard hidden - showing bottom nav');
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

  // Handle logging meal again
  const handleLogAgain = async () => {
    if (!meal) return;

    // Check if meal has any nutrition data
    const hasNutrition =
      meal.calories > 0 || meal.protein > 0 || meal.carbs > 0 || meal.fat > 0;

    if (!hasNutrition) {
      hapticError();
      toast({
        title: 'שגיאה',
        description: 'אין ערכים תזונתיים לארוחה זו',
        variant: 'destructive',
      });
      return;
    }

    if (portion <= 0) {
      hapticError();
      toast({
        title: 'שגיאה',
        description: 'הכמות חייבת להיות גדולה מאפס',
        variant: 'destructive',
      });
      return;
    }

    setIsLogging(true);
    // Convert grams to multiplier (100g = 1x)
    const multiplier = portion / 100;
    console.log('[MealDetail] LogAgain:', { portion, multiplier, mealType });

    try {
      const result = await logMealFromSavedMeal({
        mealId: meal.id,
        multiplier,
        mealType,
      });

      if (!result.ok) {
        throw new Error(result.error || 'Failed to log meal');
      }

      console.log('[MealDetail] LogAgain ok');
      hapticSuccess();

      toast({
        title: 'נוסף ליומן',
        description: `${portion}ג׳ ${meal.name}`,
        duration: 3000,
      });

      // Navigate back to nutrition page
      router.push('/nutrition?refresh=1');
    } catch (error: any) {
      console.error('[MealDetail] LogAgain error:', error);
      hapticError();
      toast({
        title: 'שגיאה בהוספה ליומן',
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
  if (error || !meal) {
    return (
      <div className="h-[100dvh] bg-[#0D0E0F] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">שגיאה בטעינת הארוחה</h2>
          <p className="text-zinc-400 mb-6">{error || 'הארוחה לא נמצאה'}</p>
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

  // Check if meal has complete nutrition data
  const hasNutrition =
    meal.calories > 0 || meal.protein > 0 || meal.carbs > 0 || meal.fat > 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Calculate nutrition values for current portion (scaled from 100g base)
  const calcValue = (baseValue: number) => {
    return Math.round((baseValue * portion) / 100);
  };

  const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
    { value: 'breakfast', label: 'ארוחת בוקר', emoji: '🌅' },
    { value: 'lunch', label: 'צהריים', emoji: '☀️' },
    { value: 'dinner', label: 'ערב', emoji: '🌙' },
    { value: 'snack', label: 'חטיף', emoji: '🍎' },
  ];

  return (
    <PageSafeArea>
      <AppHeader
        title="ארוחה שמורה"
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
            onClick={handleLogAgain}
            disabled={isLogging || !hasNutrition || portion <= 0}
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
          {/* Date Badge */}
          <div className="inline-flex items-center gap-2 bg-zinc-900 rounded-lg px-3 py-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-zinc-400"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-sm text-zinc-300">{formatDate(meal.created_at)}</span>
          </div>

          {/* Header */}
          <div className="text-right">
            <h2 className="text-2xl font-bold text-white">{meal.name}</h2>
            <p className="text-sm text-zinc-400 mt-1">ארוחה שנשמרה</p>
          </div>

          {/* Warning if no nutrition data */}
          {!hasNutrition && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <p className="text-amber-400 text-sm text-center">
                ⚠️ אין ערכים תזונתיים לארוחה זו. לא ניתן להוסיף ליומן.
              </p>
            </div>
          )}

          {hasNutrition && (
            <>
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
                      {calcValue(meal.calories)}
                    </div>
                    <div className="text-xs text-zinc-400">קלוריות</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold" style={{ color: '#C9456C' }}>
                      {calcValue(meal.protein)}
                    </div>
                    <div className="text-xs text-zinc-400">חלבון (ג׳)</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold" style={{ color: '#FFA856' }}>
                      {calcValue(meal.carbs)}
                    </div>
                    <div className="text-xs text-zinc-400">פחמימות (ג׳)</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold" style={{ color: '#5B9BFF' }}>
                      {calcValue(meal.fat)}
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
            </>
          )}
        </div>
      </main>

      {/* Sticky Bottom Action */}
      <div className="sticky bottom-0 z-50 bg-[#0D0E0F]/95 backdrop-blur border-t border-white/10 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
        <button
          onClick={handleLogAgain}
          disabled={isLogging || !hasNutrition || portion <= 0}
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
