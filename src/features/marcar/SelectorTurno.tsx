import { useEffect, useState } from 'react';
import { Check, ChevronDown, Moon, Sun } from 'lucide-react';
import type { TurnoRow } from '../../data/db';
import { cambiarTurnoDesdeHoy, listarTurnos } from '../../data/repos/perfilRepo';
import { recalcularTodasLasJornadas } from '../../aplicacion/recalcular';
import { minutosProgramadosSemana } from '../../domain/horario/ventana';
import Hoja from '../../components/Hoja';

interface Props {
  turno: TurnoRow | null;
  onCambiado: () => void;
}

/** Chip del turno activo: un toque para rotar entre Despacho y Recibo (queda registrada la rotacion). */
export default function SelectorTurno({ turno, onCambiado }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [turnos, setTurnos] = useState<TurnoRow[]>([]);

  useEffect(() => {
    if (abierto) void listarTurnos().then(setTurnos);
  }, [abierto]);

  async function elegir(t: TurnoRow): Promise<void> {
    if (t.id !== turno?.id) {
      await cambiarTurnoDesdeHoy(t.id!);
      await recalcularTodasLasJornadas();
    }
    setAbierto(false);
    onCambiado();
  }

  const Icono = turno?.tipoBase === 'DIURNO' ? Sun : Moon;
  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="pulsable flex items-center gap-1.5 rounded-full border border-acento/40 bg-acento/10 py-1.5 pl-2.5 pr-2 text-xs font-bold tracking-wide text-acentotx"
        aria-label={`Turno activo ${turno?.nombre ?? ''}. Cambiar turno`}
      >
        <Icono className="h-3.5 w-3.5" aria-hidden />
        {turno?.nombre ?? 'Sin turno'}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </button>
      {abierto && (
        <Hoja titulo="Cambiar de turno" onCerrar={() => setAbierto(false)}>
          <p className="mb-3 text-sm text-tenue">Se registra la rotacion desde hoy. Tus jornadas pasadas no cambian de turno.</p>
          <div className="space-y-2">
            {turnos.map((t) => {
              const nocturno = t.tipoBase === 'NOCTURNO';
              const activo = t.id === turno?.id;
              return (
                <button
                  key={t.id}
                  onClick={() => void elegir(t)}
                  className={`pulsable flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${
                    activo ? 'border-acento bg-acento/10' : 'border-borde bg-elevada/50'
                  }`}
                >
                  <span className={`rounded-xl p-2 ${nocturno ? 'bg-nocturno/20 text-nocturno' : 'bg-diurno/20 text-diurno'}`}>
                    {nocturno ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </span>
                  <span className="flex-1">
                    <span className="block font-display font-semibold">{t.nombre}</span>
                    <span className="num text-xs text-tenue">
                      {nocturno ? 'Nocturno' : 'Diurno'} - {(minutosProgramadosSemana(t.horarioPorDia) / 60).toFixed(0)} h/semana
                    </span>
                  </span>
                  {activo && <Check className="h-5 w-5 text-acentotx" aria-hidden />}
                </button>
              );
            })}
          </div>
        </Hoja>
      )}
    </>
  );
}
