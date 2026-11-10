import { useState, type ChangeEvent } from 'react';
import { generarRespaldoJSON, restaurarDesdeJSON, descargarRespaldo } from '../../data/respaldo';

export default function SeccionRespaldo() {
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function respaldar(): Promise<void> {
    setProcesando(true);
    try {
      const blob = await generarRespaldoJSON();
      descargarRespaldo(blob);
      setMensaje('Respaldo descargado.');
    } finally {
      setProcesando(false);
    }
  }

  async function restaurar(evento: ChangeEvent<HTMLInputElement>): Promise<void> {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    const confirmado = window.confirm(
      'Esto REEMPLAZA todos los datos actuales de la app con los del archivo. Esta seguro?'
    );
    if (!confirmado) return;

    setProcesando(true);
    try {
      await restaurarDesdeJSON(archivo);
      setMensaje('Datos restaurados. Recarga la app para ver los cambios.');
    } catch {
      setMensaje('No se pudo restaurar el archivo -- verifica que sea un respaldo valido de Mis Horas.');
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-tenue">
        El respaldo incluye TODOS tus datos (registros, jornadas, fotos de evidencia y configuracion) en un solo
        archivo JSON que podes guardar donde quieras.
      </p>

      <button
        onClick={() => void respaldar()}
        disabled={procesando}
        className="pulsable w-full rounded-2xl bg-acento py-3 font-semibold text-sobre-acento disabled:opacity-50"
      >
        Descargar respaldo
      </button>

      <label className="block cursor-pointer rounded-lg border-2 border-dashed border-borde p-4 text-center text-sm text-tenue ">
        Restaurar desde archivo
        <input type="file" accept="application/json" className="hidden" onChange={(e) => void restaurar(e)} />
      </label>

      {mensaje && <p className="text-xs text-exito">{mensaje}</p>}
    </div>
  );
}
