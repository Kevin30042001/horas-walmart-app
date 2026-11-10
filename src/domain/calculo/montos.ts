import type { DesgloseMinutos, DetalleCalculo, ReglaPago, TipoHora } from '../tipos';
import { minutosADecimal } from '../tiempo/decimal';

/** hora base = salario mensual / dias / horas-dia. Formula editable (spec: 642/30/8). */
export function calcularHoraBase(salarioMensual: number, diasMes = 30, horasDia = 8): number {
  if (salarioMensual <= 0) throw new Error('El salario mensual debe ser mayor a cero');
  return salarioMensual / diasMes / horasDia;
}

/**
 * Convierte un desglose de minutos en el detalle de pago linea-por-linea
 * ("por que se pago asi"). Redondea POR LINEA (igual que el talonario real,
 * donde se ve que hay centavos de diferencia al sumar en vez de calcular
 * todo de una vez) para que la proyeccion se parezca lo mas posible a la boleta.
 */
export function calcularMontos(
  desglose: DesgloseMinutos,
  horaBase: number,
  reglas: ReglaPago[] = []
): DetalleCalculo[] {
  const reglaPorTipo = new Map(reglas.map((r) => [r.tipoHora, r]));
  const detalle: DetalleCalculo[] = [];

  for (const [tipoHora, minutos] of Object.entries(desglose) as [TipoHora, number][]) {
    if (minutos <= 0) continue;
    const regla = reglaPorTipo.get(tipoHora);
    if (!regla) {
      throw new Error(`No existe regla de pago configurada para "${tipoHora}"`);
    }
    const horas = minutosADecimal(minutos);
    const monto = Math.round(horas * horaBase * regla.factor * 100) / 100;
    detalle.push({ tipoHora, minutos, horas, factor: regla.factor, articuloLey: regla.articuloLey, monto });
  }

  return detalle;
}

export function sumarMontos(detalle: DetalleCalculo[]): number {
  return Math.round(detalle.reduce((acc, d) => acc + d.monto, 0) * 100) / 100;
}
