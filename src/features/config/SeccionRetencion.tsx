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
        <label className="text-xs text-tenue">Dias de retencion del detalle (fotos y registros)</label>
        <input
          type="number"
          value={diasRetencion}
          onChange={(e) => void guardarDias(Number(e.target.value) || 60)}
          className="w-full campo"
        />
      </div>

      {uso && (
        <p className="text-xs text-tenue">
          Uso de almacenamiento aproximado: {uso.usadoMB} MB de {uso.cuotaMB} MB disponibles.
        </p>
      )}

      <div className="rounded-2xl border border-aviso/50 bg-aviso/10 p-3 text-sm">
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
        className="w-full pulsable rounded-2xl bg-peligro/15 py-3 font-semibold text-peligro disabled:opacity-50"
      >
        {procesando ? 'Procesando...' : 'Respaldar y limpiar ahora'}
      </button>

      {mensaje && <p className="text-xs text-exito">{mensaje}</p>}

      <p className="text-xs text-tenue">
        Para proteger un dia especifico de la limpieza, abrilo en Registros y marca la casilla "Proteger".
      </p>
    </div>
  );
}
