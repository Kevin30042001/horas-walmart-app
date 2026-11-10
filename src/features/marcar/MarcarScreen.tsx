import { useEffect, useState } from 'react';
import { formatoHora } from '../../utils/fecha';
import { obtenerEstadoMarcado, registrarMarca, type EstadoMarcado } from '../../aplicacion/marcado';
import { obtenerEtiquetaAccion, type AccionMarcado } from '../../aplicacion/estadoDelDia';
import EvidenciaFotoModal from './EvidenciaFotoModal';

export default function MarcarScreen() {
  const [estado, setEstado] = useState<EstadoMarcado | null>(null);
  const [nota, setNota] = useState('');
  const [evidenciaPara, setEvidenciaPara] = useState<AccionMarcado | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    void cargar();
  }, []);

  async function cargar(): Promise<void> {
    setEstado(await obtenerEstadoMarcado(new Date()));
  }

  async function marcar(accion: AccionMarcado): Promise<void> {
    if (!estado?.turno?.id) return;
    setGuardando(true);
    await registrarMarca({
      accion,
      horaReal: new Date(),
      fechaJornada: estado.fechaJornada,
      turnoId: estado.turno.id,
      nota,
    });
    setMensaje(accion === 'salida' ? 'Jornada completa y calculada.' : null);
    setNota('');
    await cargar();
    setGuardando(false);
  }

  if (!estado) return null;
  const { principal, secundarias } = estado.acciones;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6">
      {estado.turno && (
        <p className="text-sm text-slate-500">
          Turno activo: <strong>{estado.turno.nombre}</strong>
        </p>
      )}

      <div className="w-full max-w-xs space-y-1 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase text-slate-400">Jornada del {estado.fechaJornada}</p>
        {estado.registros.length === 0 && <p className="text-sm text-slate-400">Sin marcaciones todavia</p>}
        {estado.registros.map((r) => (
          <p key={r.id} className="text-sm">
            {obtenerEtiquetaAccion(r.tipoEvento)}: {formatoHora(r.horaReal)}
            {r.fotoId ? ' (con evidencia)' : ''}
          </p>
        ))}
      </div>

      {principal ? (
        <>
          <button
            onClick={() => void marcar(principal)}
            disabled={guardando}
            className="flex h-40 w-40 items-center justify-center rounded-full bg-marca text-center text-lg font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-50"
          >
            {obtenerEtiquetaAccion(principal)}
          </button>
          {secundarias.map((a) => (
            <button key={a} onClick={() => void marcar(a)} disabled={guardando} className="text-sm font-medium text-marca">
              {obtenerEtiquetaAccion(a)}
            </button>
          ))}
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Nota opcional"
            className="w-full max-w-xs rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <button onClick={() => setEvidenciaPara(principal)} className="text-sm font-medium text-marca underline">
            Marcar con foto (evidencia)
          </button>
        </>
      ) : (
        <p className="text-center text-slate-500">Jornada completa.</p>
      )}

      {mensaje && <p className="text-sm font-semibold text-emerald-600">{mensaje}</p>}

      {evidenciaPara && (
        <EvidenciaFotoModal
          modo="marcar"
          accion={evidenciaPara}
          onCerrar={() => setEvidenciaPara(null)}
          onConfirmado={() => {
            setEvidenciaPara(null);
            void cargar();
          }}
        />
      )}
    </div>
  );
}
