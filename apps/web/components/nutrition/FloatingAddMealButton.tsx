"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { nativeConfirm } from "@/lib/nativeConfirm";
import { useSheet } from "@/contexts/SheetContext";
import { NutritionImagePicker } from "./NutritionImagePicker";

type Props = {
  onScanPhoto: (file: File) => void;
  onScanBarcode?: () => void;
};

export default function FloatingAddMealButton({ onScanPhoto, onScanBarcode }: Props) {
  const [open, setOpen] = useState(false);
  const { setIsSheetOpen } = useSheet();

  // Notify context when sheet opens/closes
  useEffect(() => {
    setIsSheetOpen(open);
  }, [open, setIsSheetOpen]);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const showCameraPermissionDialog = async (): Promise<boolean> => {
    const confirmed = await nativeConfirm(
      "גישה למצלמה",
      "האפליקציה הזו מבקשת גישה למצלמה שלך עבור צילום מאכלים/ארוחות לצורך ניתוח הערכים התזונתיים והוספתם ליומן התזונה.\n\nחשוב לציין: החישובים התזונתיים על בסיס התמונות עלולים להיות לא מדויקים.\n\nמומלץ לצלם ארוחות עם מוצרים הברורים לעין וללא מרכיבים סמויים.",
      "אישור",
      "ביטול"
    );

    return confirmed;
  };

  const handleTakePhoto = async () => {
    // Always show permission dialog before taking photo
    const confirmed = await showCameraPermissionDialog();
    if (!confirmed) {
      setOpen(false);
      return;
    }
    cameraRef.current?.click();
    setOpen(false);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onScanPhoto(f);
    e.target.value = ""; // reset
  };

  /**
   * Handle gallery picker result (from NutritionImagePicker)
   * Converts base64 or URI to File if needed (Capacitor mobile)
   */
  const handleGalleryPicked = async (result: { uri?: string; file?: File; base64?: string }) => {
    setOpen(false);

    try {
      if (result.file) {
        // Web: already a File
        onScanPhoto(result.file);
      } else if (result.base64) {
        // Capacitor: convert base64 to File
        console.log("[FloatingAddMealButton] Converting base64 to File");
        const base64Data = result.base64;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/jpeg" });
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
        onScanPhoto(file);
      } else if (result.uri) {
        // Fallback: try URI (might not work on all platforms)
        console.log("[FloatingAddMealButton] Attempting to fetch URI:", result.uri);
        const response = await fetch(result.uri);
        const blob = await response.blob();
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
        onScanPhoto(file);
      }
    } catch (error) {
      console.error("[FloatingAddMealButton] Error converting to File:", error);
      alert("שגיאה בעיבוד התמונה. נסה שוב.");
    }
  };

  return (
    <>
      {/* Camera input */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+96px)] right-4 z-50">
        <motion.button
          onClick={() => setOpen((v) => !v)}
          className="h-14 w-14 rounded-full shadow-lg bg-[#E2F163] text-black grid place-items-center"
          whileTap={{ scale: 0.94 }}
          aria-label="Add meal"
        >
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-4xl font-bold"
          >
            +
          </motion.span>
        </motion.button>
      </div>

      {/* Backdrop when menu is open */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50"
            style={{ zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Bottom sheet with options */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-neutral-900 rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4"
            style={{ zIndex: 9999 }}
            dir="rtl"
          >
            {/* Drag indicator */}
            <div className="w-12 h-1 bg-neutral-700 rounded-full mx-auto mb-4" />

            {/* Title */}
            <h3 className="text-white text-lg font-semibold text-center mb-4">הוסף ארוחה</h3>

            {/* Options - each appears with staggered animation */}
            <div className="space-y-2 px-4">
              {/* Food Search Option */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl p-4 flex items-center gap-4 active:bg-neutral-700 transition-colors"
                onClick={() => {
                  setOpen(false);
                  router.push('/nutrition/search');
                }}
              >
                <div className="w-12 h-12 bg-[#E2F163]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6 text-[#E2F163]"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <div className="flex-1 text-right">
                  <div className="text-white font-medium">חיפוש במאגר</div>
                  <div className="text-neutral-400 text-sm">חפשו והוסיפו מאכלים מהמאגרים</div>
                </div>
              </motion.button>

              {/* Gallery Option - with NutritionImagePicker */}
              <NutritionImagePicker onPicked={handleGalleryPicked}>
                {({ onClick, disabled }) => (
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl p-4 flex items-center gap-4 active:bg-neutral-700 transition-colors disabled:opacity-50"
                    onClick={onClick}
                    disabled={disabled}
                  >
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-6 h-6 text-purple-400"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                    <div className="flex-1 text-right">
                      <div className="text-white font-medium">תמונה מהגלריה</div>
                      <div className="text-neutral-400 text-sm">העלה תמונה קיימת מהמכשיר</div>
                    </div>
                  </motion.button>
                )}
              </NutritionImagePicker>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl p-4 flex items-center gap-4 active:bg-neutral-700 transition-colors"
                onClick={handleTakePhoto}
              >
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6 text-blue-400"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <div className="flex-1 text-right">
                  <div className="text-white font-medium">צלם תמונה</div>
                  <div className="text-neutral-400 text-sm">פתח מצלמה וצלם את הארוחה</div>
                </div>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl p-4 flex items-center gap-4 active:bg-neutral-700 transition-colors"
                onClick={() => {
                  setOpen(false);
                  if (onScanBarcode) {
                    onScanBarcode();
                  } else {
                    // Fallback: onScanBarcode should always be provided
                    console.log("[FloatingAddMealButton] Barcode scan callback not provided");
                  }
                }}
              >
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6 text-green-400"
                  >
                    <path d="M3 5v14" />
                    <path d="M8 5v14" />
                    <path d="M12 5v14" />
                    <path d="M17 5v14" />
                    <path d="M21 5v14" />
                  </svg>
                </div>
                <div className="flex-1 text-right">
                  <div className="text-white font-medium">סרוק ברקוד</div>
                  <div className="text-neutral-400 text-sm">סרוק ברקוד של מוצר מזון</div>
                </div>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl p-4 flex items-center gap-4 active:bg-neutral-700 transition-colors"
                onClick={() => {
                  setOpen(false);
                  router.push("/nutrition/add-manual");
                }}
              >
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6 text-yellow-400"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
                <div className="flex-1 text-right">
                  <div className="text-white font-medium">הוספה ידנית</div>
                  <div className="text-neutral-400 text-sm">הזן את פרטי הארוחה באופן ידני</div>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Export with backward compatibility
export { FloatingAddMealButton };