#!/usr/bin/env node
/**
 * Check user's nutrition profile data
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

async function checkProfile() {
  try {
    // Get the first user (or you can pass userId as argument)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError || !users || users.length === 0) {
      console.error('❌ Error fetching users:', usersError?.message);
      return;
    }

    const userId = users[0].id;
    console.log(`👤 Checking profile for user: ${userId.substring(0, 8)}...\n`);

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError.message);
      return;
    }

    if (!profile) {
      console.log('⚠️  No profile found for this user!');
      return;
    }

    console.log('✅ Profile found!');
    console.log('\n📊 Profile Data:');
    console.log(JSON.stringify(profile, null, 2));

    console.log('\n🔍 Nutrition Plan Check:');
    if (profile.nutrition_plan) {
      console.log('✅ Has nutrition_plan field');
      console.log('\n📦 nutrition_plan contents:');
      console.log(JSON.stringify(profile.nutrition_plan, null, 2));

      const plan = profile.nutrition_plan;
      if (plan.dailyTargets) {
        console.log('\n✅ Has dailyTargets');
        console.log('\n🎯 Daily Targets:');
        console.log(`  Calories: ${plan.dailyTargets.calories || 'N/A'}`);
        console.log(`  Protein: ${plan.dailyTargets.protein_g || 'N/A'}g`);
        console.log(`  Carbs: ${plan.dailyTargets.carbs_g || 'N/A'}g`);
        console.log(`  Fat: ${plan.dailyTargets.fat_g || 'N/A'}g`);
        console.log(`  TDEE: ${plan.dailyTargets.tdee || 'N/A'}`);
      } else {
        console.log('❌ Missing dailyTargets in nutrition_plan');
      }
    } else {
      console.log('❌ No nutrition_plan field');
    }

    // Also check meals table
    console.log('\n\n🍽️  Today\'s Meals:');
    const today = new Date().toISOString().split('T')[0];
    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select('name, calories, protein')
      .eq('user_id', userId)
      .eq('date', today);

    if (mealsError) {
      console.error('❌ Error fetching meals:', mealsError.message);
    } else if (!meals || meals.length === 0) {
      console.log('  No meals logged today');
    } else {
      meals.forEach((meal, i) => {
        console.log(`  ${i + 1}. ${meal.name}: ${meal.calories} cal, ${meal.protein}g protein`);
      });
      const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
      const totalProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0);
      console.log(`\n  📈 Totals: ${totalCalories} calories, ${totalProtein}g protein`);
    }

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

// Run the check
checkProfile();
