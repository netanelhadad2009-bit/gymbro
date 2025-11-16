#!/usr/bin/env tsx
/**
 * Migration Runner - Execute SQL migrations using Supabase service role
 * Usage: pnpm tsx scripts/run-migration.ts <migration-file>
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Get migration file from command line
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Error: Please provide a migration file path');
  console.error('Usage: pnpm tsx scripts/run-migration.ts <migration-file>');
  process.exit(1);
}

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function runMigration() {
  try {
    // Read migration file
    const migrationPath = resolve(process.cwd(), migrationFile);
    console.log(`📖 Reading migration file: ${migrationPath}`);
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log(`🚀 Executing migration...`);
    console.log(`📝 Migration content (${sql.length} chars):\n`);
    console.log(sql.slice(0, 500) + '...\n');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      // Try direct query if RPC doesn't exist
      console.log('⚠️  RPC method not available, trying direct query...');

      // Split by semicolon and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.toLowerCase().startsWith('begin') ||
            statement.toLowerCase().startsWith('commit')) {
          continue; // Skip transaction control for individual queries
        }

        console.log(`\n📝 Executing: ${statement.slice(0, 100)}...`);
        const { error: queryError } = await supabase.rpc('query', {
          query_text: statement
        });

        if (queryError) {
          throw queryError;
        }
      }

      console.log('\n✅ Migration executed successfully!');
      console.log('\n📊 Running verification queries...\n');

      // Verification: Check task types
      const { data: tasks, error: tasksError } = await supabase
        .from('stage_task_templates')
        .select('type')
        .limit(100);

      if (!tasksError && tasks) {
        const typeCounts = tasks.reduce((acc: Record<string, number>, task: any) => {
          acc[task.type] = (acc[task.type] || 0) + 1;
          return acc;
        }, {});

        console.log('✅ Task type distribution:');
        Object.entries(typeCounts).forEach(([type, count]) => {
          console.log(`   ${type}: ${count}`);
        });
      }

      return;
    }

    console.log('✅ Migration executed successfully!');
    if (data) {
      console.log('📊 Result:', JSON.stringify(data, null, 2));
    }

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

// Run migration
runMigration();
