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
        'primary': '#4f46e5',
        'primaryHover': '#4338ca',
        'background': '#f8fafc',
        'card': '#ffffff',
        'content': '#0f172a',
        'contentSecondary': '#64748b',
        'border': '#e2e8f0',
        'subtleBg': '#f1f5f9',
      },
    },
  },
  plugins: [],
}