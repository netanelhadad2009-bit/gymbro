/**
 * Cleanup Test Users
 * Removes all test users and their data from the database
 */

import * as path from 'path';
import { config } from 'dotenv';
config({ path: path.join(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface CleanupStats {
  authUsersDeleted: number;
  profilesDeleted: number;
  avatarsDeleted: number;
  programsDeleted: number;
  stagesDeleted: number;
  errors: string[];
}

/**
 * Find all test users
 */
async function findTestUsers(): Promise<string[]> {
  console.log('🔍 Finding test users...\n');

  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  const testUserIds = data.users
    .filter(u => u.email?.includes('@gymbro-test.com'))
    .map(u => u.id);

  console.log(`Found ${testUserIds.length} test users\n`);

  return testUserIds;
}

/**
 * Delete a user and all their data
 */
async function deleteUser(userId: string, email: string): Promise<CleanupStats> {
  const stats: CleanupStats = {
    authUsersDeleted: 0,
    profilesDeleted: 0,
    avatarsDeleted: 0,
    programsDeleted: 0,
    stagesDeleted: 0,
    errors: [],
  };

  console.log(`  Deleting ${email}...`);

  try {
    // 1. Delete journey stages
    const { error: stagesError } = await supabase
      .from('journey_stages')
      .delete()
      .eq('user_id', userId);

    if (stagesError) {
      stats.errors.push(`Journey stages: ${stagesError.message}`);
    } else {
      stats.stagesDeleted = 1;
    }

    // 2. Delete avatar
    const { error: avatarError } = await supabase
      .from('avatars')
      .delete()
      .eq('user_id', userId);

    if (avatarError) {
      stats.errors.push(`Avatar: ${avatarError.message}`);
    } else {
      stats.avatarsDeleted = 1;
    }

    // 3. Delete program
    const { error: programError } = await supabase
      .from('programs')
      .delete()
      .eq('user_id', userId);

    if (programError) {
      stats.errors.push(`Program: ${programError.message}`);
    } else {
      stats.programsDeleted = 1;
    }

    // 4. Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      stats.errors.push(`Profile: ${profileError.message}`);
    } else {
      stats.profilesDeleted = 1;
    }

    // 5. Delete auth user (this cascades to other tables with foreign keys)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      stats.errors.push(`Auth user: ${authError.message}`);
    } else {
      stats.authUsersDeleted = 1;
    }

    if (stats.errors.length === 0) {
      console.log(`    ✓ Deleted successfully`);
    } else {
      console.log(`    ⚠️ Deleted with ${stats.errors.length} errors`);
    }

  } catch (error: any) {
    stats.errors.push(`Exception: ${error.message}`);
    console.log(`    ✗ Error: ${error.message}`);
  }

  return stats;
}

/**
 * Main cleanup function
 */
async function cleanup(dryRun: boolean = false) {
  console.log('\n🧹 Test User Cleanup\n');
  console.log('═══════════════════════════════════════════════════\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No data will be deleted\n');
  }

  try {
    // Find all test users
    const testUserIds = await findTestUsers();

    if (testUserIds.length === 0) {
      console.log('✅ No test users found. Database is clean!\n');
      return;
    }

    // Get user details
    const { data: authData } = await supabase.auth.admin.listUsers();
    const testUsers =
      authData?.users.filter(u => u.email?.includes('@gymbro-test.com')) || [];

    if (dryRun) {
      console.log('Would delete the following users:\n');
      for (const user of testUsers) {
        console.log(`  - ${user.email} (${user.id})`);
      }
      console.log(`\nTotal: ${testUsers.length} users\n`);
      console.log('Run without --dry-run flag to actually delete\n');
      return;
    }

    // Confirm deletion
    console.log(`⚠️  About to delete ${testUsers.length} test users and all their data!\n`);
    console.log('This action cannot be undone.\n');

    // In a real scenario, you'd want to add a confirmation prompt here
    // For automation, we'll proceed directly

    console.log('Proceeding with deletion...\n');

    const overallStats: CleanupStats = {
      authUsersDeleted: 0,
      profilesDeleted: 0,
      avatarsDeleted: 0,
      programsDeleted: 0,
      stagesDeleted: 0,
      errors: [],
    };

    // Delete each user
    for (const user of testUsers) {
      const stats = await deleteUser(user.id, user.email || 'unknown');

      overallStats.authUsersDeleted += stats.authUsersDeleted;
      overallStats.profilesDeleted += stats.profilesDeleted;
      overallStats.avatarsDeleted += stats.avatarsDeleted;
      overallStats.programsDeleted += stats.programsDeleted;
      overallStats.stagesDeleted += stats.stagesDeleted;
      overallStats.errors.push(...stats.errors);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Print summary
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 Cleanup Summary\n');
    console.log(`Auth Users Deleted: ${overallStats.authUsersDeleted}`);
    console.log(`Profiles Deleted: ${overallStats.profilesDeleted}`);
    console.log(`Avatars Deleted: ${overallStats.avatarsDeleted}`);
    console.log(`Programs Deleted: ${overallStats.programsDeleted}`);
    console.log(`Stages Deleted: ${overallStats.stagesDeleted}`);

    if (overallStats.errors.length > 0) {
      console.log(`\n⚠️ Errors: ${overallStats.errors.length}`);
      const uniqueErrors = [...new Set(overallStats.errors)];
      for (const error of uniqueErrors.slice(0, 10)) {
        console.log(`  - ${error}`);
      }
      if (uniqueErrors.length > 10) {
        console.log(`  ... and ${uniqueErrors.length - 10} more`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════\n');
    console.log('✅ Cleanup complete!\n');

  } catch (error: any) {
    console.error('❌ Cleanup error:', error.message);
    throw error;
  }
}

/**
 * Delete specific users by email pattern
 */
async function cleanupByPattern(pattern: string, dryRun: boolean = false) {
  console.log(`\n🧹 Cleaning up users matching pattern: ${pattern}\n`);

  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  const matchingUsers = data.users.filter(u =>
    u.email?.includes(pattern)
  );

  console.log(`Found ${matchingUsers.length} matching users\n`);

  if (matchingUsers.length === 0) {
    console.log('✅ No matching users found\n');
    return;
  }

  if (dryRun) {
    console.log('Would delete:\n');
    for (const user of matchingUsers) {
      console.log(`  - ${user.email}`);
    }
    console.log(`\nTotal: ${matchingUsers.length} users\n`);
    return;
  }

  for (const user of matchingUsers) {
    await deleteUser(user.id, user.email || 'unknown');
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n✅ Cleanup complete!\n');
}

// CLI execution
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const pattern = args.find(arg => arg.startsWith('--pattern='))?.split('=')[1];

if (pattern) {
  cleanupByPattern(pattern, dryRun)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} else {
  cleanup(dryRun)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}
