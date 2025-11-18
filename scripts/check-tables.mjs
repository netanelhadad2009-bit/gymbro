/**
 * Check if migration tables exist
 * Run with: node scripts/check-tables.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables for scripts/check-tables.mjs:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTables() {
  console.log('🔍 Checking database tables...\n');

  // Check user_foods
  const { data: uf, error: ufError } = await supabase
    .from('user_foods')
    .select('*')
    .limit(0);

  if (ufError) {
    console.log('❌ user_foods table: NOT FOUND');
    console.log('   Error:', ufError.message);
  } else {
    console.log('✅ user_foods table: EXISTS');
  }

  // Check points_events
  const { data: pe, error: peError } = await supabase
    .from('points_events')
    .select('*')
    .limit(0);

  if (peError) {
    console.log('❌ points_events table: NOT FOUND');
    console.log('   Error:', peError.message);
  } else {
    console.log('✅ points_events table: EXISTS');
  }

  // Check food_cache for new columns
  const { data: fc, error: fcError } = await supabase
    .from('food_cache')
    .select('source, is_partial')
    .limit(1);

  if (fcError) {
    console.log('❌ food_cache columns (source, is_partial): NOT FOUND');
    console.log('   Error:', fcError.message);
  } else {
    console.log('✅ food_cache columns: EXISTS');
    if (fc && fc.length > 0) {
      console.log('   Sample:', fc[0]);
    }
  }

  console.log('\n' + '='.repeat(50));

  if (ufError || peError || fcError) {
    console.log('\n⚠️  MIGRATION NEEDED');
    console.log('\n📝 To apply migration, go to:');
    console.log('   https://supabase.com/dashboard/project/ivzltlqsjrikffssyvbr/sql/new');
    console.log('\n   Then paste and run the SQL from:');
    console.log('   apps/web/supabase/migrations/018_add_user_foods_and_points.sql');
  } else {
    console.log('\n✅ All tables exist! Migration already applied.');
    console.log('\n🧪 Ready to test:');
    console.log('   1. Navigate to http://localhost:3000/nutrition');
    console.log('   2. Click scanner → "הקלדה ידנית"');
    console.log('   3. Try barcode: 012000161551 (US product for FatSecret)');
  }

  console.log('');
}

checkTables().catch(console.error);
