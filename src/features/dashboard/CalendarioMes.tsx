import { Camera, Coffee, Flag, Zap } from 'lucide-react';
import type { JornadaRow } from '../../data/db';
import { horasDeJornada } from '../../aplicacion/resumenCorte';
import { formatoFechaLocal } from '../../utils/fecha';

interface Props {
  mes: Date;
  jornadas: JornadaRow[];
  asuetos: Set<string>;
  conFoto: Set<string>;
}

const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/**
 * Calendario mensual tipo heatmap: la intensidad (un solo tono, azul)
 * indica las horas trabajadas; los iconos marcan asueto, extra, foto y dia libre.
 */
export default function CalendarioMes({ mes, jornadas, asuetos, conFoto }: Props) {
  const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const diasMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const porFecha = new Map(jornadas.map((j) => [j.fecha, j]));
  const hoy = formatoFechaLocal(new Date());
  const celdas: (number | null)[] = [...Array(primero.getDay()).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)];

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-tenue">
        {DIAS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {celdas.map((dia, i) => {
          if (dia === null) return <span key={`v${i}`} />;
          const fecha = formatoFechaLocal(new Date(mes.getFullYear(), mes.getMonth(), dia));
          const j = porFecha.get(fecha);
          const horas = j ? Object.values(horasDeJornada(j)).reduce((a, b) => a + b, 0) : 0;
          const h = j ? horasDeJornada(j) : null;
          const extra = h ? h.extraDiurna + h.extraNocturna + h.asuetoExtraDiurna + h.asuetoExtraNocturna > 0 : false;
          const intensidad = Math.min(horas / 10, 1);
          return (
            <div
              key={fecha}
              title={j ? `${fecha}: ${horas.toFixed(2)} h` : fecha}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-[11px] ${
                asuetos.has(fecha) ? 'border-2 border-asueto' : fecha === hoy ? 'border border-acento' : 'border border-transparent'
              } ${j ? '' : asuetos.has(fecha) ? 'bg-asueto/20 text-asuetotx' : 'bg-elevada/50 text-tenue'}`}
              style={j ? { backgroundColor: `rgb(var(--c-azul) / ${0.15 + intensidad * 0.55})` } : undefined}
            >
              <span className="num font-semibold">{dia}</span>
              <span className="flex h-3 items-center gap-0.5">
                {asuetos.has(fecha) && <Flag className="h-2.5 w-2.5 text-asuetotx" aria-label="asueto" />}
                {extra && <Zap className="h-2.5 w-2.5" aria-label="extra" />}
                {conFoto.has(fecha) && <Camera className="h-2.5 w-2.5" aria-label="con foto" />}
                {j?.esDescansoSemanalLaborado && <Coffee className="h-2.5 w-2.5" aria-label="dia libre laborado" />}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-tenue">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-2 border-asueto" /> asueto</span>
        <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> extra</span>
        <span className="flex items-center gap-1"><Camera className="h-3 w-3" /> foto</span>
        <span className="flex items-center gap-1"><Coffee className="h-3 w-3" /> dia libre laborado</span>
      </p>
    </div>
  );
}
