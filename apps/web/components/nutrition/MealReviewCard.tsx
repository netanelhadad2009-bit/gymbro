"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { VisionMealResult } from "@/lib/nutrition/types";
import { NutrientIcon } from "@/components/icons/NutrientIcon";
import { sanitizeNumeric4 } from "@/lib/forms/numeric4";

type Props = {
  result: VisionMealResult;
  imageUrl: string;
  servings: number;
  onServingsChange: (servings: number) => void;
  onNameChange: (name: string) => void;
  onMacrosChange?: (macros: { calories: number; protein: number; carbs: number; fat: number }) => void;
  onAddMeal: () => void;
  onScanAgain: () => void;
  onBack: () => void;
  isLoading?: boolean;
};

export function MealReviewCard({
  result,
  imageUrl,
  servings,
  onServingsChange,
  onNameChange,
  onMacrosChange,
  onAddMeal,
  onScanAgain,
  onBack,
  isLoading = false,
}: Props) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [tempName, setTempName] = useState(result.meal_name);

  // Editable macro values (base values, not scaled) - stored as strings
  const [baseCalories, setBaseCalories] = useState(String(result.calories));
  const [baseProtein, setBaseProtein] = useState(String(result.protein || 0));
  const [baseCarbs, setBaseCarbs] = useState(String(result.carbs || 0));
  const [baseFat, setBaseFat] = useState(String(result.fat || 0));

  // Editing states for each macro
  const [isEditingCalories, setIsEditingCalories] = useState(false);
  const [isEditingProtein, setIsEditingProtein] = useState(false);
  const [isEditingCarbs, setIsEditingCarbs] = useState(false);
  const [isEditingFat, setIsEditingFat] = useState(false);

  // Calculate scaled macros from base values (parse strings to numbers)
  const baseCaloriesNum = Number(baseCalories) || 0;
  const baseProteinNum = Number(baseProtein) || 0;
  const baseCarbsNum = Number(baseCarbs) || 0;
  const baseFatNum = Number(baseFat) || 0;

  const scaledCalories = Math.round(baseCaloriesNum * servings);
  const scaledProtein = Math.round(baseProteinNum * servings);
  const scaledCarbs = Math.round(baseCarbsNum * servings);
  const scaledFat = Math.round(baseFatNum * servings);

  // Notify parent of macro changes
  useEffect(() => {
    if (onMacrosChange) {
      onMacrosChange({
        calories: baseCaloriesNum,
        protein: baseProteinNum,
        carbs: baseCarbsNum,
        fat: baseFatNum,
      });
    }
  }, [baseCaloriesNum, baseProteinNum, baseCarbsNum, baseFatNum, onMacrosChange]);

  const handleNameBlur = () => {
    setIsEditingName(false);
    if (tempName.trim()) {
      onNameChange(tempName.trim());
    } else {
      setTempName(result.meal_name);
    }
  };

  const handleDecrement = () => {
    if (servings > 0.5) {
      onServingsChange(Math.round((servings - 0.5) * 2) / 2);
    }
  };

  const handleIncrement = () => {
    if (servings < 10) {
      onServingsChange(Math.round((servings + 0.5) * 2) / 2);
    }
  };

  // Get current time
  const currentTime = new Date().toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 bg-black" dir="rtl">
      {/* Full-screen background image */}
      <div
        className="absolute inset-0 bg-cover bg-top"
        style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: '100% auto' }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Header with back button */}
      <div className="absolute top-0 left-0 right-0 z-10 pt-safe">
        <div className="flex items-center justify-start px-4 py-4" dir="ltr">
          <button
            onClick={onBack}
            disabled={isLoading}
            className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-transform disabled:opacity-50"
            aria-label="חזור"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom sheet with meal details - DARK THEME */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 bg-[#1A1B1C] rounded-t-[32px] pb-safe"
      >
        {/* Drag indicator */}
        <div className="w-10 h-1 bg-neutral-700 rounded-full mx-auto mt-3 mb-4" />

        <div className="px-6 pb-6">
          {/* Time */}
          <div className="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-neutral-500">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span className="text-neutral-400 text-sm">{currentTime}</span>
          </div>

          {/* Title and servings control */}
          <div className="flex items-center justify-between mb-6">
            {isEditingName ? (
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNameBlur();
                  if (e.key === "Escape") {
                    setTempName(result.meal_name);
                    setIsEditingName(false);
                  }
                }}
                className="flex-1 text-2xl font-bold text-white bg-transparent border-b-2 border-neutral-700 focus:border-[#E2F163] focus:outline-none"
                autoFocus
                dir="rtl"
              />
            ) : (
              <div
                onClick={() => setIsEditingName(true)}
                className="flex-1 cursor-pointer"
                dir="rtl"
              >
                <h2 className="text-2xl font-bold text-white">
                  {result.meal_name}
                </h2>
              </div>
            )}

            {/* Servings stepper */}
            <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2">
              <button
                onClick={handleDecrement}
                disabled={servings <= 0.5 || isLoading}
                className="w-8 h-8 rounded-full bg-neutral-800 text-white font-bold text-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform"
                aria-label="הפחת מנה"
              >
                −
              </button>

              <div className="text-xl font-semibold text-white min-w-[2rem] text-center">
                {servings}
              </div>

              <button
                onClick={handleIncrement}
                disabled={servings >= 10 || isLoading}
                className="w-8 h-8 rounded-full bg-neutral-800 text-white font-bold text-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform"
                aria-label="הוסף מנה"
              >
                +
              </button>
            </div>
          </div>

          {/* Macros grid - 2x2 layout with Calories, Carbs, Protein, Fat */}
          <div className="grid grid-cols-2 gap-3 mb-6" dir="rtl">
            {/* Calories - EDITABLE */}
            <div
              onClick={() => !isLoading && setIsEditingCalories(true)}
              className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 cursor-pointer hover:bg-neutral-800/80 transition-colors relative"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center p-2 bg-neutral-800/50 rounded-lg">
                  <div className="w-5 h-5 no-emoji flex-shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="#e2f163"
                      className="w-5 h-5"
                    >
                      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="flex flex-col flex-1">
                  <div className="text-sm text-neutral-400 mb-1">קלוריות</div>
                  {isEditingCalories ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      value={baseCalories}
                      onChange={(e) => {
                        const { text } = sanitizeNumeric4(e.target.value);
                        setBaseCalories(text);
                      }}
                      onBlur={() => setIsEditingCalories(false)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setIsEditingCalories(false);
                        if (e.key === "Escape") {
                          setBaseCalories(String(result.calories));
                          setIsEditingCalories(false);
                        }
                      }}
                      className="text-2xl font-bold text-white bg-neutral-800 border-b-2 w-full focus:outline-none rounded px-1 active:translate-y-0.5 transition-transform duration-75"
                      style={{ borderColor: "#e2f163" }}
                      autoFocus
                      disabled={isLoading}
                      maxLength={4}
                    />
                  ) : (
                    <div className="text-2xl font-bold text-white">
                      {scaledCalories}
                    </div>
                  )}
                </div>
              </div>
              {/* Pencil icon in lower left corner */}
              {!isEditingCalories && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3 h-3 text-neutral-500 absolute bottom-2 left-2"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
              )}
            </div>

            {/* Carbs - EDITABLE */}
            <div
              onClick={() => !isLoading && setIsEditingCarbs(true)}
              className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 cursor-pointer hover:bg-neutral-800/80 transition-colors relative"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center p-2 bg-neutral-800/50 rounded-lg">
                  <div className="w-5 h-5 no-emoji flex-shrink-0">
                    <NutrientIcon kind="carbs" className="w-5 h-5 text-[#FFA856]" title="Carbs" />
                  </div>
                </div>
                <div className="flex flex-col flex-1">
                  <div className="text-sm text-neutral-400 mb-1">פחמימות</div>
                  {isEditingCarbs ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      value={baseCarbs}
                      onChange={(e) => {
                        const { text } = sanitizeNumeric4(e.target.value);
                        setBaseCarbs(text);
                      }}
                      onBlur={() => setIsEditingCarbs(false)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setIsEditingCarbs(false);
                        if (e.key === "Escape") {
                          setBaseCarbs(String(result.carbs || 0));
                          setIsEditingCarbs(false);
                        }
                      }}
                      className="text-2xl font-bold text-white bg-neutral-800 border-b-2 border-[#FFA856] w-full focus:outline-none rounded px-1 active:translate-y-0.5 transition-transform duration-75"
                      autoFocus
                      disabled={isLoading}
                      maxLength={4}
                    />
                  ) : (
                    <div className="text-2xl font-bold text-white">
                      {`${scaledCarbs}g`}
                    </div>
                  )}
                </div>
              </div>
              {/* Pencil icon in lower left corner */}
              {!isEditingCarbs && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3 h-3 text-neutral-500 absolute bottom-2 left-2"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
              )}
            </div>

            {/* Protein - EDITABLE */}
            <div
              onClick={() => !isLoading && setIsEditingProtein(true)}
              className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 cursor-pointer hover:bg-neutral-800/80 transition-colors relative"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center p-2 bg-neutral-800/50 rounded-lg">
                  <div className="w-5 h-5 no-emoji flex-shrink-0">
                    <NutrientIcon kind="protein" className="w-5 h-5 text-[#C9456C]" title="Protein" />
                  </div>
                </div>
                <div className="flex flex-col flex-1">
                  <div className="text-sm text-neutral-400 mb-1">חלבון</div>
                  {isEditingProtein ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      value={baseProtein}
                      onChange={(e) => {
                        const { text } = sanitizeNumeric4(e.target.value);
                        setBaseProtein(text);
                      }}
                      onBlur={() => setIsEditingProtein(false)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setIsEditingProtein(false);
                        if (e.key === "Escape") {
                          setBaseProtein(String(result.protein || 0));
                          setIsEditingProtein(false);
                        }
                      }}
                      className="text-2xl font-bold text-white bg-neutral-800 border-b-2 border-[#C9456C] w-full focus:outline-none rounded px-1 active:translate-y-0.5 transition-transform duration-75"
                      autoFocus
                      disabled={isLoading}
                      maxLength={4}
                    />
                  ) : (
                    <div className="text-2xl font-bold text-white">
                      {`${scaledProtein}g`}
                    </div>
                  )}
                </div>
              </div>
              {/* Pencil icon in lower left corner */}
              {!isEditingProtein && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3 h-3 text-neutral-500 absolute bottom-2 left-2"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
              )}
            </div>

            {/* Fat - EDITABLE */}
            <div
              onClick={() => !isLoading && setIsEditingFat(true)}
              className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 cursor-pointer hover:bg-neutral-800/80 transition-colors relative"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center p-2 bg-neutral-800/50 rounded-lg">
                  <div className="w-5 h-5 no-emoji flex-shrink-0">
                    <NutrientIcon kind="fat" className="w-5 h-5 text-[#5B9BFF]" title="Fat" />
                  </div>
                </div>
                <div className="flex flex-col flex-1">
                  <div className="text-sm text-neutral-400 mb-1">שומן</div>
                  {isEditingFat ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      value={baseFat}
                      onChange={(e) => {
                        const { text } = sanitizeNumeric4(e.target.value);
                        setBaseFat(text);
                      }}
                      onBlur={() => setIsEditingFat(false)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setIsEditingFat(false);
                        if (e.key === "Escape") {
                          setBaseFat(String(result.fat || 0));
                          setIsEditingFat(false);
                        }
                      }}
                      className="text-2xl font-bold text-white bg-neutral-800 border-b-2 border-[#5B9BFF] w-full focus:outline-none rounded px-1 active:translate-y-0.5 transition-transform duration-75"
                      autoFocus
                      disabled={isLoading}
                      maxLength={4}
                    />
                  ) : (
                    <div className="text-2xl font-bold text-white">
                      {`${scaledFat}g`}
                    </div>
                  )}
                </div>
              </div>
              {/* Pencil icon in lower left corner */}
              {!isEditingFat && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3 h-3 text-neutral-500 absolute bottom-2 left-2"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
              )}
            </div>
          </div>

          {/* Ingredients (collapsible) */}
          {result.ingredients && result.ingredients.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setShowIngredients(!showIngredients)}
                className="w-full flex items-center justify-between py-3 border-b border-neutral-800"
                aria-label={showIngredients ? "הסתר מרכיבים" : "הצג מרכיבים"}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-white">מרכיבים</span>
                  <button className="text-neutral-500 text-sm">+ הוסף עוד</button>
                </div>
                <motion.svg
                  animate={{ rotate: showIngredients ? 180 : 0 }}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5 text-neutral-500"
                >
                  <path d="m6 9 6 6 6-6"/>
                </motion.svg>
              </button>

              <AnimatePresence>
                {showIngredients && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 space-y-2">
                      {result.ingredients.map((ingredient, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 px-3 bg-neutral-900/50 border border-neutral-800 rounded-lg">
                          <span className="text-white text-sm">{ingredient}</span>
                          <span className="text-neutral-500 text-sm">—</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Health score indicator with progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2" dir="rtl">
              <span className="text-sm text-neutral-400">
                רמת בריאות
              </span>
              <span className="text-sm font-semibold text-white">
                {Math.max(1, Math.min(10, Math.round((result.health_score || 0) / 10)))}/10
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.max(0, Math.min(100, result.health_score || 0))}%`,
                  backgroundColor:
                    (result.health_score || 0) >= 80 ? '#7ED957' : // Green for very healthy
                    (result.health_score || 0) >= 60 ? '#FFA856' : // Orange for moderately healthy
                    (result.health_score || 0) >= 40 ? '#FFD700' : // Yellow for neutral
                    '#FF6B6B' // Red for unhealthy
                }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onScanAgain}
              disabled={isLoading}
              className="flex-1 py-4 bg-neutral-900 border border-neutral-800 text-white font-semibold rounded-xl active:translate-y-1 active:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              aria-label="סרוק שוב"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
              </svg>
              <span>סרוק שוב</span>
            </button>

            <button
              onClick={onAddMeal}
              disabled={isLoading}
              className="flex-1 py-4 bg-[#E2F163] hover:bg-[#d4e34f] text-black font-bold rounded-xl active:translate-y-1 active:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: "56px" }}
              aria-label="הוסף ארוחה"
            >
              {isLoading ? "שומר..." : "הוסף ארוחה"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
