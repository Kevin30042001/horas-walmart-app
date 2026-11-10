import { db, type JornadaRow, type ResumenHistoricoRow } from '../data/db';
import { obtenerConfigRetencion, reglasPagoComoDominio } from '../data/repos/configRepo';
import { obtenerPerfil } from '../data/repos/perfilRepo';
import { eliminarJornadasYFotos } from '../data/repos/registrosRepo';
import { filtrarCandidatosAPurgar } from '../domain/calculo/retencion';
import { calcularHoraBase, calcularProyeccionPago, sumarHorasNomina } from '../domain/calculo/montos';
import { horasDeJornada } from './resumenCorte';
import { TODOS_LOS_TIPOS_HORA, type DesgloseMinutos } from '../domain/tipos';
import { fechaLocalHoy } from '../utils/fecha';

export interface ResultadoLimpieza {
  jornadasEliminadas: number;
  cortesResumidos: number;
}

function desgloseVacio(): DesgloseMinutos {
  const d = {} as DesgloseMinutos;
  for (const tipo of TODOS_LOS_TIPOS_HORA) d[tipo] = 0;
  return d;
}

function sumarDesglose(a: DesgloseMinutos, b: DesgloseMinutos): DesgloseMinutos {
  const resultado = desgloseVacio();
  for (const tipo of TODOS_LOS_TIPOS_HORA) resultado[tipo] = a[tipo] + b[tipo];
  return resultado;
}

/** Jornadas que se borrarian HOY si corrieras la limpieza (para avisar antes de borrar). */
export async function obtenerCandidatosLimpieza(): Promise<JornadaRow[]> {
  const [config, jornadas] = await Promise.all([obtenerConfigRetencion(), db.jornadas.toArray()]);
  const candidatos = filtrarCandidatosAPurgar(
    jornadas.map((j) => ({ id: j.id!, fecha: j.fecha, protegida: j.protegida })),
    config.diasRetencion,
    fechaLocalHoy()
  );
  const idsCandidatos = new Set(candidatos.map((c) => c.id));
  return jornadas.filter((j) => idsCandidatos.has(j.id!));
}

/**
 * Ejecuta la limpieza: por cada corte afectado, suma los totales de las
 * jornadas que se van a borrar y los acumula en `resumenesHistoricos` (asi el
 * Dashboard historico no pierde el dato aunque se borre el detalle/fotos), y
 * luego borra jornadas + registros + fotos via `eliminarJornadasYFotos`.
 */
export async function ejecutarLimpieza(): Promise<ResultadoLimpieza> {
  const candidatos = await obtenerCandidatosLimpieza();
  if (candidatos.length === 0) return { jornadasEliminadas: 0, cortesResumidos: 0 };

  const [perfil, reglasPago] = await Promise.all([obtenerPerfil(), reglasPagoComoDominio()]);
  const horaBase =
    perfil.salarioMensual > 0 ? calcularHoraBase(perfil.salarioMensual, perfil.diasMes, perfil.horasDia) : 0;

  const porCorte = new Map<number, JornadaRow[]>();
  for (const jornada of candidatos) {
    if (jornada.corteId === null) continue; // sin corte asociado, no hay donde resumir
    const grupo = porCorte.get(jornada.corteId) ?? [];
    grupo.push(jornada);
    porCorte.set(jornada.corteId, grupo);
  }

  for (const [corteId, jornadasDelCorte] of porCorte) {
    const totales = jornadasDelCorte.reduce((acc, j) => sumarDesglose(acc, j.desgloseMinutos), desgloseVacio());
    const horas = sumarHorasNomina(jornadasDelCorte.map(horasDeJornada));
    // Monto VARIABLE (lineas de la boleta); el salario fijo no depende de las jornadas.
    const montoProyectado = calcularProyeccionPago({ horas, horaBase, reglas: reglasPago, salarioCorte: 0 }).totalVariable;
    const existente = await db.resumenesHistoricos.where('corteId').equals(corteId).first();

    if (existente) {
      await db.resumenesHistoricos.update(existente.id!, {
        totalesPorTipo: sumarDesglose(existente.totalesPorTipo, totales),
        horasPorTipo: existente.horasPorTipo ? sumarHorasNomina([existente.horasPorTipo, horas]) : horas,
        montoProyectado: Math.round((existente.montoProyectado + montoProyectado) * 100) / 100,
      });
    } else {
      const nuevoResumen: ResumenHistoricoRow = {
        corteId,
        totalesPorTipo: totales,
        horasPorTipo: horas,
        montoProyectado,
        fechaArchivado: new Date(),
      };
      await db.resumenesHistoricos.add(nuevoResumen);
    }
  }

  await eliminarJornadasYFotos(candidatos.map((c) => c.id!));
  return { jornadasEliminadas: candidatos.length, cortesResumidos: porCorte.size };
}

/** Uso aproximado de almacenamiento del dispositivo para esta app (API nativa del navegador). */
export async function obtenerUsoAlmacenamiento(): Promise<{ usadoMB: number; cuotaMB: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage, quota } = await navigator.storage.estimate();
  return {
    usadoMB: Math.round(((usage ?? 0) / 1024 / 1024) * 10) / 10,
    cuotaMB: Math.round(((quota ?? 0) / 1024 / 1024) * 10) / 10,
  };
}
