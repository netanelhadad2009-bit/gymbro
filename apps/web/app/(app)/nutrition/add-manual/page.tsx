"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { todayISO } from "@/lib/date";
import { createBrowserClient } from "@supabase/ssr";
import MacroInput from "@/components/inputs/MacroInput";
import type { MealType } from "@/lib/nutrition/log";
import { useSheet } from "@/contexts/SheetContext";
import { Keyboard } from "@capacitor/keyboard";

const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
  { value: 'breakfast', label: 'ארוחת בוקר', emoji: '🌅' },
  { value: 'lunch', label: 'צהריים', emoji: '☀️' },
  { value: 'dinner', label: 'ערב', emoji: '🌙' },
  { value: 'snack', label: 'חטיף', emoji: '🍎' },
];

export default function AddManualMealPage() {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [mealType, setMealType] = useState<MealType>('snack');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { setIsKeyboardVisible } = useSheet();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Listen for keyboard show/hide to hide bottom nav
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyboardShow = () => {
      console.log('[AddManualMeal] Keyboard shown - hiding bottom nav');
      setIsKeyboardVisible(true);
    };

    const handleKeyboardHide = () => {
      console.log('[AddManualMeal] Keyboard hidden - showing bottom nav');
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

  const onSave = async () => {
    if (!name || calories === "") return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      router.push("/signup");
      return;
    }

    const { error } = await supabase.from("meals").insert({
      user_id: user.id,
      date: todayISO(),
      source: "manual",
      name,
      calories: calories === "" ? 0 : Number(calories),
      protein: protein === "" ? 0 : Number(protein),
      carbs: carbs === "" ? 0 : Number(carbs),
      fat: fat === "" ? 0 : Number(fat),
      meal_type: mealType,
    });

    setSaving(false);
    if (!error) {
      router.push("/nutrition?refresh=1");
    } else {
      alert("Failed to save meal");
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E0F] text-white">
      <div className="sticky top-0 z-30 bg-[#0D0E0F] border-b border-neutral-800 pt-[calc(env(safe-area-inset-top)+12px)] pb-2">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg text-white active:opacity-70"
            aria-label="חזרה"
          >
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
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold">הוספת ארוחה ידנית</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="p-4 pb-[calc(96px+env(safe-area-inset-bottom))] space-y-4">
        <div>
          <label className="text-sm text-neutral-400 mb-2 block">שם הארוחה *</label>
          <input
            placeholder="לדוגמה: סלט עוף"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400 transition-colors"
          />
        </div>

        <MacroInput
          label="קלוריות *"
          placeholder="0"
          value={calories}
          onChange={setCalories}
          labelClassName="text-sm text-neutral-400 mb-2 block"
          inputClassName="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-lime-400 active:translate-y-0.5 transition-transform duration-75"
        />

        <div className="grid grid-cols-3 gap-3">
          <MacroInput
            label="חלבון (גרם)"
            placeholder="0"
            value={protein}
            onChange={setProtein}
            labelClassName="text-xs text-neutral-500 mb-1 block"
            inputClassName="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#C9456C] active:translate-y-0.5 transition-transform duration-75 text-sm"
          />

          <MacroInput
            label="פחמימות (גרם)"
            placeholder="0"
            value={carbs}
            onChange={setCarbs}
            labelClassName="text-xs text-neutral-500 mb-1 block"
            inputClassName="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-orange-400 active:translate-y-0.5 transition-transform duration-75 text-sm"
          />

          <MacroInput
            label="שומן (גרם)"
            placeholder="0"
            value={fat}
            onChange={setFat}
            labelClassName="text-xs text-neutral-500 mb-1 block"
            inputClassName="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-400 active:translate-y-0.5 transition-transform duration-75 text-sm"
          />
        </div>

        {/* Meal Type Selection */}
        <div>
          <label className="text-sm text-neutral-400 mb-3 block">סוג ארוחה</label>
          <div className="grid grid-cols-2 gap-3">
            {MEAL_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setMealType(type.value)}
                className={`
                  rounded-2xl px-4 py-3 flex flex-col items-center justify-center gap-1 transition-all
                  ${
                    mealType === type.value
                      ? 'bg-neutral-900 border-2 border-[#E2F163] shadow-[0_0_0_1px_rgba(226,241,99,0.4)]'
                      : 'bg-neutral-900/50 border border-neutral-800 hover:bg-neutral-800/80'
                  }
                `}
              >
                <span className="text-2xl">{type.emoji}</span>
                <span className="text-sm font-semibold text-white">{type.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-[calc(112px+env(safe-area-inset-bottom))] left-4 right-4 z-40">
        <button
          className="w-full h-12 bg-[#E2F163] text-black font-medium rounded-xl hover:bg-[#d4e350] active:translate-y-1 active:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={saving || !name || calories === ""}
          onClick={onSave}
        >
          {saving ? "שומר..." : "שמור ארוחה"}
        </button>
      </div>
    </div>
  );
}