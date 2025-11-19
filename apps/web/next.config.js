/** @type {import('next').NextConfig} */

// =============================================================================
// BUILD-TIME ENVIRONMENT VALIDATION
// =============================================================================
// Validate critical environment variables at build time to fail fast
// Skip validation in test environment

if (process.env.NODE_ENV !== 'test') {
  const requiredServerSecrets = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'VAPID_PRIVATE_KEY',
  ];

  const requiredPublicVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  ];

  const missing = [];

  // Check server-only secrets
  requiredServerSecrets.forEach((key) => {
    if (!process.env[key]) {
      missing.push(`❌ ${key} (server-only)`);
    }
  });

  // Check public variables
  requiredPublicVars.forEach((key) => {
    if (!process.env[key]) {
      missing.push(`❌ ${key} (public)`);
    }
  });

  if (missing.length > 0) {
    console.error('\n🚨 BUILD FAILED: Missing required environment variables:\n');
    missing.forEach((msg) => console.error(`  ${msg}`));
    console.error('\n💡 Solutions:');
    console.error('  1. Copy .env.local.example to .env.local');
    console.error('  2. Fill in all required values');
    console.error('  3. For production: Set these in Vercel/deployment platform\n');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
}

// =============================================================================
// NEXT.JS CONFIGURATION
// =============================================================================

const nextConfig = {
  reactStrictMode: true,

  // Prevent webpack cache corruption issues
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable memory cache in development to prevent corruption
      config.cache = false;
    }
    return config;
  },

  // Disable experimental features that may cause cache issues
  experimental: {
    // Ensure consistent builds
    webpackBuildWorker: false,
  },

  // =============================================================================
  // SECURITY HEADERS
  // =============================================================================
  // Apply comprehensive security headers to all routes
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          // Content Security Policy (CSP)
          // Controls which resources can be loaded and from where
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: Allow from same origin, inline scripts (React needs this), eval (Next.js dev), and blob for workers
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
              // Styles: Allow from same origin and inline styles (Tailwind needs this)
              "style-src 'self' 'unsafe-inline'",
              // Images: Allow from same origin, data URIs, blob, and HTTPS sources (for user uploads)
              "img-src 'self' data: blob: https:",
              // API connections: Allow Supabase and OpenAI
              "connect-src 'self' https://*.supabase.co https://api.openai.com wss://*.supabase.co",
              // Fonts: Allow from same origin and data URIs
              "font-src 'self' data:",
              // Frames: Only allow same origin (prevent clickjacking via iframes)
              "frame-ancestors 'self'",
              // Media: Allow from same origin and blob
              "media-src 'self' blob:",
              // Workers: Allow blob (for service workers)
              "worker-src 'self' blob:",
              // Manifest: Allow from same origin
              "manifest-src 'self'",
            ].join('; '),
          },

          // X-Frame-Options: Prevent clickjacking
          // Prevents the site from being embedded in iframes on other domains
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },

          // X-Content-Type-Options: Prevent MIME type sniffing
          // Forces browser to respect declared content types
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },

          // Referrer-Policy: Control referrer information
          // Only send origin when navigating to less secure destinations
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },

          // Strict-Transport-Security (HSTS)
          // Force HTTPS for 2 years, including subdomains, allow preload list
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },

          // Permissions-Policy: Disable unnecessary browser features
          // Prevents unauthorized access to sensitive device features
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',       // No camera access
              'microphone=()',   // No microphone access
              'geolocation=()',  // No geolocation
              'interest-cohort=()', // No FLoC tracking
              'payment=()',      // No payment APIs
              'usb=()',          // No USB access
            ].join(', '),
          },

          // X-DNS-Prefetch-Control: Control DNS prefetching
          // Allow DNS prefetching for better performance (safe with HTTPS)
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
