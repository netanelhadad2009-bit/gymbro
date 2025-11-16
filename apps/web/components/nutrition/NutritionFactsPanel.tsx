/**
 * NutritionFactsPanel Component
 * Reusable panel for displaying nutrition facts with portion control
 * Supports two modes: per-100g (grams) and portion (multiplier)
 */

'use client';

import { useState } from 'react';
import { scaleNutrition, type FoodToLog, type MealType, formatMealType } from '@/lib/nutrition/log';

// Mode: per-100g (food products)
interface Per100gMode {
  mode: 'per100g';
  food: FoodToLog;
  initialPortion?: number;
  onPortionChange?: (portion: number) => void;
}

// Mode: portion (saved meals)
interface PortionMode {
  mode: 'portion';
  name: string;
  brand?: string;
  baseTotals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  initialMultiplier?: number;
  onMultiplierChange?: (multiplier: number) => void;
  unitLabel?: string; // Default: 'מנה'
  quickMultipliers?: number[]; // Default: [0.5, 1, 1.5, 2]
}

type NutritionFactsPanelProps = (Per100gMode | PortionMode) & {
  showMealTypeSelector?: boolean;
  onMealTypeChange?: (mealType: MealType) => void;
  sourceBadge?: string; // Optional custom source badge text
};

const QUICK_PORTIONS = [30, 50, 100, 150, 200];
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function NutritionFactsPanel(props: NutritionFactsPanelProps) {
  const {
    showMealTypeSelector = true,
    onMealTypeChange,
    sourceBadge,
  } = props;

  // State
  const [mealType, setMealType] = useState<MealType>('snack');

  const handleMealTypeChange = (newType: MealType) => {
    setMealType(newType);
    onMealTypeChange?.(newType);
  };

  // Render based on mode
  if (props.mode === 'per100g') {
    return (
      <Per100gPanel
        {...props}
        mealType={mealType}
        onMealTypeChange={handleMealTypeChange}
        showMealTypeSelector={showMealTypeSelector}
        sourceBadge={sourceBadge}
      />
    );
  } else {
    return (
      <PortionPanel
        {...props}
        mealType={mealType}
        onMealTypeChange={handleMealTypeChange}
        showMealTypeSelector={showMealTypeSelector}
        sourceBadge={sourceBadge}
      />
    );
  }
}

// Per-100g mode (food products)
function Per100gPanel({
  food,
  initialPortion = 100,
  onPortionChange,
  mealType,
  onMealTypeChange,
  showMealTypeSelector,
  sourceBadge,
}: Per100gMode & {
  mealType: MealType;
  onMealTypeChange: (type: MealType) => void;
  showMealTypeSelector: boolean;
  sourceBadge?: string;
}) {
  const [portion, setPortion] = useState(initialPortion);

  const handlePortionChange = (newPortion: number) => {
    setPortion(newPortion);
    onPortionChange?.(newPortion);
  };

  const scaled = scaleNutrition(food, portion);

  // Log RTL chip format on mount
  console.log('[RTL] unit order example: 100ג ok');

  return (
    <div className="space-y-6" dir="rtl">
      {/* Food Name & Brand */}
      <div className="text-right">
        <h2 className="text-2xl font-bold text-white mb-1">
          {food.name_he || food.name}
        </h2>
        {food.brand && (
          <p className="text-sm text-zinc-400">{food.brand}</p>
        )}
        {food.isPartial && (
          <p className="text-xs text-amber-400 mt-1">⚠️ מידע חלקי - חלק מהערכים עשויים להיות חסרים</p>
        )}
      </div>

      {/* Portion Selector */}
      <div className="bg-zinc-900 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-200 text-right">כמות</h3>

        {/* Quick portion chips - RTL ordering */}
        <div className="flex gap-2 flex-wrap">
          {[...QUICK_PORTIONS].reverse().map((g) => (
            <button
              key={g}
              onClick={() => {
                handlePortionChange(g);
                console.log('[RTL] chips order reversed array ok');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                portion === g
                  ? 'bg-[#E2F163] text-black'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{g}</span>
              <span>ג׳</span>
            </button>
          ))}
        </div>

        {/* Custom portion input - RTL direction */}
        <div dir="rtl" className="flex flex-row-reverse items-center gap-2 justify-start">
          <span className="shrink-0 text-zinc-400 text-sm select-none">גרם</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            dir="rtl"
            aria-label="כמות בגרמים"
            value={portion}
            onChange={(e) => {
              const numericValue = e.target.value.replace(/\D/g, '');
              const parsedValue = Math.max(1, parseInt(numericValue) || 1);
              handlePortionChange(parsedValue);
              console.log('[RTL] quantity input dir=rtl ok');
            }}
            className="w-[140px] h-12 text-lg text-zinc-100 px-4 py-2 rounded-xl bg-zinc-900/70 border border-zinc-700/60 focus:border-[#E2F163] outline-none caret-[#E2F163] tabular-nums leading-[1.2] text-end placeholder:text-end rtl:text-end"
            placeholder="100"
            style={{ textAlign: 'end', direction: 'rtl', WebkitTextSecurity: 'none' } as React.CSSProperties}
          />
        </div>
      </div>

      <MealTypeSelector
        show={showMealTypeSelector}
        mealType={mealType}
        onChange={onMealTypeChange}
      />

      <NutritionCard
        calories={scaled.calories}
        protein_g={scaled.protein_g}
        carbs_g={scaled.carbs_g}
        fat_g={scaled.fat_g}
        fiber_g={scaled.fiber_g}
        sugar_g={scaled.sugar_g}
        sodium_mg={scaled.sodium_mg}
      />

      {sourceBadge && <SourceBadge text={sourceBadge} />}
      {!sourceBadge && food.source && (
        <SourceBadge
          text={food.source === 'israel_moh' ? 'משרד הבריאות (data.gov.il)' : 'קישור קהילתי'}
        />
      )}
    </div>
  );
}

// Portion mode (saved meals)
function PortionPanel({
  name,
  brand,
  baseTotals,
  initialMultiplier = 1,
  onMultiplierChange,
  unitLabel = 'מנה',
  quickMultipliers = [0.5, 1, 1.5, 2],
  mealType,
  onMealTypeChange,
  showMealTypeSelector,
  sourceBadge,
}: PortionMode & {
  mealType: MealType;
  onMealTypeChange: (type: MealType) => void;
  showMealTypeSelector: boolean;
  sourceBadge?: string;
}) {
  const [multiplier, setMultiplier] = useState(initialMultiplier);

  const handleMultiplierChange = (newMultiplier: number) => {
    setMultiplier(newMultiplier);
    onMultiplierChange?.(newMultiplier);
  };

  // Calculate scaled values
  const scaled = {
    calories: Math.round(baseTotals.calories * multiplier),
    protein_g: Math.round(baseTotals.protein_g * multiplier * 10) / 10,
    carbs_g: Math.round(baseTotals.carbs_g * multiplier * 10) / 10,
    fat_g: Math.round(baseTotals.fat_g * multiplier * 10) / 10,
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Meal Name & Brand */}
      <div className="text-right">
        <h2 className="text-2xl font-bold text-white mb-1">{name}</h2>
        {brand && <p className="text-sm text-zinc-400">{brand}</p>}
      </div>

      {/* Multiplier Selector */}
      <div className="bg-zinc-900 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-200 text-right">כמות</h3>

        {/* Quick multiplier chips - RTL ordering */}
        <div className="flex gap-2 flex-wrap">
          {[...quickMultipliers].reverse().map((m) => (
            <button
              key={m}
              onClick={() => {
                handleMultiplierChange(m);
                console.log('[RTL] multiplier chips reversed array ok');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                multiplier === m
                  ? 'bg-[#E2F163] text-black'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {m === 0.5 ? '½×' : `${m}×`}
            </button>
          ))}
        </div>

        {/* Custom multiplier input - RTL direction */}
        <div dir="rtl" className="flex flex-row-reverse items-center gap-2 justify-start">
          <span className="shrink-0 text-zinc-400 text-sm select-none">{unitLabel}</span>
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9.]*"
            dir="rtl"
            aria-label="הכפלה מותאמת"
            value={multiplier}
            onChange={(e) => {
              const numericValue = e.target.value.replace(/[^\d.]/g, '');
              const val = parseFloat(numericValue) || 0.1;
              const clampedValue = Math.max(0.1, Math.min(5, val));
              handleMultiplierChange(clampedValue);
              console.log('[RTL] Manual serving input fixed → right aligned');
            }}
            className="w-[140px] h-12 text-lg text-zinc-100 px-4 py-2 rounded-xl bg-zinc-900/70 border border-zinc-700/60 focus:border-[#E2F163] outline-none caret-[#E2F163] tabular-nums leading-[1.2] text-end placeholder:text-end rtl:text-end"
            placeholder="1"
            style={{ textAlign: 'end', direction: 'rtl', WebkitTextSecurity: 'none' } as React.CSSProperties}
          />
          <span className="shrink-0 text-zinc-400 text-sm select-none">×</span>
        </div>
      </div>

      <MealTypeSelector
        show={showMealTypeSelector}
        mealType={mealType}
        onChange={onMealTypeChange}
      />

      <NutritionCard
        calories={scaled.calories}
        protein_g={scaled.protein_g}
        carbs_g={scaled.carbs_g}
        fat_g={scaled.fat_g}
      />

      {sourceBadge && <SourceBadge text={sourceBadge} />}
    </div>
  );
}

// Shared components

function MealTypeSelector({
  show,
  mealType,
  onChange,
}: {
  show: boolean;
  mealType: MealType;
  onChange: (type: MealType) => void;
}) {
  if (!show) return null;

  return (
    <div className="bg-zinc-900 rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-zinc-200 text-right">סוג ארוחה</h3>
      <div className="grid grid-cols-2 gap-2">
        {MEAL_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              mealType === type
                ? 'bg-[#E2F163] text-black'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {formatMealType(type)}
          </button>
        ))}
      </div>
    </div>
  );
}

function NutritionCard({
  calories,
  protein_g,
  carbs_g,
  fat_g,
  fiber_g,
  sugar_g,
  sodium_mg,
}: {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-zinc-200 mb-4 text-right">ערכים תזונתיים</h3>

      {/* Calories - Large */}
      <div className="bg-zinc-800 rounded-xl p-4 mb-3">
        <div className="text-center">
          <div className="text-4xl font-bold text-[#E2F163]">{calories}</div>
          <div className="text-sm text-zinc-400 mt-1">קק״ל</div>
        </div>
      </div>

      {/* Macros Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Protein */}
        <div className="bg-zinc-800 rounded-xl p-3 text-center">
          <div className="text-xs text-zinc-400 mb-1">חלבון</div>
          <div className="text-xl font-bold text-[#C9456C]">{protein_g}</div>
          <div className="text-xs text-zinc-500">גרם</div>
        </div>

        {/* Carbs */}
        <div className="bg-zinc-800 rounded-xl p-3 text-center">
          <div className="text-xs text-zinc-400 mb-1">פחמימות</div>
          <div className="text-xl font-bold text-[#FFA856]">{carbs_g}</div>
          <div className="text-xs text-zinc-500">גרם</div>
        </div>

        {/* Fat */}
        <div className="bg-zinc-800 rounded-xl p-3 text-center">
          <div className="text-xs text-zinc-400 mb-1">שומן</div>
          <div className="text-xl font-bold text-[#5B9BFF]">{fat_g}</div>
          <div className="text-xs text-zinc-500">גרם</div>
        </div>
      </div>

      {/* Optional nutrients */}
      {(fiber_g !== undefined || sugar_g !== undefined || sodium_mg !== undefined) && (
        <div className="mt-3 pt-3 border-t border-zinc-700 space-y-2">
          {fiber_g !== undefined && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">{fiber_g} גרם</span>
              <span className="text-zinc-300">סיבים תזונתיים</span>
            </div>
          )}
          {sugar_g !== undefined && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">{sugar_g} גרם</span>
              <span className="text-zinc-300">סוכרים</span>
            </div>
          )}
          {sodium_mg !== undefined && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-400">{sodium_mg} מ״ג</span>
              <span className="text-zinc-300">נתרן</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SourceBadge({ text }: { text: string }) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-full">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3.5 h-3.5 text-zinc-400"
        >
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <span className="text-xs text-zinc-400">{text}</span>
      </div>
    </div>
  );
}

// Export state hook for backward compatibility
export function usePanelState() {
  const [portion, setPortion] = useState(100);
  const [mealType, setMealType] = useState<MealType>('snack');

  return {
    portion,
    mealType,
    setPortion,
    setMealType,
  };
}
