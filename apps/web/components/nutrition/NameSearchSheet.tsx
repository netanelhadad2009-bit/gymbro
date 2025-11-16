/**
 * NameSearchSheet Component
 * Search Israeli Ministry of Health nutrition database by product name
 * Optionally link results to a barcode for community mapping
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, AlertCircle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useIsraelSearch, type IsraelMoHFood } from '@/lib/hooks/useIsraelSearch';
import { useToast } from '@/components/ui/use-toast';
import type { BarcodeProduct } from '@/types/barcode';

interface NameSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, show "Link Barcode" CTA and create alias on selection */
  linkBarcode?: string;
  /** Initial search query to prefill */
  initialQuery?: string;
  /** Called after successful barcode link */
  onLinkSuccess?: (product: BarcodeProduct) => void;
  /** Called when viewing product details (preview mode) */
  onPreview?: (food: IsraelMoHFood) => void;
}

export function NameSearchSheet({
  open,
  onOpenChange,
  linkBarcode,
  initialQuery,
  onLinkSuccess,
  onPreview,
}: NameSearchSheetProps) {
  const [query, setQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<IsraelMoHFood | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { results, isLoading, error, search, clear } = useIsraelSearch(300);

  const isLinkMode = !!linkBarcode;

  // Auto-focus input when sheet opens
  useEffect(() => {
    if (open) {
      console.log('[IsraelSearch] Opening with', { linkBarcode, initialQuery });
      // Prefill query if provided
      if (initialQuery) {
        setQuery(initialQuery);
      }
      // Auto-focus input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      // Clear on close
      setQuery('');
      setSelectedFood(null);
      clear();
    }
  }, [open, initialQuery, linkBarcode, clear]);

  // Search on query change
  useEffect(() => {
    if (query) {
      console.log('[IsraelSearch] Triggering search for:', query);
      search(query);
    } else {
      clear();
    }
  }, [query, search, clear]);

  const handleLinkBarcode = async (food: IsraelMoHFood) => {
    if (!linkBarcode) return;

    setIsLinking(true);
    console.log('[NameSearch] Linking barcode', linkBarcode, 'to MoH food ID', food.id, '-', food.name_he);

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
        // Handle 409 conflict (already mapped)
        if (response.status === 409) {
          console.warn('[NameSearch] Barcode already mapped:', data);
          // Haptic error
          if (navigator.vibrate) {
            navigator.vibrate([30, 30, 30]);
          }
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

      console.log('[Alias] POST /api/barcode/alias OK - Points awarded:', data.points_awarded);

      // Haptic success
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      // Create BarcodeProduct from the food item
      const product: BarcodeProduct = {
        barcode: linkBarcode,
        name: food.name_he,
        name_he: food.name_he,
        brand: food.brand || undefined,
        per100g: {
          kcal: Math.round(food.calories_per_100g || 0),
          protein_g: Math.round((food.protein_g_per_100g || 0) * 10) / 10,
          carbs_g: Math.round((food.carbs_g_per_100g || 0) * 10) / 10,
          fat_g: Math.round((food.fat_g_per_100g || 0) * 10) / 10,
          ...(food.fiber_g_per_100g && {
            fiber_g: Math.round(food.fiber_g_per_100g * 10) / 10,
          }),
          ...(food.sugars_g_per_100g && {
            sugar_g: Math.round(food.sugars_g_per_100g * 10) / 10,
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
        description: `${food.name_he} ${food.brand ? `(${food.brand})` : ''}`,
        duration: 4000,
      });

      onLinkSuccess?.(product);
      onOpenChange(false);
    } catch (error: any) {
      console.error('[Alias] POST /api/barcode/alias error:', error);
      // Haptic error
      if (navigator.vibrate) {
        navigator.vibrate([30, 30, 30]);
      }
      toast({
        title: 'שגיאה בקישור הברקוד',
        description: error.message || 'נסו שוב מאוחר יותר',
        variant: 'destructive',
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handlePreview = (food: IsraelMoHFood) => {
    setSelectedFood(food);
    onPreview?.(food);
  };

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
            className="fixed inset-x-0 bottom-0 z-[251] flex flex-col bg-zinc-950 rounded-t-3xl overflow-hidden"
            style={{
              maxHeight: 'calc(100vh - env(safe-area-inset-top) - 60px)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-zinc-100 text-right">
                  {isLinkMode ? 'חיפוש וקישור ברקוד' : 'חיפוש במאגר הישראלי'}
                </h2>
                {isLinkMode && (
                  <p className="text-sm text-zinc-400 text-right mt-1">
                    ברקוד: {linkBarcode}
                  </p>
                )}
              </div>
              <Dialog.Close asChild>
                <button
                  className="ml-4 p-2 rounded-full hover:bg-zinc-800 transition-colors"
                  aria-label="סגור"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </Dialog.Close>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="חפשו מוצר (לדוגמה: חלב תנובה, פסטה, במבה)"
                  className="w-full bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 rounded-xl px-11 py-3 text-right focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                  dir="rtl"
                />
                {isLoading && (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-lime-400 animate-spin" />
                )}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
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
                        {error.includes('Authentication') && (
                          <p className="text-xs text-red-400 mt-2">
                            נדרשת התחברות. אנא התחבר ונסה שוב.
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

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
                      הקלידו שם מוצר או מותג לחיפוש
                    </p>
                    <p className="text-sm text-zinc-500 mt-2">
                      המאגר כולל מידע תזונתי ממשרד הבריאות
                    </p>
                  </motion.div>
                )}

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
                      נסו ניסוח אחר או קיצור
                    </p>
                  </motion.div>
                )}

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
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 hover:bg-zinc-900/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 text-right">
                            <div className="flex items-start justify-end gap-2">
                              <div>
                                <h3 className="font-medium text-zinc-100">
                                  {food.name_he}
                                </h3>
                                {food.brand && (
                                  <p className="text-sm text-zinc-400 mt-1">
                                    {food.brand}
                                  </p>
                                )}
                                {food.category && (
                                  <p className="text-xs text-zinc-500 mt-1">
                                    {food.category}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Nutrition Info */}
                            <div className="flex items-center gap-3 mt-2 text-sm text-zinc-400 justify-end">
                              <span>{Math.round(food.calories_per_100g || 0)} קק&quot;ל</span>
                              <span className="text-zinc-600">•</span>
                              <span>ח: {(food.protein_g_per_100g || 0).toFixed(1)}ג</span>
                              <span className="text-zinc-600">•</span>
                              <span>פ: {(food.carbs_g_per_100g || 0).toFixed(1)}ג</span>
                              <span className="text-zinc-600">•</span>
                              <span>ש: {(food.fat_g_per_100g || 0).toFixed(1)}ג</span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-3 justify-end">
                              {isLinkMode ? (
                                <button
                                  onClick={() => handleLinkBarcode(food)}
                                  disabled={isLinking}
                                  className="px-4 py-2 bg-lime-400 text-zinc-950 rounded-lg font-medium hover:bg-lime-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                  {isLinking ? (
                                    <span className="flex items-center gap-2">
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      קושר...
                                    </span>
                                  ) : (
                                    'קשר ברקוד למוצר זה'
                                  )}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handlePreview(food)}
                                  className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg font-medium hover:bg-zinc-700 transition-colors text-sm"
                                >
                                  הצג ערכים
                                </button>
                              )}
                            </div>
                          </div>
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
