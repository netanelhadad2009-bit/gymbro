/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-assistant)', 'sans-serif'],
        assistant: ['var(--font-assistant)', 'system-ui', 'sans-serif'],
      },
      // iOS-safe viewport units
      height: {
        'dvh': '100dvh',
        'svh': '100svh',
        'dvh-90': '90dvh',
        'dvh-80': '80dvh',
        'dvh-75': '75dvh',
        'dvh-50': '50dvh',
      },
      minHeight: {
        'dvh': '100dvh',
        'svh': '100svh',
        'dvh-90': '90dvh',
        'dvh-80': '80dvh',
        'dvh-75': '75dvh',
        'dvh-50': '50dvh',
      },
      maxHeight: {
        'dvh': '100dvh',
        'svh': '100svh',
        'dvh-90': '90dvh',
        'dvh-80': '80dvh',
        'dvh-75': '75dvh',
        'dvh-50': '50dvh',
      },
      // Safe area spacing
      spacing: {
        'safe-top': 'env(safe-area-inset-top, 0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-left': 'env(safe-area-inset-left, 0px)',
        'safe-right': 'env(safe-area-inset-right, 0px)',
      },
      // Scanning animation
      keyframes: {
        'scan-line': {
          '0%': { top: '0%' },
          '50%': { top: '100%' },
          '100%': { top: '0%' },
        },
      },
      animation: {
        'scan-line': 'scan-line 2s ease-in-out infinite',
      },
    },
  },
  plugins: [
    // iOS-safe viewport and safe-area utilities plugin
    function({ addUtilities }) {
      addUtilities({
        // Safe area padding utilities
        '.pt-safe': {
          paddingTop: 'max(env(safe-area-inset-top, 0px), var(--gb-safe-top, 16px))',
        },
        '.pb-safe': {
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
        },
        '.pl-safe': {
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 0px)',
        },
        '.pr-safe': {
          paddingRight: 'max(env(safe-area-inset-right, 0px), 0px)',
        },
        '.px-safe': {
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 0px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 0px)',
        },
        '.py-safe': {
          paddingTop: 'max(env(safe-area-inset-top, 0px), var(--gb-safe-top, 16px))',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
        },
        '.p-safe': {
          paddingTop: 'max(env(safe-area-inset-top, 0px), var(--gb-safe-top, 16px))',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 0px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 0px)',
        },
        // Safe area margin utilities
        '.mt-safe': {
          marginTop: 'max(env(safe-area-inset-top, 0px), var(--gb-safe-top, 16px))',
        },
        '.mb-safe': {
          marginBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
        },
        // iOS-safe full height (prevents address bar issues)
        '.h-safe-full': {
          height: '100dvh',
        },
        '.min-h-safe-full': {
          minHeight: '100dvh',
        },
        '.max-h-safe-full': {
          maxHeight: '100dvh',
        },
      });
    },
  ],
}
