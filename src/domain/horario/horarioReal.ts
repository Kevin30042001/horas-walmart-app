import type { HorarioProgramado } from '../tipos';

/** Horario de un dia de la semana (0=domingo .. 6=sabado). */
export type HorarioSemanal = (HorarioProgramado & { diaSemana: number })[];

/**
 * Horario REAL de Despacho (fuente de verdad: imagen de horarios del CD).
 * Nocturno, semana inicia domingo, libre sabado, 39 h. Receso 00:00-01:00.
 */
export const HORARIO_DESPACHO: HorarioSemanal = [
  { diaSemana: 0, horaEntrada: '20:00', horaSalida: '03:00', receso: { inicio: '00:00', fin: '01:00' } },
  { diaSemana: 1, horaEntrada: '21:00', horaSalida: '03:00', receso: { inicio: '00:00', fin: '01:00' } },
  { diaSemana: 2, horaEntrada: '21:00', horaSalida: '04:00', receso: { inicio: '00:00', fin: '01:00' } },
  { diaSemana: 3, horaEntrada: '21:00', horaSalida: '05:00', receso: { inicio: '00:00', fin: '01:00' } },
  { diaSemana: 4, horaEntrada: '21:00', horaSalida: '05:00', receso: { inicio: '00:00', fin: '01:00' } },
  { diaSemana: 5, horaEntrada: '21:00', horaSalida: '06:00', receso: { inicio: '00:00', fin: '01:00' } },
];

/**
 * Horario REAL de Recibo. Diurno, semana inicia sabado, libre domingo, 44 h.
 * Sin receso descontado (las horas del horario oficial ya lo confirman).
 */
export const HORARIO_RECIBO: HorarioSemanal = [
  { diaSemana: 6, horaEntrada: '14:00', horaSalida: '18:00', receso: null },
  { diaSemana: 1, horaEntrada: '12:00', horaSalida: '19:00', receso: null },
  { diaSemana: 2, horaEntrada: '11:00', horaSalida: '19:00', receso: null },
  { diaSemana: 3, horaEntrada: '11:00', horaSalida: '19:00', receso: null },
  { diaSemana: 4, horaEntrada: '10:00', horaSalida: '19:00', receso: null },
  { diaSemana: 5, horaEntrada: '11:00', horaSalida: '19:00', receso: null },
];
