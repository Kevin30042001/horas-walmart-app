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
