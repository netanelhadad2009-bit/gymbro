#!/usr/bin/env npx tsx
/**
 * Push Notification Test Script
 *
 * Usage:
 *   npx tsx scripts/test-push.ts [options]
 *
 * Options:
 *   --device-token <token>  Send directly to iOS device token
 *   --user-id <id>          Send to specific user via database
 *   --title <title>         Notification title (default: "Test Push")
 *   --body <body>           Notification body (default: "This is a test notification")
 *   --config                 Show APNs configuration status
 *
 * Examples:
 *   npx tsx scripts/test-push.ts --config
 *   npx tsx scripts/test-push.ts --device-token abc123...
 *   npx tsx scripts/test-push.ts --user-id user-uuid-here
 *
 * Environment Variables:
 *   APNS_KEY_ID      - APNs Key ID from Apple Developer Portal
 *   APNS_TEAM_ID     - Apple Developer Team ID
 *   APNS_KEY_P8      - Base64-encoded .p8 key content
 *   APNS_BUNDLE_ID   - App bundle ID (default: com.fitjourney.app)
 *   ADMIN_SECRET     - Admin secret for API authentication
 *   API_URL          - API base URL (default: http://localhost:3000)
 */

import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

const API_URL = process.env.API_URL || 'http://localhost:3000';
const ADMIN_SECRET = process.env.ADMIN_SECRET;

interface ParsedArgs {
  deviceToken?: string;
  userId?: string;
  title: string;
  body: string;
  config: boolean;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const result: ParsedArgs = {
    title: 'Test Push',
    body: 'This is a test notification from FitJourney',
    config: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--device-token':
        result.deviceToken = args[++i];
        break;
      case '--user-id':
        result.userId = args[++i];
        break;
      case '--title':
        result.title = args[++i];
        break;
      case '--body':
        result.body = args[++i];
        break;
      case '--config':
        result.config = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return result;
}

function printHelp() {
  console.log(`
Push Notification Test Script

Usage:
  npx tsx scripts/test-push.ts [options]

Options:
  --device-token <token>  Send directly to iOS device token
  --user-id <id>          Send to specific user via database
  --title <title>         Notification title
  --body <body>           Notification body
  --config                Show APNs configuration status
  --help, -h              Show this help message

Examples:
  npx tsx scripts/test-push.ts --config
  npx tsx scripts/test-push.ts --device-token abc123...
  npx tsx scripts/test-push.ts --user-id user-uuid-here
  `);
}

async function checkConfig() {
  console.log('\n--- APNs Configuration Status ---\n');

  const apnsConfigured = !!(
    process.env.APNS_KEY_ID &&
    process.env.APNS_TEAM_ID &&
    process.env.APNS_KEY_P8
  );

  console.log(`APNs Configured: ${apnsConfigured ? '✅ Yes' : '❌ No'}`);

  if (process.env.APNS_KEY_ID) {
    console.log(`  Key ID: ***${process.env.APNS_KEY_ID.slice(-4)}`);
  } else {
    console.log('  Key ID: ❌ Missing (APNS_KEY_ID)');
  }

  if (process.env.APNS_TEAM_ID) {
    console.log(`  Team ID: ***${process.env.APNS_TEAM_ID.slice(-4)}`);
  } else {
    console.log('  Team ID: ❌ Missing (APNS_TEAM_ID)');
  }

  if (process.env.APNS_KEY_P8) {
    const keyLength = process.env.APNS_KEY_P8.length;
    console.log(`  Private Key: ✅ Present (${keyLength} chars)`);
  } else {
    console.log('  Private Key: ❌ Missing (APNS_KEY_P8)');
  }

  console.log(`  Bundle ID: ${process.env.APNS_BUNDLE_ID || 'com.fitjourney.app (default)'}`);

  console.log('\n--- Web Push Configuration ---\n');

  const webPushConfigured = !!(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY
  );

  console.log(`Web Push Configured: ${webPushConfigured ? '✅ Yes' : '❌ No'}`);

  if (process.env.VAPID_PUBLIC_KEY) {
    console.log(`  Public Key: ***${process.env.VAPID_PUBLIC_KEY.slice(-8)}`);
  } else {
    console.log('  Public Key: ❌ Missing (VAPID_PUBLIC_KEY)');
  }

  console.log('\n--- Admin Configuration ---\n');

  if (ADMIN_SECRET) {
    console.log(`Admin Secret: ✅ Configured`);
  } else {
    console.log('Admin Secret: ⚠️  Not set (ADMIN_SECRET) - API calls will require auth');
  }

  // Try to get stats from API
  console.log('\n--- Fetching API Stats ---\n');

  try {
    const response = await fetch(`${API_URL}/api/push/send`, {
      method: 'GET',
      headers: {
        ...(ADMIN_SECRET && { 'x-admin-secret': ADMIN_SECRET })
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('API Response:', JSON.stringify(data, null, 2));
    } else {
      console.log(`API returned ${response.status}: ${await response.text()}`);
    }
  } catch (error: any) {
    console.log(`Could not reach API at ${API_URL}: ${error.message}`);
    console.log('(Make sure the dev server is running with: pnpm dev)');
  }
}

async function sendTestPush(args: ParsedArgs) {
  console.log('\n--- Sending Test Push Notification ---\n');

  const payload: Record<string, any> = {
    title: args.title,
    body: args.body,
    type: 'test',
    route: '/'
  };

  if (args.deviceToken) {
    payload.deviceToken = args.deviceToken;
    console.log(`Target: Direct device token (${args.deviceToken.substring(0, 16)}...)`);
  } else if (args.userId) {
    payload.userId = args.userId;
    console.log(`Target: User ${args.userId.substring(0, 8)}...`);
  } else {
    console.log('Target: Current authenticated user');
  }

  console.log(`Title: ${args.title}`);
  console.log(`Body: ${args.body}`);
  console.log('');

  try {
    const response = await fetch(`${API_URL}/api/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ADMIN_SECRET && { 'x-admin-secret': ADMIN_SECRET })
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.ok) {
      console.log('✅ Push notification sent successfully!');
      console.log('Result:', JSON.stringify(data.result, null, 2));
    } else {
      console.log('❌ Failed to send push notification');
      console.log('Error:', data.error || JSON.stringify(data, null, 2));
    }

    if (data.apnsConfigured === false) {
      console.log('\n⚠️  APNs is not configured. iOS push notifications will not work.');
      console.log('Run with --config to see what environment variables are missing.');
    }

  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    console.log(`\nMake sure the dev server is running at ${API_URL}`);
  }
}

async function main() {
  const args = parseArgs();

  console.log('='.repeat(50));
  console.log('FitJourney Push Notification Test');
  console.log('='.repeat(50));

  if (args.config) {
    await checkConfig();
  } else if (args.deviceToken || args.userId || ADMIN_SECRET) {
    await sendTestPush(args);
  } else {
    console.log('\nNo target specified and no ADMIN_SECRET configured.');
    console.log('Options:');
    console.log('  1. Set ADMIN_SECRET in .env.local and run again');
    console.log('  2. Use --device-token <token> to send directly to a device');
    console.log('  3. Use --user-id <id> with ADMIN_SECRET to target a specific user');
    console.log('  4. Run with --config to check configuration status');
    console.log('\nRun with --help for more options.');
  }
}

main().catch(console.error);
