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

// Version visible en la app (Mas): fecha de compilacion + commit (Vercel o GitHub Actions).
const COMMIT = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'local').slice(0, 7);
const VERSION_APP = `${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · ${COMMIT}`;

export default defineConfig({
  base: BASE_PATH,
  define: {
    __VERSION_APP__: JSON.stringify(VERSION_APP),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mis Horas - Control Personal',
        short_name: 'Mis Horas',
        description: 'Control personal de horas, extras y proyeccion de pago (no reemplaza el reloj marcador oficial).',
        theme_color: '#0071dc',
        background_color: '#050e1c',
        display: 'standalone',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        // PNG: Android/Chrome no usa el SVG para instalar la PWA (salia un icono generico).
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // La version nueva toma el control de inmediato y se borran las caches viejas.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
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
