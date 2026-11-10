/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Azul corporativo (referencia visual del marco Walmart) + acentos de estado.
        marca: {
          DEFAULT: '#0071ce',
          oscuro: '#004f9a',
        },
      },
    },
  },
  plugins: [],
};
