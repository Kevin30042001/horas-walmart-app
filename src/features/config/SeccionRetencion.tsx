import { useEffect, useState } from 'react';
import { obtenerConfigRetencion, guardarConfigRetencion } from '../../data/repos/configRepo';
import { obtenerCandidatosLimpieza, ejecutarLimpieza, obtenerUsoAlmacenamiento } from '../../aplicacion/limpieza';
import { generarRespaldoJSON, descargarRespaldo } from '../../data/respaldo';
import type { JornadaRow } from '../../data/db';

export default function SeccionRetencion() {
  const [diasRetencion, setDiasRetencion] = useState(60);
  const [candidatos, setCandidatos] = useState<JornadaRow[]>([]);
  const [uso, setUso] = useState<{ usadoMB: number; cuotaMB: number } | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar(): Promise<void> {
    const config = await obtenerConfigRetencion();
    setDiasRetencion(config.diasRetencion);
    setCandidatos(await obtenerCandidatosLimpieza());
    setUso(await obtenerUsoAlmacenamiento());
  }

  async function guardarDias(valor: number): Promise<void> {
    setDiasRetencion(valor);
    await guardarConfigRetencion({ diasRetencion: valor });
    await cargar();
  }

  async function respaldarYLimpiar(): Promise<void> {
    setProcesando(true);
    try {
      const blob = await generarRespaldoJSON();
      descargarRespaldo(blob);
      const resultado = await ejecutarLimpieza();
      setMensaje(
        `Listo: se archivaron ${resultado.cortesResumidos} corte(s) y se liberaron ${resultado.jornadasEliminadas} jornada(s) con su detalle y fotos.`
      );
      await cargar();
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-slate-500">Dias de retencion del detalle (fotos y registros)</label>
        <input
          type="number"
          value={diasRetencion}
          onChange={(e) => void guardarDias(Number(e.target.value) || 60)}
          className="w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-800"
        />
      </div>

      {uso && (
        <p className="text-xs text-slate-400">
          Uso de almacenamiento aproximado: {uso.usadoMB} MB de {uso.cuotaMB} MB disponibles.
        </p>
      )}

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        <p>
          {candidatos.length === 0
            ? 'No hay nada que limpiar todavia.'
            : `${candidatos.length} jornada(s) con mas de ${diasRetencion} dias listas para limpiar.`}
        </p>
        <p className="mt-1 text-xs">
          Al limpiar se descarga primero un respaldo completo, luego se borran las fotos y el detalle de esas
          jornadas -- pero el TOTAL de horas y el monto proyectado de su corte se conservan para el historico.
        </p>
      </div>

      <button
        onClick={() => void respaldarYLimpiar()}
        disabled={candidatos.length === 0 || procesando}
        className="w-full rounded-lg bg-red-600 py-2 font-semibold text-white disabled:opacity-50"
      >
        {procesando ? 'Procesando...' : 'Respaldar y limpiar ahora'}
      </button>

      {mensaje && <p className="text-xs text-emerald-600">{mensaje}</p>}

      <p className="text-xs text-slate-400">
        Para proteger un dia especifico de la limpieza, abrilo en Registros y marca la casilla "Proteger".
      </p>
    </div>
  );
}
