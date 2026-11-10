import type { RegistroRow } from '../data/db';
import type { VentanaReloj } from '../domain/tipos';
import { relojAMinutos } from '../domain/horario/ventana';
import { HORAS_MAX_JORNADA_ABIERTA } from './jornadaAbierta';
import type { AccionMarcado } from './estadoDelDia';
import { formatoFechaLocal } from '../utils/fecha';

export interface DiaPasado {
  fecha: string; // yyyy-MM-dd (fecha de ENTRADA)
  entrada: string; // HH:mm
  salida: string; // HH:mm (si es <= entrada, cae al dia siguiente)
  receso?: VentanaReloj | null;
}

export interface MarcaConstruida {
  tipoEvento: RegistroRow['tipoEvento'];
  horaReal: Date;
}

function enFecha(fecha: string, hhmm: string, diasExtra = 0): Date {
  const [a, m, d] = fecha.split('-').map(Number);
  const min = relojAMinutos(hhmm);
  return new Date(a!, m! - 1, d! + diasExtra, Math.floor(min / 60), min % 60, 0, 0);
}

/** Primera ocurrencia del reloj en o despues de `desde`, partiendo de la fecha de la jornada. */
function despuesDe(fecha: string, hhmm: string, desde: Date): Date {
  const mismo = enFecha(fecha, hhmm);
  return mismo.getTime() >= desde.getTime() ? mismo : enFecha(fecha, hhmm, 1);
}

/**
 * Convierte un dia pasado escrito a mano (horas de reloj) en marcas con fecha
 * y hora absolutas. La salida y el receso que caen despues de medianoche se
 * mueven al dia siguiente, pero la jornada sigue siendo la de la ENTRADA.
 */
export function construirMarcasDiaPasado(dia: DiaPasado): MarcaConstruida[] {
  const entrada = enFecha(dia.fecha, dia.entrada);
  const salida = despuesDe(dia.fecha, dia.salida, new Date(entrada.getTime() + 60_000));
  if (relojAMinutos(dia.salida) === relojAMinutos(dia.entrada)) {
    throw new Error('La salida no puede ser igual a la entrada.');
  }

  const marcas: MarcaConstruida[] = [{ tipoEvento: 'entrada', horaReal: entrada }];
  if (dia.receso) {
    const ini = despuesDe(dia.fecha, dia.receso.inicio, entrada);
    let fin = despuesDe(dia.fecha, dia.receso.fin, entrada);
    if (fin <= ini) fin = new Date(fin.getTime() + 86_400_000);
    if (ini < entrada || fin > salida) throw new Error('El receso debe quedar entre la entrada y la salida.');
    marcas.push({ tipoEvento: 'inicioReceso', horaReal: ini }, { tipoEvento: 'finReceso', horaReal: fin });
  }
  marcas.push({ tipoEvento: 'salida', horaReal: salida });
  return marcas;
}

export interface ResolverFechaParams {
  /** Fecha y hora leidas por el OCR (o confirmadas por el usuario). */
  fechaHora: Date;
  accion: AccionMarcado;
  /** Entradas ya registradas (fecha de jornada + hora real). */
  entradas: Pick<RegistroRow, 'fecha' | 'horaReal'>[];
  horasMax?: number;
}

/**
 * A que jornada pertenece una marca hecha con foto:
 *  - Una entrada pertenece a su propia fecha.
 *  - Una salida o receso pertenece a la entrada mas reciente anterior dentro
 *    de las ultimas `horasMax` horas (ej. salida 03:00 del martes -> jornada
 *    del lunes). Si no hay, a su propia fecha.
 */
export function resolverFechaJornada({
  fechaHora,
  accion,
  entradas,
  horasMax = HORAS_MAX_JORNADA_ABIERTA,
}: ResolverFechaParams): string {
  if (accion === 'entrada') return formatoFechaLocal(fechaHora);
  const limite = fechaHora.getTime() - horasMax * 3600_000;
  const previa = entradas
    .filter((e) => e.horaReal.getTime() <= fechaHora.getTime() && e.horaReal.getTime() >= limite)
    .sort((a, b) => b.horaReal.getTime() - a.horaReal.getTime())[0];
  return previa?.fecha ?? formatoFechaLocal(fechaHora);
}
