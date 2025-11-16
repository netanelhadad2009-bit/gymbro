#!/usr/bin/env node
/**
 * Check user's points data
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

async function checkPoints() {
  try {
    // Get the first user
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError || !users || users.length === 0) {
      console.error('❌ Error fetching users:', usersError?.message);
      return;
    }

    const userId = users[0].id;
    console.log(`👤 Checking points for user: ${userId.substring(0, 8)}...\n`);

    // Check user_points table
    const { data: pointsData, error: pointsError } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (pointsError) {
      console.error('❌ Error fetching points:', pointsError.message);
      return;
    }

    console.log('📊 Points Records:');
    if (!pointsData || pointsData.length === 0) {
      console.log('  ⚠️  No points records found in user_points table!');
    } else {
      console.log(`  Found ${pointsData.length} record(s):\n`);
      pointsData.forEach((record, i) => {
        console.log(`  ${i + 1}. ${record.points} points`);
        console.log(`     Reason: ${record.reason}`);
        console.log(`     Created: ${new Date(record.created_at).toLocaleString()}`);
        console.log('');
      });

      const total = pointsData.reduce((sum, r) => sum + (r.points || 0), 0);
      console.log(`  💰 Total: ${total} points\n`);
    }

    // Check completed tasks
    console.log('✅ Completed Tasks:');
    const { data: completedTasks, error: tasksError } = await supabase
      .from('user_stage_tasks')
      .select('id, key_code, title_he, points, is_completed, completed_at')
      .eq('user_id', userId)
      .eq('is_completed', true)
      .order('completed_at', { ascending: false });

    if (tasksError) {
      console.error('❌ Error fetching tasks:', tasksError.message);
    } else if (!completedTasks || completedTasks.length === 0) {
      console.log('  No completed tasks found');
    } else {
      console.log(`  Found ${completedTasks.length} completed task(s):\n`);
      completedTasks.forEach((task, i) => {
        console.log(`  ${i + 1}. ${task.title_he}`);
        console.log(`     Key: ${task.key_code}`);
        console.log(`     Points: ${task.points}`);
        console.log(`     Completed: ${new Date(task.completed_at).toLocaleString()}`);
        console.log('');
      });

      const totalTaskPoints = completedTasks.reduce((sum, t) => sum + (t.points || 0), 0);
      console.log(`  📈 Total points from tasks: ${totalTaskPoints}\n`);
    }

    // Diagnosis
    if (completedTasks && completedTasks.length > 0) {
      const totalTaskPoints = completedTasks.reduce((sum, t) => sum + (t.points || 0), 0);
      const totalRecordedPoints = pointsData ? pointsData.reduce((sum, r) => sum + (r.points || 0), 0) : 0;

      if (totalTaskPoints > totalRecordedPoints) {
        console.log('⚠️  ISSUE DETECTED:');
        console.log(`   Completed tasks have ${totalTaskPoints} points`);
        console.log(`   But user_points table only has ${totalRecordedPoints} points`);
        console.log(`   Missing ${totalTaskPoints - totalRecordedPoints} points!\n`);
      } else {
        console.log('✅ Points match between tasks and user_points table');
      }
    }

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

// Run the check
checkPoints();
