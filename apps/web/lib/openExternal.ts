import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";

/**
 * Opens a URL in an external browser.
 * - On native platforms: Opens in the system browser (Safari/Chrome)
 * - On web: Opens in a new tab
 * - Fallback: Direct navigation if all else fails
 */
export async function openExternal(url: string) {
  console.log("[openExternal] Called with URL:", url);
  console.log("[openExternal] isNativePlatform:", Capacitor.isNativePlatform());
  console.log("[openExternal] Platform:", Capacitor.getPlatform());

  try {
    if (Capacitor.isNativePlatform()) {
      console.log("[openExternal] Opening in native browser with Browser.open()");
      const result = await Browser.open({ url });
      console.log("[openExternal] Browser.open result:", result);

      // iOS Simulator workaround: Browser.open returns undefined but doesn't actually open
      // Use window.open and force a reload when returning to fix event handlers
      if (result === undefined || result === null) {
        console.log("[openExternal] Browser.open returned undefined (likely simulator)");
        console.log("[openExternal] Using window.open with reload listener");

        // Set up a one-time listener for when the app regains focus
        const handleResume = () => {
          console.log("[openExternal] App resumed, forcing re-render");
          // Force a re-render by triggering a popstate event
          window.dispatchEvent(new Event('focus'));
          App.removeAllListeners();
        };

        App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            handleResume();
          }
        });

        // Also listen for visibility change (works in simulator)
        const visibilityHandler = () => {
          if (!document.hidden) {
            console.log("[openExternal] Page visible again, cleaning up");
            document.removeEventListener('visibilitychange', visibilityHandler);
            // Trigger a re-render by dispatching a custom event
            window.dispatchEvent(new CustomEvent('external-browser-closed'));
          }
        };
        document.addEventListener('visibilitychange', visibilityHandler);

        window.open(url, "_blank", "noopener,noreferrer");
      }
    } else {
      console.log("[openExternal] Opening in new tab with window.open()");
      const newWindow = window.open(url, "_blank", "noopener,noreferrer");
      console.log("[openExternal] window.open returned:", newWindow);
    }
  } catch (error) {
    console.error("[openExternal] Error occurred:", error);
    console.log("[openExternal] Falling back to window.open");
    // Fallback: try window.open
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
