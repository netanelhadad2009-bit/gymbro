/**
 * Food Search Page
 * Full-page search with two tabs: All (Israeli MoH) and My Foods
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Search, Loader2, AlertCircle, Plus } from 'lucide-react';
import { useFoodSearch } from '@/lib/hooks/useFoodSearch';
import { useMyFoodsSearch } from '@/lib/hooks/useMyFoodsSearch';
import type { MyFoodResult } from '@/types/my-foods';
import PageSafeArea from '@/components/layout/PageSafeArea';
import { QuickAddSheet } from '@/components/nutrition/QuickAddSheet';
import type { FoodSearchResult } from '@/lib/hooks/useFoodSearch';
import { useSheet } from '@/contexts/SheetContext';
import { Keyboard } from '@capacitor/keyboard';

type TabType = 'all' | 'mine';

const TAB_LABELS: Record<TabType, string> = {
  all: 'הכל',
  mine: 'מנות שלי',
};

export default function FoodSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const { setIsKeyboardVisible } = useSheet();

  const initialQuery = searchParams.get('q') || '';
  const linkBarcode = searchParams.get('link') || undefined;

  // Tab state (default to "all")
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // Quick add state
  const [quickAddFood, setQuickAddFood] = useState<FoodSearchResult | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // MoH search hook (for "all" tab)
  const mohSearch = useFoodSearch(initialQuery, 300, 'israel_moh', 'all');

  // My Foods search hook (for "mine" tab)
  const myFoodsSearch = useMyFoodsSearch(initialQuery, 300);

  // Listen for keyboard show/hide to hide bottom nav
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyboardShow = () => {
      console.log('[NutritionSearch] Keyboard shown - hiding bottom nav');
      setIsKeyboardVisible(true);
    };

    const handleKeyboardHide = () => {
      console.log('[NutritionSearch] Keyboard hidden - showing bottom nav');
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

  // Auto-focus input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  // Get current search state based on active tab
  const currentQuery = activeTab === 'all' ? mohSearch.query : myFoodsSearch.query;
  const currentSetQuery = activeTab === 'all' ? mohSearch.setQuery : myFoodsSearch.setQuery;

  // Update URL when query changes
  useEffect(() => {
    if (currentQuery.trim()) {
      const params = new URLSearchParams();
      params.set('q', currentQuery);
      if (linkBarcode) {
        params.set('link', linkBarcode);
      }

      const newUrl = `/nutrition/search?${params.toString()}`;
      // Only update if different to avoid infinite loop
      if (window.location.pathname + window.location.search !== newUrl) {
        router.replace(newUrl, { scroll: false });
      }
    }
  }, [currentQuery, linkBarcode, router]);

  const handleFoodClick = (food: any) => {
    // Haptic feedback
    if (window.navigator.vibrate) {
      window.navigator.vibrate(30);
    }

    // Handle different food sources
    if (activeTab === 'all') {
      // MoH food - navigate to MoH details page
      const url = `/nutrition/food/${food.id}${linkBarcode ? `?link=${linkBarcode}` : ''}`;
      router.push(url);
    } else {
      // My Foods - check source
      const myFood = food as MyFoodResult;
      if (myFood.source === 'manual') {
        // Manual food - navigate to manual food details
        router.push(`/nutrition/food/manual/${myFood.id}`);
      } else if (myFood.source === 'logged') {
        // Logged meal - navigate to meal details page
        router.push(`/nutrition/meal/${myFood.mealId || myFood.id}`);
      } else if (myFood.source === 'moh' && myFood.ref_id) {
        // MoH food from my foods - navigate to MoH details
        const url = `/nutrition/food/${myFood.ref_id}${linkBarcode ? `?link=${linkBarcode}` : ''}`;
        router.push(url);
      }
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Haptic feedback (30ms)
    if (window.navigator.vibrate) {
      window.navigator.vibrate(30);
    }
  };

  const handleQuickAdd = (food: FoodSearchResult, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to details page
    // Haptic feedback
    if (window.navigator.vibrate) {
      window.navigator.vibrate(30);
    }
    setQuickAddFood(food);
    setShowQuickAdd(true);
  };

  const handleQuickAddMyFood = (food: MyFoodResult, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to details page
    // Haptic feedback
    if (window.navigator.vibrate) {
      window.navigator.vibrate(30);
    }
    // Convert MyFoodResult to FoodSearchResult format
    const convertedFood: FoodSearchResult = {
      id: food.id,
      name_he: food.name_he,
      brand: food.brand,
      calories_per_100g: food.calories_per_100g,
      protein_g_per_100g: food.protein_g_per_100g,
      carbs_g_per_100g: food.carbs_g_per_100g,
      fat_g_per_100g: food.fat_g_per_100g,
      fiber_g_per_100g: null,
      sugars_g_per_100g: null,
      sodium_mg_per_100g: null,
      source: food.source,
      is_partial: false,
    };
    setQuickAddFood(convertedFood);
    setShowQuickAdd(true);
  };

  console.log('[SafeArea] search page ok');

  return (
    <PageSafeArea>
      {/* Sticky Header - covers notch with solid background */}
      <header className="sticky top-0 z-50 bg-[#0D0E0F]/95 supports-[backdrop-filter]:bg-[#0D0E0F]/80 backdrop-blur pt-[env(safe-area-inset-top)] border-b border-zinc-800">
        {/* Back Button + Title Row */}
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors"
            aria-label="חזור"
          >
            <ArrowRight className="w-5 h-5 text-zinc-300" />
          </button>
          <h1 className="flex-1 text-xl font-bold text-right">
            {linkBarcode ? 'חיפוש וקישור ברקוד' : 'חיפוש במאגר'}
          </h1>
        </div>

        {/* Barcode Info */}
        {linkBarcode && (
          <div className="px-4 pb-3">
            <div className="bg-zinc-900 rounded-lg px-3 py-2 inline-flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-[#E2F163]"
              >
                <path d="M3 5v14" />
                <path d="M8 5v14" />
                <path d="M12 5v14" />
                <path d="M17 5v14" />
                <path d="M21 5v14" />
              </svg>
              <span className="text-sm text-zinc-300">ברקוד: {linkBarcode}</span>
            </div>
          </div>
        )}

        {/* Tab Control */}
        <div className="px-4 pb-3">
          <div className="inline-flex bg-zinc-900 rounded-xl p-1 gap-1">
            {(['all', 'mine'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-[#E2F163] text-black shadow-sm'
                    : 'text-zinc-300 hover:text-zinc-100'
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={currentQuery}
              onChange={(e) => currentSetQuery(e.target.value)}
              placeholder="חפשו מאכל..."
              className="w-full bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 rounded-xl pr-11 pl-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-[#E2F163]/50"
              dir="rtl"
            />
            {(mohSearch.isLoading || myFoodsSearch.isLoading) && (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E2F163] animate-spin" />
            )}
          </div>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="grow overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        {/* Conditionally render only the active tab */}
        {activeTab === 'all' ? (
          // All Tab (MoH Search)
          <div key="all-tab" className="space-y-2">
            {/* Error State */}
            {mohSearch.error && (
              <div className="flex flex-col items-center gap-3 p-6 bg-red-950/30 border border-red-900/50 rounded-xl text-center">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <div>
                  <p className="text-base font-medium text-red-300 mb-2">שגיאה בחיפוש</p>
                  <p className="text-sm text-red-400">{mohSearch.error}</p>
                </div>
              </div>
            )}

            {/* Empty State - No Query */}
            {!mohSearch.error && !mohSearch.query && !mohSearch.isLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="w-16 h-16 text-zinc-600 mb-4" />
                <p className="text-zinc-400 text-lg mb-2">הקלידו שם מאכל לחיפוש</p>
                <p className="text-sm text-zinc-500">
                  המאגר כולל מידע תזונתי ממשרד הבריאות
                </p>
              </div>
            )}

            {/* No Results */}
            {!mohSearch.error && mohSearch.query && !mohSearch.isLoading && mohSearch.results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="w-16 h-16 text-zinc-600 mb-4" />
                <p className="text-zinc-400 text-lg mb-2">לא נמצאו תוצאות</p>
                <p className="text-sm text-zinc-500">נסו לחפש שם כללי יותר</p>
                {mohSearch.query && (
                  <p className="text-sm text-zinc-600 mt-2">חיפשתם: "{mohSearch.query}"</p>
                )}
              </div>
            )}

            {/* Loading Skeletons */}
            {mohSearch.isLoading && mohSearch.results.length === 0 && (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="bg-zinc-900 rounded-xl p-4 animate-pulse"
                  >
                    <div className="h-5 bg-zinc-800 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-zinc-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {/* Results List */}
            {!mohSearch.error && mohSearch.results.length > 0 && (
              <div className="space-y-2">
                {mohSearch.results.map((food) => (
                  <div
                    key={food.id}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors flex items-center gap-2 overflow-hidden group"
                  >
                    {/* Main clickable area - navigate to details */}
                    <button
                      onClick={() => handleFoodClick(food)}
                      className="flex-1 p-4 text-right"
                    >
                      <div className="flex flex-col gap-1">
                        <h3 className="font-medium text-zinc-100 text-lg">
                          {food.name_he}
                        </h3>
                        <p className="text-sm text-zinc-400">
                          100 גרם • {food.calories_per_100g || 0} קלוריות
                        </p>
                      </div>
                    </button>

                    {/* Quick Add Button */}
                    {!linkBarcode && (
                      <div className="flex items-center pr-4 pl-4">
                        <button
                          onClick={(e) => handleQuickAdd(food, e)}
                          className="w-10 h-10 rounded-full bg-[#E2F163]/10 hover:bg-[#E2F163]/20 flex items-center justify-center transition-colors"
                          aria-label="הוסף ליומן"
                        >
                          <Plus className="w-5 h-5 text-[#E2F163]" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // My Foods Tab
          <div key="mine-tab" className="space-y-2">
            {/* Error State */}
            {myFoodsSearch.error && (
              <div className="flex flex-col items-center gap-3 p-6 bg-red-950/30 border border-red-900/50 rounded-xl text-center">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <div>
                  <p className="text-base font-medium text-red-300 mb-2">שגיאה בחיפוש</p>
                  <p className="text-sm text-red-400">{myFoodsSearch.error}</p>
                </div>
              </div>
            )}

            {/* Empty State - No Items */}
            {!myFoodsSearch.error && !myFoodsSearch.isLoading && myFoodsSearch.results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="w-16 h-16 text-zinc-600 mb-4" />
                <p className="text-zinc-400 text-lg mb-2">עדיין אין מנות שמורות</p>
                <p className="text-sm text-zinc-500">
                  הוסיפו מאכל ליומן או צרו מוצר ידני
                </p>
              </div>
            )}

            {/* Loading Skeletons */}
            {myFoodsSearch.isLoading && myFoodsSearch.results.length === 0 && (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="bg-zinc-900 rounded-xl p-4 animate-pulse"
                  >
                    <div className="h-5 bg-zinc-800 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-zinc-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {/* Results List */}
            {!myFoodsSearch.error && myFoodsSearch.results.length > 0 && (
              <div className="space-y-2">
                {myFoodsSearch.results.map((food) => (
                  <div
                    key={food.id}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors flex items-center gap-2 overflow-hidden group"
                  >
                    {/* Main clickable area - navigate to details */}
                    <button
                      onClick={() => handleFoodClick(food)}
                      className="flex-1 p-4 text-right"
                    >
                      <div className="flex flex-col gap-1">
                        <h3 className="font-medium text-zinc-100 text-lg">
                          {food.name_he}
                        </h3>
                        <p className="text-sm text-zinc-400">
                          100 גרם • {food.calories_per_100g || 0} קלוריות
                        </p>
                      </div>
                    </button>

                    {/* Quick Add Button */}
                    <div className="flex items-center pr-4 pl-4">
                      <button
                        onClick={(e) => handleQuickAddMyFood(food, e)}
                        className="w-10 h-10 rounded-full bg-[#E2F163]/10 hover:bg-[#E2F163]/20 flex items-center justify-center transition-colors"
                        aria-label="הוסף ליומן"
                      >
                        <Plus className="w-5 h-5 text-[#E2F163]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Quick Add Sheet */}
      <QuickAddSheet
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        food={quickAddFood}
        accentColor="#E2F163"
      />
    </PageSafeArea>
  );
}
