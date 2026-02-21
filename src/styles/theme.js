/**
 * TALPA Dünya Pilotlar Günü 2026 – Merkezi tema
 * Altın: #E6C275, Lacivert: #051424
 */
export const theme = {
  colors: {
    bg: '#051424',
    bgLight: '#0A2239',
    gold: '#E6C275',
    goldDim: '#9E8245',
    silver: '#C4CCD4',
    text: '#F0F4F8',
    textMuted: '#8B9BB4',
  },
  fonts: {
    heading: "'Cormorant Garamond', serif",
    body: "'Inter', sans-serif",
  },
  cssVars: {
    '--color-bg': '#051424',
    '--color-bg-light': '#0A2239',
    '--color-gold': '#E6C275',
    '--color-gold-dim': '#9E8245',
    '--color-silver': '#C4CCD4',
    '--color-text': '#F0F4F8',
    '--color-text-muted': '#8B9BB4',
  },
  // Arka plan deseni (etching) – data URI
  bgEtching: `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' viewBox='0 0 1000 1000' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,500 Q250,400 500,500 T1000,500' fill='none' stroke='%23ffffff' stroke-width='1' stroke-dasharray='10,10'/%3E%3Cpath d='M0,600 Q250,500 500,600 T1000,600' fill='none' stroke='%23ffffff' stroke-width='0.5' stroke-dasharray='5,5'/%3E%3C/svg%3E")`,
  heroBackground: `radial-gradient(circle at center, transparent 30%, #051424 90%), url('https://images.unsplash.com/photo-1506899736830-466d338f0c29?q=80&w=2070&auto=format&fit=crop')`,
};

export default theme;
