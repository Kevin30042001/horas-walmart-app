import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { Camera, CheckCircle2, Coffee, LogIn, LogOut, NotebookPen, Play, Sparkles, TriangleAlert } from 'lucide-react';
import { obtenerEstadoMarcado, registrarMarca, type EstadoMarcado } from '../../aplicacion/marcado';
import { obtenerEtiquetaAccion, type AccionMarcado } from '../../aplicacion/estadoDelDia';
import { calcularProgreso } from '../../aplicacion/progresoJornada';
import { horasDeJornada } from '../../aplicacion/resumenCorte';
import { obtenerUltimaJornada } from '../../data/repos/registrosRepo';
import { minutosProgramados } from '../../domain/horario/ventana';
import { duracionHHMM, fechaLocalHoy, formatoFechaLegible } from '../../utils/fecha';
import { vibrarConfirmacion } from '../../utils/haptica';
import { useApp } from '../../aplicacion/AppContexto';
import type { JornadaRow } from '../../data/db';
import AnilloProgreso from '../../components/AnilloProgreso';
import Hoja from '../../components/Hoja';
import Boton from '../../components/Boton';
import EvidenciaFotoModal from './EvidenciaFotoModal';
import SelectorTurno from './SelectorTurno';

const ICONO_ACCION: Record<AccionMarcado, ComponentType<{ className?: string }>> = {
  entrada: LogIn,
  inicioReceso: Coffee,
  finReceso: Play,
  salida: LogOut,
};

const ESTADO_TEXTO = {
  sinMarcar: 'Sin marcar',
  enJornada: 'En jornada',
  enReceso: 'En receso',
  completa: 'Jornada completa',
} as const;

/** Minutos de gracia antes de sugerir "usar la hora programada". */
const GRACIA_SUGERENCIA_MIN = 15;

export default function MarcarScreen() {
  const { hora, refrescar, version } = useApp();
  const [estado, setEstado] = useState<EstadoMarcado | null>(null);
  const [ultima, setUltima] = useState<JornadaRow | null>(null);
  const [ahora, setAhora] = useState(new Date());
  const [guardando, setGuardando] = useState(false);
  const [evidenciaPara, setEvidenciaPara] = useState<AccionMarcado | null>(null);
  const [editandoNota, setEditandoNota] = useState(false);
  const [nota, setNota] = useState('');
  const [recienCompletada, setRecienCompletada] = useState(false);

  const cargar = useCallback(async () => {
    const t = new Date();
    setAhora(t);
    setEstado(await obtenerEstadoMarcado(t));
    setUltima((await obtenerUltimaJornada()) ?? null);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar, version]);

  // Contador en vivo: cada segundo con la jornada abierta, cada 30 s si no.
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), estado?.jornadaAbierta ? 1000 : 30_000);
    return () => clearInterval(id);
  }, [estado?.jornadaAbierta]);

  async function marcar(accion: AccionMarcado, horaReal = new Date(), automatica = false): Promise<void> {
    if (!estado?.turno?.id || guardando) return;
    setGuardando(true);
    try {
      await registrarMarca({
        accion,
        horaReal,
        fechaJornada: estado.fechaJornada,
        turnoId: estado.turno.id,
        nota,
        origen: automatica ? 'auto' : 'manual',
        horaPlanificada: automatica ? horaReal : null,
      });
      void vibrarConfirmacion(accion === 'salida');
      setRecienCompletada(accion === 'salida');
      setNota('');
      await cargar();
      refrescar();
    } finally {
      setGuardando(false);
    }
  }

  if (!estado) return null;

  const { principal, secundarias } = estado.acciones;
  const progreso = calcularProgreso(estado.registros, estado.ventana, ahora);
  const programadoMin = estado.horario ? minutosProgramados(estado.horario) : 0;
  const diaLibre = !estado.horario;
  const registro = (t: AccionMarcado) => estado.registros.find((r) => r.tipoEvento === t);
  const esDeAyer = estado.fechaJornada !== fechaLocalHoy();

  // Sugerencias "olvidaste marcar": proponer la hora programada para confirmar con un toque.
  const v = estado.ventana;
  const sugerencia =
    v && principal === 'entrada' && ahora.getTime() > v.inicio.getTime() + GRACIA_SUGERENCIA_MIN * 60_000 && ahora < v.fin
      ? { accion: 'entrada' as const, hora: v.inicio }
      : v && estado.jornadaAbierta && principal !== 'finReceso' && ahora.getTime() > v.fin.getTime() + 2 * 3600_000
        ? { accion: 'salida' as const, hora: v.fin }
        : null;

  const PrincipalIcono = principal ? ICONO_ACCION[principal] : CheckCircle2;

  return (
    <div className="pt-segura mx-auto flex min-h-full max-w-md flex-col px-4 pb-6">
      <header className="flex items-start justify-between gap-3 py-2">
        <div>
          <p className="etiqueta">{esDeAyer ? 'Jornada abierta desde' : 'Hoy'}</p>
          <h1 className="font-display text-xl font-semibold first-letter:uppercase">{formatoFechaLegible(estado.fechaJornada)}</h1>
        </div>
        <SelectorTurno turno={estado.turno} onCambiado={() => { void cargar(); refrescar(); }} />
      </header>

      {diaLibre && (
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-elevada p-3 text-sm text-tenue">
          <Sparkles className="h-4 w-4 shrink-0 text-acento" aria-hidden />
          Hoy es tu dia libre. Si trabajas, todo cuenta como dia libre laborado.
        </div>
      )}

      <section className="flex flex-col items-center py-4">
        <AnilloProgreso progreso={programadoMin > 0 ? progreso.trabajadoMin / programadoMin : 0}>
          {recienCompletada && progreso.estado === 'completa' ? (
            <CheckCircle2 className="mb-1 h-10 w-10 animate-completar text-exito" aria-hidden />
          ) : (
            <span className={`etiqueta ${progreso.estado === 'enReceso' ? 'animate-pulso text-aviso' : ''}`}>
              {ESTADO_TEXTO[progreso.estado]}
            </span>
          )}
          <span className="num text-6xl font-semibold tracking-tight" aria-live="polite">
            {duracionHHMM(progreso.trabajadoMin)}
          </span>
          <span className="num text-sm text-tenue">{programadoMin > 0 ? `de ${duracionHHMM(programadoMin)}` : 'sin horario'}</span>
        </AnilloProgreso>

        {progreso.extraMin > 0 && progreso.estado !== 'sinMarcar' && (
          <p className="num mt-3 rounded-full bg-aviso/15 px-3 py-1 text-sm font-semibold text-aviso">
            {progreso.estado === 'completa' ? 'Hiciste' : 'Llevas'} {duracionHHMM(progreso.extraMin)} de extra
          </p>
        )}
      </section>

      {sugerencia && (
        <div className="tarjeta mb-3 flex items-center gap-3 border-aviso/40">
          <TriangleAlert className="h-5 w-5 shrink-0 text-aviso" aria-hidden />
          <p className="flex-1 text-sm">
            Olvidaste marcar la {sugerencia.accion}? La programada era{' '}
            <strong className="num">{hora(sugerencia.hora)}</strong>.
          </p>
          <Boton variante="secundario" className="px-3 py-2" onClick={() => void marcar(sugerencia.accion, sugerencia.hora, true)}>
            Usar
          </Boton>
        </div>
      )}

      {principal ? (
        <button
          onClick={() => void marcar(principal)}
          disabled={guardando}
          className="pulsable flex h-20 w-full items-center justify-center gap-3 rounded-[28px] bg-acento font-display text-xl font-semibold text-sobre-acento shadow-xl shadow-acento/25 disabled:opacity-50"
        >
          <PrincipalIcono className="h-7 w-7" aria-hidden />
          {obtenerEtiquetaAccion(principal)}
        </button>
      ) : (
        <div className="flex h-20 w-full items-center justify-center gap-2 rounded-[28px] bg-exito/12 font-display text-lg font-semibold text-exito">
          <CheckCircle2 className="h-6 w-6" aria-hidden /> Jornada completa
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        {secundarias.map((a) => {
          const Icono = ICONO_ACCION[a];
          return (
            <button key={a} onClick={() => void marcar(a)} disabled={guardando} className="pulsable flex flex-col items-center gap-1 rounded-2xl border border-borde bg-superficie py-3 text-xs font-semibold">
              <Icono className="h-5 w-5 text-acento" aria-hidden />
              {obtenerEtiquetaAccion(a)}
            </button>
          );
        })}
        {principal && (
          <button onClick={() => setEvidenciaPara(principal)} className="pulsable flex flex-col items-center gap-1 rounded-2xl border border-borde bg-superficie py-3 text-xs font-semibold">
            <Camera className="h-5 w-5 text-acento" aria-hidden />
            Con foto
          </button>
        )}
        {principal && (
          <button onClick={() => setEditandoNota(true)} className="pulsable flex flex-col items-center gap-1 rounded-2xl border border-borde bg-superficie py-3 text-xs font-semibold">
            <NotebookPen className={`h-5 w-5 ${nota ? 'text-exito' : 'text-acento'}`} aria-hidden />
            {nota ? 'Nota lista' : 'Nota'}
          </button>
        )}
      </div>

      <section className="tarjeta mt-4">
        <p className="etiqueta mb-3">Linea de tiempo</p>
        <ol className="space-y-3">
          <FilaTiempo titulo="Entrada" programada={v ? hora(v.inicio) : '-'} real={registro('entrada') && hora(registro('entrada')!.horaReal)} />
          {(estado.horario?.receso || registro('inicioReceso')) && (
            <FilaTiempo
              titulo="Receso"
              programada={v?.receso ? `${hora(v.receso.inicio)} - ${hora(v.receso.fin)}` : '-'}
              real={
                registro('inicioReceso')
                  ? `${hora(registro('inicioReceso')!.horaReal)} - ${registro('finReceso') ? hora(registro('finReceso')!.horaReal) : '...'}`
                  : progreso.estado === 'completa' && v?.receso
                    ? 'asumido'
                    : undefined
              }
            />
          )}
          <FilaTiempo titulo="Salida" programada={v ? hora(v.fin) : '-'} real={registro('salida') && hora(registro('salida')!.horaReal)} ultima />
        </ol>
      </section>

      {ultima && ultima.fecha !== estado.fechaJornada && (
        <ResumenUltima jornada={ultima} />
      )}

      {editandoNota && (
        <Hoja titulo="Nota para la proxima marca" onCerrar={() => setEditandoNota(false)}>
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={3} className="campo" placeholder="Ej. me pidieron quedarme por inventario" />
          <Boton ancho className="mt-3" onClick={() => setEditandoNota(false)}>
            Listo
          </Boton>
        </Hoja>
      )}

      {evidenciaPara && (
        <EvidenciaFotoModal
          modo="marcar"
          accion={evidenciaPara}
          onCerrar={() => setEvidenciaPara(null)}
          onConfirmado={() => {
            setEvidenciaPara(null);
            void vibrarConfirmacion();
            void cargar();
            refrescar();
          }}
        />
      )}
    </div>
  );
}

function FilaTiempo({ titulo, programada, real, ultima }: { titulo: string; programada: string; real?: string; ultima?: boolean }) {
  return (
    <li className="relative flex items-center gap-3">
      {!ultima && <span className="absolute left-[7px] top-5 h-full w-0.5 bg-borde" aria-hidden />}
      <span className={`relative z-10 h-4 w-4 rounded-full border-2 ${real ? 'border-acento bg-acento' : 'border-borde bg-superficie'}`} aria-hidden />
      <span className="flex-1 text-sm font-semibold">{titulo}</span>
      <span className="num w-24 text-right text-xs text-tenue">{programada}</span>
      <span className={`num w-24 text-right text-sm font-semibold ${real ? '' : 'text-tenue'}`}>{real ?? '--:--'}</span>
    </li>
  );
}

function ResumenUltima({ jornada }: { jornada: JornadaRow }) {
  const h = horasDeJornada(jornada);
  const extras = h.extraDiurna + h.extraNocturna + h.asuetoExtraDiurna + h.asuetoExtraNocturna;
  const total = Object.values(h).reduce((a, b) => a + b, 0);
  return (
    <section className="tarjeta mt-3 flex items-center justify-between">
      <div>
        <p className="etiqueta">Ultima jornada</p>
        <p className="text-sm first-letter:uppercase">{formatoFechaLegible(jornada.fecha)}</p>
      </div>
      <div className="text-right">
        <p className="num text-lg font-semibold">{total.toFixed(2)} h</p>
        {extras > 0 && <p className="num text-xs font-semibold text-aviso">{extras.toFixed(2)} h extra</p>}
      </div>
    </section>
  );
}
