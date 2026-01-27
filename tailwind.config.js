/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', "class"],
  theme: {
  	extend: {
  		colors: {
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			primaryHover: 'var(--color-primary-hover)',
  			primaryLight: 'var(--color-primary-light)',
  			onPrimary: 'var(--color-on-primary)',
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			onSecondary: 'var(--color-on-secondary)',
  			background: 'hsl(var(--background))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			cardHover: 'var(--color-card-hover)',
  			content: 'var(--color-content)',
  			contentSecondary: 'var(--color-content-secondary)',
  			contentTertiary: 'var(--color-content-tertiary)',
  			border: 'hsl(var(--border))',
  			subtleBg: 'var(--color-subtle-bg)',
  			success: 'var(--color-success)',
  			successBg: 'var(--color-success-bg)',
  			warning: 'var(--color-warning)',
  			warningBg: 'var(--color-warning-bg)',
  			danger: 'var(--color-danger)',
  			dangerBg: 'var(--color-danger-bg)',
  			foreground: 'hsl(var(--foreground))',
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'sans-serif'
  			]
  		},
  		boxShadow: {
  			soft: '0 4px 6px -1px var(--shadow-color), 0 2px 4px -1px var(--shadow-color)',
  			card: '0 4px 6px -1px var(--shadow-color), 0 2px 4px -1px var(--shadow-color)',
  			'card-hover': '0 10px 15px -3px var(--shadow-color), 0 4px 6px -2px var(--shadow-color)',
  			dropdown: '0 20px 25px -5px var(--shadow-color), 0 10px 10px -5px var(--shadow-color)'
  		},
  		borderRadius: {
  			xl: '1rem',
  			'2xl': '1.5rem',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}