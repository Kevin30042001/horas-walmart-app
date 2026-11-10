import type { DetalleDeduccion, ReglaDeduccion } from '../tipos';

/**
 * Calcula una deduccion por porcentaje simple (ISSS/AFP), respetando un tope
 * de cotizacion si existe (muchas cajas de pension/salud en El Salvador
 * cotizan sobre un techo, no sobre el salario completo).
 */
export function calcularPorcentajeConTope(monto: number, porcentaje: number, tope: number | null): number {
  const base = tope !== null ? Math.min(monto, tope) : monto;
  return Math.round(base * (porcentaje / 100) * 100) / 100;
}

/**
 * Calcula el ISR por tabla de tramos progresivos (cuota fija + % sobre el
 * excedente del limite inferior del tramo), como las tablas de retencion
 * oficiales de El Salvador.
 */
export function calcularIsrPorTabla(monto: number, tramos: ReglaDeduccion['tramosIsr']): number {
  if (!tramos || tramos.length === 0) return 0;
  const tramo = tramos.find((t) => monto >= t.desde && (t.hasta === null || monto <= t.hasta));
  if (!tramo) return 0;
  const excedente = Math.max(0, monto - tramo.desde);
  return Math.round((tramo.cuotaFija + excedente * (tramo.porcentajeExceso / 100)) * 100) / 100;
}

/**
 * Aplica todas las reglas de deduccion activas sobre un ingreso bruto y
 * devuelve el detalle linea-por-linea + el total. Esto es SIEMPRE una
 * PROYECCION ESTIMADA (no la boleta oficial): ISSS/AFP/ISR reales pueden
 * variar por topes, otras deducciones (prestamos, seguros) o cambios de ley.
 */
export function calcularDeducciones(ingresoBruto: number, reglas: ReglaDeduccion[]): {
  detalle: DetalleDeduccion[];
  totalDeducciones: number;
} {
  const detalle: DetalleDeduccion[] = [];

  for (const regla of reglas) {
    if (!regla.activo) continue;
    const monto =
      regla.tipo === 'porcentaje'
        ? calcularPorcentajeConTope(ingresoBruto, regla.valorPorcentaje ?? 0, regla.tope)
        : calcularIsrPorTabla(ingresoBruto, regla.tramosIsr);
    if (monto > 0) detalle.push({ nombre: regla.nombre, monto });
  }

  const totalDeducciones = Math.round(detalle.reduce((acc, d) => acc + d.monto, 0) * 100) / 100;
  return { detalle, totalDeducciones };
}
