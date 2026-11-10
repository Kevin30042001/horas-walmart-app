import { describe, expect, it } from 'vitest';
import { minutosADecimal, decimalAMinutos } from './decimal';

describe('minutosADecimal', () => {
  // Valores tomados LITERAL de la tabla oficial de Walmart (PDF "Tabla de
  // conversion de tiempo para modulo de Horas Extras"). Si esto falla, el
  // motor ya no calza con lo que espera el sistema de nomina.
  it.each([
    [1, 0.02],
    [7, 0.12],
    [19, 0.32],
    [30, 0.5],
    [37, 0.62],
    [45, 0.75],
    [60, 1.0],
  ])('convierte %i minutos a %f', (minutos, esperado) => {
    expect(minutosADecimal(minutos)).toBeCloseTo(esperado, 2);
  });

  it.each([
    [90, 1.5], // 1:30 -> 1.50 (ejemplo del PDF)
    [355, 5.92], // 5:55 -> 5.92
    [445, 7.42], // 7:25 -> 7.42
    [525, 8.75], // 8:45 -> 8.75
  ])('ejemplos del PDF: %i minutos -> %f', (minutos, esperado) => {
    expect(minutosADecimal(minutos)).toBeCloseTo(esperado, 2);
  });

  it('decimalAMinutos es la inversa razonable de minutosADecimal', () => {
    expect(decimalAMinutos(1.5)).toBe(90);
    expect(decimalAMinutos(7.42)).toBe(445);
  });
});
