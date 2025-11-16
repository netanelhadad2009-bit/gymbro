#!/usr/bin/env node
/**
 * Stability Test Orchestration Script
 *
 * Runs Playwright stability tests multiple times and generates reports.
 *
 * Usage:
 *   pnpm stability
 *   DEV_SERVER_URL=http://localhost:3000 pnpm stability
 *   ITERATIONS=5 pnpm stability
 */

import { execaCommand } from 'execa';
import * as fs from 'fs';
import * as path from 'path';

const ITERATIONS = parseInt(process.env.ITERATIONS || '3', 10);
const DEV_SERVER_URL = process.env.DEV_SERVER_URL || 'http://localhost:3000';
const RESULTS_DIR = path.join(__dirname);

interface TestRun {
  iteration: number;
  timestamp: string;
  success: boolean;
  duration: number;
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function main() {
  console.log('=== GymBro Stability Test Suite ===\n');
  console.log(`Iterations: ${ITERATIONS}`);
  console.log(`Dev Server: ${DEV_SERVER_URL}`);
  console.log(`Working Directory: ${process.cwd()}\n`);

  const results: TestRun[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (let i = 1; i <= ITERATIONS; i++) {
    console.log(`\n[${'='.repeat(50)}]`);
    console.log(`Iteration ${i}/${ITERATIONS}`);
    console.log(`[${'='.repeat(50)}]\n`);

    const startTime = Date.now();
    let success = false;
    let exitCode = 0;
    let stdout = '';
    let stderr = '';

    try {
      // Run Playwright tests with chaos mode enabled
      const result = await execaCommand(
        `cross-env NEXT_PUBLIC_CHAOS=1 PW_BASE_URL=${DEV_SERVER_URL} playwright test e2e/stability.spec.ts`,
        {
          cwd: path.join(__dirname, '../apps/web'),
          shell: true,
          all: true,
          reject: false, // Don't throw on non-zero exit
        }
      );

      exitCode = result.exitCode ?? 0;
      stdout = result.stdout || '';
      stderr = result.stderr || '';
      success = exitCode === 0;

      if (success) {
        console.log(`✅ Iteration ${i} PASSED`);
        totalPassed++;
      } else {
        console.log(`❌ Iteration ${i} FAILED (exit code: ${exitCode})`);
        totalFailed++;
      }
    } catch (error: any) {
      console.error(`❌ Iteration ${i} FAILED with exception:`, error.message);
      success = false;
      exitCode = error.exitCode || 1;
      stderr = error.stderr || error.message;
      totalFailed++;
    }

    const duration = Date.now() - startTime;

    results.push({
      iteration: i,
      timestamp: new Date().toISOString(),
      success,
      duration,
      exitCode,
      stdout,
      stderr,
    });

    // Brief pause between iterations
    if (i < ITERATIONS) {
      console.log('\nWaiting 2s before next iteration...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Generate reports
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const jsonFile = path.join(RESULTS_DIR, `stability-results-${timestamp}.json`);
  const mdFile = path.join(RESULTS_DIR, `stability-summary-${timestamp}.md`);

  // Write JSON results
  fs.writeFileSync(jsonFile, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n📄 JSON results written to: ${jsonFile}`);

  // Generate Markdown summary
  const mdContent = generateMarkdownSummary(results, totalPassed, totalFailed);
  fs.writeFileSync(mdFile, mdContent, 'utf-8');
  console.log(`📄 Markdown summary written to: ${mdFile}`);

  // Print summary to console
  console.log('\n' + mdContent);

  // Exit with error if any tests failed
  if (totalFailed > 0) {
    console.error(`\n❌ ${totalFailed} iteration(s) failed. See reports for details.`);
    process.exit(1);
  } else {
    console.log(`\n✅ All ${totalPassed} iteration(s) passed!`);
    process.exit(0);
  }
}

function generateMarkdownSummary(results: TestRun[], totalPassed: number, totalFailed: number): string {
  const timestamp = new Date().toISOString();
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  let md = `# Stability Test Summary\n\n`;
  md += `**Date:** ${timestamp}\n`;
  md += `**Iterations:** ${results.length}\n`;
  md += `**Passed:** ${totalPassed} ✅\n`;
  md += `**Failed:** ${totalFailed} ❌\n`;
  md += `**Success Rate:** ${((totalPassed / results.length) * 100).toFixed(1)}%\n`;
  md += `**Avg Duration:** ${(avgDuration / 1000).toFixed(1)}s\n\n`;

  md += `---\n\n`;

  md += `## Results by Iteration\n\n`;
  md += `| Iteration | Status | Duration | Exit Code |\n`;
  md += `|-----------|--------|----------|----------|\n`;

  for (const result of results) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const duration = (result.duration / 1000).toFixed(1) + 's';
    md += `| ${result.iteration} | ${status} | ${duration} | ${result.exitCode} |\n`;
  }

  md += `\n---\n\n`;

  md += `## Failed Iterations\n\n`;
  const failures = results.filter(r => !r.success);

  if (failures.length === 0) {
    md += `✅ No failures!\n\n`;
  } else {
    for (const failure of failures) {
      md += `### Iteration ${failure.iteration}\n\n`;
      md += `**Exit Code:** ${failure.exitCode}\n\n`;
      md += `**Stderr:**\n\`\`\`\n${failure.stderr.slice(0, 1000)}\n\`\`\`\n\n`;
    }
  }

  md += `---\n\n`;
  md += `## Notes\n\n`;
  md += `- Tests run with \`NEXT_PUBLIC_CHAOS=1\` to enable chaos injection\n`;
  md += `- Each iteration runs all stability tests from \`e2e/stability.spec.ts\`\n`;
  md += `- Failures may indicate regression in error handling\n`;
  md += `- See \`${results[0]?.timestamp.split('T')[0]}\` JSON file for full output\n`;

  return md;
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
