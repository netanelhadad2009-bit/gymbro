"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StickyHeader from "@/components/ui/StickyHeader";
import * as storage from "@/lib/storage";
import { NutrientIcon } from "@/components/icons/NutrientIcon";
import { getMergedProfileSync } from "@/lib/profile/merge";
import { buildNutritionPayload } from "@/lib/nutrition/buildPayload";
import MacroInput from "@/components/inputs/MacroInput";
import { useSheet } from "@/contexts/SheetContext";
import { Keyboard } from "@capacitor/keyboard";

export default function EditTargetsPage() {
  const router = useRouter();
  const { setIsKeyboardVisible } = useSheet();
  const [userId, setUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [targets, setTargets] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  // Load user ID and targets
  useEffect(() => {
    storage.getCurrentUserId().then(id => {
      setUserId(id);

      // Load custom targets first
      const customTargets = storage.getJson<{
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
      }>(id, "customNutritionTargets");

      // Load nutrition plan the SAME way the nutrition page does
      const profile = getMergedProfileSync();
      const { payload } = buildNutritionPayload(profile, { days: 1 });
      const cached = storage.getNutritionPlan(id, payload, 7);

      // Normalize plan structure (same as nutrition page)
      const data = cached?.plan;
      const plan = ((data as any)?.plan ?? data);
      const planTargets = plan?.dailyTargets;

      console.log('[EditTargets] Loaded data:', {
        customTargets,
        plan,
        planTargets,
        rawData: data
      });

      const loadedTargets = {
        calories: String(customTargets?.calories ?? planTargets?.calories ?? 2000),
        protein: String(customTargets?.protein ?? planTargets?.protein_g ?? 150),
        carbs: String(customTargets?.carbs ?? planTargets?.carbs_g ?? 200),
        fat: String(customTargets?.fat ?? planTargets?.fat_g ?? 60),
      };

      console.log('[EditTargets] Setting targets to:', loadedTargets);
      setTargets(loadedTargets);

      setIsLoading(false);
    });
  }, []);

  // Listen for keyboard show/hide to hide bottom nav
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyboardShow = () => {
      console.log('[EditTargets] Keyboard shown - hiding bottom nav');
      setIsKeyboardVisible(true);
    };

    const handleKeyboardHide = () => {
      console.log('[EditTargets] Keyboard hidden - showing bottom nav');
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

  const handleSave = async () => {
    if (!userId || isSaving) return;

    setIsSaving(true);

    try {
      // Convert strings to numbers
      const numericTargets = {
        calories: Number(targets.calories) || 0,
        protein: Number(targets.protein) || 0,
        carbs: Number(targets.carbs) || 0,
        fat: Number(targets.fat) || 0,
      };

      console.log('[EditTargets] Saving targets to API:', numericTargets);

      // Save to database via API (primary source of truth for backend)
      const response = await fetch('/api/nutrition/plan', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(numericTargets),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save targets');
      }

      console.log('[EditTargets] API save successful');

      // Also save to localStorage (for frontend immediate updates)
      storage.setJson(userId, "customNutritionTargets", numericTargets);

      console.log('[EditTargets] localStorage save successful');

      router.back();
    } catch (error) {
      console.error('[EditTargets] Failed to save targets:', error);
      alert('שגיאה בשמירת היעדים. נסה שוב.');
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain bg-[#0D0E0F]" dir="rtl">
      <StickyHeader title="ערוך יעדים יומיים" />

      <main className="main-offset text-white p-4 pb-32 space-y-6">
        <p className="text-neutral-400 text-center mb-6">
          התאם את היעדים התזונתיים היומיים שלך
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-lime-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>

        {/* Calories */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-lime-400/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="#e2f163"
                className="w-6 h-6"
              >
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-lime-400">קלוריות</h3>
              <p className="text-sm text-neutral-400">יעד יומי</p>
            </div>
          </div>
          <MacroInput
            value={targets.calories}
            onChange={(val) => setTargets({ ...targets, calories: val })}
            placeholder="2000"
            inputClassName="w-full bg-neutral-800 text-white text-2xl font-bold text-center px-4 py-3 rounded-lg border-2 border-lime-400 focus:outline-none active:translate-y-0.5 transition-transform duration-75"
          />
        </div>

        {/* Protein */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 69, 108, 0.1)' }}>
              <NutrientIcon kind="protein" className="w-6 h-6 text-[#C9456C]" title="Protein" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold" style={{ color: '#C9456C' }}>חלבון</h3>
              <p className="text-sm text-neutral-400">גרם ליום</p>
            </div>
          </div>
          <MacroInput
            value={targets.protein}
            onChange={(val) => setTargets({ ...targets, protein: val })}
            placeholder="150"
            inputClassName="w-full bg-neutral-800 text-white text-2xl font-bold text-center px-4 py-3 rounded-lg border-2 focus:outline-none active:translate-y-0.5 transition-transform duration-75"
          />
        </div>

        {/* Carbs */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255, 168, 86, 0.1)' }}>
              <NutrientIcon kind="carbs" className="w-6 h-6 text-[#FFA856]" title="Carbs" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold" style={{ color: '#FFA856' }}>פחמימות</h3>
              <p className="text-sm text-neutral-400">גרם ליום</p>
            </div>
          </div>
          <MacroInput
            value={targets.carbs}
            onChange={(val) => setTargets({ ...targets, carbs: val })}
            placeholder="200"
            inputClassName="w-full bg-neutral-800 text-white text-2xl font-bold text-center px-4 py-3 rounded-lg border-2 focus:outline-none active:translate-y-0.5 transition-transform duration-75"
          />
        </div>

        {/* Fat */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(91, 155, 255, 0.1)' }}>
              <NutrientIcon kind="fat" className="w-6 h-6 text-[#5B9BFF]" title="Fat" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold" style={{ color: '#5B9BFF' }}>שומנים</h3>
              <p className="text-sm text-neutral-400">גרם ליום</p>
            </div>
          </div>
          <MacroInput
            value={targets.fat}
            onChange={(val) => setTargets({ ...targets, fat: val })}
            placeholder="60"
            inputClassName="w-full bg-neutral-800 text-white text-2xl font-bold text-center px-4 py-3 rounded-lg border-2 focus:outline-none active:translate-y-0.5 transition-transform duration-75"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleCancel}
            className="flex-1 bg-neutral-800 text-neutral-300 font-semibold py-4 rounded-xl hover:bg-neutral-700 transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-[#E2F163] text-black font-semibold py-4 rounded-xl hover:bg-[#d4e350] active:translate-y-1 active:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'שומר...' : 'שמור'}
          </button>
        </div>
        </>
        )}
      </main>
    </div>
  );
}
