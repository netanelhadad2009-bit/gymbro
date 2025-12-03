// apps/web/capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

// =============================================================================
// CAPACITOR MOBILE CONFIGURATION
// =============================================================================
// This app requires a Next.js server (has middleware, API routes, server components)
// and CANNOT run from static bundled assets.
//
// DEVELOPMENT MODE (CAP_DEV=1):
//   - Connects to local Next.js dev server
//   - For simulator: http://localhost:3000
//   - For USB device: http://localhost:3000 (via iproxy tunnel)
//   - For physical device (WiFi): http://<your-local-ip>:3000
//
// PRODUCTION MODE (for App Store / TestFlight / Play Store):
//   - Uses deployed Vercel URL: https://gymbro-web-omega.vercel.app
//   - Can be overridden with MOBILE_PRODUCTION_URL environment variable
//   - Example: MOBILE_PRODUCTION_URL=https://custom-domain.com
//
// USAGE:
//   Development:
//     - iOS Simulator: pnpm ios:run-sim (sets CAP_DEV=1 CAP_SIM=1)
//     - iOS USB Device: pnpm ios:run-usb (sets CAP_DEV=1)
//     - Android: CAP_DEV=1 npx cap sync android
//
//   Production (uses Vercel URL by default):
//     - npx cap sync ios (for iOS TestFlight/App Store)
//     - npx cap sync android (for Android Play Store)
// =============================================================================

const isDev = process.env.CAP_DEV === "1";
const isSim = process.env.CAP_SIM === "1";

// Development server URL (varies by platform)
const devServerUrl = isSim
  ? "http://localhost:3000"  // iOS Simulator can access Mac's localhost directly
  : process.env.DEV_SERVER_URL || "http://172.20.10.6:3000";  // Physical devices need network IP

// Production server URL - defaults to deployed Vercel URL
// Can be overridden with MOBILE_PRODUCTION_URL environment variable
const productionServerUrl = process.env.MOBILE_PRODUCTION_URL || "https://gymbro-web-omega.vercel.app";

// Log current configuration
if (isDev) {
  console.log(`🧪 Capacitor Dev Mode`);
  console.log(`   Platform: ${isSim ? "iOS Simulator" : "Physical Device"}`);
  console.log(`   Server: ${devServerUrl}`);
} else {
  console.log(`🚀 Capacitor Production Mode`);
  console.log(`   Server: ${productionServerUrl}`);
}

const config: CapacitorConfig = {
  // Bundle ID updated to match FitJourney rebrand
  // Ensure App Store Connect, OAuth providers, and deep links are configured for this ID
  appId: "com.fitjourney.app",
  appName: "FitJourney",
  webDir: "public",  // Used for splash screen and static assets only
  server: isDev
    ? {
        // Development: Connect to local Next.js dev server
        url: devServerUrl,
        cleartext: true,  // Allow HTTP in dev
      }
    : {
        // Production: Connect to deployed Next.js server
        url: productionServerUrl,
        cleartext: false,  // Require HTTPS in production
      },
  ios: {
    backgroundColor: "#0B0D0E",
    contentInset: "always",
    allowsLinkPreview: false,
  },
  android: {
    backgroundColor: "#0B0D0E",
    allowMixedContent: false,  // Require HTTPS in WebView
  },
  plugins: {
    Keyboard: {
      resize: "native" as any,  // Use native keyboard behavior (fixes constraint errors)
      style: "dark" as any,     // Dark keyboard style to match app theme
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '122734915921-puilvnnjdtvr8n86bvhnvoii9ogcao9s.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
