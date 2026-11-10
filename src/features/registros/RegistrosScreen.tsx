import { useEffect, useRef, useState, type PointerEvent as EventoPuntero } from 'react';
import { CalendarPlus, Camera, ChevronRight, Coffee, Flag, Pencil, Plus, Trash2, Zap } from 'lucide-react';
import type { CorteRow, JornadaRow, RegistroRow } from '../../data/db';
import { listarCortes } from '../../data/repos/configRepo';
import { listarJornadasEntre, listarRegistrosEntre } from '../../data/repos/registrosRepo';
import { listarTurnos } from '../../data/repos/perfilRepo';
import { eliminarJornadaCompleta } from '../../aplicacion/operacionesJornada';
import { horasDeJornada } from '../../aplicacion/resumenCorte';
import { useApp } from '../../aplicacion/AppContexto';
import { fechaCorta, fechaLocalHoy, formatoFechaLocal, parsearFechaLocal } from '../../utils/fecha';
import EstadoVacio from '../../components/EstadoVacio';
import ChipCodigo from '../../components/ChipCodigo';
import type { TipoHora } from '../../domain/tipos';
import DetalleJornada from './DetalleJornada';
import FormDiaPasado from './FormDiaPasado';

interface FilaDia {
  fecha: string;
  jornada: JornadaRow | null;
  registros: RegistroRow[];
}

const ANCHO_ACCIONES = 136;

function inicioSemana(fecha: string): string {
  const d = parsearFechaLocal(fecha);
  d.setDate(d.getDate() - d.getDay());
  return formatoFechaLocal(d);
}

/** Fila con gesto: deslizar a la izquierda muestra Editar y Eliminar. */
function FilaDeslizable({ fila, nocturno, onAbrir, onEliminar }: { fila: FilaDia; nocturno: boolean; onAbrir: () => void; onEliminar: () => void }) {
  const [dx, setDx] = useState(0);
  const inicio = useRef<number | null>(null);
  const movio = useRef(false);

  function abajo(e: EventoPuntero) {
    inicio.current = e.clientX + -dx;
    movio.current = false;
  }
  function mover(e: EventoPuntero) {
    if (inicio.current === null) return;
    const nuevo = Math.min(0, Math.max(-ANCHO_ACCIONES, e.clientX - inicio.current));
    if (Math.abs(nuevo - dx) > 4) movio.current = true;
    setDx(nuevo);
  }
  function arriba() {
    inicio.current = null;
    setDx((v) => (v < -ANCHO_ACCIONES / 2 ? -ANCHO_ACCIONES : 0));
  }

  const j = fila.jornada;
  const h = j ? horasDeJornada(j) : null;
  const total = h ? Object.values(h).reduce((a, b) => a + b, 0) : 0;
  const extra = h ? h.extraDiurna + h.extraNocturna + h.asuetoExtraDiurna + h.asuetoExtraNocturna : 0;
  const conFoto = fila.registros.some((r) => r.fotoId);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 flex" style={{ width: ANCHO_ACCIONES }}>
        <button onClick={onAbrir} className="flex flex-1 flex-col items-center justify-center gap-1 bg-elevada text-xs font-semibold">
          <Pencil className="h-4 w-4" /> Editar
        </button>
        <button onClick={onEliminar} className="flex flex-1 flex-col items-center justify-center gap-1 bg-peligro text-xs font-semibold text-white">
          <Trash2 className="h-4 w-4" /> Eliminar
        </button>
      </div>
      <button
        onPointerDown={abajo}
        onPointerMove={mover}
        onPointerUp={arriba}
        onPointerCancel={arriba}
        onClick={() => !movio.current && (dx === 0 ? onAbrir() : setDx(0))}
        style={{ transform: `translateX(${dx}px)`, touchAction: 'pan-y' }}
        className={`relative flex w-full items-center gap-3 border p-3 text-left transition-transform duration-150 ${
          j?.esAsueto ? 'border-asueto bg-[linear-gradient(90deg,rgb(var(--c-asueto)/0.28),rgb(var(--c-superficie))_70%)]' : 'border-borde/70 bg-superficie'
        }`}
      >
        <span className={`h-10 w-1.5 rounded-full ${nocturno ? 'bg-nocturno' : 'bg-diurno'}`} aria-hidden />
        <span className="flex-1">
          <span className="flex items-center gap-2">
            <span className="block font-semibold first-letter:uppercase">{fechaCorta(fila.fecha)}</span>
            {j?.esAsueto && (
              <span className="flex items-center gap-1 rounded-full bg-asueto px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sobre-asueto">
                <Flag className="h-3 w-3" aria-hidden /> Asueto
              </span>
            )}
          </span>
          {j?.esAsueto && j.nombreAsueto && <span className="block text-[11px] font-semibold text-asuetotx">{j.nombreAsueto}</span>}
          {h && (
            <span className="mt-1 flex flex-wrap gap-1">
              {(Object.entries(h) as [TipoHora, number][])
                .filter(([tipo, horas]) => horas > 0 && tipo !== 'ordinariaDiurna' && tipo !== 'ordinariaNocturna')
                .map(([tipo, horas]) => (
                  <span key={tipo} className="inline-flex items-center gap-1">
                    <ChipCodigo tipoHora={tipo} />
                    <span className="num text-[11px] font-semibold">{horas.toFixed(2)}</span>
                  </span>
                ))}
            </span>
          )}
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-tenue">
            {!j && <span className="font-semibold text-aviso">Incompleta</span>}
            {j?.esDescansoSemanalLaborado && <Coffee className="h-3.5 w-3.5 text-exito" aria-label="dia libre laborado" />}
            {extra > 0 && (
              <span className="num flex items-center gap-0.5 font-semibold text-aviso">
                <Zap className="h-3.5 w-3.5" aria-hidden /> {extra.toFixed(2)} h extra
              </span>
            )}
            {conFoto && <Camera className="h-3.5 w-3.5 text-acentotx" aria-label="con foto" />}
            {j?.recesoAsumido && <span>receso asumido</span>}
          </span>
        </span>
        <span className="num text-lg font-semibold">{j ? `${total.toFixed(2)} h` : '--'}</span>
        <ChevronRight className="h-4 w-4 text-tenue" aria-hidden />
      </button>
    </div>
  );
}

export default function RegistrosScreen() {
  const { version, refrescar } = useApp();
  const [cortes, setCortes] = useState<CorteRow[]>([]);
  const [corteId, setCorteId] = useState<number | null>(null);
  const [filas, setFilas] = useState<FilaDia[]>([]);
  const [nocturnoPorTurno, setNocturnoPorTurno] = useState<Map<number, boolean>>(new Map());
  const [abierta, setAbierta] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);

  useEffect(() => {
    void (async () => {
      const todos = await listarCortes();
      setCortes(todos);
      const hoy = fechaLocalHoy();
      setCorteId((actual) => actual ?? todos.find((c) => c.fechaInicio <= hoy && hoy <= c.fechaCorte)?.id ?? todos.at(-1)?.id ?? null);
      setNocturnoPorTurno(new Map((await listarTurnos()).map((t) => [t.id!, t.tipoBase === 'NOCTURNO'])));
    })();
  }, [version]);

  useEffect(() => {
    void (async () => {
      const corte = cortes.find((c) => c.id === corteId);
      const hasta = corte?.fechaCorte ?? fechaLocalHoy();
      const desdeD = parsearFechaLocal(hasta);
      desdeD.setDate(desdeD.getDate() - 30);
      const desde = corte?.fechaInicio ?? formatoFechaLocal(desdeD);
      const [jornadas, registros] = await Promise.all([listarJornadasEntre(desde, hasta), listarRegistrosEntre(desde, hasta)]);
      const fechas = [...new Set([...jornadas.map((j) => j.fecha), ...registros.map((r) => r.fecha)])].sort().reverse();
      setFilas(
        fechas.map((fecha) => ({
          fecha,
          jornada: jornadas.find((j) => j.fecha === fecha) ?? null,
          registros: registros.filter((r) => r.fecha === fecha),
        }))
      );
    })();
  }, [cortes, corteId, version]);

  if (abierta) return <DetalleJornada fecha={abierta} onVolver={() => setAbierta(null)} />;

  const semanas = new Map<string, FilaDia[]>();
  for (const f of filas) {
    const clave = inicioSemana(f.fecha);
    semanas.set(clave, [...(semanas.get(clave) ?? []), f]);
  }

  return (
    <div className="pt-2 mx-auto max-w-md px-4 pb-24">
      <header className="py-2">
        <p className="etiqueta">Historial</p>
        <h1 className="font-display text-xl font-semibold">Registros</h1>
      </header>

      {cortes.length > 0 && (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {[...cortes].reverse().map((c) => (
            <button
              key={c.id}
              onClick={() => setCorteId(c.id!)}
              className={`pulsable num whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                c.id === corteId ? 'bg-acento text-sobre-acento' : 'bg-elevada text-tenue'
              }`}
            >
              {fechaCorta(c.fechaInicio)} - {fechaCorta(c.fechaCorte)}
            </button>
          ))}
        </div>
      )}

      {filas.length === 0 ? (
        <EstadoVacio
          icono={<CalendarPlus className="h-8 w-8" />}
          titulo="Sin registros en este periodo"
          texto="Marca tu entrada y salida en la pestana Marcar, o agrega un dia pasado con el boton +."
        />
      ) : (
        <div className="space-y-5">
          {[...semanas.entries()].map(([semana, dias]) => {
            const totalSemana = dias.reduce((acc, d) => acc + (d.jornada ? Object.values(horasDeJornada(d.jornada)).reduce((a, b) => a + b, 0) : 0), 0);
            return (
              <section key={semana}>
                <p className="etiqueta mb-2 flex justify-between">
                  <span>Semana del {fechaCorta(semana)}</span>
                  <span className="num">{totalSemana.toFixed(2)} h</span>
                </p>
                <div className="space-y-2">
                  {dias.map((f) => (
                    <FilaDeslizable
                      key={f.fecha}
                      fila={f}
                      nocturno={nocturnoPorTurno.get(f.jornada?.turnoId ?? f.registros[0]?.turnoId ?? -1) ?? true}
                      onAbrir={() => setAbierta(f.fecha)}
                      onEliminar={() => {
                        if (window.confirm('Eliminar todas las marcas y fotos de este dia?')) {
                          void eliminarJornadaCompleta(f.fecha).then(refrescar);
                        }
                      }}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-center text-[11px] text-tenue">Desliza un dia a la izquierda para editarlo o eliminarlo.</p>

      <button
        onClick={() => setAgregando(true)}
        aria-label="Agregar dia pasado"
        className="pulsable fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-acento text-sobre-acento shadow-xl shadow-acento/30"
      >
        <Plus className="h-7 w-7" />
      </button>

      {agregando && (
        <FormDiaPasado
          onCerrar={() => setAgregando(false)}
          onGuardado={() => {
            setAgregando(false);
            refrescar();
          }}
        />
      )}
    </div>
  );
}
