import type { Intervalo } from '../tipos';

/** Horario diurno 06:00-19:00 / nocturno 19:00-06:00, fijo por ley (Art. 161 C.T.). */
export const HORA_INICIO_DIURNO = 6;
export const HORA_FIN_DIURNO = 19;

export interface SegmentoClasificado {
  inicio: Date;
  fin: Date;
  tipo: 'diurno' | 'nocturno';
  minutos: number;
}

export interface ResultadoClasificacion {
  diurnoMin: number;
  nocturnoMin: number;
  segmentos: SegmentoClasificado[];
}

function limiteDelDia(fecha: Date, hora: number): Date {
  const d = new Date(fecha);
  d.setHours(hora, 0, 0, 0);
  return d;
}

/**
 * Genera las fronteras 06:00/19:00 de cada dia calendario tocado por [inicio, fin).
 * Esto es lo que permite manejar turnos que cruzan la medianoche: no importa que
 * la salida caiga "al dia siguiente", igual se detectan todas las fronteras.
 */
function fronterasDiurnoNocturno(inicio: Date, fin: Date): Date[] {
  const fronteras: Date[] = [];
  const cursor = new Date(inicio);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= fin) {
    fronteras.push(limiteDelDia(cursor, HORA_INICIO_DIURNO));
    fronteras.push(limiteDelDia(cursor, HORA_FIN_DIURNO));
    cursor.setDate(cursor.getDate() + 1);
  }
  return fronteras;
}

/**
 * Divide el intervalo [inicio, fin) en segmentos diurnos/nocturnos, excluyendo
 * las ventanas de `exclusiones` (recesos). Funciona sin importar si el turno
 * cruza la medianoche porque todo se compara en tiempo absoluto (Date), nunca
 * en "hora del dia" aislada.
 */
export function clasificarDiurnoNocturno(
  inicio: Date,
  fin: Date,
  exclusiones: Intervalo[] = []
): ResultadoClasificacion {
  if (fin <= inicio) {
    throw new Error('La hora de salida debe ser posterior a la hora de entrada');
  }

  const puntos = new Set<number>([inicio.getTime(), fin.getTime()]);
  for (const frontera of fronterasDiurnoNocturno(inicio, fin)) {
    if (frontera.getTime() > inicio.getTime() && frontera.getTime() < fin.getTime()) {
      puntos.add(frontera.getTime());
    }
  }
  for (const ex of exclusiones) {
    if (ex.inicio.getTime() > inicio.getTime() && ex.inicio.getTime() < fin.getTime()) {
      puntos.add(ex.inicio.getTime());
    }
    if (ex.fin.getTime() > inicio.getTime() && ex.fin.getTime() < fin.getTime()) {
      puntos.add(ex.fin.getTime());
    }
  }

  const ordenados = Array.from(puntos).sort((a, b) => a - b);
  const segmentos: SegmentoClasificado[] = [];
  let diurnoMin = 0;
  let nocturnoMin = 0;

  for (let i = 0; i < ordenados.length - 1; i++) {
    const segInicio = new Date(ordenados[i]!);
    const segFin = new Date(ordenados[i + 1]!);
    const minutos = (segFin.getTime() - segInicio.getTime()) / 60000;
    if (minutos <= 0) continue;

    const dentroDeReceso = exclusiones.some(
      (ex) => segInicio.getTime() >= ex.inicio.getTime() && segFin.getTime() <= ex.fin.getTime()
    );
    if (dentroDeReceso) continue;

    const horaDecimal = segInicio.getHours() + segInicio.getMinutes() / 60;
    const esDiurno = horaDecimal >= HORA_INICIO_DIURNO && horaDecimal < HORA_FIN_DIURNO;

    segmentos.push({ inicio: segInicio, fin: segFin, tipo: esDiurno ? 'diurno' : 'nocturno', minutos });
    if (esDiurno) diurnoMin += minutos;
    else nocturnoMin += minutos;
  }

  return { diurnoMin: Math.round(diurnoMin), nocturnoMin: Math.round(nocturnoMin), segmentos };
}
