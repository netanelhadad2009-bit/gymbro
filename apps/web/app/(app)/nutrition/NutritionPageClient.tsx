"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import StickyHeader from "@/components/ui/StickyHeader";
import { CaloriesWidget } from "@/components/nutrition/CaloriesWidget";
import { MacroCard } from "@/components/nutrition/MacroCard";
import { MealsList } from "@/components/nutrition/MealsList";
import { WeekDaySelector } from "@/components/nutrition/WeekDaySelector";
import { FloatingAddMealButton } from "@/components/nutrition/FloatingAddMealButton";
import { UserMealsList } from "@/components/nutrition/UserMealsList";
import { BarcodeScannerSheet } from "@/components/nutrition/BarcodeScannerSheet";
import { NutritionFactsSheet } from "@/components/nutrition/NutritionFactsSheet";
import { useBarcodeLookup, type LookupResult } from "@/lib/hooks/useBarcodeLookup";
import type { NutritionPlanT } from "@/lib/schemas/nutrition";
import type { BarcodeProduct } from "@/types/barcode";
import { useAuth } from "@/contexts/AuthProvider";
import * as storage from "@/lib/storage";
import { getMergedProfile, getMergedProfileSync } from "@/lib/profile/merge";
import { buildNutritionPayload } from "@/lib/nutrition/buildPayload";
import { supabase } from "@/lib/supabase";
import { setMealReviewCache } from "@/lib/nutrition/temp-storage";
import type { VisionMealResult } from "@/lib/nutrition/types";
import { NutrientIcon } from "@/components/icons/NutrientIcon";
import { useSheet } from "@/contexts/SheetContext";
import { useToast } from "@/components/ui/use-toast";
import { getVisionError, he } from "@/lib/i18n/he";
import { Keyboard } from "@capacitor/keyboard";

export default function NutritionPage() {
  const { user, session } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setIsSheetOpen, setIsKeyboardVisible } = useSheet();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string>("");
  const [profileLoaded, setProfileLoaded] = useState(false); // Load-gate to prevent race conditions
  const [data, setData] = useState<NutritionPlanT | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(() => new Date().getDay()); // Initialize to current day of week (0-6)
  const [showSummary, setShowSummary] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(() => {
    // Check sessionStorage on mount to restore scanning state
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('nutrition_scanning') === 'true';
    }
    return false;
  });
  const [scanningImageUrl, setScanningImageUrl] = useState<string | null>(() => {
    // Check sessionStorage on mount to restore image URL
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('nutrition_scanning_image');
    }
    return null;
  });
  const [userMeals, setUserMeals] = useState<any[]>([]);

  // Barcode scanner state
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showNutritionFacts, setShowNutritionFacts] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<BarcodeProduct | null>(null);
  const { lookup: lookupBarcode, isLoading: lookingUpBarcode } = useBarcodeLookup();

  // Track custom target values (overrides plan targets)
  const [customTargets, setCustomTargets] = useState<{
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }>({});

  // Log scanning state on mount for debugging
  useEffect(() => {
    const scanning = sessionStorage.getItem('nutrition_scanning');
    const imageUrl = sessionStorage.getItem('nutrition_scanning_image');
    console.log('[Nutrition] 🎨 Component mounted with scanning state:', {
      scanning,
      imageUrl: imageUrl ? imageUrl.substring(0, 50) + '...' : null,
      uploadingPhoto,
      scanningImageUrl: scanningImageUrl ? scanningImageUrl.substring(0, 50) + '...' : null
    });
  }, []);

  // Notify context when summary sheet opens/closes
  useEffect(() => {
    setIsSheetOpen(showSummary);
  }, [showSummary, setIsSheetOpen]);

  // Listen for keyboard show/hide to hide bottom nav
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyboardShow = () => {
      console.log('[Nutrition] Keyboard shown - hiding bottom nav');
      setIsKeyboardVisible(true);
    };

    const handleKeyboardHide = () => {
      console.log('[Nutrition] Keyboard hidden - showing bottom nav');
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

  // Track eaten meals: Map<dayIndex, Set<mealIndex>>
  const [eatenMealsByDay, setEatenMealsByDay] = useState<Map<number, Set<number>>>(new Map());

  // Get user ID (either authenticated or guest) and set profile loaded flag
  useEffect(() => {
    storage.getCurrentUserId().then(id => {
      setUserId(id);
      setProfileLoaded(true); // Mark profile as loaded once we have userId

      if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
        console.log("[Nutrition] Profile loaded:", { userId: id });
      }
    });
  }, [user]);

  // Load from cache or fetch with fingerprint-based caching
  const loadNutritionData = async (forceRefresh = false) => {
    // LOAD-GATE: Don't proceed until profile is loaded
    if (!profileLoaded || !userId) {
      if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
        console.log("[Nutrition] Waiting for profile to load...", { profileLoaded, userId });
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 0: Migrate birthdate for returning users if needed
      if (user) {
        try {
          const { ensureUserHasBirthdate } = await import('@/lib/auth/migrate-birthdate');
          const birthdate = await ensureUserHasBirthdate(supabase);
          if (birthdate) {
            console.log('[Nutrition] User birthdate available:', birthdate ? 'yes' : 'no');
          }
        } catch (err) {
          console.warn('[Nutrition] Failed to migrate birthdate:', err);
        }
      }

      // Step 1: Get merged profile from all sources (ASYNC - waits for Supabase)
      if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
        console.log("[Nutrition] Fetching merged profile (async)...");
      }

      const profile = await getMergedProfile();

      if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
        console.log("[Nutrition] Merged profile:", profile);
      }

      // Step 2: Build payload with type coercion and validation
      const { payload, missing } = buildNutritionPayload(profile, { days: 1 });

      if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
        console.log("[Nutrition] Built payload:", { payload, missing });
      }

      // Step 3: Calculate fingerprint for cache
      const fingerprint = storage.profileFingerprint(payload);

      if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
        console.log("[Nutrition] Cache key:", { userId, fingerprint });
      }

      // Step 4: Try cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = storage.getNutritionPlan(userId, payload, 7);

        if (cached) {
          // Check if fingerprint matches - if not, profile has changed, invalidate cache
          if (cached.fingerprint && cached.fingerprint !== fingerprint) {
            if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
              console.log("[Nutrition] Profile changed - cache invalidated", {
                oldFingerprint: cached.fingerprint,
                newFingerprint: fingerprint,
              });
            }
            // Clear old cache for this user
            storage.clearNutritionPlans(userId);
          } else {
            // Fingerprint matches, use cached data
            if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
              console.log("[Nutrition] Cache HIT - using cached plan");
            }
            setData(cached.plan);
            setLoading(false);
            return;
          }
        } else {
          if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
            console.log("[Nutrition] Cache MISS - fetching from API");
          }
        }
      } else {
        if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
          console.log("[Nutrition] Force refresh - clearing cache");
        }
        storage.clearNutritionPlans(userId);
      }

      // Step 5: Fetch persisted plan (never regenerate)
      const response = await fetch("/api/nutrition/plan", {
        method: "GET",
        headers: { "Cache-Control": "no-store" },
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No plan found - continue with empty state (UI will handle it gracefully)
          console.log("[Nutrition] No plan found (404) - showing empty state");
          setData(null);
          setLoading(false);
          return;
        }

        const errorData = await response.json().catch(() => ({}));
        console.error("[Nutrition] API error:", errorData);
        throw new Error(errorData.message || errorData.error || "Failed to fetch nutrition plan");
      }

      const apiResponse = await response.json();

      if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
        console.log("[Nutrition] API response received:", {
          fingerprintServer: apiResponse.fingerprintServer,
          fingerprintClient: fingerprint,
          calories: apiResponse.plan?.dailyTargets?.calories,
        });
      }

      // Strict guard: ensure we have a real plan object
      if (!apiResponse.plan || typeof apiResponse.plan !== 'object') {
        throw new Error("no_plan");
      }

      const result: NutritionPlanT = apiResponse.plan;
      setData(result);

      // Step 6: Save to user-scoped cache with fingerprint
      // Guard: only cache real plans
      if (result && typeof result === 'object' && result.days) {
        storage.setNutritionPlan(userId, payload, result);
      } else {
        throw new Error("cacheNutritionPlan: missing plan");
      }

      if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
        console.log("[Nutrition] Plan cached successfully");
      }
    } catch (err: any) {
      console.error("[Nutrition] Error:", err);

      // Try to use localStorage draft as optimistic fallback
      // Only use if it contains a REAL plan object, not a placeholder
      const draft = storage.readNutritionDraft();
      if (draft?.plan && typeof draft.plan === 'object' && draft.plan.days && draft.status === 'ready') {
        console.warn("[Nutrition] Using localStorage draft as fallback");
        setData(draft.plan);
        setError(null);
        setLoading(false);
        return;
      }

      setError((err as Error).message || "שגיאה בטעינת תוכנית התזונה");
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount after profile is loaded (with optimistic cache check)
  useEffect(() => {
    if (profileLoaded && userId) {
      try {
        // Optimistic: Try to load from cache immediately
        const profile = getMergedProfileSync();
        const { payload, missing } = buildNutritionPayload(profile, { days: 1 });

        if (missing.length === 0) {
          const cached = storage.getNutritionPlan(userId, payload, 7);
          if (cached) {
            if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
              console.log("[Nutrition] Optimistic cache load successful");
            }
            setData(cached.plan);
            setLoading(false);
            return;
          }
        }

        // No cache or missing fields - fetch fresh
        if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
          console.log("[Nutrition] Initial load - fetching fresh data");
        }
        loadNutritionData();
      } catch (err: any) {
        console.error("[Nutrition] Error in initial load:", err);
        loadNutritionData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoaded, userId]);

  // Normalize plan structure - support both { plan: {...} } and direct plan
  const plan = ((data as any)?.plan ?? data) as NutritionPlanT | null;

  // Safe defaults
  const days = Array.isArray(plan?.days) ? plan.days : [];
  const hasDays = days.length > 0;

  // Cycle through available days (e.g., if plan has 3 days, day 4 shows day 1, day 5 shows day 2, etc.)
  const safeIndex = hasDays && days.length > 0
    ? currentDayIndex % days.length
    : 0;

  // Get current day data
  const currentDay = hasDays ? days[safeIndex] : null;

  // Get eaten meals for current day
  const currentDayEatenMeals = eatenMealsByDay.get(currentDayIndex) || new Set<number>();

  // Handle meal toggle
  const handleToggleMeal = async (mealIndex: number) => {
    if (!currentDay) return;

    const meal = currentDay.meals[mealIndex];
    if (!meal) return;

    const isCurrentlyEaten = currentDayEatenMeals.has(mealIndex);
    const dateString = getSelectedDate(currentDayIndex);
    const planMealId = `${currentDayIndex}_${mealIndex}`;

    // Always update local state immediately for responsive UI
    setEatenMealsByDay((prev) => {
      const newMap = new Map(prev);
      const dayMeals = new Set(newMap.get(currentDayIndex) || []);

      if (isCurrentlyEaten) {
        dayMeals.delete(mealIndex);
      } else {
        dayMeals.add(mealIndex);
      }

      newMap.set(currentDayIndex, dayMeals);

      // Save to user-scoped storage
      if (userId) {
        const serialized: Record<string, number[]> = {};
        newMap.forEach((meals, dayIdx) => {
          serialized[dayIdx] = Array.from(meals);
        });
        storage.setJson(userId, "eatenMeals", serialized);
      }

      return newMap;
    });

    // Try to sync with database (only if user is authenticated)
    if (!user) return;

    try {
      if (isCurrentlyEaten) {
        // Delete from database
        const response = await fetch(`/api/meals/plan`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planMealId, date: dateString }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to delete plan meal:', errorData);
          // Don't show alert - state already updated
        }
      } else {
        // Insert into database
        const response = await fetch('/api/meals/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: dateString,
            name: meal.name,
            calories: meal.macros.calories,
            protein: meal.macros.protein_g,
            carbs: meal.macros.carbs_g,
            fat: meal.macros.fat_g,
            planMealId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to save plan meal:', errorData);
          // Don't show alert - state already updated
        }
      }
    } catch (error) {
      console.error('Error syncing meal to database:', error);
      // Don't show alert - the meal is still tracked in localStorage
      // and will work for the nutrition page
    }
  };

  // Load eaten meals from database and merge with localStorage
  useEffect(() => {
    const loadEatenMeals = async () => {
      if (!userId) return;

      // Step 1: Load from localStorage first (instant, works offline)
      const stored = storage.getJson<Record<string, number[]>>(userId, "eatenMeals");
      const localMap = new Map<number, Set<number>>();

      if (stored) {
        try {
          Object.entries(stored).forEach(([dayIdx, meals]) => {
            localMap.set(Number(dayIdx), new Set(meals));
          });
          // Set immediately for responsive UI
          setEatenMealsByDay(localMap);
        } catch (e) {
          console.error("[Nutrition] Failed to parse eaten meals from localStorage:", e);
        }
      }

      // Step 2: Load from database (authoritative, persists across sessions)
      // Only fetch if user is authenticated
      if (!user) {
        console.log("[Nutrition] Guest user - using localStorage only for eaten meals");
        return;
      }

      try {
        const response = await fetch("/api/meals/plan", {
          method: "GET",
          headers: { "Cache-Control": "no-store" },
          cache: "no-store",
        });

        if (!response.ok) {
          console.warn("[Nutrition] Failed to fetch plan meals from database:", response.status);
          return; // Keep using localStorage data
        }

        const data = await response.json();
        const dbMeals = data.meals || [];

        if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
          console.log("[Nutrition] Loaded plan meals from database:", {
            count: dbMeals.length,
            sample: dbMeals.slice(0, 3),
          });
        }

        // Step 3: Convert database records to Map format
        const dbMap = new Map<number, Set<number>>();
        const today = new Date();
        const todayDayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - todayDayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);

        dbMeals.forEach((meal: any) => {
          if (!meal.plan_meal_id || !meal.date) return;

          // Parse plan_meal_id (format: "dayIndex_mealIndex")
          const parts = meal.plan_meal_id.split("_");
          if (parts.length !== 2) return;

          const dayIndex = parseInt(parts[0], 10);
          const mealIndex = parseInt(parts[1], 10);

          if (isNaN(dayIndex) || isNaN(mealIndex)) return;

          // Verify this meal is from this week
          const mealDate = new Date(meal.date + "T00:00:00");
          const expectedDate = new Date(startOfWeek);
          expectedDate.setDate(startOfWeek.getDate() + dayIndex);
          expectedDate.setHours(0, 0, 0, 0);

          // Only include if date matches expected day
          if (mealDate.getTime() === expectedDate.getTime()) {
            if (!dbMap.has(dayIndex)) {
              dbMap.set(dayIndex, new Set());
            }
            dbMap.get(dayIndex)!.add(mealIndex);
          }
        });

        // Step 4: Use database data as source of truth (already filtered by current week)
        // Don't merge localStorage to avoid stale data from previous weeks
        // localStorage is only used as fallback for offline/guest users
        const mergedMap = new Map<number, Set<number>>();

        // Use database entries only (already filtered to current week in step 3)
        dbMap.forEach((meals, dayIdx) => {
          mergedMap.set(dayIdx, new Set(meals));
        });

        // Update state with database data only
        setEatenMealsByDay(mergedMap);

        // Save merged data back to localStorage for offline access
        const serialized: Record<string, number[]> = {};
        mergedMap.forEach((meals, dayIdx) => {
          serialized[dayIdx] = Array.from(meals);
        });
        storage.setJson(userId, "eatenMeals", serialized);

        if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
          console.log("[Nutrition] Merged eaten meals:", {
            fromDb: dbMap.size,
            fromLocal: localMap.size,
            merged: mergedMap.size,
          });
        }
      } catch (error) {
        console.error("[Nutrition] Error loading eaten meals from database:", error);
        // Keep using localStorage data on error
      }
    };

    loadEatenMeals();
  }, [userId, user]);

  // Load custom targets from localStorage on mount and when page becomes visible
  useEffect(() => {
    const loadCustomTargets = () => {
      if (userId) {
        const stored = storage.getJson<{
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
        }>(userId, "customNutritionTargets");
        if (stored) {
          setCustomTargets(stored);
        }
      }
    };

    loadCustomTargets();

    // Reload when page becomes visible (e.g., after navigating back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadCustomTargets();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId]);

  // Load user meals from Supabase for a specific date
  const loadUserMeals = async (dateString: string) => {
    try {
      const response = await fetch(`/api/meals?date=${dateString}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out plan meals - only show manually added meals (manual/ai_vision)
        const manualMeals = (data.meals || []).filter((meal: any) => meal.source !== 'plan');
        setUserMeals(manualMeals);
      }
    } catch (error) {
      console.error("Failed to load user meals:", error);
    }
  };

  // Calculate the date for the selected day (using local timezone)
  const getSelectedDate = (dayIndex: number): string => {
    const today = new Date();
    const todayDayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - todayDayOfWeek);

    const selectedDate = new Date(startOfWeek);
    selectedDate.setDate(startOfWeek.getDate() + dayIndex);

    // Format as YYYY-MM-DD using local timezone (not UTC)
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load user meals when day changes
  useEffect(() => {
    if (user) {
      const dateString = getSelectedDate(currentDayIndex);
      loadUserMeals(dateString);
    }
  }, [user, currentDayIndex]);

  // Load user meals on mount and when refresh is requested
  useEffect(() => {
    if (searchParams.get("refresh") === "1") {
      const dateString = getSelectedDate(currentDayIndex);
      loadUserMeals(dateString);
      // Remove the refresh param from URL
      window.history.replaceState({}, '', '/nutrition');
    }
  }, [searchParams]);

  // Handle photo scan for AI meal analysis
  const handleScanPhoto = async (file: File) => {
    console.log('[Nutrition] handleScanPhoto called with file:', file.name, file.size, file.type);

    try {
      // Convert file to data URL so we can pass it through page navigation
      const reader = new FileReader();
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Store pending scan data in sessionStorage
      sessionStorage.setItem('nutrition_pending_scan', JSON.stringify({
        imageDataUrl,
        fileName: file.name,
        fileSize: file.size,
      }));

      console.log('[Nutrition] Navigating to analyzing page...');
      // Navigate to analyzing page which will show the scanning animation
      router.push("/nutrition/scan/analyzing");
    } catch (error: any) {
      console.error("[Nutrition] Error preparing scan:", error);
      toast({
        title: "שגיאה",
        description: "שגיאה בעיבוד התמונה. נסה שוב.",
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  // Handle meal deletion
  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את הארוחה?")) {
      return;
    }

    try {
      const response = await fetch(`/api/meals?id=${mealId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete meal");
      }

      // Refresh user meals for selected day
      const dateString = getSelectedDate(currentDayIndex);
      await loadUserMeals(dateString);
    } catch (error: any) {
      console.error("Delete error:", error);
      alert(error.message || "שגיאה במחיקת הארוחה");
    }
  };

  // Handle meal editing
  const handleEditMeal = async (mealId: string, updates: any) => {
    try {
      const response = await fetch(`/api/meals?id=${mealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update meal");
      }

      // Refresh user meals for selected day
      const dateString = getSelectedDate(currentDayIndex);
      await loadUserMeals(dateString);
    } catch (error: any) {
      console.error("Edit error:", error);
      alert(error.message || "שגיאה בעדכון הארוחה");
    }
  };

  // Handle barcode scan
  const handleBarcodeDetected = async (barcode: string): Promise<LookupResult> => {
    console.log("[Nutrition] Barcode detected:", barcode);
    console.log("[Nutrition] lookupBarcode function available:", typeof lookupBarcode);

    if (!lookupBarcode) {
      console.error("[Nutrition] lookupBarcode is not available!");
      toast({
        title: "שגיאה",
        description: "פונקציית החיפוש לא זמינה",
        variant: "destructive",
      });
      return { ok: false, reason: 'unknown', message: 'Lookup function not available' };
    }

    // Don't close scanner immediately - wait for result
    // setShowBarcodeScanner(false); -- removed

    // Lookup product
    const result = await lookupBarcode(barcode);
    console.log("[Nutrition] Lookup result:", result);

    if (result.ok) {
      console.log("[Nutrition] Product found:", result.product);

      // Check if this is partial data
      if (result.product.isPartial) {
        toast({
          title: "מוצר נמצא",
          description: "נמצא מידע חלקי בלבד על המוצר. ייתכן שחלק מהערכים התזונתיים חסרים.",
          duration: 5000,
        });
      }

      // Success - close scanner sheet and open nutrition facts
      setShowBarcodeScanner(false);
      setScannedProduct(result.product);
      setShowNutritionFacts(true);
      return result; // Return success to allow sheet to close
    } else {
      // Error - return the error to keep sheet open
      console.log("[Nutrition] Lookup failed:", result.reason);

      // Don't show toasts here - let the sheet handle them
      // The sheet will show appropriate toast based on error type

      return result; // Return error to prevent sheet from closing
    }
  };

  // Handle successful nutrition log from barcode
  const handleNutritionLogSuccess = () => {
    // Close nutrition facts sheet
    setShowNutritionFacts(false);
    setScannedProduct(null);

    // Refresh user meals for selected day
    const dateString = getSelectedDate(currentDayIndex);
    loadUserMeals(dateString);
  };

  // Calculate consumed macros based on eaten meals (from plan) + user added meals
  let consumedCalories = 0;
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;

  // Add macros from plan meals
  if (currentDay && currentDayEatenMeals.size > 0) {
    currentDay.meals.forEach((meal, idx) => {
      if (currentDayEatenMeals.has(idx)) {
        consumedCalories += meal.macros.calories;
        consumedProtein += meal.macros.protein_g;
        consumedCarbs += meal.macros.carbs_g;
        consumedFat += meal.macros.fat_g;
      }
    });
  }

  // Add macros from user-added meals
  userMeals.forEach((meal) => {
    consumedCalories += meal.calories || 0;
    consumedProtein += meal.protein || 0;
    consumedCarbs += meal.carbs || 0;
    consumedFat += meal.fat || 0;
  });

  // Use custom targets if set, otherwise use plan targets
  const targetCalories = customTargets.calories ?? plan?.dailyTargets?.calories ?? 0;
  const targetProtein = customTargets.protein ?? plan?.dailyTargets?.protein_g ?? 0;
  const targetCarbs = customTargets.carbs ?? plan?.dailyTargets?.carbs_g ?? 0;
  const targetFat = customTargets.fat ?? plan?.dailyTargets?.fat_g ?? 0;

  // Handler to navigate to edit targets page
  const handleNavigateToEditTargets = () => {
    router.push('/nutrition/edit-targets');
  };

  return (
    <div className="min-h-[100dvh] overflow-y-auto overscroll-contain bg-[#0D0E0F]" dir="rtl">
      <StickyHeader
        title="תזונה"
      />
      <main className="main-offset text-white pb-28">
        {/* Week Day Selector - Scrolls with content */}
        <div className="px-4 py-3">
          <WeekDaySelector
            currentDayIndex={currentDayIndex}
            onDayChange={(index) => setCurrentDayIndex(index)}
          />
        </div>

        <div className="px-4 pt-2 pb-4 space-y-4">
        {/* Loading state */}
        {loading && (
          <>
            {/* Skeleton for CaloriesWidget */}
            <div className="w-full h-40 bg-neutral-900/80 border border-neutral-800 rounded-2xl animate-pulse" />

            {/* Skeleton for MacroCards */}
            <div className="flex gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-1 h-44 bg-neutral-900/80 border border-neutral-800 rounded-2xl animate-pulse" />
              ))}
            </div>

            {/* Skeleton for meals */}
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-full h-20 bg-neutral-900/80 border border-neutral-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          </>
        )}

        {/* Error state */}
        {error && (
          <div className="w-full bg-red-900/20 border border-red-800 rounded-2xl p-6">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-red-400 mx-auto mb-3">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div className="text-red-400 mb-4 whitespace-pre-wrap text-sm leading-relaxed">{error}</div>
              <button
                onClick={() => loadNutritionData(true)}
                className="px-6 py-2 bg-red-800 text-white rounded-lg active:opacity-90"
              >
                נסה שוב
              </button>
            </div>
          </div>
        )}

        {/* Main nutrition UI - always show unless loading or error */}
        {!loading && !error && (
          <>
            {/* Calories widget */}
            <CaloriesWidget
              target={targetCalories}
              consumed={consumedCalories}
              onClick={handleNavigateToEditTargets}
            />

            {/* Macro cards */}
            <div className="flex gap-3">
              <MacroCard
                label="חלבון"
                consumed={consumedProtein}
                target={targetProtein}
                icon={
                  <div className="flex items-center justify-center no-emoji">
                    <NutrientIcon kind="protein" className="w-7 h-7 text-[#C9456C]" title="Protein" />
                  </div>
                }
                tintClass="text-[#C9456C]"
                onClick={handleNavigateToEditTargets}
              />
              <MacroCard
                label="פחמימות"
                consumed={consumedCarbs}
                target={targetCarbs}
                icon={
                  <div className="flex items-center justify-center no-emoji">
                    <NutrientIcon kind="carbs" className="w-7 h-7 text-[#FFA856]" title="Carbs" />
                  </div>
                }
                tintClass="text-[#FFA856]"
                onClick={handleNavigateToEditTargets}
              />
              <MacroCard
                label="שומנים"
                consumed={consumedFat}
                target={targetFat}
                icon={
                  <div className="flex items-center justify-center no-emoji">
                    <NutrientIcon kind="fat" className="w-7 h-7 text-[#5B9BFF]" title="Fat" />
                  </div>
                }
                tintClass="text-[#5B9BFF]"
                onClick={handleNavigateToEditTargets}
              />
            </div>

            {/* Meals list */}
            <MealsList
              day={currentDay}
              eatenMeals={currentDayEatenMeals}
              onToggleMeal={handleToggleMeal}
            />

            {/* User added meals */}
            <UserMealsList
              meals={userMeals}
              onDelete={handleDeleteMeal}
              onEdit={handleEditMeal}
            />

            {/* Tips section */}
            {plan?.tips && plan.tips.length > 0 && (
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-white mb-2">טיפים</h3>
                <ul className="space-y-1 text-xs text-neutral-400">
                  {plan.tips.map((tip: string, idx: number) => (
                    <li key={idx}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary button */}
            <button
              onClick={() => setShowSummary(true)}
              className="w-full py-4 bg-neutral-900/80 border border-neutral-800 text-white font-semibold rounded-2xl active:opacity-90 transition-opacity hover:bg-neutral-900"
            >
              צפה בסיכום מלא
            </button>
          </>
        )}
        </div>
      </main>

      {/* Summary modal */}
      {showSummary && plan && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80"
            style={{ zIndex: 9998 }}
            onClick={() => setShowSummary(false)}
          />

          {/* Sheet */}
          <div
            className="fixed inset-x-0 bottom-0 w-full bg-neutral-900 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
            style={{ zIndex: 9999 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag bar */}
            <div className="w-12 h-1 bg-neutral-700 rounded-full mx-auto mb-4" />

            <h2 className="text-xl font-bold text-white mb-4 text-right">סיכום תזונה</h2>

            <div className="prose prose-invert prose-sm max-w-none text-right" dir="rtl">
              <p className="text-neutral-300 whitespace-pre-wrap">{plan.summary}</p>
            </div>

            {/* Shopping list if available */}
            {plan.shoppingList && plan.shoppingList.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-3">רשימת קניות</h3>
                <ul className="space-y-2">
                  {plan.shoppingList.map((item, idx: number) => (
                    <li key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-neutral-300">{item.item}</span>
                      <span className="text-neutral-500">
                        {item.quantity} {item.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => setShowSummary(false)}
              className="w-full mt-6 py-3 px-6 bg-[#E2F163] text-black font-semibold rounded-xl hover:bg-[#d4e350] active:translate-y-1 active:brightness-90 transition-all"
            >
              סגור
            </button>
          </div>
        </>
      )}

      {/* Floating Add Meal Button */}
      <FloatingAddMealButton
        onScanPhoto={handleScanPhoto}
        onScanBarcode={() => setShowBarcodeScanner(true)}
      />

      {/* Image scanning overlay with preview */}
      {(() => {
        console.log('[Nutrition] 🎨 Render check:', { uploadingPhoto, scanningImageUrl, shouldShow: uploadingPhoto && scanningImageUrl });
        return uploadingPhoto && scanningImageUrl;
      })() && (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[10000] p-4">
          {/* Image Preview with Scanning Animation */}
          <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden mb-6">
            <img
              src={scanningImageUrl || ''}
              alt="סורק תמונה"
              className="w-full h-full object-cover"
            />

            {/* Scanning line animation */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-lime-400 to-transparent animate-scan-line shadow-[0_0_20px_rgba(190,242,100,0.5)]"></div>
            </div>

            {/* Scanning grid overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-lime-400/10 via-transparent to-lime-400/10 animate-pulse"></div>

            {/* Corner brackets */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-lime-400"></div>
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-lime-400"></div>
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-lime-400"></div>
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-lime-400"></div>
          </div>

          {/* Status Text */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-lime-400"></div>
              <p className="text-white font-medium text-lg">מנתח את התמונה...</p>
            </div>
            <p className="text-neutral-400 text-sm">זה עשוי לקחת כמה שניות</p>
          </div>
        </div>
      )}

      {/* Barcode Scanner */}
      <BarcodeScannerSheet
        open={showBarcodeScanner}
        onOpenChange={setShowBarcodeScanner}
        onDetected={handleBarcodeDetected}
        onManualProductSuccess={(product) => {
          console.log('[Nutrition] Manual product created, opening facts sheet:', product);
          setScannedProduct(product);
          setShowNutritionFacts(true);
        }}
      />

      {/* Nutrition Facts Sheet */}
      {scannedProduct && (
        <NutritionFactsSheet
          open={showNutritionFacts}
          onOpenChange={setShowNutritionFacts}
          product={scannedProduct}
          onSuccess={handleNutritionLogSuccess}
        />
      )}

      {/* Loading overlay for barcode lookup */}
      {lookingUpBarcode && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[150]">
          <div className="bg-neutral-900 rounded-2xl p-6 space-y-4 max-w-sm mx-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400"></div>
            </div>
            <p className="text-white text-center">מחפש מוצר...</p>
            <p className="text-neutral-400 text-sm text-center">מחפש במאגר המוצרים</p>
          </div>
        </div>
      )}
    </div>
  );
}
