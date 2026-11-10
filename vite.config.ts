/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Control personal de horas - PWA offline-first.
// `base` cambia segun el destino: GitHub Pages sirve desde una subruta
// (/horas-walmart-app/), mientras que Capacitor empaqueta los archivos en la
// raiz del APK (/). Se controla con la variable de entorno GITHUB_PAGES que
// solo el workflow de deploy-web exporta.
const BASE_PATH = process.env.GITHUB_PAGES === 'true' ? '/horas-walmart-app/' : '/';

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'Mis Horas - Control Personal',
        short_name: 'Mis Horas',
        description: 'Control personal de horas, extras y proyeccion de pago (no reemplaza el reloj marcador oficial).',
        theme_color: '#0a0b12',
        background_color: '#0b1220',
        display: 'standalone',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Tesseract.js carga sus modelos .traineddata por red la primera vez;
        // los cacheamos para que el OCR tambien funcione offline despues del primer uso.
        runtimeCaching: [
          {
            urlPattern: /\.traineddata(\.gz)?$/,
            handler: 'CacheFirst',
            options: { cacheName: 'tesseract-modelos', expiration: { maxEntries: 5 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**'],
    },
  },
});
