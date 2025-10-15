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
    },
  },
  plugins: [],
}
