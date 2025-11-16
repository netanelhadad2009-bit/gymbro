#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const ROOT = process.cwd();
const INCLUDE = ['**/*.{ts,tsx,js,jsx,mjs,cjs,css,scss,pcss,md,mdx,json,yml,yaml,env,html}'];
const EXCLUDE = [
  '**/node_modules/**',
  '**/.next/**',
  '**/.turbo/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/*.png',
  '**/*.jpg',
  '**/*.jpeg',
  '**/*.webp',
  '**/*.svg',
  '**/*.ico',
  '**/*.map',
  '**/pnpm-lock.yaml',
  '**/test-results-*.json'
];

// Replacement matrix (no pricing/currency)
const rules = [
  // Brand name in text/UI (case-sensitive variations)
  { pattern: /\bGymBro\b/g, replace: 'FitJourney', note: 'TitleCase brand' },
  { pattern: /\bGym Bro\b/g, replace: 'FitJourney', note: 'Spaced TitleCase' },
  { pattern: /\bgym bro\b/gi, replace: 'FitJourney', note: 'Lower/mixed case' },
  { pattern: /\bGYMBRO\b/g, replace: 'FITJOURNEY', note: 'ALL CAPS' },

  // Slugs and identifiers
  { pattern: /\bgymbro\b/g, replace: 'fitjourney', note: 'Lowercase slug' },
  { pattern: /\bgym-bro\b/gi, replace: 'fitjourney', note: 'Hyphenated slug' },
  { pattern: /\bgym_bro\b/gi, replace: 'fitjourney', note: 'Underscored slug' },

  // Package names
  { pattern: /@gymbro\//g, replace: '@fitjourney/', note: 'Package namespace' },

  // App identifiers (keep for now, document for later change)
  { pattern: /com\.gymbro\./g, replace: 'com.fitjourney.', note: 'Bundle ID - REQUIRES STORE UPDATE', skipFiles: ['capacitor.config.ts', 'capacitor.config.json'] },

  // Storage keys
  { pattern: /gymbro:/g, replace: 'fitjourney:', note: 'Storage key prefix' },

  // Test domains
  { pattern: /gymbro-test\.com/g, replace: 'fitjourney-test.com', note: 'Test email domain' },
  { pattern: /gymbro\.loca\.lt/g, replace: 'fitjourney.loca.lt', note: 'Local tunnel domain' },

  // Dev flags
  { pattern: /__GYMBRO_/g, replace: '__FITJOURNEY_', note: 'Dev flags' },

  // Environment variable values
  { pattern: /(NEXT_PUBLIC_APP_NAME\s*=\s*["']?)GymBro(["']?)/g, replace: '$1FitJourney$2', note: 'Env var value' },

  // Fallback strings in code
  { pattern: /process\.env\.NEXT_PUBLIC_APP_NAME\s*\?\?\s*['"]GymBro['"]/g,
    replace: "process.env.NEXT_PUBLIC_APP_NAME ?? 'FitJourney'",
    note: 'Fallback brand name'
  },
];

// Files that need special handling or manual review
const REVIEW_REQUIRED = [
  'capacitor.config.ts',
  'capacitor.config.json',
  'Info.plist',
  'AndroidManifest.xml',
  '.env',
  '.env.local',
  '.env.production'
];

// Legacy allowlist (files where old brand can remain)
const LEGACY_ALLOWLIST = [
  '**/migrations/**',
  '**/test-results-*.json',
  '**/.git/**'
];

async function auditFiles(dryRun = true) {
  console.log('🔍 Starting FitJourney brand rename audit...\n');

  const files = globSync(INCLUDE, {
    ignore: EXCLUDE,
    dot: true,
    absolute: false,
    cwd: ROOT
  });

  const report = [];
  const reviewFiles = [];
  let totalReplacements = 0;

  for (const file of files) {
    const absPath = path.join(ROOT, file);
    const content = fs.readFileSync(absPath, 'utf8');
    let newContent = content;
    let fileReplacements = 0;

    // Check if file needs manual review
    if (REVIEW_REQUIRED.some(pattern => file.includes(pattern))) {
      reviewFiles.push(file);
    }

    // Apply replacement rules
    for (const rule of rules) {
      if (rule.skipFiles && rule.skipFiles.some(skip => file.includes(skip))) {
        continue;
      }

      const matches = content.match(rule.pattern);
      if (matches) {
        fileReplacements += matches.length;

        if (typeof rule.replace === 'string') {
          newContent = newContent.replace(rule.pattern, rule.replace);
        } else {
          newContent = newContent.replace(rule.pattern, rule.replace);
        }
      }
    }

    if (fileReplacements > 0) {
      totalReplacements += fileReplacements;
      report.push({
        file: file,
        replacements: fileReplacements,
        status: dryRun ? 'pending' : 'updated'
      });

      if (!dryRun) {
        fs.writeFileSync(absPath, newContent);
      }
    }
  }

  // Generate file/folder rename plan
  const renamePlan = [];

  // Check for directories/files that need renaming
  const pathsToRename = [
    ['apps/gymbro', 'apps/fitjourney'],
    ['packages/gymbro', 'packages/fitjourney'],
    ['public/gymbro', 'public/fitjourney'],
    ['public/gym-bro', 'public/fitjourney'],
  ];

  for (const [from, to] of pathsToRename) {
    const fromPath = path.join(ROOT, from);
    if (fs.existsSync(fromPath)) {
      renamePlan.push([from, to]);
    }
  }

  // Print report
  console.log('📊 FitJourney Brand Rename Report\n');
  console.log('─'.repeat(80));

  if (report.length > 0) {
    console.table(report.slice(0, 20)); // Show first 20 files

    if (report.length > 20) {
      console.log(`... and ${report.length - 20} more files\n`);
    }
  }

  console.log('─'.repeat(80));
  console.log(`\n📈 Summary:`);
  console.log(`  • Total files to update: ${report.length}`);
  console.log(`  • Total replacements: ${totalReplacements}`);
  console.log(`  • Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}\n`);

  if (reviewFiles.length > 0) {
    console.log('⚠️  Files requiring manual review:');
    reviewFiles.forEach(f => console.log(`  • ${f}`));
    console.log('');
  }

  if (renamePlan.length > 0) {
    console.log('📁 Directories/Files to rename (run manually):');
    renamePlan.forEach(([from, to]) => {
      console.log(`  git mv "${from}" "${to}"`);
    });
    console.log('');
  }

  // Validation commands
  console.log('✅ Post-rename validation commands:');
  console.log('  1. rg -i "(gym\\s?bro|gym-bro|gymbro|GYMBRO)" -g "!{node_modules,.next,.turbo,dist,build,.git,migrations}"');
  console.log('  2. pnpm install');
  console.log('  3. pnpm build');
  console.log('  4. pnpm test\n');

  return { report, totalReplacements, reviewFiles, renamePlan };
}

// Analytics compatibility layer
function generateAnalyticsHelper() {
  return `
// lib/analytics.ts - Temporary dual-emit for analytics migration
export function trackEvent(event: string, props: Record<string, any> = {}) {
  const newEvent = event.replace(/^gymbro_/, 'fitjourney_');

  // Emit both old and new event names during transition
  if (event !== newEvent) {
    // Old event for existing dashboards
    (window as any).gtag?.('event', event, { ...props, _legacy: true });
  }

  // New event name
  (window as any).gtag?.('event', newEvent, props);

  // TODO: Remove dual emit after dashboards are updated (target: 2 weeks)
  // Tracking started: ${new Date().toISOString()}
}
`;
}

// Main execution
const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');

if (!isDryRun) {
  console.log('⚠️  WARNING: Running in EXECUTE mode. This will modify files!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

  setTimeout(async () => {
    await auditFiles(false);

    // Write analytics helper
    const analyticsPath = path.join(ROOT, 'apps/web/lib/analytics-helper.ts');
    fs.writeFileSync(analyticsPath, generateAnalyticsHelper());
    console.log('✅ Created analytics compatibility layer at:', analyticsPath);
  }, 5000);
} else {
  console.log('Running in DRY RUN mode. Use --execute to apply changes.\n');
  auditFiles(true);
}