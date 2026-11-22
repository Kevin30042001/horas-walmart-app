/**
 * Actualizaciones de la app instalada (PWA). Como la app funciona sin
 * internet, el celular guarda una copia; estas funciones hacen que tome la
 * version nueva publicada en Vercel sin tocar los datos (IndexedDB).
 */

export const VERSION_APP: string = typeof __VERSION_APP__ === 'string' ? __VERSION_APP__ : 'desarrollo';

/**
 * Al abrir la app: busca una version nueva y, si la nueva toma el control,
 * recarga una sola vez para mostrarla (no recarga en la primera instalacion).
 */
export function iniciarActualizacionAutomatica(): void {
  if (!('serviceWorker' in navigator)) return;
  const habiaVersionAnterior = Boolean(navigator.serviceWorker.controller);
  let recargado = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!habiaVersionAnterior || recargado) return;
    recargado = true;
    window.location.reload();
  });
  const revisar = () => void navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => {});
  window.addEventListener('load', revisar);
  // al volver a la app desde segundo plano tambien se revisa
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && revisar());
}

/**
 * Boton "Buscar actualizacion": borra la copia guardada de la app (no los
 * datos) y recarga, para descargar la ultima version publicada.
 */
export async function forzarActualizacion(): Promise<void> {
  try {
    const registros = (await navigator.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(registros.map((r) => r.unregister()));
    if ('caches' in window) {
      const claves = await caches.keys();
      await Promise.all(claves.filter((k) => !k.includes('tesseract')).map((k) => caches.delete(k)));
    }
  } finally {
    window.location.reload();
  }
}
