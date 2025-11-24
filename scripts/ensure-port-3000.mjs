#!/usr/bin/env node
/**
 * Port 3000 availability checker
 *
 * Ensures port 3000 is free before starting Next.js dev server.
 * This prevents Next.js from auto-incrementing to 3001/3002/3003,
 * which breaks Capacitor iOS development (iOS app expects port 3000).
 *
 * Usage:
 *   node scripts/ensure-port-3000.mjs && next dev -p 3000
 */

import { createServer } from 'net';
import { execSync } from 'child_process';

const TARGET_PORT = 3000;

/**
 * Check if a port is available
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false); // Port is busy
      } else {
        resolve(false); // Other error, treat as busy
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true); // Port is available
    });

    server.listen(port);
  });
}

/**
 * Get process using a specific port (macOS/Linux)
 */
function getProcessOnPort(port) {
  try {
    // Get the listening process on this port (sTCP:*:PORT (LISTEN))
    const output = execSync(`lsof -i :${port} -sTCP:LISTEN -t`, { encoding: 'utf8' });
    const pids = output.trim().split('\n').filter(Boolean);
    if (pids.length === 0) return null;

    // Use the first listening PID
    const pid = pids[0];

    try {
      const processInfo = execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8' });
      return {
        pid,
        name: processInfo.trim(),
      };
    } catch {
      return { pid, name: 'unknown' };
    }
  } catch {
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  const isAvailable = await checkPort(TARGET_PORT);

  if (isAvailable) {
    console.log(`✅ Port ${TARGET_PORT} is available`);
    process.exit(0);
  }

  // Port is busy - show helpful error message
  console.error('');
  console.error('❌ PORT 3000 IS ALREADY IN USE');
  console.error('');

  const processInfo = getProcessOnPort(TARGET_PORT);

  if (processInfo) {
    console.error(`   Process using port ${TARGET_PORT}:`);
    console.error(`   - PID: ${processInfo.pid}`);
    console.error(`   - Name: ${processInfo.name}`);
    console.error('');
  }

  console.error('💡 HOW TO FIX:');
  console.error('');
  console.error('   Option 1: Kill the process using port 3000');
  if (processInfo) {
    console.error(`   $ kill ${processInfo.pid}`);
  } else {
    console.error(`   $ lsof -i :${TARGET_PORT}  # Find the process`);
    console.error('   $ kill <PID>            # Kill it');
  }
  console.error('');
  console.error('   Option 2: Kill all Node.js processes');
  console.error('   $ killall -9 node       # ⚠️  This kills ALL Node processes!');
  console.error('');
  console.error('   Option 3: Use the convenience script');
  console.error('   $ pnpm run kill:node    # Kills all Node processes');
  console.error('');
  console.error('🔍 WHY THIS MATTERS:');
  console.error('');
  console.error('   The Capacitor iOS app expects the Next.js dev server on port 3000.');
  console.error('   If Next.js auto-increments to 3001/3002/3003, the iOS app will show');
  console.error('   a blank screen because it cannot connect to the dev server.');
  console.error('');
  console.error('   This check ensures the dev server always runs on the correct port.');
  console.error('');

  process.exit(1);
}

main();
