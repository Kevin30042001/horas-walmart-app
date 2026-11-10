import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kevin.mishoras',
  appName: 'Mis Horas',
  webDir: 'dist',
  // offline-first: la app corre 100% empaquetada en el APK, no carga nada
  // desde un servidor remoto.
  server: {
    androidScheme: 'https',
  },
};

export default config;
