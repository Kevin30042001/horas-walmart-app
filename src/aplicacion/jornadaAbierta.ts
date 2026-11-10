import type { RegistroRow } from '../data/db';
import { formatoFechaLocal } from '../utils/fecha';

/** Por defecto: una entrada sin salida de hace menos de 16 h sigue "abierta". */
export const HORAS_MAX_JORNADA_ABIERTA = 16;

type MarcaMinima = Pick<RegistroRow, 'fecha' | 'tipoEvento' | 'horaReal'>;

/**
 * Busca la jornada ABIERTA: la de la entrada mas reciente que todavia no tiene
 * salida y que ocurrio en las ultimas `horasMax` horas. Devuelve su fecha (la
 * fecha de ENTRADA), o null si no hay ninguna.
 *
 * Esto arregla el bug del turno nocturno: si entro a las 21:00 del lunes, a las
 * 00:05 del martes la jornada abierta sigue siendo la del lunes, en vez de que
 * la app crea que es "otro dia" y vuelva a pedir "Marcar entrada".
 */
export function encontrarJornadaAbierta(
  registrosRecientes: MarcaMinima[],
  ahora: Date,
  horasMax = HORAS_MAX_JORNADA_ABIERTA
): string | null {
  const limite = ahora.getTime() - horasMax * 3600_000;
  const entradas = registrosRecientes
    .filter((r) => r.tipoEvento === 'entrada')
    .filter((r) => r.horaReal.getTime() >= limite && r.horaReal.getTime() <= ahora.getTime())
    .sort((a, b) => b.horaReal.getTime() - a.horaReal.getTime());

  for (const entrada of entradas) {
    const cerrada = registrosRecientes.some((r) => r.fecha === entrada.fecha && r.tipoEvento === 'salida');
    if (!cerrada) return entrada.fecha;
  }
  return null;
}

/** Fecha de jornada a la que pertenece una marca hecha `ahora`. */
export function fechaParaNuevaMarca(
  registrosRecientes: MarcaMinima[],
  ahora: Date,
  horasMax = HORAS_MAX_JORNADA_ABIERTA
): string {
  return encontrarJornadaAbierta(registrosRecientes, ahora, horasMax) ?? formatoFechaLocal(ahora);
}
