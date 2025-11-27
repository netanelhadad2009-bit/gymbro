/**
 * Apple IAP / StoreKit Purchase Module
 *
 * Handles real Apple In-App Purchase subscriptions using cordova-plugin-purchase.
 * Product IDs:
 * - com.fitjourney.app.premium.monthly
 * - com.fitjourney.app.premium.yearly
 */

import { Capacitor } from '@capacitor/core';

// Type declarations for cordova-plugin-purchase
declare global {
  interface Window {
    CdvPurchase?: any;
  }
}

// CdvPurchase types (simplified for our usage)
declare namespace CdvPurchase {
  const store: {
    register: (products: any[]) => void;
    when: () => {
      approved: (fn: (t: any) => void) => ReturnType<typeof store.when>;
      verified: (fn: (r: any) => void) => ReturnType<typeof store.when>;
      finished: (fn: (t: any) => void) => ReturnType<typeof store.when>;
      cancelled: (fn: (t: any) => void) => ReturnType<typeof store.when>;
      receiptUpdated: (fn: (r: any) => void) => ReturnType<typeof store.when>;
    };
    error: (fn: (e: any) => void) => void;
    initialize: (platforms: any[]) => Promise<void>;
    update: () => Promise<void>;
    get: (id: string) => any;
    restorePurchases: () => Promise<void>;
  };
  const ProductType: {
    PAID_SUBSCRIPTION: string;
  };
  const Platform: {
    APPLE_APPSTORE: string;
  };
  const ErrorCode: {
    PAYMENT_CANCELLED: number;
    PAYMENT_NOT_ALLOWED: number;
    PRODUCT_NOT_AVAILABLE: number;
  };
}

// Product IDs from App Store Connect
export const PRODUCT_IDS = {
  monthly: 'com.fitjourney.app.premium.monthly',
  yearly: 'com.fitjourney.app.premium.yearly',
} as const;

export type PlanType = keyof typeof PRODUCT_IDS;

// Purchase result types
export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  productId?: string;
  error?: string;
}

// Store state
let storeInitialized = false;
let storeInitializing = false;

/**
 * Get the CdvPurchase store instance
 * Only available on native platforms
 */
function getStore(): typeof CdvPurchase.store | null {
  if (typeof window === 'undefined') return null;
  if (!Capacitor.isNativePlatform()) return null;

  // CdvPurchase is added to window by cordova-plugin-purchase
  const cdvPurchase = (window as any).CdvPurchase;
  if (!cdvPurchase?.store) {
    console.warn('[PremiumPurchase] CdvPurchase.store not available');
    return null;
  }

  return cdvPurchase.store;
}

/**
 * Initialize the IAP store with product registration
 * Must be called before any purchase attempts
 */
export async function initializeStore(): Promise<boolean> {
  console.log('[PremiumPurchase] initializeStore called');

  if (storeInitialized) {
    console.log('[PremiumPurchase] Store already initialized');
    return true;
  }

  if (storeInitializing) {
    console.log('[PremiumPurchase] Store initialization in progress, waiting...');
    // Wait for initialization to complete
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (storeInitialized) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(storeInitialized);
      }, 10000);
    });
  }

  storeInitializing = true;

  const store = getStore();
  if (!store) {
    console.log('[PremiumPurchase] Store not available (not on native platform)');
    storeInitializing = false;
    return false;
  }

  const CdvPurchase = (window as any).CdvPurchase;

  try {
    console.log('[PremiumPurchase] Registering products...');

    // Register subscription products
    store.register([
      {
        id: PRODUCT_IDS.monthly,
        type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
        platform: CdvPurchase.Platform.APPLE_APPSTORE,
      },
      {
        id: PRODUCT_IDS.yearly,
        type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
        platform: CdvPurchase.Platform.APPLE_APPSTORE,
      },
    ]);

    // Set up transaction event handlers
    store.when()
      .approved((transaction: any) => {
        console.log('[PremiumPurchase] Transaction approved:', transaction.transactionId);
        // Verify with server and finish
        transaction.verify();
      })
      .verified((receipt: any) => {
        console.log('[PremiumPurchase] Receipt verified:', receipt.id);
        receipt.finish();
      })
      .finished((transaction: any) => {
        console.log('[PremiumPurchase] Transaction finished:', transaction.transactionId);
      })
      .receiptUpdated((receipt: any) => {
        console.log('[PremiumPurchase] Receipt updated');
      });

    // Handle errors
    store.error((error: any) => {
      console.error('[PremiumPurchase] Store error:', error.code, error.message);
    });

    // Initialize the store
    console.log('[PremiumPurchase] Initializing store...');
    await store.initialize([CdvPurchase.Platform.APPLE_APPSTORE]);

    // Refresh products
    console.log('[PremiumPurchase] Refreshing products...');
    await store.update();

    storeInitialized = true;
    storeInitializing = false;
    console.log('[PremiumPurchase] Store initialization complete');

    return true;
  } catch (error: any) {
    console.error('[PremiumPurchase] Store initialization failed:', error);
    storeInitializing = false;
    return false;
  }
}

/**
 * Purchase an Apple subscription
 *
 * @param plan - 'monthly' or 'yearly'
 * @returns PurchaseResult with success status and transaction details
 */
export async function purchaseAppleSubscription(plan: PlanType): Promise<PurchaseResult> {
  const productId = PRODUCT_IDS[plan];
  console.log('[PremiumPurchase] Starting purchase for:', productId);

  // Check if we're on a native platform
  if (!Capacitor.isNativePlatform()) {
    console.log('[PremiumPurchase] Not on native platform, cannot purchase');
    return {
      success: false,
      error: 'הרכישה זמינה רק באפליקציה המותקנת מה-App Store',
    };
  }

  const store = getStore();
  if (!store) {
    console.error('[PremiumPurchase] Store not available');
    return {
      success: false,
      error: 'שירות הרכישות לא זמין כרגע. נסה שוב מאוחר יותר.',
    };
  }

  // Ensure store is initialized
  const initialized = await initializeStore();
  if (!initialized) {
    console.error('[PremiumPurchase] Failed to initialize store');
    return {
      success: false,
      error: 'שירות הרכישות לא זמין כרגע. נסה שוב מאוחר יותר.',
    };
  }

  try {
    // Get the product
    const product = store.get(productId);

    if (!product) {
      console.error('[PremiumPurchase] Product not found:', productId);
      return {
        success: false,
        error: 'המוצר לא נמצא. נסה שוב מאוחר יותר.',
      };
    }

    console.log('[PremiumPurchase] Product found:', {
      id: product.id,
      title: product.title,
      pricing: product.pricing?.price,
    });

    // Get the offer (subscription offer)
    const offer = product.getOffer();
    if (!offer) {
      console.error('[PremiumPurchase] No offer available for product');
      return {
        success: false,
        error: 'המוצר לא זמין לרכישה כרגע.',
      };
    }

    console.log('[PremiumPurchase] Initiating order...');

    // Create a promise that resolves when the transaction completes
    return new Promise((resolve) => {
      const CdvPurchase = (window as any).CdvPurchase;
      let resolved = false;

      // Set up one-time handlers for this purchase
      const handleFinished = (transaction: any) => {
        if (resolved) return;
        if (transaction.products.some((p: any) => p.id === productId)) {
          resolved = true;
          console.log('[PremiumPurchase] Purchase completed successfully:', transaction.transactionId);
          resolve({
            success: true,
            transactionId: transaction.transactionId,
            productId: productId,
          });
        }
      };

      const handleCancelled = (transaction: any) => {
        if (resolved) return;
        if (transaction.products.some((p: any) => p.id === productId)) {
          resolved = true;
          console.log('[PremiumPurchase] Purchase cancelled by user');
          resolve({
            success: false,
            error: 'הרכישה בוטלה',
          });
        }
      };

      // Listen for transaction events
      store.when()
        .finished(handleFinished)
        .cancelled(handleCancelled);

      // Initiate the purchase
      offer.order()
        .then(() => {
          console.log('[PremiumPurchase] Order initiated successfully');
        })
        .catch((error: any) => {
          if (resolved) return;
          resolved = true;

          console.error('[PremiumPurchase] Order failed:', error);

          // Handle specific error codes
          let errorMessage = 'אירעה שגיאה בביצוע הרכישה. נסה שוב.';

          if (error?.code === CdvPurchase.ErrorCode.PAYMENT_CANCELLED) {
            errorMessage = 'הרכישה בוטלה';
          } else if (error?.code === CdvPurchase.ErrorCode.PAYMENT_NOT_ALLOWED) {
            errorMessage = 'רכישות אינן מורשות במכשיר זה';
          } else if (error?.code === CdvPurchase.ErrorCode.PRODUCT_NOT_AVAILABLE) {
            errorMessage = 'המוצר אינו זמין לרכישה';
          }

          resolve({
            success: false,
            error: errorMessage,
          });
        });

      // Timeout after 2 minutes
      setTimeout(() => {
        if (resolved) return;
        resolved = true;
        console.error('[PremiumPurchase] Purchase timed out');
        resolve({
          success: false,
          error: 'הרכישה נכשלה (timeout). נסה שוב.',
        });
      }, 120000);
    });

  } catch (error: any) {
    console.error('[PremiumPurchase] Purchase error:', error);
    return {
      success: false,
      error: error?.message || 'אירעה שגיאה בביצוע הרכישה',
    };
  }
}

/**
 * Restore previous purchases
 * Useful when user reinstalls the app or uses a new device
 */
export async function restorePurchases(): Promise<PurchaseResult> {
  console.log('[PremiumPurchase] Restoring purchases...');

  if (!Capacitor.isNativePlatform()) {
    return {
      success: false,
      error: 'שחזור רכישות זמין רק באפליקציה המותקנת',
    };
  }

  const store = getStore();
  if (!store) {
    return {
      success: false,
      error: 'שירות הרכישות לא זמין',
    };
  }

  const initialized = await initializeStore();
  if (!initialized) {
    return {
      success: false,
      error: 'שירות הרכישות לא זמין',
    };
  }

  try {
    await store.restorePurchases();
    console.log('[PremiumPurchase] Restore completed');
    return {
      success: true,
    };
  } catch (error: any) {
    console.error('[PremiumPurchase] Restore failed:', error);
    return {
      success: false,
      error: error?.message || 'שחזור הרכישות נכשל',
    };
  }
}

/**
 * Check if user has an active subscription
 * Uses local store data (for quick checks)
 */
export function hasActiveSubscription(): boolean {
  const store = getStore();
  if (!store) return false;

  const monthlyProduct = store.get(PRODUCT_IDS.monthly);
  const yearlyProduct = store.get(PRODUCT_IDS.yearly);

  return (
    monthlyProduct?.owned === true ||
    yearlyProduct?.owned === true
  );
}

/**
 * Get product pricing info for display
 */
export async function getProductPricing(): Promise<{
  monthly: { price: string; currency: string } | null;
  yearly: { price: string; currency: string } | null;
}> {
  const store = getStore();
  if (!store) {
    return { monthly: null, yearly: null };
  }

  await initializeStore();

  const monthlyProduct = store.get(PRODUCT_IDS.monthly);
  const yearlyProduct = store.get(PRODUCT_IDS.yearly);

  return {
    monthly: monthlyProduct?.pricing ? {
      price: monthlyProduct.pricing.price,
      currency: monthlyProduct.pricing.currency,
    } : null,
    yearly: yearlyProduct?.pricing ? {
      price: yearlyProduct.pricing.price,
      currency: yearlyProduct.pricing.currency,
    } : null,
  };
}
