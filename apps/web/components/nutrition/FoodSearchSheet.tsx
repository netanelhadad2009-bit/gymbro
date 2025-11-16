/**
 * FoodSearchSheet Component
 * RTL food search with two modes: link (barcode alias) or pick (add to diary)
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, AlertCircle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useFoodSearch, fmtG, fmtKcal, type FoodSearchResult } from '@/lib/hooks/useFoodSearch';
import { useToast } from '@/components/ui/use-toast';
import type { BarcodeProduct } from '@/types/barcode';

type FoodSearchMode = 'link' | 'pick';

interface FoodSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: FoodSearchMode;
  /** For mode="link": the barcode to link */
  barcode?: string;
  /** For mode="link": callback after successful link */
  onLinkSuccess?: (product: BarcodeProduct) => void;
  /** For mode="pick": callback after selecting a food */
  onPickFood?: (food: FoodSearchResult) => void;
}

export function FoodSearchSheet({
  open,
  onOpenChange,
  mode,
  barcode,
  onLinkSuccess,
  onPickFood,
}: FoodSearchSheetProps) {
  const [isLinking, setIsLinking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { query, setQuery, results, isLoading, error, clear } = useFoodSearch('', 300, 'israel_moh');

  // Auto-focus input when sheet opens
  useEffect(() => {
    if (open) {
      console.log('[FoodSearch] open mode=', mode, barcode ? `barcode=${barcode}` : '');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      clear();
    }
  }, [open, mode, barcode, clear]);

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

  // Handle barcode linking (mode="link")
  const handleLinkBarcode = async (food: FoodSearchResult) => {
    if (!barcode || mode !== 'link') return;

    setIsLinking(true);
    console.log('[FoodSearch] link barcode=', barcode, 'id=', food.id, food.name_he);

    try {
      const response = await fetch('/api/barcode/alias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode,
          moh_food_id: food.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle 409 conflict (already mapped)
        if (response.status === 409) {
          console.warn('[FoodSearch] Barcode already mapped:', data);
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

      if (!data.ok) {
        throw new Error(data.error || 'Failed to link barcode');
      }

      console.log('[FoodSearch] link success, points:', data.points_awarded);
      hapticSuccess();

      // Create BarcodeProduct from food
      const product: BarcodeProduct = {
        barcode,
        name: food.name_he,
        name_he: food.name_he,
        brand: food.brand || undefined,
        per100g: {
          kcal: fmtKcal(food.calories_per_100g),
          protein_g: parseFloat(fmtG(food.protein_g_per_100g)),
          carbs_g: parseFloat(fmtG(food.carbs_g_per_100g)),
          fat_g: parseFloat(fmtG(food.fat_g_per_100g)),
          ...(food.fiber_g_per_100g && {
            fiber_g: parseFloat(fmtG(food.fiber_g_per_100g)),
          }),
          ...(food.sugars_g_per_100g && {
            sugar_g: parseFloat(fmtG(food.sugars_g_per_100g)),
          }),
          ...(food.sodium_mg_per_100g && {
            sodium_mg: Math.round(food.sodium_mg_per_100g),
          }),
        },
        source: 'israel_moh',
        isPartial: food.is_partial,
        matchMeta: {
          matchedBy: 'name_hebrew',
          publisher: 'data.gov.il (קישור קהילתי)',
        },
      };

      toast({
        title: 'הברקוד קושר למוצר בהצלחה (+5 נקודות)',
        description: `${food.name_he}${food.brand ? ` (${food.brand})` : ''}`,
        duration: 4000,
      });

      onLinkSuccess?.(product);
      onOpenChange(false);
    } catch (error: any) {
      console.error('[FoodSearch] link error:', error);
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

  // Handle food pick (mode="pick")
  const handlePickFood = (food: FoodSearchResult) => {
    console.log('[FoodSearch] pick', food.id, food.name_he);
    hapticSuccess();
    onPickFood?.(food);
    onOpenChange(false);
  };

  const headerTitle = mode === 'link' ? 'חיפוש וקישור ברקוד' : 'חיפוש במאגר';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="fixed inset-0 z-[250] bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        </Dialog.Overlay>

        <Dialog.Content asChild>
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[251] flex flex-col bg-zinc-950 rounded-t-3xl overflow-hidden rtl"
            style={{
              maxHeight: 'calc(100vh - env(safe-area-inset-top) - 60px)',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex-1 text-right">
                <h2 className="text-lg font-semibold text-zinc-100">
                  {headerTitle}
                </h2>
                {mode === 'link' && barcode && (
                  <p className="text-sm text-zinc-400 mt-1">
                    ברקוד: {barcode}
                  </p>
                )}
              </div>
              <Dialog.Close asChild>
                <button
                  className="mr-4 p-2 rounded-full hover:bg-zinc-800 transition-colors"
                  aria-label="סגור"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </Dialog.Close>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="חפשו מאכל..."
                  className="w-full bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 rounded-xl pr-4 pl-11 py-3 text-right focus:outline-none focus:ring-2 focus:ring-[#E2F163]/50"
                  dir="rtl"
                />
                {isLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E2F163] animate-spin" />
                )}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* Error State */}
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4"
                  >
                    <div className="flex flex-col items-center gap-3 p-6 bg-red-950/30 border border-red-900/50 rounded-xl text-center">
                      <AlertCircle className="w-12 h-12 text-red-400" />
                      <div>
                        <p className="text-base font-medium text-red-300 mb-2">שגיאה בחיפוש</p>
                        <p className="text-sm text-red-400">{error}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Empty State */}
                {!error && !query && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-8 text-center"
                  >
                    <Search className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-400">
                      הקלידו שם מאכל לחיפוש
                    </p>
                    <p className="text-sm text-zinc-500 mt-2">
                      המאגר כולל מידע תזונתי ממשרד הבריאות
                    </p>
                  </motion.div>
                )}

                {/* No Results */}
                {!error && query && !isLoading && results.length === 0 && (
                  <motion.div
                    key="no-results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-8 text-center"
                  >
                    <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-400">לא נמצאו תוצאות</p>
                    <p className="text-sm text-zinc-500 mt-2">
                      נסו לחפש שם כללי יותר
                    </p>
                  </motion.div>
                )}

                {/* Loading Skeletons */}
                {isLoading && results.length === 0 && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="divide-y divide-zinc-800"
                  >
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 animate-pulse">
                        <div className="h-5 bg-zinc-800 rounded w-3/4 mb-2" />
                        <div className="h-4 bg-zinc-800 rounded w-1/2 mb-3" />
                        <div className="h-10 bg-zinc-800 rounded w-full" />
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* Results List */}
                {!error && results.length > 0 && (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="divide-y divide-zinc-800"
                  >
                    {results.map((food) => (
                      <motion.div
                        key={food.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 hover:bg-zinc-900/50 transition-colors"
                      >
                        <div className="flex flex-col gap-3 text-right">
                          {/* Title */}
                          <div>
                            <h3 className="font-medium text-zinc-100">
                              {food.name_he}
                            </h3>
                            {food.brand && (
                              <p className="text-sm text-zinc-400 mt-1 truncate">
                                {food.brand}
                              </p>
                            )}
                            {food.category && (
                              <p className="text-xs text-zinc-500 mt-1 truncate">
                                {food.category}
                              </p>
                            )}
                          </div>

                          {/* Macros */}
                          <div className="flex items-center gap-2 text-sm text-zinc-400 flex-wrap justify-end">
                            <span>{fmtKcal(food.calories_per_100g)} קק&quot;ל</span>
                            <span className="text-zinc-600">·</span>
                            <span>ח: {fmtG(food.protein_g_per_100g)}ג</span>
                            <span className="text-zinc-600">·</span>
                            <span>פ: {fmtG(food.carbs_g_per_100g)}ג</span>
                            <span className="text-zinc-600">·</span>
                            <span>ש: {fmtG(food.fat_g_per_100g)}ג</span>
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={() => mode === 'link' ? handleLinkBarcode(food) : handlePickFood(food)}
                            disabled={isLinking && mode === 'link'}
                            className="w-full py-3 bg-[#E2F163] text-zinc-950 rounded-xl font-semibold hover:bg-[#d4e350] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isLinking && mode === 'link' ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                קושר...
                              </>
                            ) : mode === 'link' ? (
                              'קשר ברקוד למוצר זה'
                            ) : (
                              'הוסף ליומן'
                            )}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
