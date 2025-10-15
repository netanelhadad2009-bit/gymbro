// lib/nativeConfirm.ts
import { Capacitor } from '@capacitor/core';
import { Dialog } from '@capacitor/dialog';

/**
 * Shows a native confirmation dialog on mobile devices (iOS/Android)
 * Falls back to window.confirm on web browsers
 *
 * @param title - Dialog title
 * @param message - Dialog message (supports \n for line breaks)
 * @param okText - Confirmation button text
 * @param cancelText - Cancel button text
 * @returns Promise<boolean> - true if user confirmed, false if cancelled
 */
export async function nativeConfirm(
  title: string,
  message: string,
  okText = 'אישור',
  cancelText = 'ביטול'
): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Dialog.confirm({
        title,
        message,
        okButtonTitle: okText,
        cancelButtonTitle: cancelText,
      });
      return Boolean(value);
    }
  } catch (error) {
    console.error('[nativeConfirm] Error showing native dialog:', error);
    // fallthrough to web confirm
  }

  // Web fallback
  return window.confirm(`${title}\n\n${message}`);
}
