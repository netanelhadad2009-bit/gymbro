/**
 * QuickAddSheet - Bottom sheet for quickly adding food to diary
 *
 * Allows selecting portion and meal type without navigating to details page
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { logMealFromFood, type FoodToLog, type MealType } from '@/lib/nutrition/log';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { useSheet } from '@/contexts/SheetContext';
import { Keyboard } from '@capacitor/keyboard';

interface QuickAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  food: {
    id: string | number;
    name_he: string;
    brand?: string | null;
    calories_per_100g?: number | null;
    protein_g_per_100g?: number | null;
    carbs_g_per_100g?: number | null;
    fat_g_per_100g?: number | null;
    fiber_g_per_100g?: number | null;
    sugars_g_per_100g?: number | null;
    sodium_mg_per_100g?: number | null;
    source?: string;
    is_partial?: boolean;
  } | null;
  accentColor?: string;
}

const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
  { value: 'breakfast', label: 'ארוחת בוקר', emoji: '🌅' },
  { value: 'lunch', label: 'צהריים', emoji: '☀️' },
  { value: 'dinner', label: 'ערב', emoji: '🌙' },
  { value: 'snack', label: 'חטיף', emoji: '🍎' },
];

export function QuickAddSheet({
  isOpen,
  onClose,
  food,
  accentColor = '#E2F163',
}: QuickAddSheetProps) {
  const [portion, setPortion] = useState(100);
  const [mealType, setMealType] = useState<MealType>('snack');
  const [isAdding, setIsAdding] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { toast } = useToast();
  const router = useRouter();
  const { setIsSheetOpen, setIsKeyboardVisible } = useSheet();

  // Update sheet context when this sheet opens/closes
  useEffect(() => {
    setIsSheetOpen(isOpen);
  }, [isOpen, setIsSheetOpen]);

  // Listen for keyboard show/hide events
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const handleKeyboardShow = (info: any) => {
      console.log('[QuickAddSheet] Keyboard shown, height:', info.keyboardHeight);
      setKeyboardHeight(info.keyboardHeight);
      setIsKeyboardVisible(true);
    };

    const handleKeyboardHide = () => {
      console.log('[QuickAddSheet] Keyboard hidden');
      setKeyboardHeight(0);
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
  }, [isOpen, setIsKeyboardVisible]);

  // Haptic feedback
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

  const handleAdd = async () => {
    if (!food) return;

    setIsAdding(true);

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
        source: food.source || 'israel_moh',
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

      hapticSuccess();

      toast({
        title: 'הארוחה נוספה ליומן',
        description: `${portion}ג׳ ${food.name_he}`,
        duration: 3000,
      });

      onClose();

      // Navigate back to nutrition page
      router.push('/nutrition?refresh=1');
    } catch (error: any) {
      console.error('[QuickAddSheet] Add error:', error);
      hapticError();
      toast({
        title: 'שגיאה ברישום הארוחה',
        description: error.message || 'נסו שוב מאוחר יותר',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Calculate nutrition values for current portion
  const calcValue = (per100g: number | null | undefined) => {
    if (!per100g) return 0;
    return Math.round((per100g * portion) / 100);
  };

  if (!food) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[99998] bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 99998 }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            className="fixed inset-x-0 z-[99999] rounded-t-3xl bg-[#1a1b20] border-t border-white/10 max-h-[85vh] flex flex-col transition-all duration-200"
            style={{
              zIndex: 99999,
              bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0px',
            }}
            dir="rtl"
          >
            {/* Handle bar */}
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-4" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white/80" />
            </button>

            {/* Header */}
            <div className="px-6 pb-4">
              <h2 className="text-2xl font-bold text-white text-right">הוסף ליומן</h2>
              <div className="mt-2 text-right">
                <h3 className="text-lg font-semibold text-white">{food.name_he}</h3>
                {food.brand && (
                  <p className="text-sm text-zinc-400">{food.brand}</p>
                )}
              </div>
            </div>

            {/* Scrollable content */}
            <div className="px-6 overflow-y-auto flex-1 pb-6 space-y-6">
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
                          ? { borderColor: `${accentColor}80` }
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

            {/* Sticky Bottom Button */}
            <div className="sticky bottom-0 bg-[#1a1b20] border-t border-white/10 px-6 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 z-[100000]" style={{ zIndex: 100000 }}>
              <button
                onClick={handleAdd}
                disabled={isAdding || portion <= 0}
                className="w-full py-3.5 bg-[#E2F163] text-black rounded-xl font-semibold hover:bg-[#d4e350] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    מוסיף...
                  </>
                ) : (
                  'הוסף ליומן'
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
