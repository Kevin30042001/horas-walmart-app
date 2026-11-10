import type { DesgloseMinutos, DetalleCalculo, DetalleDeduccion, HorasPorTipo } from '../domain/tipos';
import { TODOS_LOS_TIPOS_HORA } from '../domain/tipos';
import {
  calcularHoraBase,
  calcularProyeccionPago,
  calcularSalarioCorte,
  horasNominaDeTramos,
  sumarHorasNomina,
} from '../domain/calculo/montos';
import { calcularDeducciones } from '../domain/calculo/deducciones';
import { listarJornadasEntre } from '../data/repos/registrosRepo';
import { reglasPagoComoDominio, listarDeducciones, listarCortes } from '../data/repos/configRepo';
import { obtenerPerfil } from '../data/repos/perfilRepo';
import type { CorteRow, JornadaRow } from '../data/db';
import { parsearFechaLocal } from '../utils/fecha';

export interface ResumenCorte {
  corte: CorteRow | null;
  desgloseTotal: DesgloseMinutos;
  /** Horas en decimal de nomina por tipo (cada tramo redondeado y luego sumado). */
  horasTotal: HorasPorTipo;
  horaBase: number;
  salarioCorte: number;
  detalleMontos: DetalleCalculo[];
  ingresoBruto: number;
  detalleDeducciones: DetalleDeduccion[];
  totalDeducciones: number;
  netoEstimado: number;
  jornadas: JornadaRow[];
}

export function sumarDesgloses(jornadas: JornadaRow[]): DesgloseMinutos {
  const total = {} as DesgloseMinutos;
  for (const tipo of TODOS_LOS_TIPOS_HORA) total[tipo] = 0;
  for (const jornada of jornadas) {
    for (const tipo of TODOS_LOS_TIPOS_HORA) total[tipo] += jornada.desgloseMinutos[tipo] ?? 0;
  }
  return total;
}

/** Horas de nomina de una jornada: decimal por tramo (jornadas viejas sin tramos: por tipo). */
export function horasDeJornada(j: JornadaRow): HorasPorTipo {
  if (j.tramos?.length) return horasNominaDeTramos(j.tramos);
  return horasNominaDeTramos(TODOS_LOS_TIPOS_HORA.map((tipoHora) => ({ tipoHora, minutos: j.desgloseMinutos[tipoHora] })));
}

export function diasDelCorte(corte: CorteRow): number {
  const ms = parsearFechaLocal(corte.fechaCorte).getTime() - parsearFechaLocal(corte.fechaInicio).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/**
 * Resumen financiero completo de un corte (alimenta el Dashboard y los
 * exportes): horas de nomina, lineas de la boleta, salario del corte,
 * deducciones estimadas y neto. Un solo lugar para esta logica.
 */
export async function calcularResumenCorte(corteId: number): Promise<ResumenCorte> {
  const [perfil, reglasPago, deducciones, cortes] = await Promise.all([
    obtenerPerfil(),
    reglasPagoComoDominio(),
    listarDeducciones(),
    listarCortes(),
  ]);
  const corte = cortes.find((c) => c.id === corteId) ?? null;
  // Por rango de fechas (no por corteId): asi una jornada calculada antes de
  // crear o mover el corte igual aparece en su corte.
  const jornadas = corte ? await listarJornadasEntre(corte.fechaInicio, corte.fechaCorte) : [];

  const horaBase =
    perfil.salarioMensual > 0 ? calcularHoraBase(perfil.salarioMensual, perfil.diasMes, perfil.horasDia) : 0;
  const salarioCorte = corte
    ? calcularSalarioCorte(perfil.salarioMensual, perfil.modoSalarioCorte ?? 'mitad', diasDelCorte(corte), perfil.diasMes)
    : 0;
  const horasTotal = sumarHorasNomina(jornadas.map(horasDeJornada));
  const pago = calcularProyeccionPago({ horas: horasTotal, horaBase, reglas: reglasPago, salarioCorte });
  const { detalle: detalleDeducciones, totalDeducciones } = calcularDeducciones(pago.bruto, deducciones);

  return {
    corte,
    desgloseTotal: sumarDesgloses(jornadas),
    horasTotal,
    horaBase,
    salarioCorte,
    detalleMontos: pago.lineas,
    ingresoBruto: pago.bruto,
    detalleDeducciones,
    totalDeducciones,
    netoEstimado: Math.round((pago.bruto - totalDeducciones) * 100) / 100,
    jornadas,
  };
}
