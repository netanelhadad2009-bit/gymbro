import type { CapacitorConfig } from '@capacitor/cli';

// Helper to determine dev server URL based on target
function getDevServerUrl(): string | undefined {
  const target = process.env.CAP_TARGET || 'sim';

  if (target === 'sim') {
    // Simulator can access localhost directly
    return 'http://localhost:3000';
  } else {
    // Physical device needs LAN IP
    const lanIp = process.env.LAN_IP || 'http://192.168.0.10:3000';
    return lanIp;
  }
}

function getAllowedHosts(): string[] {
  const hosts = ['localhost', '127.0.0.1'];
  const lanIp = process.env.LAN_IP;

  if (lanIp) {
    // Extract hostname from LAN_IP (e.g., "http://192.168.0.10:3000" -> "192.168.0.10")
    try {
      const url = new URL(lanIp);
      hosts.push(url.hostname);
    } catch {
      // If not a valid URL, assume it's just an IP
      hosts.push(lanIp.replace(/^https?:\/\//, '').split(':')[0]);
    }
  }

  return hosts;
}

const config: CapacitorConfig = {
  appId: 'com.gymbro.app',
  appName: 'GymBro',
  webDir: 'public',
  server: {
    url: getDevServerUrl(),
    cleartext: true, // Allow http during development
    allowNavigation: getAllowedHosts(),
  }
};

export default config;
