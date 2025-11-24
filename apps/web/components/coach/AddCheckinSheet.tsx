"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSheet } from "@/contexts/SheetContext";
import { Keyboard } from "@capacitor/keyboard";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CheckinData) => Promise<void>;
  assignmentId: string;
};

export type CheckinData = {
  assignment_id: string;
  date: string;
  weight_kg?: number;
  mood?: number;
  energy?: number;
  note?: string;
  photos?: string[];
};

export function AddCheckinSheet({ isOpen, onClose, onSubmit, assignmentId }: Props) {
  const { setIsSheetOpen } = useSheet();
  const [weight, setWeight] = useState("");
  const [mood, setMood] = useState<number>(0);
  const [energy, setEnergy] = useState<number>(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Notify context when sheet opens/closes
  useEffect(() => {
    setIsSheetOpen(isOpen);
  }, [isOpen, setIsSheetOpen]);

  // Listen for keyboard show/hide events
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const handleKeyboardShow = (info: any) => {
      console.log('[AddCheckinSheet] Keyboard shown, height:', info.keyboardHeight);
      setKeyboardHeight(info.keyboardHeight);
    };

    const handleKeyboardHide = () => {
      console.log('[AddCheckinSheet] Keyboard hidden');
      setKeyboardHeight(0);
    };

    let showListener: any;
    let hideListener: any;

    const setupListeners = async () => {
      showListener = await Keyboard.addListener('keyboardWillShow', handleKeyboardShow);
      hideListener = await Keyboard.addListener('keyboardWillHide', handleKeyboardHide);
    };

    setupListeners();

    return () => {
      showListener?.remove();
      hideListener?.remove();
    };
  }, [isOpen]);

  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    setUploading(true);

    try {
      // TODO: Upload photos to Supabase storage
      const photoUrls: string[] = [];

      const data: CheckinData = {
        assignment_id: assignmentId,
        date: new Date().toISOString().split("T")[0],
        weight_kg: weight ? parseFloat(weight) : undefined,
        mood: mood > 0 ? mood : undefined,
        energy: energy > 0 ? energy : undefined,
        note: note.trim() || undefined,
        photos: photoUrls.length > 0 ? photoUrls : undefined,
      };

      await onSubmit(data);

      // Reset form
      setWeight("");
      setMood(0);
      setEnergy(0);
      setNote("");
      setPhotos([]);
      onClose();
    } catch (error) {
      console.error("Failed to submit check-in:", error);
      alert("שגיאה בשמירת הצ'ק-אין");
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > 3) {
      alert("ניתן להעלות עד 3 תמונות");
      return;
    }
    setPhotos((prev) => [...prev, ...files].slice(0, 3));
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

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
              <h3 className="text-xl font-bold text-white mb-6">צ'ק-אין חדש</h3>

              {/* Weight */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  משקל (ק"ג)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="הכנס משקל"
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#E2F163]"
                />
              </div>

              {/* Mood */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  מצב רוח
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMood(value)}
                      className={`flex-1 aspect-square rounded-xl border-2 transition-all ${
                        mood >= value
                          ? "bg-yellow-400 border-yellow-400"
                          : "bg-neutral-800 border-neutral-700 hover:border-neutral-600"
                      }`}
                    >
                      <span className="text-2xl">
                        {value === 1 && "😢"}
                        {value === 2 && "😕"}
                        {value === 3 && "😐"}
                        {value === 4 && "🙂"}
                        {value === 5 && "😄"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  רמת אנרגיה
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setEnergy(value)}
                      className={`flex-1 h-12 rounded-xl border-2 transition-all ${
                        energy >= value
                          ? "bg-green-400 border-green-400"
                          : "bg-neutral-800 border-neutral-700 hover:border-neutral-600"
                      }`}
                    >
                      <div className="text-lg font-bold text-black">{value}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  הערה (אופציונלי)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="איך הרגשת? מה אכלת? האם אימנת?"
                  rows={3}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#E2F163] resize-none"
                />
              </div>

              {/* Photos */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  תמונות (עד 3)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {photos.length < 3 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square bg-neutral-800 border-2 border-dashed border-neutral-700 rounded-lg flex items-center justify-center hover:border-neutral-600 transition-colors"
                    >
                      <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={uploading}
                  className="flex-1 py-3 bg-neutral-800 border border-neutral-700 text-white font-medium rounded-xl hover:bg-neutral-750 active:translate-y-1 active:brightness-90 transition-all disabled:opacity-50"
                >
                  ביטול
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={uploading}
                  className="flex-1 py-3 bg-[#E2F163] text-black font-semibold rounded-xl hover:bg-[#d4e350] active:translate-y-1 active:brightness-90 transition-all disabled:opacity-50"
                >
                  {uploading ? "שומר..." : "שמור"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
