/**
 * Brand Configuration
 * Centralized brand settings for easy maintenance
 * Brand rename from GymBro to FitJourney completed
 */

export const BRAND_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'FitJourney';
export const BRAND_SLUG = 'fitjourney'; // Always use consistent slug

// Legacy compatibility mapping
export const LEGACY_BRAND_MAPPING = {
  'GymBro': 'FitJourney',
  'gymbro': 'fitjourney',
  'gym-bro': 'fitjourney',
  'gym_bro': 'fitjourney',
  'GYMBRO': 'FITJOURNEY'
} as const;

// Storage key prefixes
export const STORAGE_PREFIX = `${BRAND_SLUG}:`;

// Bundle identifiers - updated to FitJourney across all platforms
export const BUNDLE_ID = {
  ios: 'com.fitjourney.app',
  android: 'com.fitjourney.app',
  current: 'com.fitjourney.app'  // Updated from com.gymbro.app
};

// Analytics event prefixes
export const ANALYTICS_PREFIX = {
  new: 'fitjourney_',
  legacy: 'gymbro_'  // Keep for dashboard compatibility
};

// Brand colors
export const BRAND_COLORS = {
  primary: '#E2F163',
  primaryDark: '#D7EA5F',
  primaryLight: '#F0FA8C',
  background: '#1C1C22',
  backgroundLight: '#242430',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF'
};

// Migration helpers
export function migrateLegacyKey(key: string): string {
  for (const [old, replacement] of Object.entries(LEGACY_BRAND_MAPPING)) {
    if (key.includes(old)) {
      return key.replace(old, replacement);
    }
  }
  return key;
}

export function getLegacyStorageKey(key: string): string | null {
  // Check for legacy storage keys for data migration
  const legacyPrefixes = ['gymbro:', 'gym-bro:', 'GymBro:'];
  for (const prefix of legacyPrefixes) {
    const legacyKey = key.replace(STORAGE_PREFIX, prefix);
    if (typeof window !== 'undefined' && localStorage.getItem(legacyKey)) {
      return legacyKey;
    }
  }
  return null;
}

// Export brand metadata for SEO/PWA
export const BRAND_METADATA = {
  title: BRAND_NAME,
  description: 'המאמן הדיגיטלי שלך - מותאם אישית אליך',
  shortName: BRAND_NAME,
  appName: BRAND_NAME,
  themeColor: BRAND_COLORS.background,
  backgroundColor: BRAND_COLORS.background,
  startUrl: '/',
  display: 'standalone' as const,
  orientation: 'portrait' as const,
  icons: [
    {
      src: '/icon-192.png',
      sizes: '192x192',
      type: 'image/png'
    },
    {
      src: '/icon-512.png',
      sizes: '512x512',
      type: 'image/png'
    }
  ]
};