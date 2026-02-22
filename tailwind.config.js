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
          'text-muted': '#BDBDBD',
        },
      },
      fontFamily: {
        heading: ['Cantarell', 'sans-serif'],
        body: ['Cantarell', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
