import type { RegistroRow } from '../data/db';
import { calcularJornada } from '../domain/calculo/motor';
import type { EntradaJornada, ParametrosTurno } from '../domain/tipos';
import { obtenerTurnoVigente, turnoRowAParametros } from '../data/repos/perfilRepo';
import { esFechaAsueto } from '../data/repos/configRepo';
import { listarCortes } from '../data/repos/configRepo';
import { listarRegistrosDelDia, guardarJornada, obtenerJornadaPorFecha } from '../data/repos/registrosRepo';
import type { JornadaRow } from '../data/db';
import { parsearFechaLocal } from '../utils/fecha';
import { resolverReceso } from '../domain/calculo/receso';
import { anclarHorario } from '../domain/horario/ventana';
import { eliminarJornadaPorFecha } from '../data/repos/registrosRepo';

function buscarPorTipo(registros: RegistroRow[], tipo: RegistroRow['tipoEvento']): RegistroRow | undefined {
  return registros.find((r) => r.tipoEvento === tipo);
}

async function determinarCorteId(fecha: string): Promise<number | null> {
  const cortes = await listarCortes();
  const corte = cortes.find((c) => c.fechaInicio <= fecha && fecha <= c.fechaCorte);
  return corte?.id ?? null;
}

async function esDiaLibreDelTurno(fecha: string, turno: ParametrosTurno & { diaLibre?: number }): Promise<boolean> {
  if (turno.diaLibre === undefined) return false;
  return parsearFechaLocal(fecha).getDay() === turno.diaLibre;
}

/**
 * Toma los registros crudos (entrada/receso/salida) de un dia y produce la
 * jornada procesada: arma el `EntradaJornada` para el motor de calculo,
 * calcula el desglose de minutos y lo persiste en la tabla `jornadas`.
 *
 * Esta es la unica pieza del codigo que "traduce" entre la capa de datos
 * (Dexie) y el dominio puro -- el motor de calculo en si nunca toca Dexie.
 */
export async function procesarJornadaDelDia(fecha: string): Promise<JornadaRow | null> {
  const registros = await listarRegistrosDelDia(fecha);
  const entrada = buscarPorTipo(registros, 'entrada');
  const salida = buscarPorTipo(registros, 'salida');
  if (!entrada || !salida) {
    // jornada incompleta (o se borro una marca): no debe quedar un calculo viejo guardado
    await eliminarJornadaPorFecha(fecha);
    return null;
  }

  const inicioReceso = buscarPorTipo(registros, 'inicioReceso');
  const finReceso = buscarPorTipo(registros, 'finReceso');

  const turnoRow = await obtenerTurnoVigente(fecha);
  if (!turnoRow) throw new Error(`No hay turno configurado vigente para ${fecha}`);

  const esAsueto = await esFechaAsueto(fecha);
  const esDescansoSemanalLaborado = await esDiaLibreDelTurno(fecha, {
    ...turnoRowAParametros(turnoRow),
    diaLibre: turnoRow.diaLibre,
  });

  const diaSemana = parsearFechaLocal(fecha).getDay();
  const horario = turnoRow.horarioPorDia.find((h) => h.diaSemana === diaSemana) ?? null;
  const ventana = horario ? anclarHorario(fecha, horario) : null;
  const recesoMarcado =
    inicioReceso && finReceso ? { inicio: inicioReceso.horaReal, fin: finReceso.horaReal } : null;
  const { receso, asumido } = resolverReceso(recesoMarcado, ventana?.receso ?? null, entrada.horaReal, salida.horaReal);

  const entradaJornada: EntradaJornada = {
    fecha,
    entrada: entrada.horaReal,
    salida: salida.horaReal,
    receso,
    esAsueto,
    esDescansoSemanalLaborado,
    turno: turnoRowAParametros(turnoRow),
  };

  const resultado = calcularJornada(entradaJornada);
  const corteId = await determinarCorteId(fecha);
  const existente = await obtenerJornadaPorFecha(fecha);

  const jornada: JornadaRow = {
    id: existente?.id,
    fecha,
    turnoId: turnoRow.id!,
    corteId,
    entradaReal: entrada.horaReal,
    salidaReal: salida.horaReal,
    minutosReceso: receso ? Math.round((receso.fin.getTime() - receso.inicio.getTime()) / 60000) : 0,
    recesoAsumido: asumido,
    esAsueto,
    esDescansoSemanalLaborado,
    desgloseMinutos: resultado.desgloseMinutos,
    totalMinutosTrabajados: resultado.totalMinutosTrabajados,
    tipoJornadaLegal: resultado.tipoJornadaLegal,
    protegida: existente?.protegida ?? false,
    registrosIds: registros.map((r) => r.id!).filter(Boolean),
  };

  await guardarJornada(jornada);
  return jornada;
}
