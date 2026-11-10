import { describe, expect, it } from 'vitest';
import { calcularDomingoPascua, calcularSemanaSanta } from './semanaSanta';

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('calcularDomingoPascua', () => {
  it.each([
    [2023, '2023-04-09'],
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
  ])('Pascua %i -> %s', (anio, esperado) => {
    expect(fmt(calcularDomingoPascua(anio))).toBe(esperado);
  });
});

describe('calcularSemanaSanta', () => {
  it('2026: jueves 02-abr, viernes 03-abr, sabado 04-abr', () => {
    const { juevesSanto, viernesSanto, sabadoSanto } = calcularSemanaSanta(2026);
    expect(fmt(juevesSanto)).toBe('2026-04-02');
    expect(fmt(viernesSanto)).toBe('2026-04-03');
    expect(fmt(sabadoSanto)).toBe('2026-04-04');
  });
});
