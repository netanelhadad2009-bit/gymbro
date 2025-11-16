/**
 * FatSecret API Client
 * Implements OAuth2 Client Credentials flow and barcode product lookup
 * Docs: https://platform.fatsecret.com/api/Default.aspx?screen=rapih
 */

import type { BarcodeProduct, Per100g } from '@/types/barcode';

// Token cache (in-memory, 50 min TTL per FatSecret docs)
interface TokenCache {
  access_token: string;
  expires_at: number; // timestamp in ms
}

let tokenCache: TokenCache | null = null;

/**
 * Get FatSecret OAuth2 access token using client credentials flow
 * Caches token for 50 minutes
 */
async function getFatSecretToken(): Promise<string> {
  const clientId = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[FatSecret] Missing credentials in environment');
    throw new Error('FatSecret credentials not configured');
  }

  // Check cache first
  if (tokenCache && tokenCache.expires_at > Date.now()) {
    console.log('[FatSecret] Using cached token');
    return tokenCache.access_token;
  }

  console.log('[FatSecret] Requesting new OAuth token');

  try {
    // OAuth2 Client Credentials flow
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://oauth.fatsecret.com/connect/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=basic',
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[FatSecret] Token request failed:', response.status, error);
      throw new Error(`FatSecret auth failed: ${response.status}`);
    }

    const data = await response.json();

    // Cache token for 50 minutes (3000 seconds)
    tokenCache = {
      access_token: data.access_token,
      expires_at: Date.now() + (50 * 60 * 1000),
    };

    console.log('[FatSecret] Token acquired successfully');
    return data.access_token;

  } catch (error: any) {
    console.error('[FatSecret] Token acquisition error:', error);
    throw error;
  }
}

/**
 * Search for a product by barcode using FatSecret API
 * Returns normalized BarcodeProduct or null if not found
 */
export async function searchByBarcode(barcode: string): Promise<BarcodeProduct | null> {
  console.log('[FatSecret] Searching for barcode:', barcode);

  try {
    const token = await getFatSecretToken();

    // FatSecret barcode search endpoint
    const searchUrl = new URL('https://platform.fatsecret.com/rest/server.api');
    searchUrl.searchParams.set('method', 'food.find_id_for_barcode');
    searchUrl.searchParams.set('barcode', barcode);
    searchUrl.searchParams.set('format', 'json');

    const searchResponse = await fetch(searchUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!searchResponse.ok) {
      if (searchResponse.status === 404) {
        console.log('[FatSecret] Product not found (404)');
        return null;
      }
      console.error('[FatSecret] Search failed:', searchResponse.status);
      return null;
    }

    const searchData = await searchResponse.json();

    // Check if food ID was found
    if (!searchData.food_id || !searchData.food_id.value) {
      console.log('[FatSecret] No food_id in response');
      return null;
    }

    const foodId = searchData.food_id.value;
    console.log('[FatSecret] Found food_id:', foodId);

    // Get detailed nutrition info
    const detailsUrl = new URL('https://platform.fatsecret.com/rest/server.api');
    detailsUrl.searchParams.set('method', 'food.get.v2');
    detailsUrl.searchParams.set('food_id', foodId);
    detailsUrl.searchParams.set('format', 'json');

    const detailsResponse = await fetch(detailsUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!detailsResponse.ok) {
      console.error('[FatSecret] Details fetch failed:', detailsResponse.status);
      return null;
    }

    const detailsData = await detailsResponse.json();
    const food = detailsData.food;

    if (!food) {
      console.log('[FatSecret] No food data in details response');
      return null;
    }

    console.log('[FatSecret] Food details:', food.food_name);

    // Extract name (try Hebrew first, fallback to English/default)
    const name = food.food_name || 'Unknown Product';
    const name_he = food.food_name_he || undefined; // Hebrew if available
    const brand = food.brand_name || undefined;

    // Get servings data
    const servings = food.servings?.serving;
    if (!servings || !Array.isArray(servings) || servings.length === 0) {
      console.log('[FatSecret] No servings data available');
      return null;
    }

    // Find 100g serving or calculate from available serving
    let per100g: Per100g | null = null;
    let isPartial = false;

    // Try to find a 100g serving
    const serving100g = servings.find((s: any) =>
      s.metric_serving_amount === '100.000' && s.metric_serving_unit === 'g'
    );

    if (serving100g) {
      // Direct 100g serving found
      per100g = {
        kcal: Math.round(parseFloat(serving100g.calories) || 0),
        protein_g: Math.round(parseFloat(serving100g.protein) || 0),
        carbs_g: Math.round(parseFloat(serving100g.carbohydrate) || 0),
        fat_g: Math.round(parseFloat(serving100g.fat) || 0),
      };
    } else {
      // Calculate from first serving
      const firstServing = servings[0];
      const servingAmount = parseFloat(firstServing.metric_serving_amount);

      if (!servingAmount || servingAmount === 0) {
        console.log('[FatSecret] Cannot calculate per 100g - no serving amount');
        isPartial = true;
        // Return partial data with serving size
        per100g = {
          kcal: Math.round(parseFloat(firstServing.calories) || 0),
          protein_g: Math.round(parseFloat(firstServing.protein) || 0),
          carbs_g: Math.round(parseFloat(firstServing.carbohydrate) || 0),
          fat_g: Math.round(parseFloat(firstServing.fat) || 0),
        };
      } else {
        // Scale to 100g
        const scale = 100 / servingAmount;
        per100g = {
          kcal: Math.round((parseFloat(firstServing.calories) || 0) * scale),
          protein_g: Math.round((parseFloat(firstServing.protein) || 0) * scale),
          carbs_g: Math.round((parseFloat(firstServing.carbohydrate) || 0) * scale),
          fat_g: Math.round((parseFloat(firstServing.fat) || 0) * scale),
        };
      }
    }

    if (!per100g) {
      console.log('[FatSecret] Could not determine nutrition per 100g');
      return null;
    }

    const product: BarcodeProduct = {
      barcode,
      name,
      name_he,
      brand,
      per100g,
      source: 'fatsecret',
      isPartial,
    };

    console.log('[FatSecret] Successfully mapped product:', name);
    return product;

  } catch (error: any) {
    console.error('[FatSecret] Search error:', error);
    return null;
  }
}
