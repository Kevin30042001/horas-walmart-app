import type { HorarioProgramado } from '../domain/tipos';
import { relojAMinutos } from '../domain/horario/ventana';

export interface TurnoParaDeteccion {
  id: number;
  nombre: string;
  horarioPorDia: (HorarioProgramado & { diaSemana: number })[];
}

/** Diferencia en minutos entre dos relojes, considerando la vuelta de medianoche. */
function distanciaReloj(a: number, b: number): number {
  const d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
}

/**
 * Detecta un cambio de turno por el patron de marcacion: si la entrada queda
 * lejos (mas de `margenMin`) de la entrada programada del turno activo, pero
 * cerca de la de otro turno ese mismo dia de la semana, sugiere cambiar.
 * Devuelve el turno sugerido o null.
 */
export function sugerirCambioDeTurno(
  entrada: Date,
  turnoActivoId: number,
  turnos: TurnoParaDeteccion[],
  margenMin = 120
): TurnoParaDeteccion | null {
  const dia = entrada.getDay();
  const reloj = entrada.getHours() * 60 + entrada.getMinutes();
  const distancia = (t: TurnoParaDeteccion) => {
    const h = t.horarioPorDia.find((x) => x.diaSemana === dia);
    return h ? distanciaReloj(reloj, relojAMinutos(h.horaEntrada)) : Infinity;
  };
  const activo = turnos.find((t) => t.id === turnoActivoId);
  if (activo && distancia(activo) <= margenMin) return null;

  const mejor = turnos
    .filter((t) => t.id !== turnoActivoId)
    .map((t) => ({ t, d: distancia(t) }))
    .filter((x) => x.d <= margenMin)
    .sort((a, b) => a.d - b.d)[0];
  return mejor?.t ?? null;
}
