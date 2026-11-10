import { describe, expect, it } from 'vitest';
import { hayDiscrepanciaHoraria } from './discrepancia';

describe('hayDiscrepanciaHoraria', () => {
  it('no marca discrepancia si la diferencia esta dentro de la tolerancia', () => {
    const captura = new Date(2026, 10, 5, 20, 5);
    expect(hayDiscrepanciaHoraria('2026-11-05', '20:00', captura)).toBe(false);
  });

  it('marca discrepancia si la diferencia supera la tolerancia', () => {
    const captura = new Date(2026, 10, 5, 21, 0);
    expect(hayDiscrepanciaHoraria('2026-11-05', '20:00', captura)).toBe(true);
  });
});
