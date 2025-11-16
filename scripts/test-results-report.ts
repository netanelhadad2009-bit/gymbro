/**
 * Test Results Report Generator
 * Analyzes and formats test results into a readable report
 */

import * as fs from 'fs/promises';

interface TestResult {
  user: any;
  success: boolean;
  steps: {
    nutritionGeneration: { success: boolean; duration: number; error?: string };
    registration: { success: boolean; duration: number; error?: string };
    avatarBootstrap: { success: boolean; duration: number; error?: string };
    sessionAttach: { success: boolean; duration: number; error?: string };
    stagesBootstrap: { success: boolean; duration: number; error?: string };
  };
  validation?: any;
  totalDuration: number;
}

interface TestResultsData {
  timestamp: string;
  totalUsers: number;
  totalDuration: number;
  results: TestResult[];
}

/**
 * Generate comprehensive test report
 */
async function generateReport(resultsPath: string) {
  console.log('\n📊 Generating Test Results Report\n');
  console.log('═══════════════════════════════════════════════════\n');

  // Read results file
  const fileContent = await fs.readFile(resultsPath, 'utf-8');
  const data: TestResultsData = JSON.parse(fileContent);

  const { totalUsers, totalDuration, results, timestamp } = data;

  // Calculate statistics
  const successfulRegistrations = results.filter(r => r.success).length;
  const successRate = Math.round((successfulRegistrations / totalUsers) * 100);

  // Step success rates
  const stepSuccessRates = {
    nutritionGeneration: results.filter(r => r.steps.nutritionGeneration.success).length,
    registration: results.filter(r => r.steps.registration.success).length,
    avatarBootstrap: results.filter(r => r.steps.avatarBootstrap.success).length,
    sessionAttach: results.filter(r => r.steps.sessionAttach.success).length,
    stagesBootstrap: results.filter(r => r.steps.stagesBootstrap.success).length,
  };

  // Average durations
  const avgDurations = {
    nutritionGeneration: average(
      results.map(r => r.steps.nutritionGeneration.duration)
    ),
    registration: average(results.map(r => r.steps.registration.duration)),
    avatarBootstrap: average(results.map(r => r.steps.avatarBootstrap.duration)),
    sessionAttach: average(results.map(r => r.steps.sessionAttach.duration)),
    stagesBootstrap: average(results.map(r => r.steps.stagesBootstrap.duration)),
    total: average(results.map(r => r.totalDuration)),
  };

  // Validation statistics
  const validationStats = {
    authUserExists: results.filter(r => r.validation?.checks.authUserExists).length,
    profileExists: results.filter(r => r.validation?.checks.profileExists).length,
    avatarExists: results.filter(r => r.validation?.checks.avatarExists).length,
    nutritionPlanExists: results.filter(r => r.validation?.checks.nutritionPlanExists).length,
    nutritionStatusReady: results.filter(r => r.validation?.checks.nutritionStatusReady).length,
    avatarMatches: results.filter(r => r.validation?.checks.avatarMatches).length,
    stagesExist: results.filter(r => r.validation?.checks.stagesExist).length,
    nutritionQuality: results.filter(r => r.validation?.checks.nutritionQuality).length,
    caloriesInRange: results.filter(r => r.validation?.checks.caloriesInRange).length,
  };

  // Error summary
  const errorCounts: Record<string, number> = {};
  const warningCounts: Record<string, number> = {};

  for (const result of results) {
    // Step errors
    for (const [stepName, stepData] of Object.entries(result.steps)) {
      if (!stepData.success && stepData.error) {
        const key = `${stepName}: ${stepData.error}`;
        errorCounts[key] = (errorCounts[key] || 0) + 1;
      }
    }

    // Validation errors
    if (result.validation) {
      for (const error of result.validation.errors || []) {
        errorCounts[error] = (errorCounts[error] || 0) + 1;
      }
      for (const warning of result.validation.warnings || []) {
        warningCounts[warning] = (warningCounts[warning] || 0) + 1;
      }
    }
  }

  // Failed users
  const failedUsers = results.filter(r => !r.success);

  // Print report
  console.log('🏆 OVERALL RESULTS');
  console.log('─'.repeat(50));
  console.log(`Test Timestamp: ${new Date(timestamp).toLocaleString()}`);
  console.log(`Total Users Tested: ${totalUsers}`);
  console.log(`Successful Registrations: ${successfulRegistrations}/${totalUsers} (${successRate}%)`);
  console.log(`Total Test Duration: ${formatDuration(totalDuration)}`);
  console.log(`Average Time Per User: ${formatDuration(avgDurations.total)}`);
  console.log('');

  console.log('📈 STEP SUCCESS RATES');
  console.log('─'.repeat(50));
  for (const [step, count] of Object.entries(stepSuccessRates)) {
    const rate = Math.round((count / totalUsers) * 100);
    const emoji = rate >= 95 ? '✅' : rate >= 80 ? '⚠️' : '❌';
    console.log(`${emoji} ${formatStepName(step)}: ${count}/${totalUsers} (${rate}%)`);
  }
  console.log('');

  console.log('⏱️  AVERAGE STEP DURATIONS');
  console.log('─'.repeat(50));
  for (const [step, duration] of Object.entries(avgDurations)) {
    console.log(`  ${formatStepName(step)}: ${formatDuration(duration)}`);
  }
  console.log('');

  console.log('✔️  VALIDATION CHECKS');
  console.log('─'.repeat(50));
  for (const [check, count] of Object.entries(validationStats)) {
    const rate = Math.round((count / totalUsers) * 100);
    const emoji = rate >= 95 ? '✅' : rate >= 80 ? '⚠️' : '❌';
    console.log(`${emoji} ${formatCheckName(check)}: ${count}/${totalUsers} (${rate}%)`);
  }
  console.log('');

  if (Object.keys(errorCounts).length > 0) {
    console.log('❌ ERRORS ENCOUNTERED');
    console.log('─'.repeat(50));
    const sortedErrors = Object.entries(errorCounts).sort((a, b) => b[1] - a[1]);
    for (const [error, count] of sortedErrors.slice(0, 10)) {
      console.log(`  [${count}x] ${error}`);
    }
    if (sortedErrors.length > 10) {
      console.log(`  ... and ${sortedErrors.length - 10} more error types`);
    }
    console.log('');
  }

  if (Object.keys(warningCounts).length > 0) {
    console.log('⚠️  WARNINGS');
    console.log('─'.repeat(50));
    const sortedWarnings = Object.entries(warningCounts).sort((a, b) => b[1] - a[1]);
    for (const [warning, count] of sortedWarnings.slice(0, 10)) {
      console.log(`  [${count}x] ${warning}`);
    }
    if (sortedWarnings.length > 10) {
      console.log(`  ... and ${sortedWarnings.length - 10} more warning types`);
    }
    console.log('');
  }

  if (failedUsers.length > 0) {
    console.log('🔴 FAILED USERS');
    console.log('─'.repeat(50));
    for (const result of failedUsers.slice(0, 20)) {
      console.log(`  ${result.user.email}`);
      // Show first error
      for (const [stepName, stepData] of Object.entries(result.steps)) {
        if (!stepData.success && stepData.error) {
          console.log(`    ↳ ${stepName}: ${stepData.error}`);
          break;
        }
      }
    }
    if (failedUsers.length > 20) {
      console.log(`  ... and ${failedUsers.length - 20} more failed users`);
    }
    console.log('');
  }

  // Distribution analysis
  console.log('📊 USER DISTRIBUTION');
  console.log('─'.repeat(50));

  const goalCounts: Record<string, number> = {};
  const experienceCounts: Record<string, number> = {};
  const dietCounts: Record<string, number> = {};

  for (const result of results) {
    const goal = result.user.goals[0];
    const experience = result.user.experience;
    const diet = result.user.diet;

    goalCounts[goal] = (goalCounts[goal] || 0) + 1;
    experienceCounts[experience] = (experienceCounts[experience] || 0) + 1;
    dietCounts[diet] = (dietCounts[diet] || 0) + 1;
  }

  console.log('Goals:');
  for (const [goal, count] of Object.entries(goalCounts)) {
    console.log(`  ${goal}: ${count} (${Math.round((count / totalUsers) * 100)}%)`);
  }

  console.log('\nExperience:');
  for (const [exp, count] of Object.entries(experienceCounts)) {
    console.log(`  ${exp}: ${count} (${Math.round((count / totalUsers) * 100)}%)`);
  }

  console.log('\nDiet:');
  for (const [diet, count] of Object.entries(dietCounts)) {
    console.log(`  ${diet}: ${count} (${Math.round((count / totalUsers) * 100)}%)`);
  }
  console.log('');

  console.log('═══════════════════════════════════════════════════\n');

  // Export summary
  const summary = {
    timestamp,
    totalUsers,
    successfulRegistrations,
    successRate,
    totalDuration,
    avgDurations,
    stepSuccessRates,
    validationStats,
    errorCounts,
    warningCounts,
    failedUserCount: failedUsers.length,
  };

  const summaryPath = resultsPath.replace('.json', '-summary.json');
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

  console.log(`📄 Summary saved to: ${summaryPath}\n`);
}

/**
 * Helper: Calculate average
 */
function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return Math.round(numbers.reduce((sum, n) => sum + n, 0) / numbers.length);
}

/**
 * Helper: Format duration
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

/**
 * Helper: Format step name
 */
function formatStepName(step: string): string {
  return step
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Helper: Format check name
 */
function formatCheckName(check: string): string {
  return check
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// CLI execution
const args = process.argv.slice(2);
const resultsPath = args[0];

if (!resultsPath) {
  console.error('Usage: npx ts-node test-results-report.ts <results-file.json>');
  process.exit(1);
}

generateReport(resultsPath)
  .then(() => {
    console.log('✅ Report generated');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Report error:', error);
    process.exit(1);
  });
