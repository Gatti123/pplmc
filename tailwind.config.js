/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#800080', // Purple
          light: '#a64ca6',
          dark: '#5c005c',
        },
        secondary: {
          DEFAULT: '#F5F5DC', // Beige
          light: '#fffff0',
          dark: '#e6e6c8',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
} 