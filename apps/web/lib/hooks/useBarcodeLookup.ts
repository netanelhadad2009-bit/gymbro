/**
 * useBarcodeLookup Hook
 * Manages barcode product lookups with caching
 */

import { useState, useCallback, useRef } from 'react';
import type { BarcodeProduct, BarcodeError } from '@/types/barcode';

// Discriminated union for lookup results
export type LookupOk = {
  ok: true;
  product: BarcodeProduct;
  fromCache: boolean;
};

export type LookupErr = {
  ok: false;
  reason: 'invalid' | 'not_found' | 'partial' | 'network' | 'bad_barcode' | 'unknown';
  message?: string;  // human readable
  status?: number;   // HTTP status if relevant
};

export type LookupResult = LookupOk | LookupErr;

interface CacheEntry {
  product: BarcodeProduct;
  timestamp: number;
}

interface LookupState {
  isLoading: boolean;
  error: BarcodeError | null;
  product: BarcodeProduct | null;
}

export function useBarcodeLookup() {
  const [state, setState] = useState<LookupState>({
    isLoading: false,
    error: null,
    product: null,
  });

  // In-memory LRU cache (max 50 items, 15 minutes TTL)
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const pendingRef = useRef<Map<string, Promise<BarcodeProduct>>>(new Map());

  const lookup = useCallback(async (barcode: string): Promise<LookupResult> => {
    console.log('[BarcodeLookup] Start lookup:', barcode);
    const startTime = Date.now();

    // Clean and validate barcode
    const cleaned = barcode.replace(/\D/g, '');
    if (cleaned.length < 8 || cleaned.length > 14) {
      console.log('[BarcodeLookup] Invalid barcode length:', cleaned.length);
      setState({
        isLoading: false,
        error: 'bad_barcode',
        product: null,
      });
      return { ok: false, reason: 'invalid', message: 'Invalid barcode length' };
    }

    // Check cache first
    const cached = cacheRef.current.get(cleaned);
    if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) {
      console.log('[BarcodeLookup] Memory cache hit:', cleaned);
      setState({
        isLoading: false,
        error: null,
        product: cached.product,
      });
      return { ok: true, product: cached.product, fromCache: true };
    }

    // Check if already fetching
    const pending = pendingRef.current.get(cleaned);
    if (pending) {
      console.log('[BarcodeLookup] Waiting for pending request:', cleaned);
      try {
        const product = await pending;
        setState({
          isLoading: false,
          error: null,
          product,
        });
        return { ok: true, product, fromCache: false };
      } catch (err) {
        setState({
          isLoading: false,
          error: 'network' as BarcodeError,
          product: null,
        });
        return { ok: false, reason: 'network', message: 'Network error' };
      }
    }

    setState({
      isLoading: true,
      error: null,
      product: null,
    });

    // Create fetch promise
    const fetchPromise = fetch('/api/barcode/lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ barcode: cleaned }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          if (res.status === 404 || data?.reason === 'not_found') {
            throw { type: 'not_found', status: 404 };
          }
          if (res.status === 400 || data?.reason === 'bad_barcode') {
            throw { type: 'bad_barcode', status: 400 };
          }
          throw { type: 'network', status: res.status };
        }

        if (!data?.ok || !data?.product) {
          // API may return ok:false with reason
          if (data?.reason === 'partial' || data?.product?.isPartial) {
            throw { type: 'partial', product: data?.product };
          }
          if (data?.reason === 'not_found') {
            throw { type: 'not_found' };
          }
          throw { type: 'unknown' };
        }

        return data.product as BarcodeProduct;
      })
      .finally(() => {
        pendingRef.current.delete(cleaned);
      });

    // Store pending promise
    pendingRef.current.set(cleaned, fetchPromise);

    try {
      const product = await fetchPromise;

      // Update cache (LRU eviction if > 50 items)
      if (cacheRef.current.size >= 50) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) {
          cacheRef.current.delete(firstKey);
        }
      }

      cacheRef.current.set(cleaned, {
        product,
        timestamp: Date.now(),
      });

      // Ensure minimum 300ms feedback time
      const elapsed = Date.now() - startTime;
      if (elapsed < 300) {
        await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
      }

      setState({
        isLoading: false,
        error: null,
        product,
      });

      console.log('[BarcodeLookup] Success:', cleaned, product.name);
      return { ok: true, product, fromCache: false };

    } catch (err: any) {
      console.log('[BarcodeLookup] Lookup failed:', cleaned, err);

      let errorType: LookupErr['reason'] = 'unknown';
      let message = 'Lookup failed';

      if (err?.type === 'not_found') {
        errorType = 'not_found';
        message = 'Product not found';
      } else if (err?.type === 'bad_barcode') {
        errorType = 'bad_barcode';
        message = 'Invalid barcode';
      } else if (err?.type === 'partial') {
        errorType = 'partial';
        message = 'Partial product data';
      } else if (err?.type === 'network') {
        errorType = 'network';
        message = 'Network error';
      }

      // Ensure minimum 300ms feedback time
      const elapsed = Date.now() - startTime;
      if (elapsed < 300) {
        await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
      }

      setState({
        isLoading: false,
        error: errorType as BarcodeError,
        product: null,
      });

      return {
        ok: false,
        reason: errorType,
        message,
        status: err?.status,
      };
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      product: null,
    });
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    console.log('[BarcodeLookup] Cache cleared');
  }, []);

  return {
    ...state,
    lookup,
    reset,
    clearCache,
  };
}