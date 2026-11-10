import { db, type AsuetoRow, type CorteRow, type DeduccionRow, type ReglaPagoRow } from '../db';
import type { ReglaPago } from '../../domain/tipos';

export async function listarReglasPago(): Promise<ReglaPagoRow[]> {
  return db.reglasPago.toArray();
}

export async function reglasPagoComoDominio(): Promise<ReglaPago[]> {
  const filas = await listarReglasPago();
  return filas.map(({ id: _id, vigenteDesde: _v, ...regla }) => regla);
}

export async function actualizarRegla(id: number, cambios: Partial<Omit<ReglaPagoRow, 'id'>>): Promise<void> {
  await db.reglasPago.update(id, cambios);
}

export async function listarAsuetos(): Promise<AsuetoRow[]> {
  return db.asuetos.orderBy('fecha').toArray();
}

export async function esFechaAsueto(fecha: string): Promise<boolean> {
  const asueto = await db.asuetos.where('fecha').equals(fecha).first();
  return asueto !== undefined;
}

export async function agregarAsueto(asueto: AsuetoRow): Promise<number> {
  return (await db.asuetos.add(asueto)) as number;
}

export async function eliminarAsueto(id: number): Promise<void> {
  await db.asuetos.delete(id);
}

export async function listarCortes(): Promise<CorteRow[]> {
  return db.cortes.orderBy('fechaInicio').toArray();
}

export async function agregarCortes(cortes: Omit<CorteRow, 'id' | 'estado'>[]): Promise<void> {
  await db.cortes.bulkAdd(cortes.map((c) => ({ ...c, estado: 'abierto' as const })));
}

/**
 * Reemplaza los cortes que se cruzan con [desde, hasta] por los nuevos. Los
 * cortes con resumen historico archivado (limpieza) se conservan.
 */
export async function reemplazarCortesEnRango(
  desde: string,
  hasta: string,
  nuevos: Omit<CorteRow, 'id' | 'estado'>[]
): Promise<void> {
  await db.transaction('rw', db.cortes, db.resumenesHistoricos, async () => {
    const conHistorico = new Set((await db.resumenesHistoricos.toArray()).map((r) => r.corteId));
    const existentes = await db.cortes.toArray();
    const aBorrar = existentes.filter((c) => c.fechaCorte >= desde && c.fechaInicio <= hasta && !conHistorico.has(c.id!));
    await db.cortes.bulkDelete(aBorrar.map((c) => c.id!));
    const quedan = existentes.filter((c) => !aBorrar.includes(c));
    const solapan = (n: Omit<CorteRow, 'id' | 'estado'>) => quedan.some((c) => n.fechaInicio <= c.fechaCorte && c.fechaInicio <= n.fechaCorte);
    await db.cortes.bulkAdd(nuevos.filter((n) => !solapan(n)).map((c) => ({ ...c, estado: 'abierto' as const })));
  });
}

export async function eliminarCorte(id: number): Promise<void> {
  await db.cortes.delete(id);
}

export async function actualizarCorte(id: number, cambios: Partial<CorteRow>): Promise<void> {
  await db.cortes.update(id, cambios);
}

/** El corte "activo" es el primero abierto cuya fecha de corte todavia no paso. */
export async function obtenerCorteActivo(fechaHoy: string): Promise<CorteRow | undefined> {
  const cortes = await listarCortes();
  return cortes.find((c) => c.estado === 'abierto' && c.fechaCorte >= fechaHoy) ?? cortes.at(-1);
}

export async function listarDeducciones(): Promise<DeduccionRow[]> {
  return db.deducciones.toArray();
}

export async function actualizarDeduccion(id: number, cambios: Partial<DeduccionRow>): Promise<void> {
  await db.deducciones.update(id, cambios);
}

export async function obtenerConfigRetencion() {
  const config = await db.configRetencion.get(1);
  if (!config) throw new Error('Config de retencion no inicializada');
  return config;
}

export async function guardarConfigRetencion(
  cambios: Partial<{ diasRetencion: number; idsCorteProtegidos: number[]; avisoLimpiezaDesde: string | null }>
) {
  await db.configRetencion.update(1, cambios);
}
