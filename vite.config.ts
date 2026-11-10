/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Control personal de horas - PWA offline-first.
// Nota: el precache de vite-plugin-pwa cubre HTML/CSS/JS; las fotos de
// evidencia y los registros viven en IndexedDB (Dexie), no en el cache de SW.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Mis Horas - Control Personal',
        short_name: 'Mis Horas',
        description: 'Control personal de horas, extras y proyeccion de pago (no reemplaza el reloj marcador oficial).',
        theme_color: '#0071ce',
        background_color: '#0b1220',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
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
