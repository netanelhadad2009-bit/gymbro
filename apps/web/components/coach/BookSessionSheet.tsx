"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSheet } from "@/contexts/SheetContext";
import { Keyboard } from "@capacitor/keyboard";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SessionData) => Promise<void>;
  assignmentId: string;
};

export type SessionData = {
  assignment_id: string;
  start_t: string;
  end_t: string;
  kind: "video" | "in_person" | "gym";
  location?: string;
  notes?: string;
};

export function BookSessionSheet({ isOpen, onClose, onSubmit, assignmentId }: Props) {
  const { setIsSheetOpen, setIsKeyboardVisible } = useSheet();
  const [kind, setKind] = useState<SessionData["kind"]>("video");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Notify context when sheet opens/closes
  useEffect(() => {
    setIsSheetOpen(isOpen);
  }, [isOpen, setIsSheetOpen]);

  // Listen for keyboard show/hide events
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const handleKeyboardShow = (info: any) => {
      console.log('[BookSessionSheet] Keyboard shown, height:', info.keyboardHeight);
      setKeyboardHeight(info.keyboardHeight);
      setIsKeyboardVisible(true);
    };

    const handleKeyboardHide = () => {
      console.log('[BookSessionSheet] Keyboard hidden');
      setKeyboardHeight(0);
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
  }, [isOpen, setIsKeyboardVisible]);

  const handleSubmit = async () => {
    if (!date || !startTime) {
      alert("יש למלא תאריך ושעה");
      return;
    }

    if ((kind === "in_person" || kind === "gym") && !location) {
      alert("יש למלא מיקום");
      return;
    }

    setSubmitting(true);

    try {
      // Construct ISO datetime strings
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60 * 1000);

      const data: SessionData = {
        assignment_id: assignmentId,
        start_t: startDateTime.toISOString(),
        end_t: endDateTime.toISOString(),
        kind,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      await onSubmit(data);

      // Reset form
      setKind("video");
      setDate("");
      setStartTime("");
      setDuration("60");
      setLocation("");
      setNotes("");
      onClose();
    } catch (error: any) {
      console.error("Failed to book session:", error);
      alert(error.message || "שגיאה בקביעת אימון");
    } finally {
      setSubmitting(false);
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split("T")[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80"
            style={{ zIndex: 9998 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 right-0 bg-neutral-900 rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4 transition-all duration-200"
            style={{
              zIndex: 9999,
              bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0px',
            }}
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag indicator */}
            <div className="w-12 h-1 bg-neutral-700 rounded-full mx-auto mb-4" />

            {/* Content */}
            <div className="px-6 max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-6">קביעת אימון</h3>

              {/* Session type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  סוג אימון
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "video", label: "וידאו", icon: "📹" },
                    { value: "in_person", label: "פנים אל פנים", icon: "🏃" },
                    { value: "gym", label: "חדר כושר", icon: "💪" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setKind(option.value as SessionData["kind"])}
                      className={`py-3 px-2 rounded-xl border-2 transition-all text-sm ${
                        kind === option.value
                          ? "bg-[#E2F163] border-[#E2F163] text-black font-semibold"
                          : "bg-neutral-800 border-neutral-700 text-white hover:border-neutral-600"
                      }`}
                    >
                      <div className="text-2xl mb-1">{option.icon}</div>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  תאריך
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={today}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E2F163]"
                />
              </div>

              {/* Time */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  שעת התחלה
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E2F163]"
                />
              </div>

              {/* Duration */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  משך (דקות)
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E2F163]"
                >
                  <option value="30">30 דקות</option>
                  <option value="45">45 דקות</option>
                  <option value="60">60 דקות</option>
                  <option value="90">90 דקות</option>
                  <option value="120">120 דקות</option>
                </select>
              </div>

              {/* Location (for in-person/gym) */}
              {(kind === "in_person" || kind === "gym") && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    מיקום *
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="הכנס כתובת או שם מקום"
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#E2F163]"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  הערות (אופציונלי)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="נושאים לדיון, שאלות, בקשות..."
                  rows={3}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#E2F163] resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 py-3 bg-neutral-800 border border-neutral-700 text-white font-medium rounded-xl hover:bg-neutral-750 active:translate-y-1 active:brightness-90 transition-all disabled:opacity-50"
                >
                  ביטול
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 bg-[#E2F163] text-black font-semibold rounded-xl hover:bg-[#d4e350] active:translate-y-1 active:brightness-90 transition-all disabled:opacity-50"
                >
                  {submitting ? "קובע..." : "קבע אימון"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
