import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gymbro.app',
  appName: 'GymBro',
  webDir: 'public',
  server: {
    url: 'http://172.20.10.6:3000',
    cleartext: true
  }
};

export default config;
