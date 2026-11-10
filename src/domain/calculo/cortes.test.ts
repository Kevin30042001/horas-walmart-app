import { describe, expect, it } from 'vitest';
import { generarCortes, REGLA_CORTES_WALMART } from './cortes';

describe('generarCortes - calendario de Walmart (pagos 14 y 28)', () => {
  it('pago del 14: del 20 del mes anterior al 4; pago del 28: del 5 al 19', () => {
    const periodos = generarCortes(new Date(2026, 9, 1), new Date(2026, 10, 30), REGLA_CORTES_WALMART);
    expect(periodos).toEqual([
      { fechaInicio: '2026-09-20', fechaCorte: '2026-10-04', fechaPago: '2026-10-14' },
      { fechaInicio: '2026-10-05', fechaCorte: '2026-10-19', fechaPago: '2026-10-28' },
      { fechaInicio: '2026-10-20', fechaCorte: '2026-11-04', fechaPago: '2026-11-14' },
      { fechaInicio: '2026-11-05', fechaCorte: '2026-11-19', fechaPago: '2026-11-28' },
      { fechaInicio: '2026-11-20', fechaCorte: '2026-12-04', fechaPago: '2026-12-14' },
    ]);
  });

  it('el periodo de la captura del sistema (20/10 al 04/11) se paga el 14/11', () => {
    const p = generarCortes(new Date(2026, 9, 25), new Date(2026, 9, 25), REGLA_CORTES_WALMART);
    expect(p).toEqual([{ fechaInicio: '2026-10-20', fechaCorte: '2026-11-04', fechaPago: '2026-11-14' }]);
  });

  it('cruza el cambio de anio (20/12 al 04/01, pago 14/01)', () => {
    const p = generarCortes(new Date(2026, 11, 25), new Date(2026, 11, 26), REGLA_CORTES_WALMART);
    expect(p).toEqual([{ fechaInicio: '2026-12-20', fechaCorte: '2027-01-04', fechaPago: '2027-01-14' }]);
  });

  it('dias configurables: corte el 5 y el 18', () => {
    const p = generarCortes(new Date(2026, 0, 10), new Date(2026, 0, 10), {
      cortes: [
        { diaCorte: 5, diaPago: 14 },
        { diaCorte: 18, diaPago: 28 },
      ],
    });
    expect(p).toEqual([{ fechaInicio: '2026-01-06', fechaCorte: '2026-01-18', fechaPago: '2026-01-28' }]);
  });

  it('febrero: el pago del 28 existe y un corte el 30 se ajusta al ultimo dia', () => {
    const p = generarCortes(new Date(2026, 1, 10), new Date(2026, 1, 10), {
      cortes: [
        { diaCorte: 15, diaPago: 30 },
        { diaCorte: 30, diaPago: 15 },
      ],
    });
    expect(p).toEqual([{ fechaInicio: '2026-01-31', fechaCorte: '2026-02-15', fechaPago: '2026-02-28' }]);
  });
});
