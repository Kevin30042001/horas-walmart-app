import type { Intervalo } from '../tipos';

export interface RecesoResuelto {
  receso: Intervalo | null;
  /** true = no se marco, se descuenta la ventana programada ("receso asumido", editable). */
  asumido: boolean;
}

/**
 * Decide que receso descontar en una jornada:
 *  1. Si se marco inicio y fin de receso, se usa el real.
 *  2. Si no, y el horario del dia tiene receso, se descuenta la ventana
 *     programada recortada a lo efectivamente trabajado ("receso asumido").
 *  3. Si no, no se descuenta nada.
 */
export function resolverReceso(
  marcado: Intervalo | null,
  programado: Intervalo | null,
  entrada: Date,
  salida: Date
): RecesoResuelto {
  if (marcado) return { receso: marcado, asumido: false };
  if (!programado) return { receso: null, asumido: false };

  const inicio = Math.max(programado.inicio.getTime(), entrada.getTime());
  const fin = Math.min(programado.fin.getTime(), salida.getTime());
  if (fin <= inicio) return { receso: null, asumido: false };
  return { receso: { inicio: new Date(inicio), fin: new Date(fin) }, asumido: true };
}
