/**
 * Israeli MoH CSV Import Script
 *
 * Imports manually downloaded CSV from data.gov.il into israel_moh_foods table
 *
 * Usage:
 *   ISRAEL_MOH_CSV_PATH=/path/to/nutrition_dataset.csv pnpm tsx scripts/import-israel-moh-csv.ts
 *
 * Environment:
 *   ISRAEL_MOH_CSV_PATH - Required. Absolute path to downloaded CSV file
 *   SUPABASE_URL - From .env.local
 *   SUPABASE_SERVICE_ROLE_KEY - From .env.local (needs service role for bulk insert)
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Column name patterns to detect (case-insensitive, handles Hebrew and English)
const COLUMN_PATTERNS = {
  name_he: ['שם מוצר', 'שם', 'product_name_he', 'name_he', 'hebrew_name', 'shmmitzrach'],
  name_en: ['product_name_en', 'name_en', 'english_name', 'name'],
  brand: ['מותג', 'יצרן', 'brand', 'manufacturer', 'makor'],
  category: ['קטגוריה', 'category', 'food_group', 'smlmitzrach'],
  calories: ['אנרגיה', 'קלוריות', 'calories', 'energy', 'kcal', 'energy_kcal', 'food_energy'],
  protein: ['חלבון', 'protein'],
  carbs: ['פחמימות', 'carbohydrates', 'carbs'],
  fat: ['שומן', 'fat', 'total_fat'],
  sugars: ['סוכרים', 'sugars', 'sugar', 'total_sugars'],
  sodium: ['נתרן', 'sodium'],
  fiber: ['סיבים', 'fiber', 'dietary_fiber', 'total_dietary_fiber'],
};

interface ColumnMapping {
  name_he?: number;
  name_en?: number;
  brand?: number;
  category?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sugars?: number;
  sodium?: number;
  fiber?: number;
}

/**
 * Parse CSV line handling quoted fields and commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Detect column mapping from header row
 */
function detectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase().trim();

    for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
      if (patterns.some(p => header.includes(p.toLowerCase()))) {
        mapping[field as keyof ColumnMapping] = i;
        break;
      }
    }
  }

  return mapping;
}

/**
 * Parse numeric value, handle Hebrew decimal separators and commas
 */
function parseNumeric(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null;

  // Remove quotes, whitespace, handle Hebrew/European number formats
  const cleaned = value
    .replace(/['"]/g, '')
    .trim()
    .replace(/,/g, '.'); // Convert comma decimals to dots

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Main import function
 */
async function importCSV() {
  console.log('🔄 Israeli MoH CSV Import\n');

  // Validate environment
  const csvPath = process.env.ISRAEL_MOH_CSV_PATH;
  if (!csvPath) {
    console.error('❌ Error: ISRAEL_MOH_CSV_PATH environment variable not set');
    console.error('   Usage: ISRAEL_MOH_CSV_PATH=/path/to/file.csv pnpm tsx scripts/import-israel-moh-csv.ts\n');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Error: CSV file not found at ${csvPath}\n`);
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase credentials');
    console.error('   Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local\n');
    process.exit(1);
  }

  // Initialize Supabase client with service role (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  });

  console.log(`📂 Reading CSV from: ${csvPath}`);
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim().length > 0);

  if (lines.length === 0) {
    console.error('❌ Error: CSV file is empty\n');
    process.exit(1);
  }

  console.log(`📊 Found ${lines.length} lines\n`);

  // Parse header and detect columns
  const headers = parseCSVLine(lines[0]);
  const mapping = detectColumns(headers);

  console.log('🔍 Detected column mapping:');
  console.log(JSON.stringify(mapping, null, 2));
  console.log('');

  if (mapping.name_he === undefined) {
    console.error('❌ Error: Could not detect Hebrew name column (שם מוצר)');
    console.error('   Available headers:', headers);
    console.error('   Please check the CSV format\n');
    process.exit(1);
  }

  // Parse data rows
  const datasetVersion = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  console.log('⚙️  Processing rows...\n');

  const batchSize = 100;
  let batch: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);

      // Extract fields using detected mapping
      const name_he = mapping.name_he !== undefined ? values[mapping.name_he] : undefined;
      const name_en = mapping.name_en !== undefined ? values[mapping.name_en] : undefined;
      const brand = mapping.brand !== undefined ? values[mapping.brand] : undefined;
      const category = mapping.category !== undefined ? values[mapping.category] : undefined;

      const calories = parseNumeric(mapping.calories !== undefined ? values[mapping.calories] : undefined);
      const protein = parseNumeric(mapping.protein !== undefined ? values[mapping.protein] : undefined);
      const carbs = parseNumeric(mapping.carbs !== undefined ? values[mapping.carbs] : undefined);
      const fat = parseNumeric(mapping.fat !== undefined ? values[mapping.fat] : undefined);
      const sugars = parseNumeric(mapping.sugars !== undefined ? values[mapping.sugars] : undefined);
      const sodium = parseNumeric(mapping.sodium !== undefined ? values[mapping.sodium] : undefined);
      const fiber = parseNumeric(mapping.fiber !== undefined ? values[mapping.fiber] : undefined);

      // Skip rows without name
      if (!name_he || name_he.trim() === '') {
        skipped++;
        continue;
      }

      // Check if we have at least some nutrition data
      const hasNutrition = calories !== null || protein !== null || carbs !== null || fat !== null;
      const is_partial = !hasNutrition || (calories === null && protein === null);

      // Build record
      const record = {
        name_he: name_he.trim(),
        name_en: name_en?.trim() || null,
        brand: brand?.trim() || null,
        category: category?.trim() || null,
        calories_per_100g: calories,
        protein_g_per_100g: protein,
        carbs_g_per_100g: carbs,
        fat_g_per_100g: fat,
        sugars_g_per_100g: sugars,
        sodium_mg_per_100g: sodium,
        fiber_g_per_100g: fiber,
        is_partial,
        dataset_version: datasetVersion,
        src_row: values, // Store raw row for debugging
        updated_at: new Date().toISOString(),
      };

      batch.push(record);

      // Insert in batches
      if (batch.length >= batchSize) {
        const { data, error } = await supabase
          .from('israel_moh_foods')
          .insert(batch);

        if (error) {
          console.error(`⚠️  Batch insert error:`, error.message);
          errors.push(`Batch ${Math.floor(i / batchSize)}: ${error.message}`);
        } else {
          inserted += batch.length;
        }

        batch = [];
      }

      // Progress indicator
      if (i % 500 === 0) {
        console.log(`   Processed ${i}/${lines.length - 1} rows...`);
      }
    } catch (error: any) {
      errors.push(`Line ${i + 1}: ${error.message}`);
      skipped++;
    }
  }

  // Insert remaining batch
  if (batch.length > 0) {
    const { data, error } = await supabase
      .from('israel_moh_foods')
      .insert(batch);

    if (error) {
      console.error(`⚠️  Final batch insert error:`, error.message);
      errors.push(`Final batch: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  console.log('\n');
  console.log('═'.repeat(60));
  console.log('✅ Import Complete!');
  console.log('═'.repeat(60));
  console.log('');
  console.log('📈 Summary:');
  console.log(`   Inserted/Updated: ${inserted} records`);
  console.log(`   Skipped: ${skipped} records`);
  console.log(`   Errors: ${errors.length}`);
  console.log('');

  if (errors.length > 0 && errors.length <= 10) {
    console.log('⚠️  Errors encountered:');
    errors.forEach(err => console.log(`   - ${err}`));
    console.log('');
  } else if (errors.length > 10) {
    console.log(`⚠️  ${errors.length} errors encountered (showing first 10):`);
    errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
    console.log('');
  }

  // Verify count
  const { count } = await supabase
    .from('israel_moh_foods')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total records in database: ${count}`);
  console.log('');
  console.log('✨ Next steps:');
  console.log('   1. Test name search: GET /api/israel-moh/search?query=חלב');
  console.log('   2. Create a barcode alias via UI');
  console.log('   3. Test barcode lookup with the aliased barcode');
  console.log('');

  process.exit(0);
}

// Run import
importCSV().catch(error => {
  console.error('\n❌ Import failed:', error.message);
  console.error(error);
  process.exit(1);
});
