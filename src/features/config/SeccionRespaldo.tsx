import { useState, type ChangeEvent } from 'react';
import { generarArchivoRespaldoJSON, restaurarDesdeJSON } from '../../data/respaldo';
import { useEntregaArchivo } from '../../components/useEntregaArchivo';
import PanelArchivo from '../../components/PanelArchivo';

export default function SeccionRespaldo() {
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const entrega = useEntregaArchivo();

  async function respaldar(): Promise<void> {
    setMensaje(null);
    await entrega.generar('json', generarArchivoRespaldoJSON);
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
        disabled={procesando || entrega.generando !== null}
        className="pulsable w-full rounded-2xl bg-acento py-3 font-semibold text-sobre-acento disabled:opacity-50"
      >
        {entrega.generando ? 'Generando...' : 'Descargar respaldo'}
      </button>
      <PanelArchivo entrega={entrega} />

      <label className="block cursor-pointer rounded-lg border-2 border-dashed border-borde p-4 text-center text-sm text-tenue ">
        Restaurar desde archivo
        <input type="file" accept="application/json" className="hidden" onChange={(e) => void restaurar(e)} />
      </label>

      {mensaje && <p className="text-xs text-exito">{mensaje}</p>}
    </div>
  );
}
