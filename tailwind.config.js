/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          dark: 'var(--primary-dark)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          dark: 'var(--secondary-dark)',
        },
      },
      opacity: {
        '10': '0.1',
        '20': '0.2',
        '90': '0.9',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
  safelist: [
    'bg-primary',
    'bg-primary-dark',
    'text-primary',
    'border-primary',
    'bg-secondary',
    'bg-secondary-dark',
    {
      pattern: /bg-(primary|secondary)\/[0-9]+/,
    },
    {
      pattern: /text-(primary|secondary)\/[0-9]+/,
    },
  ],
} 