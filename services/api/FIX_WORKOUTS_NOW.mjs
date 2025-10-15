#!/usr/bin/env node
/**
 * Emergency script to fix workouts in database
 * Run: node FIX_WORKOUTS_NOW.mjs
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from services/api
dotenv.config({ path: join(__dirname, 'services/api/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixWorkouts() {
  console.log('🔧 Fixing workouts in database...\n');

  // Get all programs
  const { data: programs, error } = await supabase
    .from('programs')
    .select('id, user_id, workout_plan_text')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching programs:', error);
    return;
  }

  console.log(`Found ${programs.length} programs\n`);

  for (const program of programs) {
    console.log(`\n📦 Processing program ${program.id}`);

    if (!program.workout_plan_text) {
      console.log('  ⚠️  No workout_plan_text, skipping');
      continue;
    }

    try {
      const workoutPlan = JSON.parse(program.workout_plan_text);

      if (!workoutPlan.plan || !Array.isArray(workoutPlan.plan)) {
        console.log('  ⚠️  Invalid plan structure, skipping');
        continue;
      }

      // Delete existing workouts
      await supabase.from('workouts').delete().eq('program_id', program.id);

      // Insert each workout day
      for (let i = 0; i < workoutPlan.plan.length; i++) {
        const day = workoutPlan.plan[i];
        const dayNumber = day.order || day.day || day.day_number || (i + 1);
        const dayTitle = day.day_name || day.title || `יום ${dayNumber}`;

        // Insert workout
        const { data: workoutData, error: workoutError } = await supabase
          .from('workouts')
          .insert({
            program_id: program.id,
            day_number: dayNumber,
            title: dayTitle,
            notes: day.notes || null,
            completed: false
          })
          .select()
          .single();

        if (workoutError || !workoutData) {
          console.error(`  ❌ Error inserting workout day ${dayNumber}:`, workoutError);
          continue;
        }

        const workoutId = workoutData.id;

        // Insert exercises
        if (day.exercises && Array.isArray(day.exercises)) {
          const exercisesData = day.exercises.map((exercise, index) => ({
            workout_id: workoutId,
            order_index: index + 1,
            name: exercise.name_he || exercise.name || 'תרגיל',
            sets: exercise.sets || null,
            reps: exercise.reps || null,
            rest_seconds: exercise.rest_seconds || null,
            tempo: exercise.tempo || null
          }));

          const { error: exercisesError } = await supabase
            .from('workout_exercises')
            .insert(exercisesData);

          if (exercisesError) {
            console.error(`  ❌ Error inserting exercises for day ${dayNumber}:`, exercisesError);
            continue;
          }

          console.log(`  ✅ Inserted day ${dayNumber} with ${day.exercises.length} exercises`);
        }
      }

      console.log(`  ✅ Successfully processed program ${program.id}`);
    } catch (err) {
      console.error(`  ❌ Error processing program ${program.id}:`, err.message);
    }
  }

  console.log('\n✨ Done!');
}

fixWorkouts().then(() => process.exit(0)).catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
