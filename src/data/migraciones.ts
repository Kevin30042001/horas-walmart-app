import type { HorarioDia } from './db';
import { HORARIO_DESPACHO, HORARIO_RECIBO } from '../domain/horario/horarioReal';
import { relojAMinutos } from '../domain/horario/ventana';

/** Forma del horario en la version 1 del esquema (receso solo en minutos). */
export interface HorarioDiaV1 {
  diaSemana: number;
  horaEntrada: string;
  horaSalida: string;
  recesoMin?: number;
  receso?: HorarioDia['receso'];
}

/** Semillas que traia la v1: si el turno sigue igual, nunca se edito a mano. */
const SEMILLA_V1: Record<string, HorarioDiaV1[]> = {
  DESPACHO: [0, 1, 2, 3, 4, 5].map((d) => ({ diaSemana: d, horaEntrada: '20:00', horaSalida: '04:00', recesoMin: 60 })),
  RECIBO: [
    ...[1, 2, 3, 4, 5].map((d) => ({ diaSemana: d, horaEntrada: '10:00', horaSalida: '19:00', recesoMin: 30 })),
    { diaSemana: 6, horaEntrada: '14:00', horaSalida: '18:00', recesoMin: 0 },
  ],
};

export const HORARIO_REAL_POR_NOMBRE: Record<string, HorarioDia[]> = {
  DESPACHO: HORARIO_DESPACHO,
  RECIBO: HORARIO_RECIBO,
};

function claveHorario(h: HorarioDiaV1[]): string {
  return [...h]
    .sort((a, b) => a.diaSemana - b.diaSemana)
    .map((d) => `${d.diaSemana}|${d.horaEntrada}|${d.horaSalida}|${d.recesoMin ?? 0}`)
    .join(';');
}

function aMinReloj(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/**
 * Convierte un receso "en minutos" (v1) en una ventana centrada en la mitad
 * del turno: es la mejor aproximacion sin mas datos, y queda editable.
 */
export function recesoMinutosAVentana(dia: HorarioDiaV1): HorarioDia['receso'] {
  const min = dia.recesoMin ?? 0;
  if (min <= 0) return null;
  const ent = relojAMinutos(dia.horaEntrada);
  let sal = relojAMinutos(dia.horaSalida);
  if (sal <= ent) sal += 1440;
  const inicio = Math.round((ent + sal) / 2 - min / 2);
  return { inicio: aMinReloj(inicio), fin: aMinReloj(inicio + min) };
}

/**
 * Migra el horario de un turno de v1 a v2:
 *  - DESPACHO/RECIBO sin tocar (igual a la semilla v1) -> horario real.
 *  - Editados a mano -> se conservan (receso convertido a ventana) y se marca
 *    `editadoAMano` para que la app PREGUNTE antes de reemplazarlos.
 *  - Otros turnos -> solo se convierte el receso.
 */
export function migrarHorarioV1(
  nombre: string,
  horario: HorarioDiaV1[]
): { horario: HorarioDia[]; editadoAMano: boolean } {
  const clave = nombre.trim().toUpperCase();
  const semilla = SEMILLA_V1[clave];
  const real = HORARIO_REAL_POR_NOMBRE[clave];
  if (semilla && real && claveHorario(semilla) === claveHorario(horario)) {
    return { horario: real.map((h) => ({ ...h })), editadoAMano: false };
  }
  const convertido: HorarioDia[] = horario.map((d) => ({
    diaSemana: d.diaSemana,
    horaEntrada: d.horaEntrada,
    horaSalida: d.horaSalida,
    receso: d.receso !== undefined ? d.receso : recesoMinutosAVentana(d),
  }));
  return { horario: convertido, editadoAMano: Boolean(semilla) };
}
