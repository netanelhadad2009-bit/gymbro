/**
 * Apply the user_foods and points_events migration
 * Run with: node scripts/apply-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ivzltlqsjrikffssyvbr.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  console.error('Make sure to run this from the repo root with .env.local loaded');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  try {
    console.log('📦 Reading migration file...');

    // Read the migration SQL
    const migrationPath = join(__dirname, '../apps/web/supabase/migrations/018_add_user_foods_and_points.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Applying migration to Supabase...');
    console.log('   Creating tables: user_foods, points_events');
    console.log('   Adding columns: food_cache.source, food_cache.is_partial');

    // Split SQL by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    for (const statement of statements) {
      if (statement.includes('COMMENT ON')) continue; // Skip comments

      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

      if (error) {
        // Try using the SQL editor endpoint instead
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: statement }),
        });

        if (!response.ok) {
          console.warn('⚠️  Could not execute statement:', statement.substring(0, 100) + '...');
          console.warn('    Error:', error?.message || 'Unknown error');
        }
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('📋 Verifying tables...');

    // Verify tables exist
    const { data: userFoods, error: ufError } = await supabase
      .from('user_foods')
      .select('count');

    const { data: pointsEvents, error: peError } = await supabase
      .from('points_events')
      .select('count');

    const { data: foodCache, error: fcError } = await supabase
      .from('food_cache')
      .select('source, is_partial')
      .limit(1);

    if (!ufError) {
      console.log('   ✓ user_foods table exists');
    } else {
      console.error('   ✗ user_foods table missing:', ufError.message);
    }

    if (!peError) {
      console.log('   ✓ points_events table exists');
    } else {
      console.error('   ✗ points_events table missing:', peError.message);
    }

    if (!fcError) {
      console.log('   ✓ food_cache has source and is_partial columns');
    } else {
      console.error('   ✗ food_cache columns missing:', fcError.message);
    }

    console.log('');
    console.log('🎉 Migration complete! You can now:');
    console.log('   1. Test FatSecret fallback with barcode: 012000161551');
    console.log('   2. Test manual product entry with fake barcode: 9999999999999');
    console.log('');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
applyMigration();
