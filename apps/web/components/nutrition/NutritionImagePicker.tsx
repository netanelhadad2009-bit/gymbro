/**
 * NutritionImagePicker - Gallery picker with pre-warning modal
 *
 * Shows accuracy disclaimer BEFORE opening gallery, then opens photo library directly:
 * - iOS/Android (Capacitor): Uses Camera.getPhoto with CameraSource.Photos to skip system sheet
 * - Web: Uses hidden file input (no capture attribute) as fallback
 *
 * Usage:
 *   <NutritionImagePicker onPicked={(result) => { ... }} />
 */

"use client";

import { useRef } from "react";
import { nativeConfirm } from "@/lib/nativeConfirm";

interface PickedResult {
  uri?: string;
  file?: File;
  base64?: string;
}

interface PickedMetadata {
  source: "gallery";
}

interface NutritionImagePickerProps {
  onPicked: (result: PickedResult, metadata?: PickedMetadata) => void;
  children: (props: { onClick: () => void; disabled: boolean }) => React.ReactNode;
}

export function NutritionImagePicker({ onPicked, children }: NutritionImagePickerProps) {
  const isOpeningRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Show accuracy disclaimer modal for gallery access
   */
  const showAccuracyDisclaimer = async (): Promise<boolean> => {
    const confirmed = await nativeConfirm(
      "גישה לגלריה",
      "האפליקציה הזו מבקשת גישה לגלריה שלך לבחירת תמונות מאכלים/ארוחות לצורך ניתוח הערכים התזונתיים והוספתם ליומן התזונה.\n\nחשוב לציין: החישובים התזונתיים על בסיס התמונות עלולים להיות לא מדויקים.\n\nמומלץ לבחור תמונות ארוחות עם מוצרים הברורים לעין וללא מרכיבים סמויים.",
      "אישור",
      "ביטול"
    );
    return confirmed;
  };

  /**
   * Open gallery using Capacitor Camera (mobile) or file input (web)
   */
  const handleOpenGallery = async () => {
    // Prevent double-clicks
    if (isOpeningRef.current) {
      console.log("[ImagePicker] Already opening, ignoring double-click");
      return;
    }

    isOpeningRef.current = true;

    try {
      // Show disclaimer first
      const confirmed = await showAccuracyDisclaimer();
      if (!confirmed) {
        console.log("[ImagePicker] User cancelled at disclaimer");
        isOpeningRef.current = false;
        return;
      }

      // Check if Capacitor is available (native mobile)
      const isCapacitor = typeof window !== "undefined" && (window as any).Capacitor;

      if (isCapacitor) {
        // Mobile: Use Capacitor Camera with CameraSource.Photos to skip action sheet
        console.log("[ImagePicker] Opening gallery via Capacitor Camera");

        try {
          const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");

          const photo = await Camera.getPhoto({
            source: CameraSource.Photos, // Force gallery (skip action sheet)
            resultType: CameraResultType.Base64, // Use base64 to avoid iOS file:// URI issues
            quality: 90,
            correctOrientation: true,
            allowEditing: false,
            presentationStyle: "fullscreen",
          });

          if (photo.base64String) {
            console.log("[ImagePicker] Photo selected from gallery (base64)");
            onPicked({
              base64: photo.base64String,
              uri: photo.webPath // Still provide URI for reference
            }, { source: "gallery" });
          } else {
            console.warn("[ImagePicker] No base64String returned from Camera.getPhoto");
          }
        } catch (cameraError: any) {
          // User cancelled or error
          if (cameraError.message?.includes("cancel") || cameraError.message?.includes("User cancelled")) {
            console.log("[ImagePicker] User cancelled photo selection");
          } else {
            console.error("[ImagePicker] Camera.getPhoto error:", cameraError);
            console.error("[ImagePicker] Error details:", {
              message: cameraError.message,
              code: cameraError.code,
              stack: cameraError.stack,
            });
            alert(`שגיאה בפתיחת הגלריה.\nשגיאה: ${cameraError.message || cameraError.code || "לא ידוע"}`);
          }
        }
      } else {
        // Web: Use hidden file input as fallback
        console.log("[ImagePicker] Opening gallery via file input (web fallback)");
        fileInputRef.current?.click();
      }
    } finally {
      isOpeningRef.current = false;
    }
  };

  /**
   * Handle file selection from web input
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log("[ImagePicker] No file selected");
      return;
    }

    console.log("[ImagePicker] File selected from web input:", file.name);
    onPicked({ file }, { source: "gallery" });

    // Reset input for next selection
    event.target.value = "";
  };

  return (
    <>
      {children({ onClick: handleOpenGallery, disabled: isOpeningRef.current })}

      {/* Hidden file input for web fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
