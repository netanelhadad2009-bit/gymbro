#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

// Configuration
const ROOT = process.cwd();
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// File patterns to include
const INCLUDE_PATTERNS = [
  '**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx',
  '**/*.mjs', '**/*.cjs', '**/*.cts', '**/*.mts',
  '**/*.json', '**/*.md', '**/*.mdx',
  '**/*.yml', '**/*.yaml', '**/*.env', '**/.env.*',
  '**/*.html', '**/*.css', '**/*.scss', '**/*.less',
  '**/*.sh', '**/Dockerfile', '**/*.dockerfile'
];

// Directories to exclude
const EXCLUDE_DIRS = [
  'node_modules', '.next', '.turbo', 'dist', 'build',
  '.git', 'coverage', '.vercel', '.output', 'out'
];

// Files that need manual review
const REVIEW_REQUIRED = [
  'capacitor.config.ts',
  'capacitor.config.json',
  'Info.plist',
  'AndroidManifest.xml',
  'GoogleService-Info.plist',
  'project.pbxproj'
];

// Files to skip entirely
const SKIP_FILES = [
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'test-results-*.json',
  '*.map',
  '*.min.js'
];

// Replacement rules
const REPLACEMENT_RULES = [
  // Brand name in text/UI (case-sensitive)
  { pattern: /\bGymBro\b/g, replace: 'FitJourney', category: 'TitleCase brand' },
  { pattern: /\bGym Bro\b/g, replace: 'FitJourney', category: 'Spaced TitleCase' },
  { pattern: /\bgym bro\b/gi, replace: 'FitJourney', category: 'Lower/mixed case' },
  { pattern: /\bGYMBRO\b/g, replace: 'FITJOURNEY', category: 'ALL CAPS' },

  // Slugs and identifiers
  { pattern: /\bgymbro\b/g, replace: 'fitjourney', category: 'Lowercase slug' },
  { pattern: /\bgym-bro\b/gi, replace: 'fitjourney', category: 'Hyphenated slug' },
  { pattern: /\bgym_bro\b/gi, replace: 'fitjourney', category: 'Underscored slug' },

  // Package names
  { pattern: /@gymbro\//g, replace: '@fitjourney/', category: 'Package namespace' },

  // App identifiers (conditional)
  {
    pattern: /com\.gymbro\./g,
    replace: 'com.fitjourney.',
    category: 'Bundle ID',
    skipInFiles: ['capacitor.config.ts', 'capacitor.config.json', 'Info.plist', 'project.pbxproj'],
    reviewOnly: true
  },

  // Storage keys
  { pattern: /gymbro:/g, replace: 'fitjourney:', category: 'Storage key prefix' },

  // Test domains
  { pattern: /gymbro-test\.com/g, replace: 'fitjourney-test.com', category: 'Test domain' },
  { pattern: /gymbro\.loca\.lt/g, replace: 'fitjourney.loca.lt', category: 'Local tunnel' },

  // Dev flags
  { pattern: /__GYMBRO_/g, replace: '__FITJOURNEY_', category: 'Dev flags' },

  // Env variable values
  {
    pattern: /(NEXT_PUBLIC_APP_NAME\s*=\s*["']?)GymBro(["']?)/g,
    replace: '$1FitJourney$2',
    category: 'Env var value'
  },

  // Fallback strings
  {
    pattern: /process\.env\.NEXT_PUBLIC_APP_NAME\s*\?\?\s*['"]GymBro['"]/g,
    replace: "process.env.NEXT_PUBLIC_APP_NAME ?? 'FitJourney'",
    category: 'Fallback brand'
  },

  // File references
  { pattern: /gym bro \(1\)\.png/g, replace: 'fitjourney.png', category: 'Asset filename' },
];

// Helper functions
function shouldSkipFile(filePath) {
  const basename = path.basename(filePath);

  // Check if file matches skip patterns
  for (const pattern of SKIP_FILES) {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      if (regex.test(basename)) return true;
    } else if (basename === pattern) {
      return true;
    }
  }

  // Skip migrations
  if (filePath.includes('/migrations/')) return true;
  if (filePath.includes('/.git/')) return true;
  if (filePath.includes('/test-results-')) return true;

  return false;
}

function needsReview(filePath) {
  const basename = path.basename(filePath);
  return REVIEW_REQUIRED.some(file => basename === file || filePath.includes(file));
}

function applyReplacements(content, filePath) {
  let newContent = content;
  const changes = [];
  const isReviewFile = needsReview(filePath);

  for (const rule of REPLACEMENT_RULES) {
    // Skip if this rule shouldn't apply to this file
    if (rule.skipInFiles && rule.skipInFiles.some(skip => filePath.includes(skip))) {
      continue;
    }

    // For review-only rules in non-review files, skip
    if (rule.reviewOnly && !isReviewFile) {
      continue;
    }

    const matches = content.match(rule.pattern);
    if (matches && matches.length > 0) {
      if (isReviewFile && rule.reviewOnly) {
        changes.push({
          category: rule.category,
          count: matches.length,
          pattern: rule.pattern.source,
          reviewOnly: true
        });
      } else {
        newContent = newContent.replace(rule.pattern, rule.replace);
        changes.push({
          category: rule.category,
          count: matches.length,
          pattern: rule.pattern.source
        });
      }
    }
  }

  return { newContent, changes };
}

function getFiles() {
  const files = [];

  for (const pattern of INCLUDE_PATTERNS) {
    const matches = globSync(pattern, {
      ignore: EXCLUDE_DIRS.map(dir => `**/${dir}/**`),
      dot: true,
      absolute: false,
      cwd: ROOT
    });
    files.push(...matches);
  }

  // Remove duplicates and filter
  return [...new Set(files)].filter(file => !shouldSkipFile(file));
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

function printSummary(results, mode) {
  console.log('\n' + '='.repeat(80));
  console.log(`${COLORS.bright}📊 FitJourney Brand Rename Report${COLORS.reset}`);
  console.log('='.repeat(80) + '\n');

  // Group by category
  const categoryStats = {};
  let totalChanges = 0;
  let totalFiles = 0;

  results.forEach(result => {
    if (result.changes.length > 0) {
      totalFiles++;
      result.changes.forEach(change => {
        if (!categoryStats[change.category]) {
          categoryStats[change.category] = { count: 0, files: 0 };
        }
        categoryStats[change.category].count += change.count;
        categoryStats[change.category].files++;
        if (!change.reviewOnly) {
          totalChanges += change.count;
        }
      });
    }
  });

  // Print category table
  console.log(`${COLORS.cyan}📝 Changes by Category:${COLORS.reset}`);
  console.log('-'.repeat(60));
  Object.entries(categoryStats).forEach(([category, stats]) => {
    console.log(`  ${category.padEnd(25)} ${stats.count.toString().padStart(5)} occurrences in ${stats.files} files`);
  });
  console.log('-'.repeat(60));

  // Files needing review
  const reviewFiles = results.filter(r => r.needsReview);
  if (reviewFiles.length > 0) {
    console.log(`\n${COLORS.yellow}⚠️  Files Requiring Manual Review (${reviewFiles.length}):${COLORS.reset}`);
    reviewFiles.forEach(r => {
      console.log(`  • ${r.file}`);
      if (r.changes.some(c => c.reviewOnly)) {
        console.log(`    ${COLORS.dim}(Contains bundle IDs or external contracts)${COLORS.reset}`);
      }
    });
  }

  // Summary stats
  console.log(`\n${COLORS.green}📈 Summary:${COLORS.reset}`);
  console.log(`  • Total files scanned: ${results.length}`);
  console.log(`  • Files to modify: ${totalFiles}`);
  console.log(`  • Total replacements: ${totalChanges}`);
  console.log(`  • Mode: ${mode === 'check' ? `${COLORS.yellow}CHECK MODE (no files modified)${COLORS.reset}` : `${COLORS.red}APPLY MODE (files will be modified)${COLORS.reset}`}`);

  // Path renames detected
  const pathRenames = detectPathRenames(results);
  if (pathRenames.length > 0) {
    console.log(`\n${COLORS.magenta}📁 Suggested Path Renames:${COLORS.reset}`);
    pathRenames.forEach(rename => {
      console.log(`  git mv "${rename.from}" "${rename.to}"`);
    });
  }

  return {
    totalFilesScanned: results.length,
    filesChanged: totalFiles,
    totalReplacements: totalChanges,
    categoryStats,
    reviewFiles: reviewFiles.map(r => r.file),
    pathRenames
  };
}

function detectPathRenames(results) {
  const renames = [];

  // Check for package names that should be renamed
  results.forEach(r => {
    if (r.file.includes('@gymbro/')) {
      const newPath = r.file.replace('@gymbro/', '@fitjourney/');
      if (!renames.some(rename => rename.from === r.file)) {
        renames.push({ from: r.file, to: newPath });
      }
    }
  });

  return renames;
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--apply') ? 'apply' : 'check';

  console.log(`${COLORS.bright}🚀 Starting FitJourney Brand Rename Tool${COLORS.reset}`);
  console.log(`Mode: ${mode === 'check' ? 'CHECK (dry run)' : 'APPLY (will modify files)'}\n`);

  if (mode === 'apply') {
    console.log(`${COLORS.yellow}⚠️  WARNING: This will modify files in place!${COLORS.reset}`);
    console.log('Press Ctrl+C to abort, or wait 3 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Get all files
  console.log('Scanning files...');
  const files = getFiles();
  console.log(`Found ${files.length} files to check\n`);

  // Process files
  const results = [];
  let processedCount = 0;

  for (const file of files) {
    const filePath = path.join(ROOT, file);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const { newContent, changes } = applyReplacements(content, file);

      const result = {
        file,
        changes,
        needsReview: needsReview(file),
        modified: content !== newContent
      };

      if (mode === 'apply' && result.modified && !result.needsReview) {
        fs.writeFileSync(filePath, newContent);
        console.log(`${COLORS.green}✓${COLORS.reset} Modified: ${file}`);
      }

      results.push(result);

      processedCount++;
      if (processedCount % 100 === 0) {
        process.stdout.write(`\rProcessed ${processedCount}/${files.length} files...`);
      }
    } catch (error) {
      console.error(`${COLORS.red}✗${COLORS.reset} Error processing ${file}: ${error.message}`);
    }
  }

  process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear progress line

  // Print summary
  const summary = printSummary(results, mode);

  // Write JSON summary
  const jsonSummary = {
    timestamp: new Date().toISOString(),
    mode,
    ...summary
  };

  const summaryPath = path.join(ROOT, 'brand-rename-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(jsonSummary, null, 2));
  console.log(`\n${COLORS.cyan}📄 Summary written to: ${summaryPath}${COLORS.reset}`);

  // Post-rename validation commands
  console.log(`\n${COLORS.bright}✅ Next Steps:${COLORS.reset}`);
  if (mode === 'check') {
    console.log('  1. Review the report above');
    console.log('  2. Run with --apply to make changes:');
    console.log(`     ${COLORS.cyan}node scripts/renameBrandV2.js --apply${COLORS.reset}`);
  } else {
    console.log('  1. Review modified files with git:');
    console.log(`     ${COLORS.cyan}git diff${COLORS.reset}`);
    console.log('  2. Test the build:');
    console.log(`     ${COLORS.cyan}pnpm build${COLORS.reset}`);
    console.log('  3. Verify no remaining references:');
    console.log(`     ${COLORS.cyan}rg -i "(gym\\s?bro|gym-bro|gymbro|GYMBRO)" -g "!{node_modules,.next,.turbo,dist,build,.git,migrations}"${COLORS.reset}`);
    console.log('  4. Commit changes:');
    console.log(`     ${COLORS.cyan}git add -A && git commit -m "chore: rename brand from GymBro to FitJourney"${COLORS.reset}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('Done! 🎉\n');

  process.exit(0);
}

// Run the script
main().catch(error => {
  console.error(`${COLORS.red}Fatal error: ${error.message}${COLORS.reset}`);
  console.error(error.stack);
  process.exit(1);
});