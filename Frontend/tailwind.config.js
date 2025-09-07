// C:\Synthetic dataset generator\Frontend\tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-charcoal': '#1A1A2E',
        'light-gray': '#EAEAEA',
        'vibrant-purple': '#7A287A',
        'bright-teal': '#00F5D4',
      },
      boxShadow: {
        '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
}