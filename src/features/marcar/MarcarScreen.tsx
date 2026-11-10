import { useEffect, useState } from 'react';
import { fechaLocalHoy, formatoHora } from '../../utils/fecha';
import { listarRegistrosDelDia, agregarRegistro } from '../../data/repos/registrosRepo';
import { obtenerTurnoActivo } from '../../data/repos/perfilRepo';
import { procesarJornadaDelDia } from '../../aplicacion/procesarJornada';
import { siguienteAccion, obtenerEtiquetaAccion, type AccionMarcado } from '../../aplicacion/estadoDelDia';
import EvidenciaFotoModal from './EvidenciaFotoModal';
import type { RegistroRow, TurnoRow } from '../../data/db';

export default function MarcarScreen() {
  const [registrosHoy, setRegistrosHoy] = useState<RegistroRow[]>([]);
  const [turno, setTurno] = useState<TurnoRow | null>(null);
  const [nota, setNota] = useState('');
  const [mostrarEvidencia, setMostrarEvidencia] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar(): Promise<void> {
    const hoy = fechaLocalHoy();
    setRegistrosHoy(await listarRegistrosDelDia(hoy));
    setTurno((await obtenerTurnoActivo()) ?? null);
  }

  const accion = siguienteAccion(registrosHoy);

  async function marcarAhora(): Promise<void> {
    if (!accion || !turno?.id) return;
    setGuardando(true);
    await agregarRegistro({
      fecha: fechaLocalHoy(),
      turnoId: turno.id,
      tipoEvento: accion,
      horaReal: new Date(),
      horaPlanificada: null,
      origen: 'manual',
      nota,
      fotoId: null,
      confirmadoPorUsuario: true,
    });

    if (accion === 'salida') {
      await procesarJornadaDelDia(fechaLocalHoy());
      setMensaje('Jornada completa y calculada.');
    } else {
      setMensaje(null);
    }

    setNota('');
    await cargar();
    setGuardando(false);
  }

  async function alConfirmarEvidencia(): Promise<void> {
    setMostrarEvidencia(false);
    if (accion === 'salida') await procesarJornadaDelDia(fechaLocalHoy());
    await cargar();
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6">
      {turno && (
        <p className="text-sm text-slate-500">
          Turno activo: <strong>{turno.nombre}</strong>
        </p>
      )}

      <div className="w-full max-w-xs space-y-1 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase text-slate-400">Hoy</p>
        {registrosHoy.length === 0 && <p className="text-sm text-slate-400">Sin marcaciones todavia</p>}
        {registrosHoy.map((r) => (
          <p key={r.id} className="text-sm">
            {obtenerEtiquetaAccion(r.tipoEvento as AccionMarcado)}: {formatoHora(r.horaReal)}
            {r.fotoId ? ' (con evidencia)' : ''}
          </p>
        ))}
      </div>

      {accion ? (
        <>
          <button
            onClick={() => void marcarAhora()}
            disabled={guardando}
            className="flex h-40 w-40 items-center justify-center rounded-full bg-marca text-center text-lg font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-50"
          >
            {obtenerEtiquetaAccion(accion)}
          </button>

          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Nota opcional"
            className="w-full max-w-xs rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />

          <button onClick={() => setMostrarEvidencia(true)} className="text-sm font-medium text-marca underline">
            Agregar evidencia (foto) a esta marcacion
          </button>
        </>
      ) : (
        <p className="text-center text-slate-500">Ya completaste tu jornada de hoy.</p>
      )}

      {mensaje && <p className="text-sm font-semibold text-emerald-600">{mensaje}</p>}

      {mostrarEvidencia && accion && turno?.id && (
        <EvidenciaFotoModal
          accion={accion}
          turnoId={turno.id}
          onCerrar={() => setMostrarEvidencia(false)}
          onConfirmado={() => void alConfirmarEvidencia()}
        />
      )}
    </div>
  );
}
