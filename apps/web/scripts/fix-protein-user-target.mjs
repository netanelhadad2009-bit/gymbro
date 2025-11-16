#!/usr/bin/env node
/**
 * Fix protein tasks missing use_user_target flag
 * Updates all HIT_PROTEIN_GOAL tasks to use personalized user targets
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

async function fixProteinTasks() {
  console.log('🔍 Searching for protein tasks without use_user_target flag...\n');

  try {
    // Fetch all protein tasks
    const { data: tasks, error: fetchError } = await supabase
      .from('user_stage_tasks')
      .select('id, key_code, title_he, condition_json')
      .eq('condition_json->>type', 'HIT_PROTEIN_GOAL');

    if (fetchError) {
      console.error('❌ Error fetching tasks:', fetchError.message);
      process.exit(1);
    }

    if (!tasks || tasks.length === 0) {
      console.log('✅ No protein tasks found.');
      return;
    }

    console.log(`📊 Found ${tasks.length} protein task(s):\n`);

    // Filter tasks that need updating
    const tasksToUpdate = tasks.filter(task => {
      const needsUpdate = !task.condition_json.use_user_target;
      const status = needsUpdate ? '❌ Missing flag' : '✅ Already has flag';
      console.log(`  ${status}: ${task.title_he} (${task.id.substring(0, 8)}...)`);
      return needsUpdate;
    });

    if (tasksToUpdate.length === 0) {
      console.log('\n✅ All protein tasks already have use_user_target flag. Nothing to update!');
      return;
    }

    console.log(`\n🔧 Updating ${tasksToUpdate.length} task(s)...\n`);

    // Update each task
    let successCount = 0;
    let errorCount = 0;

    for (const task of tasksToUpdate) {
      const updatedCondition = {
        ...task.condition_json,
        use_user_target: true,
      };

      const { error: updateError } = await supabase
        .from('user_stage_tasks')
        .update({ condition_json: updatedCondition })
        .eq('id', task.id);

      if (updateError) {
        console.error(`  ❌ Failed to update task ${task.id.substring(0, 8)}: ${updateError.message}`);
        errorCount++;
      } else {
        console.log(`  ✅ Updated: ${task.title_he}`);
        successCount++;
      }
    }

    console.log(`\n📈 Results:`);
    console.log(`  ✅ Successfully updated: ${successCount}`);
    if (errorCount > 0) {
      console.log(`  ❌ Failed: ${errorCount}`);
    }
    console.log('\n🎉 Migration complete!');
    console.log('\n💡 Tip: Refresh your app to see the changes take effect.');

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

// Run the migration
fixProteinTasks();
