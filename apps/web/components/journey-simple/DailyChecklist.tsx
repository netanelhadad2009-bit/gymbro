"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CheckSquare, Square, Sparkles } from "lucide-react";

interface ChecklistItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface DailyChecklistProps {
  userId: string;
}

const DEFAULT_HABITS: ChecklistItem[] = [
  { id: "weigh-in", label: "שקילה בוקר" },
  { id: "water", label: "8 כוסות מים" },
  { id: "meals", label: "ארוחות לפי תוכנית" },
  { id: "workout", label: "אימון היום" },
  { id: "sleep", label: "שינה איכותית" },
];

function getTodayKey(userId: string): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `checklist-${userId}-${yyyy}-${mm}-${dd}`;
}

export function DailyChecklist({ userId }: DailyChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const storageKey = getTodayKey(userId);
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCheckedItems(new Set(parsed));
      } catch (err) {
        console.error("[DailyChecklist] Failed to parse stored data:", err);
      }
    }

    setIsLoaded(true);
  }, [userId]);

  // Save to localStorage whenever checkedItems changes
  useEffect(() => {
    if (!isLoaded) return; // Don't save until initial load is complete

    const storageKey = getTodayKey(userId);
    const data = Array.from(checkedItems);
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [checkedItems, userId, isLoaded]);

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const completionPercentage = (checkedItems.size / DEFAULT_HABITS.length) * 100;
  const allCompleted = checkedItems.size === DEFAULT_HABITS.length;

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-xl flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#E2F163]" />
            משימות יומיות
          </CardTitle>
          <span className="text-sm text-neutral-400">
            {checkedItems.size}/{DEFAULT_HABITS.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Checklist Items */}
        {DEFAULT_HABITS.map((habit) => {
          const isChecked = checkedItems.has(habit.id);

          return (
            <button
              key={habit.id}
              onClick={() => toggleItem(habit.id)}
              className={[
                "w-full flex items-center gap-3 p-3 rounded-lg text-right transition-all",
                "active:scale-[0.98]",
                isChecked
                  ? "bg-[#E2F163]/10 border border-[#E2F163]/20"
                  : "bg-neutral-800/30 border border-transparent hover:bg-neutral-800/50",
              ].filter(Boolean).join(" ")}
            >
              {/* Checkbox Icon */}
              <div className="shrink-0">
                {isChecked ? (
                  <CheckSquare className="w-6 h-6 text-[#E2F163]" />
                ) : (
                  <Square className="w-6 h-6 text-neutral-500" />
                )}
              </div>

              {/* Label */}
              <span
                className={[
                  "flex-1 text-right font-medium",
                  isChecked ? "text-white" : "text-neutral-300",
                ].filter(Boolean).join(" ")}
              >
                {habit.label}
              </span>
            </button>
          );
        })}

        {/* Completion Badge */}
        {allCompleted && (
          <div className="flex items-center gap-2 text-sm text-[#E2F163] bg-[#E2F163]/10 p-3 rounded-lg animate-in fade-in slide-in-from-bottom-2">
            <Sparkles className="w-4 h-4" />
            <span className="font-semibold">כל הכבוד! השלמת את כל המשימות היום!</span>
          </div>
        )}

        {/* Progress Indicator */}
        {!allCompleted && completionPercentage > 0 && (
          <div className="text-xs text-neutral-400 text-center pt-2">
            עוד קצת! {Math.round(completionPercentage)}% הושלמו
          </div>
        )}
      </CardContent>
    </Card>
  );
}
