/**
 * Apple IAP / StoreKit Purchase Module
 *
 * Handles real Apple In-App Purchase subscriptions using cordova-plugin-purchase.
 * Product IDs:
 * - com.fitjourney.app.premium.monthly
 * - com.fitjourney.app.premium.yearly
 *
 * IMPORTANT: cordova-plugin-purchase adds CdvPurchase to window only AFTER
 * the 'deviceready' event fires. We must wait for that before accessing the store.
 */

import { Capacitor } from '@capacitor/core';

// Type declarations for cordova-plugin-purchase
declare global {
  interface Window {
    CdvPurchase?: any;
  }
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
let deviceReadyFired = false;
let cdvPurchaseReadyPromise: Promise<boolean> | null = null;

/**
 * Wait for CdvPurchase to be available
 * This waits for the deviceready event and then checks for CdvPurchase.store
 * @param timeoutMs - Maximum time to wait (default 10 seconds)
 */
function waitForCdvPurchase(timeoutMs: number = 10000): Promise<boolean> {
  // Return existing promise if already waiting
  if (cdvPurchaseReadyPromise) {
    return cdvPurchaseReadyPromise;
  }

  cdvPurchaseReadyPromise = new Promise((resolve) => {
    // Not in browser or not native platform
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.log('[PremiumPurchase] Not in browser environment');
      resolve(false);
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      console.log('[PremiumPurchase] Not on native platform (web browser)');
      resolve(false);
      return;
    }

    // Check if CdvPurchase is already available
    if (window.CdvPurchase?.store) {
      console.log('[PremiumPurchase] CdvPurchase.store already available');
      deviceReadyFired = true;
      resolve(true);
      return;
    }

    console.log('[PremiumPurchase] Waiting for CdvPurchase.store to become available...');

    const startTime = Date.now();

    // Handler for when deviceready fires
    const onDeviceReady = () => {
      console.log('[PremiumPurchase] deviceready event fired');
      deviceReadyFired = true;
      checkForStore();
    };

    // Poll for CdvPurchase.store
    const checkForStore = () => {
      if (window.CdvPurchase?.store) {
        console.log('[PremiumPurchase] CdvPurchase.store is now available');
        cleanup();
        resolve(true);
        return;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs) {
        console.error('[PremiumPurchase] Timeout waiting for CdvPurchase.store after', elapsed, 'ms');
        console.error('[PremiumPurchase] deviceready fired:', deviceReadyFired);
        console.error('[PremiumPurchase] window.CdvPurchase:', typeof window.CdvPurchase);
        cleanup();
        resolve(false);
        return;
      }

      // Keep polling
      setTimeout(checkForStore, 100);
    };

    const cleanup = () => {
      document.removeEventListener('deviceready', onDeviceReady);
    };

    // Listen for deviceready
    document.addEventListener('deviceready', onDeviceReady, false);

    // If deviceready already fired, start checking immediately
    // (deviceready might have fired before we added the listener)
    if (deviceReadyFired || (window as any).cordova) {
      console.log('[PremiumPurchase] Cordova detected, starting store check');
      checkForStore();
    }

    // Also start a fallback check in case deviceready already fired
    setTimeout(() => {
      if (!deviceReadyFired) {
        console.log('[PremiumPurchase] Starting fallback store check (deviceready may have already fired)');
        checkForStore();
      }
    }, 100);
  });

  return cdvPurchaseReadyPromise;
}

/**
 * Get the CdvPurchase store instance
 * Returns null if not available yet
 */
function getStoreSync(): any | null {
  if (typeof window === 'undefined') return null;
  return window.CdvPurchase?.store ?? null;
}

/**
 * Initialize the IAP store with product registration
 * Must be called after deviceready and before any purchase attempts
 * Idempotent: safe to call multiple times
 */
export async function initializeStore(): Promise<boolean> {
  console.log('[PremiumPurchase] initializeStore() called');

  // Already initialized
  if (storeInitialized) {
    console.log('[PremiumPurchase] Store already initialized, returning true');
    return true;
  }

  // Currently initializing - wait for it
  if (storeInitializing) {
    console.log('[PremiumPurchase] Store initialization already in progress, waiting...');
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (storeInitialized) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (!storeInitializing) {
          // Initialization failed
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
      // Timeout after 15 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(storeInitialized);
      }, 15000);
    });
  }

  storeInitializing = true;

  // Wait for CdvPurchase to be available
  console.log('[PremiumPurchase] Waiting for CdvPurchase...');
  const cdvReady = await waitForCdvPurchase(10000);

  if (!cdvReady) {
    console.error('[PremiumPurchase] CdvPurchase not available after waiting');
    storeInitializing = false;
    return false;
  }

  const CdvPurchase = window.CdvPurchase;
  const store = CdvPurchase?.store;

  if (!store) {
    console.error('[PremiumPurchase] CdvPurchase.store still missing after deviceready');
    storeInitializing = false;
    return false;
  }

  try {
    console.log('[PremiumPurchase] Registering products...');
    console.log('[PremiumPurchase] - Monthly:', PRODUCT_IDS.monthly);
    console.log('[PremiumPurchase] - Yearly:', PRODUCT_IDS.yearly);

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

    console.log('[PremiumPurchase] Products registered');

    // Set up transaction event handlers
    store.when()
      .approved((transaction: any) => {
        console.log('[PremiumPurchase] Transaction APPROVED:', transaction.transactionId);
        // Verify with server and finish
        transaction.verify();
      })
      .verified((receipt: any) => {
        console.log('[PremiumPurchase] Receipt VERIFIED:', receipt.id);
        receipt.finish();
      })
      .finished((transaction: any) => {
        console.log('[PremiumPurchase] Transaction FINISHED:', transaction.transactionId);
      })
      .receiptUpdated((receipt: any) => {
        console.log('[PremiumPurchase] Receipt updated');
      });

    // Handle errors
    store.error((error: any) => {
      console.error('[PremiumPurchase] Store ERROR:', error.code, error.message);
    });

    console.log('[PremiumPurchase] Event handlers registered');

    // Initialize the store with Apple App Store platform
    console.log('[PremiumPurchase] Calling store.initialize([APPLE_APPSTORE])...');
    await store.initialize([CdvPurchase.Platform.APPLE_APPSTORE]);
    console.log('[PremiumPurchase] store.initialize() completed');

    // Refresh products from App Store
    console.log('[PremiumPurchase] Calling store.update() to refresh products...');
    await store.update();
    console.log('[PremiumPurchase] store.update() completed');

    // Debug: Log all loaded products
    const monthlyProduct = store.get(PRODUCT_IDS.monthly);
    const yearlyProduct = store.get(PRODUCT_IDS.yearly);
    console.log('[PremiumPurchase] Products loaded from App Store:');
    console.log('[PremiumPurchase] - Monthly:', monthlyProduct ? {
      id: monthlyProduct.id,
      title: monthlyProduct.title,
      price: monthlyProduct.pricing?.price,
      valid: monthlyProduct.valid,
    } : 'NOT FOUND');
    console.log('[PremiumPurchase] - Yearly:', yearlyProduct ? {
      id: yearlyProduct.id,
      title: yearlyProduct.title,
      price: yearlyProduct.pricing?.price,
      valid: yearlyProduct.valid,
    } : 'NOT FOUND');

    // List all products in the store
    const allProducts = store.products;
    console.log('[PremiumPurchase] All products in store:', allProducts?.length || 0);
    if (allProducts?.length > 0) {
      allProducts.forEach((p: any) => {
        console.log('[PremiumPurchase] Product:', p.id, p.title, p.pricing?.price);
      });
    }

    storeInitialized = true;
    storeInitializing = false;
    console.log('[PremiumPurchase] Store initialization COMPLETE');

    return true;
  } catch (error: any) {
    console.error('[PremiumPurchase] Store initialization FAILED:', error?.message || error);
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
  console.log('[PremiumPurchase] purchaseAppleSubscription() called for:', productId);

  // Check if we're on a native platform
  if (!Capacitor.isNativePlatform()) {
    console.log('[PremiumPurchase] Not on native platform, cannot purchase');
    return {
      success: false,
      error: 'הרכישה זמינה רק באפליקציה המותקנת מה-App Store',
    };
  }

  // Wait for CdvPurchase to be ready
  console.log('[PremiumPurchase] Waiting for CdvPurchase to be ready...');
  const cdvReady = await waitForCdvPurchase(10000);

  if (!cdvReady) {
    console.error('[PremiumPurchase] CdvPurchase not available after waiting');
    return {
      success: false,
      error: 'שירות הרכישות עדיין נטען. נסה שוב בעוד מספר שניות.',
    };
  }

  // Ensure store is initialized
  console.log('[PremiumPurchase] Ensuring store is initialized...');
  const initialized = await initializeStore();
  if (!initialized) {
    console.error('[PremiumPurchase] Failed to initialize store');
    return {
      success: false,
      error: 'שירות הרכישות לא זמין כרגע. נסה שוב מאוחר יותר.',
    };
  }

  const CdvPurchase = window.CdvPurchase;
  const store = CdvPurchase?.store;

  if (!store) {
    console.error('[PremiumPurchase] Store is null after initialization');
    return {
      success: false,
      error: 'שירות הרכישות לא זמין כרגע. נסה שוב מאוחר יותר.',
    };
  }

  try {
    // Get the product
    console.log('[PremiumPurchase] Getting product:', productId);
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
      canPurchase: product.canPurchase,
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

    console.log('[PremiumPurchase] Offer found, initiating order...');

    // Create a promise that resolves when the transaction completes
    return new Promise((resolve) => {
      let resolved = false;

      // Set up one-time handlers for this purchase
      const handleFinished = (transaction: any) => {
        if (resolved) return;
        const hasProduct = transaction.products?.some((p: any) => p.id === productId);
        if (hasProduct) {
          resolved = true;
          console.log('[PremiumPurchase] Purchase COMPLETED successfully:', transaction.transactionId);
          resolve({
            success: true,
            transactionId: transaction.transactionId,
            productId: productId,
          });
        }
      };

      const handleCancelled = (transaction: any) => {
        if (resolved) return;
        const hasProduct = transaction.products?.some((p: any) => p.id === productId);
        if (hasProduct) {
          resolved = true;
          console.log('[PremiumPurchase] Purchase CANCELLED by user');
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
      console.log('[PremiumPurchase] Calling offer.order()...');
      offer.order()
        .then(() => {
          console.log('[PremiumPurchase] offer.order() promise resolved - purchase dialog should be showing');
        })
        .catch((error: any) => {
          if (resolved) return;
          resolved = true;

          console.error('[PremiumPurchase] offer.order() FAILED:', error?.code, error?.message);

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
        console.error('[PremiumPurchase] Purchase TIMEOUT after 2 minutes');
        resolve({
          success: false,
          error: 'הרכישה נכשלה (timeout). נסה שוב.',
        });
      }, 120000);
    });

  } catch (error: any) {
    console.error('[PremiumPurchase] Purchase error:', error?.message || error);
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
  console.log('[PremiumPurchase] restorePurchases() called');

  if (!Capacitor.isNativePlatform()) {
    return {
      success: false,
      error: 'שחזור רכישות זמין רק באפליקציה המותקנת',
    };
  }

  const cdvReady = await waitForCdvPurchase(10000);
  if (!cdvReady) {
    return {
      success: false,
      error: 'שירות הרכישות עדיין נטען. נסה שוב בעוד מספר שניות.',
    };
  }

  const initialized = await initializeStore();
  if (!initialized) {
    return {
      success: false,
      error: 'שירות הרכישות לא זמין',
    };
  }

  const store = getStoreSync();
  if (!store) {
    return {
      success: false,
      error: 'שירות הרכישות לא זמין',
    };
  }

  try {
    console.log('[PremiumPurchase] Calling store.restorePurchases()...');
    await store.restorePurchases();
    console.log('[PremiumPurchase] Restore purchases completed');
    return {
      success: true,
    };
  } catch (error: any) {
    console.error('[PremiumPurchase] Restore failed:', error?.message || error);
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
  const store = getStoreSync();
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
  const cdvReady = await waitForCdvPurchase(10000);
  if (!cdvReady) {
    return { monthly: null, yearly: null };
  }

  await initializeStore();

  const store = getStoreSync();
  if (!store) {
    return { monthly: null, yearly: null };
  }

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
