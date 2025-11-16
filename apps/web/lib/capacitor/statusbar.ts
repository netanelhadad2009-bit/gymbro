/**
 * Capacitor StatusBar configuration
 * Makes the status bar overlay the WebView so content can extend into safe areas
 */

import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export async function setupStatusBar() {
  // Only run on native platforms (iOS/Android), not in web browser
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Allow content to extend under the status bar
    await StatusBar.setOverlaysWebView({ overlay: true });

    // Set background color to match app background
    await StatusBar.setBackgroundColor({ color: '#0b0d0e' });

    // Use dark style (white icons/text) for dark background
    await StatusBar.setStyle({ style: Style.Dark });

    console.log('[StatusBar] Configured successfully');
  } catch (error) {
    console.warn('[StatusBar] Setup error:', error);
  }
}
