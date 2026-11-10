import { db } from '../data/db';
import { listarAsuetos } from '../data/repos/configRepo';
import { listarTurnos, obtenerPerfil, turnoRowAParametros } from '../data/repos/perfilRepo';
import { calcularExcesoSemanal } from '../domain/calculo/semanal';
import { formatoFechaLocal } from '../utils/fecha';
import { calcularAlertas, type Alerta } from './alertas';
import type { ResumenCorte } from './resumenCorte';

/** Reune los datos de Dexie y calcula las alertas del corte. */
export async function cargarAlertas(resumen: ResumenCorte | null, ahora = new Date()): Promise<Alerta[]> {
  const [perfil, asuetos, turnos] = await Promise.all([obtenerPerfil(), listarAsuetos(), listarTurnos()]);
  const hace = new Date(ahora);
  hace.setDate(hace.getDate() - 14);
  const recientes = await db.registros.where('fecha').between(formatoFechaLocal(hace), formatoFechaLocal(ahora), true, true).toArray();
  const fechasConSalida = new Set(recientes.filter((r) => r.tipoEvento === 'salida').map((r) => r.fecha));
  const entradasSinSalida = recientes.filter((r) => r.tipoEvento === 'entrada' && !fechasConSalida.has(r.fecha));

  const jornadas = resumen?.jornadas ?? [];
  const registrosIds = jornadas.flatMap((j) => j.registrosIds);
  const registros = await db.registros.bulkGet(registrosIds);
  const conFoto = new Set(registros.filter((r) => r?.fotoId).map((r) => r!.fecha));

  const turnoPorId = new Map(turnos.map((t) => [t.id, t]));
  const excesos = calcularExcesoSemanal(
    jornadas
      .filter((j) => turnoPorId.has(j.turnoId))
      .map((j) => ({ fecha: j.fecha, desgloseMinutos: j.desgloseMinutos, turno: turnoRowAParametros(turnoPorId.get(j.turnoId)!) }))
  );

  return calcularAlertas({
    ahora,
    horasMaxJornadaAbierta: perfil.horasMaxJornadaAbierta,
    entradasSinSalida,
    jornadas: jornadas.map((j) => ({ ...j, tieneFoto: conFoto.has(j.fecha) })),
    asuetos,
    excesosSemanales: excesos,
  });
}

/** Fechas (yyyy-MM-dd) de jornadas que tienen al menos una foto de evidencia. */
export async function fechasConFoto(fechas: string[]): Promise<Set<string>> {
  if (fechas.length === 0) return new Set();
  const regs = await db.registros.where('fecha').anyOf(fechas).toArray();
  return new Set(regs.filter((r) => r.fotoId).map((r) => r.fecha));
}
