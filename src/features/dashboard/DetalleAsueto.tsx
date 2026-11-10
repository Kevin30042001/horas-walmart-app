import { useState } from 'react';
import { ChevronDown, Flag } from 'lucide-react';
import type { JornadaRow } from '../../data/db';
import type { TramoJornada } from '../../domain/tipos';
import { minutosADecimal } from '../../domain/tiempo/decimal';
import { CODIGO_WALMART } from '../../domain/calculo/codigos';
import { useApp } from '../../aplicacion/AppContexto';
import { formatoFechaLegible } from '../../utils/fecha';

const suma = (tramos: TramoJornada[]) => Math.round(tramos.reduce((a, t) => a + minutosADecimal(t.minutos), 0) * 100) / 100;

/**
 * Tarjeta de asueto que se despliega: por cada dia de asueto muestra que se
 * trabajo en tu horario normal (TE2_H / TE2.5_H), que fue extra (TE4.0 /
 * TE5.0) y si se pago la hora de comida.
 */
export default function DetalleAsueto({ jornadas }: { jornadas: JornadaRow[] }) {
  const { hora } = useApp();
  const [abierto, setAbierto] = useState(false);
  const conAsueto = jornadas
    .map((j) => ({ j, tramos: (j.tramos ?? []).filter((t) => t.tipoHora.startsWith('asueto')) }))
    .filter((x) => x.tramos.length > 0);
  const total = suma(conAsueto.flatMap((x) => x.tramos));

  if (conAsueto.length === 0) {
    return (
      <div className="tarjeta">
        <p className="flex items-center gap-1.5 text-xs text-tenue">
          <span className="h-2 w-2 rounded-full bg-asueto" aria-hidden /> Asueto
        </p>
        <p className="num mt-1 text-2xl font-semibold tracking-tight">0.00 h</p>
        <p className="text-xs text-tenue">Sin asuetos trabajados</p>
      </div>
    );
  }

  return (
    <div className={`col-span-2 rounded-3xl border border-asueto/60 bg-superficie ${abierto ? '' : ''}`}>
      <button onClick={() => setAbierto(!abierto)} aria-expanded={abierto} className="pulsable flex w-full items-center gap-3 p-4 text-left">
        <span className="rounded-2xl bg-asueto p-2 text-sobre-asueto">
          <Flag className="h-5 w-5" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-xs text-tenue">Asueto trabajado ({conAsueto.length} dia{conAsueto.length > 1 ? 's' : ''})</span>
          <span className="num block text-2xl font-semibold tracking-tight">{total.toFixed(2)} h</span>
        </span>
        <span className="flex items-center gap-1 text-xs font-semibold text-asuetotx">
          {abierto ? 'Ocultar' : 'Ver detalle'}
          <ChevronDown className={`h-4 w-4 transition ${abierto ? 'rotate-180' : ''}`} aria-hidden />
        </span>
      </button>

      {abierto && (
        <div className="space-y-3 border-t border-borde/60 p-4 pt-3">
          {conAsueto.map(({ j, tramos }) => {
            const normal = tramos.filter((t) => t.categoria === 'ordinario');
            const extra = tramos.filter((t) => t.categoria === 'extra' && !t.recesoPagado);
            const receso = tramos.filter((t) => t.recesoPagado);
            const d0 = new Date(tramos[0]!.inicio);
            const fechaAsueto = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}`;
            const grupo = (titulo: string, detalle: string, lista: TramoJornada[]) =>
              lista.length > 0 && (
                <div className="rounded-2xl bg-elevada/60 p-3">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-semibold">{titulo}</p>
                    <p className="num text-sm font-bold">{suma(lista).toFixed(2)} h</p>
                  </div>
                  <p className="mb-1 text-[11px] text-tenue">{detalle}</p>
                  {lista.map((t, i) => (
                    <p key={i} className="num flex justify-between text-xs">
                      <span>
                        {hora(t.inicio)} - {hora(t.fin)}
                      </span>
                      <span className="font-semibold">
                        {CODIGO_WALMART[t.tipoHora]} - {minutosADecimal(t.minutos).toFixed(2)} h
                      </span>
                    </p>
                  ))}
                </div>
              );
            return (
              <div key={j.fecha}>
                <p className="text-sm font-semibold">
                  Jornada del {formatoFechaLegible(j.fecha)}
                  {j.nombreAsueto && <span className="text-asuetotx"> - {j.nombreAsueto}</span>}
                </p>
                {fechaAsueto !== j.fecha && (
                  <p className="mb-2 text-xs text-asuetotx">
                    Entraste el {formatoFechaLegible(j.fecha)}; solo las horas despues de medianoche ({formatoFechaLegible(fechaAsueto)}) son asueto.
                  </p>
                )}
                {fechaAsueto === j.fecha && <div className="mb-2" />}
                <div className="space-y-2">
                  {grupo('En tu horario normal', 'Horas que te tocaba trabajar, pagadas como asueto (TE2_H 200 % / TE2.5_H 250 %)', normal)}
                  {grupo('Extra en asueto', 'Fuera de tu horario: TE4.0 400 % (diurna) / TE5.0 500 % (nocturna)', extra)}
                  {grupo('Comida pagada', 'Tu receso cayo en el asueto y se paga como extra (como en Walmart)', receso)}
                </div>
                <p className="mt-1 text-[11px] text-tenue">
                  Solo cuentan las horas entre 00:00 y 24:00 del dia de asueto; el resto de la jornada se paga normal.
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
