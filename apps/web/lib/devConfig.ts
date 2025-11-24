/**
 * Development configuration constants
 *
 * Single source of truth for dev server configuration
 * Shared between Next.js dev server and Capacitor mobile dev
 */

/**
 * Fixed dev server port
 * IMPORTANT: This must match the port in:
 * - apps/web/package.json dev scripts
 * - apps/web/capacitor.config.ts devServerUrl
 * - scripts/ensure-port-3000.mjs TARGET_PORT
 */
export const DEV_SERVER_PORT = 3000;

/**
 * Dev server host for binding
 * - 0.0.0.0 allows access from iOS/Android devices on same network
 * - localhost restricts to local machine only
 */
export const DEV_SERVER_HOST = '0.0.0.0';

/**
 * Get the full dev server URL for a given host
 */
export function getDevServerUrl(host: string = 'localhost'): string {
  return `http://${host}:${DEV_SERVER_PORT}`;
}

/**
 * Common network IP patterns for local development
 * Used by Capacitor for physical device development
 */
export const COMMON_LOCAL_IPS = {
  LOCALHOST: 'localhost',
  LOCALHOST_IP: '127.0.0.1',
  // Common private network ranges
  // Actual IP will vary by network, e.g., 192.168.1.x, 172.20.10.x, 10.0.0.x
};
