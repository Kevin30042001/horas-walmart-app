import { Capacitor } from '@capacitor/core';
import type { Recordatorio } from '../aplicacion/recordatorios';

export type EstadoPermiso = 'concedido' | 'denegado' | 'pendiente' | 'no-soportado';

const esNativo = () => Capacitor.isNativePlatform();
let temporizadoresWeb: ReturnType<typeof setTimeout>[] = [];

export async function estadoPermiso(): Promise<EstadoPermiso> {
  if (esNativo()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const { display } = await LocalNotifications.checkPermissions();
    return display === 'granted' ? 'concedido' : display === 'denied' ? 'denegado' : 'pendiente';
  }
  if (typeof Notification === 'undefined') return 'no-soportado';
  return Notification.permission === 'granted' ? 'concedido' : Notification.permission === 'denied' ? 'denegado' : 'pendiente';
}

export async function pedirPermiso(): Promise<EstadoPermiso> {
  if (esNativo()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.requestPermissions();
    return estadoPermiso();
  }
  if (typeof Notification === 'undefined') return 'no-soportado';
  await Notification.requestPermission();
  return estadoPermiso();
}

async function mostrarWeb(r: Pick<Recordatorio, 'titulo' | 'cuerpo'>): Promise<void> {
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) await reg.showNotification(r.titulo, { body: r.cuerpo, icon: 'icon.svg', tag: r.titulo });
  else new Notification(r.titulo, { body: r.cuerpo });
}

/**
 * Programa los recordatorios reemplazando los anteriores.
 *  - APK (Capacitor Local Notifications): se disparan aunque la app este cerrada.
 *  - PWA: el navegador no permite programar notificaciones con la app cerrada
 *    sin un servidor push; solo suenan mientras la app esta abierta o en
 *    segundo plano reciente. Por eso para recordatorios confiables se
 *    recomienda el APK.
 */
export async function programarRecordatorios(lista: Recordatorio[]): Promise<void> {
  if ((await estadoPermiso()) !== 'concedido') return;
  if (esNativo()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const pendientes = await LocalNotifications.getPending();
    if (pendientes.notifications.length) await LocalNotifications.cancel({ notifications: pendientes.notifications.map((n) => ({ id: n.id })) });
    if (lista.length) {
      await LocalNotifications.schedule({
        notifications: lista.map((r) => ({ id: r.id, title: r.titulo, body: r.cuerpo, schedule: { at: r.en, allowWhileIdle: true } })),
      });
    }
    return;
  }
  temporizadoresWeb.forEach(clearTimeout);
  temporizadoresWeb = lista
    .map((r) => ({ r, ms: r.en.getTime() - Date.now() }))
    .filter(({ ms }) => ms > 0 && ms < 24 * 3600_000)
    .map(({ r, ms }) => setTimeout(() => void mostrarWeb(r), ms));
}

export async function notificacionDePrueba(): Promise<void> {
  const r = { id: 1, en: new Date(Date.now() + 5000), titulo: 'Mis Horas', cuerpo: 'Asi se veran tus recordatorios.' };
  if (esNativo()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.schedule({ notifications: [{ id: r.id, title: r.titulo, body: r.cuerpo, schedule: { at: r.en } }] });
  } else {
    setTimeout(() => void mostrarWeb(r), 5000);
  }
}
