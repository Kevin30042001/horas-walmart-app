import { describe, expect, it } from 'vitest';
import { generarCortes } from './cortes';

describe('generarCortes', () => {
  it('genera cortes consecutivos los dias 14 y 28, con pago 3 dias despues', () => {
    const periodos = generarCortes(new Date(2026, 0, 1), new Date(2026, 2, 1), {
      diasDeCorte: [14, 28],
      diasHastaPago: 3,
    });

    expect(periodos).toEqual([
      { fechaInicio: '2026-01-02', fechaCorte: '2026-01-14', fechaPago: '2026-01-17' },
      { fechaInicio: '2026-01-15', fechaCorte: '2026-01-28', fechaPago: '2026-01-31' },
      { fechaInicio: '2026-01-29', fechaCorte: '2026-02-14', fechaPago: '2026-02-17' },
      { fechaInicio: '2026-02-15', fechaCorte: '2026-02-28', fechaPago: '2026-03-03' },
    ]);
  });

  it('no genera nada si el rango es mas corto que hasta el primer corte', () => {
    const periodos = generarCortes(new Date(2026, 0, 1), new Date(2026, 0, 10), {
      diasDeCorte: [14, 28],
      diasHastaPago: 3,
    });
    expect(periodos).toHaveLength(0);
  });
});
