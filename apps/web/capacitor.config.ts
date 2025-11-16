// apps/web/capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";

const isDev = process.env.CAP_DEV === "1";

// Use local network IP for physical devices, localhost for simulator
const devServerUrl = process.env.DEV_SERVER_URL || "http://172.20.10.6:3000";

console.log(
  isDev
    ? `🧪 Capacitor Dev URL: ${devServerUrl}`
    : "📦 Capacitor: Using bundled web assets"
);

const config: CapacitorConfig = {
  // TODO: On full store rebrand, consider changing this to "com.fitjourney.app"
  // and update all corresponding store / OAuth / deep link configurations.
  appId: "com.gymbro.app",
  appName: "FitJourney",
  webDir: "public",
  server: isDev
    ? {
        url: devServerUrl,
        cleartext: true,
      }
    : undefined,
  ios: {
    backgroundColor: "#0B0D0E",
    contentInset: "always",
    allowsLinkPreview: false,
  },
};

export default config;
