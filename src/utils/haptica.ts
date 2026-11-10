import { Capacitor } from '@capacitor/core';

/** Vibracion corta de confirmacion al marcar (Capacitor Haptics en el APK, Vibration API en la PWA). */
export async function vibrarConfirmacion(fuerte = false): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: fuerte ? ImpactStyle.Heavy : ImpactStyle.Medium });
      return;
    }
    navigator.vibrate?.(fuerte ? [30, 40, 60] : 25);
  } catch {
    // la vibracion es un extra: si no esta disponible no pasa nada
  }
}
