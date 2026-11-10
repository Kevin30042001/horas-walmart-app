import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { guardarPerfil } from '../../data/repos/perfilRepo';
import { useApp } from '../../aplicacion/AppContexto';
import { configRecordatorios } from '../../aplicacion/recordatoriosApp';
import type { ConfigRecordatorios } from '../../aplicacion/recordatorios';
import { estadoPermiso, notificacionDePrueba, pedirPermiso, type EstadoPermiso } from '../../utils/notificaciones';
import { Capacitor } from '@capacitor/core';
import Boton from '../../components/Boton';

/** Recordatorios locales: antes de la entrada, despues de la salida y jornada abierta. */
export default function SeccionNotificaciones() {
  const { perfil, refrescar } = useApp();
  const [permiso, setPermiso] = useState<EstadoPermiso>('pendiente');

  useEffect(() => {
    void estadoPermiso().then(setPermiso);
  }, []);

  if (!perfil) return null;
  const config = configRecordatorios(perfil);

  async function guardar(cambios: Partial<ConfigRecordatorios>): Promise<void> {
    if (cambios.activos && permiso !== 'concedido') setPermiso(await pedirPermiso());
    await guardarPerfil({ recordatorios: { ...config, ...cambios } });
    refrescar();
  }

  return (
    <div className="space-y-4">
      <label className="tarjeta flex items-center gap-3">
        <BellRing className="h-5 w-5 text-acento" aria-hidden />
        <span className="flex-1 text-sm font-semibold">Activar recordatorios</span>
        <input type="checkbox" checked={config.activos} onChange={(e) => void guardar({ activos: e.target.checked })} className="h-5 w-5 accent-[rgb(var(--c-acento))]" />
      </label>

      {permiso === 'denegado' && (
        <p className="rounded-2xl bg-peligro/12 p-3 text-xs text-peligro">El permiso de notificaciones esta bloqueado. Activalo en los ajustes del telefono.</p>
      )}
      {permiso === 'no-soportado' && <p className="text-xs text-tenue">Este navegador no soporta notificaciones.</p>}

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-tenue">
          Antes de la entrada (min)
          <input type="number" min={0} value={config.minAntesEntrada} onChange={(e) => void guardar({ minAntesEntrada: Math.max(0, Number(e.target.value) || 0) })} className="campo mt-1" />
        </label>
        <label className="text-xs text-tenue">
          Despues de la salida sin marcar (min)
          <input type="number" min={0} value={config.minDespuesSalida} onChange={(e) => void guardar({ minDespuesSalida: Math.max(0, Number(e.target.value) || 0) })} className="campo mt-1" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={config.avisoJornadaAbierta} onChange={(e) => void guardar({ avisoJornadaAbierta: e.target.checked })} className="h-4 w-4 accent-[rgb(var(--c-acento))]" />
        Avisar si quedo una jornada abierta
      </label>

      <Boton variante="secundario" ancho disabled={permiso !== 'concedido'} onClick={() => void notificacionDePrueba()}>
        Probar notificacion (en 5 s)
      </Boton>

      {!Capacitor.isNativePlatform() && (
        <p className="text-xs text-tenue">
          En la version web (PWA) los avisos solo suenan con la app abierta o reciente: el navegador no permite programarlos
          con la app cerrada sin un servidor. Para recordatorios confiables instala el APK de Android.
        </p>
      )}
    </div>
  );
}
