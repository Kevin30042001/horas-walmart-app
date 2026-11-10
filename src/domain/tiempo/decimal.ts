/**
 * Conversion de minutos a decimal, segun la "Tabla de conversion de tiempo para
 * modulo de Horas Extras" oficial (minuto -> tiempo en nomina).
 *
 * Verificado contra la tabla PDF real: minuto 19 -> 0.32, minuto 37 -> 0.62, etc.
 * Es, simplemente, redondear minutos/60 a 2 decimales -- pero se aisla en una
 * funcion propia porque es la convencion EXACTA que usa el sistema de nomina
 * de Walmart para que nuestras cifras calcen con las de ellos.
 */
export function minutosADecimal(minutos: number): number {
  return Math.round((minutos / 60) * 100) / 100;
}

/** Inversa: cuantos minutos representa un valor decimal de nomina (uso en importaciones/UI). */
export function decimalAMinutos(decimal: number): number {
  return Math.round(decimal * 60);
}
