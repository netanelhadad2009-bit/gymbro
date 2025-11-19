/**
 * Israeli Ministry of Health Nutrition Data Client
 * Fetches and caches nutrition data for Israeli products (729 barcode prefix)
 * Data source: https://data.gov.il/
 */

import { createClient } from '@supabase/supabase-js';
import { serverEnv, clientEnv } from '@/lib/env';
import type { BarcodeProduct, Per100g, IsraelMoHProductRaw, IsraelMoHMatchMeta } from '@/types/barcode';

// Supabase admin client for ETL operations
function getSupabaseAdmin() {
  // Use centralized env validation
  const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;

  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Check if a barcode is Israeli (729 prefix)
 */
export function isIsraeliBarcode(barcode: string): boolean {
  // Israeli barcodes start with 729 and are at least 8 digits
  return /^729\d{6,}$/.test(barcode);
}

/**
 * Normalize a row from Israeli MoH dataset to BarcodeProduct
 * Handles various column name variations and missing data
 */
export function normalizeIsraelMoHRow(row: IsraelMoHProductRaw, datasetVersion?: string): BarcodeProduct | null {
  try {
    // Extract barcode (try various field names)
    const barcode = row.barcode || row.Barcode || row['ברקוד'] || row['מספר ברקוד'];

    if (!barcode) {
      return null; // Skip rows without barcode
    }

    // Extract product names (Hebrew and English)
    const name_he = row.name_he || row.product_name_he || row['שם מוצר'] || row['שם המוצר'];
    const name_en = row.name_en || row.product_name_en || row['Product Name'];
    const name = name_he || name_en || 'מוצר לא ידוע';

    // Extract brand
    const brand = row.brand || row.manufacturer || row['יצרן'] || row['שם יצרן'];

    // Extract nutrition values per 100g
    const calories = parseFloat(row.calories_per_100g || row.calories || row['קלוריות'] || row['אנרגיה'] || '0');
    const protein = parseFloat(row.protein_g_per_100g || row.protein || row['חלבון'] || '0');
    const carbs = parseFloat(row.carbs_g_per_100g || row.carbohydrates || row['פחמימות'] || '0');
    const fat = parseFloat(row.fat_g_per_100g || row.fat || row['שומן'] || '0');
    const sugars = parseFloat(row.sugars_g_per_100g || row.sugars || row['סוכרים'] || '0');
    const sodium = parseFloat(row.sodium_mg_per_100g || row.sodium || row['נתרן'] || '0');
    const fiber = parseFloat(row.fiber_g_per_100g || row.fiber || row['סיבים'] || '0');

    // Build per100g object
    const per100g: Per100g = {
      kcal: Math.round(calories),
      protein_g: Math.round(protein * 10) / 10, // Round to 1 decimal
      carbs_g: Math.round(carbs * 10) / 10,
      fat_g: Math.round(fat * 10) / 10,
    };

    // Add optional fields if available
    if (sugars > 0) per100g.sugar_g = Math.round(sugars * 10) / 10;
    if (sodium > 0) per100g.sodium_mg = Math.round(sodium);
    if (fiber > 0) per100g.fiber_g = Math.round(fiber * 10) / 10;

    // Check if data is partial (missing critical macros)
    const isPartial = calories === 0 || protein === 0 || carbs === 0 || fat === 0;

    // Build metadata
    const matchMeta: IsraelMoHMatchMeta = {
      matchedBy: 'barcode',
      datasetVersion,
      publisher: 'data.gov.il',
    };

    const product: BarcodeProduct = {
      barcode: String(barcode).trim(),
      name: name.trim(),
      name_he: name_he?.trim(),
      brand: brand?.trim(),
      per100g,
      source: 'israel_moh',
      isPartial,
      matchMeta,
    };

    return product;
  } catch (error) {
    console.error('[IsraelMoH] Error normalizing row:', error);
    return null;
  }
}

/**
 * Fetch Israeli MoH dataset from data.gov.il and upsert to database
 * Returns count of products updated
 */
export async function fetchIsraelMoHDataset(): Promise<number> {
  console.log('[IsraelMoH] Starting dataset refresh...');

  const mode = process.env.ISRAEL_MOH_MODE;
  const dataUrl = process.env.ISRAEL_MOH_DATA_URL;

  if (mode !== 'dataset') {
    console.log('[IsraelMoH] Mode is not "dataset", skipping fetch');
    return 0;
  }

  if (!dataUrl) {
    console.error('[IsraelMoH] ISRAEL_MOH_DATA_URL not configured');
    throw new Error('Israeli MoH data URL not configured');
  }

  try {
    // Fetch dataset from data.gov.il
    console.log('[IsraelMoH] Fetching from:', dataUrl);
    const response = await fetch(dataUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FitJourney-Nutrition-App',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Parse response (data.gov.il CKAN format)
    let records: IsraelMoHProductRaw[] = [];

    if (data.result && data.result.records) {
      // CKAN API format
      records = data.result.records;
    } else if (Array.isArray(data)) {
      // Direct JSON array
      records = data;
    } else {
      throw new Error('Unexpected data format from Israeli MoH API');
    }

    console.log(`[IsraelMoH] Fetched ${records.length} records`);

    if (records.length === 0) {
      console.warn('[IsraelMoH] No records found in dataset');
      return 0;
    }

    // Get current timestamp for versioning
    const datasetVersion = new Date().toISOString();
    const supabase = getSupabaseAdmin();

    // Process and upsert records
    let successCount = 0;
    let errorCount = 0;

    for (const row of records) {
      try {
        // Normalize to BarcodeProduct
        const product = normalizeIsraelMoHRow(row, datasetVersion);

        if (!product || !product.barcode) {
          continue; // Skip invalid rows
        }

        // Prepare data for database
        const dbRow = {
          barcode: product.barcode,
          name_he: product.name_he || product.name,
          name_en: product.name,
          brand: product.brand,
          category: row.category || row['קטגוריה'] || null,
          calories_per_100g: product.per100g.kcal,
          protein_g_per_100g: product.per100g.protein_g,
          carbs_g_per_100g: product.per100g.carbs_g,
          fat_g_per_100g: product.per100g.fat_g,
          sugars_g_per_100g: product.per100g.sugar_g || null,
          sodium_mg_per_100g: product.per100g.sodium_mg || null,
          fiber_g_per_100g: product.per100g.fiber_g || null,
          is_partial: product.isPartial || false,
          dataset_version: datasetVersion,
          src_row: row, // Keep original for debugging
          updated_at: new Date().toISOString(),
        };

        // Upsert to database
        const { error } = await supabase
          .from('israel_moh_foods')
          .upsert(dbRow, {
            onConflict: 'barcode',
          });

        if (error) {
          console.error(`[IsraelMoH] Error upserting ${product.barcode}:`, error.message);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error: any) {
        console.error('[IsraelMoH] Error processing row:', error.message);
        errorCount++;
      }
    }

    console.log(`[IsraelMoH] Dataset refresh complete: ${successCount} updated, ${errorCount} errors`);
    return successCount;
  } catch (error: any) {
    console.error('[IsraelMoH] Dataset fetch failed:', error);
    throw error;
  }
}

/**
 * Lookup a product by barcode from Israeli MoH cached data
 * Returns normalized BarcodeProduct or null if not found
 */
export async function lookupIsraelMoH(barcode: string): Promise<BarcodeProduct | null> {
  console.log('[IsraelMoH] Looking up barcode:', barcode);

  try {
    const supabase = getSupabaseAdmin();

    // Query cached data
    const { data, error } = await supabase
      .from('israel_moh_foods')
      .select('*')
      .eq('barcode', barcode)
      .single();

    if (error || !data) {
      console.log('[IsraelMoH] Product not found in cache');
      return null;
    }

    console.log('[IsraelMoH] Found product:', data.name_he || data.name_en);

    // Build per100g object
    const per100g: Per100g = {
      kcal: Math.round(data.calories_per_100g || 0),
      protein_g: Math.round((data.protein_g_per_100g || 0) * 10) / 10,
      carbs_g: Math.round((data.carbs_g_per_100g || 0) * 10) / 10,
      fat_g: Math.round((data.fat_g_per_100g || 0) * 10) / 10,
    };

    if (data.sugars_g_per_100g) per100g.sugar_g = Math.round(data.sugars_g_per_100g * 10) / 10;
    if (data.sodium_mg_per_100g) per100g.sodium_mg = Math.round(data.sodium_mg_per_100g);
    if (data.fiber_g_per_100g) per100g.fiber_g = Math.round(data.fiber_g_per_100g * 10) / 10;

    // Build metadata
    const matchMeta: IsraelMoHMatchMeta = {
      matchedBy: 'barcode',
      datasetVersion: data.dataset_version,
      publisher: 'data.gov.il',
    };

    const product: BarcodeProduct = {
      barcode: data.barcode,
      name: data.name_he || data.name_en || 'Unknown Product',
      name_he: data.name_he,
      brand: data.brand,
      per100g,
      source: 'israel_moh',
      isPartial: data.is_partial || false,
      matchMeta,
    };

    return product;
  } catch (error: any) {
    console.error('[IsraelMoH] Lookup error:', error);
    return null;
  }
}
