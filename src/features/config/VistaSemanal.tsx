import type { HorarioDia } from '../../data/db';
import { minutosProgramados, relojAMinutos } from '../../domain/horario/ventana';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
/** Eje de 08:00 a 08:00 del dia siguiente: cabe un turno diurno y uno nocturno completos. */
const INICIO_EJE = 8 * 60;
const pos = (hhmm: string) => {
  let m = relojAMinutos(hhmm) - INICIO_EJE;
  if (m < 0) m += 1440;
  return (m / 1440) * 100;
};

interface Props {
  horario: HorarioDia[];
  /** Dia seleccionado (para resaltar al editar). */
  seleccionado?: number | null;
  onElegir?: (diaSemana: number) => void;
}

/** Editor/visor visual del horario semanal: una barra por dia sobre un eje de 24 h. */
export default function VistaSemanal({ horario, seleccionado, onElegir }: Props) {
  return (
    <div className="space-y-1.5">
      <div className="num ml-10 flex justify-between pr-12 text-[9px] text-tenue">
        {['08', '14', '20', '02', '08'].map((h, i) => (
          <span key={i}>{h}</span>
        ))}
      </div>
      {[0, 1, 2, 3, 4, 5, 6].map((d) => {
        const h = horario.find((x) => x.diaSemana === d);
        const ini = h ? pos(h.horaEntrada) : 0;
        let fin = h ? pos(h.horaSalida) : 0;
        if (h && fin <= ini) fin = 100;
        const rIni = h?.receso ? pos(h.receso.inicio) : 0;
        const rFin = h?.receso ? pos(h.receso.fin) : 0;
        return (
          <button
            key={d}
            type="button"
            onClick={() => onElegir?.(d)}
            className={`flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left ${seleccionado === d ? 'bg-acento/10' : ''}`}
          >
            <span className="w-8 text-[11px] font-semibold text-tenue">{DIAS[d]}</span>
            <span className="relative h-4 flex-1 rounded-full bg-elevada">
              {[25, 50, 75].map((p) => (
                <span key={p} className="absolute inset-y-0 w-px bg-borde" style={{ left: `${p}%` }} aria-hidden />
              ))}
              {h && <span className="absolute inset-y-0 rounded-full bg-acento" style={{ left: `${ini}%`, width: `${Math.max(fin - ini, 1)}%` }} />}
              {h?.receso && rFin > rIni && (
                <span className="absolute inset-y-0.5 rounded-full bg-superficie/80" style={{ left: `${rIni}%`, width: `${rFin - rIni}%` }} title="receso" />
              )}
            </span>
            <span className="num w-10 text-right text-[11px] font-semibold">{h ? `${(minutosProgramados(h) / 60).toFixed(0)} h` : 'libre'}</span>
          </button>
        );
      })}
    </div>
  );
}
