#!/usr/bin/env node
/**
 * Apply Migration 024: Journey No Workouts
 * Executes SQL migration using Supabase REST API
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

console.log('🔐 Connecting to Supabase...');
console.log(`📍 URL: ${supabaseUrl}\n`);

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function applyMigration() {
  console.log('📖 Reading migration 024_journey_no_workouts.sql...\n');

  try {
    // Step 1: Delete invalid user tasks
    console.log('🗑️  Step 1: Removing user tasks with invalid types...');
    const { error: deleteUserTasksError } = await supabase
      .from('user_stage_tasks')
      .delete()
      .not('task_template_id', 'in', '(SELECT id FROM stage_task_templates WHERE type IN (\'meal_log\',\'protein_target\',\'calorie_window\',\'weigh_in\',\'streak_days\',\'habit_check\',\'edu_read\'))');

    if (deleteUserTasksError && !deleteUserTasksError.message.includes('No rows')) {
      console.log('⚠️  Could not delete user tasks (may not exist):', deleteUserTasksError.message);
    } else {
      console.log('✅ User tasks cleaned\n');
    }

    // Step 2: Delete invalid task templates
    console.log('🗑️  Step 2: Removing task templates with invalid types...');
    const { error: deleteTemplatesError } = await supabase
      .from('stage_task_templates')
      .delete()
      .not('type', 'in', '(meal_log,protein_target,calorie_window,weigh_in,streak_days,habit_check,edu_read)');

    if (deleteTemplatesError && !deleteTemplatesError.message.includes('No rows')) {
      console.log('⚠️  Could not delete templates (may not exist):', deleteTemplatesError.message);
    } else {
      console.log('✅ Task templates cleaned\n');
    }

    // Step 3: Add constraint (requires direct SQL)
    console.log('🔒 Step 3: Adding database constraint...');
    console.log('⚠️  Note: Database constraints must be added via Supabase SQL Editor');
    console.log('    Please run the following SQL in your Supabase SQL Editor:');
    console.log('\n' + '='.repeat(80));
    console.log(`
-- Drop existing constraint if exists
ALTER TABLE stage_task_templates
DROP CONSTRAINT IF EXISTS task_type_allowed;

-- Add constraint to enforce only allowed task types
ALTER TABLE stage_task_templates
ADD CONSTRAINT task_type_allowed CHECK (
  type IN (
    'meal_log',
    'protein_target',
    'calorie_window',
    'weigh_in',
    'streak_days',
    'habit_check',
    'edu_read'
  )
);

-- Add comment
COMMENT ON CONSTRAINT task_type_allowed ON stage_task_templates IS
'Journey system only supports nutrition and habit tasks. NO workout tasks allowed. Types: meal_log, protein_target, calorie_window, weigh_in, streak_days, habit_check, edu_read';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stage_task_templates_type ON stage_task_templates(type);
CREATE INDEX IF NOT EXISTS idx_user_stage_tasks_user_id ON user_stage_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stage_tasks_completed ON user_stage_tasks(user_id, completed_at) WHERE completed_at IS NOT NULL;
    `.trim());
    console.log('='.repeat(80) + '\n');

    // Step 4: Verify data
    console.log('📊 Step 4: Verifying data integrity...\n');

    const { data: templates, error: templatesError } = await supabase
      .from('stage_task_templates')
      .select('type, id')
      .limit(1000);

    if (templatesError) {
      console.error('❌ Error checking templates:', templatesError);
    } else if (templates) {
      // Count by type
      const typeCounts = templates.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
      }, {});

      console.log('✅ Task type distribution:');
      Object.entries(typeCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([type, count]) => {
          const allowed = ['meal_log','protein_target','calorie_window','weigh_in','streak_days','habit_check','edu_read'].includes(type);
          const status = allowed ? '✅' : '❌';
          console.log(`   ${status} ${type}: ${count}`);
        });

      // Check for invalid types
      const invalidTypes = templates.filter(t =>
        !['meal_log','protein_target','calorie_window','weigh_in','streak_days','habit_check','edu_read'].includes(t.type)
      );

      if (invalidTypes.length > 0) {
        console.log(`\n❌ WARNING: Found ${invalidTypes.length} tasks with invalid types!`);
        console.log('   Invalid types:', [...new Set(invalidTypes.map(t => t.type))].join(', '));
      } else {
        console.log('\n✅ All task types are valid!');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Migration partially complete!');
    console.log('\n⚠️  IMPORTANT: Complete the migration by:');
    console.log('   1. Go to: ' + supabaseUrl + '/project/_/sql');
    console.log('   2. Copy the SQL shown above');
    console.log('   3. Execute it to add constraints and indexes');
    console.log('='.repeat(80) + '\n');

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

applyMigration();
