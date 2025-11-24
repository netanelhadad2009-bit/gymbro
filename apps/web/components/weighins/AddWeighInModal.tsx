"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { createWeighIn } from "@/lib/weighins/queries";
import { useSheet } from "@/contexts/SheetContext";
import { Keyboard } from "@capacitor/keyboard";

type AddWeighInModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess?: () => void;
};

// Helper function to get current datetime in local timezone for datetime-local input
function getCurrentLocalDatetime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function AddWeighInModal({ isOpen, onClose, userId, onSuccess }: AddWeighInModalProps) {
  const { setIsSheetOpen } = useSheet();
  const [date, setDate] = useState(getCurrentLocalDatetime());
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Reset date to current time when modal opens
  useEffect(() => {
    if (isOpen) {
      setDate(getCurrentLocalDatetime());
    }
  }, [isOpen]);

  // Notify context when modal opens/closes to hide bottom nav
  useEffect(() => {
    setIsSheetOpen(isOpen);
  }, [isOpen, setIsSheetOpen]);

  // Listen for keyboard show/hide events
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    console.log('[AddWeighInModal] Setting up keyboard listeners');

    const handleKeyboardShow = (info: any) => {
      console.log('[AddWeighInModal] Keyboard shown, info:', JSON.stringify(info));
      const height = info.keyboardHeight || 0;
      console.log('[AddWeighInModal] Setting keyboard height to:', height);
      setKeyboardHeight(height);
    };

    const handleKeyboardHide = () => {
      console.log('[AddWeighInModal] Keyboard hidden');
      setKeyboardHeight(0);
    };

    let willShowListener: any;
    let didShowListener: any;
    let willHideListener: any;
    let didHideListener: any;

    const setupListeners = async () => {
      // Try both Will and Did events
      willShowListener = await Keyboard.addListener('keyboardWillShow', handleKeyboardShow);
      didShowListener = await Keyboard.addListener('keyboardDidShow', handleKeyboardShow);
      willHideListener = await Keyboard.addListener('keyboardWillHide', handleKeyboardHide);
      didHideListener = await Keyboard.addListener('keyboardDidHide', handleKeyboardHide);
    };

    setupListeners();

    return () => {
      console.log('[AddWeighInModal] Removing keyboard listeners');
      willShowListener?.remove();
      didShowListener?.remove();
      willHideListener?.remove();
      didHideListener?.remove();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const weightNum = parseFloat(weight);

    // Validation
    if (!weight || isNaN(weightNum)) {
      setError("יש להזין משקל תקין");
      return;
    }

    if (weightNum < 20 || weightNum > 300) {
      setError("המשקל חייב להיות בין 20 ל-300 ק״ג");
      return;
    }

    // Parse the datetime-local input as a local date (not UTC)
    // datetime-local format: "2025-11-13T09:33"
    const [datePart, timePart] = date.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);

    // Create date in local timezone
    const selectedDate = new Date(year, month - 1, day, hours, minutes);
    const now = new Date();
    const diffHours = (selectedDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours > 24) {
      const confirmFuture = confirm("התאריך שבחרת הוא בעתיד. האם אתה בטוח?");
      if (!confirmFuture) return;
    }

    setLoading(true);

    try {
      const result = await createWeighIn(supabase, userId, {
        date: selectedDate,
        weight_kg: weightNum,
        notes: note.trim() || undefined,
      });

      if (!result.ok) {
        throw new Error(result.error || "שגיאה בהוספת שקילה");
      }

      // Reset form
      setWeight("");
      setNote("");
      setDate(getCurrentLocalDatetime());

      // Close modal and notify parent
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("[AddWeighIn] Error:", err);
      setError(err.message || "שגיאה בהוספת שקילה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 z-[60]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-x-0 z-[61] animate-slide-up transition-all duration-200"
        dir="rtl"
        style={{
          bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0px',
        }}
      >
        <div
          className="bg-neutral-900 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
          style={{
            paddingBottom: `calc(1.5rem + env(safe-area-inset-bottom))`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="w-12 h-1 bg-neutral-700 rounded-full mx-auto mb-6" />

          {/* Header */}
          <h2 className="text-xl font-bold text-white mb-6">הוסף שקילה</h2>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date/Time */}
            <div>
              <label htmlFor="weigh-date" className="block text-sm font-medium text-neutral-300 mb-2">
                תאריך ושעה
              </label>
              <input
                id="weigh-date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E2F163] focus:border-transparent"
                required
              />
            </div>

            {/* Weight */}
            <div>
              <label htmlFor="weigh-weight" className="block text-sm font-medium text-neutral-300 mb-2">
                משקל (ק״ג) *
              </label>
              <input
                id="weigh-weight"
                type="number"
                step="0.1"
                min="20"
                max="300"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="75.5"
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E2F163] focus:border-transparent"
                required
                autoFocus
              />
            </div>

            {/* Note */}
            <div>
              <label htmlFor="weigh-note" className="block text-sm font-medium text-neutral-300 mb-2">
                הערה (אופציונלי)
              </label>
              <textarea
                id="weigh-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="לדוגמה: אחרי ארוחת בוקר"
                rows={2}
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E2F163] focus:border-transparent resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-xl p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-neutral-800 text-white rounded-xl font-medium active:opacity-90 disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 bg-[#E2F163] text-black rounded-xl font-medium active:opacity-90 disabled:opacity-50"
              >
                {loading ? "שומר..." : "הוסף"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
