/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#1157a2', // Brand Color
        'primaryHover': '#0d4685', // Darker shade of brand color
        'primaryLight': '#e0e7ff', // Keep light indigo/blue for backgrounds
        'onPrimary': '#ffffff',

        'secondary': '#64748b', // Slate 500
        'onSecondary': '#f1f5f9', // Slate 100

        'background': '#f8fafc', // Slate 50 - Brighter clean background
        'card': '#ffffff',

        'content': '#0f172a', // Slate 900 - Deep crisp text
        'contentSecondary': '#64748b', // Slate 500
        'contentTertiary': '#94a3b8', // Slate 400

        'border': '#e2e8f0', // Slate 200
        'subtleBg': '#f1f5f9', // Slate 100

        'success': '#10b981', // Emerald 500
        'successBg': '#ecfdf5',
        'warning': '#f59e0b', // Amber 500
        'warningBg': '#fffbeb',
        'danger': '#ef4444', // Red 500
        'dangerBg': '#fef2f2',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        'dropdown': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      }
    },
  },
  plugins: [],
}