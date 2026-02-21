/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dpg: {
          navy: '#051424',
          'navy-light': '#0A2239',
          gold: '#E6C275',
          'gold-dim': '#9E8245',
          silver: '#C4CCD4',
          text: '#F0F4F8',
          'text-muted': '#8B9BB4',
        },
      },
      fontFamily: {
        heading: ['Cormorant Garamond', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
