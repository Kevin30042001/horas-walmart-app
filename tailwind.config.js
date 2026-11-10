/** @type {import('tailwindcss').Config} */
const token = (nombre) => `rgb(var(--c-${nombre}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tokens semanticos (ver src/index.css), paleta inspirada en Walmart.
        // El acento cambia con el turno activo: Despacho = azul, Recibo = amarillo.
        fondo: token('fondo'),
        superficie: token('superficie'),
        elevada: token('elevada'),
        borde: token('borde'),
        texto: token('texto'),
        tenue: token('tenue'),
        acento: token('acento'),
        'sobre-acento': token('sobre-acento'),
        acentotx: token('acentotx'),
        asueto: token('asueto'),
        asuetotx: token('asuetotx'),
        'sobre-asueto': token('sobre-asueto'),
        azul: token('azul'),
        amarillo: token('amarillo'),
        marino: token('marino'),
        nocturno: token('nocturno'),
        diurno: token('diurno'),
        exito: token('exito'),
        aviso: token('aviso'),
        peligro: token('peligro'),
        // Compatibilidad con pantallas antiguas: "marca" ahora es el acento del turno.
        marca: { DEFAULT: token('acento'), oscuro: token('acento') },
      },
      fontFamily: {
        sans: ['"Manrope Variable"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk Variable"', '"Manrope Variable"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        pulso: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.45' } },
        aparecer: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        completar: {
          '0%': { transform: 'scale(.6)', opacity: '0' },
          '60%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        pulso: 'pulso 2s ease-in-out infinite',
        aparecer: 'aparecer .25s ease-out both',
        completar: 'completar .45s cubic-bezier(.2,.9,.3,1.2) both',
      },
    },
  },
  plugins: [],
};
