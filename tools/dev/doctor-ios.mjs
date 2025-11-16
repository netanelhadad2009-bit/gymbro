#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import http from 'http';

// Color output helpers
const red = (msg) => `\x1b[31m${msg}\x1b[0m`;
const green = (msg) => `\x1b[32m${msg}\x1b[0m`;
const yellow = (msg) => `\x1b[33m${msg}\x1b[0m`;
const bold = (msg) => `\x1b[1m${msg}\x1b[0m`;

// Results storage
const results = {
  devServer: false,
  devServerReachable: false,
  iOSDevice: false,
  deviceUDID: null,
  iproxyRunning: false,
  capacitorConfig: null,
  mobileBootEnabled: false,
};

console.log(bold('\n🔍 iOS USB Development Diagnostics\n'));
console.log('═'.repeat(60));

// Check 1: Next.js dev server running on port 3000
console.log('\n📡 Checking Next.js dev server (port 3000)...');
try {
  const lsofOutput = execSync('lsof -i :3000 -t', { encoding: 'utf-8' }).trim();
  if (lsofOutput) {
    results.devServer = true;
    console.log(green('✅ Dev server process found (PID: ' + lsofOutput.split('\n')[0] + ')'));
  } else {
    console.log(red('❌ No process listening on port 3000'));
    console.log(yellow('   Run: pnpm ios:usb'));
  }
} catch (error) {
  console.log(red('❌ No process listening on port 3000'));
  console.log(yellow('   Run: pnpm ios:usb'));
}

// Check 2: Dev server HTTP reachability
console.log('\n🌐 Testing HTTP connection to localhost:3000...');
await new Promise((resolve) => {
  const req = http.get('http://localhost:3000/api/health', { timeout: 3000 }, (res) => {
    if (res.statusCode === 200) {
      results.devServerReachable = true;
      console.log(green('✅ Dev server reachable at http://localhost:3000/api/health'));
    } else {
      console.log(yellow(`⚠️  Dev server responded with status ${res.statusCode}`));
    }
    resolve();
  });

  req.on('error', (error) => {
    console.log(red('❌ Cannot connect to http://localhost:3000'));
    console.log(yellow('   Error: ' + error.message));
    resolve();
  });

  req.on('timeout', () => {
    req.destroy();
    console.log(red('❌ Connection timeout (3s)'));
    resolve();
  });
});

// Check 3: iOS device detection
console.log('\n📱 Checking iOS device via USB...');
try {
  const devices = execSync('idevice_id -l', { encoding: 'utf-8' }).trim();
  if (devices) {
    results.iOSDevice = true;
    results.deviceUDID = devices.split('\n')[0];
    console.log(green('✅ iOS device detected'));
    console.log('   UDID: ' + results.deviceUDID);
  } else {
    console.log(red('❌ No iOS device detected'));
    console.log(yellow('   Steps:'));
    console.log(yellow('   1. Connect iPhone via USB (use original Apple cable)'));
    console.log(yellow('   2. Unlock iPhone'));
    console.log(yellow('   3. Tap "Trust This Computer"'));
    console.log(yellow('   4. Run: idevicepair pair'));
  }
} catch (error) {
  console.log(red('❌ idevice_id command failed'));
  console.log(yellow('   Run: pnpm bootstrap:ios-usb'));
}

// Check 4: iproxy tunnel
console.log('\n🔌 Checking USB tunnel (iproxy)...');
try {
  const psOutput = execSync('ps aux | grep "iproxy 3000 3000" | grep -v grep', { encoding: 'utf-8' }).trim();
  if (psOutput) {
    results.iproxyRunning = true;
    console.log(green('✅ iproxy tunnel active (3000 → 3000)'));
  } else {
    console.log(red('❌ iproxy tunnel not running'));
    console.log(yellow('   Run: pnpm ios:usb'));
  }
} catch (error) {
  console.log(red('❌ iproxy tunnel not running'));
  console.log(yellow('   Run: pnpm ios:usb'));
}

// Check 5: Capacitor config
console.log('\n⚙️  Checking Capacitor configuration...');
try {
  const configPath = './apps/web/capacitor.config.ts';
  const configContent = await import('fs').then(fs =>
    fs.promises.readFile(configPath, 'utf-8')
  );

  if (configContent.includes('http://localhost:3000')) {
    results.capacitorConfig = 'localhost:3000';
    console.log(green('✅ Capacitor configured for localhost:3000'));
  } else {
    results.capacitorConfig = 'unknown';
    console.log(yellow('⚠️  Capacitor config unclear'));
  }
} catch (error) {
  console.log(yellow('⚠️  Could not read Capacitor config'));
}

// Check 6: MobileBoot overlay
console.log('\n🛡️  Checking MobileBoot failsafe overlay...');
try {
  const mobileBootPath = './apps/web/components/MobileBoot.tsx';
  const mobileBootContent = await import('fs').then(fs =>
    fs.promises.readFile(mobileBootPath, 'utf-8')
  );

  if (mobileBootContent.includes('checkDevServerConnection')) {
    results.mobileBootEnabled = true;
    console.log(green('✅ MobileBoot failsafe overlay enabled'));
  } else {
    console.log(yellow('⚠️  MobileBoot exists but may lack dev server check'));
  }
} catch (error) {
  console.log(yellow('⚠️  MobileBoot component not found'));
}

// Final Summary
console.log('\n' + '═'.repeat(60));
console.log(bold('\n📊 DIAGNOSTIC SUMMARY\n'));

const checks = [
  { name: 'Next.js dev server (port 3000)', pass: results.devServer },
  { name: 'Dev server HTTP reachable', pass: results.devServerReachable },
  { name: 'iOS device detected', pass: results.iOSDevice },
  { name: 'USB tunnel (iproxy) active', pass: results.iproxyRunning },
  { name: 'Capacitor dev URL configured', pass: results.capacitorConfig === 'localhost:3000' },
  { name: 'MobileBoot overlay enabled', pass: results.mobileBootEnabled },
];

checks.forEach(check => {
  const status = check.pass ? green('PASS') : red('FAIL');
  console.log(`${status}  ${check.name}`);
});

const allPass = checks.every(c => c.pass);

console.log('\n' + '═'.repeat(60));

if (allPass) {
  console.log(green(bold('\n✅ ALL CHECKS PASSED - Ready for USB development!\n')));
  console.log('Next steps:');
  console.log('  1. In Xcode: Select your iPhone (🔌 icon)');
  console.log('  2. Press ▶️ Run');
  console.log('  3. App should load http://localhost:3000 with no black screen');
  console.log();
  process.exit(0);
} else {
  console.log(red(bold('\n❌ SOME CHECKS FAILED\n')));
  console.log('Quick fixes:');
  console.log();

  if (!results.devServer || !results.devServerReachable) {
    console.log(yellow('  Dev server issue:'));
    console.log('    pnpm ios:usb');
    console.log();
  }

  if (!results.iOSDevice) {
    console.log(yellow('  Device not detected:'));
    console.log('    1. Connect iPhone via USB');
    console.log('    2. Unlock and tap "Trust This Computer"');
    console.log('    3. Run: idevicepair pair');
    console.log('    4. Re-run: pnpm doctor:usb');
    console.log();
  }

  if (!results.iproxyRunning) {
    console.log(yellow('  USB tunnel not running:'));
    console.log('    pnpm ios:usb');
    console.log();
  }

  console.log('Then re-run diagnostics:');
  console.log('  node tools/dev/doctor-ios.mjs');
  console.log();

  process.exit(1);
}
