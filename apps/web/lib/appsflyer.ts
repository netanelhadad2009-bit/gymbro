/**
 * AppsFlyer SDK wrapper for FitJourney
 *
 * This module provides a TypeScript interface to the native AppsFlyer SDK.
 * It only works on native iOS/Android platforms (not web).
 *
 * Usage:
 *   import AppsFlyer from '@/lib/appsflyer';
 *
 *   // Set user ID after login/signup
 *   AppsFlyer.setCustomerUserId(user.id);
 *
 *   // Log events
 *   AppsFlyer.logEvent('signup_completed', { method: 'email' });
 *   AppsFlyer.logEvent('subscription_purchase_success', { plan: 'yearly', revenue: 299 });
 */

import { Capacitor, registerPlugin } from "@capacitor/core";

// Type definitions for the native plugin
interface AppsFlyerPluginInterface {
  setCustomerUserId(options: { userId: string }): Promise<{ success: boolean; userId: string }>;
  logEvent(options: { eventName: string; eventValues?: Record<string, any> }): Promise<{ success: boolean; eventName: string }>;
  getAppsFlyerUID(): Promise<{ uid: string }>;
}

// Register the native plugin (only available on iOS/Android)
const AppsFlyerPlugin = registerPlugin<AppsFlyerPluginInterface>("AppsFlyerPlugin");

// Check if we're running on a native platform
const isNative = Capacitor.isNativePlatform();

/**
 * AppsFlyer SDK wrapper
 * All methods are no-ops on web platform
 */
const AppsFlyer = {
  /**
   * Set the customer user ID for attribution.
   * Call this after user login/signup to link AppsFlyer data to your user.
   * Use the same user ID format as Mixpanel/RevenueCat for consistency.
   *
   * @param userId - Your internal user ID (e.g., Supabase auth user ID)
   */
  async setCustomerUserId(userId: string): Promise<void> {
    if (!isNative) {
      console.log("[AppsFlyer] setCustomerUserId skipped (not native platform)");
      return;
    }

    if (!userId) {
      console.warn("[AppsFlyer] setCustomerUserId called with empty userId");
      return;
    }

    try {
      await AppsFlyerPlugin.setCustomerUserId({ userId });
      console.log("[AppsFlyer] customerUserId set:", userId);
    } catch (error) {
      console.error("[AppsFlyer] setCustomerUserId error:", error);
    }
  },

  /**
   * Log an in-app event to AppsFlyer.
   * Use snake_case event names for consistency with Mixpanel.
   *
   * Common events:
   * - app_opened
   * - signup_completed { method: 'email' | 'google' | 'apple' }
   * - onboarding_completed
   * - subscription_purchase_started { plan: string }
   * - subscription_purchase_success { plan: string, revenue: number, currency: string }
   * - subscription_purchase_failed { plan: string, error: string }
   *
   * @param eventName - Event name (use snake_case)
   * @param eventValues - Optional event parameters
   */
  async logEvent(eventName: string, eventValues: Record<string, any> = {}): Promise<void> {
    if (!isNative) {
      console.log(`[AppsFlyer] logEvent skipped (not native platform): ${eventName}`);
      return;
    }

    if (!eventName) {
      console.warn("[AppsFlyer] logEvent called with empty eventName");
      return;
    }

    try {
      await AppsFlyerPlugin.logEvent({ eventName, eventValues });
      console.log(`[AppsFlyer] Event logged: ${eventName}`, eventValues);
    } catch (error) {
      console.error("[AppsFlyer] logEvent error:", error);
    }
  },

  /**
   * Get the AppsFlyer unique device ID.
   * This can be useful for debugging or support requests.
   *
   * @returns The AppsFlyer UID or empty string if not available
   */
  async getAppsFlyerUID(): Promise<string> {
    if (!isNative) {
      console.log("[AppsFlyer] getAppsFlyerUID skipped (not native platform)");
      return "";
    }

    try {
      const result = await AppsFlyerPlugin.getAppsFlyerUID();
      return result.uid;
    } catch (error) {
      console.error("[AppsFlyer] getAppsFlyerUID error:", error);
      return "";
    }
  },
};

export default AppsFlyer;
