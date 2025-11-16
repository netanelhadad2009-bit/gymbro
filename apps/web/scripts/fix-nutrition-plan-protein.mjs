#!/usr/bin/env node
/**
 * Fix nutrition plan protein target to match user's custom value
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read env from .env.local
const envPath = resolve(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf-8');

const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=["']?([^"'\n]+)["']?$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  process.exit(1);
}

console.log('🔐 Connecting to Supabase...\n');

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function fixProteinTarget() {
  try {
    // Get the first user
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError || !users || users.length === 0) {
      console.error('❌ Error fetching users:', usersError?.message);
      return;
    }

    const userId = users[0].id;
    console.log(`👤 Fixing protein target for user: ${userId.substring(0, 8)}...\n`);

    // Fetch current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('nutrition_plan')
      .eq('id', userId)
      .single();

    if (profileError || !profile || !profile.nutrition_plan) {
      console.error('❌ Error: No nutrition plan found');
      return;
    }

    const nutritionPlan = profile.nutrition_plan;
    const currentProtein = nutritionPlan.dailyTargets?.protein_g;

    console.log(`📊 Current protein target: ${currentProtein}g`);

    if (currentProtein === 100) {
      console.log('✅ Protein target is already 100g. No changes needed!');
      return;
    }

    // Update protein target to 100g
    const updatedPlan = {
      ...nutritionPlan,
      dailyTargets: {
        ...nutritionPlan.dailyTargets,
        protein_g: 100,
      },
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ nutrition_plan: updatedPlan })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Error updating profile:', updateError.message);
      return;
    }

    console.log(`✅ Successfully updated protein target: ${currentProtein}g → 100g\n`);
    console.log('🎉 Backend and frontend targets are now in sync!');
    console.log('\n💡 Tip: Refresh your app to complete the protein mission.');

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

// Run the fix
fixProteinTarget();
