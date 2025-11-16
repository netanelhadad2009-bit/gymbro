/**
 * Barcode Lookup API
 * POST /api/barcode/lookup
 *
 * Looks up nutrition data for a barcode from cache or OpenFoodFacts
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { BarcodeProduct, Per100g, ProviderSource } from '@/types/barcode';
import { searchByBarcode as searchFatSecret } from '@/lib/clients/fatsecret';
import { lookupIsraelMoH, isIsraeliBarcode } from '@/lib/clients/israelMoH';

// Request validation
const lookupSchema = z.object({
  barcode: z.string().regex(/^[0-9]{7,14}$/, 'Invalid barcode format'),
});

// Validate EAN-13/EAN-8/UPC-A check digit
function validateBarcode(barcode: string): boolean {
  const digits = barcode.split('').map(Number);
  const len = digits.length;

  if (![8, 12, 13].includes(len)) return false;

  let sum = 0;
  for (let i = 0; i < len - 1; i++) {
    sum += digits[i] * ((i % 2 === 0) ? 1 : 3);
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[len - 1];
}

// Normalize OpenFoodFacts data - now returns partial data when nutrition is incomplete
function normalizeOpenFoodFactsData(offData: any): { product: BarcodeProduct | null; isPartial: boolean } {
  const product = offData.product;
  if (!product) {
    console.log('[BarcodeAPI] No product data in OFF response');
    return { product: null, isPartial: false };
  }

  // Get product name (prefer Hebrew)
  const name = product.product_name_he ||
               product.product_name_en ||
               product.product_name ||
               product.generic_name ||
               'Unknown Product';

  // Get brand
  const brand = product.brands_tags?.[0] ||
                product.brands ||
                undefined;

  console.log('[BarcodeAPI] Product found:', { name, brand });

  // Extract nutriments
  const nutriments = product.nutriments || {};

  // Get energy in kcal (convert from kJ if needed)
  let kcal = nutriments['energy-kcal_100g'] ||
             nutriments['energy-kcal'] ||
             0;

  if (!kcal && nutriments['energy-kj_100g']) {
    kcal = Math.round(nutriments['energy-kj_100g'] / 4.184);
  }

  // Get macros
  const protein_g = nutriments.proteins_100g || nutriments.proteins || 0;
  const carbs_g = nutriments.carbohydrates_100g || nutriments.carbohydrates || 0;
  const fat_g = nutriments.fat_100g || nutriments.fat || 0;

  // Optional nutrients
  const fiber_g = nutriments.fiber_100g || nutriments.fiber || undefined;
  const sugar_g = nutriments.sugars_100g || nutriments.sugars || undefined;
  const sodium_mg = nutriments.sodium_100g ? nutriments.sodium_100g * 1000 : undefined;

  console.log('[BarcodeAPI] Nutrition data:', { kcal, protein_g, carbs_g, fat_g });

  // Check if we have complete nutrition data
  const hasCompleteNutrition = kcal && (protein_g || carbs_g || fat_g);

  // Even if nutrition is incomplete, we can still return partial product info
  const per100g: Per100g | undefined = hasCompleteNutrition ? {
    kcal: Math.round(kcal || 0),
    protein_g: Math.round(protein_g * 10) / 10,
    carbs_g: Math.round(carbs_g * 10) / 10,
    fat_g: Math.round(fat_g * 10) / 10,
    ...(fiber_g !== undefined && { fiber_g: Math.round(fiber_g * 10) / 10 }),
    ...(sugar_g !== undefined && { sugar_g: Math.round(sugar_g * 10) / 10 }),
    ...(sodium_mg !== undefined && { sodium_mg: Math.round(sodium_mg) }),
  } : undefined;

  // Get image URL
  const imageUrl = product.image_url ||
                   product.image_front_url ||
                   product.image_small_url ||
                   undefined;

  // Return partial product info even without complete nutrition
  const productData: BarcodeProduct = {
    barcode: offData.code,
    name,
    brand,
    per100g: per100g || {
      kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
    },
    imageUrl,
    isPartial: !hasCompleteNutrition, // Flag to indicate partial data
  };

  return {
    product: productData,
    isPartial: !hasCompleteNutrition,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const { barcode } = lookupSchema.parse(body);
    console.log('[BarcodeAPI] Lookup request for barcode:', barcode);

    // Check if this is an Israeli barcode (729 prefix) - validate check digit
    const isIL = isIsraeliBarcode(barcode);

    if (!isIL && !validateBarcode(barcode)) {
      console.log('[BarcodeAPI] Invalid check digit:', barcode);
      return NextResponse.json(
        { ok: false, reason: 'bad_barcode' },
        { status: 400 }
      );
    } else if (isIL && !validateBarcode(barcode)) {
      console.log('[BarcodeAPI] Israeli barcode with invalid check digit (bypassing):', barcode);
    }

    const supabase = await createClient();

    // Check if user is authenticated (optional for scan history)
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    // Check cache first (24 hour TTL, including "not found" records)
    console.log('[BarcodeAPI] Checking cache for:', barcode);
    const { data: cached } = await supabase
      .from('food_cache')
      .select('*')
      .eq('barcode', barcode)
      .gt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (cached) {
      console.log('[BarcodeAPI] Cache hit:', barcode, cached.source);

      // Check if this is a "not found" record
      if (cached.source === 'not_found') {
        console.log('[BarcodeAPI] Product was previously not found:', barcode);
        return NextResponse.json(
          { ok: false, reason: 'not_found', cached: true },
          { status: 404 }
        );
      }

      const product: BarcodeProduct = {
        barcode: cached.barcode,
        name: cached.name,
        brand: cached.brand,
        per100g: cached.per100g as Per100g,
        imageUrl: cached.image_url,
        source: 'cache',
        isPartial: cached.is_partial || false,
      };

      // Log to scan history if authenticated
      if (userId) {
        await supabase
          .from('scan_history')
          .insert({
            user_id: userId,
            barcode: cached.barcode,
            product_name: cached.name,
            brand: cached.brand,
          });
      }

      return NextResponse.json(
        { ok: true, product },
        {
          headers: {
            'Cache-Control': 's-maxage=300, stale-while-revalidate=86400'
          }
        }
      );
    }

    console.log('[BarcodeAPI] Cache miss, checking providers');

    // Check for community barcode alias first (especially for Israeli barcodes)
    const byIL = isIsraeliBarcode(barcode);

    if (byIL) {
      console.log('[Alias] Checking for barcode alias:', barcode);
      const { data: alias } = await supabase
        .from('barcode_aliases')
        .select(`
          moh_food_id,
          israel_moh_foods (
            id,
            name_he,
            name_en,
            brand,
            calories_per_100g,
            protein_g_per_100g,
            carbs_g_per_100g,
            fat_g_per_100g,
            sugars_g_per_100g,
            sodium_mg_per_100g,
            fiber_g_per_100g,
            is_partial,
            dataset_version
          )
        `)
        .eq('barcode', barcode)
        .single();

      if (alias && alias.israel_moh_foods) {
        const food = Array.isArray(alias.israel_moh_foods)
          ? alias.israel_moh_foods[0]
          : alias.israel_moh_foods;

        console.log('[Alias] Found alias mapping to:', food.name_he);

        const product: BarcodeProduct = {
          barcode,
          name: food.name_he || food.name_en || 'Unknown Product',
          name_he: food.name_he,
          brand: food.brand || undefined,
          per100g: {
            kcal: Math.round(food.calories_per_100g || 0),
            protein_g: Math.round((food.protein_g_per_100g || 0) * 10) / 10,
            carbs_g: Math.round((food.carbs_g_per_100g || 0) * 10) / 10,
            fat_g: Math.round((food.fat_g_per_100g || 0) * 10) / 10,
            ...(food.fiber_g_per_100g && {
              fiber_g: Math.round(food.fiber_g_per_100g * 10) / 10
            }),
            ...(food.sugars_g_per_100g && {
              sugar_g: Math.round(food.sugars_g_per_100g * 10) / 10
            }),
            ...(food.sodium_mg_per_100g && {
              sodium_mg: Math.round(food.sodium_mg_per_100g)
            }),
          },
          source: 'israel_moh',
          isPartial: food.is_partial || false,
          matchMeta: {
            matchedBy: 'barcode',
            datasetVersion: food.dataset_version || undefined,
            publisher: 'data.gov.il (community alias)',
          },
        };

        // Cache the result
        await supabase
          .from('food_cache')
          .upsert({
            barcode,
            name: product.name_he || product.name,
            brand: product.brand || null,
            per100g: product.per100g,
            image_url: null,
            source: 'israel_moh',
            is_partial: product.isPartial || false,
            updated_at: new Date().toISOString(),
          });

        // Log to scan history if authenticated
        if (userId) {
          await supabase
            .from('scan_history')
            .insert({
              user_id: userId,
              barcode,
              product_name: product.name_he || product.name,
              brand: product.brand || null,
            });
        }

        return NextResponse.json(
          { ok: true, product },
          {
            headers: {
              'Cache-Control': 's-maxage=300, stale-while-revalidate=86400'
            }
          }
        );
      } else {
        console.log('[Alias] No alias found for barcode:', barcode);
      }
    }

    // Determine provider order based on barcode prefix
    const providers: ProviderSource[] = byIL
      ? ['israel_moh', 'off', 'fatsecret']
      : ['off', 'fatsecret', 'israel_moh'];

    console.log(`[BarcodeAPI] Provider order for ${byIL ? 'Israeli' : 'international'} barcode:`, providers);

    // Try each provider in order
    for (const provider of providers) {
      let product: BarcodeProduct | null = null;
      let providerSource: ProviderSource = provider;

      try {
        if (provider === 'israel_moh') {
          console.log('[BarcodeAPI] Trying Israeli MoH provider');
          product = await lookupIsraelMoH(barcode);
          if (product) {
            console.log('[BarcodeAPI] Israeli MoH found product:', product.name);
          }
        } else if (provider === 'off') {
          console.log('[BarcodeAPI] Trying Open Food Facts');
          product = await fetchFromOpenFoodFacts(barcode);
          if (product) {
            console.log('[BarcodeAPI] OFF found product:', product.name);
            providerSource = 'off';
          }
        } else if (provider === 'fatsecret') {
          console.log('[BarcodeAPI] Trying FatSecret');
          product = await searchFatSecret(barcode);
          if (product) {
            console.log('[BarcodeAPI] FatSecret found product:', product.name);
            providerSource = 'fatsecret';
          }
        }

        // If provider found a product, cache it and return
        if (product) {
          console.log(`[BarcodeAPI] Success with ${provider}:`, product.name);

          // Cache the result
          await supabase
            .from('food_cache')
            .upsert({
              barcode: product.barcode || barcode,
              name: product.name_he || product.name,
              brand: product.brand,
              per100g: product.per100g,
              image_url: product.imageUrl,
              source: providerSource,
              is_partial: product.isPartial || false,
              updated_at: new Date().toISOString(),
            });

          // Log to scan history if authenticated
          if (userId) {
            await supabase
              .from('scan_history')
              .insert({
                user_id: userId,
                barcode: product.barcode || barcode,
                product_name: product.name_he || product.name,
                brand: product.brand,
              });
          }

          return NextResponse.json(
            { ok: true, product: { ...product, source: providerSource } },
            {
              headers: {
                'Cache-Control': 's-maxage=300, stale-while-revalidate=86400'
              }
            }
          );
        }
      } catch (error) {
        console.error(`[BarcodeAPI] ${provider} error:`, error);
        // Continue to next provider
      }
    }

    // All providers failed - store "not found" in cache
    console.log('[BarcodeAPI] Product not found in any provider');
    await supabase
      .from('food_cache')
      .upsert({
        barcode,
        name: 'Product Not Found',
        brand: null,
        per100g: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
        image_url: null,
        source: 'not_found',
        is_partial: false,
        updated_at: new Date().toISOString(),
      });

    return NextResponse.json(
      { ok: false, reason: 'not_found' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('[BarcodeAPI] Error:', error);

    if (error.name === 'AbortError') {
      return NextResponse.json(
        { ok: false, reason: 'network' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { ok: false, reason: 'network' },
      { status: 500 }
    );
  }
}

/**
 * Fetch product from Open Food Facts API
 */
async function fetchFromOpenFoodFacts(barcode: string): Promise<BarcodeProduct | null> {
  try {
    const offResponse = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      {
        headers: {
          'User-Agent': 'FitJourney/1.0 (https://fitjourney.app)',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      }
    );

    if (!offResponse.ok) {
      if (offResponse.status === 404) {
        console.log('[BarcodeAPI] Product not found in OFF (404)');
        return null;
      }
      throw new Error(`OpenFoodFacts API error: ${offResponse.status}`);
    }

    const offData = await offResponse.json();

    if (offData.status === 0) {
      console.log('[BarcodeAPI] Product not found in OFF (status 0)');
      return null;
    }

    // Normalize the data
    const { product, isPartial } = normalizeOpenFoodFactsData(offData);

    if (!product) {
      console.log('[BarcodeAPI] Could not extract product data from OFF');
      return null;
    }

    return { ...product, source: 'off', isPartial };
  } catch (error: any) {
    console.error('[BarcodeAPI] OFF fetch error:', error);
    return null;
  }
}