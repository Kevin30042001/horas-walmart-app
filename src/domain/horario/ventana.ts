import type { HorarioProgramado, Intervalo, VentanaProgramada } from '../tipos';

/** "HH:mm" -> minutos desde la medianoche. */
export function relojAMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) {
    throw new Error(`Hora invalida: "${hhmm}" (se espera HH:mm)`);
  }
  return h * 60 + m;
}

function fechaConReloj(fecha: string, hhmm: string, diasExtra = 0): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const minutos = relojAMinutos(hhmm);
  return new Date(anio!, mes! - 1, dia! + diasExtra, Math.floor(minutos / 60), minutos % 60, 0, 0);
}

/**
 * Ancla un reloj "HH:mm" a la primera ocurrencia en o despues de `desde`.
 * Sirve para el receso de Despacho: la entrada es 21:00 del lunes y el receso
 * 00:00 cae el MARTES, aunque la jornada pertenezca al lunes.
 */
function anclarDespuesDe(fecha: string, hhmm: string, desde: Date): Date {
  const mismoDia = fechaConReloj(fecha, hhmm);
  return mismoDia.getTime() >= desde.getTime() ? mismoDia : fechaConReloj(fecha, hhmm, 1);
}

/**
 * Convierte el horario programado de un dia en fechas absolutas para la
 * jornada `fecha` (yyyy-MM-dd, que es la fecha de ENTRADA). Maneja turnos que
 * cruzan la medianoche y recesos que caen despues de medianoche.
 */
export function anclarHorario(fecha: string, horario: HorarioProgramado): VentanaProgramada {
  const inicio = fechaConReloj(fecha, horario.horaEntrada);
  const cruza = relojAMinutos(horario.horaSalida) <= relojAMinutos(horario.horaEntrada);
  const fin = fechaConReloj(fecha, horario.horaSalida, cruza ? 1 : 0);

  let receso: Intervalo | null = null;
  if (horario.receso) {
    const rInicio = anclarDespuesDe(fecha, horario.receso.inicio, inicio);
    let rFin = anclarDespuesDe(fecha, horario.receso.fin, inicio);
    if (rFin.getTime() <= rInicio.getTime()) rFin = new Date(rFin.getTime() + 24 * 3600_000);
    receso = { inicio: rInicio, fin: rFin };
  }
  return { inicio, fin, receso };
}

/** Minutos que se solapan entre dos intervalos. */
export function minutosSolapados(a: Intervalo, b: Intervalo): number {
  const ini = Math.max(a.inicio.getTime(), b.inicio.getTime());
  const fin = Math.min(a.fin.getTime(), b.fin.getTime());
  return Math.max(0, Math.round((fin - ini) / 60000));
}

/** Minutos programados (ventana menos receso) de un dia. */
export function minutosProgramados(horario: HorarioProgramado): number {
  const v = anclarHorario('2026-01-05', horario);
  const bruto = Math.round((v.fin.getTime() - v.inicio.getTime()) / 60000);
  return bruto - (v.receso ? minutosSolapados(v.receso, v) : 0);
}

/** Suma semanal programada (en minutos) de una lista de horarios por dia. */
export function minutosProgramadosSemana(horarios: HorarioProgramado[]): number {
  return horarios.reduce((acc, h) => acc + minutosProgramados(h), 0);
}
